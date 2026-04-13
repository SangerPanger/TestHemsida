import { supabase } from "./supabase-client.js";

const authLinks = document.querySelectorAll("[data-auth-nav]");

async function syncAuthNav() {
  if (!authLinks.length) {
    return;
  }

  const { data } = await supabase.auth.getSession();
  const isLoggedIn = Boolean(data.session);

  authLinks.forEach((link) => {
    link.textContent = isLoggedIn ? "Min profil" : "Logga in";
    link.setAttribute("href", isLoggedIn ? "minprofil.html" : "auth.html");
    link.style.color = "Black";
  });
}

syncAuthNav();
