import { products } from "./products.js";
import { supabase } from "./supabase-client.js";

const form = document.querySelector("[data-review-form]");

if (form) {
  const flavorSelect = form.querySelector("[data-review-flavor]");
  const ratingSelect = form.querySelector("[data-review-rating]");
  const commentField = form.querySelector("[data-review-comment]");
  const charCount = form.querySelector("[data-review-char-count]");
  const feedback = form.querySelector("[data-review-feedback]");
  const submitButton = form.querySelector('button[type="submit"]');
  const previewName = document.querySelector("[data-review-preview-name]");
  const previewNote = document.querySelector("[data-review-preview-note]");
  const previewArt = document.querySelector("[data-review-preview-art]");
  const previewImage = document.querySelector("[data-review-preview-image]");

  products.forEach((product) => {
    const option = document.createElement("option");
    option.value = product.slug;
    option.textContent = product.name;
    flavorSelect.appendChild(option);
  });

  function setFeedback(message, state = "") {
    feedback.textContent = message;
    feedback.classList.remove("is-error", "is-success");

    if (state) {
      feedback.classList.add(state);
    }
  }

  function updateCharCount() {
    charCount.textContent = `${commentField.value.length} / 150`;
  }

  function renderPreview(product) {
    if (!previewName || !previewNote || !previewArt || !previewImage) {
      return;
    }

    if (!product) {
      previewName.textContent = "Valj en smak";
      previewNote.textContent = "Gradientkort och packshot uppdateras nar du valjer en smak i dropdown-menyn.";
      previewArt.style.setProperty("--swatch", "linear-gradient(135deg, #122446, #37111d)");
      previewImage.src = "bilder/Front/FrontStartPack.png";
      previewImage.alt = "";
      return;
    }

    previewName.textContent = product.name;
    previewNote.textContent = product.note;
    previewArt.style.setProperty("--swatch", product.swatch);
    previewImage.src = product.image;
    previewImage.alt = product.name;
  }

  commentField.addEventListener("input", updateCharCount);
  flavorSelect.addEventListener("change", () => {
    const selectedProduct = products.find((product) => product.slug === flavorSelect.value);
    renderPreview(selectedProduct);
  });

  updateCharCount();
  renderPreview();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const flavorSlug = flavorSelect.value;
    const rating = Number(ratingSelect.value);
    const comment = commentField.value.trim();
    const selectedProduct = products.find((product) => product.slug === flavorSlug);

    if (!selectedProduct) {
      setFeedback("Valj en smak innan du skickar.", "is-error");
      return;
    }

    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      setFeedback("Betyget maste vara mellan 0 och 5.", "is-error");
      return;
    }

    if (!comment || comment.length > 150) {
      setFeedback("Kommentaren maste vara mellan 1 och 150 tecken.", "is-error");
      return;
    }

    setFeedback("Skickar review...");
    submitButton.disabled = true;

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const user = sessionData.session?.user;

      if (!user) {
        setFeedback("Logga in for att skicka en review.", "is-error");
        return;
      }

      const { error } = await supabase.from("reviews").insert({
        user_id: user.id,
        flavor_slug: selectedProduct.slug,
        flavor_name: selectedProduct.name,
        rating,
        comment
      });

      if (error) {
        throw error;
      }

      form.reset();
      updateCharCount();
      renderPreview();
      setFeedback("Review sparad. Den visas nar den ar godkand.", "is-success");
    } catch (error) {
      console.error("Could not save review", error);
      setFeedback("Kunde inte spara review just nu.", "is-error");
    } finally {
      submitButton.disabled = false;
    }
  });
}
