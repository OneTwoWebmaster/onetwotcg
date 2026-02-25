// Module
import { PRODUCTS } from "../../shared/products.js";

// DOM
const productList = document.querySelector('#productList');

// Setting state
const state = {
  products: PRODUCTS,
  cart: {}
};

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

function renderProductList(products) {
  productList.innerHTML = "";

  for (const product of products) {
    productList.innerHTML += `
      <div class="product-card">
        <h4>${product.name}</h4>
        <div class="product-image">
          <a href="product.html?id=${product.id}">
            <img src="${product.images[0]}" height="200" />
          </a>
        </div>
        <div class="product-body">
          <div>£${penniesToPounds(product.price)}</div>
          <div>${product.stock} in stock</div>
          <div><a href="product.html?id=${product.id}">Detail Here</a></div>
        </div>
        <div class="product-footer"></div>
      </div>
    `;
  }
}

// Setting the State
const setState = updater => {
    updater(state);
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    renderProductListPage(state);
}

applyLiveFieldsToProducts(state.products).then(() => {
  renderProductList(state.products);
});
