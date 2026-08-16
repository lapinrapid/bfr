import { KIND_COLOR, tentacle, WORLDS, isRock } from "./sim.js";

const BG_IMG = {};
for (const key of Object.keys(WORLDS)) {
  const img = new Image();
  img.src = WORLDS[key].src;
  BG_IMG[key] = img;
}

function makeNebula(hue, arms, squash) {
  const c = document.createElement("canvas");
  c.width = 280;
  c.height = 280;
  const g = c.getContext("2d");
  g.translate(140, 140);
  g.scale(1, squash);
  const glow = g.createRadialGradient(0, 0, 10, 0, 0, 132);
  glow.addColorStop(0, `hsla(${hue}, 55%, 62%, 0.22)`);
  glow.addColorStop(0.4, `hsla(${hue + 18}, 50%, 42%, 0.1)`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = glow;
  g.beginPath();
  g.arc(0, 0, 132, 0, Math.PI * 2);
  g.fill();
  const core = g.createRadialGradient(0, 0, 0, 0, 0, 28);
  core.addColorStop(0, "rgba(255,252,240,0.95)");
  core.addColorStop(0.35, `hsla(${hue}, 70%, 72%, 0.55)`);
  core.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = core;
  g.beginPath();
  g.arc(0, 0, 28, 0, Math.PI * 2);
  g.fill();
  for (let a = 0; a < arms; a++) {
    const base = (a / arms) * Math.PI * 2;
    for (let t = 0; t < 110; t++) {
      const u = t / 110;
      const ang = base + u * 4.6;
      const r = 16 + u * 118;
      const wob = Math.sin(t * 1.8 + a * 2.4) * 7;
      g.fillStyle = `hsla(${hue + u * 28}, 72%, ${78 - u * 26}%, ${(1 - u) * 0.28})`;
      g.beginPath();
      g.arc(Math.cos(ang) * r + wob, Math.sin(ang) * r, 1.4 + (1 - u) * 2.6, 0, Math.PI * 2);
      g.fill();
    }
  }
  return c;
}

const NEBULAE = [
  { img: makeNebula(212, 3, 0.48), x: 0.18, y: 0.22, s: 0.16, rot: 0.014, drift: 0.004 },
  { img: makeNebula(28, 2, 0.55), x: 0.78, y: 0.7, s: 0.2, rot: -0.01, drift: 0.003 },
  { img: makeNebula(140, 4, 0.4), x: 0.66, y: 0.16, s: 0.1, rot: 0.018, drift: 0.005 },
];

const BLOBS = [
  { x: 0.22, y: 0.28, r: 0.38, h: 150, s: 55, l: 42, vx: 0.004, vy: 0.0014 },
  { x: 0.78, y: 0.22, r: 0.3, h: 200, s: 45, l: 40, vx: -0.003, vy: 0.0018 },
  { x: 0.6, y: 0.76, r: 0.4, h: 18, s: 50, l: 38, vx: 0.0022, vy: -0.0016 },
];

const STARS = Array.from({ length: 160 }, () => ({
  x: Math.random(),
  y: Math.random(),
  s: 0.4 + Math.random() * 1.9,
  a: 0.2 + Math.random() * 0.62,
  d: 5 + Math.random() * 16,
  hue: Math.random() < 0.16 ? 150 : Math.random() < 0.08 ? 38 : 0,
}));

const BOSS_PAL = { line: "rgba(255, 80, 200, 0.65)" };

const overmindImg = new Image();
overmindImg.src = "img/overmind.jpg";

const roadsterImg = new Image();
roadsterImg.src = "img/roadster.png";

const shipRaw = new Image();
let shipKeyed = null;
function keyStarship() {
  if (!shipRaw.naturalWidth || shipKeyed) return;
  const src = document.createElement("canvas");
  src.width = shipRaw.naturalWidth;
  src.height = shipRaw.naturalHeight;
  const g = src.getContext("2d");
  g.drawImage(shipRaw, 0, 0);
  const data = g.getImageData(0, 0, src.width, src.height);
  const p = data.data;
  let minX = src.width;
  let minY = src.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) * 4;
      const r = p[i];
      const gv = p[i + 1];
      const b = p[i + 2];
      if (r > 236 && gv > 236 && b > 236) {
        p[i + 3] = 0;
        continue;
      }
      if (r > 210 && gv > 210 && b > 210) p[i + 3] = Math.max(0, 255 - (r + gv + b - 630));
      if (p[i + 3] > 24) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  g.putImageData(data, 0, 0);
  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(src.width - 1, maxX + pad);
  maxY = Math.min(src.height - 1, maxY + pad);
  const c = document.createElement("canvas");
  c.width = Math.max(1, maxX - minX + 1);
  c.height = Math.max(1, maxY - minY + 1);
  c.getContext("2d").drawImage(src, minX, minY, c.width, c.height, 0, 0, c.width, c.height);
  shipKeyed = c;
}
shipRaw.onload = keyStarship;
shipRaw.src = "img/starship.png";
if (shipRaw.complete) keyStarship();

const shRaw = new Image();
let shKeyed = null;
function keySuperheavy() {
  if (!shRaw.naturalWidth || shKeyed) return;
  const c = document.createElement("canvas");
  c.width = shRaw.naturalWidth;
  c.height = shRaw.naturalHeight;
  const g = c.getContext("2d");
  g.drawImage(shRaw, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height);
  const p = data.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i];
    const gv = p[i + 1];
    const b = p[i + 2];
    if (r > 232 && gv > 232 && b > 232) p[i + 3] = 0;
    else if (r > 200 && gv > 200 && b > 200) p[i + 3] = Math.max(0, 255 - (r + gv + b - 600));
  }
  g.putImageData(data, 0, 0);
  shKeyed = c;
}
shRaw.onload = keySuperheavy;
shRaw.src = "img/superheavy.png";
if (shRaw.complete) keySuperheavy();

function worldOf(s) {
  return WORLDS[s.bg] || WORLDS.mars;
}

function pal(s) {
  if (s.phase === "boss") return BOSS_PAL;
  return worldOf(s);
}

function wrap01(v) {
  return ((v % 1) + 1) % 1;
}

function seedRand(seed) {
  let x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function rockVerts(seed, r, n = 9) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const jagged = 0.68 + seedRand(seed + i * 7.13) * 0.42;
    pts.push({
      x: Math.cos(a) * r * jagged,
      y: Math.sin(a) * r * jagged,
    });
  }
  return pts;
}

function drawAsteroid(ctx, e) {
  const r = e.r;
  const seed = e.seed ?? e.id ?? 1;
  const hot = e.kind === "spin";
  ctx.save();
  if (e.flash > 0) ctx.globalAlpha = 0.55 + e.flash * 0.45;
  ctx.rotate(e.spin || 0);
  const pts = rockVerts(seed, r);
  const g = ctx.createRadialGradient(-r * 0.28, -r * 0.3, 2, 0, 0, r * 1.05);
  g.addColorStop(0, hot ? "#f0d8b4" : "#e2c8a4");
  g.addColorStop(0.45, hot ? "#b89468" : "#9a7a58");
  g.addColorStop(1, "#3a2a1e");
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,230,190,0.18)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const craters = 2 + Math.floor(seedRand(seed + 40) * 3);
  for (let i = 0; i < craters; i++) {
    const a = seedRand(seed + i * 19) * Math.PI * 2;
    const d = r * (0.15 + seedRand(seed + i * 23) * 0.45);
    const cr = r * (0.1 + seedRand(seed + i * 29) * 0.16);
    ctx.fillStyle = "rgba(30, 18, 12, 0.45)";
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, cr, cr * 0.78, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 220, 180, 0.12)";
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * d - cr * 0.25, Math.sin(a) * d - cr * 0.25, cr * 0.4, cr * 0.28, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMeteor(ctx, e) {
  ctx.save();
  const t = e.t || 0;
  ctx.rotate(e.spin || 0);
  ctx.shadowColor = "#ff6a2c";
  ctx.shadowBlur = 18;
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = 0.18 + i * 0.08;
    ctx.fillStyle = i < 2 ? "#fff4c4" : i < 4 ? "#ff8a2a" : "#ff3b00";
    ctx.beginPath();
    ctx.ellipse(-e.r * (0.4 + i * 0.22), 0, e.r * (0.55 + i * 0.18), e.r * (0.22 - i * 0.02), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  drawAsteroid(ctx, e);
}

function drawShootingStar(ctx, e) {
  const t = e.t || 0;
  ctx.save();
  if (e.flash > 0) ctx.globalAlpha = 0.55 + e.flash * 0.45;
  const ang = Math.atan2(e.vy || 0, e.vx || 1);
  ctx.rotate(ang);
  ctx.shadowColor = "#ffe566";
  ctx.shadowBlur = 16;
  const g = ctx.createLinearGradient(-e.r * 3.2, 0, e.r * 1.2, 0);
  g.addColorStop(0, "rgba(255, 180, 40, 0)");
  g.addColorStop(0.55, "rgba(255, 210, 80, 0.45)");
  g.addColorStop(1, "#fff8d0");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(e.r * 1.3, 0);
  ctx.lineTo(-e.r * 3.4, e.r * 0.28);
  ctx.lineTo(-e.r * 3.4, -e.r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff6c8";
  ctx.beginPath();
  ctx.arc(e.r * 0.15, 0, e.r * 0.55 + Math.sin(t * 18) * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(e.r * 0.2, -e.r * 0.08, e.r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.kind === "star") drawShootingStar(ctx, e);
  else if (e.kind === "meteor") drawMeteor(ctx, e);
  else drawAsteroid(ctx, e);
  ctx.restore();
}

function drawRoadster(ctx, size) {
  const s = size * 2.15;
  if (roadsterImg.complete && roadsterImg.naturalWidth > 0) {
    ctx.drawImage(roadsterImg, -s / 2, -s / 2, s, s);
  } else {
    ctx.fillStyle = "#e10600";
    ctx.beginPath();
    ctx.roundRect(-size, -size * 0.45, size * 2, size * 0.9, 6);
    ctx.fill();
  }
}

function drawReentry(ctx, t, remaining) {
  const warn = remaining < 3;
  const flicker = 0.75 + Math.sin(t * 38) * 0.18 + Math.sin(t * 71) * 0.07;
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const u = i / 7;
    ctx.globalAlpha = (0.1 + (1 - u) * 0.22) * flicker;
    ctx.fillStyle = i < 2 ? "#fff6d8" : i < 4 ? "#ffb347" : "#ff4a14";
    ctx.beginPath();
    ctx.ellipse(-8 - i * 7, 0, 22 + i * 10, 10 + i * 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.28 + Math.sin(t * 22) * 0.1;
  ctx.strokeStyle = warn ? "#fff" : "#ffb347";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(2, 0, 28 + Math.sin(t * 16) * 3, 18 + Math.sin(t * 13) * 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = "rgba(255, 140, 40, 0.7)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) {
    const a = t * 9 + i * 0.8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 10);
    ctx.lineTo(Math.cos(a) * (30 + Math.sin(t * 20 + i) * 6), Math.sin(a) * (18 + Math.sin(t * 17 + i) * 4));
    ctx.stroke();
  }
  ctx.restore();
}

function flame(ctx, t, on) {
  const pow = on ? 1 : 0.42;
  const flicker = 0.82 + Math.sin(t * 31) * 0.1 + Math.sin(t * 53) * 0.07;
  for (let i = 0; i < 6; i++) {
    const len = (20 + i * 10) * pow * flicker + Math.sin(t * 26 + i * 1.3) * 5 * pow;
    const w = (6.5 - i * 0.7) * pow;
    const wob = Math.sin(t * 23 + i * 1.6) * 2.6 * pow;
    ctx.globalAlpha = (0.16 + (1 - i / 6) * 0.32) * (on ? 1 : 0.55);
    ctx.fillStyle = i < 2 ? "#fff4c4" : i < 4 ? "#ffb347" : "#ff4a14";
    ctx.beginPath();
    ctx.moveTo(-18, -w);
    ctx.quadraticCurveTo(-18 - len * 0.5, wob, -20 - len, wob * 0.25);
    ctx.quadraticCurveTo(-18 - len * 0.5, -wob, -18, w);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawStarship(ctx, size, t, thrusting) {
  const img = shipKeyed && shipKeyed.width ? shipKeyed : null;
  if (img) {
    const hgt = size * 2.55;
    const wid = hgt * (img.width / img.height);
    ctx.save();
    // Photo points nose up-right; rotate so nose is +X like the rest of the game.
    ctx.rotate(Math.PI / 4);
    if (thrusting) {
      ctx.save();
      ctx.translate(-wid * 0.28, wid * 0.28);
      ctx.rotate((-3 * Math.PI) / 4);
      flame(ctx, t, true);
      ctx.restore();
    }
    ctx.drawImage(img, -wid * 0.5, -hgt * 0.5, wid, hgt);
    ctx.restore();
    return;
  }

  const L = size * 1.55;
  const W = size * 0.22;

  ctx.save();

  // aft flaps — large, rear, like Starship elonets
  ctx.fillStyle = "#8d969c";
  ctx.strokeStyle = "rgba(30, 34, 38, 0.35)";
  ctx.lineWidth = 0.8;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-L * 0.08, s * W * 0.55);
    ctx.lineTo(-L * 0.38, s * W * 2.05);
    ctx.lineTo(-L * 0.18, s * W * 2.05);
    ctx.lineTo(-L * 0.02, s * W * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // forward flaps
  ctx.fillStyle = "#a3adb4";
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(L * 0.18, s * W * 0.55);
    ctx.lineTo(L * 0.02, s * W * 1.55);
    ctx.lineTo(L * 0.16, s * W * 1.55);
    ctx.lineTo(L * 0.28, s * W * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // stainless cylinder + pointed nose
  const body = ctx.createLinearGradient(0, -W, 0, W);
  body.addColorStop(0, "#5c646a");
  body.addColorStop(0.18, "#c5ced4");
  body.addColorStop(0.42, "#f3f6f8");
  body.addColorStop(0.62, "#cfd6dc");
  body.addColorStop(0.82, "#8a7a6e");
  body.addColorStop(1, "#2c221c");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(L * 0.72, 0);
  ctx.quadraticCurveTo(L * 0.52, -W * 0.55, L * 0.22, -W);
  ctx.lineTo(-L * 0.38, -W * 0.96);
  ctx.quadraticCurveTo(-L * 0.52, -W * 0.55, -L * 0.54, 0);
  ctx.quadraticCurveTo(-L * 0.52, W * 0.55, -L * 0.38, W * 0.96);
  ctx.lineTo(L * 0.22, W);
  ctx.quadraticCurveTo(L * 0.52, W * 0.55, L * 0.72, 0);
  ctx.closePath();
  ctx.fill();

  // black hex heat-tile belly
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(L * 0.42, W * 0.12);
  ctx.quadraticCurveTo(L * 0.18, W * 0.98, -L * 0.12, W * 0.94);
  ctx.lineTo(-L * 0.36, W * 0.72);
  ctx.quadraticCurveTo(-L * 0.1, W * 0.28, L * 0.42, W * 0.12);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#1a1410";
  ctx.fill();
  ctx.strokeStyle = "rgba(70, 48, 32, 0.55)";
  ctx.lineWidth = 0.6;
  const hex = size * 0.085;
  for (let row = -2; row < 8; row++) {
    for (let col = -6; col < 8; col++) {
      const hx = -L * 0.28 + col * hex * 1.55 + (row % 2 ? hex * 0.78 : 0);
      const hy = W * 0.22 + row * hex * 0.9;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        const px = hx + Math.cos(a) * hex * 0.48;
        const py = hy + Math.sin(a) * hex * 0.48;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.restore();

  // weld rings
  ctx.strokeStyle = "rgba(40, 48, 56, 0.32)";
  ctx.lineWidth = 0.9;
  for (const x of [-L * 0.22, -L * 0.02, L * 0.16]) {
    ctx.beginPath();
    ctx.moveTo(x, -W * 0.92);
    ctx.lineTo(x, W * 0.92);
    ctx.stroke();
  }

  // payload windows
  ctx.fillStyle = "#121820";
  ctx.beginPath();
  ctx.ellipse(L * 0.38, -W * 0.22, size * 0.05, size * 0.028, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(170, 210, 240, 0.55)";
  ctx.beginPath();
  ctx.ellipse(L * 0.375, -W * 0.235, size * 0.02, size * 0.012, 0, 0, Math.PI * 2);
  ctx.fill();

  // 6 raptor bells
  ctx.fillStyle = "#1c2228";
  const bells = [-W * 0.62, -W * 0.36, -W * 0.12, W * 0.12, W * 0.36, W * 0.62];
  for (const oy of bells) {
    ctx.beginPath();
    ctx.ellipse(-L * 0.52, oy * 0.7, size * 0.055, size * 0.038, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (thrusting) {
    flame(ctx, t, true);
    for (const oy of bells) {
      ctx.fillStyle = `rgba(255, 200, 120, ${0.5 + Math.sin(t * 42 + oy * 8) * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(-L * 0.56, oy * 0.7, size * 0.04, size * 0.024, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawRaptorPlume(ctx, t, scale, on) {
  if (!on) return;
  const flick = 0.82 + Math.sin(t * 41) * 0.12 + Math.sin(t * 67) * 0.08;
  for (let i = 0; i < 7; i++) {
    const u = i / 7;
    ctx.globalAlpha = (0.16 + (1 - u) * 0.28) * flick;
    ctx.fillStyle = i < 2 ? "#fff6c8" : i < 4 ? "#ffb347" : "#ff4a14";
    ctx.beginPath();
    ctx.ellipse(0, scale * (0.18 + i * 0.16), scale * (0.16 - u * 0.06), scale * (0.22 + i * 0.14), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSuperHeavyPhoto(ctx, hgt, t, thrusting, tilt = 0) {
  const img = shKeyed && shKeyed.width ? shKeyed : (shRaw.complete && shRaw.naturalWidth ? shRaw : null);
  const aspect = img ? img.width / img.height : 0.38;
  const ih = hgt;
  const iw = ih * aspect;
  ctx.save();
  ctx.rotate(tilt);
  if (img) ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
  if (thrusting) {
    ctx.save();
    ctx.translate(0, ih * 0.46);
    for (const ox of [-iw * 0.16, -iw * 0.06, iw * 0.04, iw * 0.14, -iw * 0.22, iw * 0.2]) {
      ctx.save();
      ctx.translate(ox, 0);
      drawRaptorPlume(ctx, t + ox, ih * 0.22, true);
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawIntro(ctx, s, w, h) {
  const t = s.intro || 0;
  const rise = Math.min(1, t / 2.05);
  const y0 = h + 160 - rise * (h * 0.48);
  const sep = Math.max(0, t - 2.25);
  const sepU = Math.min(1, sep / 2.5);
  const cx = w * 0.5;
  const boostH = Math.min(h * 0.62, 420);
  const shipY = y0 - boostH * 0.52 - sepU * h * 0.2;
  const boostY = y0 + sepU * h * 0.32;
  const boostTilt = sepU * 0.85;
  const shipThrust = t > 2.15;
  const boostThrust = t < 2.4 || (t > 3.55 && t < 7.0);

  ctx.save();
  ctx.globalAlpha = t < 0.3 ? t / 0.3 : t > 7.2 ? Math.max(0, 1 - (t - 7.2) / 0.55) : 1;

  ctx.save();
  ctx.translate(cx, boostY);
  drawSuperHeavyPhoto(ctx, boostH, s.t, boostThrust, boostTilt);
  ctx.restore();

  ctx.save();
  ctx.translate(cx, shipY);
  ctx.rotate(-Math.PI / 2);
  drawStarship(ctx, 34, s.t, shipThrust);
  ctx.restore();

  if (t > 2.12 && t < 2.75) {
    const flash = 1 - Math.abs(t - 2.38) / 0.38;
    ctx.fillStyle = `rgba(255, 230, 180, ${flash * 0.38})`;
    ctx.beginPath();
    ctx.arc(cx, (shipY + boostY) * 0.5, 50 + flash * 90, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.font = "600 13px Outfit, system-ui, sans-serif";
  ctx.textAlign = "center";
  let caption = "SUPER HEAVY  ·  HOT STAGE";
  if (t > 2.3 && t < 4.7) caption = "STAGE SEPARATION";
  else if (t >= 4.7) caption = "BOOSTER RETURN  ·  STARSHIP CONTINUES";
  ctx.fillText(caption, w / 2, h - 36);
  ctx.font = "500 11px Outfit, system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.fillText("click or space to skip", w / 2, h - 18);
  ctx.restore();
}

function star(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rad = i % 2 === 0 ? r : r * 0.38;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function boltLine(ctx, x1, y1, x2, y2, segs, amp, seed) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i < segs; i++) {
    const u = i / segs;
    const wob = Math.sin(u * 17 + seed) * amp * (0.35 + Math.sin(u * 9 + seed * 1.7) * 0.65);
    ctx.lineTo(x1 + dx * u + nx * wob, y1 + dy * u + ny * wob);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function pingpong(t, cycle) {
  const u = (t % (cycle * 2)) / cycle;
  return u < 1 ? u : 2 - u;
}

function bg(ctx, s, w, h) {
  ctx.fillStyle = "#020208";
  ctx.fillRect(-30, -30, w + 60, h + 60);

  const world = worldOf(s);
  const img = BG_IMG[s.bg] || BG_IMG.mars;
  if (img && img.complete && img.naturalWidth > 0) {
    const scale = Math.max((h * 1.08) / img.naturalHeight, (w * 1.35) / img.naturalWidth);
    const iw = img.naturalWidth * scale;
    const ih = img.naturalHeight * scale;
    const travel = Math.max(24, iw - w);
    const x = -pingpong(s.t, 48 / Math.max(0.4, world.speed / 10)) * travel;
    const y = (h - ih) * 0.55 + Math.sin(s.t * 0.07) * 10;
    ctx.drawImage(img, x, y, iw, ih);

    const haze = ctx.createLinearGradient(0, 0, 0, h);
    haze.addColorStop(0, "rgba(2,2,8,0.55)");
    haze.addColorStop(0.28, "rgba(2,2,8,0.12)");
    haze.addColorStop(0.55, "rgba(2,2,8,0)");
    haze.addColorStop(1, world.haze);
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);
  } else {
    for (const st of STARS) {
      const x = wrap01(st.x + (s.t * st.d) / Math.max(w, 1)) * w;
      const y = wrap01(st.y + s.t * 0.004 * (st.d / 14)) * h;
      ctx.globalAlpha = st.a;
      ctx.fillStyle = "#fff";
      ctx.fillRect(x, y, st.s, st.s);
    }
    ctx.globalAlpha = 1;
  }
}

function frame(ctx, s, w, h) {
  const iw = w - 44;
  const ih = h - 44;
  const p = pal(s);
  const pulse = 0.45 + Math.sin(s.t * 1.5) * 0.12;
  ctx.fillStyle = "rgba(2, 2, 8, 0.55)";
  ctx.fillRect(0, 0, w, 22);
  ctx.fillRect(0, 22 + ih, w, h - 22 - ih);
  ctx.fillRect(0, 22, 22, ih);
  ctx.fillRect(22 + iw, 22, w - 22 - iw, ih);
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 10;
  ctx.strokeRect(22, 22, iw, ih);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.shadowColor = p.line;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = p.line;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(22.5, 22.5, iw - 1, ih - 1);
  ctx.restore();
  ctx.strokeStyle = "rgba(240,246,255,0.82)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(22, 48); ctx.lineTo(22, 22); ctx.lineTo(48, 22);
  ctx.moveTo(22 + iw - 26, 22); ctx.lineTo(22 + iw, 22); ctx.lineTo(22 + iw, 48);
  ctx.moveTo(22 + iw, 22 + ih - 26); ctx.lineTo(22 + iw, 22 + ih); ctx.lineTo(22 + iw - 26, 22 + ih);
  ctx.moveTo(48, 22 + ih); ctx.lineTo(22, 22 + ih); ctx.lineTo(22, 22 + ih - 26);
  ctx.stroke();
}

function pips(ctx, s, w, h) {
  const mark = (x, y, c) => {
    const px = Math.max(25, Math.min(w - 25, x));
    const py = Math.max(25, Math.min(h - 25, y));
    if (x < 22 || x > w - 22 || y < 22 || y > h - 22) {
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(px, py, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };
  for (const e of s.enemies) mark(e.x, e.y, KIND_COLOR[e.kind]);
  if (s.boss) mark(s.boss.x, s.boss.y, "#39ff8a");
}

function ghosts(ctx, s) {
  const p = s.player;
  const extras = [];
  if (p.x < 90) extras.push({ x: p.x + s.w, y: p.y, a: 1 - p.x / 90 });
  if (p.x > s.w - 90) extras.push({ x: p.x - s.w, y: p.y, a: 1 - (s.w - p.x) / 90 });
  if (p.y < 90) extras.push({ x: p.x, y: p.y + s.h, a: 1 - p.y / 90 });
  if (p.y > s.h - 90) extras.push({ x: p.x, y: p.y - s.h, a: 1 - (s.h - p.y) / 90 });
  for (const g of extras) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, g.a) * 0.42;
    ctx.translate(g.x, g.y);
    ctx.rotate(p.angle);
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 10;
    drawStarship(ctx, 22, s.t, false);
    ctx.restore();
  }
}

function tentWidth(u, base) {
  return base * (1 - u * 0.78) * (1 - u * u * 0.12);
}

function normals(pts) {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    return { nx: -dy / l, ny: dx / l };
  });
}

function drawTentacles(ctx, boss, t) {
  const arms = Array.from({ length: 8 }, (_, i) => tentacle(boss, i, t));
  ctx.save();
  ctx.fillStyle = "rgba(12, 48, 32, 0.55)";
  ctx.beginPath();
  for (let i = 0; i < arms.length; i++) {
    const a = arms[i].pts[0];
    const b = arms[(i + 1) % arms.length].pts[0];
    const mx = (a.x + b.x) * 0.5;
    const my = (a.y + b.y) * 0.5;
    const cx = boss.x + (mx - boss.x) * 1.35;
    const cy = boss.y + (my - boss.y) * 1.35;
    if (i === 0) ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(cx, cy, b.x, b.y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const tips = ["rock", "meteor", "star", "rock", "meteor", "star", "rock", "meteor"];
  for (let i = 0; i < arms.length; i++) {
    const pts = arms[i].pts;
    const nrm = normals(pts);
    const base = 21 + (i % 2) * 3;
    ctx.save();
    ctx.beginPath();
    for (let k = 0; k < pts.length; k++) {
      const w = tentWidth(k / (pts.length - 1), base);
      const x = pts[k].x + nrm[k].nx * w * 0.5;
      const y = pts[k].y + nrm[k].ny * w * 0.5;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let k = pts.length - 1; k >= 0; k--) {
      const w = tentWidth(k / (pts.length - 1), base);
      ctx.lineTo(pts[k].x - nrm[k].nx * w * 0.5, pts[k].y - nrm[k].ny * w * 0.5);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y);
    g.addColorStop(0, "#12402a");
    g.addColorStop(0.45, "#1d6a42");
    g.addColorStop(1, "#0c2a1c");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(80, 200, 140, 0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.translate(arms[i].tip.x, arms[i].tip.y);
    drawEnemy(ctx, { kind: tips[i], x: 0, y: 0, r: 13, t, flash: 0, spin: t, seed: i * 17, id: i + 1 });
    ctx.restore();
  }
}

function drawLaser(ctx, boss, ang, life, w, h) {
  if (life <= 0) return;
  const reach = Math.hypot(w, h);
  const firing = life <= 0.52;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  ctx.rotate(ang);
  if (!firing) {
    ctx.strokeStyle = "rgba(80, 255, 140, 0.28)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(boss.r - 4, 0);
    ctx.lineTo(reach, 0);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    const n = Math.min(1, life / 0.18, (0.52 - life) / 0.08);
    ctx.shadowColor = "rgba(70, 255, 160, 0.4)";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = `rgba(90, 255, 170, ${0.22 + n * 0.28})`;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(boss.r - 4, 0);
    ctx.lineTo(reach, 0);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(210, 255, 230, ${0.35 + n * 0.3})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(boss.r - 4, 0);
    ctx.lineTo(reach, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBoss(ctx, s, w, h) {
  const b = s.boss;
  drawTentacles(ctx, b, s.t);
  drawLaser(ctx, b, b.laserA, b.laserT, w, h);
  if (b.phase >= 2) drawLaser(ctx, b, b.laserA2, b.laserT2, w, h);
  ctx.save();
  ctx.translate(b.x, b.y);
  const pulse = 1 + Math.sin(s.t * 1.15) * 0.012;
  ctx.scale(pulse, pulse);
  ctx.shadowColor = "#ff6a2c";
  ctx.shadowBlur = 28;
  drawMeteor(ctx, { r: b.r, t: s.t, spin: b.angle, seed: 77, flash: b.flash, id: 1 });
  if (b.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${b.flash * 0.18})`;
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  let dpr = 1;
  let w = 1;
  let h = 1;

  return {
    resize() {
      const parent = canvas.parentElement;
      const cw = parent?.clientWidth ?? window.innerWidth;
      const ch = parent?.clientHeight ?? window.innerHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cw;
      h = ch;
      canvas.width = Math.floor(cw * dpr);
      canvas.height = Math.floor(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
    },
    draw(s) {
      s.w = w;
      s.h = h;
      if (s.phase === "title" && !s._placed) {
        s.player.x = w / 2;
        s.player.y = h * 0.4;
        s._placed = true;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const sx = (Math.random() - 0.5) * s.shake;
      const sy = (Math.random() - 0.5) * s.shake;
      ctx.save();
      ctx.translate(sx, sy);
      bg(ctx, s, w, h);
      if (s.phase === "intro") drawIntro(ctx, s, w, h);
      if (s.phase === "play" || s.phase === "boss") pips(ctx, s, w, h);

      for (const n of s.particles) {
        const e = Math.max(0, n.life / n.max);
        ctx.globalAlpha = e;
        if (n.kind === "ring") {
          ctx.strokeStyle = n.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(n.x, n.y, (1 - e) * 46 + 8, 0, Math.PI * 2);
          ctx.stroke();
        } else if (n.kind === "heart") {
          const sc = 1.1 + (1 - e) * 1.35;
          ctx.save();
          ctx.translate(n.x, n.y);
          ctx.scale(sc, sc);
          ctx.globalAlpha = e * 0.85;
          ctx.fillStyle = "#ff4d6d";
          ctx.beginPath();
          ctx.moveTo(0, 9);
          ctx.bezierCurveTo(-16, -4, -10, -16, 0, -8);
          ctx.bezierCurveTo(10, -16, 16, -4, 0, 9);
          ctx.fill();
          ctx.restore();
        } else if (n.kind === "nova") {
          const r = 8 + (1 - e) * n.size;
          ctx.save();
          ctx.translate(n.x, n.y);
          ctx.strokeStyle = n.color;
          ctx.globalAlpha = e * 0.7;
          ctx.lineWidth = 1.4 + (1 - e) * 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (n.kind === "streak") {
          ctx.save();
          ctx.translate(n.x, n.y);
          ctx.rotate(Math.atan2(n.vy, n.vx));
          ctx.globalAlpha = e;
          ctx.fillStyle = n.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, n.size * (1.8 + e), n.size * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (n.kind === "flare") {
          ctx.save();
          ctx.translate(n.x, n.y);
          ctx.rotate((1 - e) * 0.8);
          ctx.globalAlpha = e;
          ctx.fillStyle = n.color;
          star(ctx, n.size * (0.55 + e * 0.7));
          ctx.restore();
        } else {
          ctx.fillStyle = n.color;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.size * e, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      for (const o of s.orbs) {
        ctx.save();
        ctx.translate(o.x, o.y);
        if (o.kind === "heart") {
          ctx.shadowColor = "#ff4d6d";
          ctx.shadowBlur = 16;
          ctx.fillStyle = "#ff4d6d";
          ctx.beginPath();
          ctx.moveTo(0, 9);
          ctx.bezierCurveTo(-16, -4, -10, -16, 0, -8);
          ctx.bezierCurveTo(10, -16, 16, -4, 0, 9);
          ctx.fill();
        } else if (o.kind === "rapid" || o.kind === "nova" || o.kind === "titan" || o.kind === "boost" || o.kind === "cloak") {
          const sc = 1.05 + Math.sin(s.t * 9 + o.x) * 0.08;
          ctx.scale(sc, sc);
          ctx.shadowColor = o.kind === "cloak" ? "#ff8a3d" : "#7ec8ff";
          ctx.shadowBlur = 18;
          ctx.rotate(s.t * 0.9);
          drawRoadster(ctx, 15);
          if (o.kind === "cloak") {
            ctx.rotate(-s.t * 0.9);
            ctx.strokeStyle = `rgba(255,140,40,${0.45 + Math.sin(s.t * 12) * 0.2})`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(0, 0, 20 + Math.sin(s.t * 10) * 2, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else {
          ctx.globalAlpha = 0.16;
          ctx.shadowColor = o.color;
          ctx.shadowBlur = 2;
          ctx.fillStyle = o.color;
          ctx.beginPath();
          ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      for (const sh of s.shocks) {
        ctx.strokeStyle = sh.ink ? "rgba(70, 30, 90, 0.55)" : "rgba(80,255,160,0.7)";
        ctx.lineWidth = sh.ink ? 10 : 3;
        ctx.shadowColor = sh.ink ? "rgba(80,20,100,0.3)" : "#39ff8a";
        ctx.shadowBlur = sh.ink ? 8 : 16;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      for (const e of s.enemies) drawEnemy(ctx, e);

      if (s.boss) drawBoss(ctx, s, w, h);

      for (const a of s.arcs) {
        let tx = a.x;
        let ty = a.y;
        if (a.tid === -1 && s.boss) { tx = s.boss.x; ty = s.boss.y; }
        else {
          const e = s.enemies.find((x) => x.id === a.tid);
          if (!e) continue;
          tx = e.x;
          ty = e.y;
        }
        const n = s.buffs.nova;
        const thick = 1.15 + n * 0.18;
        ctx.save();
        if (a.wait > 0) {
          ctx.strokeStyle = "rgba(232,121,249,0.7)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(a.x, a.y, 10 + (0.22 - Math.min(0.22, a.wait)) * 46, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const u = Math.min(1, a.t / a.max);
          const x = a.x + (tx - a.x) * u;
          const y = a.y + (ty - a.y) * u;
          const seed = a.x * 0.07 + a.y * 0.05 + a.tid;
          ctx.lineCap = "round";
          ctx.strokeStyle = "rgba(168,85,247,0.28)";
          ctx.lineWidth = thick + 2.4;
          boltLine(ctx, a.x, a.y, x, y, 8, 10 + n * 2, seed);
          ctx.strokeStyle = "rgba(232,121,249,0.85)";
          ctx.lineWidth = thick + 0.6;
          boltLine(ctx, a.x, a.y, x, y, 8, 7 + n, seed + 1);
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 0.9;
          boltLine(ctx, a.x, a.y, x, y, 8, 5 + n * 0.6, seed + 2);
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(x, y, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (s.phase === "title" || s.phase === "play" || s.phase === "boss") {
        const p = s.player;
        if (s.boostT > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.strokeStyle = `rgba(245,215,110,${0.28 + Math.sin(s.t * 10) * 0.1})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 30 + Math.sin(s.t * 9) * 3, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        if (s.buffs.rapid > 0 || s.buffs.nova > 0 || s.buffs.titan > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          if (s.buffs.rapid > 0) {
            ctx.strokeStyle = `rgba(255,107,44,${0.45 + Math.sin(s.t * 18) * 0.15})`;
            ctx.lineWidth = 2.4 + s.buffs.rapid * 0.5;
            const n = 8 + s.buffs.rapid * 2;
            for (let i = 0; i < n; i++) {
              const a = s.t * (16 + s.buffs.rapid * 3) + (i / n) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
              ctx.lineTo(Math.cos(a) * (32 + s.buffs.rapid * 4), Math.sin(a) * (32 + s.buffs.rapid * 4));
              ctx.stroke();
            }
          }
          if (s.buffs.nova > 0) {
            for (let i = 0; i < s.buffs.nova + 1; i++) {
              const u = (s.t * (1.4 + s.buffs.nova * 0.25) + i / (s.buffs.nova + 1)) % 1;
              ctx.strokeStyle = "#e879f9";
              ctx.globalAlpha = 0.38 * (1 - u);
              ctx.lineWidth = 1.15;
              ctx.beginPath();
              ctx.arc(0, 0, 16 + u * (90 + s.buffs.nova * 14), 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
          }
          if (s.buffs.titan > 0) {
            ctx.strokeStyle = `rgba(244,244,245,${0.4 + Math.sin(s.t * 6) * 0.12})`;
            ctx.lineWidth = 3.6 + s.buffs.titan * 0.8;
            ctx.beginPath();
            ctx.arc(0, 0, 40 + s.buffs.titan * 4 + Math.sin(s.t * 5) * 3, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        }

        if (p.galT > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          const u = p.galT / 0.4;
          ctx.strokeStyle = `rgba(160, 220, 255, ${0.25 + u * 0.45})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-18, 0);
          ctx.lineTo(-70 - (1 - u) * 40, 0);
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${0.2 + u * 0.4})`;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(0, 0, 36 + (1 - u) * 18, 12 + (1 - u) * 6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        if ((p.galCd || 0) > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.strokeStyle = "rgba(160,220,255,0.28)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 32, -Math.PI / 2, -Math.PI / 2 + (1 - p.galCd / 1.25) * Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (p.dashCd > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.strokeStyle = "rgba(255,255,255,0.22)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 32, -Math.PI / 2, -Math.PI / 2 + (1 - p.dashCd / 1.6) * Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        if ((s.cloakT || 0) > 0) drawReentry(ctx, s.t, s.cloakT);
        flame(ctx, s.t, p.thrusting);
        if (p.charging && s.weapon === 3) {
          const u = Math.min(1, p.charge / 0.12);
          ctx.strokeStyle = s.buffs.nova > 0
            ? `rgba(232,121,249,${0.28 + u * 0.45})`
            : `rgba(170,200,255,${0.26 + u * 0.42})`;
          ctx.lineWidth = 1.8 + u * 2.4;
          ctx.beginPath();
          ctx.moveTo(20, 0);
          ctx.lineTo(44 + u * 26, 0);
          ctx.stroke();
        }
        if (p.muzzle > 0) {
          const u = p.muzzle / 0.14;
          ctx.fillStyle = `rgba(180,220,255,${0.38 * u})`;
          ctx.beginPath();
          ctx.moveTo(18, 0);
          ctx.lineTo(34, 5);
          ctx.lineTo(44, 0);
          ctx.lineTo(34, -5);
          ctx.closePath();
          ctx.fill();
        }
        ctx.shadowColor = (s.cloakT || 0) > 0 ? "#ff8a3d" : "#fff";
        ctx.shadowBlur = (s.cloakT || 0) > 0 ? 28 : p.thrusting || p.charging || p.muzzle > 0 ? 22 : p.iFrames > 0 ? 16 : 14;
        if ((s.cloakT || 0) > 0) ctx.globalAlpha = 0.18 + Math.sin(s.t * 14) * 0.08;
        else ctx.globalAlpha = p.iFrames > 0 ? 0.62 + Math.sin(s.t * 7) * 0.18 : 1;
        drawStarship(ctx, s.phase === "title" ? 32 : 24, s.t, p.thrusting || p.galT > 0 || (s.cloakT || 0) > 0);
        ctx.restore();
        ghosts(ctx, s);
      }

      for (const b of s.beams) {
        const u = Math.max(0.14, b.life / b.max);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a);
        const reach = Math.hypot(s.w, s.h);
        const ww = b.w * u;
        ctx.fillStyle = `rgba(80, 160, 255, ${0.12 + u * 0.14})`;
        ctx.beginPath();
        ctx.roundRect(0, -ww * 0.62, reach, ww * 1.24, ww * 0.45);
        ctx.fill();
        ctx.fillStyle = `rgba(170, 210, 255, ${0.28 + u * 0.28})`;
        ctx.beginPath();
        ctx.roundRect(0, -ww * 0.28, reach, ww * 0.56, ww * 0.28);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + u * 0.4})`;
        ctx.beginPath();
        ctx.roundRect(0, -ww * 0.08, reach, ww * 0.16, ww * 0.08);
        ctx.fill();
        ctx.restore();
      }

      for (const f of s.foes) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.spin);
        ctx.globalAlpha = Math.min(1, f.life / 0.3);
        if (f.kind === "shard") {
          const g = ctx.createLinearGradient(-10, 0, 10, 0);
          g.addColorStop(0, "rgba(40,180,255,0.15)");
          g.addColorStop(0.45, "#7af0ff");
          g.addColorStop(1, "rgba(255,255,255,0.9)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(11, 0);
          ctx.lineTo(-4, 4.2);
          ctx.lineTo(-8, 0);
          ctx.lineTo(-4, -4.2);
          ctx.closePath();
          ctx.fill();
        } else {
          const g = ctx.createRadialGradient(0, 0, 1, 0, 0, f.r + 3);
          g.addColorStop(0, "#fff");
          g.addColorStop(0.28, "#a6ffc4");
          g.addColorStop(0.62, "#3bff8a");
          g.addColorStop(1, "rgba(10,40,20,0.1)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, f.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.font = "600 20px Outfit, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const pip of s.pips) {
        const u = Math.min(1, pip.t / pip.life);
        const fade = u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45;
        ctx.globalAlpha = Math.max(0, fade * 0.9);
        ctx.fillStyle = "#f4f4f4";
        ctx.fillText(`+${pip.n}`, pip.x, pip.y);
      }
      ctx.globalAlpha = 1;

      for (const b of s.bullets) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(Math.atan2(b.vy, b.vx));
        if (b.kind === "seek") {
          const gold = b.tint === "gold";
          ctx.fillStyle = gold ? "rgba(245, 190, 60, 0.28)" : "rgba(70, 150, 255, 0.28)";
          ctx.beginPath();
          ctx.ellipse(-10, 0, 12, 2.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = gold ? "#ffd36a" : "#7ec8ff";
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(-2, 3.4);
          ctx.lineTo(-8, 0);
          ctx.lineTo(-2, -3.4);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = s.buffs.rapid > 0 ? "rgba(255,107,44,0.3)" : "rgba(180, 210, 255, 0.26)";
          ctx.beginPath();
          ctx.ellipse(-4, 0, b.len * 0.68, b.r * 0.42, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = s.buffs.titan > 0 ? "#f4f4f5" : "#fff";
          ctx.beginPath();
          ctx.ellipse(2, 0, b.len * 0.34, b.r * 0.26, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = s.buffs.rapid > 0 ? "#ffb347" : "#9ecbff";
          ctx.beginPath();
          ctx.ellipse(-b.len * 0.28, 0, b.len * 0.22, b.r * 0.16, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();
      const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.78);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);
    },
  };
}
