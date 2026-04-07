import { supabase } from "./supabase-client.js";

const gate = document.querySelector("[data-profile-gate]");
const content = document.querySelector("[data-profile-content]");
const logoutButton = document.querySelector("[data-profile-logout]");
const statusNode = document.querySelector("[data-profile-status]");
const orderList = document.querySelector("[data-order-list]");
const orderEmpty = document.querySelector("[data-order-empty]");

function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}

function formatCurrency(cents = 0, currency = "EUR") {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: (currency || "EUR").toUpperCase()
  }).format((Number(cents) || 0) / 100);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}

function renderOrders(orders) {
  if (!orderList) {
    return;
  }

  if (!orders.length) {
    orderList.innerHTML = "";
    orderEmpty?.classList.remove("hidden");
    return;
  }

  orderEmpty?.classList.add("hidden");
  orderList.innerHTML = orders.map((order) => {
    const items = Array.isArray(order.order_items) ? order.order_items : [];
    const itemsMarkup = items.length
      ? items.map((item) => `
          <div class="order-item">
            <span>${item.product_name} x${item.quantity}</span>
            <strong>${formatCurrency(item.unit_price_cents * item.quantity, order.currency)}</strong>
          </div>
        `).join("")
      : `<div class="empty-state">Inga orderrader sparade pa den har ordern.</div>`;

    return `
      <article class="order-card">
        <div class="order-top">
          <div>
            <h3>Order ${String(order.id || "").slice(0, 8)}</h3>
            <div class="order-meta">${formatDate(order.created_at)}</div>
          </div>
          <div>
            <div class="order-badge">${order.status || "pending"}</div>
            <div style="margin-top:10px; font-weight:700; text-align:right;">${formatCurrency(order.total_cents, order.currency)}</div>
          </div>
        </div>
        <div class="order-items">${itemsMarkup}</div>
      </article>
    `;
  }).join("");
}

function resolveProfileName(profile, user) {
  return profile?.full_name || user?.user_metadata?.full_name || user?.email || "Din profil";
}

function resolveAddress(address, user) {
  const metadata = user?.user_metadata || {};

  if (address) {
    return {
      street: address.street_1 || "-",
      postal: address.postal_code || "-",
      city: address.city || "-",
      country: address.country || "SE",
      isDefault: address.is_default ? "Default" : "Sparad"
    };
  }

  return {
    street: metadata.street_1 || "-",
    postal: metadata.postal_code || "-",
    city: metadata.city || "-",
    country: "SE",
    isDefault: metadata.street_1 ? "Metadata" : "Saknas"
  };
}

async function loadProfile() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    window.location.href = "auth.html?next=profile";
    return;
  }

  const user = data.session.user;
  gate.hidden = true;
  content.hidden = false;

  const [{ data: profile }, { data: addresses }, { data: orders, error: ordersError }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("addresses").select("street_1, postal_code, city, country, is_default, created_at").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }).limit(1),
    supabase.from("orders").select("id, status, total_cents, currency, created_at, order_items(product_name, quantity, unit_price_cents)").eq("user_id", user.id).order("created_at", { ascending: false })
  ]);

  const primaryAddress = Array.isArray(addresses) && addresses.length ? addresses[0] : null;
  const resolvedAddress = resolveAddress(primaryAddress, user);
  const profileName = resolveProfileName(profile, user);
  const email = profile?.email || user.email || "-";

  setText("[data-profile-name]", profileName);
  setText("[data-profile-full-name]", profileName);
  setText("[data-profile-email]", email);
  setText("[data-profile-email-row]", email);
  setText("[data-profile-street]", resolvedAddress.street);
  setText("[data-profile-postal]", resolvedAddress.postal);
  setText("[data-profile-city]", resolvedAddress.city);
  setText("[data-profile-city-row]", resolvedAddress.city);
  setText("[data-profile-country]", resolvedAddress.country);
  setText("[data-address-street]", resolvedAddress.street);
  setText("[data-address-city]", resolvedAddress.city);
  setText("[data-address-postal]", resolvedAddress.postal);
  setText("[data-address-default]", resolvedAddress.isDefault);
  setText("[data-profile-order-count]", String(Array.isArray(orders) ? orders.length : 0));

  if (ordersError) {
    statusNode.textContent = "Profil laddad, men orders kunde inte hamtas.";
    renderOrders([]);
    return;
  }

  statusNode.textContent = "Konto laddat. Har ser du din profil och orderhistorik.";
  renderOrders(Array.isArray(orders) ? orders : []);
}

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "auth.html";
});

loadProfile();
