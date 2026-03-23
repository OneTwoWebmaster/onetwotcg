// Modules
import { PRODUCTS } from "../../shared/products.js";
import { applyLiveFieldsToProducts } from "../../shared/live-products.js"
import { loadCart, saveCart } from "../../shared/cart-store.js"
import { updateCartUI } from "./app.js";

// DOM
const productList = document.querySelector('#productList');
const searchMessage = document.querySelector('#searchMessage');

// Setting state
const state = {
  products: PRODUCTS,
  cart: {}
};

// Search functionality
const params = new URLSearchParams(window.location.search);
const query = params.get("q");

let productsToRender = state.products;

if (query) {
  const term = query.toLowerCase();
  productsToRender = state.products.filter(product => product.name.toLowerCase().includes(term))
};

if (query && productsToRender.length === 0) {
  searchMessage.innerHTML = `No products found for "${query}". Try another search or go back to the <a href="/products">products</a> page.`
} else {
  searchMessage.textContent = '';
}

// Load cart
state.cart = loadCart();

// Utilities
const penniesToPounds = pennies => (pennies / 100).toFixed(2);

function getMaxAllowedQty(product) {
  if (!product) return 0;
  if (typeof product.maxPerOrder === "number") {
    return Math.min(product.stock, product.maxPerOrder);
  }
  return product.stock;
}

// Render
function renderProductList(products) {
  state.cart = loadCart();
  productList.innerHTML = "";

  for (const product of products) {
    const qtyInCart = state.cart[product.id] || 0;
    const soldOut = product.stock <= 0;
    const maxAllowed = getMaxAllowedQty(product);

    const stockMaxed = qtyInCart >= product.stock && product.stock > 0;
    const orderLimitMaxed =
      typeof product.maxPerOrder === "number" &&
      product.maxPerOrder < product.stock &&
      qtyInCart >= product.maxPerOrder;

    const maxedOut = stockMaxed || orderLimitMaxed;

    productList.innerHTML += `
      <article class="product-card">
        <a class="product-media" href="product.html?id=${product.id}">
          <img class="product-img" src="${product.images[0]}" height="200" />
        </a>
        <div class="product-body">
          <a class="product-name" href="product.html?id=${product.id}">${product.name}</a>
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

// Event handlers
if (productList) {
  productList.addEventListener('click', e => {
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
    renderProductList(productsToRender);
  });
}

// Final renders
applyLiveFieldsToProducts(state.products)
  .catch(() => {})
  .finally(() => {
    renderProductList(productsToRender);
  });