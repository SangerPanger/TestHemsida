import { products } from "./products.js";
import { supabase } from "./supabase-client.js";

const form = document.querySelector("[data-review-form]");

if (form) {
  const reviewsFeed = document.querySelector("[data-reviews-feed]");
  const reviewsEmpty = document.querySelector("[data-reviews-empty]");
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

  function getDisplayName(user) {
    const metadataName = user?.user_metadata?.full_name?.trim();

    if (metadataName) {
      return metadataName;
    }

    const email = user?.email?.trim();

    if (email) {
      return email.split("@")[0];
    }

    return "manabutiken User";
  }

  function formatPublicName(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) {
      return "manabutiken User";
    }

    if (parts.length === 1) {
      return parts[0];
    }

    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    return `${firstName} ${lastName[0]}.`;
  }

  function getInitials(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) {
      return "MM";
    }

    return parts.map((part) => part[0].toUpperCase()).join("");
  }

  function createReviewCard(review) {
    const card = document.createElement("article");
    card.className = "review-card";

    if (!review.approved) {
      card.classList.add("is-pending");
    }

    const displayName = (review.display_name || "").trim() || "manabutiken User";
    const publicName = formatPublicName(displayName);
    const metaLabel = review.approved ? review.flavor_name : "Pending review";

    const head = document.createElement("div");
    head.className = "review-head";

    const stars = document.createElement("span");
    stars.className = "stars";
    stars.textContent = `${Number(review.rating).toFixed(1)} / 5.0`;
    stars.style.marginRight = "10px";

    const muted = document.createElement("span");
    muted.className = "muted";
    muted.textContent = metaLabel;

    head.append(stars, muted);
    head.style.marginBottom = "15px";
    head.style.display = "block";

    const title = document.createElement("h3");
    title.textContent = review.flavor_name;

    const quote = document.createElement("p");
    quote.textContent = `"${review.comment}"`;

    const user = document.createElement("div");
    user.className = "review-user";

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = getInitials(displayName);

    const userMeta = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = publicName;
    const sub = document.createElement("span");
    sub.textContent = review.approved ? review.flavor_slug : "Vantar pa godkannande";

    userMeta.append(strong, sub);
    user.append(avatar, userMeta);

    card.append(head, title, quote, user);
    return card;
  }

  function renderReviews(reviews) {
    if (!reviewsFeed || !reviewsEmpty) {
      return;
    }

    reviewsFeed.querySelectorAll(".review-card[data-review-live]").forEach((node) => node.remove());

    if (!reviews.length) {
      reviewsEmpty.hidden = false;
      return;
    }

    reviewsEmpty.hidden = true;

    reviews.forEach((review) => {
      const card = createReviewCard(review);
      card.dataset.reviewLive = "true";
      reviewsFeed.appendChild(card);
    });
  }

  async function loadReviews() {
    if (!reviewsFeed) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, display_name, flavor_name, flavor_slug, rating, comment, approved, created_at")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        throw error;
      }

      renderReviews(data ?? []);
    } catch (error) {
      console.error("Could not load reviews", error);

      if (reviewsEmpty) {
        reviewsEmpty.hidden = false;
        reviewsEmpty.textContent = "Kunde inte hamta reviews just nu.";
      }
    }
  }

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
      previewName.textContent = "Välj en smak att rösta";
      previewNote.textContent = "Uppdateras när du väljer en smak i dropdown-menyn.";
      previewArt.style.setProperty("--swatch", "linear-gradient(135deg, #122446, #37111d)");
      previewImage.src = "bilder/Front/FrontStartPack.png";
      previewImage.alt = "";
      return;
    }

    previewName.textContent = product.name;
    previewNote.textContent = product.note;
    previewArt.style.setProperty("--swatch", product.swatch);
    previewImage.src = product.imageV2 || product.image;
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
  loadReviews();

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
        display_name: getDisplayName(user),
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
      await loadReviews();
    } catch (error) {
      console.error("Could not save review", error);
      setFeedback("Kunde inte spara review just nu.", "is-error");
    } finally {
      submitButton.disabled = false;
    }
  });
}
