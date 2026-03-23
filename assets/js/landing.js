// Modules
import { PRODUCTS } from "/shared/products.js";
import { applyLiveFieldsToProducts } from "/shared/live-products.js";
import { loadCart, saveCart } from "/shared/cart-store.js";
import { updateCartUI } from "/assets/js/app.js";

// DOM
const newArrivals = document.querySelector('#newArrivals');
const hotProducts = document.querySelector('#hotProducts');
const latestNews = document.querySelector('#latestNews');

// Utilities
const penniesToPounds = pennies => (pennies / 100).toFixed(2);

function getMaxAllowedQty(product) {
    if (!product) return 0;
    if (typeof product.maxPerOrder === "number") {
        return Math.min(product.stock, product.maxPerOrder);
    }
    return product.stock;
}

const state = {
    products: PRODUCTS,
    cart: {}
}

state.cart = loadCart();

// New arrivals
function renderNewArrivals() {
    const newest = [...state.products].sort((a, b) => {
        return new Date(b.releaseDate) - new Date(a.releaseDate);
    });

    const newestFour = newest.slice(0, 4);
    newArrivals.innerHTML = "";

    for (const product of newestFour) {
        const qtyInCart = state.cart[product.id] || 0;
        const soldOut = product.stock <= 0;
        const maxAllowed = getMaxAllowedQty(product);

        const stockMaxed = qtyInCart >= product.stock && product.stock > 0;
        const orderLimitMaxed =
            typeof product.maxPerOrder === "number" &&
            product.maxPerOrder < product.stock &&
            qtyInCart >= product.maxPerOrder;

        const maxedOut = stockMaxed || orderLimitMaxed;

        newArrivals.innerHTML += `
          <article class="product-card">
            <a class="product-media" href="products/product.html?id=${product.id}">
              <img class="product-img" src="${product.images[0]}" height="200" />
            </a>
            <div class="product-body">
              <a class="product-name" href="products/product.html?id=${product.id}">${product.name}</a>
              <div class="product-meta">
                <div class="product-price">£${penniesToPounds(product.price)}</div>
                <div class="stock-status">${product.stock} in stock</div>
              </div>
              <div class="card-qty-bar">
                <button
                  class="qty-btn qty-decrease"
                  data-id="${product.id}"
                  data-action="decrease"
                  type="button"
                  ${qtyInCart <= 0 ? 'disabled' : ''}
                >
                  −
                </button>

                <div class="qty-status ${
                  soldOut ? 'qty-status-disabled' : orderLimitMaxed ? 'qty-status-limit' : ''
                }">
                  ${soldOut
                    ? 'OUT OF STOCK'
                    : orderLimitMaxed
                      ? `MAXIMUM: ${product.maxPerOrder}`
                      : qtyInCart > 0
                        ? `IN BASKET (${qtyInCart})`
                        : 'ADD TO BASKET'}
                </div>

                <button
                  class="qty-btn qty-increase"
                  data-id="${product.id}"
                  data-action="increase"
                  type="button"
                  ${soldOut || maxedOut ? 'disabled' : ''}
                >
                  +
                </button>
              </div>
            </div>
          </article>
        `;
    }
}

// Hot Products
function renderHotProducts() {
    const hot = state.products.filter(product => product.tags?.includes("hot"));
    const hotFour = hot.slice(0, 4);

    hotProducts.innerHTML = "";

    for (const product of hotFour) {
        const qtyInCart = state.cart[product.id] || 0;
        const soldOut = product.stock <= 0;
        const maxAllowed = getMaxAllowedQty(product);

        const stockMaxed = qtyInCart >= product.stock && product.stock > 0;
        const orderLimitMaxed =
            typeof product.maxPerOrder === "number" &&
            product.maxPerOrder < product.stock &&
            qtyInCart >= product.maxPerOrder;

        const maxedOut = stockMaxed || orderLimitMaxed;

        hotProducts.innerHTML += `
          <article class="product-card">
            <a class="product-media" href="products/product.html?id=${product.id}">
              <img class="product-img" src="${product.images[0]}" height="200" />
            </a>
            <div class="product-body">
              <a class="product-name" href="products/product.html?id=${product.id}">${product.name}</a>
              <div class="product-meta">
                <div class="product-price">£${penniesToPounds(product.price)}</div>
                <div class="stock-status">${product.stock} in stock</div>
              </div>
              <div class="card-qty-bar">
                <button
                  class="qty-btn qty-decrease"
                  data-id="${product.id}"
                  data-action="decrease"
                  type="button"
                  ${qtyInCart <= 0 ? 'disabled' : ''}
                >
                  −
                </button>

                <div class="qty-status ${
                  soldOut ? 'qty-status-disabled' : orderLimitMaxed ? 'qty-status-limit' : ''
                }">
                  ${soldOut
                    ? 'OUT OF STOCK'
                    : orderLimitMaxed
                      ? `MAXIMUM: ${product.maxPerOrder}`
                      : qtyInCart > 0
                        ? `IN BASKET (${qtyInCart})`
                        : 'ADD TO BASKET'}
                </div>

                <button
                  class="qty-btn qty-increase"
                  data-id="${product.id}"
                  data-action="increase"
                  type="button"
                  ${soldOut || maxedOut ? 'disabled' : ''}
                >
                  +
                </button>
              </div>
            </div>
          </article>
        `;
    }
}

// Single page render
function renderLandingPage() {
    state.cart = loadCart();
    renderNewArrivals();
    renderHotProducts();
}

// Event listeners
document.addEventListener("click", e => {
    const btn = e.target.closest("button[data-id][data-action]");
    if (!btn) return;

    const id = btn.dataset.id;
    const action = btn.dataset.action;

    const product = state.products.find(p => p.id === id);
    if (!product) return;

    state.cart = loadCart();

    const current = state.cart[id] || 0;

    if (action === "increase") {
        const maxAllowed = getMaxAllowedQty(product);

        if (maxAllowed <= 0) return;
        if (current >= maxAllowed) return;

        state.cart[id] = current + 1;
    }

    if (action === "decrease") {
        if (current <= 1) {
            delete state.cart[id];
        } else {
            state.cart[id] = current - 1;
        }
    }

    saveCart(state.cart);
    updateCartUI();
    renderLandingPage();
});

// Live merge before first render
applyLiveFieldsToProducts(state.products)
    .catch(() => {})
    .finally(() => {
        renderLandingPage();
    });