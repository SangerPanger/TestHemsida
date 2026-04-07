import { productMap } from "./products.js";

const CART_STORAGE_KEY = "mana-market-cart";

function readCart() {
  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => typeof item?.id === "string" && Number.isFinite(item?.quantity))
      .map((item) => ({
        id: item.id,
        quantity: Math.max(0, Math.floor(item.quantity))
      }))
      .filter((item) => item.quantity > 0 && productMap.has(item.id));
  } catch {
    return [];
  }
}

function writeCart(cart) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("mana-cart-updated", { detail: getCart() }));
}

export function getCart() {
  return readCart();
}

export function addToCart(productId, quantity = 1) {
  const amount = Math.max(1, Math.floor(quantity));
  const cart = readCart();
  const existing = cart.find((item) => item.id === productId);

  if (existing) {
    existing.quantity += amount;
  } else {
    cart.push({ id: productId, quantity: amount });
  }

  writeCart(cart);
  return getCart();
}

export function updateCartItem(productId, quantity) {
  const cart = readCart();
  const nextQuantity = Math.max(0, Math.floor(quantity));
  const index = cart.findIndex((item) => item.id === productId);

  if (index === -1) {
    return getCart();
  }

  if (nextQuantity === 0) {
    cart.splice(index, 1);
  } else {
    cart[index].quantity = nextQuantity;
  }

  writeCart(cart);
  return getCart();
}

export function removeFromCart(productId) {
  return updateCartItem(productId, 0);
}

export function clearCart() {
  writeCart([]);
}

export function getCartDetails() {
  return readCart()
    .map((item) => {
      const product = productMap.get(item.id);
      if (!product) {
        return null;
      }

      return {
        ...product,
        quantity: item.quantity,
        lineTotalSek: product.priceSek * item.quantity
      };
    })
    .filter(Boolean);
}

export function getCartTotals() {
  const items = getCartDetails();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalSek = items.reduce((sum, item) => sum + item.lineTotalSek, 0);
  const shippingSek = itemCount > 0 ? 49 : 0;
  const discountSek = subtotalSek >= 850 ? 50 : 0;
  const totalSek = Math.max(0, subtotalSek + shippingSek - discountSek);

  return {
    items,
    itemCount,
    subtotalSek,
    shippingSek,
    discountSek,
    totalSek
  };
}
