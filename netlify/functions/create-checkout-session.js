// Import
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js"

// Security Keys
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Checkout session function (Netlify serverless function)
export const handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return {statusCode: 405, body: "Method not allowed"};
    }

    let data;
    try {
        data = JSON.parse(event.body || "{}");
    } catch {
        return { statusCode: 400, body: "Invalid JSON"};
    }

    if (!Array.isArray(data.items)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing items array"}),
        }
    }

    // Extract product IDs
    const ids = [...new Set(data.items.map((it) => it.id))]

    if (ids.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Cart is empty" })
        }
    }

    const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, price, stock")
    .in("id", ids);

    if (prodErr) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Product lookup failed" }),
        };
    }

    if (!products || products.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "No matching products found" }),
        };
    }

    const productById = new Map(products.map((p) => [p.id, p]));

    // Precursor to Build safe validated items
    const validatedItems = [];
    let totalPennies = 0;

    // Build safe validated items
    for (const item of data.items) {
        const product = productById.get(item.id);
        if (!product) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: `Unknown product id: ${item.id}` }),
            };
        }

        const requestedQty = Number(item.qty);
        if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: `Invalid qty for product ${item.id}` }),
        };
        }

        if (product.stock <= 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: `Out of stock: ${item.id}` }),
        };
        }
        const safeQty = Math.min(Math.max(requestedQty, 1), product.stock);

        const linePennies = product.price * safeQty;
        totalPennies += linePennies;

        validatedItems.push({
            id: product.id,
            name: product.name,
            unit_price: product.price,
            qty: safeQty,
            line_total: linePennies
        });
    }

    // Determine shipping amount
    let shippingAmount = 0;
    let shippingMethod = "free";

    if (totalPennies < 5000) {
        shippingAmount = 329;
        shippingMethod = "standard";
    }

    // Stop if no valid items
    if (validatedItems.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "No valid purchasable items" }),
        };
    }

    // Insert a row in the Supabase orders table
    const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
        status: "pending",
        currency: "gbp",
        amount_total: totalPennies,
        items: validatedItems,
        shipping_amount: shippingAmount,
        shipping_method: shippingMethod,
    })
    .select()
    .single();

    if (orderErr) {
    return {
        statusCode: 500,
        body: JSON.stringify({ error: "Order insert failed" }),
    };
    }

    // Translate above in to Stripe schema
    const line_items = validatedItems.map((it) => ({
        price_data: {
            currency: "gbp",
            product_data: { name: it.name },
            unit_amount: it.unit_price,
        },
        quantity: it.qty,
    }));

    // Give instructions to Stripe - what/how (add process.env.SITE_URL || as baseURL when live)
    const baseURL = "http://localhost:8888";

    const shippingOptions = [
        {
            shipping_rate_data: {
                type: "fixed_amount",
                fixed_amount: {
                    amount: shippingAmount,
                    currency: "gbp",
                },
                display_name: shippingMethod === "free" ? "Free UK Priority Shipping" : "UK Priority Shipping",
            },
        },
    ]

    let session;
    try {
        session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items,
        success_url: `${baseURL}/cart/index.html?success=1`,
        cancel_url: `${baseURL}/cart/index.html?canceled=1`,
        client_reference_id: String(order.id),
        metadata: {
            order_id: String(order.id),
            shipping_method: shippingMethod,
            shipping_amount: String(shippingAmount),
        },
        shipping_address_collection: {
            allowed_countries: ["GB"],
        },
        billing_address_collection: "auto",
        phone_number_collection: { enabled: true },
        shipping_options: shippingOptions,
    });
    } catch (e) {
        console.error("Stripe session create failed:", e);
        await supabase.from("orders")
            .update({ status: "failed" })
            .eq("id", order.id);
        return {
            statusCode: 502,
            body: JSON.stringify({ error: "Stripe session creation failed" })
        }    
    }

    // Store stripe session ID in orders table
    const { error: updErr } = await supabase
        .from("orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id);

        if (updErr) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Order update failed" }),
        };
        }

    return {
        statusCode: 200,
        body: JSON.stringify({ url: session.url}),       
    }
};