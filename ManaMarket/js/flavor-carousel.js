import { products } from "./products.js";

const flavors = products.map((product, index) => ({
  badge: product.flavorBadge,
  tag: product.flavorTag,
  title: product.name,
  notes: product.flavorNotes,
  price: `${product.priceSek} SEK`,
  profile: product.profile,
  bestFor: product.bestFor,
  counter: `${String(index + 1).padStart(2, "0")} / ${String(products.length).padStart(2, "0")}`,
  packName: product.name,
  packSub: product.packSub,
  swatch: product.swatch,
  image: product.image
}));

const showcase = document.querySelector("[data-flavor-showcase]");

if (showcase) {
  const badge = showcase.querySelector("[data-flavor-badge]");
  const tag = showcase.querySelector("[data-flavor-tag]");
  const title = showcase.querySelector("[data-flavor-title]");
  const notes = showcase.querySelector("[data-flavor-notes]");
  const price = showcase.querySelector("[data-flavor-price]");
  const profile = showcase.querySelector("[data-flavor-profile]");
  const bestFor = showcase.querySelector("[data-flavor-bestfor]");
  const counter = showcase.querySelector("[data-flavor-counter]");
  const pack = showcase.querySelector("[data-flavor-pack]");
  const packName = showcase.querySelector("[data-flavor-pack-name]");
  const packSub = showcase.querySelector("[data-flavor-pack-sub]");
  const packImage = showcase.querySelector("[data-flavor-pack-image]");
  const prevButton = showcase.querySelector("[data-flavor-prev]");
  const nextButton = showcase.querySelector("[data-flavor-next]");
  const pips = showcase.querySelector("[data-flavor-pips]");

  let currentIndex = 0;

  function renderFlavor(index) {
    const flavor = flavors[index];

    badge.textContent = flavor.badge;
    tag.textContent = flavor.tag;
    title.textContent = flavor.title;
    notes.innerHTML = flavor.notes;
    price.textContent = flavor.price;
    profile.textContent = flavor.profile;
    bestFor.textContent = flavor.bestFor;
    counter.textContent = flavor.counter;
    packName.textContent = flavor.packName;
    packSub.textContent = flavor.packSub;
    pack.style.setProperty("--flavor-swatch", flavor.swatch);

    if (packImage) {
      packImage.src = flavor.image;
      packImage.alt = flavor.title;
    }

    Array.from(pips.children).forEach((pip, pipIndex) => {
      pip.classList.toggle("is-active", pipIndex === index);
      pip.setAttribute("aria-pressed", pipIndex === index ? "true" : "false");
    });
  }

  function setFlavor(index) {
    currentIndex = (index + flavors.length) % flavors.length;
    renderFlavor(currentIndex);
  }

  flavors.forEach((flavor, index) => {
    const pip = document.createElement("button");
    pip.type = "button";
    pip.className = "flavor-pip";
    pip.setAttribute("aria-label", `Visa smak ${index + 1}: ${flavor.title}`);
    pip.setAttribute("aria-pressed", "false");
    pip.addEventListener("click", () => {
      setFlavor(index);
    });
    pips.appendChild(pip);
  });

  prevButton?.addEventListener("click", () => {
    setFlavor(currentIndex - 1);
  });

  nextButton?.addEventListener("click", () => {
    setFlavor(currentIndex + 1);
  });

  renderFlavor(currentIndex);
}
