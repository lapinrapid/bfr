import { sfx, unlockAudio } from "./audio.js";
import { freshState, startRun, step, goTitle, WEAPONS, POWERS } from "./sim.js";
import { createRenderer } from "./draw.js";

const BEST_KEY = "bfr-the-game-best";

const $ = (id) => document.getElementById(id);

function isPhone() {
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;
  const small = window.innerWidth <= 900;
  return coarse || noHover || small;
}

function deadzone(v, z = 0.12) {
  const n = Math.abs(v);
  return n < z ? 0 : Math.sign(v) * ((n - z) / (1 - z));
}

function buzz(ms) {
  try { navigator.vibrate?.(ms); } catch { /* ignore */ }
}

function readBest() {
  return Number(localStorage.getItem(BEST_KEY) || localStorage.getItem("starship-the-game-best") || 0);
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

let phone = isPhone();
let firing = false;
let hyperPulse = false;
let galPulse = false;

const stick = { id: null, x: 0, y: 0, cx: 0, cy: 0 };
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

state.bg = "mars";

function applyChrome() {
  phone = isPhone();
  document.documentElement.classList.toggle("is-phone", phone);
  document.documentElement.classList.toggle("is-desk", !phone);
  $("how-phone").hidden = !phone;
  $("how-desk").hidden = phone;
  $("btn-esc").textContent = phone ? "Menu" : "Esc";
  syncPads();
}

function syncPads() {
  const live = state.phase === "play" || state.phase === "boss";
  $("pads").hidden = !(phone && live && !state.paused);
}

function setPhaseUI(phase) {
  $("title").hidden = phase !== "title";
  $("hud").hidden = phase !== "play" && phase !== "boss";
  $("btn-esc").hidden = phase !== "play" && phase !== "boss";
  $("dead").hidden = phase !== "dead";
  $("win").hidden = phase !== "win";
  $("bossbar").hidden = phase !== "boss";
  if (phase !== "play" && phase !== "boss") $("menu").hidden = true;
  syncPads();
}

function setPaused(on) {
  if (state.phase !== "play" && state.phase !== "boss") return;
  state.paused = on;
  $("menu").hidden = !on;
  if (on) resetStick();
  syncPads();
}

function paintHud() {
  const s = state;
  $("wave-label").textContent = s.waveName || "The Belt";
  $("score").textContent = String(Math.floor(s.shown));
  $("weapon").textContent = WEAPONS[s.weapon - 1]?.name ?? "";
  const hyper = $("hyper-fill");
  if (hyper) hyper.style.width = `${Math.max(0, (1 - (s.player.galCd || 0) / 1.25) * 100)}%`;
  const dashBtn = $("btn-dash");
  if (dashBtn) dashBtn.classList.toggle("is-cool", (s.player.galCd || 0) > 0.05);

  const hearts = $("hearts");
  hearts.innerHTML = "";
  for (let i = 0; i < s.player.maxHp; i++) {
    const el = document.createElement("i");
    if (i >= s.player.hp) el.className = "off";
    hearts.appendChild(el);
  }

  if (s.boostT > 0 || (s.cloakT || 0) > 0) {
    $("boost").hidden = false;
    const bits = [];
    if (s.boostT > 0) bits.push(`${s.boostMul}x ${s.boostT.toFixed(0)}s`);
    if ((s.cloakT || 0) > 0) bits.push(`reentry ${s.cloakT.toFixed(0)}s`);
    $("boost").textContent = bits.join(" · ");
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

  $("dead-score").textContent = String(Math.floor(s.score));
  $("win-score").textContent = String(Math.floor(s.score));
}

function play() {
  unlockAudio();
  startRun(state, {
    compact: phone,
    bg: "mars",
    keepFlight: state.phase === "title",
  });
  firing = false;
  resetStick();
  prev.kills = 0;
  prev.weapon = 1;
  prev.hp = 4;
  prev.phase = "play";
  prev.wave = 0;
  setPaused(false);
  setPhaseUI("play");
  paintHud();
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
  if (phase === "title" && (e.code === "Enter" || k === "r")) {
    e.preventDefault();
    play();
    return;
  }
  if (live && (k === "p" || e.code === "Escape")) {
    e.preventDefault();
    setPaused(!state.paused);
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

function resetStick() {
  stick.id = null;
  stick.x = 0;
  stick.y = 0;
  const knob = $("stick-knob");
  if (knob) knob.style.transform = "translate(0px, 0px)";
}

function moveStick(x, y) {
  const max = 46;
  let dx = x - stick.cx;
  let dy = y - stick.cy;
  const m = Math.hypot(dx, dy) || 1;
  if (m > max) {
    dx = (dx / m) * max;
    dy = (dy / m) * max;
  }
  stick.x = deadzone(dx / max, 0.08);
  stick.y = deadzone(dy / max, 0.08);
  $("stick-knob").style.transform = `translate(${dx}px, ${dy}px)`;
}

window.addEventListener("keydown", onKey);
window.addEventListener("keyup", onKey);
window.addEventListener("resize", () => {
  renderer.resize();
  applyChrome();
});

$("stick").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (state.paused) return;
  if (state.phase !== "play" && state.phase !== "boss") return;
  stick.id = e.pointerId;
  const r = e.currentTarget.getBoundingClientRect();
  stick.cx = r.left + r.width / 2;
  stick.cy = r.top + r.height / 2;
  moveStick(e.clientX, e.clientY);
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
});
$("stick").addEventListener("pointermove", (e) => {
  if (stick.id !== e.pointerId) return;
  e.preventDefault();
  moveStick(e.clientX, e.clientY);
});
const endStick = (e) => {
  if (stick.id !== e.pointerId) return;
  resetStick();
};
$("stick").addEventListener("pointerup", endStick);
$("stick").addEventListener("pointercancel", endStick);

$("btn-fire").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  firing = true;
  e.currentTarget.classList.add("is-down");
  unlockAudio();
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
});
const endFire = (e) => {
  e.preventDefault();
  e.stopPropagation();
  firing = false;
  $("btn-fire").classList.remove("is-down");
};
$("btn-fire").addEventListener("pointerup", endFire);
$("btn-fire").addEventListener("pointercancel", endFire);

$("pads").addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("touchmove", (e) => {
  if (state.phase === "play" || state.phase === "boss") e.preventDefault();
}, { passive: false });

$("btn-dash").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (state.paused) return;
  if (state.phase !== "play" && state.phase !== "boss") return;
  if ((state.player.galCd || 0) <= 0) {
    galPulse = true;
    buzz(18);
  }
  unlockAudio();
});

app.addEventListener("pointerdown", (e) => {
  if (e.target.closest("a, button, .xg-stick, .xg-pad")) return;
  if (state.paused) return;
  if (phone) return;
  if (state.phase !== "play" && state.phase !== "boss" && state.phase !== "title") return;
  firing = true;
});
const endDeskFire = () => {
  if (!phone) firing = false;
};
app.addEventListener("pointerup", endDeskFire);
app.addEventListener("pointercancel", endDeskFire);

$("btn-play").addEventListener("pointerdown", (e) => { e.stopPropagation(); play(); });
$("btn-esc").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  setPaused(!state.paused);
});
$("btn-continue").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  setPaused(false);
});
$("btn-restart").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  play();
});
$("btn-exit").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  e.stopPropagation();
  goTitle(state);
  setPaused(false);
  setPhaseUI("title");
});
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

renderer.resize();
applyChrome();
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
  const fireHeld = firing || !!(keys[" "] || keys.space || keys.f || keys.j);
  const usingStick = stick.id != null && (Math.abs(stick.x) > 0.02 || Math.abs(stick.y) > 0.02);
  const pad = usingStick ? { x: stick.x, y: stick.y } : null;

  step(state, dt, {
    rotate: pad ? 0 : rotate,
    thrust: pad ? false : thrust,
    hyper,
    galactic,
    fire: live && !state.paused && fireHeld,
    tilt: pad,
  });

  if (state.kills > prev.kills) sfx.kill();
  if (state.weapon > prev.weapon) sfx.level();
  if (state.player.hp < prev.hp) sfx.hurt();
  if (state.phase === "boss" && prev.phase !== "boss") sfx.boss();
  if (state.phase === "win" && prev.phase !== "win") {
    sfx.win();
    showBest($("best-win"), writeBest(state.score));
    setPhaseUI("win");
  }
  if (state.phase === "dead" && prev.phase !== "dead") {
    sfx.dead();
    firing = false;
    resetStick();
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
