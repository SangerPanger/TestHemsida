import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

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

// productCatalog is kept as fallback or reference if needed, but we now use the database
const productCatalog = {
  "ultra-instinct": {
    name: "Ultra Instinct",
    unitAmountOre: 28900
  },
  "loot-devil-fruit-dose": {
    name: "Devil Fruit",
    unitAmountOre: 28900
  },
  "limited-black-loot-edition": {
    name: "Black LOOT Edition",
    unitAmountOre: 28900
  },
  "rare-raspberry": {
    name: "Rare Raspberry",
    unitAmountOre: 28900
  },
  "cactus-calamity": {
    name: "Cactus Calamity",
    unitAmountOre: 28900
  },
  "loot-sour-shock-dose": {
    name: "Sour Shock",
    unitAmountOre: 28900
  },
  "loot-tiki-tropicali-dose": {
    name: "Tiki Tropicali",
    unitAmountOre: 28900
  },
  "loot-kimetsu-no-kiba-dose": {
    name: "Kimetsu No Kiba",
    unitAmountOre: 28900
  },
  "loot-phoenix-flames-dose": {
    name: "Phoenix Flames",
    unitAmountOre: 28900
  },
  "invincible-ice-tea": {
    name: "Invincible Ice Tea",
    unitAmountOre: 28900
  }
} as const;

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

    lineItems.push({
      price_data: {
        currency: "sek",
        product_data: {
          name: "Frakt"
        },
        unit_amount: shippingOre
      },
      quantity: 1
    });

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

    let discounts: Array<{ coupon: string }> | undefined;

    if (adjustedTotalDiscountOre > 0) {
      try {
        // Stripe docs: To use a coupon, pass the coupon ID in the discounts array.
        // Also check if we should apply it to specific line items if needed,
        // but by default it applies to the total.
        const coupon = await stripe.coupons.create({
          amount_off: adjustedTotalDiscountOre,
          currency: "sek",
          duration: "once",
          name: "Kundrabatt - Mana Market"
        });

        console.log(`[DEBUG] Skapad Stripe-kupong: ${coupon.id} med amount_off: ${adjustedTotalDiscountOre}`);
        discounts = [{ coupon: coupon.id }];
      } catch (couponError) {
        console.error(`[ERROR] Misslyckades att skapa Stripe-kupong: ${couponError.message}`);
        // Vi fortsatter utan rabatt om kupongen misslyckas, eller sa kan vi throwa
        // Har valjer vi att throwa for att inte vilseleda kunden
        throw new Error(`Kunde inte skapa rabatt: ${couponError.message}`);
      }
    }

    console.log(`[DEBUG] Final line_items: ${JSON.stringify(lineItems)}`);
    console.log(`[DEBUG] Final discounts: ${JSON.stringify(discounts)}`);

    // Prova att skicka med discounts direkt i checkout session
    const sessionOptions: any = {
      mode: "payment",
      customer_email: user.email,
      line_items: lineItems,
      success_url: `${siteUrl}checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}checkout-cancel.html`,
      metadata: {
        user_id: user.id,
        item_count: String(items.length),
        cart_items: JSON.stringify(cartItemsForMetadata),
        commission_discount_ore: String(requestedCommissionDiscountOre)
      }
    };

    if (discounts && discounts.length > 0) {
      sessionOptions.discounts = discounts;
    } else {
      // Endast tillåt kampanjkoder om vi inte redan har applicerat en automatisk rabatt,
      // eftersom Stripe Checkout bara stöder en rabatt/kod åt gången.
      sessionOptions.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);

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
