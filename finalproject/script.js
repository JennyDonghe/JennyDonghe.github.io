/************************
 * CONSTANTS
 ************************/
const EMOJI_COLORS = {
  "😄": "#FFC8DD",
  "🙂": "#FFDFEA",
  "😐": "#E8E8E8",
  "😔": "#B8C6FF",
  "😡": "#FF9AA2",
  "😭": "#A0C4FF",
  "😴": "#E2CFEA",
  "🤩": "#FFD6A5"
};

const COMFORT_MESSAGES = [
  "You are doing the best you can, and that's enough. 💗",
  "It’s okay to rest. You deserve peace. 🌸",
  "You made it through today — that’s something to be proud of.",
  "Emotions come and go. You are allowed to feel everything.",
  "Be gentle with yourself. You're trying, and that matters. 💕",
  "You are worthy of love, care, and patience.",
  "Even small steps count. You're moving forward. ✨",
  "Your feelings are valid. They deserve space and understanding."
];

/************************
 * STORAGE
 ************************/
function getSavedMoods() {
  try {
    return JSON.parse(localStorage.getItem("moods") || "[]");
  } catch {
    return [];
  }
}

function setSavedMoods(moods) {
  localStorage.setItem("moods", JSON.stringify(moods));
}

/************************
 * SAVE MOOD
 ************************/
function saveMoodEntry(emoji, text, dateString) {
  const moods = getSavedMoods();
  moods.push({
    emoji,
    text,
    color: EMOJI_COLORS[emoji] || "#ffffff",
    date: dateString // YYYY-MM-DD
  });
  setSavedMoods(moods);
}

/************************
 * MOOD PAGE
 ************************/
function initMoodPage() {
  const emojiButtons = document.querySelectorAll(".emoji-btn");
  const saveButton = document.getElementById("save-mood-btn");
  const moodText = document.getElementById("mood-text");
  const dateInput = document.getElementById("mood-date");
  const statusMessage = document.getElementById("status-message");

  if (!emojiButtons.length) return;

  let selectedEmoji = null;

  emojiButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      emojiButtons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedEmoji = btn.dataset.emoji;
    });
  });

  saveButton?.addEventListener("click", () => {
    if (!selectedEmoji) {
      statusMessage.textContent = "please pick an emoji ～";
      return;
    }
    if (!moodText.value.trim()) {
      statusMessage.textContent = "please write a short note 💌";
      return;
    }
    if (!dateInput.value) {
      statusMessage.textContent = "please pick the date 📅";
      return;
    }

    saveMoodEntry(selectedEmoji, moodText.value.trim(), dateInput.value);

    moodText.value = "";
    dateInput.value = "";
    emojiButtons.forEach(b => b.classList.remove("selected"));
    selectedEmoji = null;

    statusMessage.textContent = "Saved! Check your history page 🌈";
  });
}

/************************
 * HISTORY CALENDAR
 ************************/
function renderCalendar() {
  const container = document.getElementById("calendar-container");
  const emptyMsg = document.getElementById("history-empty");
  if (!container) return;

  const moods = getSavedMoods();
  if (moods.length === 0) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  container.innerHTML = "";

  for (let i = 0; i < firstDay; i++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    container.appendChild(cell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";

    const formatted = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const match = moods.find(m => m.date === formatted);

    if (match) {
      cell.classList.add("mood");
      cell.style.background = match.color;
      cell.innerHTML = `
        <span class="calendar-date">${day}</span>
        <span class="calendar-emoji">${match.emoji}</span>
      `;
    } else {
      cell.innerHTML = `<span class="calendar-date">${day}</span>`;
    }

    container.appendChild(cell);
  }
}

/************************
 * CLEAR
 ************************/
function initClearHistory() {
  const btn = document.getElementById("clear-history-btn");
  btn?.addEventListener("click", () => {
    if (confirm("Clear all saved moods?")) {
      localStorage.removeItem("moods");
      location.reload();
    }
  });
}

function displayRandomComfortMessage() {
  const el = document.getElementById("comfort-message");
  if (!el) return;
  el.textContent = COMFORT_MESSAGES[Math.floor(Math.random() * COMFORT_MESSAGES.length)];
}

/************************
 * INIT
 ************************/
document.addEventListener("DOMContentLoaded", () => {
  initMoodPage();
  renderCalendar();
  displayRandomComfortMessage();
  initClearHistory();
});
