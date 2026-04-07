import { supabase } from "./supabase-client.js";

const authView = document.querySelector("[data-auth-view]");
const authStatus = document.querySelector("[data-auth-status]");
const authTabs = document.querySelectorAll("[data-auth-tab]");
const authPanels = document.querySelectorAll("[data-auth-panel]");
const authGate = document.querySelector("[data-auth-gate]");
const authReady = document.querySelector("[data-auth-ready]");
const sessionEmail = document.querySelector("[data-session-email]");
const sessionLogout = document.querySelector("[data-session-logout]");
const forgotMessage = document.querySelector("[data-forgot-message]");
const nextPath = new URLSearchParams(window.location.search).get("next") === "checkout" ? "checkout.html" : "butik.html";

function showStatus(message, isError = false) {
  if (!authStatus) {
    return;
  }

  authStatus.textContent = message;
  authStatus.dataset.state = isError ? "error" : "ok";
}

function switchTab(target) {
  authTabs.forEach((button) => {
    button.setAttribute("aria-selected", button.dataset.authTab === target ? "true" : "false");
  });

  authPanels.forEach((panel) => {
    panel.hidden = panel.dataset.authPanel !== target;
  });

  showStatus("");
}

authTabs.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.authTab));
});

document.querySelector("[data-signup-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  showStatus("Skapar konto...");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
      data: { full_name: fullName }
    }
  });

  if (error) {
    showStatus(error.message, true);
    return;
  }

  form.reset();
  showStatus("Konto skapat. Kolla din email och verifiera kontot innan du loggar in.");
  switchTab("signin");
});

document.querySelector("[data-signin-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  showStatus("Loggar in...");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showStatus(error.message, true);
    return;
  }

  showStatus("Inloggad. Skickar dig vidare...");
  setTimeout(() => {
    window.location.href = nextPath;
  }, 700);
});

document.querySelector("[data-forgot-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();

  showStatus("Skickar reset-lank...");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname.replace("auth.html", "reset-password.html")}`
  });

  if (error) {
    showStatus(error.message, true);
    return;
  }

  form.reset();
  forgotMessage.textContent = "Om ett konto finns for den har emailen har en reset-lank skickats.";
  showStatus("Reset-begaran skickad.");
});

sessionLogout?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.reload();
});

async function renderSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    showStatus(error.message, true);
    return;
  }

  const session = data.session;

  if (!session) {
    authGate.hidden = false;
    authReady.hidden = true;
    return;
  }

  authGate.hidden = true;
  authReady.hidden = false;
  sessionEmail.textContent = session.user.email || "Inloggad";
  const continueLink = document.querySelector("[data-auth-continue]");
  if (continueLink) {
    continueLink.setAttribute("href", nextPath);
  }
}

supabase.auth.onAuthStateChange(() => {
  renderSession();
});

switchTab("signin");
renderSession();
