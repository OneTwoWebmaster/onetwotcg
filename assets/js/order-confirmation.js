
import { clearCart } from "../../shared/cart-store.js";
import { updateCartUI } from "./app.js";

// DOM
const loading = document.querySelector("#confirmationLoading");
const errorMessage = document.querySelector("#confirmationError");
const content = document.querySelector("#confirmationContent");

const orderId = document.querySelector("#confirmationOrderId");
const orderDate = document.querySelector("#confirmationDate");
const itemsContainer = document.querySelector("#confirmationItems");
const subtotal = document.querySelector("#confirmationSubtotal");
const discount = document.querySelector("#confirmationDiscount");
const shipping = document.querySelector("#confirmationShipping");
const total = document.querySelector("#confirmationTotal");
const shippingMethod = document.querySelector("#confirmationShippingMethod");
const address = document.querySelector("#confirmationAddress");

// Utilities
const penniesToPounds = pennies => `£${(pennies / 100).toFixed(2)}`;

const params = new URLSearchParams(window.location.search);
const sessionId = params.get("session_id");

// Clear the basket for the checkout that just completed.
// Do not clear a newer basket when revisiting an old order.
const pending = sessionStorage.getItem("onetwotcg_pending_checkout");

if (sessionId && pending) {
    try {
        const checkout = JSON.parse(pending);

        if (checkout.sessionId === sessionId) {
            clearCart();
            updateCartUI();
            sessionStorage.removeItem("onetwotcg_pending_checkout");
        }
    } catch (err) {
        console.error("Unable to clear checkout basket:", err);
    }
}

// Display an error
function showError(message) {
    loading.hidden = true;
    content.hidden = true;
    errorMessage.hidden = false;
    errorMessage.textContent = message;
}

// Render order details
function renderConfirmation(order) {
    orderId.textContent = order.orderId;

    orderDate.textContent = new Date(order.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    itemsContainer.innerHTML = "";

    for (const item of order.items) {
        const row = document.createElement("div");
        row.className = "confirmation-item";

        const name = document.createElement("span");
        name.textContent = `${item.name} × ${item.qty}`;

        const price = document.createElement("span");
        price.textContent = penniesToPounds(item.line_total);

        row.append(name, price);
        itemsContainer.appendChild(row);
    }

    subtotal.textContent = penniesToPounds(order.subtotal);

    discount.textContent = order.discountAmount > 0
        ? `−${penniesToPounds(order.discountAmount)}`
        : penniesToPounds(0);

    if (shipping) {
        shipping.textContent = penniesToPounds(order.shippingAmount);
    }

    total.textContent = penniesToPounds(order.totalPaid);

    shippingMethod.textContent = order.shippingMethod || "UK Priority Shipping";

    const delivery = order.shippingAddress;

    if (delivery) {
        address.textContent = [
            delivery.line1,
            delivery.line2,
            delivery.city,
            delivery.state,
            delivery.postal_code,
            delivery.country,
        ].filter(Boolean).join("\n");
    } else {
        address.textContent = "Delivery address unavailable";
    }

    loading.hidden = true;
    errorMessage.hidden = true;
    content.hidden = false;
}

// Retrieve order details
async function loadConfirmation() {
    if (!sessionId) {
        showError("We couldn't retrieve your order reference. Please contact us if you need assistance.");
        return;
    }

    try {
        const response = await fetch(
            `/.netlify/functions/get-order-confirmation?session_id=${encodeURIComponent(sessionId)}`,
            { cache: "no-store" }
        );

        const order = await response.json();

        if (response.status === 202) {
            showError(
                "Thank you for your order. Your payment status is still being confirmed. Please do not place another order."
            );
            return;
        }

        if (!response.ok) {
            throw new Error(order.error || "Unable to retrieve your order.");
        }

        renderConfirmation(order);

    } catch (err) {
        console.error("Order confirmation failed:", err);

        showError(
            "Thank you for your order. We couldn't display your order details right now. Please do not make another payment. Contact us if you need assistance."
        );
    }
}

loadConfirmation();
