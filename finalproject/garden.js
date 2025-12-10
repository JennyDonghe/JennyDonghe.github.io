/****************************************
 * CONFIG
 ****************************************/
const TILE_SIZE = 48;
const MAP_COLS = 10;
const MAP_ROWS = 10;
const CANVAS_SIZE = TILE_SIZE * MAP_COLS;

const PLAYER_SRC = "Player.png";
const TILE_SRC = "FarmLand_Tile.png";

/****************************************
 * EMOJI → 花朵 icon
 ****************************************/
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

/****************************************
 * Healing Messages
 ****************************************/
const HEALING_MESSAGES = [
  "This emotion belongs in your garden. 🌱",
  "Thank you for feeling this honestly. 💗",
  "Even hard emotions helped you grow.",
  "You are allowed to feel everything. 🌿",
  "Your feelings are valid and welcome here.",
  "You are growing with every emotion. 🌷"
];

/****************************************
 * Load moods
 ****************************************/
function getSavedMoods() {
  try {
    return JSON.parse(localStorage.getItem("moods") || "[]");
  } catch (e) {
    return [];
  }
}

/****************************************
 * Convert moods → flowers placed on map
 ****************************************/
function buildFlowersFromMoods(moods) {
  const flowers = [];
  const max = MAP_COLS * MAP_ROWS;
  const count = Math.min(max, moods.length);

  for (let i = 0; i < count; i++) {
    const m = moods[i];
    flowers.push({
      tileX: i % MAP_COLS,
      tileY: Math.floor(i / MAP_COLS),
      emoji: m.emoji,
      icon: EMOJI_TO_FLOWER_ICON[m.emoji] || "🌼",
      date: m.timestamp,
      note: m.text,
      bumpTimer: 0,
      growScale: 1,
      growTimer: 0
    });
  }
  return flowers;
}

/****************************************
 * Canvas + Assets
 ****************************************/
const canvas = document.getElementById("garden-canvas");
const ctx = canvas.getContext("2d");
const infoEl = document.getElementById("garden-info"); // bubble

canvas.width = CANVAS_SIZE;
canvas.height = CANVAS_SIZE;

const tileImg = new Image();
tileImg.src = TILE_SRC;

const playerImg = new Image();
playerImg.src = PLAYER_SRC;

let loaded = 0;
tileImg.onload = playerImg.onload = () => {
  loaded++;
  if (loaded === 2) startGame();
};

/****************************************
 * Player
 ****************************************/
const FRAME_SIZE = 32;
const PLAYER_SPEED = 120;

const DIR_DOWN = 0;
const DIR_RIGHT = 1;
const DIR_UP = 2;
const DIR_LEFT = 3;

let player = {
  x: CANVAS_SIZE / 2,
  y: CANVAS_SIZE / 2,
  dir: DIR_DOWN,
  frame: 0,
  frameTimer: 0
};

/****************************************
 * Input
 ****************************************/
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if ("wasd e ".includes(e.key.toLowerCase())) e.preventDefault();
});
window.addEventListener("keyup", e => {
  keys[e.key.toLowerCase()] = false;
});

/****************************************
 * Particles System
 ****************************************/
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

/****************************************
 * Find closest flower
 ****************************************/
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

/****************************************
 * Bubble (E interaction)
 ****************************************/
function showBubble(flower) {
  const msg = HEALING_MESSAGES[Math.floor(Math.random() * HEALING_MESSAGES.length)];
  const note = flower.note ? `“${flower.note}”` : "";

  let dateStr = "";
  if (flower.date) {
    const d = new Date(flower.date);
    if (!isNaN(d)) {
      dateStr = `${d.getFullYear()}-${(d.getMonth()+1)
        .toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`;
    }
  }

  infoEl.innerHTML = `
    <b>${flower.icon}</b> ${msg}<br>
    ${note ? `<span>${note}</span><br>` : ""}
    <span style="opacity:.7">${dateStr}</span>
  `;

  infoEl.classList.add("show");

  clearTimeout(showBubble.timer);
  showBubble.timer = setTimeout(() => {
    infoEl.classList.remove("show");
  }, 3000);
}

/****************************************
 * WATER FLOWER (space)
 ****************************************/
function waterFlower(f) {
  f.growScale = Math.min(2.2, f.growScale + 0.18);
  f.growTimer = 0.35;

  const fx = f.tileX * TILE_SIZE + TILE_SIZE / 2;
  const fy = f.tileY * TILE_SIZE + TILE_SIZE / 2;

  spawnWaterParticles(player.x, player.y - 10, fx, fy);
  spawnRipple(fx, fy);
}

/****************************************
 * Main Loop
 ****************************************/
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

/****************************************
 * UPDATE
 ****************************************/
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
  player.x = Math.max(half, Math.min(CANVAS_SIZE - half, player.x));
  player.y = Math.max(half, Math.min(CANVAS_SIZE - half, player.y));

  // walk animation
  if (moving) {
    player.frameTimer += dt;
    if (player.frameTimer >= 0.12) {
      player.frame = (player.frame + 1) % 4;
      player.frameTimer = 0;
    }
  } else {
    player.frame = 0;
  }

  // particles update
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

  // interaction E
  if (keys["e"]) {
    keys["e"] = false;
    const f = getNearestFlower(flowers, player.x, player.y);
    if (f) {
      f.bumpTimer = 0.3;
      showBubble(f);
    }
  }

  // watering SPACE
  if (keys[" "]) {
    keys[" "] = false;
    const f = getNearestFlower(flowers, player.x, player.y, 58);
    if (f) waterFlower(f);
  }

  flowers.forEach(f => {
    if (f.bumpTimer > 0) f.bumpTimer -= dt;
    if (f.growTimer > 0) f.growTimer -= dt;
  });
}

/****************************************
 * RENDER
 ****************************************/
function render(flowers) {
  // ground tiles
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      ctx.drawImage(tileImg, c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // flowers
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

  // particles
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

/****************************************
 * DRAW PLAYER
 ****************************************/
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
    ctx.translate(dx + w, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(playerImg, sx, FRAME_SIZE, FRAME_SIZE, FRAME_SIZE, 0, 0, w, h);
  } else {
    ctx.drawImage(playerImg, sx, sy, FRAME_SIZE, FRAME_SIZE, dx, dy, w, h);
  }
  ctx.restore();
}
