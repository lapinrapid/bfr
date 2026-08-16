export const POWERS = {
  rapid: { name: "Overclock", color: "#ff6b2c" },
  nova: { name: "Nova", color: "#c084fc" },
  titan: { name: "Titan", color: "#f4f4f5" },
};

export const WEAPONS = [
  { name: "Pulse", use: "Single heavy bolt. Solid, but you will want more." },
  { name: "Twin", use: "Dual streams. Twice the fire, twice the wreckage." },
  { name: "Rail", use: "Charged lance. Punches through a whole belt." },
  { name: "Spread", use: "Seven-way cone. Anything in front of you dies." },
  { name: "Seekers", use: "A swarm of heat-seekers. They hunt on their own." },
];

const fill = (kind, n) => Array.from({ length: n }, () => kind);

export const WORLDS = {
  mars: {
    name: "Mars",
    src: "img/bg-mars.jpg",
    line: "rgba(255, 170, 110, 0.55)",
    haze: "rgba(180, 70, 30, 0.22)",
    speed: 11,
  },
};

export const WAVES = [
  { name: "The Belt", pack: fill("rock", 24) },
  { name: "Meteor Storm", pack: [...fill("rock", 10), ...fill("meteor", 18)] },
  { name: "Starfall", pack: [...fill("rock", 8), ...fill("meteor", 10), ...fill("star", 18)] },
];

export const STATS = {
  rock: { hp: 5, r: 24, spd: 62 },
  meteor: { hp: 6, r: 22, spd: 130 },
  star: { hp: 3, r: 16, spd: 220 },
};

export const KIND_COLOR = {
  rock: "#c4a07a",
  meteor: "#ff6a2c",
  star: "#ffe566",
};

export const isRock = (kind) => kind === "rock" || kind === "meteor";

let nid = 1;
const nextId = () => nid++;

export function freshState() {
  return {
    w: 900,
    h: 700,
    phase: "title",
    t: 0,
    player: {
      x: 450, y: 380, vx: 0, vy: 0, angle: -Math.PI / 4,
      hp: 4, maxHp: 4, iFrames: 0, dashCd: 0, galCd: 0, galT: 0, fireCd: 0,
      thrusting: false, charging: false, charge: 0, muzzle: 0,
    },
    bullets: [],
    shocks: [],
    enemies: [],
    orbs: [],
    particles: [],
    boss: null,
    kills: 0,
    score: 0,
    weapon: 1,
    wave: 0,
    waveName: "",
    waveBanner: 0,
    spawnQ: [],
    spawnT: 0,
    shake: 0,
    hitstop: 0,
    combo: 0,
    invuln: 0,
    marks: 0,
    unlock: null,
    shown: 0,
    pips: [],
    beams: [],
    foes: [],
    arcs: [],
    boostT: 0,
    boostMul: 1,
    overdrive: 0,
    cloakT: 0,
    buffs: { rapid: 0, nova: 0, titan: 0 },
    note: null,
    compact: false,
    paused: false,
    bg: "mars",
    intro: 0,
  };
}

function thin(arr, frac) {
  if (arr.length <= 5) return arr.slice();
  const n = Math.max(5, Math.round(arr.length * frac));
  if (n >= arr.length) return arr.slice();
  const out = [];
  const step = arr.length / n;
  for (let i = 0; i < n; i++) out.push(arr[Math.min(arr.length - 1, Math.floor(i * step))]);
  return out;
}

export function startRun(s, opts) {
  const { w, h } = s;
  const compact = opts?.compact ?? s.compact;
  const bg = opts?.bg ?? s.bg ?? "mars";
  const keep = opts?.keepFlight ? {
    x: s.player.x, y: s.player.y, vx: s.player.vx, vy: s.player.vy,
    angle: s.player.angle, galCd: s.player.galCd, galT: s.player.galT,
    dashCd: s.player.dashCd,
  } : null;
  Object.assign(s, freshState(), { w, h, phase: "intro", compact, bg: "mars", _placed: true, intro: 0 });
  if (keep) {
    Object.assign(s.player, keep);
  } else {
    s.player.x = w / 2;
    s.player.y = h * 0.62;
  }
}

export function finishIntro(s) {
  s.phase = "play";
  s.intro = 99;
  startWave(s, 0);
}

export function goTitle(s) {
  const { w, h } = s;
  Object.assign(s, freshState(), { w, h, phase: "title", bg: "mars" });
}

export function startWave(s, i) {
  const w = WAVES[i];
  s.wave = i;
  s.waveName = w.name;
  s.waveBanner = 1.8;
  s.spawnQ = s.compact ? thin(w.pack, 0.55) : w.pack.slice();
  s.spawnT = 0.35;
}

function weaponFromMarks(m) {
  return Math.min(5, 1 + Math.floor(m / 16));
}

function baseCd(wpn) {
  if (wpn === 3) return 0.42;
  if (wpn === 5) return 0.52;
  return Math.max(0.12, 0.22 - wpn * 0.012);
}

function stacks(s, k) {
  return s.buffs[k] || 0;
}

function fireCd(s) {
  let t = baseCd(s.weapon) * (s.overdrive > 0 ? 0.6 : 1);
  const n = stacks(s, "rapid");
  if (n > 0) t *= Math.max(0.08, 0.34 * 0.66 ** (n - 1));
  return t;
}

function addScore(s, x, y, n) {
  if (n <= 0) return;
  const v = Math.round(n * (s.boostT > 0 ? s.boostMul : 1));
  s.score += v;
  if (s.pips.length > 18) {
    const old = s.pips.shift();
    if (old) s.shown += old.n;
  }
  s.pips.push({ x, y, sx: x, sy: y, n: v, t: 0, life: 1.25 });
}

function safeSpot(s) {
  for (let i = 0; i < 28; i++) {
    const x = 70 + Math.random() * (s.w - 140);
    const y = 70 + Math.random() * (s.h - 140);
    let ok = true;
    for (const e of s.enemies) {
      if ((e.x - x) ** 2 + (e.y - y) ** 2 < (e.r + 88) ** 2) { ok = false; break; }
    }
    if (ok && s.boss && (s.boss.x - x) ** 2 + (s.boss.y - y) ** 2 < (s.boss.r + 100) ** 2) ok = false;
    if (ok) {
      for (const f of s.foes) {
        if ((f.x - x) ** 2 + (f.y - y) ** 2 < 70 ** 2) { ok = false; break; }
      }
    }
    if (ok) return { x, y };
  }
  return { x: s.w * 0.5, y: s.h * 0.55 };
}

export function wrap(s, t) {
  if (t.x < -24) t.x = s.w + 24;
  else if (t.x > s.w + 24) t.x = -24;
  if (t.y < -24) t.y = s.h + 24;
  else if (t.y > s.h + 24) t.y = -24;
}

function edgeSpawn(s) {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * s.w, y: -36 };
  if (side === 1) return { x: Math.random() * s.w, y: s.h + 36 };
  if (side === 2) return { x: -36, y: Math.random() * s.h };
  return { x: s.w + 36, y: Math.random() * s.h };
}

export function spawnEnemy(s, kind, pos, extra) {
  const st = STATS[kind];
  const p = pos ?? edgeSpawn(s);
  const spd = 40 + Math.random() * 90;
  const a = Math.random() * Math.PI * 2;
  const r = extra?.r ?? st.r;
  const hp = extra?.hp ?? st.hp;
  s.enemies.push({
    id: nextId(),
    kind,
    x: p.x,
    y: p.y,
    vx: extra?.vx ?? Math.cos(a) * spd,
    vy: extra?.vy ?? Math.sin(a) * spd,
    r,
    hp,
    max: hp,
    t: Math.random() * 10,
    flash: 0,
    aim: 0,
    next: 0.6 + Math.random() * 0.8,
    split: extra?.split ?? true,
    novaLock: 0,
    spin: extra?.spin ?? Math.random() * Math.PI * 2,
    spinV: extra?.spinV ?? (0.4 + Math.random() * 1.8) * (Math.random() < 0.5 ? -1 : 1),
    seed: extra?.seed ?? Math.random() * 1000,
  });
}

function burst(s, x, y, color, n = 10, spd = 180) {
  if (s.particles.length > 140) return;
  n = Math.min(n, 14);
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
    const v = spd * (0.4 + Math.random());
    s.particles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      life: 0.28 + Math.random() * 0.25, max: 0.5,
      size: 2 + Math.random() * 3, color, kind: "spark",
    });
  }
}

function ring(s, x, y, color) {
  s.particles.push({ x, y, vx: 0, vy: 0, life: 0.35, max: 0.35, size: 8, color, kind: "ring" });
}

function has(s, k) {
  return s.buffs[k] > 0;
}

function aim(x, y, tx, ty) {
  return Math.atan2(ty - y, tx - x);
}

function fireBolt(s, ang, opt = {}) {
  const p = s.player;
  const ti = stacks(s, "titan");
  const nv = stacks(s, "nova");
  const spd = (opt.spd ?? 680) * (ti > 0 ? 0.86 : 1);
  s.bullets.push({
    x: p.x + Math.cos(ang) * 22,
    y: p.y + Math.sin(ang) * 22,
    vx: Math.cos(ang) * spd,
    vy: Math.sin(ang) * spd,
    r: (opt.r ?? 4.2) * (1 + ti * 0.2),
    life: opt.life ?? 1.15,
    dmg: (opt.dmg ?? 2) * (1 + ti * 1.05) * (1 + nv * 0.08),
    pierce: (opt.pierce ?? 0) + (ti > 0 ? 1 + ti : 0),
    homing: opt.homing ?? false,
    kind: opt.kind ?? "bolt",
    len: (opt.len ?? 10) * (1 + ti * 0.16),
    tint: opt.tint ?? null,
    tx: 0, ty: 0, lock: 0,
    look: opt.look ?? s.weapon,
  });
  if (s.bullets.length > 64) s.bullets.splice(0, s.bullets.length - 64);
}

function muzzleFlash(s) {
  const p = s.player;
  p.muzzle = Math.max(p.muzzle, 0.14);
  const a = p.angle;
  const x = p.x + Math.cos(a) * 26;
  const y = p.y + Math.sin(a) * 26;
  const ti = stacks(s, "titan");
  const nv = stacks(s, "nova");
  const rp = stacks(s, "rapid");
  const c = nv > 0 ? "#e879f9" : ti > 0 ? "#f4f4f5" : rp > 0 ? "#ff8a3d" : "#9ecbff";
  if (s.particles.length < 140) {
    s.particles.push({ x, y, vx: 0, vy: 0, life: 0.11, max: 0.11, size: 16 + ti * 4 + nv * 2, color: c, kind: "flare" });
  }
  burst(s, x, y, c, 5 + ti + nv, 220);
}

function fireWeapon(s) {
  const a = s.player.angle;
  const w = s.weapon;
  if (w === 1) fireBolt(s, a, { r: 7.2, dmg: 5.2, spd: 560, kind: "bolt", len: 18, look: 1 });
  else if (w === 2) {
    fireBolt(s, a - 0.12, { r: 6.2, dmg: 6.4, spd: 680, kind: "bolt", len: 16, look: 2 });
    fireBolt(s, a, { r: 6.8, dmg: 7.2, spd: 720, kind: "bolt", len: 18, look: 2 });
    fireBolt(s, a + 0.12, { r: 6.2, dmg: 6.4, spd: 680, kind: "bolt", len: 16, look: 2 });
  } else if (w === 4) {
    for (const d of [-0.55, -0.36, -0.18, 0, 0.18, 0.36, 0.55]) {
      fireBolt(s, a + d, { r: 5.4, dmg: 5.8, spd: 780, pierce: 1, kind: "bolt", len: 14, look: 4 });
    }
  } else if (w === 5) {
    [-0.62, -0.4, -0.2, 0, 0.2, 0.4, 0.62].forEach((d, i) => {
      fireBolt(s, a + d, {
        r: 6.4, dmg: 9.5, spd: 520 + Math.abs(d) * 30,
        kind: "seek", homing: true, life: 2.2, len: 16, pierce: 1,
        tint: i % 2 === 0 ? "blue" : "gold", look: 5,
      });
    });
  }
  muzzleFlash(s);
  s._shot = true;
}

function railSpec() {
  return { w: 18, dmg: 48, charge: 0.1, linger: 0.42 };
}

function railHits(s, x, y, a, w, dmg, score = true) {
  const cx = Math.cos(a);
  const sy = Math.sin(a);
  const hit = (px, py, r) => {
    const dx = px - x;
    const dy = py - y;
    const along = dx * cx + dy * sy;
    if (along < -8) return false;
    const ox = dx - along * cx;
    const oy = dy - along * sy;
    return ox * ox + oy * oy < (w + r) * (w + r);
  };
  for (const e of s.enemies) {
    if (e.hp <= 0 || !hit(e.x, e.y, e.r)) continue;
    e.hp -= dmg;
    e.flash = 1;
    if (score) addScore(s, e.x, e.y, 10);
    burst(s, e.x, e.y, "#fff", 6, 120);
    novaOn(s, e);
    if (e.hp <= 0) killEnemy(s, e);
  }
  if (score && s.boss && hit(s.boss.x, s.boss.y, s.boss.r)) {
    s.boss.hp -= dmg;
    s.boss.flash = 0.45;
    addScore(s, s.boss.x, s.boss.y, 10);
    if (has(s, "nova") && s.boss.novaLock <= 0) {
      s.boss.novaLock = novaCd(s);
      sparkNova(s, s.boss.x, s.boss.y, -1, 0);
    }
    if (s.boss.hp <= 0) killBoss(s);
  }
  for (const f of s.foes) {
    if (f.life > 0 && hit(f.x, f.y, f.r)) f.life = 0;
  }
}

function fireRail(s) {
  const p = s.player;
  const spec = railSpec();
  const ti = stacks(s, "titan");
  const w = spec.w * (1 + ti * 0.28);
  const dmg = spec.dmg * (1 + ti * 1.25);
  const linger = spec.linger * (1 + ti * 0.4);
  s.beams.push({ x: p.x, y: p.y, a: p.angle, w, life: linger, max: linger, dmg });
  s.shake = Math.min(14, 4 + ti * 2.4 + stacks(s, "nova"));
  railHits(s, p.x, p.y, p.angle, w, dmg);
  muzzleFlash(s);
  const cx = Math.cos(p.angle);
  const sy = Math.sin(p.angle);
  burst(s, p.x + cx * 28, p.y + sy * 28, ti > 0 ? "#f4f4f5" : stacks(s, "nova") > 0 ? "#e879f9" : "#9ecbff", 10 + ti * 2, 240);
  s._shot = true;
  s._rail = true;
}

function novaCd(s) {
  return Math.max(0.12, 0.26 - stacks(s, "nova") * 0.025);
}

function sparkNova(s, x, y, fromId, hop) {
  if (!has(s, "nova")) return;
  const n = stacks(s, "nova");
  if (hop >= n) return;
  const reach = 180 + n * 58;
  const cands = [];
  for (const e of s.enemies) {
    if (e.id === fromId || e.hp <= 0) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < reach * reach) cands.push({ id: e.id, d });
  }
  if (s.boss && fromId !== -1) {
    const d = (s.boss.x - x) ** 2 + (s.boss.y - y) ** 2;
    if (d < (reach + 40) ** 2) cands.push({ id: -1, d });
  }
  cands.sort((a, b) => a.d - b.d);
  cands.slice(0, 4 + n * 3).forEach((c, i) => {
    s.arcs.push({
      x, y, tid: c.id,
      wait: 0.06 + i * 0.045 + hop * 0.07,
      t: 0, max: 0.2, dmg: 6 + n * 4, hop,
    });
  });
  if (s.particles.length < 140) {
    s.particles.push({ x, y, vx: 0, vy: 0, life: 0.22, max: 0.22, size: 32 + n * 6, color: "#e879f9", kind: "nova" });
    s.particles.push({ x, y, vx: 0, vy: 0, life: 0.08, max: 0.08, size: 12 + n * 2, color: "#fff", kind: "flare" });
  }
  if (s.arcs.length > 48) s.arcs.splice(0, s.arcs.length - 48);
}

function novaOn(s, e) {
  if (!has(s, "nova") || e.novaLock > 0) return;
  e.novaLock = novaCd(s);
  sparkNova(s, e.x, e.y, e.id, 0);
}

function hopNova(s, arc, x, y) {
  const n = stacks(s, "nova");
  burst(s, x, y, "#f0abfc", 8 + n, 200);
  if (s.particles.length < 140) {
    s.particles.push({ x, y, vx: 0, vy: 0, life: 0.16, max: 0.16, size: 26 + n * 5, color: "#d8b4fe", kind: "nova" });
  }
  if (arc.hop + 1 < n) sparkNova(s, x, y, arc.tid, arc.hop + 1);
}

function tickArcs(s, dt) {
  for (const a of s.arcs) {
    if (a.wait > 0) { a.wait -= dt; continue; }
    a.t += dt;
    if (a.t < a.max) continue;
    a.t = 99;
    if (a.tid === -1) {
      if (!s.boss) continue;
      s.boss.hp -= Math.max(2, Math.round(a.dmg * 0.7));
      s.boss.flash = 0.55;
      hopNova(s, a, s.boss.x, s.boss.y);
      if (s.boss.hp <= 0) killBoss(s);
      continue;
    }
    const e = s.enemies.find((x) => x.id === a.tid);
    if (!e) continue;
    const alive = e.hp > 0;
    if (alive) {
      e.hp -= a.dmg;
      e.flash = 1;
      e.novaLock = Math.max(e.novaLock, 0.18);
    }
    hopNova(s, a, e.x, e.y);
    if (alive && e.hp <= 0) killEnemy(s, e);
  }
  s.arcs = s.arcs.filter((a) => a.t < a.max);
}

function pickupPower(s, kind) {
  const p = POWERS[kind];
  s.buffs[kind] = Math.min(5, s.buffs[kind] + 1);
  const n = s.buffs[kind];
  s.note = { name: p.name, use: n === 1 ? "until you lose a life" : `×${n} stronger`, t: 2.4 };
  s.shake = Math.max(s.shake, kind === "nova" ? 14 + n : 9 + n);
  const pl = s.player;
  s.particles.push({ x: pl.x, y: pl.y, vx: 0, vy: 0, life: 0.7, max: 0.7, size: 180 + n * 50, color: p.color, kind: "nova" });
  s.particles.push({ x: pl.x, y: pl.y, vx: 0, vy: 0, life: 0.18, max: 0.18, size: 40 + n * 8, color: "#fff", kind: "flare" });
  ring(s, pl.x, pl.y, p.color);
  burst(s, pl.x, pl.y, p.color, 10 + n * 2, 340);
  if (kind === "nova") {
    const r = 220 + n * 48;
    const dmg = 14 + n * 6;
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      if ((e.x - pl.x) ** 2 + (e.y - pl.y) ** 2 > (r + e.r) ** 2) continue;
      e.hp -= dmg;
      e.flash = 1;
      if (e.hp <= 0) killEnemy(s, e);
    }
    if (s.boss && (s.boss.x - pl.x) ** 2 + (s.boss.y - pl.y) ** 2 < (r + s.boss.r) ** 2) {
      s.boss.hp -= Math.max(2, Math.round(dmg * 0.7));
      s.boss.flash = 0.45;
      if (s.boss.hp <= 0) killBoss(s);
    }
  }
}

function killEnemy(s, e) {
  s.kills += 1;
  if (e.split) s.marks += 1;
  s.combo += 1;
  const nw = weaponFromMarks(s.marks);
  if (nw > s.weapon) {
    s.weapon = nw;
    const w = WEAPONS[nw - 1];
    s.unlock = { name: w.name, use: w.use, t: 2.8 };
    s.invuln = 2.6;
    s.shake = 4;
  }
  burst(s, e.x, e.y, "#ffffff", 7, 220);
  ring(s, e.x, e.y, "rgba(255,255,255,0.7)");
  s.shake = Math.min(8, s.shake + 2.4);
  s.hitstop = 0.016;

  const drop = (kind, worth, color) => {
    s.orbs.push({
      x: e.x + (Math.random() - 0.5) * 16,
      y: e.y + (Math.random() - 0.5) * 16,
      vx: (Math.random() - 0.5) * 50,
      vy: (Math.random() - 0.5) * 50,
      t: 0, worth, color, kind,
    });
  };
  drop("score", 20, KIND_COLOR[e.kind]);
  if (e.split && Math.random() < 0.1) drop("heart", 0, "#ff4d6d");
  if (e.split && Math.random() < 0.03) drop("boost", 0, "#f5d76e");
  if (e.split && Math.random() < 0.025) drop("cloak", 0, "#ff8a3d");
  if (e.split && Math.random() < 0.2) {
    const kinds = ["rapid", "nova", "titan"];
    const k = kinds[Math.floor(Math.random() * kinds.length)];
    drop(k, 0, POWERS[k].color);
  }
  if (s.combo > 0 && s.combo % 22 === 0) {
    drop("boost", 0, "#f5d76e");
    ring(s, e.x, e.y, "#f5d76e");
  }
  if (e.split && e.kind !== "star") {
    const child = e.kind === "meteor" ? "rock" : e.kind;
    const r = Math.max(14, e.r * 0.62);
    const hp = Math.max(1, Math.ceil(e.max * 0.45));
    const n = s.compact ? 1 : 2;
    for (let i = 0; i < n; i++) {
      spawnEnemy(s, child, { x: e.x + (i ? 12 : -12), y: e.y + (i ? -10 : 10) }, {
        r, hp, split: false,
        vx: e.vx + (i ? 80 : -80),
        vy: e.vy + (i ? -55 : 55),
      });
    }
  }
}

function hurt(s) {
  if (s.player.iFrames > 0 || s.invuln > 0 || (s.cloakT || 0) > 0) return;
  s.player.hp -= 1;
  s.player.iFrames = 1.05;
  s.combo = 0;
  if (s.phase !== "boss") {
    s.buffs.rapid = 0;
    s.buffs.nova = 0;
    s.buffs.titan = 0;
    s.arcs = [];
  }
  s.shake = 28;
  s.hitstop = 0.09;
  burst(s, s.player.x, s.player.y, "#ff4d4d", 16, 260);
  if (s.player.hp <= 0) {
    s.phase = "dead";
    burst(s, s.player.x, s.player.y, "#ffffff", 28, 320);
  }
}

export function tentacle(boss, i, t) {
  const base = boss.angle + (i / 8) * Math.PI * 2;
  const ir = boss.r * 0.36;
  const pts = [{ x: boss.x + Math.cos(base) * ir, y: boss.y + Math.sin(base) * ir }];
  let x = pts[0].x;
  let y = pts[0].y;
  let a = base + Math.sin(t * 0.55 + i * 0.9) * 0.1;
  const step = boss.r * (0.2 + (i % 2) * 0.035) + 9;
  for (let k = 1; k <= 10; k++) {
    const u = k / 10;
    a += Math.sin(t * 1.45 + i * 1.12 + u * 3.2) * (0.16 + u * 0.2);
    a += Math.sin(t * 0.62 + i * 0.55) * 0.05;
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    pts.push({ x, y });
  }
  return { pts, tip: pts[pts.length - 1], a, base };
}

function spawnBoss(s) {
  s.phase = "boss";
  s.waveName = "The Impactor";
  s.waveBanner = 2.2;
  s.enemies = [];
  s.foes = [];
  s.boss = {
    x: s.w / 2, y: s.h * 0.28, vx: 80, vy: 10,
    r: 70, hp: 860, max: 860, t: 0, phase: 1, next: 0.7,
    flash: 0, angle: 0, novaLock: 0,
    laserCd: 2.1, laserT: 0, laserA: Math.PI / 2,
    laserT2: 0, laserA2: Math.PI / 2,
    dropLock: 0, loot: 0,
  };
  ring(s, s.boss.x, s.boss.y, "#39ff8a");
}

function bossDrop(s, x, y) {
  const b = s.boss;
  if (!b || b.dropLock > 0) return;
  b.dropLock = 0.82;
  const kinds = ["rapid", "nova", "titan"];
  const k = kinds[b.loot % 3];
  b.loot += 1;
  const a = Math.atan2(y - b.y, x - b.x || 1) + (Math.random() - 0.5) * 0.9;
  const spd = 150 + Math.random() * 90;
  s.orbs.push({
    x: b.x + Math.cos(a) * (b.r * 0.35),
    y: b.y + Math.sin(a) * (b.r * 0.35),
    vx: Math.cos(a) * spd,
    vy: Math.sin(a) * spd,
    t: 0, worth: 0, color: POWERS[k].color, kind: k,
  });
}

function killBoss(s) {
  const b = s.boss;
  if (!b) return;
  s.phase = "win";
  addScore(s, b.x, b.y, 2500);
  burst(s, b.x, b.y, "#39ff8a", 36, 340);
  burst(s, b.x, b.y, "#ffffff", 18, 260);
  s.shake = 8;
  s.boss = null;
  s.foes = [];
}

function shootFoe(s, x, y, a, opt = {}) {
  const spd = opt.spd ?? 220;
  s.foes.push({
    x, y,
    vx: Math.cos(a) * spd,
    vy: Math.sin(a) * spd,
    r: opt.r ?? 6.4,
    life: opt.life ?? 4.2,
    kind: opt.kind ?? "plasma",
    spin: opt.spin ?? a,
  });
}

function bossVolley(s, b) {
  const a = aim(b.x, b.y, s.player.x, s.player.y);
  if (b.phase === 3 && Math.random() < 0.5) {
    for (let i = 0; i < 8; i++) {
      const ang = a + (i / 8) * Math.PI * 2;
      shootFoe(s, b.x + Math.cos(ang) * (b.r + 8), b.y + Math.sin(ang) * (b.r + 8), ang, {
        spd: 240, kind: "shard", r: 5.4, life: 3.6,
      });
    }
    return;
  }
  const n = b.phase === 1 ? 1 : b.phase === 2 ? 3 : 5;
  const spread = b.phase === 1 ? 0 : b.phase === 2 ? 0.26 : 0.2;
  const spd = 210 + b.phase * 55;
  for (let i = 0; i < n; i++) {
    const ang = a + (i - (n - 1) / 2) * spread;
    const off = b.phase >= 2 && i !== Math.floor(n / 2);
    shootFoe(s, b.x + Math.cos(ang) * (b.r + 8), b.y + Math.sin(ang) * (b.r + 8), ang, {
      spd: off ? spd + 40 : spd,
      kind: off ? "shard" : "plasma",
      r: off ? 5.4 : 7.2,
    });
  }
}

function laserHitsPlayer(px, py, ox, oy, a, r) {
  const cx = Math.cos(a);
  const sy = Math.sin(a);
  const dx = px - ox;
  const dy = py - oy;
  const along = dx * cx + dy * sy;
  if (along < 0) return false;
  const ox2 = dx - along * cx;
  const oy2 = dy - along * sy;
  return ox2 * ox2 + oy2 * oy2 < r * r;
}

function tickBoss(s, dt) {
  const b = s.boss;
  if (!b) return;
  b.t += dt;
  b.angle += dt * (0.35 + b.phase * 0.12);
  b.flash = Math.max(0, b.flash - dt * 4);
  b.novaLock = Math.max(0, b.novaLock - dt);
  b.dropLock = Math.max(0, b.dropLock - dt);
  b.next -= dt;

  const tx = s.w * 0.5 + Math.sin(b.t * 0.62) * s.w * 0.34;
  const ty = s.h * 0.3 + Math.cos(b.t * 0.46) * s.h * 0.2;
  const chase = 1.55 + b.phase * 0.35;
  b.vx += (tx - b.x) * dt * chase;
  b.vy += (ty - b.y) * dt * chase;
  if (b.phase === 3) {
    b.vx += (s.player.x - b.x) * dt * 0.22;
    b.vy += (s.player.y - b.y) * dt * 0.22;
  }
  const cap = 120 + b.phase * 30;
  const sp = Math.hypot(b.vx, b.vy) || 1;
  if (sp > cap) { b.vx = (b.vx / sp) * cap; b.vy = (b.vy / sp) * cap; }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  const m = b.r + 10;
  b.x = Math.max(m, Math.min(s.w - m, b.x));
  b.y = Math.max(m, Math.min(s.h - m, b.y));

  const frac = b.hp / b.max;
  if (frac < 0.66 && b.phase === 1) b.phase = 2;
  if (frac < 0.33 && b.phase === 2) b.phase = 3;

  if (b.next <= 0) {
    bossVolley(s, b);
    if (b.phase >= 2) s.shocks.push({ x: b.x, y: b.y, r: 18, vr: b.phase === 3 ? 90 : 70, life: 1.8, ink: true });
    b.next = b.phase === 1 ? 0.92 : b.phase === 2 ? 0.7 : 0.5;
  }

  b.laserCd -= dt;
  const tickLaser = (angKey, tKey, offset) => {
    if (b[tKey] <= 0) return;
    b[tKey] -= dt;
    if (b[tKey] > 0.52) {
      const want = aim(b.x, b.y, s.player.x, s.player.y) + offset;
      const d = Math.atan2(Math.sin(want - b[angKey]), Math.cos(want - b[angKey]));
      b[angKey] += d * dt * 2.4;
    } else if (b[tKey] > 0 && laserHitsPlayer(s.player.x, s.player.y, b.x, b.y, b[angKey], 11)) {
      hurt(s);
    }
  };
  tickLaser("laserA", "laserT", 0);
  if (b.phase >= 2) tickLaser("laserA2", "laserT2", b.phase === 3 ? 0.7 : 0.48);
  if (b.laserT <= 0 && b.laserCd <= 0) {
    const a = aim(b.x, b.y, s.player.x, s.player.y);
    b.laserA = a;
    b.laserT = 1.28;
    if (b.phase >= 2) {
      b.laserA2 = a + (b.phase === 3 ? 0.7 : 0.48);
      b.laserT2 = 1.28;
    }
    b.laserCd = b.phase === 1 ? 3.2 : b.phase === 2 ? 2.2 : 1.55;
  }

  for (let i = 0; i < 8; i++) {
    const tip = tentacle(b, i, b.t).tip;
    const dx = s.player.x - tip.x;
    const dy = s.player.y - tip.y;
    if (dx * dx + dy * dy < 484) hurt(s);
  }

  for (const bl of s.bullets) {
    const dx = bl.x - b.x;
    const dy = bl.y - b.y;
    if (dx * dx + dy * dy >= (b.r + bl.r) ** 2) continue;
    b.hp -= bl.dmg;
    b.flash = 0.45;
    bl.life = 0;
    addScore(s, bl.x, bl.y, 10);
    burst(s, bl.x, bl.y, "#8affc0", 5, 120);
    bossDrop(s, bl.x, bl.y);
    if (has(s, "nova") && b.novaLock <= 0) {
      b.novaLock = novaCd(s);
      sparkNova(s, b.x, b.y, -1, 0);
    }
    if (b.hp <= 0) { killBoss(s); return; }
  }

  const dx = s.player.x - b.x;
  const dy = s.player.y - b.y;
  if (dx * dx + dy * dy < (b.r + 17) ** 2) hurt(s);
}

function tickEnemies(s, dt) {
  const p = s.player;
  for (const e of s.enemies) {
    e.t += dt;
    e.spin += (e.spinV || 1) * dt;
    e.flash = Math.max(0, e.flash - dt * 8);
    e.novaLock = Math.max(0, e.novaLock - dt);
    e.aim = aim(e.x, e.y, p.x, p.y);
    e.next -= dt;
    const dist = Math.hypot(p.x - e.x, p.y - e.y) || 1;

    if (e.kind === "meteor") {
      if (e.next <= 0) {
        e.flash = 1;
        e.vx = Math.cos(e.aim) * 380;
        e.vy = Math.sin(e.aim) * 380;
        e.next = 1.2 + Math.random() * 0.5;
      } else {
        e.vx *= 0.988;
        e.vy *= 0.988;
      }
    } else if (e.kind === "star") {
      const wob = Math.sin(e.t * 14) * 320;
      e.vx += (Math.cos(e.aim) * 90 + Math.cos(e.aim + Math.PI / 2) * wob) * dt;
      e.vy += (Math.sin(e.aim) * 90 + Math.sin(e.aim + Math.PI / 2) * wob) * dt;
    }

    const cap = STATS[e.kind].spd + (e.kind === "meteor" && e.flash > 0.4 ? 240 : 40);
    const sp = Math.hypot(e.vx, e.vy) || 1;
    if (sp > cap) { e.vx = (e.vx / sp) * cap; e.vy = (e.vy / sp) * cap; }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    wrap(s, e);
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    if (dx * dx + dy * dy < (e.r + 16) ** 2) hurt(s);
  }
}

function tickBullets(s, dt) {
  for (const b of s.bullets) {
    if (b.homing) {
      b.lock -= dt;
      if (b.lock <= 0) {
        b.lock = 0.12;
        let best = 1e9;
        let found = false;
        for (const e of s.enemies) {
          if (e.hp <= 0) continue;
          const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2;
          if (d < best) { best = d; b.tx = e.x; b.ty = e.y; found = true; }
        }
        if (s.boss && (s.boss.x - b.x) ** 2 + (s.boss.y - b.y) ** 2 < best) {
          b.tx = s.boss.x;
          b.ty = s.boss.y;
          found = true;
        }
        if (!found) { b.tx = b.x + b.vx; b.ty = b.y + b.vy; }
      }
      const a = aim(b.x, b.y, b.tx, b.ty);
      b.vx += Math.cos(a) * 780 * dt;
      b.vy += Math.sin(a) * 780 * dt;
      const sp = Math.hypot(b.vx, b.vy) || 1;
      b.vx = (b.vx / sp) * 440;
      b.vy = (b.vy / sp) * 440;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  }

  for (const b of s.bullets) {
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      const r = b.r + e.r;
      const dx = b.x - e.x;
      const dy = b.y - e.y;
      if (dx * dx + dy * dy >= r * r) continue;
      e.hp -= b.dmg;
      e.flash = 1;
      addScore(s, e.x, e.y, 10);
      b.pierce -= 1;
      if (b.pierce < 0) b.life = 0;
      burst(s, b.x, b.y, "#fff", 2, 80);
      novaOn(s, e);
      if (e.hp <= 0) killEnemy(s, e);
    }
  }

  for (const sh of s.shocks) {
    sh.r += sh.vr * dt;
    sh.life -= dt;
    const d = Math.hypot(s.player.x - sh.x, s.player.y - sh.y);
    if (Math.abs(d - sh.r) < 14) hurt(s);
  }
  s.shocks = s.shocks.filter((x) => x.life > 0);
  s.bullets = s.bullets.filter((b) => b.life > 0 && b.x > -80 && b.x < s.w + 80 && b.y > -80 && b.y < s.h + 80);
  s.enemies = s.enemies.filter((e) => e.hp > 0);
}

function tickFoes(s, dt) {
  for (const f of s.foes) {
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.life -= dt;
    f.spin += dt * (f.kind === "shard" ? 8 : 4);
    const dx = s.player.x - f.x;
    const dy = s.player.y - f.y;
    if (dx * dx + dy * dy < (f.r + 16) ** 2) {
      hurt(s);
      f.life = 0;
    }
  }
  s.foes = s.foes.filter((f) => f.life > 0 && f.x > -50 && f.x < s.w + 50 && f.y > -50 && f.y < s.h + 50);
}

function tickFlight(s, raw, input) {
  const p = s.player;
  p.iFrames = Math.max(0, p.iFrames - raw);
  p.dashCd = Math.max(0, p.dashCd - raw);
  p.galCd = Math.max(0, (p.galCd || 0) - raw);
  p.galT = Math.max(0, (p.galT || 0) - raw);
  p.fireCd = Math.max(0, p.fireCd - raw);
  p.muzzle = Math.max(0, p.muzzle - raw);

  const tilt = input.tilt;
  const mag = tilt ? Math.hypot(tilt.x, tilt.y) : 0;
  if (tilt && mag > 0.05) {
    const tx = tilt.x / mag;
    const ty = tilt.y / mag;
    let da = Math.atan2(ty, tx) - p.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    p.angle += da * Math.min(1, 12 * raw);
    const c = Math.min(1, mag);
    p.vx += tx * 680 * c * raw;
    p.vy += ty * 680 * c * raw;
    p.thrusting = c > 0.14;
  } else {
    p.angle += input.rotate * 3.9 * raw;
    p.thrusting = input.thrust || p.galT > 0;
    if (input.thrust) {
      p.vx += Math.cos(p.angle) * 540 * raw;
      p.vy += Math.sin(p.angle) * 540 * raw;
    }
  }

  if (input.galactic && p.galCd <= 0) {
    p.galCd = 1.25;
    p.galT = 0.4;
    const pow = 1040;
    p.vx = Math.cos(p.angle) * pow;
    p.vy = Math.sin(p.angle) * pow;
    p.iFrames = Math.max(p.iFrames, 0.45);
    p.thrusting = true;
    burst(s, p.x, p.y, "#9ecbff", 14, 320);
    burst(s, p.x, p.y, "#fff", 8, 220);
    ring(s, p.x, p.y, "rgba(160, 220, 255, 0.55)");
    s.shake = Math.max(s.shake, 7);
    s._sfx = "galactic";
    for (let i = 0; i < 10; i++) {
      const back = 16 + i * 10;
      s.particles.push({
        x: p.x - Math.cos(p.angle) * back,
        y: p.y - Math.sin(p.angle) * back,
        vx: -Math.cos(p.angle) * (220 + i * 18) + (Math.random() - 0.5) * 40,
        vy: -Math.sin(p.angle) * (220 + i * 18) + (Math.random() - 0.5) * 40,
        life: 0.22 + i * 0.02, max: 0.36, size: 5 + Math.random() * 5,
        color: i % 2 ? "#7ec8ff" : "#fff",
        kind: "streak",
      });
    }
  }

  if ((s.cloakT || 0) > 0 && s.particles.length < 120) {
    s.particles.push({
      x: p.x - Math.cos(p.angle) * (10 + Math.random() * 18),
      y: p.y - Math.sin(p.angle) * (10 + Math.random() * 18),
      vx: -Math.cos(p.angle) * (80 + Math.random() * 120) + (Math.random() - 0.5) * 60,
      vy: -Math.sin(p.angle) * (80 + Math.random() * 120) + (Math.random() - 0.5) * 60,
      life: 0.22 + Math.random() * 0.18, max: 0.4,
      size: 3 + Math.random() * 5,
      color: Math.random() > 0.45 ? "#ff8a3d" : "#fff4c4",
      kind: "streak",
    });
  }

  if ((p.thrusting || p.galT > 0) && s.particles.length < 90) {
    s.particles.push({
      x: p.x - Math.cos(p.angle) * 22,
      y: p.y - Math.sin(p.angle) * 22,
      vx: -Math.cos(p.angle) * (p.galT > 0 ? 220 : 80) + (Math.random() - 0.5) * 40,
      vy: -Math.sin(p.angle) * (p.galT > 0 ? 220 : 80) + (Math.random() - 0.5) * 40,
      life: p.galT > 0 ? 0.22 : 0.16,
      max: p.galT > 0 ? 0.22 : 0.16,
      size: 3 + Math.random() * (p.galT > 0 ? 6 : 3),
      color: p.galT > 0 ? (Math.random() > 0.5 ? "#9ecbff" : "#fff") : (Math.random() > 0.5 ? "#fff" : "#ffb347"),
      kind: p.galT > 0 ? "streak" : "flame",
    });
  }

  p.vx *= 0.72 ** raw;
  p.vy *= 0.72 ** raw;
  const cap = p.galT > 0 ? 1120 : 460;
  const spd = Math.hypot(p.vx, p.vy);
  if (spd > cap) { p.vx = (p.vx / spd) * cap; p.vy = (p.vy / spd) * cap; }

  if (input.hyper && p.dashCd <= 0) {
    p.dashCd = 1.6;
    burst(s, p.x, p.y, "#fff", 12, 240);
    ring(s, p.x, p.y, "rgba(255,255,255,0.45)");
    const spot = safeSpot(s);
    p.x = spot.x;
    p.y = spot.y;
    p.vx *= 0.15;
    p.vy *= 0.15;
    p.iFrames = 0.8;
    burst(s, p.x, p.y, "#9ecbff", 10, 200);
    ring(s, p.x, p.y, "rgba(158,203,255,0.5)");
    s.shake = Math.max(s.shake, 3);
  }

  p.x += p.vx * raw;
  p.y += p.vy * raw;
  wrap(s, p);

  if (s.weapon !== 3) { p.charging = false; p.charge = 0; }
  const locked = !!(s.unlock && s.unlock.t > 1.4);
  if (s.weapon === 3) {
    const spec = railSpec();
    if (!input.fire || locked) {
      p.charging = false;
      p.charge = 0;
    } else if (p.charging) {
      p.charge += raw;
      const need = spec.charge * (s.overdrive > 0 ? 0.6 : 1) * (stacks(s, "rapid") > 0 ? Math.max(0.18, 0.42 * 0.7 ** (stacks(s, "rapid") - 1)) : 1);
      if (p.charge >= need) {
        fireRail(s);
        p.charging = false;
        p.charge = 0;
        p.fireCd = fireCd(s);
      }
    } else if (p.fireCd <= 0) {
      p.charging = true;
      p.charge = 0;
    }
  } else if (input.fire && p.fireCd <= 0 && !locked) {
    fireWeapon(s);
    p.fireCd = fireCd(s);
  }
}

function tickLoose(s, raw) {
  for (const b of s.bullets) {
    b.x += b.vx * raw;
    b.y += b.vy * raw;
    b.life -= raw;
  }
  s.bullets = s.bullets.filter((b) => b.life > 0 && b.x > -80 && b.x < s.w + 80 && b.y > -80 && b.y < s.h + 80);
  for (const pt of s.particles) {
    pt.x += pt.vx * raw;
    pt.y += pt.vy * raw;
    pt.vx *= 0.92;
    pt.vy *= 0.92;
    pt.life -= raw;
  }
  s.particles = s.particles.filter((x) => x.life > 0);
  for (const beam of s.beams) beam.life -= raw;
  s.beams = s.beams.filter((b) => b.life > 0);
}

export function step(s, dt, input) {
  const raw = Math.min(0.033, dt);
  if (s.phase === "intro") {
    s.t += raw;
    s.intro = (s.intro || 0) + raw;
    s.shake = Math.max(0, s.shake - raw * 18);
    if (s.intro > 2.15 && s.intro < 2.55) s.shake = Math.max(s.shake, 12);
    if (s.intro > 7.8 || input.skip) finishIntro(s);
    tickLoose(s, raw);
    return;
  }
  if (s.phase === "title") {
    s.t += raw;
    s.shake = Math.max(0, s.shake - raw * 28);
    tickFlight(s, raw, input);
    tickLoose(s, raw);
    return;
  }
  if (s.paused) return;
  if (s.hitstop > 0) { s.hitstop -= raw; return; }
  const slow = raw * (s.unlock && s.unlock.t > 0.4 ? 0.22 : 1);
  s.t += raw;
  s.shake = Math.max(0, s.shake - raw * 28);
  s.waveBanner = Math.max(0, s.waveBanner - raw);
  s.invuln = Math.max(0, s.invuln - raw);
  s.boostT = Math.max(0, s.boostT - raw);
  if (s.boostT <= 0) s.boostMul = 1;
  s.cloakT = Math.max(0, (s.cloakT || 0) - raw);
  s.overdrive = Math.max(0, s.overdrive - raw);
  if (s.unlock) { s.unlock.t -= raw; if (s.unlock.t <= 0) s.unlock = null; }
  if (s.note) { s.note.t -= raw; if (s.note.t <= 0) s.note = null; }

  if (s.phase === "dead" || s.phase === "win") {
    if (s.pips.length) {
      for (const pip of s.pips) s.shown += pip.n;
      s.pips = [];
    }
    for (const pt of s.particles) {
      pt.x += pt.vx * raw;
      pt.y += pt.vy * raw;
      pt.life -= raw;
    }
    s.particles = s.particles.filter((x) => x.life > 0);
    return;
  }

  tickFlight(s, raw, input);

  if (s.phase === "play") {
    s.spawnT -= slow;
    const room = !s.compact || s.enemies.length < 7;
    if (s.spawnQ.length && s.spawnT <= 0 && room) {
      spawnEnemy(s, s.spawnQ.shift());
      const gap = (s.wave === 0 ? 0.32 : 0.52) + Math.random() * 0.16;
      s.spawnT = s.compact ? gap * 1.45 : gap;
    }
    if (!s.spawnQ.length && !s.enemies.length) {
      if (s.wave + 1 < WAVES.length) startWave(s, s.wave + 1);
      else spawnBoss(s);
    }
  }

  tickEnemies(s, slow);
  tickBullets(s, slow);
  tickFoes(s, slow);

  for (const b of s.beams) {
    b.life -= slow;
    if (has(s, "titan") && b.life > 0 && b.life < b.max - 0.04) {
      railHits(s, b.x, b.y, b.a, b.w * 0.75, Math.max(2, b.dmg * 0.16), false);
    }
  }
  s.beams = s.beams.filter((b) => b.life > 0);

  for (const pip of s.pips) {
    pip.t += raw;
    const u = Math.min(1, pip.t / pip.life);
    const hold = 0.42;
    const a = 1 - (1 - (u < hold ? 0 : (u - hold) / (1 - hold))) ** 2;
    pip.x = pip.sx + (56 - pip.sx) * a * 0.92;
    pip.y = pip.sy + (92 - pip.sy) * a * 0.92;
    if (u >= 1) s.shown += pip.n;
  }
  s.pips = s.pips.filter((p) => p.t < p.life);

  if (s.phase === "boss") tickBoss(s, slow);
  tickArcs(s, slow);

  for (const o of s.orbs) {
    o.t += raw;
    const dx = s.player.x - o.x;
    const dy = s.player.y - o.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 220) {
      const pull = o.kind === "score" ? 720 : 920;
      o.vx += (dx / d) * pull * raw;
      o.vy += (dy / d) * pull * raw;
    }
    o.x += o.vx * raw;
    o.y += o.vy * raw;
    o.vx *= 0.94;
    o.vy *= 0.94;
    if (d < (o.kind === "score" ? 26 : 42)) {
      o.t = 99;
      if (o.kind === "heart") {
        if (s.player.hp < 6) {
          s.player.hp += 1;
          if (s.player.hp > s.player.maxHp) s.player.maxHp = s.player.hp;
        }
        addScore(s, o.x, o.y, 30);
        s.particles.push({ x: o.x, y: o.y, vx: 0, vy: -28, life: 0.55, max: 0.55, size: 34, color: "#ff4d6d", kind: "heart" });
        s._sfx = "oneUp";
      } else if (o.kind === "boost") {
        s.boostMul = Math.min(16, Math.max(2, s.boostMul * 2));
        s.boostT = Math.max(s.boostT, 10);
        s.overdrive = Math.max(s.overdrive, 8);
        s.note = { name: `${s.boostMul}x`, use: "points", t: 2.2 };
        addScore(s, o.x, o.y, 40);
        ring(s, o.x, o.y, "#f5d76e");
        burst(s, o.x, o.y, "#f5d76e", 8, 240);
        s._sfx = "zap";
        for (const e of s.enemies) {
          if (Math.hypot(e.x - o.x, e.y - o.y) > 200) continue;
          e.hp -= 3;
          e.flash = 1;
          burst(s, e.x, e.y, "#f5d76e", 5, 140);
          if (e.hp <= 0) killEnemy(s, e);
        }
        if (s.boss && Math.hypot(s.boss.x - o.x, s.boss.y - o.y) < 240) {
          s.boss.hp -= 18;
          s.boss.flash = 0.45;
          if (s.boss.hp <= 0) killBoss(s);
        }
      } else if (o.kind === "cloak") {
        s.cloakT = 15;
        s.invuln = Math.max(s.invuln, 15);
        s.note = { name: "Reentry", use: "ghost burn · 15s", t: 2.4 };
        addScore(s, o.x, o.y, 80);
        burst(s, o.x, o.y, "#ff8a3d", 14, 280);
        ring(s, o.x, o.y, "#ffb347");
        s._sfx = "zap";
      } else if (o.kind === "rapid" || o.kind === "nova" || o.kind === "titan") {
        pickupPower(s, o.kind);
        addScore(s, o.x, o.y, 50);
        s._sfx = o.kind === "nova" ? "nova" : o.kind === "titan" ? "titan" : "power";
      } else {
        addScore(s, o.x, o.y, o.worth || 20);
        s._sfx = "collect";
      }
    }
  }
  s.orbs = s.orbs.filter((o) => o.t < 8);

  for (const pt of s.particles) {
    pt.x += pt.vx * raw;
    pt.y += pt.vy * raw;
    pt.vx *= 0.92;
    pt.vy *= 0.92;
    pt.life -= raw;
  }
  s.particles = s.particles.filter((x) => x.life > 0);
}
