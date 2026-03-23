export async function applyLiveFieldsToProducts(products) {
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