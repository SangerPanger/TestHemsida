import { addToCart, getCartTotals } from "./cart.js";
import { formatSek, products } from "./products.js";
import { supabase } from "./supabase-client.js";

const feedbackNode = document.querySelector("[data-cart-feedback]");
const cartCountNodes = document.querySelectorAll("[data-cart-count]");
const productsGrid = document.querySelector("[data-products-grid]");
const toggleProductsButton = document.querySelector("[data-toggle-products]");
const flavorPackNode = document.querySelector("[data-flavor-pack]");
const flavorNameNode = document.querySelector("[data-flavor-pack-name]");
const flavorSubNode = document.querySelector("[data-flavor-pack-sub]");
const flavorDescriptionNode = document.querySelector("[data-flavor-description]");
const flavorImageNode = document.querySelector("[data-flavor-pack-image]");
const flavorCounterNode = document.querySelector("[data-flavor-counter]");
const flavorPipsNode = document.querySelector("[data-flavor-pips]");
const flavorPrevBtn = document.querySelector("[data-flavor-prev]");
const flavorNextBtn = document.querySelector("[data-flavor-next]");

let feedbackTimeoutId = 0;
let showAllProducts = false;
let currentFlavorIndex = 0;

// Vi använder alla smaker för "taste-preview" hjälten
const previewFlavors = products;
let inventoryBySlug = new Map(products.map((product) => [product.slug, product.stockQuantity]));
let averageRatingsBySlug = new Map();

async function fetchAverageRatings() {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("flavor_slug, rating")
      .eq("approved", true);

    if (error) {
      console.error("Error fetching reviews for ratings:", error);
      return;
    }

    const totals = {};
    const counts = {};

    data.forEach((review) => {
      const slug = review.flavor_slug;
      const rating = Number(review.rating);
      totals[slug] = (totals[slug] || 0) + rating;
      counts[slug] = (counts[slug] || 0) + 1;
    });

    Object.keys(totals).forEach((slug) => {
      averageRatingsBySlug.set(slug, totals[slug] / counts[slug]);
    });
  } catch (err) {
    console.error("Failed to fetch average ratings:", err);
  }
}

function renderManaRating(rating) {
  if (rating === undefined || rating === null) {
    return renderEmptyManaRating();
  }

  const percentage = (rating / 5) * 100;
  return `
    <div class="mana-rating-container" title="Medelbetyg: ${rating.toFixed(1)} / 5.0">
      <div class="mana-label">BETYG</div>
      <div class="mana-bar-outer">
        <div class="mana-bar-inner" style="width: ${percentage}%"></div>
        <div class="mana-bar-glare"></div>
      </div>
      <div class="mana-value">${rating.toFixed(1)}</div>
    </div>
  `;
}

function renderEmptyManaRating() {
  return `
    <div class="mana-rating-container is-empty" title="Inga betyg än">
      <div class="mana-label">BETYG</div>
      <div class="mana-bar-outer">
        <div class="mana-bar-inner" style="width: 0%; opacity: 0.3;"></div>
      </div>
      <div class="mana-value" style="opacity: 0.3;">0.0</div>
    </div>
  `;
}

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
    <article class="product-card" data-product-id="${product.id}">
      <div class="art" style="--swatch: ${product.swatch};" data-expansion-trigger>
        <img class="art-pack" src="${product.imageV1 || product.image}" alt="${product.name}">
      </div>
      <h3 data-expansion-trigger>${product.name}</h3>
      ${renderManaRating(averageRatingsBySlug.get(product.slug))}
      <div class="inventory-status ${Number(inventoryBySlug.get(product.slug) ?? product.stockQuantity) > 0 ? "is-in-stock" : "is-backorder"}">
        <span class="inventory-dot" aria-hidden="true"></span>
        <span class="inventory-label">${Number(inventoryBySlug.get(product.slug) ?? product.stockQuantity) > 0 ? "I lager" : "Bestallningsvara"}</span>
        <span class="inventory-count">${Number(inventoryBySlug.get(product.slug) ?? product.stockQuantity) > 0 ? `${Number(inventoryBySlug.get(product.slug) ?? product.stockQuantity)} st · Leveranstid 2-5 dagar` : "Leveranstid: 1-2 veckor"}</span>
      </div>
      <p><strong style="color: var(--cyan);">Aura & Vibe: </strong><br>${product.profile} - ${product.bestFor}<br><br>
      <strong style="color: var(--lime);">Smak: </strong><br>${product.packSub}</p>
      <div class="product-meta">
        <div class="price">${formatSek(product.priceSek)}</div>
        <button class="cta" type="button" data-add-to-cart data-product-id="${product.id}" data-product-name="${product.name}" data-product-price-sek="${product.priceSek}">Lagg till i varukorg</button>
      </div>
    </article>
  `).join("");

  attachAddToCartHandlers();
  attachExpansionHandlers();

  if (toggleProductsButton) {
    toggleProductsButton.textContent = showAllProducts ? "Visa Färre Produkter" : "Visa Alla Produkter";
  }
}

function attachExpansionHandlers() {
  const triggers = document.querySelectorAll("[data-expansion-trigger]");
  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const card = trigger.closest(".product-card");
      const productId = card.dataset.productId;
      toggleProductExpansion(productId, card);
    });
  });
}

function toggleProductExpansion(productId, cardElement) {
  const existingExpansion = document.querySelector(".product-expansion");
  const isSameProduct = existingExpansion?.dataset.forProduct === productId;

  if (existingExpansion) {
    existingExpansion.remove();
  }

  if (isSameProduct) {
    return;
  }

  const product = products.find((p) => p.id === productId);
  if (!product) return;
  const expansionHtml = `
    <div class="product-expansion" data-for-product="${product.id}">
      <button class="expansion-close" type="button" aria-label="Stäng">&times;</button>
      <div class="expansion-image-container" style="--expansion-swatch: ${product.swatch}">
        <img class="expansion-image" src="${product.imageV1 || product.image}" alt="${product.name}">
      </div>
      <div class="expansion-content">
        <div class="expansion-header">
          <div class="expansion-title-area">
            <h2>${product.name}</h2>
            ${renderManaRating(averageRatingsBySlug.get(product.slug))}
            <div class="inventory-status ${Number(inventoryBySlug.get(product.slug) ?? product.stockQuantity) > 0 ? "is-in-stock" : "is-backorder"}">
              <span class="inventory-dot" aria-hidden="true"></span>
              <span class="inventory-label">${Number(inventoryBySlug.get(product.slug) ?? product.stockQuantity) > 0 ? "I lager" : "Bestallningsvara"}</span>
              <span class="inventory-count">${Number(inventoryBySlug.get(product.slug) ?? product.stockQuantity) > 0 ? `${Number(inventoryBySlug.get(product.slug) ?? product.stockQuantity)} st · Leveranstid 2-5 dagar` : "Leveranstid: 1-2 veckor"}</span>
            </div>
          </div>
          <div class="expansion-meta">
            <br>
            <div class="expansion-price">${formatSek(product.priceSek)}</div>
            <button class="cta" type="button" data-add-to-cart data-product-id="${product.id}" data-product-name="${product.name}" data-product-price-sek="${product.priceSek}">Lägg till i varukorg</button>
          </div>
          <!--<div class="expansion-buy-row">
          </div>-->
        </div>

        <div class="expansion-tabs">
          <details open>
            <summary>Beskrivning</summary>
            <div class="details-body">
              <p><h2>Kraft-pulver för spelare</h2></p><p>Loot Cube Kraft-tillstånds-formeln innehåller hela 20 högdoserade ingredienser, får ditt mentala driv att arbeta på högvarv och tar dig längre än någon annan energidryck. Det bästa med det? Med endast 2 gram socker innehåller LOOT mindre socker än andra gaming boosters, energidrycker eller coladrycker. Utvecklad för den tänkande spelaren! <br><br>${product.description}</p>
            </div>
          </details>
          <details>
            <summary>Innehåll</summary>
            <div class="details-body">
              <p>Dextros, surhetsreglerande medel (citronsyra, äppelsyra), taurin, L-tyrosin, maltodextrin, magnesiumcitrat, färgande livsmedel, arom, guaranaextrakt, koffein, acetyl-L-karnitinhydroklorid, magnesiumoxid, L-askorbinsyra, sötningsmedel (sukralos), Bacopa monnieri-extrakt, grönt te-extrakt, ginsengextrakt, ginkgo biloba-extrakt, lutein, zinkcitrat, D-kalciumpantotenat, pyridoxinhydroklorid, tiaminmononitrat, riboflavin, krompikolinat, D-biotin, metylkobalamin.</p>
            </div>
          </details>
          <details>
            <summary>Näringsvärde</summary>
            <div class="details-body">
              <table class="nutrition-table">
                <tr><td>Energi</td><td>16 kcal / 71 kJ</td></tr>
                <tr><td>Koffein</td><td>200 mg</td></tr>
                <tr><td>Dextros</td><td>1 800 mg</td></tr>
                <tr><td>Taurin</td><td>1 000 mg</td></tr>
                <tr><td>Guaranaextrakt</td><td>188 mg</td></tr>
                <tr><td>Acetyl-L-karnitin</td><td>100 mg</td></tr>
                <tr><td>L-tyrosin</td><td>990 mg</td></tr>
                <tr><td>Vitamin B5</td><td>3,6 mg (60%)</td></tr>
                <tr><td>Grönt te-extrakt</td><td>40 mg</td></tr>
                <tr><td>Ginkgo biloba-extrakt</td><td>30 mg</td></tr>
                <tr><td>Ginsengextrakt</td><td>30 mg</td></tr>
                <tr><td>Bacopa monnieri-extrakt</td><td>60 mg</td></tr>
                <tr><td>Vitamin C</td><td>80 mg (100%)</td></tr>
                <tr><td>Vitamin B1</td><td>0,6 mg (55%)</td></tr>
                <tr><td>Vitamin B2</td><td>0,7 mg (50%)</td></tr>
                <tr><td>Vitamin B6</td><td>0,7 mg (50%)</td></tr>
                <tr><td>Vitamin B7</td><td>25 µg (50%)</td></tr>
                <tr><td>Vitamin B12</td><td>6 µg (240%)</td></tr>
                <tr><td>Magnesium</td><td>113 mg (30%)</td></tr>
                <tr><td>Zink</td><td>2,5 mg (25%)</td></tr>
                <tr><td>Lutein</td><td>2 mg</td></tr>
                <tr><td>Krom</td><td>20 µg (50%)</td></tr>
              </table>
            </div>
          </details>
          <details>
            <summary>Produktfakta</summary>
            <div class="details-body">
            <table class="nutrition-table">
                <tr><td>EAN:</td><td>XXXXXXXXX</td></tr>
                <tr><td>Varumärke:</td><td>Loot Cube</td></tr>
                <tr><td>Kategori:</td><td>Kosttillskott</td></tr>
                <tr><td>Bäst före-datum:</td><td>2028-06-24</td></tr>
                <tr><td>Förpackningsstorlek:</td><td>(50st portioner) 400g</td></tr>
            </table>
            </div>
          </details>
        </div>

      </div>
    </div>
  `;


  // Hitta var vi ska lägga in expansionen.
  // Vi vill lägga den ovanför raden där kortet befinner sig.
  // För att göra det enkelt i en grid, hittar vi det första elementet i samma rad.
  // Eller så kan vi bara lägga den precis före kortet och låta grid-column: 1 / -1 sköta resten.
  // Men användaren sa "ovanför som tar upp hela raden (row)".
  // Om vi lägger den före kortet, kommer den hamna på raden ovanför om det finns plats,
  // men grid-column: 1 / -1 tvingar den att ta en hel rad.

  // För att säkerställa att den hamnar på rätt plats (början av raden),
  // behöver vi veta hur många kolumner vi har. Antagligen 2 eller 4.
  // Ett säkert sätt är att hitta index av kortet och lägga expansionen före elementet på index: (index - (index % columns)).

  const allCards = Array.from(productsGrid.querySelectorAll(".product-card"));
  const cardIndex = allCards.indexOf(cardElement);

  // Detektera kolumner baserat på grid-layout
  const gridStyle = window.getComputedStyle(productsGrid);
  const columns = gridStyle.getPropertyValue('grid-template-columns').split(' ').length;

  const firstInRowIndex = cardIndex - (cardIndex % columns);
  const firstInRowElement = allCards[firstInRowIndex];

  // Om vi redan har en expansion öppen, kan den påverka insertion.
  // Men eftersom vi tar bort existingExpansion först, så är listan på allCards korrekt.

  firstInRowElement.insertAdjacentHTML('beforebegin', expansionHtml);

  // Scrolla till expansionen med lite offset för att inte hamna precis under headern
  const newExpansion = document.querySelector(".product-expansion");
  const yOffset = -100;
  const y = newExpansion.getBoundingClientRect().top + window.pageYOffset + yOffset;
  window.scrollTo({top: y, behavior: 'smooth'});

  // Hantera stäng-knapp
  newExpansion.querySelector(".expansion-close").addEventListener("click", () => {
    newExpansion.remove();
  });

  // Accordion logik för att bara ha en flik öppen åt gången (valfritt men snyggt)
  const detailsElements = newExpansion.querySelectorAll("details");
  detailsElements.forEach((targetDetail) => {
    targetDetail.querySelector("summary").addEventListener("click", (e) => {
      // Om vi klickar för att ÖPPNA, stäng de andra
      if (!targetDetail.open) {
        detailsElements.forEach((detail) => {
          if (detail !== targetDetail) {
            detail.removeAttribute("open");
          }
        });
      }
    });
  });

  // Återaktivera Köp-knapp i expansionen
  attachAddToCartHandlers();
}

function renderFlavor() {
  if (!flavorPackNode) return;

  const flavor = previewFlavors[currentFlavorIndex];
  if (!flavor) return;

  // Uppdatera texter
  if (flavorNameNode) flavorNameNode.textContent = flavor.name;
  if (flavorSubNode) flavorSubNode.textContent = flavor.packSub || flavor.note;
  if (flavorDescriptionNode) flavorDescriptionNode.textContent = flavor.description;
  if (flavorCounterNode) {
    flavorCounterNode.textContent = `${String(currentFlavorIndex + 1).padStart(2, '0')} / ${String(previewFlavors.length).padStart(2, '0')}`;
  }

  // Uppdatera bild
  if (flavorImageNode) {
    flavorImageNode.src = flavor.imageV2 || flavor.image;
    flavorImageNode.alt = flavor.name;
  }

  // Uppdatera gradient/swatch
  flavorPackNode.style.setProperty('--flavor-swatch', flavor.swatch);

  // Uppdatera pips
  if (flavorPipsNode) {
    flavorPipsNode.innerHTML = previewFlavors.map((_, i) => `
      <span class="flavor-pip ${i === currentFlavorIndex ? 'is-active' : ''}"></span>
    `).join("");
  }
}

function nextFlavor() {
  currentFlavorIndex = (currentFlavorIndex + 1) % previewFlavors.length;
  renderFlavor();
}

function prevFlavor() {
  currentFlavorIndex = (currentFlavorIndex - 1 + previewFlavors.length) % previewFlavors.length;
  renderFlavor();
}

toggleProductsButton?.addEventListener("click", () => {
  showAllProducts = !showAllProducts;
  renderProducts();
});

flavorNextBtn?.addEventListener("click", nextFlavor);
flavorPrevBtn?.addEventListener("click", prevFlavor);

// Trigga "Visa Alla Produkter" när man klickar på "Se sortiment"
document.querySelector('.hero-actions .cta[href="#produkter"]')?.addEventListener("click", () => {
  showAllProducts = true;
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

async function initShop() {
  await fetchAverageRatings();
  renderProducts();
  renderFlavor();
  renderCartCount();
  await loadInventoryStatus();
}

initShop();
