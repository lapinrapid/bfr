import { sfx, unlockAudio } from "./audio.js";
import { freshState, startRun, step, finishIntro, WEAPONS, POWERS } from "./sim.js";
import { createRenderer } from "./draw.js";

const BEST_KEY = "bfr-the-game-best";
const BG_KEY = "bfr-the-game-bg";

const $ = (id) => document.getElementById(id);

function isTouch() {
  return window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
}

function orientAngle() {
  const a = window.screen?.orientation?.angle;
  if (typeof a === "number") return a;
  const o = window.orientation;
  return typeof o === "number" ? o : 0;
}

function deadzone(v, z = 0.12) {
  const n = Math.abs(v);
  return n < z ? 0 : Math.sign(v) * ((n - z) / (1 - z));
}

function readBest() {
  return Number(localStorage.getItem(BEST_KEY) || localStorage.getItem("starship-the-game-best") || 0);
}

function readBg() {
  const v = localStorage.getItem(BG_KEY);
  return v === "earth" || v === "moon" || v === "mars" ? v : "mars";
}

function writeBg(id) {
  localStorage.setItem(BG_KEY, id);
  state.bg = id;
  for (const btn of document.querySelectorAll(".xg-world")) {
    btn.classList.toggle("is-on", btn.dataset.world === id);
  }
}

function writeBest(score) {
  const prev = readBest();
  if (score > prev) {
    localStorage.setItem(BEST_KEY, String(score));
    return score;
  }
  return prev;
}

const app = $("app");
const canvas = $("game");
const state = freshState();
const keys = {};
const renderer = createRenderer(canvas);

const touch = isTouch();
let firing = false;
let hyperPulse = false;
let galPulse = false;
let wantGameOver = false;
const tilt = { x: 0, y: 0, ready: false };
const drag = { on: false, x: 0, y: 0, sx: 0, sy: 0 };
let calib = null;
let calibReset = false;
const prev = { kills: 0, weapon: 1, hp: 4, phase: "title", wave: -1 };
let hudClock = 0;

function showBest(el, score) {
  if (score > 0) {
    el.hidden = false;
    el.textContent = `best ${score}`;
  } else {
    el.hidden = true;
  }
}

state.bg = readBg();
writeBg(state.bg);

function setPhaseUI(phase) {
  $("title").hidden = phase !== "title";
  $("hud").hidden = phase !== "play" && phase !== "boss";
  $("dead").hidden = phase !== "dead";
  $("win").hidden = phase !== "win";
  $("bossbar").hidden = phase !== "boss";
  if (phase !== "dead") {
    $("btn-again").hidden = false;
    $("btn-gameover").hidden = true;
    wantGameOver = false;
  }
}

function paintHud() {
  const s = state;
  $("wave-label").textContent = s.waveName || "The Belt";
  $("score").textContent = String(Math.floor(s.shown));
  $("weapon").textContent = WEAPONS[s.weapon - 1]?.name ?? "";
  $("hyper-fill").style.width = `${Math.max(0, (1 - (s.player.galCd || 0) / 1.25) * 100)}%`;

  const hearts = $("hearts");
  hearts.innerHTML = "";
  for (let i = 0; i < s.player.maxHp; i++) {
    const el = document.createElement("i");
    if (i >= s.player.hp) el.className = "off";
    hearts.appendChild(el);
  }

  if (s.boostT > 0) {
    $("boost").hidden = false;
    $("boost").textContent = `${s.boostMul}x ${s.boostT.toFixed(0)}s`;
  } else {
    $("boost").hidden = true;
  }

  const box = $("buffs");
  box.innerHTML = "";
  for (const k of ["rapid", "nova", "titan"]) {
    if (s.buffs[k] <= 0) continue;
    const el = document.createElement("div");
    el.className = "xg-mod xg-power";
    el.style.color = POWERS[k].color;
    el.textContent = `${POWERS[k].name} ×${s.buffs[k]}`;
    box.appendChild(el);
  }

  if (s.phase === "boss" && s.boss) {
    $("bossbar").hidden = false;
    $("boss-fill").style.width = `${Math.max(0, (s.boss.hp / s.boss.max) * 100)}%`;
  } else {
    $("bossbar").hidden = true;
  }

  if (s.unlock && s.unlock.t > 0.15 && (s.phase === "play" || s.phase === "boss")) {
    $("unlock").hidden = false;
    $("unlock").style.opacity = String(Math.min(1, s.unlock.t / 0.6));
    $("unlock-name").textContent = s.unlock.name;
    $("unlock-use").textContent = s.unlock.use;
    $("note").hidden = true;
    $("banner").hidden = true;
  } else if (s.note && s.note.t > 0.15 && (s.phase === "play" || s.phase === "boss")) {
    $("unlock").hidden = true;
    $("note").hidden = false;
    $("note").style.opacity = String(Math.min(1, s.note.t / 0.7));
    $("note-name").textContent = s.note.name;
    $("note-use").textContent = s.note.use;
    $("banner").hidden = true;
  } else if (s.waveBanner > 0 && (s.phase === "play" || s.phase === "boss")) {
    $("unlock").hidden = true;
    $("note").hidden = true;
    $("banner").hidden = false;
    $("banner").style.opacity = String(Math.min(1, s.waveBanner / 0.55));
    $("banner-name").textContent = s.waveName;
  } else {
    $("unlock").hidden = true;
    $("note").hidden = true;
    $("banner").hidden = true;
  }

  $("pause").hidden = !(s.paused && (s.phase === "play" || s.phase === "boss"));
  $("dead-score").textContent = String(Math.floor(s.score));
  $("win-score").textContent = String(Math.floor(s.score));
}

async function askTilt() {
  if (!touch) return;
  try {
    const D = window.DeviceOrientationEvent;
    if (typeof D?.requestPermission === "function") await D.requestPermission();
  } catch { /* ignore */ }
  calibReset = true;
  tilt.ready = false;
}

function play() {
  unlockAudio();
  askTilt();
  startRun(state, {
    compact: touch,
    bg: state.bg || readBg(),
    keepFlight: state.phase === "title",
  });
  firing = false;
  wantGameOver = false;
  prev.kills = 0;
  prev.weapon = 1;
  prev.hp = 4;
  prev.phase = "intro";
  prev.wave = -1;
  setPhaseUI("intro");
}

function onKey(e) {
  const k = e.key.toLowerCase();
  keys[k] = e.type === "keydown";
  if (e.code === "Space") keys[" "] = e.type === "keydown";
  if (e.type !== "keydown") return;

  const phase = state.phase;
  const flying = phase === "title" || phase === "play" || phase === "boss";
  const live = phase === "play" || phase === "boss";

  if (phase === "dead" || phase === "win") {
    if (e.code === "Space" || e.code === "Enter" || e.code.startsWith("Arrow") || k === "r") {
      e.preventDefault();
    }
    return;
  }
  if (phase === "intro" && (e.code === "Enter" || e.code === "Space" || k === "r")) {
    e.preventDefault();
    finishIntro(state);
    setPhaseUI("play");
    paintHud();
    return;
  }
  if (phase === "title" && (e.code === "Enter" || k === "r")) {
    e.preventDefault();
    play();
    return;
  }
  if (live && k === "p") {
    e.preventDefault();
    state.paused = !state.paused;
    return;
  }
  if (flying && (e.code === "Space" || k === "f" || k === "j")) {
    e.preventDefault();
    return;
  }
  if (flying && !state.paused && (k === "s" || e.code === "ArrowDown")) {
    e.preventDefault();
    if ((state.player.galCd || 0) <= 0) galPulse = true;
    unlockAudio();
    return;
  }
  if (live && !state.paused && (k === "x" || e.code.startsWith("Shift"))) {
    e.preventDefault();
    if (state.player.dashCd <= 0) {
      hyperPulse = true;
      sfx.dash();
    }
    unlockAudio();
  }
}

function onOrient(e) {
  if (!touch || e.beta == null || e.gamma == null) return;
  if (calibReset || !calib) {
    calib = { b: e.beta, g: e.gamma };
    calibReset = false;
    tilt.ready = true;
  }
  let nx = (e.gamma - calib.g) / 22;
  let ny = (e.beta - calib.b) / 22;
  const ang = ((orientAngle() % 360) + 360) % 360;
  if (ang === 90) {
    const t = ny;
    ny = -nx;
    nx = t;
  } else if (ang === 270) {
    const t = -ny;
    ny = nx;
    nx = t;
  } else if (ang === 180) {
    nx = -nx;
    ny = -ny;
  }
  nx = deadzone(Math.max(-1, Math.min(1, nx)));
  ny = deadzone(Math.max(-1, Math.min(1, ny)));
  tilt.x += (nx - tilt.x) * 0.28;
  tilt.y += (ny - tilt.y) * 0.28;
  tilt.ready = true;
}

window.addEventListener("keydown", onKey);
window.addEventListener("keyup", onKey);
window.addEventListener("deviceorientation", onOrient);
window.addEventListener("resize", () => renderer.resize());

app.addEventListener("pointerdown", (e) => {
  if (e.target.closest("a, button")) return;
  if (state.phase === "intro") {
    finishIntro(state);
    setPhaseUI("play");
    paintHud();
    return;
  }
  if (state.phase !== "play" && state.phase !== "boss" && state.phase !== "title") return;
  firing = true;
  if (touch) drag.on = true;
  drag.sx = e.clientX;
  drag.sy = e.clientY;
  drag.x = 0;
  drag.y = 0;
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
});
app.addEventListener("pointermove", (e) => {
  if (!drag.on) return;
  drag.x = Math.max(-1, Math.min(1, (e.clientX - drag.sx) / 70));
  drag.y = Math.max(-1, Math.min(1, (e.clientY - drag.sy) / 70));
});
const endPtr = () => {
  firing = false;
  drag.on = false;
  drag.x = 0;
  drag.y = 0;
};
app.addEventListener("pointerup", endPtr);
app.addEventListener("pointercancel", endPtr);

$("worlds").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  const btn = e.target.closest("[data-world]");
  if (!btn) return;
  writeBg(btn.dataset.world);
});
$("btn-play").addEventListener("pointerdown", (e) => { e.stopPropagation(); play(); });
$("btn-again").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  play();
});
$("btn-win").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  play();
});
$("btn-gameover").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  wantGameOver = false;
  $("btn-again").hidden = false;
  $("btn-gameover").hidden = true;
});

renderer.resize();
setPhaseUI("title");

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.034, (now - last) / 1000);
  last = now;

  const live = state.phase === "play" || state.phase === "boss" || state.phase === "title";
  const rotate = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
  const thrust = !!(keys.w || keys.arrowup);
  const hyper = hyperPulse;
  hyperPulse = false;
  const galactic = galPulse;
  galPulse = false;
  const fireHeld = firing || (!touch && (keys[" "] || keys.space || keys.f || keys.j));
  const useTilt = touch && tilt.ready;
  const useDrag = touch && !useTilt && drag.on;
  const stick = useTilt
    ? { x: tilt.x, y: tilt.y }
    : useDrag
      ? { x: drag.x, y: drag.y }
      : null;

  step(state, dt, {
    rotate: stick ? 0 : rotate,
    thrust: stick ? false : thrust,
    hyper,
    galactic,
    fire: live && !state.paused && fireHeld,
    tilt: stick,
  });

  if (state.kills > prev.kills) sfx.kill();
  if (state.weapon > prev.weapon) sfx.level();
  if (state.player.hp < prev.hp) sfx.hurt();
  if (state.phase === "play" && prev.phase === "intro") {
    setPhaseUI("play");
    paintHud();
  }
  if (state.phase === "boss" && prev.phase !== "boss") sfx.boss();
  if (state.phase === "win" && prev.phase !== "win") {
    sfx.win();
    showBest($("best-win"), writeBest(state.score));
    setPhaseUI("win");
  }
  if (state.phase === "dead" && prev.phase !== "dead") {
    sfx.dead();
    firing = false;
    wantGameOver = true;
    $("btn-again").hidden = true;
    $("btn-gameover").hidden = false;
    showBest($("best-dead"), writeBest(state.score));
    setPhaseUI("dead");
  }
  if (state._rail) {
    sfx.rail();
    state._rail = false;
    state._shot = false;
  } else if (state._shot) {
    sfx.shoot(state.weapon);
    state._shot = false;
  }
  if (state._sfx) {
    const fn = sfx[state._sfx];
    if (fn) fn();
    state._sfx = null;
  }

  prev.kills = state.kills;
  prev.weapon = state.weapon;
  prev.hp = state.player.hp;
  prev.phase = state.phase;
  prev.wave = state.wave;

  renderer.draw(state);

  hudClock += dt;
  if (hudClock > 0.08) {
    hudClock = 0;
    if (state.phase === "play" || state.phase === "boss") paintHud();
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
