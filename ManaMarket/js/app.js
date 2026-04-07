const lines = [
  "Vilken dorr vill du ga in i?",
  "1. Logga in",
  "2. Galleri"
];

const speed = 25;

const output = document.getElementById("output");
const inputLine = document.getElementById("input-line");
const commandInput = document.getElementById("commandInput");

let isTyping = false;

function focusInput() {
  setTimeout(() => {
    commandInput.focus();
  }, 0);
}

function resizeInput() {
  const length = Math.max(commandInput.value.length + 1, 1);
  commandInput.style.width = `${length}ch`;
}

function typeLine(text, callback) {
  let i = 0;
  isTyping = true;
  commandInput.disabled = true;

  function writeChar() {
    if (i < text.length) {
      output.textContent += text.charAt(i);
      i += 1;
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

function typeLines(linesArray, index = 0, callback) {
  if (index < linesArray.length) {
    typeLine(linesArray[index], () => {
      setTimeout(() => {
        typeLines(linesArray, index + 1, callback);
      }, 300);
    });
    return;
  }

  if (callback) {
    callback();
  }
}

function showInput() {
  inputLine.classList.remove("hidden");
  resizeInput();
  focusInput();
}

function handleCommand(command) {
  if (command === "help" || command === "hjalp") {
    typeLine("Tillgangliga kommandon: hjalp, 1, 2, logga in, galleri, klar", focusInput);
    return;
  }

  if (command === "1" || command === "logga in") {
    typeLine("Laddar login...", () => {
      setTimeout(() => {
        window.location.href = "auth.html";
      }, 500);
    });
    return;
  }

  if (command === "2" || command === "galleri") {
    typeLine("Laddar...", () => {
      setTimeout(() => {
        window.location.href = "galleri.html";
      }, 500);
    });
    return;
  }

  if (command === "klar" || command === "clear") {
    output.textContent = "Vilken dorr vill du ga in i?\n";
    focusInput();
    return;
  }

  typeLine("Kanner inte igen kommandot.", focusInput);
}

commandInput.addEventListener("input", () => {
  resizeInput();
});

commandInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || isTyping) {
    return;
  }

  const command = commandInput.value.trim().toLowerCase();

  if (!command) {
    return;
  }

  output.textContent += `> ${command}\n`;
  commandInput.value = "";
  resizeInput();

  handleCommand(command);
});

document.addEventListener("click", () => {
  focusInput();
});

commandInput.addEventListener("blur", () => {
  focusInput();
});

typeLines(lines, 0, showInput);
