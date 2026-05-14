const orderIdEl = document.querySelector("#orderId");
const orderDateEl = document.querySelector("#orderDate");
const shippingMethodEl = document.querySelector("#shippingMethod");
const shippingAddressEl = document.querySelector("#shippingAddress");
const itemsBodyEl = document.querySelector("#itemsBody");
const customerEmailEl = document.querySelector("#customerEmail");

function getOrderIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("orderId");
}

async function fetchOrder(orderId) {
  const res = await fetch(`/.netlify/functions/get-order-for-slip?orderId=${encodeURIComponent(orderId)}`);

  if (!res.ok) {
    throw new Error("Failed to fetch order");
  }

  const data = await res.json();
  return data.order;
}

// Formatting

function formatDate(dateString) {
  if (!dateString) return "—";

  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function renderAddress(shipping) {
  if (!shipping) {
    return "<p>No shipping address found.</p>";
  }

  const name = shipping.name || "";
  const address = shipping.address || {};

    return `
    <div>${name}</div>
    <div>${address.line1 || ""}</div>
    ${address.line2 ? `<div>${address.line2}</div>` : ""}
    <div>${address.city || ""}</div>
    ${address.state ? `<div>${address.state}</div>` : ""}
    <div>${address.postal_code || ""}</div>
    <div>${address.country || ""}</div>
    `;
}

function renderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<tr><td colspan="2">No items found.</td></tr>`;
  }

  return items.map(item => `
    <tr>
      <td>${item.name || item.id || "Unnamed item"}</td>
      <td>${item.qty || 0}</td>
    </tr>
  `).join("");
}

// Render

function renderOrder(order) {
  orderIdEl.textContent = order.id || "—";
  orderDateEl.textContent = formatDate(order.created_at);
  shippingMethodEl.textContent = order.shipping_method || "—";

  shippingAddressEl.innerHTML = renderAddress(order.shipping);
  itemsBodyEl.innerHTML = renderItems(order.items);

  customerEmailEl.innerHTML = `<strong>Email:</strong> ${order.customer_email || "—"}`;
}

// Initialise

async function init() {
  try {
    const orderId = getOrderIdFromUrl();

    if (!orderId) {
      orderIdEl.textContent = "Missing orderId";
      shippingAddressEl.innerHTML = "<p>No orderId was provided in the URL.</p>";
      itemsBodyEl.innerHTML = `<tr><td colspan="2">Nothing to load.</td></tr>`;
      return;
    }

    const order = await fetchOrder(orderId);
    renderOrder(order);
  } catch (err) {
    console.error(err);
    shippingAddressEl.innerHTML = "<p>Could not load order.</p>";
    itemsBodyEl.innerHTML = `<tr><td colspan="2">Error loading items.</td></tr>`;
  }
}

init();