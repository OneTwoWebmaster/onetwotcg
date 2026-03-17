// Modules
import { PRODUCTS } from "../../shared/products.js";
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

async function applyLiveFieldsToProducts(products) {
  const res = await fetch("/.netlify/functions/get-products-live");
  if (!res.ok) return;
  const data = await res.json();

  const map = new Map(data.products.map(p => [p.id, p]));
  for (const p of products) {
    const live = map.get(p.id);
    if (!live) continue;
    p.price = live.price;
    p.stock = live.stock;
  }
}

// Render
function renderProductList(products) {
  state.cart = loadCart();
  productList.innerHTML = "";

  for (const product of products) {
    const qtyInCart = state.cart[product.id] || 0;
    const soldOut = product.stock <= 0;
    const maxedOut = qtyInCart >= product.stock && product.stock > 0;
    const disabledAdd = soldOut || maxedOut;

    let buttonLabel = "ADD TO BASKET";
    if (soldOut) {
      buttonLabel = "OUT OF STOCK";
    } else if (maxedOut) {
      buttonLabel = `ADD TO BASKET (${qtyInCart})`;
    } else if (qtyInCart > 0) {
      buttonLabel = `ADD TO BASKET (${qtyInCart})`;
    }

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
          <button class="btn btn-primary add-to-basket" data-id="${product.id}" type="button">${buttonLabel}</button>
        </div>
      </article>
    `;
  }
}

// Event handlers
if (productList) {
productList.addEventListener('click', e => {
  const btn = e.target.closest("button[data-id]");
  if(!btn) return;

  const id = btn.dataset.id;
  const product = state.products.find(p => p.id === id);
  if (!product) return;
  if (product.stock <= 0) return;
  state.cart = loadCart();
  const current = state.cart[id] || 0;
  if (current >= product.stock) return;
  state.cart[id] = current + 1;
  saveCart(state.cart);
  updateCartUI();
  btn.textContent = `ADD TO BASKET (${state.cart[id]})`;
});
}

// Final renders
renderProductList(productsToRender);

applyLiveFieldsToProducts(state.products)
  .then(() => renderProductList(productsToRender))
  .catch(() => {});