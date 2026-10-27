/* Hero background: particles flowing from a source distribution to task targets.
   Mode "fm":   one shared isotropic Gaussian source, linear transport.
   Mode "tops": per-task multimodal sources (fitted to reverse images), slow-then-fast
                transport along each task's expansion direction, linear elsewhere.      */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- world definition (unit square) ----------
  const TASKS = [
    { name: 'τ1', rgb: [90, 169, 255] },
    { name: 'τ2', rgb: [180, 140, 255] },
    { name: 'τ3', rgb: [63, 208, 192] },
  ];
  // Targets: elongated 2-component mixtures (expert action clusters), right-hand side.
  const TARGET = [
    [{ mu: [0.80, 0.24], a: 0.075, b: 0.022, th: -0.35 }, { mu: [0.87, 0.34], a: 0.05, b: 0.018, th: -0.35 }],
    [{ mu: [0.90, 0.60], a: 0.07, b: 0.020, th: 1.15 }, { mu: [0.84, 0.70], a: 0.045, b: 0.016, th: 1.15 }],
    [{ mu: [0.66, 0.80], a: 0.08, b: 0.022, th: 0.35 }, { mu: [0.57, 0.86], a: 0.05, b: 0.018, th: 0.35 }],
  ];
  // Shared Gaussian source (standard FM)
  const SRC_FM = [{ mu: [0.47, 0.52], a: 0.075, b: 0.075, th: 0 }];
  // Task-oriented sources (fitted MPPCA on reverse images): overlapping, structured.
  const SRC_TOPS = [
    [{ mu: [0.44, 0.44], a: 0.06, b: 0.018, th: -0.5 }, { mu: [0.51, 0.47], a: 0.04, b: 0.014, th: -0.2 }],
    [{ mu: [0.52, 0.56], a: 0.055, b: 0.018, th: 0.9 }, { mu: [0.47, 0.60], a: 0.04, b: 0.013, th: 0.6 }],
    [{ mu: [0.41, 0.58], a: 0.06, b: 0.02, th: 0.3 }, { mu: [0.46, 0.52], a: 0.035, b: 0.013, th: 0.3 }],
  ];
  const RHO = 0.5; // scheduling strength along expansion direction

  // expansion direction per task: major axis of the target cluster (unit vector)
  const EXP_DIR = TARGET.map(c => [Math.cos(c[0].th), Math.sin(c[0].th)]);

  // ---------- helpers ----------
  function randn() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function sampleMix(comps) {
    const c = comps[Math.floor(Math.random() * comps.length)];
    const u = randn() * c.a, v = randn() * c.b;
    const ct = Math.cos(c.th), st = Math.sin(c.th);
    return [c.mu[0] + u * ct - v * st, c.mu[1] + u * st + v * ct];
  }
  const easeInOut = t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  // ---------- state ----------
  let W = 0, H = 0, dpr = 1, ox = 0, oy = 0, scale = 1;
  let mode = 'tops', fade = 1, fadeDir = 0, pendingMode = null;
  let particles = [];
  const N = 380;
  let running = true, visible = true, lastT = 0, autoTimer = 0;
  const AUTO_SWITCH = 9; // seconds

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // world box: right ~62% of the hero on wide screens, full width on narrow
    const wide = W > 960;
    const bx = wide ? W * 0.36 : 0, bw = wide ? W * 0.64 : W, bh = H;
    scale = Math.min(bw / 1.0, bh / 1.0);
    ox = bx + (bw - scale) / 2; oy = (bh - scale) / 2;
    ctx.fillStyle = '#070b16'; ctx.fillRect(0, 0, W, H);
  }
  const toPx = p => [ox + p[0] * scale, oy + p[1] * scale];

  function spawn(p, m) {
    p.k = Math.floor(Math.random() * 3);
    p.x1 = sampleMix(TARGET[p.k]);
    p.x0 = sampleMix(m === 'fm' ? SRC_FM : SRC_TOPS[p.k]);
    p.t = -Math.random() * 0.6;          // staggered start (wait at the source)
    p.speed = 0.16 + Math.random() * 0.14; // units of t per second
    p.size = 1.1 + Math.random() * 1.3;
    p.prev = null;
    return p;
  }
  function init() {
    particles = [];
    for (let i = 0; i < N; i++) { const p = spawn({}, mode); p.t = Math.random() * 1.1 - 0.1; particles.push(p); }
  }
  function pos(p, m) {
    const t = Math.max(0, Math.min(1, p.t));
    if (m === 'fm') return [p.x0[0] + (p.x1[0] - p.x0[0]) * t, p.x0[1] + (p.x1[1] - p.x0[1]) * t];
    // TOPS: decompose displacement in the task's expansion basis
    const e = EXP_DIR[p.k];
    const dx = p.x1[0] - p.x0[0], dy = p.x1[1] - p.x0[1];
    const dpar = dx * e[0] + dy * e[1];
    const px = dx - dpar * e[0], py = dy - dpar * e[1];
    const aExp = (1 - t) * Math.exp(RHO * t); // slow-then-fast source weight
    const aLin = 1 - t;
    return [p.x1[0] - aExp * dpar * e[0] - aLin * px, p.x1[1] - aExp * dpar * e[1] - aLin * py];
  }

  function drawEllipse(c, rgb, alpha, lw) {
    const [cx, cy] = toPx(c.mu);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(c.th);
    ctx.beginPath(); ctx.ellipse(0, 0, c.a * 2 * scale, c.b * 2 * scale, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`; ctx.lineWidth = lw; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, c.a * scale, c.b * scale, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.6})`; ctx.stroke();
    ctx.restore();
  }
  function label(text, p, rgb, alpha, dx, dy) {
    const [x, y] = toPx(p);
    ctx.font = '500 12px Inter, system-ui, sans-serif';
    ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
    ctx.fillText(text, x + dx, y + dy);
  }

  function drawStatic(m, alpha) {
    const grey = [150, 165, 200];
    // targets
    TARGET.forEach((comps, k) => comps.forEach(c => drawEllipse(c, TASKS[k].rgb, 0.28 * alpha, 1)));
    label('expert actions τ₁', TARGET[0][0].mu, TASKS[0].rgb, 0.7 * alpha, 36, -40);
    label('expert actions τ₂', TARGET[1][0].mu, TASKS[1].rgb, 0.7 * alpha, 26, 56);
    label('expert actions τ₃', TARGET[2][0].mu, TASKS[2].rgb, 0.7 * alpha, -150, 48);
    if (m === 'fm') {
      drawEllipse(SRC_FM[0], grey, 0.35 * alpha, 1);
      label('shared source  𝒩(0, σ₀²I)', SRC_FM[0].mu, grey, 0.75 * alpha, -70, -62);
    } else {
      SRC_TOPS.forEach((comps, k) => comps.forEach(c => drawEllipse(c, TASKS[k].rgb, 0.32 * alpha, 1)));
      label('task-oriented sources qτ', [0.46, 0.52], grey, 0.75 * alpha, -70, -78);
    }
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
    if (!visible || document.hidden) { requestAnimationFrame(frame); return; }

    // mode transitions
    if (fadeDir !== 0) {
      fade += fadeDir * dt * 1.8;
      if (fadeDir < 0 && fade <= 0) { fade = 0; mode = pendingMode; pendingMode = null; init(); fadeDir = 1; updateHud(); }
      if (fadeDir > 0 && fade >= 1) { fade = 1; fadeDir = 0; }
    } else {
      autoTimer += dt;
      if (autoTimer > AUTO_SWITCH) { autoTimer = 0; requestMode(mode === 'fm' ? 'tops' : 'fm'); }
    }

    // trails: translucent clear
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(7,11,22,0.22)'; ctx.fillRect(0, 0, W, H);
    drawStatic(mode, fade);

    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      p.t += p.speed * dt * (0.6 + 0.4 * fade);
      if (p.t > 1.25) { spawn(p, mode); continue; }
      const q = toPx(pos(p, mode));
      const tt = Math.max(0, Math.min(1, p.t));
      const rgb = TASKS[p.k].rgb;
      const a = fade * (p.t < 0 ? 0.25 : (p.t > 1 ? Math.max(0, 1 - (p.t - 1) / 0.25) : 0.55 + 0.45 * tt));
      // tail segment
      if (p.prev && tt > 0 && tt < 1) {
        ctx.beginPath(); ctx.moveTo(p.prev[0], p.prev[1]); ctx.lineTo(q[0], q[1]);
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.35 * a})`; ctx.lineWidth = p.size * 0.9; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(q[0], q[1], p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; ctx.fill();
      ctx.beginPath(); ctx.arc(q[0], q[1], p.size * 2.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.08 * a})`; ctx.fill();
      p.prev = q;
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(frame);
  }

  // ---------- HUD ----------
  const HUD = {
    fm: ['Standard FM: shared Gaussian source, linear path', 'Every task starts from the same noise and moves at the same rate along every direction.'],
    tops: ['TOPS: task-oriented sources, slow→fast transport', 'Each task starts from its own fitted source and accelerates late along expansion directions.'],
  };
  const hudLabel = document.getElementById('hud-label'), hudDesc = document.getElementById('hud-desc');
  const hudBtns = document.querySelectorAll('.hud-toggle button');
  function updateHud() {
    if (hudLabel) hudLabel.textContent = HUD[mode][0];
    if (hudDesc) hudDesc.textContent = HUD[mode][1];
    hudBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  }
  function requestMode(m) { if (m === mode || pendingMode) return; pendingMode = m; fadeDir = -1; autoTimer = 0; }
  hudBtns.forEach(b => b.addEventListener('click', () => { requestMode(b.dataset.mode); autoTimer = -6; }));

  // ---------- lifecycle ----------
  resize(); init(); updateHud();
  window.addEventListener('resize', () => { resize(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.02 }).observe(canvas);
  }
  if (reduced) {
    // static render: a few frames to populate, then stop
    for (let i = 0; i < 40; i++) { for (const p of particles) p.t += 0.02; }
    ctx.fillStyle = '#070b16'; ctx.fillRect(0, 0, W, H); drawStatic(mode, 1);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) { const q = toPx(pos(p, mode)); const rgb = TASKS[p.k].rgb; ctx.beginPath(); ctx.arc(q[0], q[1], p.size, 0, Math.PI * 2); ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.8)`; ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
    running = false;
  } else {
    requestAnimationFrame(t => { lastT = t; frame(t); });
  }
})();
