// Modules
import { PRODUCTS } from "/shared/products.js";
import { loadCart, saveCart } from "/shared/cart-store.js";
import { updateCartUI } from "/assets/js/app.js";

// DOM
const newArrivals = document.querySelector('#newArrivals');
const hotProducts = document.querySelector('#hotProducts');
const latestNews = document.querySelector('#latestNews');

// Utilities
const penniesToPounds = pennies => (pennies / 100).toFixed(2);

const state = {
    products: PRODUCTS,
    cart: {}
}

state.cart = loadCart();

// New arrivals
const newest = [...state.products].sort((a, b) => {
    return new Date(b.releaseDate) - new Date(a.releaseDate);
})

const newestFour = newest.slice(0, 4);
newArrivals.innerHTML = "";

for (const product of newestFour) {
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

    newArrivals.innerHTML += `
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

// Hot Products
const hot = state.products.filter(product => product.tags?.includes("hot"));
const hotFour = hot.slice(0, 4);

hotProducts.innerHTML = "";

for (const product of hotFour) {
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

    hotProducts.innerHTML += `
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

document.addEventListener("click", e => {
    const btn = e.target.closest("button[data-id]");
    if (!btn) return;

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
    if (state.cart[id] >= product.stock) {
        btn.disabled = true;
    }
});