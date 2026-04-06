let waitingForPassword = false;
const correctPassword = "neo";

const lines = [
  "Vilken dörr vill du gå in i?",
  "1. Butik [Inbjudan-krävs]",
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
  commandInput.style.width = length + "ch";
}

function typeLine(text, callback) {
  let i = 0;
  isTyping = true;
  commandInput.disabled = true;

  function writeChar() {
    if (i < text.length) {
      output.textContent += text.charAt(i);
      i++;
      setTimeout(writeChar, speed);
    } else {
      output.textContent += "\n";
      isTyping = false;
      commandInput.disabled = false;

      if (callback) {
        callback();
      }
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
  } else {
    if (callback) {
      callback();
    }
  }
}

function showInput() {
  inputLine.classList.remove("hidden");
  resizeInput();
  focusInput();
}

function handleCommand(command) {
  if (waitingForPassword) {
    if (command === correctPassword) {
      waitingForPassword = false;
      typeLine("Lösenord korrekt. Laddar butik...", () => {
        setTimeout(() => {
          window.location.href = "butik.html";
        }, 500);
      });
    } else {
      waitingForPassword = false;
      typeLine("Fel lösenord.", focusInput);
    }

    return;
  }

  if (command === "help" || command === "hjälp") {
    typeLine("Tillgängliga kommandon: hjälp, 1, 2, Butik, Galleri, klar", focusInput);

  } else if (command === "1" || command === "butik") {
  waitingForPassword = true;
  typeLine("Lösenordet tack...", focusInput);

  } else if (["2", "galleri"].includes(command)) {
    typeLine("Laddar...", () => {
      setTimeout(() => {
      window.location.href = "´galleri.html";
    }, 500);
  });
  } else if (command === "klar" || command === "clear") {
    output.textContent = "Where would you like to go?\n";
    focusInput();
  } else {
    typeLine("Känner inte igen kommandot.", focusInput);
  }
}

commandInput.addEventListener("input", () => {
  resizeInput();
});

commandInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !isTyping) {
    const command = commandInput.value.trim().toLowerCase();

    if (command === "") {
      return;
    }

    output.textContent += `> ${command}\n`;
    commandInput.value = "";
    resizeInput();

    handleCommand(command);
  }
});

document.addEventListener("click", () => {
  focusInput();
});

commandInput.addEventListener("blur", () => {
  focusInput();
});

typeLines(lines, 0, showInput);


