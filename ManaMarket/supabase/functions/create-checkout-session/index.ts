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

const productCatalog = {
  "clover-curse": {
    name: "Clover Curse",
    unitAmountOre: 28900
  },
  "ultra-instinct": {
    name: "Ultra Instinct",
    unitAmountOre: 28900
  },
  "sunburst-rush": {
    name: "Sunburst Rush",
    unitAmountOre: 28900
  },
  "starter-stack": {
    name: "Starter Stack",
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
    const origin = typeof body?.origin === "string" && body.origin.length > 0
      ? body.origin
      : request.headers.get("origin") || "http://localhost:8080";

    if (items.length === 0) {
      return json({ error: "Varukorgen ar tom." }, 400);
    }

    const lineItems = [];
    let subtotalOre = 0;

    for (const item of items) {
      const productId = typeof item?.id === "string" ? item.id : "";
      const quantity = Number.isFinite(item?.quantity) ? Math.max(1, Math.floor(item.quantity)) : 0;
      const product = productCatalog[productId as keyof typeof productCatalog];

      if (!product || quantity < 1) {
        return json({ error: "Ogiltig produkt i varukorgen." }, 400);
      }

      subtotalOre += product.unitAmountOre * quantity;
      lineItems.push({
        price_data: {
          currency: "sek",
          product_data: {
            name: product.name
          },
          unit_amount: product.unitAmountOre
        },
        quantity
      });
    }

    const shippingOre = 4900;
    const discountOre = subtotalOre >= 85000 ? 5000 : 0;

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

    let discounts: Array<{ coupon: string }> | undefined;

    if (discountOre > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: discountOre,
        currency: "sek",
        duration: "once",
        name: "ManaMarket cart discount"
      });

      discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: lineItems,
      discounts,
      success_url: `${origin}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout-cancel.html`,
      metadata: {
        user_id: user.id,
        item_count: String(items.length)
      }
    });

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
