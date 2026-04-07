const flavors = [
  {
    badge: "Sour / Dark",
    tag: "Blackberry",
    title: "Clover Curse",
    notes: "<strong>Vibe:</strong> sour blackberry och blackcurrant med dark neon-kansla och samlar-drop energi.",
    price: "289 SEK",
    profile: "Rare loot drop",
    bestFor: "Sena ranked sessions",
    counter: "01 / 04",
    packName: "Clover Curse",
    packSub: "Sour blackberry. Blackcurrant. Dark neon.",
    swatch: "linear-gradient(135deg, #161d47, #3d1847 52%, #b53b79)"
  },
  {
    badge: "Clean / Focus",
    tag: "Citrus Ice",
    title: "Ultra Instinct",
    notes: "<strong>Vibe:</strong> kall citrus, ren energi och high-performance estetik som kanns snabb direkt i forsta sippen.",
    price: "289 SEK",
    profile: "Locked-in mode",
    bestFor: "Scrims och fokusblock",
    counter: "02 / 04",
    packName: "Ultra Instinct",
    packSub: "Citrus ice. Clean hit. Focus mode.",
    swatch: "linear-gradient(135deg, #10214f, #12476a 56%, #5ce1ff)"
  },
  {
    badge: "Candy / Burst",
    tag: "Peach Mix",
    title: "Sunburst Rush",
    notes: "<strong>Vibe:</strong> varm peach-candy energi med festivalfarg, hog puls och tydlig snack appeal i designen.",
    price: "289 SEK",
    profile: "Party stack",
    bestFor: "Lan, content nights",
    counter: "03 / 04",
    packName: "Sunburst Rush",
    packSub: "Peach candy. Warm glow. Loud energy.",
    swatch: "linear-gradient(135deg, #341341, #8b2259 52%, #ff9f5a)"
  },
  {
    badge: "Fresh / Easy",
    tag: "Lime",
    title: "Starter Stack",
    notes: "<strong>Vibe:</strong> frisk limeprofil med latt entry-point kansla for den som vill in i cube-formatet utan overload.",
    price: "289 SEK",
    profile: "Easy entry",
    bestFor: "Forsta bestallningen",
    counter: "04 / 04",
    packName: "Starter Stack",
    packSub: "Fresh lime. Bright feel. Smooth start.",
    swatch: "linear-gradient(135deg, #0f3027, #2f611c 54%, #c8ff63)"
  }
];

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
