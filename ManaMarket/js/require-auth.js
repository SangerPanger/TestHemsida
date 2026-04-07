import { supabase } from "./supabase-client.js";

const gate = document.querySelector("[data-checkout-gate]");
const content = document.querySelector("[data-checkout-content]");
const emailNode = document.querySelector("[data-checkout-email]");
const logoutButton = document.querySelector("[data-checkout-logout]");

async function loadSession() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session) {
    window.location.href = "auth.html?next=checkout";
    return;
  }

  gate.hidden = true;
  content.hidden = false;

  if (emailNode) {
    emailNode.textContent = session.user.email || "";
  }
}

logoutButton?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "auth.html";
});

loadSession();
