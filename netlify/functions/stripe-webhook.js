import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Create Stripe API
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create DB client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Netlify serverless function
export const handler = async (event) => {
  // Stripe needs the raw request body to verify the signature
  const sig =
    event.headers["stripe-signature"] || event.headers["Stripe-Signature"];

  if (!sig) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing stripe-signature header" }) }
  }

  // Checking Stripe is sending the right information
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Signature verification failed: ${err.message}` };
  }

  // Looking for a completed checkout session
    const isRelevantEvent = 
      stripeEvent.type === "checkout.session.completed" ||
      stripeEvent.type === "checkout.session.async_payment_succeeded";

    if (!isRelevantEvent) {
      return { statusCode: 200, body: "ok" };
    }

    const session = stripeEvent.data.object;

    if (session.payment_status !== "paid") {
      return { statusCode: 200, body: "ignored"};
    }

    // update as paid
    const { data: order, error } = await supabase
      .from("orders")
      .update({
        status: "paid",
        customer_email: session.customer_details?.email ?? null,
        stripe_payment_intent_id: session.payment_intent ?? null,
        shipping: session.customer_details ?? null,
      })
      .eq("stripe_session_id", session.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (error) return { statusCode: 500, body: "DB update failed" };
    if (!order) return { statusCode: 200, body: "ok"};
    
    // decrement and update stock in DB
    try {
    for (const item of order.items) {
      const { data: product, error: fetchErr } = await supabase
      .from("products")
      .select("stock")
      .eq("id", item.id)
      .single();

      if (fetchErr) return { statusCode: 500, body: "Stock fetch failed" };

      const newStock = product.stock - item.qty;

      const { error: updateErr } = await supabase
      .from("products")
      .update({ stock: newStock })
      .eq("id", item.id);

      if (updateErr) return { statusCode: 500, body: "Stock update failed" };
    }
  } catch (e) {
    console.error("Stock decrement failed:", e);
    return {statusCode: 500, body: "Stock decrement failed"};
  }

  return { statusCode: 200, body: "ok" };
  }