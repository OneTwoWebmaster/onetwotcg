import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Create Stripe API
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create Resend API
const resend = new Resend(process.env.RESEND_API_KEY);

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

    if (!session.client_reference_id) {
      return { statusCode: 400, body: "Missing client_reference_id" };
    }

    if (session.payment_status !== "paid") {
      return { statusCode: 200, body: "ignored"};
    }

    // update as paid
    const { data: order, error } = await supabase
      .from("orders")
      .update({
        status: "paid",
        customer_email: session.customer_details?.email ?? null,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent ?? null,
        shipping: session.customer_details ?? null,
      })
      .eq("id", session.client_reference_id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (error) return { statusCode: 500, body: "DB update failed" };
    if (!order) return { statusCode: 200, body: "ok"};

// Build Confirmation E-mail
function buildOrderConfirmationEmail(order) {
  const subtotal = ((order.amount_total || 0) / 100).toFixed(2);
  const shipping = ((order.shipping_amount || 0) / 100).toFixed(2);
  const total = (((order.amount_total || 0) + (order.shipping_amount || 0)) / 100).toFixed(2);

  const shippingLabel =
    order.shipping_method === "free"
      ? "Free UK Shipping"
      : "UK Standard Shipping";

  const itemsHtml = (order.items || [])
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e5d8;">
            <div style="font-weight: 600; color: #191912;">${item.name}</div>
            <div style="font-size: 14px; color: #555540;">Qty: ${item.qty}</div>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e5d8; text-align: right; white-space: nowrap; color: #191912;">
            £${((item.line_total || 0) / 100).toFixed(2)}
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="margin:0; padding:0; background:#f8f8ec; font-family: Merriweather, Georgia, serif; color:#191912;">
      <div style="max-width:600px; margin:0 auto; padding:32px 20px;">
        <div style="background:#fffef4; border:1px solid #e2e2c8; border-radius:12px; overflow:hidden;">
          
          <div style="background:#ffffd1; padding:24px 28px; border-bottom:1px solid #e2e2c8;">
            <div style="font-size:24px; font-weight:700; color:#191912;">One Two TCG</div>
            <div style="margin-top:6px; font-size:14px; color:#555540;">
              Order confirmation
            </div>
          </div>

          <div style="padding:28px;">
            <h2 style="margin:0 0 16px; font-size:24px; line-height:1.2; color:#191912;">
              Thank you for your order
            </h2>

            <p style="margin:0 0 18px; font-size:16px; color:#333326;">
              We’ve received your order and will email you again once it has been dispatched.
            </p>

            <div style="margin:0 0 24px; padding:16px; background:#ffffea; border:1px solid #ececcf; border-radius:8px;">
              <div style="font-size:14px; color:#555540; margin-bottom:6px;">Order ID</div>
              <div style="font-size:15px; font-weight:600; color:#191912; word-break:break-word;">${order.id}</div>
            </div>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:24px;">
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:24px;">
              <tbody>
                <tr>
                  <td style="padding:6px 0; color:#555540;">Subtotal</td>
                  <td style="padding:6px 0; text-align:right; color:#191912;">£${subtotal}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; color:#555540;">Shipping</td>
                  <td style="padding:6px 0; text-align:right; color:#191912;">£${shipping}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0 0; font-weight:700; color:#191912; border-top:1px solid #e5e5d8;">Total</td>
                  <td style="padding:10px 0 0; text-align:right; font-weight:700; color:#191912; border-top:1px solid #e5e5d8;">
                    £${total}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style="margin:0 0 24px; padding:16px; background:#ffffea; border:1px solid #ececcf; border-radius:8px;">
              <div style="font-size:14px; color:#555540; margin-bottom:6px;">Shipping method</div>
              <div style="font-size:15px; font-weight:600; color:#191912;">${shippingLabel}</div>
            </div>

            <p style="margin:0; font-size:14px; line-height:1.6; color:#555540;">
              Questions? Reply to this email or contact us at
              <a href="mailto:info@onetwotcg.co.uk" style="color:#23344a; text-decoration:none;">info@onetwotcg.co.uk</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// E-mail confirmation code
const { data: emailData, error: emailError } = await resend.emails.send({
  from: "One Two TCG <orders@mail.onetwotcg.co.uk>",
  to: order.customer_email,
  subject: "Your One Two TCG order confirmation",
  html: buildOrderConfirmationEmail(order),
});

if (emailError) {
  console.error("Resend send failed:", emailError);
} else {
  console.log("Resend email sent:", emailData);
}
    
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