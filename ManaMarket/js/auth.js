import { supabase } from "./supabase-client.js";

const output = document.getElementById("output");
const inputLine = document.getElementById("input-line");
const commandInput = document.getElementById("commandInput");
const strengthContainer = document.getElementById("password-strength-container");
const strengthBarFill = document.getElementById("strength-bar-fill");
const strengthTime = document.getElementById("strength-time");

const speed = 4;
const urlParams = new URLSearchParams(window.location.search);
const nextParam = urlParams.get("next");
const refCode = urlParams.get("ref");

if (refCode) {
  sessionStorage.setItem("mana_referral", refCode);
}
const nextPath = nextParam === "checkout"
  ? "checkout.html"
  : nextParam === "profile"
    ? "minprofil.html"
    : "butik.html";

let isTyping = false;
let flow = "mode";
let sessionMode = false;
let pending = {
  mode: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  inviteCode: "",
  inviteValidated: false,
  street1: "",
  postalCode: "",
  city: ""
};

function focusInput() {
  setTimeout(() => {
    commandInput.focus();
  }, 0);
}

function resetInput(type = "text") {
  commandInput.type = type;
  commandInput.value = "";
}

function showInput(type = "text") {
  resetInput(type);
  inputLine.classList.remove("hidden");
  if (flow === "signup-password") {
    strengthContainer.classList.remove("hidden");
    updateStrength("");
  } else {
    strengthContainer.classList.add("hidden");
  }
  focusInput();
}

function updateStrength(password) {
  if (!password) {
    strengthBarFill.innerHTML = "";
    strengthTime.textContent = "";
    return;
  }

  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 33;

  const entropy = password.length * Math.log2(charsetSize || 1);
  const guesses = Math.pow(2, entropy);
  const guessesPerSecond = 1e10; // 10 billion guesses/sec
  const seconds = guesses / guessesPerSecond;

  let timeStr = "";
  if (seconds < 1) timeStr = "< 1 sek";
  else if (seconds < 60) timeStr = Math.floor(seconds) + " sek";
  else if (seconds < 3600) timeStr = Math.floor(seconds / 60) + " min";
  else if (seconds < 86400) timeStr = Math.floor(seconds / 3600) + " tim";
  else if (seconds < 31536000) timeStr = Math.floor(seconds / 86400) + " dag";
  else if (seconds < 3153600000) timeStr = Math.floor(seconds / 31536000) + " år";
  else if (seconds < 3153600000000) timeStr = Math.floor(seconds / 3153600000) + " millennier";
  else timeStr = "oändlighet";

  strengthTime.textContent = timeStr;

  // Visual bar: Segmented ▊ characters
  const maxSegments = 30;
  let percent = 0;

  if (timeStr === "oändlighet") {
    percent = 100;
  } else {
    // 100 bits of entropy is "very strong" for our scale
    percent = Math.min(100, (entropy / 100) * 100);
  }

  const activeSegments = Math.round((percent / 100) * maxSegments);
  strengthBarFill.style.width = percent + "%";
  strengthBarFill.innerHTML = "";
  for (let i = 0; i < activeSegments; i++) {
    const span = document.createElement("span");
    span.textContent = "▊";
    strengthBarFill.appendChild(span);
  }

  // Color logic
  if (percent < 25) strengthBarFill.style.color = "#ff4d4d";
  else if (percent < 50) strengthBarFill.style.color = "#ffa64d";
  else if (percent < 75) strengthBarFill.style.color = "#ffff4d";
  else strengthBarFill.style.color = "var(--text)";
}

function hideInput() {
  inputLine.classList.add("hidden");
}

function typeLine(text, callback) {
  let index = 0;
  isTyping = true;
  commandInput.disabled = true;

  function writeChar() {
    if (index < text.length) {
      output.textContent += text.charAt(index);
      index += 1;
      setTimeout(writeChar, speed);
      return;
    }

    output.textContent += "\n";
    isTyping = false;
    commandInput.disabled = false;

    if (callback) {
      callback();
    }
  }

  writeChar();
}

function typeLines(lines, callback, index = 0) {
  if (index >= lines.length) {
    if (callback) {
      callback();
    }
    return;
  }

  typeLine(lines[index], () => {
    setTimeout(() => typeLines(lines, callback, index + 1), 200);
  });
}

function showModePrompt() {
  flow = "mode";
  pending = {
    mode: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    inviteCode: "",
    inviteValidated: false,
    street1: "",
    postalCode: "",
    city: ""
  };

  typeLines([
    "",
    "Kommandon:",
    "1. logga in",
    "2. registrera konto [ref-kod-krävs]",
    "   tillbaka = [startar om flödet]",
    "Skriv 1 eller 2."
  ], () => showInput("text"));
}

function showSigninFlow() {
  const savedAccounts = JSON.parse(localStorage.getItem("mana_saved_accounts") || "[]");
  flow = "signin-email";

  const lines = ["", "Logga in vald."];
  if (savedAccounts.length > 0) {
    lines.push("Ange mail eller skriv 1 för sparade konton.");
  } else {
    lines.push("Ange din email.");
  }

  typeLines(lines, () => showInput("email"));
}

function showSignupFlow() {
  flow = "signup-invite";
  const storedRef = sessionStorage.getItem("mana_referral");

  typeLines([
    "",
    "Registrera konto vald.",
    "Ange din referal-kod."
  ], () => {
    showInput("text");
    if (storedRef) {
      commandInput.value = storedRef;
      pending.inviteCode = storedRef;
    }
  });
}

function handleGlobalCommand(command) {
  if (command === "hjalp" || command === "help") {
    typeLines([
      "Kommandon:",
      "1 = logga in",
      "2 = registrera konto",
      "tillbaka = starta om flödet"
    ], () => showInput(commandInput.type));
    return true;
  }

  if (command === "tillbaka" || command === "start") {
    showModePrompt();
    return true;
  }

  return false;
}

function looksLikeEmail(value) {
  return value.includes("@") && value.includes(".");
}

function normalizeInviteCode(value) {
  return value.trim().toUpperCase();
}

function normalizePostalCode(value) {
  return value.replace(/\s+/g, "").trim();
}

function isValidPostalCode(value) {
  const normalized = normalizePostalCode(value);
  return normalized.length >= 5;
}

function splitFullName(fullName) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  };
}

function composeFullName(firstName, lastName) {
  return [String(firstName || "").trim(), String(lastName || "").trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
}

async function syncAddressFromMetadata(user) {
  const metadata = user?.user_metadata || {};
  const street1 = String(metadata.street_1 || "").trim();
  const postalCode = normalizePostalCode(String(metadata.postal_code || ""));
  const city = String(metadata.city || "").trim();
  const firstNameMeta = String(metadata.first_name || "").trim();
  const lastNameMeta = String(metadata.last_name || "").trim();
  const fullName = String(metadata.full_name || composeFullName(firstNameMeta, lastNameMeta)).trim();

  if (!user?.id || !street1 || !postalCode || !city || !fullName) {
    return;
  }

  const { data: existingAddress, error: existingError } = await supabase
    .from("addresses")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingError || existingAddress) {
    return;
  }

  const { firstName, lastName } = splitFullName(fullName);

  await supabase.from("addresses").insert({
    user_id: user.id,
    first_name: firstName,
    last_name: lastName,
    street_1: street1,
    postal_code: postalCode,
    city,
    country: "SE",
    is_default: true
  });
}

async function validateInviteCode(code) {
  const normalizedCode = normalizeInviteCode(code);

  if (!normalizedCode) {
    return false;
  }

  const { data, error } = await supabase.rpc("check_invite_code", {
    p_code: normalizedCode
  });

  if (error) {
    return false;
  }

  return data === true;
}

async function submitSignin() {
  hideInput();
  typeLine("Loggar in...", async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: pending.email,
      password: pending.password
    });

    if (error) {
      typeLines([
        `Fel: ${error.message}`,
        "Prova igen eller skriv tillbaka."
      ], () => {
        flow = "signin-email";
        showInput("email");
      });
      return;
    }

    // Save account to localStorage on successful login
    const savedAccounts = JSON.parse(localStorage.getItem("mana_saved_accounts") || "[]");
    const accountExists = savedAccounts.some(acc => acc.email === pending.email);
    if (!accountExists) {
      savedAccounts.push({ email: pending.email, password: pending.password });
      localStorage.setItem("mana_saved_accounts", JSON.stringify(savedAccounts));
    }

    await syncAddressFromMetadata(data.user);

    typeLine("Inloggad. Skickar dig vidare...", () => {
      setTimeout(() => {
        window.location.href = nextPath;
      }, 700);
    });
  });
}

async function submitSignup() {
  hideInput();
  typeLine("Skapar konto...", async () => {
    const fullName = composeFullName(pending.firstName, pending.lastName);
    const { data, error } = await supabase.auth.signUp({
      email: pending.email,
      password: pending.password,
      options: {
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        data: {
          first_name: pending.firstName,
          last_name: pending.lastName,
          full_name: fullName,
          referral_code: pending.inviteCode || sessionStorage.getItem("mana_referral") || "",
          street_1: pending.street1,
          postal_code: pending.postalCode,
          city: pending.city
        }
      }
    });

    if (error) {
      typeLines([
        `Fel: ${error.message}`,
        "Registreringen stoppades. Skriv tillbaka för att försöka igen."
      ], () => {
        flow = "signup-invite";
        showInput("text");
      });
      return;
    }

    await syncAddressFromMetadata(data.user);

    typeLines([
      "Konto skapat.",
      "Verifiera din email innan du loggar in.",
      "Flödet startar om."
    ], () => showModePrompt());
  });
}

function renderSession(email) {
  sessionMode = true;
  flow = "session";
  typeLines([
    "Du är redan inloggad.",
    `Aktiv email: ${email || "okänd"}`,
    "",
    "1. fortsätt",
    "2. logga ut"
  ], () => showInput("text"));
}

async function handleSessionCommand(command) {
  if (command === "1" || command === "fortsatt") {
    typeLine("Skickar dig vidare...", () => {
      setTimeout(() => {
        window.location.href = nextPath;
      }, 500);
    });
    return;
  }

  if (command === "2" || command === "logga ut") {
    hideInput();
    await supabase.auth.signOut();
    output.textContent = "";
    sessionMode = false;
    typeLines([
      "Session avslutad."
    ], () => showModePrompt());
    return;
  }

  typeLine("Välj 1 för fortsätt vidare eller 2 för att logga ut.", () => showInput("text"));
}

async function handleCommand(rawCommand) {
  const command = rawCommand.trim().toLowerCase();

  if (!command) {
    focusInput();
    return;
  }

  if (sessionMode) {
    await handleSessionCommand(command);
    return;
  }

  if (handleGlobalCommand(command)) {
    return;
  }

  switch (flow) {
    case "mode":
      if (command === "1" || command === "logga in") {
        pending.mode = "signin";
        showSigninFlow();
        return;
      }

      if (command === "2" || command === "registrera konto" || command === "registrera") {
        pending.mode = "signup";
        showSignupFlow();
        return;
      }

      typeLine("Skriv 1 for logga in eller 2 for registrera konto.", () => showInput("text"));
      return;

    case "signin-email":
      if (rawCommand.trim() === "1") {
        const savedAccounts = JSON.parse(localStorage.getItem("mana_saved_accounts") || "[]");
        if (savedAccounts.length > 0) {
          flow = "signin-saved-accounts";
          const accountLines = ["", "Välj ett konto:"];
          savedAccounts.forEach((acc, i) => {
            accountLines.push(`${i + 1}. ${acc.email}`);
          });
          typeLines(accountLines, () => showInput("text"));
          return;
        }
      }

      pending.email = rawCommand.trim();

      if (!looksLikeEmail(pending.email)) {
        typeLine("Det dar ser inte ut som en giltig email. Forsok igen.", () => showInput("email"));
        return;
      }

      flow = "signin-password";
      typeLine("Ange ditt losenord.", () => showInput("password"));
      return;

    case "signin-saved-accounts":
      const index = parseInt(rawCommand.trim()) - 1;
      const accounts = JSON.parse(localStorage.getItem("mana_saved_accounts") || "[]");
      if (accounts[index]) {
        pending.email = accounts[index].email;
        pending.password = accounts[index].password;
        await submitSignin();
      } else {
        typeLine("Ogiltigt val. Försök igen eller skriv tillbaka.", () => showInput("text"));
      }
      return;

    case "signin-password":
      pending.password = rawCommand;
      await submitSignin();
      return;

    case "signup-invite":
      pending.inviteCode = normalizeInviteCode(rawCommand);
      pending.inviteValidated = false;

      if (!pending.inviteCode) {
        typeLine("Inbjudningskod kravs for att ga vidare.", () => showInput("text"));
        return;
      }

      hideInput();
      typeLine("Verifierar inbjudningskod...", async () => {
        const inviteIsValid = await validateInviteCode(pending.inviteCode);

        if (!inviteIsValid) {
          typeLines([
            "Ogiltig eller inaktiv inbjudningskod.",
            "Forsok igen."
          ], () => {
            flow = "signup-invite";
            showInput("text");
          });
          return;
        }

        pending.inviteValidated = true;
        flow = "signup-name";
        typeLine("Kod godkänd. Vad är ditt förnamn?", () => showInput("text"));
      });
      return;

    case "signup-name":
      if (!pending.inviteValidated) {
        showSignupFlow();
        return;
      }

      pending.firstName = rawCommand.trim();

      if (!pending.firstName) {
        typeLine("Skriv ditt fornamn for att fortsatta.", () => showInput("text"));
        return;
      }

      flow = "signup-last-name";
      typeLine("Och ditt efternamn.", () => showInput("text"));
      return;

    case "signup-last-name":
      pending.lastName = rawCommand.trim();

      if (!pending.lastName) {
        typeLine("Skriv ditt efternamn for att fortsatta.", () => showInput("text"));
        return;
      }

      flow = "signup-street";
      typeLine("Ange din adress.", () => showInput("text"));
      return;

    case "signup-street":
      pending.street1 = rawCommand.trim();

      if (!pending.street1) {
        typeLine("Adress kravs for att fortsatta.", () => showInput("text"));
        return;
      }

      flow = "signup-postal";
      typeLine("Ange ditt postnummer.", () => showInput("text"));
      return;

    case "signup-postal":
      pending.postalCode = normalizePostalCode(rawCommand);

      if (!isValidPostalCode(pending.postalCode)) {
        typeLine("Ogiltigt postnummer. Forsok igen.", () => showInput("text"));
        return;
      }

      flow = "signup-city";
      typeLine("Ange din ort.", () => showInput("text"));
      return;

    case "signup-city":
      pending.city = rawCommand.trim();

      if (!pending.city) {
        typeLine("Ort kravs for att fortsatta.", () => showInput("text"));
        return;
      }

      flow = "signup-email";
      typeLine("Ange din email.", () => showInput("email"));
      return;

    case "signup-email":
      pending.email = rawCommand.trim();

      if (!looksLikeEmail(pending.email)) {
        typeLine("Det där ser inte ut som en giltig email. Försök igen.", () => showInput("email"));
        return;
      }

      flow = "signup-password";
      typeLine("Skapa ett lösenord. Minst 12 tecken.", () => showInput("password"));
      return;

    case "signup-password":
      pending.password = rawCommand;

      if (pending.password.length < 12) {
        typeLine("Lösenordet måste vara minst 12 tecken. Försök igen.", () => showInput("password"));
        return;
      }

      await submitSignup();
      return;

    default:
      showModePrompt();
  }
}

commandInput.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter" || isTyping) {
    return;
  }

  if (flow === "signup-password") {
    strengthContainer.classList.add("hidden");
  }

  const currentValue = commandInput.value;
  const visibleValue = commandInput.type === "password" ? "*".repeat(currentValue.length) : currentValue;

  output.textContent += `> ${visibleValue}\n`;
  resetInput(commandInput.type);
  await handleCommand(currentValue);
});

document.addEventListener("click", () => {
  focusInput();
});

commandInput.addEventListener("blur", () => {
  focusInput();
});

commandInput.addEventListener("input", () => {
  if (flow === "signup-password") {
    updateStrength(commandInput.value);
  }
});

async function init() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    typeLines([
      `Auth-fel: ${error.message}`
    ], () => showInput("text"));
    return;
  }

  const intro = [
    "manabutiken.se access initieras...",
    "validerad kund krävs för att fortsätt till checkout."
  ];

  if (data.session) {
    typeLines(intro, () => renderSession(data.session.user.email));
    return;
  }

  typeLines(intro, () => showModePrompt());
}

init();
