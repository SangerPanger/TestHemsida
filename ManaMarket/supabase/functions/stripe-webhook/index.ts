import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
  throw new Error("Saknar miljövariabler för Stripe eller Supabase.");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Saknar signatur", { status: 400 });
  }

  try {
    const body = await req.text();
    let event;

    if (stripeWebhookSecret) {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } else {
      // Om ingen secret är satt (t.ex. under initial testning), lita på body
      event = JSON.parse(body);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata;
      const userId = metadata?.user_id;
      const cartItemsStr = metadata?.cart_items;

      if (!userId || !cartItemsStr) {
        console.error("Saknar userId eller cartItems i metadata", metadata);
        return new Response("Metadata saknas", { status: 400 });
      }

      const cartItems = JSON.parse(cartItemsStr);

      // 1. Skapa ordern i databasen
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          status: "paid",
          subtotal_cents: session.amount_subtotal,
          total_cents: session.amount_total,
          currency: session.currency,
          stripe_checkout_session_id: session.id,
          discount_cents: session.total_details?.amount_discount || 0,
          shipping_cents: session.total_details?.amount_shipping || 0,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Skapa order_items och uppdatera lager
      for (const item of cartItems) {
        // Hämta produktens UUID från slug
        const { data: product, error: prodError } = await supabase
          .from("products")
          .select("id, stock_quantity")
          .eq("slug", item.id)
          .single();

        if (prodError || !product) {
          console.error(`Kunde inte hitta produkt: ${item.id}`);
          continue;
        }

        // Lägg till order item
        await supabase.from("order_items").insert({
          order_id: order.id,
          product_id: product.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price_cents: item.price,
        });

        // Uppdatera lagersaldo
        await supabase
          .from("products")
          .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
          .eq("id", product.id);
      }

      console.log(`Order ${order.id} skapad och betald för användare ${userId}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});
