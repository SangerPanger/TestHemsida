import { supabase } from "./supabase-client.js";

const statusNode = document.querySelector("[data-reset-status]");
const form = document.querySelector("[data-reset-form]");
const successNode = document.querySelector("[data-reset-success]");

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.dataset.state = isError ? "error" : "ok";
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (password.length < 8) {
    setStatus("Losenordet maste vara minst 8 tecken.", true);
    return;
  }

  if (password !== confirmPassword) {
    setStatus("Losenorden matchar inte.", true);
    return;
  }

  setStatus("Updaterar losenord...");

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    setStatus(error.message, true);
    return;
  }

  form.reset();
  successNode.hidden = false;
  setStatus("Losenord uppdaterat.");
});
