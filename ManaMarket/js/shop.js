import { addToCart, getCartTotals } from "./cart.js";
import { formatSek, products } from "./products.js";
import { supabase } from "./supabase-client.js";

const feedbackNode = document.querySelector("[data-cart-feedback]");
const cartCountNodes = document.querySelectorAll("[data-cart-count]");
const productsGrid = document.querySelector("[data-products-grid]");
const toggleProductsButton = document.querySelector("[data-toggle-products]");
let feedbackTimeoutId = 0;
let showAllProducts = false;
let inventoryBySlug = new Map(products.map((product) => [product.slug, product.stockQuantity]));

function renderCartCount() {
  const { itemCount } = getCartTotals();
  cartCountNodes.forEach((node) => {
    node.textContent = String(itemCount);
  });
}

function showFeedback(message) {
  if (!feedbackNode) {
    return;
  }

  feedbackNode.textContent = message;
  feedbackNode.hidden = false;
  window.clearTimeout(feedbackTimeoutId);
  feedbackTimeoutId = window.setTimeout(() => {
    feedbackNode.hidden = true;
  }, 2200);
}

function pulseCartCount() {
  cartCountNodes.forEach((node) => {
    node.classList.remove("is-bump");
    window.requestAnimationFrame(() => {
      node.classList.add("is-bump");
      window.setTimeout(() => {
        node.classList.remove("is-bump");
      }, 260);
    });
  });
}

function flashButton(button) {
  button.classList.remove("is-added");
  button.classList.add("is-pressed");

  window.setTimeout(() => {
    button.classList.remove("is-pressed");
    button.classList.add("is-added");

    window.setTimeout(() => {
      button.classList.remove("is-added");
    }, 520);
  }, 120);
}

function animateToCart(button) {
  const cartTarget = cartCountNodes[0] || document.querySelector(".cart-link");
  if (!cartTarget) {
    pulseCartCount();
    return;
  }

  const buttonRect = button.getBoundingClientRect();
  const targetRect = cartTarget.getBoundingClientRect();
  const startX = buttonRect.left + buttonRect.width / 2;
  const startY = buttonRect.top + buttonRect.height / 2;
  const endX = targetRect.left + targetRect.width / 2;
  const endY = targetRect.top + targetRect.height / 2;
  const flyer = document.createElement("div");

  flyer.className = "cart-flyer";
  document.body.appendChild(flyer);

  const startTime = performance.now();
  const duration = 650;
  const arcHeight = Math.min(180, Math.max(90, Math.abs(endY - startY) + 70));

  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - (1 - progress) * (1 - progress);
    const x = startX + (endX - startX) * eased;
    const baseY = startY + (endY - startY) * eased;
    const y = baseY - Math.sin(progress * Math.PI) * arcHeight;
    const scale = 1 - progress * 0.35;

    flyer.style.transform = `translate(${x - 9}px, ${y - 9}px) scale(${scale})`;
    flyer.style.opacity = `${0.92 - progress * 0.32}`;

    if (progress < 1) {
      window.requestAnimationFrame(frame);
      return;
    }

    flyer.remove();
    pulseCartCount();
  }

  window.requestAnimationFrame(frame);
}

function attachAddToCartHandlers() {
  const addButtons = document.querySelectorAll("[data-add-to-cart]");

  addButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.dataset.productId;
      const productName = button.dataset.productName || "Produkten";
      const priceSek = Number(button.dataset.productPriceSek);

      if (!productId) {
        return;
      }

      addToCart(productId, 1);
      renderCartCount();
      flashButton(button);
      animateToCart(button);
      showFeedback(`${productName} lades i varukorgen${Number.isFinite(priceSek) ? ` for ${formatSek(priceSek)}` : ""}.`);
    });
  });
}

function renderProducts() {
  if (!productsGrid) {
    return;
  }

  const visibleProducts = showAllProducts ? products : products.slice(0, 4);

  productsGrid.innerHTML = visibleProducts.map((product) => `
    <article class="product-card">
      <div class="art" style="--swatch: ${product.swatch};">
        <img class="art-pack" src="${product.image}" alt="${product.name}">
      </div>
      <h3>${product.name}</h3>
      <div class="inventory-status ${Number(inventoryBySlug.get(product.slug) ?? product.stockQuantity) > 0 ? "is-in-stock" : "is-backorder"}">
        <span class="inventory-dot" aria-hidden="true"></span>
        <span class="inventory-label">${Number(inventoryBySlug.get(product.slug) ?? product.stockQuantity) > 0 ? "I lager" : "Bestallningsvara"}</span>
        <span class="inventory-count">${Number(inventoryBySlug.get(product.slug) ?? product.stockQuantity) > 0 ? `${Number(inventoryBySlug.get(product.slug) ?? product.stockQuantity)} st · Leveranstid 2-5 dagar` : "Leveranstid: 1-2 veckor"}</span>
      </div>
      <p>${product.description}</p>
      <div class="product-meta">
        <div class="price">${formatSek(product.priceSek)}</div>
        <button class="cta" type="button" data-add-to-cart data-product-id="${product.id}" data-product-name="${product.name}" data-product-price-sek="${product.priceSek}">Lagg till i varukorg</button>
      </div>
    </article>
  `).join("");

  attachAddToCartHandlers();

  if (toggleProductsButton) {
    toggleProductsButton.textContent = showAllProducts ? "Visa fa cubes" : "Alla cubes";
  }
}

toggleProductsButton?.addEventListener("click", () => {
  showAllProducts = !showAllProducts;
  renderProducts();
});

async function loadInventoryStatus() {
  const slugs = products.map((product) => product.slug).filter(Boolean);

  try {
    const { data, error } = await supabase
      .from("products")
      .select("slug, stock_quantity")
      .in("slug", slugs);

    if (error || !Array.isArray(data)) {
      return;
    }

    inventoryBySlug = new Map(products.map((product) => [product.slug, product.stockQuantity]));
    data.forEach((row) => {
      if (typeof row.slug === "string" && Number.isFinite(row.stock_quantity)) {
        inventoryBySlug.set(row.slug, row.stock_quantity);
      }
    });

    renderProducts();
  } catch {
    // Keep local fallback stock values if Supabase inventory is unavailable.
  }
}

window.addEventListener("mana-cart-updated", renderCartCount);

renderProducts();
renderCartCount();
loadInventoryStatus();
