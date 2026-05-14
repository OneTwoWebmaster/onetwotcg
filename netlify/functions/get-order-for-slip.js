import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
  try {
    const orderId = event.queryStringParameters?.orderId;

    if (!orderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing orderId" }),
      };
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id,
        created_at,
        customer_email,
        shipping_method,
        shipping_amount,
        amount_total,
        items,
        shipping,
        status,
        fulfillment_status
      `)
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    if (!order) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Order not found" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ order }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" }),
    };
  }
}