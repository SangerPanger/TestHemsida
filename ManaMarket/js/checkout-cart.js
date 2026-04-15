import { clearCart, getCartTotals, removeFromCart, updateCartItem } from "./cart.js";
import { formatSek } from "./products.js";
import { supabase } from "./supabase-client.js";

const itemList = document.querySelector("[data-cart-items]");
const emptyState = document.querySelector("[data-cart-empty]");
const itemCountNodes = document.querySelectorAll("[data-cart-count]");
const subtotalNodes = document.querySelectorAll("[data-cart-subtotal]");
const vatNode = document.querySelector("[data-cart-vat]");
const shippingNode = document.querySelector("[data-cart-shipping]");
const discountNode = document.querySelector("[data-cart-discount]");
const totalNode = document.querySelector("[data-cart-total]");
const discountIncreaseButton = document.querySelector("[data-discount-increase]");
const discountDecreaseButton = document.querySelector("[data-discount-decrease]");
const clearButton = document.querySelector("[data-clear-cart]");
const completeButton = document.querySelector("[data-complete-order]");
const checkoutStatus = document.querySelector("[data-checkout-status]");
const firstNameInput = document.querySelector("[data-checkout-first-name]");
const lastNameInput = document.querySelector("[data-checkout-last-name]");
const emailInput = document.querySelector("[data-checkout-email-input]");
const streetInput = document.querySelector("[data-checkout-street]");
const postalInput = document.querySelector("[data-checkout-postal]");
const cityInput = document.querySelector("[data-checkout-city]");

const DISCOUNT_STEP_SEK = 10;
let availableCommissionSek = 0;
let selectedCommissionDiscountSek = 0;

function getMaxSelectableDiscountSek(totals) {
  return Math.max(0, Math.min(availableCommissionSek, totals.subtotalSek + totals.shippingSek));
}

function clampSelectedDiscount(totals) {
  const maxSelectable = getMaxSelectableDiscountSek(totals);
  selectedCommissionDiscountSek = Math.max(0, Math.min(selectedCommissionDiscountSek, maxSelectable));
}

function updateDiscountStepperState(totals) {
  const maxSelectable = getMaxSelectableDiscountSek(totals);

  if (discountIncreaseButton) {
    discountIncreaseButton.disabled = selectedCommissionDiscountSek + DISCOUNT_STEP_SEK > maxSelectable;
  }

  if (discountDecreaseButton) {
    discountDecreaseButton.disabled = selectedCommissionDiscountSek - DISCOUNT_STEP_SEK < 0;
  }
}

function createItemMarkup(item) {
  const article = document.createElement("div");
  article.className = "item";
  article.innerHTML = `
    <div class="thumb" style="--swatch: ${item.swatch};">
      <img src="${item.imageV1 || item.image}" alt="${item.name}" class="thumb-img">
    </div>
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
  clampSelectedDiscount(totals);
  const effectiveDiscountSek = totals.discountSek + selectedCommissionDiscountSek;
  const effectiveTotalSek = Math.max(0, totals.subtotalSek + totals.shippingSek - effectiveDiscountSek);

  itemCountNodes.forEach((node) => {
    node.textContent = String(totals.itemCount);
  });

  subtotalNodes.forEach((node) => {
    node.textContent = formatSek(totals.subtotalSek);
  });

  if (vatNode) {
    vatNode.textContent = formatSek(totals.vatSek);
  }

  if (shippingNode) {
    shippingNode.textContent = formatSek(totals.shippingSek);
  }

  if (discountNode) {
    discountNode.textContent = effectiveDiscountSek > 0 ? `- ${formatSek(effectiveDiscountSek)}` : `${formatSek(0)}`;
  }

  if (totalNode) {
    totalNode.textContent = formatSek(effectiveTotalSek);
  }

  updateDiscountStepperState(totals);

  itemList.innerHTML = "";

  if (totals.items.length === 0) {
    emptyState.hidden = false;
    clearButton.disabled = true;
    completeButton.setAttribute("aria-disabled", "true");
    completeButton.classList.add("is-disabled");
    if (checkoutStatus) {
      checkoutStatus.hidden = true;
    }
    selectedCommissionDiscountSek = 0;
    updateDiscountStepperState(totals);
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

function resolveCheckoutOrigin() {
  const origin = window.location.origin;
  if (!origin || origin === "null" || origin.startsWith("file:")) {
    return "";
  }

  return origin;
}

function resolveCheckoutBaseUrl() {
  try {
    const currentUrl = new URL(window.location.href);
    const basePath = currentUrl.pathname.endsWith("/")
      ? currentUrl.pathname
      : currentUrl.pathname.slice(0, currentUrl.pathname.lastIndexOf("/") + 1);

    return `${currentUrl.origin}${basePath}`;
  } catch {
    return "";
  }
}

function splitName(fullName = "") {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ")
  };
}

async function prefillCheckoutFields() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      return;
    }

    const user = data.session.user;
    const [{ data: profile }, { data: addresses }] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
      supabase
        .from("addresses")
        .select("street_1, postal_code, city, created_at, is_default")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
    ]);

    const metadataFullName = user.user_metadata?.full_name
      || [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(" ");
    const resolvedName = profile?.full_name || metadataFullName || "";
    const nameParts = splitName(resolvedName);
    const address = Array.isArray(addresses) && addresses.length ? addresses[0] : null;

    if (firstNameInput) {
      firstNameInput.value = nameParts.firstName;
    }

    if (lastNameInput) {
      lastNameInput.value = nameParts.lastName;
    }

    if (emailInput) {
      emailInput.value = profile?.email || user.email || "";
    }

    if (streetInput) {
      streetInput.value = address?.street_1 || user.user_metadata?.street_1 || "";
    }

    if (postalInput) {
      postalInput.value = address?.postal_code || user.user_metadata?.postal_code || "";
    }

    if (cityInput) {
      cityInput.value = address?.city || user.user_metadata?.city || "";
    }
  } catch {
    // Non-blocking: checkout should still work without autofill.
  }
}

async function loadAvailableCommission() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user?.id) {
      availableCommissionSek = 0;
      selectedCommissionDiscountSek = 0;
      renderCheckout();
      return;
    }

    const { data: commissionBalance, error: commissionError } = await supabase.rpc("get_total_available_commission", {
      p_user_id: data.session.user.id
    });

    if (commissionError) {
      availableCommissionSek = 0;
      selectedCommissionDiscountSek = 0;
      renderCheckout();
      return;
    }

    availableCommissionSek = Math.max(0, Math.floor((Number(commissionBalance) || 0) / 100));
    const totals = getCartTotals();
    selectedCommissionDiscountSek = Math.min(selectedCommissionDiscountSek, getMaxSelectableDiscountSek(totals));
    renderCheckout();
  } catch {
    availableCommissionSek = 0;
    selectedCommissionDiscountSek = 0;
    renderCheckout();
  }
}

async function startStripeCheckout(event) {
  event.preventDefault();

  const totals = getCartTotals();
  if (totals.itemCount === 0) {
    return;
  }

  const origin = resolveCheckoutOrigin();
  if (!origin) {
    showStatus("Checkout maste koras via en lokal server eller deployad doman, inte direkt som fil i webblasaren.", true);
    return;
  }

  const siteUrl = resolveCheckoutBaseUrl();
  if (!siteUrl) {
    showStatus("Kunde inte avgora korrekt base-url for checkout.", true);
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
        commissionDiscountSek: selectedCommissionDiscountSek,
        origin,
        siteUrl
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "Kunde inte starta Stripe-checkout.";

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData?.error || errorMessage;
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
      }

      throw new Error(errorMessage);
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

discountIncreaseButton?.addEventListener("click", () => {
  const totals = getCartTotals();
  const maxSelectable = getMaxSelectableDiscountSek(totals);
  selectedCommissionDiscountSek = Math.min(maxSelectable, selectedCommissionDiscountSek + DISCOUNT_STEP_SEK);
  renderCheckout();
});

discountDecreaseButton?.addEventListener("click", () => {
  selectedCommissionDiscountSek = Math.max(0, selectedCommissionDiscountSek - DISCOUNT_STEP_SEK);
  renderCheckout();
});

completeButton?.addEventListener("click", startStripeCheckout);

window.addEventListener("mana-cart-updated", renderCheckout);

renderCheckout();
prefillCheckoutFields();
loadAvailableCommission();
