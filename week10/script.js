
function randomLine(length) {
  const chars = "01█▓░#$%&*<>?/\\{}[]ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

window.addEventListener("DOMContentLoaded", () => {
  const terminal = document.getElementById("terminal");
  const overlay = document.getElementById("hack-overlay");
  const codeRain = document.getElementById("code-rain");
  const screen = document.querySelector(".screen");

  if (terminal) {
    terminal.focus();
  }

  let hackStarted = false;
  let rainInterval = null;

  function startHack() {
    if (hackStarted) return;
    hackStarted = true;

    
    terminal.disabled = true;
    

    
    overlay.classList.add("active");
    screen.classList.add("shake");

    
    const introLines = [
      "> establishing secure session...",
      "> ERROR: unauthorized access detected.",
      "",
      "███████████████████████",
      "SYSTEM BREACH DETECTED",
      "███████████████████████",
      ""
    ];
    codeRain.textContent = introLines.join("\n");

    
    rainInterval = setInterval(() => {
      const width = 32;
      const newLine = randomLine(width);
      const current = codeRain.textContent.split("\n");
      current.push(newLine);

      
      const maxLines = 28;
      const sliced =
        current.length > maxLines
          ? current.slice(current.length - maxLines)
          : current;

      codeRain.textContent = sliced.join("\n");
    }, 100);

    
    setTimeout(() => {
      screen.classList.remove("shake");
      if (rainInterval) {
        clearInterval(rainInterval);
      }
      
      codeRain.textContent += "\n\n> session hijacked.\n> control transferred.";
    }, 8000);
  }

  
  if (terminal) {
    terminal.addEventListener("keydown", () => {
      if (!hackStarted) {
        setTimeout(startHack, 2000); 
      }
    });
  }
});
