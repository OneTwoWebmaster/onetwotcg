// Imports
import { PRODUCTS } from "../../shared/products.js";

// DOM
const cartEmpty = document.querySelector('#cartEmpty');
const cartItems = document.querySelector('#cartItems');
const cartTotal = document.querySelector('#cartTotal');
const checkoutContainer = document.querySelector('#checkoutContainer');

// Key for Cart
const CART_KEY = 'oneTwoTcgCart';

// Utilities
const penniesToPounds = pennies => (pennies / 100).toFixed(2);

async function applyLiveFieldsToProducts(products) {
  const res = await fetch("/.netlify/functions/get-products-live");
  if (!res.ok) return; // keep static fallback
  const data = await res.json();

  const map = new Map(data.products.map(p => [p.id, p]));
  for (const p of products) {
    const live = map.get(p.id);
    if (!live) continue;
    // overwrite the fields that must be authoritative
    p.price = live.price;
    p.stock = live.stock;
  }
}

// Define State
const state = {
    products: PRODUCTS,
    cart: {}
}

// Local Storage
try {
    const saved = localStorage.getItem(CART_KEY);
    state.cart = saved ? JSON.parse(saved) : {};
} catch {
    state.cart = {};
}

// Render logic
const renderCartPage = state => {
    const entries = Object.entries(state.cart);

    // Clear previous
    cartItems.innerHTML = '';
    cartEmpty.textContent = '';
    cartTotal.textContent = '';
    checkoutContainer.textContent = '';

    if (entries.length === 0) {
        cartEmpty.textContent = 'Your cart is empty.';
        cartTotal.textContent = 'Total: £0.00';
        return;
    }

    let totalPennies = 0;

    for (const [id, qty] of entries)    {
        const product = state.products.find((p) => p.id === id);
        if (!product) continue;

        const linePennies = product.price * qty;
        totalPennies += linePennies;

        const atMin = qty <= 0;
        const atMax = qty >= product.stock;
        
        const row = document.createElement('div');
        row.innerHTML = `
        <div><strong>${product.name}</strong></div>
        <div>Unit: £${penniesToPounds(product.price)}</div>
        <div>Qty: ${qty}</div>
        <div>Sub-total: £${penniesToPounds(linePennies)}</div>
        <div>
            <button data-action="dec" data-id="${product.id}" ${atMin ? "disabled" : ""}>-</button>
            <input type="number" data-id="${product.id}" min ="0" max="${product.stock}" step="1" size="2" value="${qty}" />
            <button data-action="inc" data-id="${product.id}" ${atMax ? "disabled" : ""}>+</button>
            <button data-action="remove" data-id="${product.id}">Remove</button>
        </div>
        <hr />
        `;
        cartItems.appendChild(row);
    }
    cartTotal.textContent = `Total: £${penniesToPounds(totalPennies)}`;
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

        const maxStock = product.stock;

        if (action === "dec" && currentQty > 0) {
            const lessQty = currentQty - 1;
            if (lessQty <= 0) delete state.cart[id];
            else state.cart[id] = lessQty;
        } else if (action === "inc" && currentQty < maxStock) {
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

        const maxStock = product.stock;

        if (desiredQty <= 0) delete state.cart[id];
        else state.cart[id] = Math.min(desiredQty, maxStock) 
    })
})

checkoutContainer.addEventListener('click', async e => {
    const btn = e.target.closest('button');
    const items = Object.entries(state.cart).map(([id, qty]) => {
        return {
            id: id,
            qty: qty
        };
    });
    const res = await fetch("/.netlify/functions/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ items }),
    });
    console.log("status:", res.status);
    const data = await res.json();
    window.location.href = data.url;
    console.log(JSON.stringify(data, null, 2));
})

// State updater
const setState = updater => {
    updater(state);
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    renderCartPage(state);
}

console.log(state.cart);

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
    localStorage.removeItem(CART_KEY);
    // show message
    cartEmpty.textContent = 'Payment was successful';
    cartItems.innerHTML = "";
    cartTotal.textContent = "Total: £0.00";
    checkoutContainer.textContent = "";

    history.replaceState({}, "", window.location.pathname);
} 
if (canceled === "1") {
    cartEmpty.textContent = 'Checkout cancelled';
    history.replaceState({}, "", window.location.pathname);
}