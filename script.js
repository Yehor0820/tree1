/* =========================================================
   НАЛАШТУВАННЯ: змінюй тільки цей блок
   START  - дата, з якої рахується лічильник (рік-місяць-деньTгодини:хвилини)
   LETTER - рядки листа (кожен елемент масиву = окремий абзац)
   ========================================================= */
const START = "2024-02-02T22:00:00";

const LETTER = [
  "Для кохання мого життя:",
  "Може я справді не найкраща людина, з якою ти колись бачилася,",
  "але я намагаюсь зі усіх сил стати для тебе кращим,",
  "я хочу зробити для тебе все, щоб ти почувалася по-справжньому щасливою. ",
  "Ти зі своєю усмішкою мене робиш найщасливішою людиною у світі.",
  "— Я кохаю тебе, Ліза!"
];
/* ========================================================= */

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* таймлайн анімації, секунди */
const TRUNK_END = 2.2;                       // стовбур росте 0 -> 2.2 c
const BLOOM_START = 1.8, BLOOM_END = 6;      // крона розквітає
const LETTER_START = 6.2;                    // тоді ж з'являється лист

const canvas = $("tree");
const ctx = canvas.getContext("2d");
let W = 0, H = 0;

/* ---------- розмір полотна ---------- */
function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = innerWidth;
  H = innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", resize);
resize();

/* геометрія дерева залежить від розміру екрана */
function layout() {
  const u = Math.min(W * 0.55, H * 0.5);
  return {
    cx: W * 0.68,                // центр дерева по горизонталі
    ground: H * 0.92,            // лінія землі
    trunkH: u * 0.55,
    k: u * 0.42,                 // масштаб серця-крони
    u
  };
}

/* ---------- крона: точки всередині форми серця ---------- */
const PALETTE = ["#b3001b", "#d6142b", "#e8394a", "#f06a78", "#f7a1ab", "#ffc2c9"];
const hearts = [];

while (hearts.length < 420) {
  const x = Math.random() * 2.4 - 1.2;
  const y = Math.random() * 2.5 - 1.15;
  const a = x * x + y * y - 1;
  if (a * a * a - x * x * y * y * y <= 0) {        // рівняння серця
    const yn = (y + 1.15) / 2.5;                   // 0 = низ, 1 = верх
    hearts.push({
      x, y,
      size: 0.09 + Math.random() * 0.09,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      birth: yn * 0.8 + Math.random() * 0.2        // знизу вгору
    });
  }
}

/* маленьке серце: x - центр, y - верх, s - розмір */
function heart(c, x, y, s, color) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.35);
  c.bezierCurveTo(x - s * 0.5, y + s * 0.7, x, y + s * 0.8, x, y + s);
  c.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.7, x + s * 0.5, y + s * 0.35);
  c.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.35);
  c.fill();
}

const clamp = v => Math.max(0, Math.min(1, v));
const easeOut = v => 1 - Math.pow(1 - v, 3);

/* ---------- пелюстки, що падають ---------- */
const petals = [];
let lastPetal = 0;

function spawnPetal(L, t) {
  const h = hearts[Math.floor(Math.random() * hearts.length)];
  const cyCanopy = L.ground - L.trunkH - L.k * 0.6;
  petals.push({
    x0: L.cx + h.x * L.k,
    y: cyCanopy - h.y * L.k,
    size: 6 + Math.random() * 8,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    vy: 35 + Math.random() * 45,
    amp: 12 + Math.random() * 22,
    freq: 1 + Math.random() * 1.5,
    phase: Math.random() * 6.28,
    born: t,
    landedAt: null
  });
}

/* ---------- малювання кадру ---------- */
const t0 = performance.now();
let prev = t0;

function frame(now) {
  const t = reduced ? 99 : (now - t0) / 1000;
  const dt = (now - prev) / 1000;
  prev = now;
  const L = layout();

  ctx.clearRect(0, 0, W, H);

  /* земля */
  ctx.fillStyle = "#3a2a20";
  ctx.fillRect(0, L.ground, W, 2);

  /* стовбур: звужується догори */
  const grow = easeOut(clamp(t / TRUNK_END));
  const h = L.trunkH * grow;
  const w0 = L.u * 0.07, w1 = L.u * 0.035;
  ctx.fillStyle = "#7a3e12";
  ctx.beginPath();
  ctx.moveTo(L.cx - w0 / 2, L.ground);
  ctx.lineTo(L.cx + w0 / 2, L.ground);
  ctx.lineTo(L.cx + w1 / 2, L.ground - h);
  ctx.lineTo(L.cx - w1 / 2, L.ground - h);
  ctx.closePath();
  ctx.fill();

  /* крона */
  const bloom = clamp((t - BLOOM_START) / (BLOOM_END - BLOOM_START));
  const cy = L.ground - L.trunkH - L.k * 0.6;
  if (bloom > 0) {
    for (const p of hearts) {
      const s = easeOut(clamp((bloom - p.birth) * 6));
      if (s <= 0) continue;
      const size = p.size * L.k * 2 * s;
      heart(ctx, L.cx + p.x * L.k, cy - p.y * L.k - size / 2, size, p.color);
    }
  }

  /* пелюстки з'являються, коли крона повністю розквітла */
  if (t > BLOOM_END && now - lastPetal > (reduced ? 1200 : 220)) {
    spawnPetal(L, t);
    lastPetal = now;
  }
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];
    let alpha = 1;
    if (p.landedAt === null) {
      p.y += p.vy * dt;
      if (p.y >= L.ground - p.size) { p.y = L.ground - p.size; p.landedAt = t; }
    } else {
      alpha = 1 - (t - p.landedAt) / 2;            // лежить 2 секунди й зникає
      if (alpha <= 0) { petals.splice(i, 1); continue; }
    }
    const sway = p.landedAt === null ? Math.sin((t - p.born) * p.freq + p.phase) * p.amp : 0;
    ctx.globalAlpha = alpha;
    heart(ctx, p.x0 + sway, p.y, p.size, p.color);
    ctx.globalAlpha = 1;
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- лічильник ---------- */
const pad = n => String(n).padStart(2, "0");

function tick() {
  const ms = Math.max(0, Date.now() - new Date(START).getTime());
  const days = Math.floor(ms / 864e5);
  const hours = Math.floor(ms / 36e5) % 24;
  const mins = Math.floor(ms / 6e4) % 60;
  const secs = Math.floor(ms / 1e3) % 60;
  $("time").textContent = `${days} днів ${pad(hours)} годин ${pad(mins)} хвилин ${pad(secs)} секунд`;
}

function startCounter() {
  $("counter").hidden = false;
  tick();
  setInterval(tick, 1000);
}

/* ---------- лист, що друкується ---------- */
async function typeLetter() {
  const box = $("letter");
  startCounter();
  for (const line of LETTER) {
    const p = document.createElement("p");
    box.appendChild(p);
    for (const ch of line) {
      p.textContent += ch;
      await sleep(reduced ? 0 : 55);
    }
    await sleep(reduced ? 0 : 400);
  }
}

setTimeout(typeLetter, reduced ? 0 : LETTER_START * 1000);
