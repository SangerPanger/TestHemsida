import { supabase } from "./supabase-client.js";

const output = document.getElementById("output");
const inputLine = document.getElementById("input-line");
const commandInput = document.getElementById("commandInput");

const speed = 18;
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
  focusInput();
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
    "Vill du",
    "1. logga in",
    "2. registrera konto [inbjudan-kravs]",
    "Skriv 1 eller 2."
  ], () => showInput("text"));
}

function showSigninFlow() {
  flow = "signin-email";
  typeLines([
    "",
    "Logga in vald.",
    "Ange din email."
  ], () => showInput("email"));
}

function showSignupFlow() {
  flow = "signup-invite";
  typeLines([
    "",
    "Registrera konto vald.",
    "Ange din inbjudningskod."
  ], () => showInput("text"));
}

function handleGlobalCommand(command) {
  if (command === "hjalp" || command === "help") {
    typeLines([
      "Kommandon:",
      "1 = logga in",
      "2 = registrera konto",
      "tillbaka = starta om flodet"
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
          invite_code: pending.inviteCode,
          referral_code: sessionStorage.getItem("mana_referral") || "",
          street_1: pending.street1,
          postal_code: pending.postalCode,
          city: pending.city
        }
      }
    });

    if (error) {
      typeLines([
        `Fel: ${error.message}`,
        "Registreringen stoppades. Skriv tillbaka for att forsoka igen."
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
      "Flodet startar om."
    ], () => showModePrompt());
  });
}

function renderSession(email) {
  sessionMode = true;
  flow = "session";
  typeLines([
    "Du ar redan inloggad.",
    `Aktiv email: ${email || "okand"}`,
    "",
    "1. fortsatt",
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

  typeLine("Valj 1 for fortsatt eller 2 for att logga ut.", () => showInput("text"));
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
      pending.email = rawCommand.trim();

      if (!looksLikeEmail(pending.email)) {
        typeLine("Det dar ser inte ut som en giltig email. Forsok igen.", () => showInput("email"));
        return;
      }

      flow = "signin-password";
      typeLine("Ange ditt losenord.", () => showInput("password"));
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
        typeLine("Kod godkand. Vad heter du?", () => showInput("text"));
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
      typeLine("Ange ditt efternamn.", () => showInput("text"));
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
        typeLine("Det dar ser inte ut som en giltig email. Forsok igen.", () => showInput("email"));
        return;
      }

      flow = "signup-password";
      typeLine("Skapa ett losenord. Minst 8 tecken.", () => showInput("password"));
      return;

    case "signup-password":
      pending.password = rawCommand;

      if (pending.password.length < 8) {
        typeLine("Losenordet maste vara minst 8 tecken. Forsok igen.", () => showInput("password"));
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

async function init() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    typeLines([
      `Auth-fel: ${error.message}`
    ], () => showInput("text"));
    return;
  }

  const intro = [
    "ManaMarket access initieras...",
    "Registrerade kunder far fortsatt till butik och checkout."
  ];

  if (data.session) {
    typeLines(intro, () => renderSession(data.session.user.email));
    return;
  }

  typeLines(intro, () => showModePrompt());
}

init();
