import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@16.1.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY saknas i Supabase secrets.");
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("SUPABASE_URL eller SUPABASE_ANON_KEY saknas i Supabase secrets.");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20"
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function isValidOrigin(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidSiteUrl(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && value.endsWith("/");
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Authorization saknas." }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json({ error: "Ogiltig session." }, 401);
    }

    const body = await request.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    const requestedCommissionDiscountSek = Number.isFinite(body?.commissionDiscountSek)
      ? Math.max(0, Math.floor(body.commissionDiscountSek))
      : 0;
    const requestedOrigin = typeof body?.origin === "string" ? body.origin : "";
    const requestedSiteUrl = typeof body?.siteUrl === "string" ? body.siteUrl : "";
    const headerOrigin = request.headers.get("origin") || "";
    const origin = isValidOrigin(requestedOrigin)
      ? requestedOrigin
      : isValidOrigin(headerOrigin)
        ? headerOrigin
        : "";
    const siteUrl = isValidSiteUrl(requestedSiteUrl) ? requestedSiteUrl : "";

    const cartItemsForMetadata = [];

    if (items.length === 0) {
      return json({ error: "Varukorgen ar tom." }, 400);
    }

    if (!origin) {
      return json({ error: "Ogiltig origin for checkout. Kor sidan via http:// eller https://." }, 400);
    }

    if (!siteUrl) {
      return json({ error: "Ogiltig site-url for checkout return pages." }, 400);
    }

    const lineItems = [];
    let subtotalOre = 0;

    // Fetch product data from database to ensure up-to-date pricing and stock
    const { data: dbProducts, error: dbError } = await supabase
      .from("products")
      .select("slug, name, price_cents, stock_quantity, active")
      .in("slug", items.map((item: any) => item.id));

    if (dbError) {
      throw new Error(`Kunde inte hamta produktdata: ${dbError.message}`);
    }

    const productMap = new Map(dbProducts?.map(p => [p.slug, p]));

    for (const item of items) {
      const productId = typeof item?.id === "string" ? item.id : "";
      const quantity = Number.isFinite(item?.quantity) ? Math.max(1, Math.floor(item.quantity)) : 0;

      const dbProduct = productMap.get(productId);

      if (!dbProduct || !dbProduct.active) {
        return json({ error: `Produkten "${productId}" hittades inte eller ar inte aktiv.` }, 400);
      }

      if (dbProduct.stock_quantity < quantity) {
        return json({
          error: `Tyvarr finns bara ${dbProduct.stock_quantity} st kvar av "${dbProduct.name}". Justera din varukorg.`
        }, 400);
      }

      const unitAmount = dbProduct.price_cents;
      subtotalOre += unitAmount * quantity;

      lineItems.push({
        price_data: {
          currency: "sek",
          product_data: {
            name: dbProduct.name
          },
          unit_amount: unitAmount
        },
        quantity
      });

      // Spara ner infon för att skicka till webhooken
      cartItemsForMetadata.push({
        id: dbProduct.slug,
        name: dbProduct.name,
        quantity: quantity,
        price: unitAmount
      });
    }

    const shippingOre = 4900;
    const cartDiscountThresholdOre = 49900;
    const cartDiscountValueOre = 5000;
    const cartDiscountOre = subtotalOre >= cartDiscountThresholdOre ? cartDiscountValueOre : 0; // Synk med frontend: 50 kr rabatt vid kop over 499 kr

    console.log(`[DEBUG] subtotalOre: ${subtotalOre}, cartDiscountOre: ${cartDiscountOre}`);

    const { data: availableCommissionOre, error: commissionError } = await supabase.rpc(
      "get_total_available_commission",
      { p_user_id: user.id }
    );

    if (commissionError) {
      console.error(`[ERROR] Kunde inte hamta tillgangligt rabattsaldo: ${commissionError.message}`);
      throw new Error(`Kunde inte hamta tillgangligt rabattsaldo: ${commissionError.message}`);
    }

    const requestedCommissionDiscountOre = Math.floor(requestedCommissionDiscountSek * 100);
    const maxPossibleCommissionDiscountOre = Math.max(0, subtotalOre + shippingOre - cartDiscountOre);
    const maxCommissionDiscountOre = Math.min(
      Math.floor(Number(availableCommissionOre) || 0),
      maxPossibleCommissionDiscountOre
    );

    console.log(`[DEBUG] requestedCommissionDiscountOre: ${requestedCommissionDiscountOre}, availableCommissionOre: ${availableCommissionOre}, maxCommissionDiscountOre: ${maxCommissionDiscountOre}`);

    const appliedCommissionDiscountOre = Math.min(requestedCommissionDiscountOre, maxCommissionDiscountOre);
    const totalDiscountOre = Math.floor(cartDiscountOre + appliedCommissionDiscountOre);

    console.log(`[DEBUG] appliedCommissionDiscountOre: ${appliedCommissionDiscountOre}, totalDiscountOre: ${totalDiscountOre}`);

    // Ensure we don't discount below Stripe's minimum amount (approx 5 SEK)
    // and definitely not below 0.
    const minimumAmountOre = 500;
    const currentTotalOre = subtotalOre + shippingOre;
    const finalTotalAfterDiscountOre = currentTotalOre - totalDiscountOre;

    let adjustedTotalDiscountOre = totalDiscountOre;
    if (finalTotalAfterDiscountOre < minimumAmountOre) {
      adjustedTotalDiscountOre = Math.max(0, currentTotalOre - minimumAmountOre);
      console.log(`[DEBUG] Justerar rabatt från ${totalDiscountOre} till ${adjustedTotalDiscountOre} för att behålla minimumbelopp 5 SEK.`);
    }

    let remainingDiscountToApply = adjustedTotalDiscountOre;

    // --- NY LOGIK: DRA AV RABATT FRÅN FRAKTEN FÖRST ---
    // (Användaren vill att frakten dras först vid summa över 499 kr)
    const canTakeFromShipping = Math.max(0, shippingOre); // Antar att vi kan dra hela frakten om rabatten räcker
    const toTakeFromShipping = Math.min(remainingDiscountToApply, canTakeFromShipping);
    const finalShippingOre = shippingOre - toTakeFromShipping;
    remainingDiscountToApply -= toTakeFromShipping;

    const finalLineItems = [];

    // --- DRA AV RESTERANDE RABATT FRÅN PRODUKTERNA ---
    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      if (remainingDiscountToApply <= 0) {
        finalLineItems.push(item);
        continue;
      }

      const unitAmount = item.price_data.unit_amount;
      const quantity = item.quantity;
      const itemTotal = unitAmount * quantity;

      // Vi lämnar minst 50 öre (minsta tillåtna belopp) för denna rad
      const minLineTotal = 50;
      const canTake = Math.max(0, itemTotal - minLineTotal);
      const toTake = Math.min(remainingDiscountToApply, canTake);

      if (toTake > 0) {
        remainingDiscountToApply -= toTake;
        const newTotal = itemTotal - toTake;

        let description = `Ordinarie pris: ${(itemTotal / 100).toFixed(2)} kr`;
        // Om det är första produkten och vi har en total rabatt, visa hur mycket kunden sparar totalt
        if (i === 0 && adjustedTotalDiscountOre > 0) {
          const originalTotal = (subtotalOre + shippingOre) / 100;
          description += ` | Totalt ordinarie: ${originalTotal.toFixed(2)} kr | Du sparar: ${(adjustedTotalDiscountOre / 100).toFixed(2)} kr`;
        }

        finalLineItems.push({
          price_data: {
            ...item.price_data,
            product_data: {
              ...item.price_data.product_data,
              name: item.price_data.product_data.name + (quantity > 1 ? ` (${quantity} st)` : "") + " (Rabatterad)",
              description: description
            },
            unit_amount: newTotal
          },
          quantity: 1 // Gör om till quantity 1 för att kunna sätta det exakta rabatterade totalbeloppet
        });
      } else {
        finalLineItems.push(item);
      }
    }

    console.log(`[DEBUG] Final line_items: ${JSON.stringify(finalLineItems)}`);
    console.log(`[DEBUG] finalShippingOre: ${finalShippingOre}`);

    const sessionData: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      customer_email: user.email,
      line_items: finalLineItems,
      success_url: `${siteUrl}checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}checkout-cancel.html`,
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: finalShippingOre,
              currency: "sek",
            },
            display_name: "Standardfrakt",
          },
        },
      ],
      metadata: {
        user_id: user.id,
        item_count: String(items.length),
        cart_items: JSON.stringify(cartItemsForMetadata),
        commission_discount_ore: String(appliedCommissionDiscountOre),
        applied_discount_ore: String(adjustedTotalDiscountOre)
      },
      allow_promotion_codes: adjustedTotalDiscountOre === 0 // Tillåt endast koder om ingen automatisk rabatt finns
    };

    const session = await stripe.checkout.sessions.create(sessionData);

    console.log(`[DEBUG] Stripe Session skapad: ${session.id}, discounts: ${JSON.stringify(session.discounts)}`);

    return json({ url: session.url });
  } catch (error) {
    console.error(error);
    return json(
      {
        error: error instanceof Error ? error.message : "Kunde inte skapa Stripe-session."
      },
      500
    );
  }
});
