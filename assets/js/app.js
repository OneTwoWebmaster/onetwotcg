// Import functions
import { loadCart } from "../../shared/cart-store.js"
import { PRODUCTS } from "../../shared/products.js";
import { createIcons, ShoppingBasket } from "https://unpkg.com/lucide@latest/dist/esm/lucide.js"

// Query Selectors
const nav = document.querySelector('.template');
const footer = document.querySelector('.footer');

// Utilities
const penniesToPounds = pennies => (pennies / 100).toFixed(2);

// Loading cart and totalling cart for Nav
const { totalItems, totalPennies } = getCartSummary();

// Search params
const params = new URLSearchParams(window.location.search);
const currentQuery = params.get("q") || "";

// Cart summary
function getCartSummary() {
    const cart = loadCart() || {};

    let totalItems = 0;
    let totalPennies = 0;

    for (const [id, qty] of Object.entries(cart)) {
        const product = PRODUCTS.find(p => p.id === id);
        if (!product) continue;

        totalItems += qty;
        totalPennies += product.price * qty;
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
    <a href="/"><img src="/assets/images/logo.png" height="35" /></a>
    <a href="/products/">PRODUCTS</a>
    <div class="nav-right">
        <form class="nav-search" action="/products/" method="GET">
            <input type="text" name="q" placeholder="Search Products" value="${currentQuery}">
            <button type="submit">Search</button>
        </form>
        <a id="cart" href="/cart/">
        <span class="cart-icon-wrap">
            <i data-lucide="shopping-basket"></i>
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
    </div>

    <div>
        <h4>Support</h4>
        <a href="#">Shipping</a>
        <a href="#">Returns</a>
    </div>

    <div>
        <h4>One Two TCG</h4>
        <a href="#">About Us</a>
        <a href="#">Tik Tok</a>
    </div>
`

createIcons({
    icons: {
        ShoppingBasket
    }
});