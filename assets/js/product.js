// Modules
import { PRODUCTS } from "../../shared/products.js";

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
     
// Storage Key & State
const CART_KEY = 'oneTwoTcgCart';

const state = {
  products: PRODUCTS,
  cart: {}
};

// Local Storage
try {
    const savedCart = localStorage.getItem(CART_KEY);
    state.cart = savedCart ? JSON.parse(savedCart) : {};
} catch {
    state.cart = {};
}

// Render
const renderProductPage = (state) => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = state.products.find(p => p.id === id);
    const qtyInBasket = state.cart[product.id] || 0;
    
    productName.textContent = product.name;
    productPrice.textContent = `£${penniesToPounds(product.price)}`;
    if (product.stock === 0) {
        stockCount.textContent = 'Out of stock';
    } else if (product.stock > 0) {
        stockCount.textContent = `${product.stock} in stock`;
    };
    image.src = product.images[0];
    image.height = 250;
    image.alt = 'Scarlet & Violet Booster Pack';
    description.innerHTML = product.description;

    inCart.textContent = qtyInBasket > 0 ? `${qtyInBasket} in basket` : "";
}

// Setting the State
const setState = updater => {
    updater(state);
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
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
    numInput.value = Number(numInput.value) -1;
})

incBtn.addEventListener('click', () => {
    numInput.value = Number(numInput.value) + 1; 
})

cartBtn.addEventListener('click', () => {
    setState(state => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const product = state.products.find(p => p.id === id);

        const qty = Number(numInput.value);
        const current = state.cart[id] || 0;

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