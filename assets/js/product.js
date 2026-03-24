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
const prevImg = document.querySelector('#prevImg');
const nextImg = document.querySelector('#nextImg');
const decBtn = document.querySelector('#decBtn');
const incBtn = document.querySelector('#incBtn');
const removeBtn = document.querySelector('#removeBtn');

// Utilities
const penniesToPounds = pennies => (pennies / 100).toFixed(2);

function getMaxAllowedQty(product) {
    if (!product) return 0;
    if (typeof product.maxPerOrder === "number") {
        return Math.min(product.stock, product.maxPerOrder);
    }
    return product.stock;
}

function updateQtyControls(product, qtyInBasket) {
    const maxAllowed = getMaxAllowedQty(product);
    const remainingAllowed = maxAllowed - qtyInBasket;
    const currentInput = Number(numInput.value);

    decBtn.disabled = currentInput <= 1;
    incBtn.disabled = remainingAllowed <= 0 || currentInput >= remainingAllowed;
    numInput.disabled = remainingAllowed <= 0;
    numInput.max = Math.max(0, remainingAllowed);
}

async function fetchLiveProduct(id) {
  const res = await fetch("/.netlify/functions/get-products-live");
  if (!res.ok) return null;
  const data = await res.json();
  return data.products.find(p => p.id === id) ?? null;
}

const state = {
  products: PRODUCTS,
  cart: {},
  currentImageIndex: 0
};

// Render
const renderProductPage = (state) => {
    state.cart = loadCart();

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = state.products.find(p => p.id === id);
    const qtyInBasket = state.cart[product.id] || 0;

    if (state.currentImageIndex >= product.images.length) {
    state.currentImageIndex = 0;
    }

    const maxAllowed = getMaxAllowedQty(product);
    const remainingAllowed = maxAllowed - qtyInBasket;

    if (remainingAllowed <= 0) {
        numInput.value = 0;
    } else if (Number(numInput.value) > remainingAllowed) {
        numInput.value = remainingAllowed;
    } else if (Number(numInput.value) < 1) {
        numInput.value = 1;
    }

    const soldOut = product.stock <= 0;

    const stockMaxed = qtyInBasket >= product.stock && product.stock > 0;
    const orderLimitMaxed =
        typeof product.maxPerOrder === "number" &&
        product.maxPerOrder < product.stock &&
        qtyInBasket >= product.maxPerOrder;

    const maxedOut = stockMaxed || orderLimitMaxed;

    cartBtn.disabled = soldOut || maxedOut;
    updateQtyControls(product, qtyInBasket);

    if (soldOut) {
        cartBtn.textContent = 'Out of Stock';
    } else if (orderLimitMaxed) {
        cartBtn.textContent = `Maximum: ${product.maxPerOrder}`;
    } else if (maxedOut) {
        cartBtn.textContent = `In Basket (${qtyInBasket})`;
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
    } else {
        stockCount.textContent = `${product.stock} in stock`;
    }
    image.src = product.images[state.currentImageIndex];
    image.alt = product.name;
    description.innerHTML = product.description;

    inCart.textContent = qtyInBasket > 0
    ? typeof product.maxPerOrder === "number"
        ? `${qtyInBasket} in basket (Max ${product.maxPerOrder} per order)`
        : `${qtyInBasket} in basket`
    : "";
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

state.currentImageIndex = 0;
state.cart = loadCart();

fetchLiveProduct(id).then(live => {
  if (live) {
    const product = state.products.find(p => p.id === id);
    if (product) {
      product.price = live.price;
      product.stock = live.stock;
      product.maxPerOrder =
        typeof live.max_per_order === "number" ? live.max_per_order : undefined;
    }
  }

  state.cart = loadCart();
  renderProductPage(state);
});
 

// Event Listeners
decBtn.addEventListener('click', () => {
    if (Number(numInput.value) <= 1) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    numInput.value = Number(numInput.value) - 1;

    const qtyInBasket = state.cart[id] || 0;
    updateQtyControls(product, qtyInBasket);
});

incBtn.addEventListener('click', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    const qtyInBasket = state.cart[id] || 0;
    const maxAllowed = getMaxAllowedQty(product);
    const remainingAllowed = maxAllowed - qtyInBasket;

    if (Number(numInput.value) >= remainingAllowed) return;

    numInput.value = Number(numInput.value) + 1;
    updateQtyControls(product, qtyInBasket);
})

numInput.addEventListener('input', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    const qtyInBasket = state.cart[id] || 0;
    const maxAllowed = getMaxAllowedQty(product);
    const remainingAllowed = maxAllowed - qtyInBasket;

    let value = Number(numInput.value);

    if (Number.isNaN(value) || value < 1) value = 1;
    if (value > remainingAllowed) value = remainingAllowed;

    numInput.value = value;
    updateQtyControls(product, qtyInBasket);
});

cartBtn.addEventListener('click', () => {
    setState(state => {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        const product = state.products.find(p => p.id === id);
        if (!product) return;

        const maxAllowed = getMaxAllowedQty(product);
        if (maxAllowed <= 0) return;

        state.cart = loadCart();

        const qty = Number(numInput.value);
        const current = state.cart[id] || 0;

        if (current + qty > maxAllowed) return;

        state.cart[id] = current + qty;
        numInput.value = 1;
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

prevImg.addEventListener('click', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    if (state.currentImageIndex === 0) {
        state.currentImageIndex = product.images.length - 1;
    } else {
        state.currentImageIndex -= 1;
    }

    renderProductPage(state);
});

nextImg.addEventListener('click', () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    if (state.currentImageIndex === product.images.length - 1) {
        state.currentImageIndex = 0;
    } else {
        state.currentImageIndex += 1;
    }

    renderProductPage(state);
});