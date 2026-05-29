/* ═══════════════════════════════════════════════════
   SINGLE-NEURON 3D ACTION POTENTIAL ANIMATION  (ARCHIVED)
   ═══════════════════════════════════════════════════
   This is the interactive 3D neuron animation that used to live in the
   hero of index.html. It was removed from the live page during the
   black/green retro redesign, and preserved here so it can be reused.

   HOW TO REUSE:
     1. Add a canvas element wherever you want it, e.g.
          <canvas id="neural-canvas"></canvas>
        The canvas sizes itself to its parent element's clientWidth/Height,
        so give the parent an explicit size.
     2. Include this script after that element:
          <script src="/static/neuron-canvas-animation.js"></script>

   Full 3D perspective rendering on a 2D canvas:
     - All geometry in world-space 3D coords
     - Slow Y-axis rotation (~28s period) shows depth
     - Perspective projection with depth-based opacity
     - Depth-sorted draw order (back -> front)
     - Dendrites spread in 3D (varying Z depths)
     - Myelinated axon with Z curvature
     - Terminal branches spread in 3D space
     - Click-and-drag to rotate

   AP cycle (~5.4s):
     [idle 2s] -> [soma flash + axon AP 2.5s]
               -> [NT release 1.1s] -> repeat
═══════════════════════════════════════════════════ */
(function () {
  'use strict';

  const canvas = document.getElementById('neural-canvas');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');

  // ── 3D geometry (world-space coords) ───────────
  let soma3        = { x: 0, y: 0, z: 0, r: 20 };
  let dendSegs     = [];  // [{x1,y1,z1, x2,y2,z2, w}]
  let axonPts      = [];  // [{x,y,z}]
  let myelinRanges = [];  // [{t1,t2}]
  let termBranches = [];  // [{from:{x,y,z}, to:{x,y,z}}]
  let terminals    = [];  // [{x,y,z}]
  let nts          = [];  // [{x,y,z, vx,vy,vz, alpha, r0}]

  // ── AP state ────────────────────────────────────
  let phase = 'idle', phaseStart = 0;
  const DUR = { idle: 1900, axon: 2500, release: 1100 };

  // ── Projection constants ─────────────────────────
  const ROT_SPEED = (Math.PI * 2) / 28000; // ~28s full rotation
  const BASE_TILT = -0.20;                  // original subtle 3D tilt
  const FIXED_ROT_Y = 0;                       // soma left, terminal right
  const FOV       = 800;
  let   worldScale = 1;     // set by fitNeuron() after build()
  let   curTiltX   = BASE_TILT; // updated each frame during drag
  let   projCenterX = 0.5;  // 0..1 horizontal anchor for projection

  let isDragging    = false;
  let dragLast      = { x: 0, y: 0 };
  let manualRotY    = 0;
  let manualRotX    = 0;
  let autoRotOffset = 0;
  let lastInteract  = -999999;
  const RESUME_DELAY = 2000;

  // ── Seeded RNG ──────────────────────────────────
  function makeRng(seed) {
    let s = seed >>> 0;
    return () => { s = Math.imul(s, 1664525) + 1013904223 >>> 0; return s / 0x100000000; };
  }

  // ── 3D → 2D perspective projection ─────────────
  // worldScale is applied here so fitNeuron() can adjust size without
  // touching geometry arrays.
  function proj(wx, wy, wz, rotY) {
    wx *= worldScale; wy *= worldScale; wz *= worldScale;

    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const rx  =  wx * cosY + wz * sinY;
    const ry  =  wy;
    const rz  = -wx * sinY + wz * cosY;

    const cosX = Math.cos(curTiltX), sinX = Math.sin(curTiltX);
    const ry2  = ry * cosX - rz * sinX;
    const rz2  = ry * sinX + rz * cosX;

    const s = FOV / (FOV + rz2);
    return {
      sx: canvas.width  * projCenterX + rx  * s,
      sy: canvas.height * 0.5 + ry2 * s,
      s, rz2,
    };
  }

  function depthFade(rz2) { return Math.max(0.15, 1.0 - rz2 * 0.0015); }

  // ── Build 3D neuron geometry ─────────────────────
  function build() {
    const W = Math.max(canvas.width, 720);
    const H = Math.max(canvas.height, 520);

    soma3 = {
      x: -W * 0.20, y: 0, z: 0,
      r: Math.max(16, Math.min(24, H * 0.028)),
    };

    dendSegs = []; axonPts = []; myelinRanges = [];
    termBranches = []; terminals = []; nts = [];

    const rng = makeRng(42);

    function growD(x, y, z, angle, len, depth) {
      if (depth <= 0 || len < 9) return;
      const wobble = (rng() - 0.5) * 0.52;
      const a  = angle + wobble;
      const dz = (rng() - 0.5) * len * 0.55;
      const ex = x + Math.cos(a) * len;
      const ey = y + Math.sin(a) * len;
      const ez = z + dz;
      const w  = Math.max(0.5, depth * 0.82);
      dendSegs.push({ x1:x, y1:y, z1:z, x2:ex, y2:ey, z2:ez, w });
      const nb  = depth >= 3 ? 2 : (rng() > 0.4 ? 2 : 1);
      const spr = 0.28 + rng() * 0.20;
      const sc  = 0.52 + rng() * 0.24;
      if (nb === 1) {
        growD(ex, ey, ez, a, len * sc, depth - 1);
      } else {
        growD(ex, ey, ez, a - spr, len * sc,           depth - 1);
        growD(ex, ey, ez, a + spr, len * (sc - 0.05),  depth - 1);
      }
    }

    const dLen = H * 0.082;
    [
      -Math.PI * 0.96, -Math.PI * 0.85, -Math.PI * 0.73,
      -Math.PI * 0.60, -Math.PI * 0.50,  Math.PI,
       Math.PI * 0.95,  Math.PI * 0.83,  Math.PI * 0.70,
       Math.PI * 0.58,
    ].forEach(a => growD(soma3.x, soma3.y, soma3.z, a, dLen, 3));

    const axLen = W * 0.52, axAngle = 0.10, nPts = 12;
    for (let i = 0; i <= nPts; i++) {
      const t   = i / nPts;
      const bow  = Math.sin(t * Math.PI) * (H * 0.022);
      const bowZ = Math.sin(t * Math.PI * 0.7) * (H * 0.015);
      axonPts.push({
        x: soma3.x + soma3.r + t * axLen * Math.cos(axAngle),
        y: soma3.y + t * axLen * Math.sin(axAngle) + bow,
        z: soma3.z + bowZ,
      });
    }

    const nMyelin = 6, nodeGap = 0.022, hillockT = 0.08, termGapT = 0.05;
    const mLen = 1 - hillockT - termGapT;
    for (let i = 0; i < nMyelin; i++) {
      const t1 = hillockT + (i / nMyelin) * mLen + nodeGap;
      const t2 = hillockT + ((i + 1) / nMyelin) * mLen - nodeGap;
      if (t2 > t1) myelinRanges.push({ t1, t2 });
    }

    const tip = axonPts[axonPts.length - 1];
    [
      { da: -0.48, dz: -0.30 }, { da: -0.18, dz:  0.20 },
      { da:  0.14, dz: -0.18 }, { da:  0.44, dz:  0.32 },
    ].forEach(({ da, dz }) => {
      const len = H * 0.068 + rng() * H * 0.025;
      const ex  = tip.x + Math.cos(da) * len;
      const ey  = tip.y + Math.sin(da) * len;
      const ez  = tip.z + dz * len;
      termBranches.push({ from: { x: tip.x, y: tip.y, z: tip.z }, to: { x: ex, y: ey, z: ez } });
      terminals.push({ x: ex, y: ey, z: ez });
    });
  }

  // ── Fit neuron to viewport ────────────────────────
  // Fit the fixed right-facing view with room for terminal glow.
  function fitNeuron() {
    worldScale = 1; // reset so proj() gives raw values first

    const pts = [
      soma3,
      ...dendSegs.flatMap(s => [{ x:s.x1,y:s.y1,z:s.z1 }, { x:s.x2,y:s.y2,z:s.z2 }]),
      ...axonPts,
      ...termBranches.flatMap(b => [b.from, b.to]),
    ];

    const W = canvas.width, H = canvas.height;
    const cx = W * projCenterX, cy = H * 0.5;
    let maxLeft = 0, maxRight = 0, maxSy = 0;

    pts.forEach(p => {
      const pr = proj(p.x, p.y, p.z, FIXED_ROT_Y);
      const dx = pr.sx - cx;
      if (dx < 0) maxLeft  = Math.max(maxLeft,  -dx);
      else        maxRight = Math.max(maxRight,  dx);
      maxSy = Math.max(maxSy, Math.abs(pr.sy - cy));
    });

    const glowPad  = Math.min(W, H) * 0.12;
    const padLeft  = Math.max(1, cx - glowPad);
    const padRight = Math.max(1, W - cx - glowPad);
    const padY     = Math.max(1, cy - glowPad);
    const sxL  = maxLeft  > 0 ? padLeft  / maxLeft  : 9;
    const sxR  = maxRight > 0 ? padRight / maxRight : 9;
    const sy   = maxSy    > 0 ? padY     / maxSy    : 9;
    worldScale  = Math.min(sxL, sxR, sy, 3.2);
  }

  // ── 3D path utilities ────────────────────────────
  function pathLen3(pts) {
    let l = 0;
    for (let i = 1; i < pts.length; i++)
      l += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y, pts[i].z - pts[i-1].z);
    return l;
  }

  function ptOnPath3(pts, t) {
    if (pts.length < 2) return pts[0] ?? soma3;
    const total  = pathLen3(pts);
    const target = Math.min(t, 1) * total;
    let walked = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y, pts[i].z - pts[i-1].z);
      if (walked + d >= target) {
        const lt = d > 0 ? (target - walked) / d : 0;
        return {
          x: pts[i-1].x + (pts[i].x - pts[i-1].x) * lt,
          y: pts[i-1].y + (pts[i].y - pts[i-1].y) * lt,
          z: pts[i-1].z + (pts[i].z - pts[i-1].z) * lt,
        };
      }
      walked += d;
    }
    return pts[pts.length - 1];
  }

  // ── Glow helper ──────────────────────────────────
  function glow(sx, sy, r, alpha) {
    if (r <= 0 || alpha <= 0) return;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0,    `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.42, `rgba(255,252,248,${alpha * 0.35})`);
    g.addColorStop(1,    'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Draw neuron with depth-sorted 3D projection ──
  function drawNeuron(rotY, somaBreath, termIntensity) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const calls = [];

    dendSegs.forEach(s => {
      const p1 = proj(s.x1, s.y1, s.z1, rotY);
      const p2 = proj(s.x2, s.y2, s.z2, rotY);
      const mz = (p1.rz2 + p2.rz2) * 0.5;
      const df = depthFade(mz);
      const lw = s.w * Math.max(0.6, (p1.s + p2.s) * 0.5);
      calls.push({ z: mz, fn() {
        ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy);
        ctx.strokeStyle = `rgba(82,77,72,${0.65 * df})`;
        ctx.lineWidth   = lw; ctx.stroke();
      }});
    });

    {
      const pts2 = axonPts.map(p => proj(p.x, p.y, p.z, rotY));
      const mz   = pts2.reduce((a, p) => a + p.rz2, 0) / pts2.length;
      const df   = depthFade(mz);
      calls.push({ z: mz, fn() {
        ctx.beginPath();
        pts2.forEach((p, i) => i === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy));
        ctx.strokeStyle = `rgba(72,68,64,${0.75 * df})`;
        ctx.lineWidth   = 1.8; ctx.stroke();
      }});
    }

    myelinRanges.forEach(({ t1, t2 }) => {
      const s3 = ptOnPath3(axonPts, t1);
      const e3 = ptOnPath3(axonPts, t2);
      const ps = proj(s3.x, s3.y, s3.z, rotY);
      const pe = proj(e3.x, e3.y, e3.z, rotY);
      const mz = (ps.rz2 + pe.rz2) * 0.5;
      const df = depthFade(mz);
      const sc = (ps.s + pe.s) * 0.5;
      calls.push({ z: mz, fn() {
        ctx.beginPath(); ctx.moveTo(ps.sx, ps.sy); ctx.lineTo(pe.sx, pe.sy);
        ctx.strokeStyle = `rgba(58,55,52,${0.85 * df})`; ctx.lineWidth = 13 * sc; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ps.sx, ps.sy); ctx.lineTo(pe.sx, pe.sy);
        ctx.strokeStyle = `rgba(105,100,94,${0.55 * df})`; ctx.lineWidth = 7 * sc; ctx.stroke();
      }});
    });

    {
      const h3 = ptOnPath3(axonPts, 0.07);
      const ps = proj(soma3.x + soma3.r, soma3.y, soma3.z, rotY);
      const pe = proj(h3.x, h3.y, h3.z, rotY);
      const mz = (ps.rz2 + pe.rz2) * 0.5;
      const df = depthFade(mz);
      calls.push({ z: mz, fn() {
        ctx.beginPath(); ctx.moveTo(ps.sx, ps.sy); ctx.lineTo(pe.sx, pe.sy);
        ctx.strokeStyle = `rgba(82,77,72,${0.7 * df})`; ctx.lineWidth = 4; ctx.stroke();
      }});
    }

    termBranches.forEach((b, i) => {
      const ps = proj(b.from.x, b.from.y, b.from.z, rotY);
      const pe = proj(b.to.x,   b.to.y,   b.to.z,   rotY);
      const mz = (ps.rz2 + pe.rz2) * 0.5;
      const df = depthFade(mz);
      calls.push({ z: mz, fn() {
        ctx.beginPath(); ctx.moveTo(ps.sx, ps.sy); ctx.lineTo(pe.sx, pe.sy);
        ctx.strokeStyle = `rgba(82,77,72,${0.65 * df})`; ctx.lineWidth = 1.6; ctx.stroke();
      }});
      calls.push({ z: pe.rz2, fn() {
        if (termIntensity > 0) glow(pe.sx, pe.sy, (20 + termIntensity * 18) * pe.s, termIntensity * 0.88);
        ctx.beginPath(); ctx.arc(pe.sx, pe.sy, 5.5 * pe.s, 0, Math.PI * 2);
        ctx.fillStyle = termIntensity > 0
          ? `rgba(255,255,255,${0.75 + termIntensity * 0.25})`
          : `rgba(102,96,88,${0.8 * depthFade(pe.rz2)})`;
        ctx.fill();
      }});
    });

    {
      const ps = proj(soma3.x, soma3.y, soma3.z, rotY);
      calls.push({ z: ps.rz2, fn() {
        if (somaBreath > 0) glow(ps.sx, ps.sy, 32 * ps.s, somaBreath * 0.09);
        ctx.beginPath(); ctx.arc(ps.sx, ps.sy, soma3.r * ps.s, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(108,102,94,0.84)'; ctx.fill();
        ctx.strokeStyle = 'rgba(150,142,132,0.55)'; ctx.lineWidth = 1.8; ctx.stroke();
      }});
    }

    calls.sort((a, b) => b.z - a.z);
    calls.forEach(c => c.fn());
  }

  // ── Comet-trail pulse along 3D path ──────────────
  function drawPulse(pts3, t, rotY) {
    const head = Math.max(0, Math.min(1, t));
    [
      { dFrac: 0.07, r: 22, a: 0.10 },
      { dFrac: 0.04, r: 17, a: 0.32 },
      { dFrac: 0,    r: 11, a: 0.92 },
    ].forEach(({ dFrac, r, a }) => {
      const tp = Math.max(0, head - dFrac);
      const p3 = ptOnPath3(pts3, tp);
      const ps = proj(p3.x, p3.y, p3.z, rotY);
      glow(ps.sx, ps.sy, r * ps.s, a);
    });
  }

  // ── NT particles (white) ─────────────────────────
  function spawnNTs() {
    termBranches.forEach(b => {
      const dx = b.to.x - b.from.x;
      const dy = b.to.y - b.from.y;
      const dz = b.to.z - b.from.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      const fx = dx / len, fy = dy / len, fz = dz / len;
      for (let i = 0; i < 8; i++) {
        const spread = 0.45;
        const px = fx + (Math.random() - 0.5) * spread;
        const py = fy + (Math.random() - 0.5) * spread;
        const pz = fz + (Math.random() - 0.5) * spread;
        const vl  = Math.hypot(px, py, pz) || 1;
        const spd = 0.9 + Math.random() * 1.2;
        nts.push({
          x: b.to.x + (Math.random() - 0.5) * 4,
          y: b.to.y + (Math.random() - 0.5) * 4,
          z: b.to.z + (Math.random() - 0.5) * 4,
          vx: (px / vl) * spd, vy: (py / vl) * spd, vz: (pz / vl) * spd,
          alpha: 0.92,
          r0: 1.8 + Math.random() * 1.4,
        });
      }
    });
  }

  function updateNTs() {
    nts = nts.filter(n => {
      n.x += n.vx; n.y += n.vy; n.z += n.vz;
      n.vx *= 0.968; n.vy *= 0.968; n.vz *= 0.968;
      n.alpha -= 0.007;
      return n.alpha > 0;
    });
  }

  function drawNTs(rotY) {
    nts.forEach(n => {
      const ps = proj(n.x, n.y, n.z, rotY);
      ctx.beginPath();
      ctx.arc(ps.sx, ps.sy, Math.max(0.5, n.r0 * ps.s), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${n.alpha})`; // white NT dots
      ctx.fill();
    });
  }

  // ── Easing ────────────────────────────────────────
  function eio(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  // ── Main render loop ──────────────────────────────
  function render(ts) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rotY = FIXED_ROT_Y;
    curTiltX = BASE_TILT;

    const elapsed  = ts - phaseStart;
    const progress = Math.min(1, elapsed / DUR[phase]);

    updateNTs();

    if (phase === 'idle') {
      const breathe = Math.sin(ts / 1700) * 0.5 + 0.5;
      drawNeuron(rotY, breathe, 0);
      drawNTs(rotY);
      if (progress >= 1) { phase = 'axon'; phaseStart = ts; }

    } else if (phase === 'axon') {
      drawNeuron(rotY, 0, 0);
      const ep = eio(progress);

      if (progress <= 0.85) {
        drawPulse(axonPts, ep / eio(0.85), rotY);
        if (progress < 0.08) {
          const sf = Math.sin((progress / 0.08) * Math.PI);
          const ps = proj(soma3.x, soma3.y, soma3.z, rotY);
          glow(ps.sx, ps.sy, (50 + sf * 24) * ps.s, sf * 0.94);
        }
      }

      if (progress >= 0.82) {
        const eTermT = eio(Math.min(1, (progress - 0.82) / 0.18));
        termBranches.forEach(b => {
          const p3 = {
            x: b.from.x + (b.to.x - b.from.x) * eTermT,
            y: b.from.y + (b.to.y - b.from.y) * eTermT,
            z: b.from.z + (b.to.z - b.from.z) * eTermT,
          };
          const ps = proj(p3.x, p3.y, p3.z, rotY);
          glow(ps.sx, ps.sy, 11 * ps.s, 0.88);
          glow(ps.sx, ps.sy, 20 * ps.s, 0.28);
        });
      }

      drawNTs(rotY);
      if (progress >= 1) { spawnNTs(); phase = 'release'; phaseStart = ts; }

    } else if (phase === 'release') {
      const termGlow = Math.max(0, 1 - progress * 2.2);
      drawNeuron(rotY, 0, termGlow);
      drawNTs(rotY);
      if (progress >= 1) { phase = 'idle'; phaseStart = ts; }
    }

    requestAnimationFrame(render);
  }

  // ── Mouse drag rotation ───────────────────────────
  canvas.addEventListener('mousedown', function (e) {
    isDragging   = true;
    dragLast     = { x: e.clientX, y: e.clientY };
    lastInteract = performance.now();
    e.preventDefault();
  });

  window.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    manualRotY  += (e.clientX - dragLast.x) * 0.005;
    manualRotX   = Math.max(-0.55, Math.min(0.55, manualRotX + (e.clientY - dragLast.y) * 0.004));
    dragLast     = { x: e.clientX, y: e.clientY };
    lastInteract = performance.now();
  });

  window.addEventListener('mouseup', function () {
    if (!isDragging) return;
    isDragging    = false;
    autoRotOffset = manualRotY - performance.now() * ROT_SPEED;
    lastInteract  = performance.now();
  });

  // ── Touch drag rotation ───────────────────────────
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    isDragging   = true;
    dragLast     = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    lastInteract = performance.now();
    e.preventDefault();
  });

  canvas.addEventListener('touchmove', function (e) {
    if (!isDragging || e.touches.length !== 1) return;
    manualRotY  += (e.touches[0].clientX - dragLast.x) * 0.005;
    manualRotX   = Math.max(-0.55, Math.min(0.55, manualRotX + (e.touches[0].clientY - dragLast.y) * 0.004));
    dragLast     = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    lastInteract = performance.now();
    e.preventDefault();
  });

  window.addEventListener('touchend', function () {
    if (!isDragging) return;
    isDragging    = false;
    autoRotOffset = manualRotY - performance.now() * ROT_SPEED;
    lastInteract  = performance.now();
  });

  // ── Resize ────────────────────────────────────────
  let lastW = 0, lastH = 0;

  function resize() {
    const host = canvas.parentElement || document.getElementById('hero');
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w === lastW && h === lastH) return;
    lastW = w; lastH = h;
    canvas.width  = w;
    canvas.height = h;
    projCenterX   = 0.5;
    worldScale    = 1;
    build();
    fitNeuron();
  }

  window.addEventListener('resize', () => {
    clearTimeout(window._nrt);
    window._nrt = setTimeout(resize, 200);
  });

  // ── Boot ──────────────────────────────────────────
  resize();
  phaseStart = performance.now();
  requestAnimationFrame(render);
})();
