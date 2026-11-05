
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
    if (event.httpMethod !== "GET") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method not allowed" }),
        };
    }

    const sessionId = event.queryStringParameters?.session_id;

    if (!sessionId || !sessionId.startsWith("cs_")) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid checkout session" }),
        };
    }

    const headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
    };

    try {
        // Retrieve and verify the Stripe Checkout Session
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
            return {
                statusCode: 202,
                headers,
                body: JSON.stringify({
                    status: "pending",
                    message: "Payment has not yet been confirmed",
                }),
            };
        }

        const orderId = session.client_reference_id;

        if (!orderId) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: "Order reference missing" }),
            };
        }

        // Retrieve the matching order from Supabase
        const { data: order, error } = await supabase
            .from("orders")
            .select(
                "id, created_at, status, stripe_session_id, items, currency, amount_total, shipping_amount, shipping_method, shipping"
            )
            .eq("id", orderId)
            .eq("stripe_session_id", sessionId)
            .single();

        if (error || !order) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: "Order not found" }),
            };
        }

        // Build a safe response for the confirmation page
        const confirmation = {
            status: "paid",
            orderId: order.id,
            createdAt: order.created_at,
            items: order.items,
            currency: order.currency,
            subtotal: order.amount_total,
            shippingAmount: session.total_details?.amount_shipping ?? order.shipping_amount ?? 0,
            discountAmount: session.total_details?.amount_discount ?? 0,
            totalPaid: session.amount_total,
            shippingMethod: order.shipping_method,
            shippingAddress: session.shipping_details?.address
                ?? session.collected_information?.shipping_details?.address
                ?? order.shipping?.address
                ?? null,
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(confirmation),
        };

    } catch (err) {
        console.error("Order confirmation lookup failed:", err);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Unable to retrieve order confirmation",
            }),
        };
    }
};
