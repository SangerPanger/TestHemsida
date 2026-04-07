export const products = [
  {
    id: "clover-curse",
    name: "Clover Curse",
    priceSek: 289,
    note: "Sour blackberry / blackcurrant",
    description: "Sour blackberry och blackcurrant-profil med ett uttryck som kanns som rare loot drop.",
    badge: "Top Pick",
    swatch: "linear-gradient(135deg, #162648, #55192d 58%, #bc4b6b)"
  },
  {
    id: "ultra-instinct",
    name: "Ultra Instinct",
    priceSek: 289,
    note: "Cold / clean focus energy",
    description: "Kyld neon-energi i visual form. Perfekt som hero-produkt nar du vill ha ren high-performance vibe.",
    badge: "Focus",
    swatch: "linear-gradient(135deg, #11224e, #123a53 55%, #5ce1ff)"
  },
  {
    id: "sunburst-rush",
    name: "Sunburst Rush",
    priceSek: 289,
    note: "Candy heat / party stack",
    description: "Varma toner och candy-energy look. Byggd for kunder som valjer smak med ogonen forst.",
    badge: "Party Stack",
    swatch: "linear-gradient(135deg, #2f133f, #7f1a52 50%, #ff9f5a)"
  },
  {
    id: "starter-stack",
    name: "Starter Stack",
    priceSek: 289,
    note: "Fresh lime / easy entry",
    description: "En gateway-produkt for nya kunder som vill testa cube-formatet utan att sidan tappar edge.",
    badge: "Starter",
    swatch: "linear-gradient(135deg, #0c2c25, #25531d 55%, #c8ff63)"
  }
];

export const productMap = new Map(products.map((product) => [product.id, product]));

export function formatSek(amount) {
  return `${amount} SEK`;
}
