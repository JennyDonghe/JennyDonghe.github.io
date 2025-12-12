/*********************************
 * CONFIG
 *********************************/
const TILE_SIZE = 48;
const MAP_COLS = 7;

const PLAYER_SRC = "Player.png";
const TILE_SRC = "FarmLand_Tile.png";

const EMOJI_TO_FLOWER_ICON = {
  "😄": "🌸",
  "🙂": "🌼",
  "😐": "🍃",
  "😔": "💠",
  "😡": "🔥",
  "😭": "💧",
  "😴": "🌙",
  "🤩": "⭐"
};

const HEALING_MESSAGES = [
  "This emotion belongs in your garden. 🌱",
  "Thank you for feeling this honestly. 💗",
  "Even hard emotions helped you grow.",
  "You are allowed to feel everything. 🌿",
  "Your feelings are valid and welcome here.",
  "You are growing with every emotion. 🌷"
];

/*********************************
 * CALENDAR META (match history.html)
 *********************************/
function getMonthMeta() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-11
  const firstDayOffset = new Date(y, m, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const totalCells = firstDayOffset + daysInMonth;
  const rows = Math.ceil(totalCells / MAP_COLS);
  return { y, m, firstDayOffset, rows };
}

const { y: CUR_Y, m: CUR_M, firstDayOffset, rows: MAP_ROWS } = getMonthMeta();

/*********************************
 * STORAGE (match your script.js)
 *********************************/
function getSavedMoods() {
  try {
    return JSON.parse(localStorage.getItem("moods") || "[]");
  } catch {
    return [];
  }
}

/*********************************
 * Build flowers (use mm.date: YYYY-MM-DD)
 * Keep ONE entry per day (last one wins)
 *********************************/
function buildFlowersFromMoods(moods) {
  // only current month (same as history)
  const monthMoods = moods.filter(mm => {
    if (!mm?.date) return false;
    const d = new Date(mm.date);
    return !isNaN(d) && d.getFullYear() === CUR_Y && d.getMonth() === CUR_M;
  });

  const byDay = {};
  for (const mm of monthMoods) {
    const d = new Date(mm.date);
    byDay[d.getDate()] = mm; // last wins
  }

  const flowers = [];
  for (const dayStr of Object.keys(byDay)) {
    const day = Number(dayStr);
    const mm = byDay[day];

    // calendar slot index (includes leading blanks)
    const slot = firstDayOffset + (day - 1);
    const tileX = slot % MAP_COLS;
    const tileY = Math.floor(slot / MAP_COLS);

    flowers.push({
      day,
      tileX,
      tileY,
      emoji: mm.emoji,
      icon: EMOJI_TO_FLOWER_ICON[mm.emoji] || "🌼",
      date: mm.date,
      note: mm.text,

      // interaction state
      bumpTimer: 0,
      growScale: 1,
      growTimer: 0
    });
  }
  return flowers;
}

/*********************************
 * CANVAS SETUP
 *********************************/
const CANVAS_W = TILE_SIZE * MAP_COLS;
const CANVAS_H = TILE_SIZE * MAP_ROWS;

const canvas = document.getElementById("garden-canvas");
const ctx = canvas.getContext("2d");
const infoEl = document.getElementById("garden-info");

canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const tileImg = new Image();
tileImg.src = TILE_SRC;

const playerImg = new Image();
playerImg.src = PLAYER_SRC;

let loaded = 0;
tileImg.onload = playerImg.onload = () => {
  loaded++;
  if (loaded === 2) startGame();
};

/*********************************
 * PLAYER (your original animation logic)
 *********************************/
const FRAME_SIZE = 32;
const PLAYER_SPEED = 120;

const DIR_DOWN = 0;
const DIR_RIGHT = 1;
const DIR_UP = 2;
const DIR_LEFT = 3;

let player = {
  x: CANVAS_W / 2,
  y: CANVAS_H / 2,
  dir: DIR_DOWN,
  frame: 0,
  frameTimer: 0
};

/*********************************
 * INPUT
 *********************************/
const keys = {};
window.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if ("wasd e ".includes(k)) e.preventDefault();
});
window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

/*********************************
 * PARTICLES (water + ripple)  ✅ restored
 *********************************/
let particles = [];

function spawnWaterParticles(x, y, tx, ty) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x,
      y,
      vx: (tx - x) * 0.5 + (Math.random() - 0.5) * 40,
      vy: (ty - y) * 0.5 - Math.random() * 80,
      life: 0.8,
      size: 3 + Math.random() * 2,
      color: "rgba(120,180,255,0.9)",
      type: "drop"
    });
  }
}

function spawnRipple(x, y) {
  particles.push({
    x,
    y,
    size: 5,
    life: 0.4,
    maxSize: 35,
    color: "rgba(150,200,255,0.5)",
    type: "ripple"
  });
}

/*********************************
 * NEAREST FLOWER (works with tileX/tileY already offset-correct)
 *********************************/
function getNearestFlower(flowers, px, py, maxDist = 52) {
  let best = null;
  let bestDist = maxDist;

  for (const f of flowers) {
    const fx = f.tileX * TILE_SIZE + TILE_SIZE / 2;
    const fy = f.tileY * TILE_SIZE + TILE_SIZE / 2;
    const dist = Math.hypot(fx - px, fy - py);
    if (dist < bestDist) {
      bestDist = dist;
      best = f;
    }
  }
  return best;
}

/*********************************
 * BUBBLE (E interaction) ✅ restored formatting
 *********************************/
function showBubble(flower) {
  const msg = HEALING_MESSAGES[Math.floor(Math.random() * HEALING_MESSAGES.length)];
  const note = flower.note ? `“${flower.note}”` : "";

  // flower.date is YYYY-MM-DD already
  infoEl.innerHTML = `
    <b>${flower.icon}</b> ${msg}<br>
    ${note ? `<span>${note}</span><br>` : ""}
    <span style="opacity:.7">${flower.date || ""}</span>
  `;

  infoEl.classList.add("show");
  clearTimeout(showBubble.timer);
  showBubble.timer = setTimeout(() => infoEl.classList.remove("show"), 3000);
}

/*********************************
 * WATER FLOWER (SPACE) ✅ restored: grows + particles
 *********************************/
function waterFlower(f) {
  f.growScale = Math.min(2.2, f.growScale + 0.18);
  f.growTimer = 0.35;

  const fx = f.tileX * TILE_SIZE + TILE_SIZE / 2;
  const fy = f.tileY * TILE_SIZE + TILE_SIZE / 2;

  spawnWaterParticles(player.x, player.y - 10, fx, fy);
  spawnRipple(fx, fy);
}

/*********************************
 * MAIN LOOP
 *********************************/
function startGame() {
  const flowers = buildFlowersFromMoods(getSavedMoods());

  let last = performance.now();
  function loop(now) {
    const dt = (now - last) / 1000;
    last = now;

    update(dt, flowers);
    render(flowers);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/*********************************
 * UPDATE (movement + animation + interactions) ✅ restored
 *********************************/
function update(dt, flowers) {
  let dx = 0, dy = 0;
  let moving = false;

  if (keys["w"]) { dy = -1; player.dir = DIR_UP; moving = true; }
  if (keys["s"]) { dy = 1; player.dir = DIR_DOWN; moving = true; }
  if (keys["a"]) { dx = -1; player.dir = DIR_LEFT; moving = true; }
  if (keys["d"]) { dx = 1; player.dir = DIR_RIGHT; moving = true; }

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
  }

  player.x += dx * PLAYER_SPEED * dt;
  player.y += dy * PLAYER_SPEED * dt;

  const half = FRAME_SIZE / 2;
  player.x = Math.max(half, Math.min(CANVAS_W - half, player.x));
  player.y = Math.max(half, Math.min(CANVAS_H - half, player.y));

  // ✅ walk animation back
  if (moving) {
    player.frameTimer += dt;
    if (player.frameTimer >= 0.12) {
      player.frame = (player.frame + 1) % 4;
      player.frameTimer = 0;
    }
  } else {
    player.frame = 0;
  }

  // ✅ particles update back
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.life -= dt;
    if (p.type === "drop") {
      p.vy += 260 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    } else if (p.type === "ripple") {
      p.size += dt * 70;
    }
  });

  // ✅ E interaction
  if (keys["e"]) {
    keys["e"] = false;
    const f = getNearestFlower(flowers, player.x, player.y);
    if (f) {
      f.bumpTimer = 0.3;
      showBubble(f);
    }
  }

  // ✅ SPACE watering
  if (keys[" "]) {
    keys[" "] = false;
    const f = getNearestFlower(flowers, player.x, player.y, 58);
    if (f) waterFlower(f);
  }

  // ✅ timers decay
  flowers.forEach(f => {
    if (f.bumpTimer > 0) f.bumpTimer -= dt;
    if (f.growTimer > 0) f.growTimer -= dt;
  });
}

/*********************************
 * RENDER (soil + flowers + particles + player) ✅ restored + calendar blanks correct
 *********************************/
function render(flowers) {
  // soil tiles including leading blanks (we just make blanks dim)
  let cellIndex = 0;
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      ctx.globalAlpha = cellIndex < firstDayOffset ? 0.35 : 1;
      ctx.drawImage(tileImg, c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      cellIndex++;
    }
  }
  ctx.globalAlpha = 1;

  // flowers (with grow + bump) ✅ restored
  ctx.font = "24px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  flowers.forEach(f => {
    let scale = f.growScale;

    // grow bounce
    if (f.growTimer > 0) {
      const t = f.growTimer / 0.35;
      scale *= 1 + 0.25 * Math.sin(t * Math.PI);
    }

    // E bump
    if (f.bumpTimer > 0) {
      const t = f.bumpTimer / 0.3;
      scale *= 1 + 0.15 * Math.sin(t * Math.PI);
    }

    const cx = f.tileX * TILE_SIZE + TILE_SIZE / 2;
    const cy = f.tileY * TILE_SIZE + TILE_SIZE / 2;

    ctx.save();
    ctx.translate(cx, cy - 6);
    ctx.scale(scale, scale);
    ctx.fillText(f.icon, 0, 0);
    ctx.restore();
  });

  // particles ✅ restored
  particles.forEach(p => {
    ctx.save();
    if (p.type === "drop") {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === "ripple") {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  });

  drawPlayer();
}

/*********************************
 * DRAW PLAYER (✅ mirror left correctly, and keep sprite rows)
 *********************************/
const PLAYER_SCALE = 2.2;

function drawPlayer() {
  const sx = player.frame * FRAME_SIZE;
  let sy = player.dir * FRAME_SIZE;

  const mirror = player.dir === DIR_LEFT;

  const w = FRAME_SIZE * PLAYER_SCALE;
  const h = FRAME_SIZE * PLAYER_SCALE;

  const dx = player.x - w / 2;
  const dy = player.y - h / 2;

  ctx.save();
  if (mirror) {
    // ✅ Mirror the RIGHT-walk row (sy=FRAME_SIZE) just like your old code
    ctx.translate(dx + w, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(playerImg, sx, FRAME_SIZE, FRAME_SIZE, FRAME_SIZE, 0, 0, w, h);
  } else {
    ctx.drawImage(playerImg, sx, sy, FRAME_SIZE, FRAME_SIZE, dx, dy, w, h);
  }
  ctx.restore();
}
