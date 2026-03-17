// Key for Cart
const CART_KEY = 'oneTwoTcgCart';

// Export functions
export function loadCart() {
    try {
        const saved = localStorage.getItem(CART_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

export function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCart() {
    localStorage.removeItem(CART_KEY);
}