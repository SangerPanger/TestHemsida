import { clearCart, getCartTotals, removeFromCart, updateCartItem } from "./cart.js";
import { formatSek } from "./products.js";
import { supabase } from "./supabase-client.js";

const itemList = document.querySelector("[data-cart-items]");
const emptyState = document.querySelector("[data-cart-empty]");
const itemCountNodes = document.querySelectorAll("[data-cart-count]");
const subtotalNodes = document.querySelectorAll("[data-cart-subtotal]");
const shippingNode = document.querySelector("[data-cart-shipping]");
const discountNode = document.querySelector("[data-cart-discount]");
const totalNode = document.querySelector("[data-cart-total]");
const clearButton = document.querySelector("[data-clear-cart]");
const completeButton = document.querySelector("[data-complete-order]");
const checkoutStatus = document.querySelector("[data-checkout-status]");

function createItemMarkup(item) {
  const article = document.createElement("div");
  article.className = "item";
  article.innerHTML = `
    <div class="thumb" style="--swatch: ${item.swatch};"></div>
    <div>
      <h3>${item.name}</h3>
      <div class="item-meta">${item.note}</div>
      <div class="item-controls">
        <button class="qty-button" type="button" data-action="decrease">-</button>
        <span class="qty">x${item.quantity}</span>
        <button class="qty-button" type="button" data-action="increase">+</button>
        <button class="remove-button" type="button" data-action="remove">Ta bort</button>
      </div>
    </div>
    <div>
      <div class="qty">${item.quantity} st</div>
      <div class="price">${formatSek(item.lineTotalSek)}</div>
    </div>
  `;

  article.querySelector('[data-action="decrease"]')?.addEventListener("click", () => {
    updateCartItem(item.id, item.quantity - 1);
    renderCheckout();
  });

  article.querySelector('[data-action="increase"]')?.addEventListener("click", () => {
    updateCartItem(item.id, item.quantity + 1);
    renderCheckout();
  });

  article.querySelector('[data-action="remove"]')?.addEventListener("click", () => {
    removeFromCart(item.id);
    renderCheckout();
  });

  return article;
}

function renderCheckout() {
  if (!itemList) {
    return;
  }

  const totals = getCartTotals();

  itemCountNodes.forEach((node) => {
    node.textContent = String(totals.itemCount);
  });

  subtotalNodes.forEach((node) => {
    node.textContent = formatSek(totals.subtotalSek);
  });

  if (shippingNode) {
    shippingNode.textContent = formatSek(totals.shippingSek);
  }

  if (discountNode) {
    discountNode.textContent = totals.discountSek > 0 ? `- ${formatSek(totals.discountSek)}` : `${formatSek(0)}`;
  }

  if (totalNode) {
    totalNode.textContent = formatSek(totals.totalSek);
  }

  itemList.innerHTML = "";

  if (totals.items.length === 0) {
    emptyState.hidden = false;
    clearButton.disabled = true;
    completeButton.setAttribute("aria-disabled", "true");
    completeButton.classList.add("is-disabled");
    if (checkoutStatus) {
      checkoutStatus.hidden = true;
    }
    return;
  }

  emptyState.hidden = true;
  clearButton.disabled = false;
  completeButton.removeAttribute("aria-disabled");
  completeButton.classList.remove("is-disabled");

  totals.items.forEach((item) => {
    itemList.appendChild(createItemMarkup(item));
  });
}

function showStatus(message, isError = false) {
  if (!checkoutStatus) {
    return;
  }

  checkoutStatus.textContent = message;
  checkoutStatus.hidden = false;
  checkoutStatus.classList.toggle("is-error", isError);
}

async function startStripeCheckout(event) {
  event.preventDefault();

  const totals = getCartTotals();
  if (totals.itemCount === 0) {
    return;
  }

  completeButton?.setAttribute("aria-disabled", "true");
  completeButton?.classList.add("is-disabled");
  showStatus("Skapar Stripe-checkout...");

  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    const functionUrl = `${window.MANA_SUPABASE_CONFIG.url}/functions/v1/create-checkout-session`;
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: window.MANA_SUPABASE_CONFIG.anonKey,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({
        items: totals.items.map((item) => ({
          id: item.id,
          quantity: item.quantity
        })),
        origin: window.location.origin
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || "Kunde inte starta Stripe-checkout.");
    }

    const payload = await response.json();
    if (!payload?.url) {
      throw new Error("Stripe svarade utan checkout-url.");
    }

    showStatus("Skickar dig vidare till Stripe...");
    window.location.href = payload.url;
  } catch (error) {
    showStatus(error instanceof Error ? error.message : "Nagot gick fel nar checkout skulle startas.", true);
    completeButton?.removeAttribute("aria-disabled");
    completeButton?.classList.remove("is-disabled");
  }
}

clearButton?.addEventListener("click", () => {
  clearCart();
  renderCheckout();
});

completeButton?.addEventListener("click", startStripeCheckout);

window.addEventListener("mana-cart-updated", renderCheckout);

renderCheckout();
