// Imports
import { PRODUCTS } from "../../shared/products.js";
import { loadCart, saveCart, clearCart } from "../../shared/cart-store.js"
import { updateCartUI } from "./app.js";
import { applyLiveFieldsToProducts } from "../../shared/live-products.js";

// DOM
const cartEmpty = document.querySelector('#cartEmpty');
const cartItems = document.querySelector('#cartItems');
const cartTotal = document.querySelector('#cartTotal');
const checkoutContainer = document.querySelector('#checkoutContainer');

// Utilities
const penniesToPounds = pennies => (pennies / 100).toFixed(2);

function getMaxAllowedQty(product) {
    if (!product) return 0;
    if (typeof product.maxPerOrder === "number") {
        return Math.min(product.stock, product.maxPerOrder);
    }
    return product.stock;
}

// Define State
const state = {
    products: PRODUCTS,
    cart: {}
}

state.cart = loadCart();

// Render logic
const renderCartPage = state => {
    for (const [id] of Object.entries(state.cart)) {
        const product = state.products.find((p) => p.id === id);

        if (!product || product.stock <= 0) {
            delete state.cart[id];
        }
    }

    saveCart(state.cart);

    const entries = Object.entries(state.cart);

    // Clear previous
    cartItems.innerHTML = "";
    cartEmpty.textContent = "";
    cartTotal.textContent = "";
    checkoutContainer.innerHTML = "";

    cartEmpty.hidden = true;
    cartItems.hidden = false;
    checkoutContainer.hidden = false;

    if (entries.length === 0) {
        cartEmpty.hidden = false;
        cartItems.hidden = true;

        cartEmpty.textContent = 'Your cart is empty.';
        cartTotal.textContent = 'Total: £0.00';
        return;
    }

    cartItems.style.display = "";

    let totalPennies = 0;

    for (const [id, qty] of entries)    {
        const product = state.products.find((p) => p.id === id);
        
        if (!product || product.stock <= 0) {
        delete state.cart[id];
        continue;
        }

        const linePennies = product.price * qty;
        totalPennies += linePennies;

        const atMin = qty <= 0;
        const maxAllowed = getMaxAllowedQty(product);
        const atMax = qty >= maxAllowed;
        
        const row = document.createElement('div');
        row.classList.add('cart-row');
        row.innerHTML = `
            <div class="cart-thumb">
                <a href="/products/product.html?id=${product.id}">
                    <img src="${product.images[0]}" alt="${product.name}">
                </a>
            </div>

            <div class="cart-left">
                <strong class="cart-product-name">${product.name}</strong>
                <div>Unit: £${penniesToPounds(product.price)}</div>
                <div>${product.stock} in stock</div>
            </div>

            <div class="cart-mid">
                <div class="cart-qty-label">Qty: ${qty}</div>
                <div class="qty-controls">
                    <button type="button" data-action="dec" data-id="${product.id}" ${atMin ? "disabled" : ""}>-</button>
                    <input type="number" data-id="${product.id}" min="0" max="${maxAllowed}" step="1" size="2" value="${qty}" />
                    <button type="button" data-action="inc" data-id="${product.id}" ${atMax ? "disabled" : ""}>+</button>
                </div>
            </div>

            <div class="cart-right">
                <div>Sub-total: £${penniesToPounds(linePennies)}</div>
                <button type="button" data-action="remove" data-id="${product.id}">Remove</button>
            </div>
        `;
        cartItems.appendChild(row);
    }
    cartTotal.innerHTML = `
    Total: £${penniesToPounds(totalPennies)}
    <div class="cart-shipping-note">Shipping will be added during checkout</div>
    `;
    if (entries.length === 0) {
        checkoutContainer.textContent = '';
    } else if (entries.length > 0) {
        const button = document.createElement('button');
        button.id = 'checkoutButton';
        button.textContent = 'Proceed to Checkout';
        checkoutContainer.appendChild(button);
    }
}

// Event listeners
cartItems.addEventListener("click", e => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    setState((state) => {
        const currentQty = state.cart[id] ?? 0;
        
        const product = state.products.find((p) => p.id === id);
        if (!product) return;

        const maxAllowed = getMaxAllowedQty(product);

        if (action === "dec" && currentQty > 0) {
            const lessQty = currentQty - 1;
            if (lessQty <= 0) delete state.cart[id];
            else state.cart[id] = lessQty;
        } else if (action === "inc" && currentQty < maxAllowed) {
            state.cart[id] = currentQty + 1;
        } else if (action === "remove") {
            delete state.cart[id];
        }
    })
})

cartItems.addEventListener("change", e => {
    const input = e.target.closest("input[data-id]");
    if (!input) return;
    const id = input.dataset.id;
    const desiredQty = Number(Math.round(input.value));

    setState((state) => {
        const product = state.products.find((p) => p.id === id);
        if (!product) return;

        const maxAllowed = getMaxAllowedQty(product);

        if (desiredQty <= 0) delete state.cart[id];
        else state.cart[id] = Math.min(desiredQty, maxAllowed)
    })
})

checkoutContainer.addEventListener("click", async (e) => {
    const btn = e.target.closest("#checkoutButton");
    if (!btn) return;

    const items = Object.entries(state.cart).map(([id, qty]) => ({
        id,
        qty,
    }));

    try {
        const res = await fetch("/.netlify/functions/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
        });

        const data = await res.json();
        console.log("status:", res.status);
        console.log(data);

        if (!res.ok) {
            throw new Error(data.error || "Checkout session creation failed");
        }

        if (!data.url) {
            throw new Error("Missing checkout URL");
        }

        window.location.href = data.url;
    } catch (err) {
        console.error("Checkout failed:", err);
        alert(err.message || "Checkout failed");
    }
});

// State updater
const setState = updater => {
    updater(state);
    saveCart(state.cart)
    updateCartUI();
    renderCartPage(state);
}

// Final render
await applyLiveFieldsToProducts(state.products);
renderCartPage(state);

// Redirect
const params = new URLSearchParams(window.location.search);
const success = params.get('success');
const canceled = params.get('canceled');

if (success === '1') {
    // clear cart
    state.cart = {};
    clearCart();
    updateCartUI();

    // show message
    cartEmpty.hidden = false;
    cartItems.hidden = true;

    cartEmpty.textContent = 'Payment was successful';
    cartItems.innerHTML = "";
    cartTotal.textContent = "Total: £0.00";
    checkoutContainer.textContent = "";

    history.replaceState({}, "", window.location.pathname);
}

if (canceled === "1") {
    renderCartPage(state);

    cartEmpty.hidden = false;
    cartItems.hidden = false;
    checkoutContainer.hidden = false;

    cartEmpty.textContent = "Checkout cancelled";

    history.replaceState({}, "", window.location.pathname);
}