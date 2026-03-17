// Modules
import { PRODUCTS } from "../../shared/products.js";
import { loadCart, saveCart } from "../../shared/cart-store.js";
import { updateCartUI } from "./app.js";

// DOM
const productName = document.querySelector('#productName');
const productPrice = document.querySelector('#productPrice');
const stockCount = document.querySelector('#stockCount');
const image = document.querySelector('#image');
const description = document.querySelector('#description');
const cartBtn = document.querySelector('#cartBtn');
const inCart = document.querySelector('#inCart');
const numInput = document.querySelector('#numInput');

// Utilities
const penniesToPounds = pennies => (pennies / 100).toFixed(2);

async function fetchLiveProduct(id) {
  const res = await fetch("/.netlify/functions/get-products-live");
  if (!res.ok) return null;
  const data = await res.json();
  return data.products.find(p => p.id === id) ?? null;
}

const state = {
  products: PRODUCTS,
  cart: {}
};

// Render
const renderProductPage = (state) => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = state.products.find(p => p.id === id);
    const qtyInBasket = state.cart[product.id] || 0;

    const remainingStock = product.stock - qtyInBasket;
    if (remainingStock <= 0) {
        numInput.value = 0;
    } else if (Number(numInput.value) > remainingStock) {
        numInput.value = remainingStock;
    } else if (Number(numInput.value) < 1) {
        numInput.value = 1;
    }

    const soldOut = product.stock <= 0;
    const maxedOut = remainingStock <= 0;

    cartBtn.disabled = soldOut || maxedOut;
    incBtn.disabled = soldOut || Number(numInput.value) >= remainingStock;
    numInput.disabled = soldOut || maxedOut;
    decBtn.disabled = Number(numInput.value) <= 1;
    numInput.max = remainingStock;

    if (soldOut) {
        cartBtn.textContent = 'Out of Stock';
    } else if (qtyInBasket > 0) {
        cartBtn.textContent = `Add to Basket (${qtyInBasket})`;
    } else {
        cartBtn.textContent = 'Add to Basket';
    }

    if (soldOut) {
        numInput.value = 0;
    } else if (Number(numInput.value) < 1) {
        numInput.value = 1;
    }
    
    productName.textContent = product.name;
    productPrice.textContent = `£${penniesToPounds(product.price)}`;
    if (product.stock === 0) {
        stockCount.textContent = 'Out of stock';
    } else if (product.stock > 0) {
        stockCount.textContent = `${product.stock} in stock`;
    };
    image.src = product.images[0];
    image.alt = product.name;
    description.innerHTML = product.description;

    inCart.textContent = qtyInBasket > 0 ? `${qtyInBasket} in basket` : "";
}

// Setting the State
const setState = updater => {
    state.cart = loadCart();
    updater(state);
    saveCart(state.cart);
    updateCartUI();
    renderProductPage(state);
}

const params = new URLSearchParams(window.location.search);
const id = params.get('id');

fetchLiveProduct(id).then(live => {
  if (live) {
    const product = state.products.find(p => p.id === id);
    if (product) {
      product.price = live.price;
      product.stock = live.stock;
    }
  }

  renderProductPage(state);
});
 

// Event Listeners
decBtn.addEventListener('click', () => {
    if (Number(numInput.value) <= 1) return;
    numInput.value = Number(numInput.value) -1;
})

incBtn.addEventListener('click', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    if (Number(numInput.value) >= product.stock) return;
    numInput.value = Number(numInput.value) + 1; 
})

cartBtn.addEventListener('click', () => {
    setState(state => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const product = state.products.find(p => p.id === id);
        if (!product) return;

        if (product.stock <= 0) return;

        state.cart = loadCart();

        const qty = Number(numInput.value);
        const current = state.cart[id] || 0;

        if (current + qty > product.stock) return;

        state.cart[id] = current + qty;
    })
})

removeBtn.addEventListener('click', () => {
    setState(state => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const product = state.products.find(p => p.id === id);
        delete state.cart[product.id]
    })
})