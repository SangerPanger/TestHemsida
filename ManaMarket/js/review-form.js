import { products } from "./products.js";
import { supabase } from "./supabase-client.js";

const form = document.querySelector("[data-review-form]");

if (form) {
  const flavorSelect = form.querySelector("[data-review-flavor]");
  const ratingInput = form.querySelector("[data-review-rating]");
  const ratingGrid = form.querySelector("[data-review-rating-grid]");
  const ratingBars = Array.from(form.querySelectorAll("[data-rating-value]"));
  const ratingCurrent = form.querySelector("[data-review-rating-current]");
  const commentField = form.querySelector("[data-review-comment]");
  const charCount = form.querySelector("[data-review-char-count]");
  const feedback = form.querySelector("[data-review-feedback]");
  const submitButton = document.querySelector('.review-form-submit');
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

  function formatRating(value) {
    return Number(value).toFixed(1);
  }

  function clampRating(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.min(5, Math.max(0, Math.round(value * 2) / 2));
  }

  function updateRating(value) {
    const normalized = clampRating(value);

    if (ratingInput) {
      ratingInput.value = normalized ? String(normalized) : "";
    }

    if (ratingGrid) {
      ratingGrid.setAttribute("aria-valuenow", String(normalized));
      ratingGrid.setAttribute("aria-valuetext", `${formatRating(normalized)} av 5`);
    }

    if (ratingCurrent) {
      ratingCurrent.textContent = `${formatRating(normalized)} / 5.0`;
    }

    ratingBars.forEach((bar, index) => {
      const barValue = index + 1;
      const fill = bar.querySelector(".review-rating-bar-fill");
      const fillAmount = Math.max(0, Math.min(1, normalized - (barValue - 1)));

      bar.classList.toggle("is-active", fillAmount > 0);
      bar.setAttribute("aria-pressed", fillAmount > 0 ? "true" : "false");

      if (fill) {
        fill.style.height = `${fillAmount * 100}%`;
      }
    });
  }

  function ratingFromPointer(event, button) {
    const baseValue = Number(button.dataset.ratingValue || "0");
    const rect = button.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const isHalf = offsetX < rect.width / 2;
    return baseValue - (isHalf ? 0.5 : 0);
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

  ratingBars.forEach((bar) => {
    bar.addEventListener("click", (event) => {
      updateRating(ratingFromPointer(event, bar));
    });
  });

  ratingGrid?.addEventListener("keydown", (event) => {
    const currentValue = Number(ratingInput?.value || 0);

    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      updateRating(currentValue + 0.5);
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      updateRating(currentValue - 0.5);
    }

    if (event.key === "Home") {
      event.preventDefault();
      updateRating(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      updateRating(5);
    }
  });

  commentField.addEventListener("input", updateCharCount);
  flavorSelect.addEventListener("change", () => {
    const selectedProduct = products.find((product) => product.slug === flavorSelect.value);
    renderPreview(selectedProduct);
  });

  updateCharCount();
  updateRating(0);
  renderPreview();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const flavorSlug = flavorSelect.value;
    const rating = Number(ratingInput?.value);
    const comment = commentField.value.trim();
    const selectedProduct = products.find((product) => product.slug === flavorSlug);

    if (!selectedProduct) {
      setFeedback("Valj en smak innan du skickar.", "is-error");
      return;
    }

    if (!Number.isFinite(rating) || rating < 0 || rating > 5 || Math.round(rating * 2) !== rating * 2) {
      setFeedback("Betyget maste vara mellan 0.0 och 5.0 i steg om 0.5.", "is-error");
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
      updateRating(0);
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
