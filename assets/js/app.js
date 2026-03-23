// Import functions
import { loadCart } from "../../shared/cart-store.js"
import { PRODUCTS } from "../../shared/products.js";

// Product Map
let liveProductMap = new Map();

// Utilities
const penniesToPounds = pennies => (pennies / 100).toFixed(2);

// Load live product map
async function loadLiveProductMap() {
    try {
        const res = await fetch("/.netlify/functions/get-products-live");
        if (!res.ok) return;

        const data = await res.json();
        liveProductMap = new Map(data.products.map(product => [product.id, product]));

        updateCartUI();
    } catch {
        // fallback to local PRODUCTS silently
    }
}

// Query Selectors
const nav = document.querySelector('.template');
const footer = document.querySelector('.footer');

// Loading cart and totalling cart for Nav
const { totalItems, totalPennies } = getCartSummary();
loadLiveProductMap();

// Search params
const params = new URLSearchParams(window.location.search);
const currentQuery = params.get("q") || "";

// Cart summary
function getCartSummary() {
    const cart = loadCart() || {};

    let totalItems = 0;
    let totalPennies = 0;

    for (const [id, qty] of Object.entries(cart)) {
        const localProduct = PRODUCTS.find(p => p.id === id);
        if (!localProduct) continue;

        const liveProduct = liveProductMap.get(id);
        const price = liveProduct?.price ?? localProduct.price;

        totalItems += qty;
        totalPennies += price * qty;
    }

    return {
        totalItems,
        totalPennies
    };
}

// Exports
export function updateCartUI() {
    const { totalItems, totalPennies } = getCartSummary();

    const totalEl = document.querySelector('.cart-total');
    const itemsEl = document.querySelector('.cart-items');

    if (totalEl) totalEl.textContent = `£${penniesToPounds(totalPennies)}`;
    if (itemsEl) itemsEl.textContent = `${totalItems} ${totalItems === 1 ? "item" : "items"}`;
}

// Nav content
nav.innerHTML = `
    <a href="/" class="nav-logo"><img src="/assets/images/logo.png" height="35" /></a>
    <a href="/products/" class="nav-products">
    <span class="nav-products-icon-wrap">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
            <path d="m3.3 7 8.7 5 8.7-5"></path>
            <path d="M12 22V12"></path>
        </svg>
    </span>
    <span class="nav-products-label">PRODUCTS</span>
    </a>
    <a href="https://www.tiktok.com/@onetwotcg"
    class="nav-tiktok"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="TikTok">

        <span class="tiktok-icon-wrap">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.38V2h-3.2v12.39a2.89 2.89 0 1 1-2-2.75V8.41a6.08 6.08 0 1 0 5.99 6.08V8.2a8.07 8.07 0 0 0 4.8 1.6V6.69Z"/>
            </svg>
        </span>

        <span class="tiktok-label">RIP & SHIP</span>
    </a>
    <div class="nav-right">
        <form class="nav-search" action="/products/" method="GET">
            <input type="text" name="q" placeholder="Search Products" value="${currentQuery}">
            <button type="submit">Search</button>
        </form>
        <a id="cart" href="/cart/">
        <span class="cart-icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="shopping-basket" aria-hidden="true" class="lucide lucide-shopping-basket">
            <path d="m15 11-1 9"></path>
            <path d="m19 11-4-7"></path>
            <path d="M2 11h20"></path>
            <path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4"></path>
            <path d="M4.5 15.5h15"></path><path d="m5 11 4-7"></path>
            <path d="m9 11 1 9"></path>
            </svg>
        </span>
        <span class="cart-copy">
            <span class="cart-total">£${penniesToPounds(totalPennies)}</span>
            <span class="cart-items">${totalItems} ${totalItems === 1 ? "item" : "items"}</span>
        </span>
        </a>
    </div>
`

// Footer content
footer.innerHTML = `
    <div>
        <h4>Shop</h4>
        <a href="/products/">Products</a>
        <a href="https://www.tiktok.com/@onetwotcg" target="_blank">TikTok (Rip & Ship)</a>
    </div>

    <div>
        <h4>Support</h4>
        <a href="/shipping/">Shipping</a>
        <a href="/returns/">Returns</a>
        <a href="/contact/">Contact</a>
    </div>

    <div>
        <h4>One Two TCG</h4>
        <a href="/about/">About Us</a>
    </div>
`