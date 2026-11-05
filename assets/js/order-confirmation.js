
import { loadCart, clearCart } from "../../shared/cart-store.js";
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

// Display an error
function showError(message) {
    loading.hidden = true;
    content.hidden = true;
    errorMessage.hidden = false;
    errorMessage.textContent = message;
}

// Render the verified order
function renderConfirmation(order) {
    orderId.textContent = order.orderId;

    orderDate.textContent = new Date(order.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    // Products
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

    // Totals
    subtotal.textContent = penniesToPounds(order.subtotal);
    discount.textContent = order.discountAmount > 0
        ? `−${penniesToPounds(order.discountAmount)}`
        : penniesToPounds(0);

    shipping.textContent = penniesToPounds(order.shippingAmount);
    total.textContent = penniesToPounds(order.totalPaid);

    // Delivery
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

// Retrieve the order
async function loadConfirmation() {
    if (!sessionId) {
        showError("No checkout session was provided.");
        return;
    }

    try {
        const response = await fetch(
            `/.netlify/functions/get-order-confirmation?session_id=${encodeURIComponent(sessionId)}`,
            { cache: "no-store" }
        );

        const order = await response.json();

        if (response.status === 202) {
            showError("Your payment is still being processed. Please refresh this page shortly.");
            return;
        }

        if (!response.ok) {
            throw new Error(order.error || "Unable to retrieve your order.");
        }

        renderConfirmation(order);

        // Clear basket only after Stripe confirms payment
// Only clear the basket associated with this checkout
const pending = sessionStorage.getItem("onetwotcg_pending_checkout");

if (pending) {
    try {
        const checkout = JSON.parse(pending);
        const currentCart = loadCart();

        if (
            checkout.sessionId === sessionId &&
            JSON.stringify(currentCart) === JSON.stringify(checkout.cart)
        ) {
            clearCart();
            updateCartUI();
        }

        if (checkout.sessionId === sessionId) {
            sessionStorage.removeItem("onetwotcg_pending_checkout");
        }
    } catch (err) {
        console.error("Unable to verify pending basket:", err);
    }
}

    } catch (err) {
        console.error("Order confirmation failed:", err);
        showError("We couldn't retrieve your order details. Please try refreshing this page.");
    }
}

loadConfirmation();
