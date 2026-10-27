/* Method explainers
   A) Flow reversal -> task-oriented sources (conceptual 2-D animation)
   B) Spectral scheduling (exact Gaussian-endpoint computation)                     */
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = [
    { name: 'τ₁', rgb: [43, 95, 180] },
    { name: 'τ₂', rgb: [124, 92, 214] },
    { name: 'τ₃', rgb: [30, 154, 130] },
  ];
  const GREY = [120, 132, 160];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const easeInOut = t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(rnd) { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function setupCanvas(canvas, w, h) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }
  function visibleTracker(el) {
    const st = { visible: true };
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { st.visible = es[0].isIntersecting; }, { threshold: 0.05 }).observe(el);
    return st;
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* =====================================================================
     A. Flow reversal explainer
     ===================================================================== */
  (function flowrev() {
    const canvas = document.getElementById('flowrev-canvas');
    if (!canvas) return;
    const Wc = 1200, Hc = 520;
    const ctx = setupCanvas(canvas, Wc, Hc);
    const vis = visibleTracker(canvas);
    const rnd = mulberry32(7);

    const L = { x: 70, y: 80, w: 400, h: 390 };   // source space panel
    const R = { x: 730, y: 80, w: 400, h: 390 };   // action space panel
    const toPx = (P, p) => [P.x + p[0] * P.w, P.y + p[1] * P.h];

    const TARGET = [
      [{ mu: [0.30, 0.28], a: 0.12, b: 0.045, th: -0.4 }, { mu: [0.45, 0.20], a: 0.07, b: 0.03, th: -0.4 }],
      [{ mu: [0.68, 0.47], a: 0.12, b: 0.04, th: 0.25 }, { mu: [0.76, 0.62], a: 0.07, b: 0.03, th: 0.25 }],
      [{ mu: [0.40, 0.78], a: 0.13, b: 0.045, th: 0.3 }, { mu: [0.60, 0.82], a: 0.07, b: 0.03, th: 0.3 }],
    ];
    const REV = [
      [{ mu: [0.42, 0.40], a: 0.11, b: 0.035, th: -0.6 }, { mu: [0.56, 0.44], a: 0.07, b: 0.028, th: -0.3 }],
      [{ mu: [0.60, 0.57], a: 0.10, b: 0.035, th: 0.9 }, { mu: [0.52, 0.66], a: 0.07, b: 0.026, th: 0.6 }],
      [{ mu: [0.37, 0.60], a: 0.11, b: 0.04, th: 0.25 }, { mu: [0.47, 0.53], a: 0.06, b: 0.025, th: 0.25 }],
    ];
    const GAUSS = { mu: [0.5, 0.52], a: 0.17, b: 0.17, th: 0 };
    function sampleComp(c) { const u = gauss(rnd) * c.a, v = gauss(rnd) * c.b, ct = Math.cos(c.th), st = Math.sin(c.th); return [c.mu[0] + u * ct - v * st, c.mu[1] + u * st + v * ct]; }

    // particles
    const PER = 60, parts = [];
    for (let k = 0; k < 3; k++) for (let i = 0; i < PER; i++) {
      const m = i % 2;
      parts.push({ k, m, x1: sampleComp(TARGET[k][m]), xr: sampleComp(REV[k][m]), xg: sampleComp(GAUSS), d: rnd() * 0.9, sz: 2.2 + rnd() * 1.4 });
    }
    // generation samples for stage 3 (task τ2)
    const GEN_K = 1, gen = [];
    for (let i = 0; i < 44; i++) { const m = i % 2; gen.push({ x0: sampleComp(REV[GEN_K][m]), x1: sampleComp(TARGET[GEN_K][m]), d: rnd() * 0.5, sz: 2.4 + rnd() * 1.2 }); }
    const RHO = 0.5;
    const EXP_TH = TARGET[GEN_K][0].th; // expansion direction = target major axis
    const E = [Math.cos(EXP_TH), Math.sin(EXP_TH)];

    const STAGES = [
      { dur: 3.6, title: 'Warm-up flow matching from a shared Gaussian source', mid: ['Flow matching', 'warm-up policy v₀'], cap: '<b>① Warm-up.</b> A standard multi-task policy is trained from one shared Gaussian source with linear paths. The expert action chunks of three tasks occupy distinct regions of action space.' },
      { dur: 3.6, title: 'Flow reversal: trace expert actions back to the source', mid: ['Inverse flow', 'x̂₀ = Φ₁→₀(x₁)'], cap: '<b>② Reverse.</b> Integrating the warm-up policy backwards sends every expert chunk to its source sample. The reverse images are organised by task — and by execution stage within a task — rather than filling the Gaussian uniformly.' },
      { dur: 3.2, title: 'Fit MPPCA mixtures → task-oriented sources q<sub>τ</sub>', mid: ['Fit MPPCA', 'EM on bank B_τ'], cap: '<b>③ Fit.</b> For each task we fit a mixture of probabilistic PCA models to its reverse-image bank, giving a multimodal, low-rank source q<sub>τ</sub>. A Gaussian-OT map between source and expert covariances also yields the task\'s expansion directions and schedule K<sub>τ</sub>.' },
      { dur: 5.0, title: 'Language selects the source; one schedule-aware step', mid: ['Task selector ψ', 'τ̂ = ψ(ℓ)'], cap: '<b>④ Generate.</b> At inference a lightweight selector maps the instruction to τ̂. We sample x₀ ∼ q<sub>τ̂</sub> and integrate with the schedule-aware solver — slow at first, fast at the end along expansion directions — in a single step (two network evaluations).' },
    ];
    const INSTR = 'put the purple cube into the purple tray';
    let stage = 0, st = 0, playing = !reduced, lastT = 0;
    const capEl = document.getElementById('flowrev-caption');
    const stepBtns = Array.from(document.querySelectorAll('#flowrev-steps button'));
    const playBtn = document.getElementById('flowrev-play');
    const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
    const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>';
    function setStage(i) { stage = i; st = 0; stepBtns.forEach(b => b.classList.toggle('active', +b.dataset.step === i)); if (capEl) capEl.innerHTML = STAGES[i].cap; }
    stepBtns.forEach(b => b.addEventListener('click', () => setStage(+b.dataset.step)));
    if (playBtn) playBtn.addEventListener('click', () => { playing = !playing; playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY; playBtn.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation'); if (playing) requestAnimationFrame(t => { lastT = t; frame(t); }); });

    // ---- drawing helpers ----
    function panel(P, title, sub) {
      ctx.save();
      roundRect(ctx, P.x, P.y, P.w, P.h, 18); ctx.fillStyle = '#f7f8fc'; ctx.fill(); ctx.strokeStyle = '#e3e7ef'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#0d1324'; ctx.font = '700 15px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(title, P.x + 16, P.y - 14);
      ctx.fillStyle = '#667085'; ctx.font = '500 12px Inter, system-ui, sans-serif'; ctx.fillText(sub, P.x + 16 + ctx.measureText(title).width * 1.0 + 60, P.y - 14);
      ctx.restore();
    }
    function ellipse(P, c, color, strokeA, fillA, frac, lw) {
      const [cx, cy] = toPx(P, c.mu);
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(c.th);
      if (fillA > 0) { ctx.beginPath(); ctx.ellipse(0, 0, c.a * 2 * P.w, c.b * 2 * P.h, 0, 0, Math.PI * 2 * frac); ctx.fillStyle = rgba(color, fillA); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(0, 0, c.a * 2 * P.w, c.b * 2 * P.h, 0, 0, Math.PI * 2 * frac); ctx.strokeStyle = rgba(color, strokeA); ctx.lineWidth = lw || 1.5; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, c.a * P.w, c.b * P.h, 0, 0, Math.PI * 2 * frac); ctx.strokeStyle = rgba(color, strokeA * 0.6); ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    }
    function dot(x, y, r, color, a) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = rgba(color, a); ctx.fill(); }
    function star(x, y, r, color, a) {
      ctx.save(); ctx.beginPath();
      for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r; const an = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(x + rr * Math.cos(an), y + rr * Math.sin(an)); }
      ctx.closePath(); ctx.fillStyle = rgba(color, a); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    }
    function midBox(lines, dir, prog, extra) {
      const x = 500, y = 215, w = 200, h = 90;
      ctx.save();
      roundRect(ctx, x, y, w, h, 14); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#cfd6e4'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#0d1324'; ctx.font = '700 14px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(lines[0], x + w / 2, y + 36);
      ctx.fillStyle = '#667085'; ctx.font = '500 12px JetBrains Mono, monospace'; ctx.fillText(lines[1], x + w / 2, y + 60);
      // arrow
      if (dir !== 0) {
        const ay = y + h + 26; const x0 = dir > 0 ? x + 20 : x + w - 20, x1 = dir > 0 ? x + w - 20 : x + 20;
        ctx.strokeStyle = '#2f3850'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, ay); ctx.lineTo(x1, ay); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x1, ay); ctx.lineTo(x1 - dir * 10, ay - 6); ctx.moveTo(x1, ay); ctx.lineTo(x1 - dir * 10, ay + 6); ctx.stroke();
        // moving pulse
        const px = x0 + (x1 - x0) * prog;
        dot(px, ay, 5, [43, 95, 180], 0.9);
      }
      if (extra) extra(x, y, w, h);
      ctx.restore();
    }
    function drawTargets(alphaMul, dimAllBut) {
      TARGET.forEach((comps, k) => { const a = (dimAllBut != null && dimAllBut !== k) ? 0.25 : 1; comps.forEach(c => ellipse(R, c, TAU[k].rgb, 0.55 * a * alphaMul, 0.06 * a * alphaMul, 1, 1.5)); });
      const lab = [[0.30, 0.12], [0.86, 0.44], [0.16, 0.92]];
      ctx.font = '700 13px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
      TAU.forEach((t, k) => { const a = (dimAllBut != null && dimAllBut !== k) ? 0.3 : 0.95; const [x, y] = toPx(R, lab[k]); ctx.fillStyle = rgba(t.rgb, a * alphaMul); ctx.fillText('task ' + t.name, x, y); });
    }
    function title(txt) { ctx.fillStyle = '#0d1324'; ctx.font = '700 18px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(txt, Wc / 2, 40); }
    function lerpRGB(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

    function render() {
      ctx.clearRect(0, 0, Wc, Hc);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, Wc, Hc);
      const S = STAGES[stage];
      title(S.title.replace(/<[^>]+>/g, ''));
      panel(L, 'Source space', stage === 0 ? 'x₀ ∼ 𝒩(0, σ₀²I)' : (stage >= 2 ? 'x₀ ∼ q_τ (MPPCA)' : 'reverse images x̂₀'));
      panel(R, 'Action space', 'expert chunks x₁ ∈ ℝᴰ, D = H·dₐ');

      if (stage === 0) {
        // shared gaussian contour
        ellipse(L, GAUSS, GREY, 0.7, 0.07, 1, 1.5);
        ctx.fillStyle = rgba(GREY, 0.95); ctx.font = '600 12.5px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
        const [gx, gy] = toPx(L, [0.5, 0.92]); ctx.fillText('shared Gaussian source 𝒩(0, σ₀²I)', gx, gy);
        drawTargets(1, null);
        for (const p of parts) {
          const u = easeInOut(clamp01((st - p.d) / 2.2));
          const A = toPx(L, p.xg), B = toPx(R, p.x1);
          const x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u;
          dot(x, y, p.sz, lerpRGB(GREY, TAU[p.k].rgb, u), 0.9);
        }
        midBox(S.mid, +1, (st * 0.9) % 1);
      } else if (stage === 1) {
        ellipse(L, GAUSS, GREY, 0.3, 0.03, 1, 1.2);
        drawTargets(1, null);
        let arrived = 0;
        for (const p of parts) {
          const u = easeInOut(clamp01((st - p.d) / 2.2)); if (u >= 1) arrived++;
          const A = toPx(R, p.x1), B = toPx(L, p.xr);
          const x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u;
          dot(x, y, p.sz, TAU[p.k].rgb, 0.9);
        }
        midBox(S.mid, -1, (st * 0.9) % 1);
        if (arrived > parts.length * 0.5) {
          const a = clamp01((st - 2.6) / 0.5);
          ctx.fillStyle = rgba(GREY, 0.95 * a); ctx.font = '600 12.5px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
          const [gx, gy] = toPx(L, [0.5, 0.92]); ctx.fillText('reverse-image banks B_τ: task-structured, with sub-clusters', gx, gy);
        }
      } else if (stage === 2) {
        drawTargets(0.9, null);
        midBox(S.mid, 0, 0, (x, y, w, h) => {
          ctx.fillStyle = '#667085'; ctx.font = '500 11.5px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('+ Gaussian OT: T_τ = R_τ diag(s_τj) R_τᵀ', x + w / 2, y + h + 24);
          ctx.fillText('expansion directions s_τj > 1 → K_τ', x + w / 2, y + h + 42);
        });
        for (const p of parts) { const [x, y] = toPx(L, p.xr); dot(x, y, p.sz, TAU[p.k].rgb, 0.85); }
        REV.forEach((comps, k) => comps.forEach((c, m) => {
          const frac = easeOut(clamp01((st - 0.3 - k * 0.45 - m * 0.2) / 0.9));
          if (frac > 0) ellipse(L, c, TAU[k].rgb, 0.9, 0.10 * frac, frac, 2);
        }));
        const lab = [[0.26, 0.30], [0.80, 0.58], [0.16, 0.66]];
        TAU.forEach((t, k) => { const a = clamp01((st - 1.3 - k * 0.45) / 0.5); if (a <= 0) return; const [x, y] = toPx(L, lab[k]); ctx.fillStyle = rgba(t.rgb, a); ctx.font = '700 13px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('q' + t.name, x, y); });
      } else {
        // stage 3: select and generate
        const typed = Math.floor(clamp01(st / 1.1) * INSTR.length);
        const selA = clamp01((st - 1.3) / 0.5);
        const dimK = selA > 0 ? GEN_K : null;
        drawTargets(1, dimK);
        // sources on the left
        REV.forEach((comps, k) => comps.forEach(c => { const a = (dimK != null && k !== dimK) ? 0.22 : 1; ellipse(L, c, TAU[k].rgb, 0.9 * a, 0.10 * a, 1, k === dimK ? 2.5 : 1.5); }));
        const lab = [[0.26, 0.30], [0.80, 0.58], [0.16, 0.66]];
        TAU.forEach((t, k) => { const a = (dimK != null && k !== dimK) ? 0.3 : 1; const [x, y] = toPx(L, lab[k]); ctx.fillStyle = rgba(t.rgb, a); ctx.font = '700 13px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('q' + t.name, x, y); });
        for (const p of parts) { const a = (dimK != null && p.k !== dimK) ? 0.15 : 0.35; const [x, y] = toPx(L, p.xr); dot(x, y, p.sz * 0.8, TAU[p.k].rgb, a); }
        // generated samples travel with slow-then-fast schedule
        if (selA > 0) {
          const tg = clamp01((st - 2.0) / 2.4);
          for (const g of gen) {
            const t = clamp01(tg - g.d * 0.15) ;
            const A = toPx(L, g.x0), B = toPx(R, g.x1);
            const dx = B[0] - A[0], dy = B[1] - A[1];
            const dpar = dx * E[0] + dy * E[1];
            const px = dx - dpar * E[0], py = dy - dpar * E[1];
            const aExp = (1 - t) * Math.exp(RHO * t), aLin = 1 - t;
            const x = B[0] - aExp * dpar * E[0] - aLin * px, y = B[1] - aExp * dpar * E[1] - aLin * py;
            if (t <= 0) star(x, y, g.sz * 2.2, TAU[GEN_K].rgb, 0.95); else dot(x, y, g.sz, TAU[GEN_K].rgb, 0.95);
          }
          ctx.fillStyle = rgba(TAU[GEN_K].rgb, selA); ctx.font = '600 12.5px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
          const [sx, sy] = toPx(L, [0.5, 0.92]); ctx.fillText('x₀ ∼ q_τ₂ (stars)  →  action chunk x₁', sx, sy);
          if (tg >= 1) { const [ex, ey] = toPx(R, [0.72, 0.30]); ctx.fillStyle = '#0b6b43'; ctx.font = '700 13px Inter, system-ui, sans-serif'; ctx.fillText('✓ action chunk generated (NFE = 2)', ex, ey); }
        }
        // instruction chip
        ctx.save();
        const chipW = 236, chipH = 58, chipX = Wc / 2 - chipW / 2, chipY = 112;
        roundRect(ctx, chipX, chipY, chipW, chipH, 14); ctx.fillStyle = '#0d1324'; ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '600 10.5px Inter, system-ui, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText('INSTRUCTION ℓ', chipX + 14, chipY + 17);
        ctx.fillStyle = '#ffffff'; ctx.font = '500 12px JetBrains Mono, monospace';
        const shown = INSTR.slice(0, typed) + (typed < INSTR.length ? '▌' : '');
        const l1 = shown.slice(0, 20), l2 = shown.slice(20);
        ctx.fillText('"' + l1, chipX + 14, chipY + 35); if (l2) ctx.fillText(l2 + (typed >= INSTR.length ? '"' : ''), chipX + 14, chipY + 50);
        ctx.restore();
        // arrow chip -> selector
        ctx.strokeStyle = '#2f3850'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(Wc / 2, chipY + chipH + 4); ctx.lineTo(Wc / 2, 208); ctx.stroke(); ctx.setLineDash([]);
        midBox([S.mid[0], selA > 0 ? 'τ̂ = τ₂  ✓' : S.mid[1]], 0, 0, (x, y, w, h) => {
          if (selA > 0) {
            // a(t) mini curve + moving dot
            const gx = x + 20, gy = y + h + 18, gw = w - 40, gh = 56;
            ctx.strokeStyle = '#cfd6e4'; ctx.lineWidth = 1; ctx.strokeRect(gx, gy, gw, gh);
            ctx.strokeStyle = '#9aa3b5'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gw, gy + gh); ctx.stroke(); ctx.setLineDash([]);
            ctx.strokeStyle = rgba(TAU[1].rgb, 1); ctx.lineWidth = 2; ctx.beginPath();
            for (let i = 0; i <= 40; i++) { const t = i / 40, a = (1 - t) * Math.exp(RHO * t); const px = gx + t * gw, py = gy + (1 - a) * gh; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
            ctx.stroke();
            const tg = clamp01((st - 2.0) / 2.4); const ag = (1 - tg) * Math.exp(RHO * tg);
            dot(gx + tg * gw, gy + (1 - ag) * gh, 4.5, TAU[1].rgb, 1);
            ctx.fillStyle = '#667085'; ctx.font = '500 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('source weight a(t) = (1−t)e^{ρt}', x + w / 2, gy + gh + 16); ctx.fillText('slow → fast along expansion directions', x + w / 2, gy + gh + 31);
          }
        });
      }
    }
    function frame(now) {
      if (!playing) return;
      const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
      if (vis.visible && !document.hidden) {
        st += dt;
        if (st > STAGES[stage].dur + 0.5) setStage((stage + 1) % STAGES.length);
        render();
      }
      requestAnimationFrame(frame);
    }
    setStage(0); render();
    if (playing) requestAnimationFrame(t => { lastT = t; frame(t); });
    else { playBtn && (playBtn.innerHTML = ICON_PLAY); }
  })();

  /* =====================================================================
     B. Spectral scheduling explainer
     ===================================================================== */
  (function sched() {
    const canvas = document.getElementById('sched-canvas');
    const svg = document.getElementById('curve-svg');
    if (!canvas || !svg) return;
    const Wc = 760, Hc = 720;
    const ctx = setupCanvas(canvas, Wc, Hc);
    const vis = visibleTracker(canvas);
    const KAPPA = 0.5, GAMMA = 1.0, NU = 0.09, MU1 = 1.0, S_STD = 0.8;
    const PURPLE = [124, 92, 214], BLUEGREY = [84, 104, 150], GREYL = [154, 163, 181], TEAL = [30, 154, 130];
    const rnd = mulberry32(11);
    const pairs = []; for (let i = 0; i < 14; i++) pairs.push({ z0: gauss(rnd), z1: gauss(rnd) });

    // schedule math
    const rhoOf = s => s > 1 ? KAPPA * Math.tanh(GAMMA * Math.log(s)) : 0;
    const aT = (t, rho) => (1 - t) * Math.exp(rho * t);
    const adT = (t, rho) => Math.exp(rho * t) * (rho * (1 - t) - 1);
    const g = (r, s) => s * s / (r * r + s * s * (1 - r) * (1 - r));
    function simpson(f, n) { n = n % 2 ? n + 1 : n; const h = 1 / n; let sum = f(0) + f(1); for (let i = 1; i < n; i++) sum += f(i * h) * (i % 2 ? 4 : 2); return sum * h / 3; }
    function analyse(s) {
      const rho = rhoOf(s);
      const Jlin = simpson(r => g(r, s), 400);
      const Jours = simpson(t => g(aT(t, rho), s) * adT(t, rho) ** 2, 400);
      const Lc = simpson(r => Math.sqrt(g(r, s)), 400);
      const Jopt = Lc * Lc;
      // optimal schedule a*(t) = F^{-1}(t), F(u) = (1/L) ∫_u^1 sqrt(g)
      const n = 400, F = new Float64Array(n + 1);
      F[n] = 0; for (let i = n - 1; i >= 0; i--) { const r0 = i / n, r1 = (i + 1) / n; F[i] = F[i + 1] + 0.5 * (Math.sqrt(g(r0, s)) + Math.sqrt(g(r1, s))) / n; }
      for (let i = 0; i <= n; i++) F[i] /= F[0];
      const aStar = t => { // F decreasing in u; find u with F(u)=t
        let lo = 0, hi = n; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (F[mid] > t) lo = mid; else hi = mid; }
        const f0 = F[lo], f1 = F[hi]; const w = f0 === f1 ? 0 : (f0 - t) / (f0 - f1); return (lo + w) / n;
      };
      const ratio = rho === 0 ? 1 : Math.exp(rho) / (1 - rho);
      const risk = (t, rho_) => { const a = aT(t, rho_), ad = adT(t, rho_); return NU * s * s * ad * ad / (a * a + s * s * (1 - a) * (1 - a)); };
      return { s, rho, Jlin, Jours, Jopt, aStar, ratio, risk };
    }

    // ---- SVG curve chart ----
    const NS = 'http://www.w3.org/2000/svg';
    const CH = { x: 50, y: 14, w: 296, h: 178 };
    function el(n, at) { const e = document.createElementNS(NS, n); for (const k in at) e.setAttribute(k, at[k]); return e; }
    svg.innerHTML = '';
    const grid = el('g', {}); svg.appendChild(grid);
    for (let i = 0; i <= 4; i++) {
      const y = CH.y + CH.h * (1 - i / 4), x = CH.x + CH.w * i / 4;
      grid.appendChild(el('line', { x1: CH.x, x2: CH.x + CH.w, y1: y, y2: y, stroke: '#eef0f5' }));
      grid.appendChild(el('line', { y1: CH.y, y2: CH.y + CH.h, x1: x, x2: x, stroke: '#eef0f5' }));
      const ty = el('text', { x: CH.x - 6, y: y + 4, 'text-anchor': 'end', 'font-size': 10, fill: '#667085', 'font-family': 'Inter, sans-serif' }); ty.textContent = (i / 4).toFixed(2); grid.appendChild(ty);
      const tx = el('text', { x, y: CH.y + CH.h + 14, 'text-anchor': 'middle', 'font-size': 10, fill: '#667085', 'font-family': 'Inter, sans-serif' }); tx.textContent = (i / 4).toFixed(2); grid.appendChild(tx);
    }
    const xl = el('text', { x: CH.x + CH.w / 2, y: 228, 'text-anchor': 'middle', 'font-size': 11, fill: '#2f3850', 'font-family': 'Inter, sans-serif', 'font-weight': 600 }); xl.textContent = 'generative time t'; svg.appendChild(xl);
    const yl = el('text', { x: 11, y: CH.y + CH.h / 2, 'text-anchor': 'middle', 'font-size': 11, fill: '#2f3850', 'font-family': 'Inter, sans-serif', 'font-weight': 600, transform: `rotate(-90 11 ${CH.y + CH.h / 2})` }); yl.textContent = 'source weight a(t)'; svg.appendChild(yl);
    const pLin = el('path', { fill: 'none', stroke: '#9aa3b5', 'stroke-width': 2, 'stroke-dasharray': '5 4' }); svg.appendChild(pLin);
    const pOpt = el('path', { fill: 'none', stroke: '#1e9a82', 'stroke-width': 2, 'stroke-dasharray': '2 3' }); svg.appendChild(pOpt);
    const pOurs = el('path', { fill: 'none', stroke: '#7c5cd6', 'stroke-width': 2.75, 'stroke-linecap': 'round' }); svg.appendChild(pOurs);
    const cursorLine = el('line', { y1: CH.y, y2: CH.y + CH.h, stroke: '#0d1324', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: .5 }); svg.appendChild(cursorLine);
    const cursorDot = el('circle', { r: 5, fill: '#7c5cd6', stroke: '#fff', 'stroke-width': 2 }); svg.appendChild(cursorDot);
    const cursorDotLin = el('circle', { r: 4, fill: '#9aa3b5', stroke: '#fff', 'stroke-width': 1.5 }); svg.appendChild(cursorDotLin);
    const toSVG = (t, a) => [CH.x + t * CH.w, CH.y + (1 - a) * CH.h];
    function pathOf(fn) { let d = ''; for (let i = 0; i <= 100; i++) { const t = i / 100; const [x, y] = toSVG(t, fn(t)); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); } return d; }

    // ---- state & controls ----
    const range = document.getElementById('s-range');
    const outS = document.getElementById('s-out'), outRho = document.getElementById('rho-out'), outRatio = document.getElementById('ratio-out'), outJ = document.getElementById('j-out'), outJopt = document.getElementById('jopt-out');
    let A = analyse(+range.value), Astd = analyse(S_STD);
    let tcur = 0, playing = !reduced, lastT = 0, hold = 0;
    const playBtn = document.getElementById('sched-play');
    const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
    const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>';
    if (playBtn) playBtn.addEventListener('click', () => { playing = !playing; playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY; playBtn.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation'); if (playing) requestAnimationFrame(t => { lastT = t; frame(t); }); });

    function pct(x) { const v = (x - 1) * 100; return (v > 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%'; }
    function updateStatic() {
      A = analyse(+range.value);
      outS.textContent = A.s.toFixed(2);
      outRho.textContent = A.rho.toFixed(3) + (A.rho === 0 ? ' (linear)' : '');
      outRatio.innerHTML = A.ratio.toFixed(2) + '<small>×</small>';
      outJ.textContent = pct(A.Jours / A.Jlin);
      outJopt.textContent = pct(A.Jopt / A.Jlin);
      pLin.setAttribute('d', pathOf(t => 1 - t));
      pOurs.setAttribute('d', pathOf(t => aT(t, A.rho)));
      pOpt.setAttribute('d', pathOf(t => A.aStar(t)));
      render();
    }
    range.addEventListener('input', updateStatic);

    // ---- canvas rendering ----
    const PAN = [
      { x: 64, y: 44, w: 520, h: 290, title: 'Expansion direction', sub: () => `s = ${A.s.toFixed(2)} · ${A.rho > 0 ? 'slow → fast (ρ = ' + A.rho.toFixed(2) + ')' : 'not expanding → linear'}`, color: PURPLE },
      { x: 64, y: 404, w: 520, h: 290, title: 'Non-expanding direction', sub: () => `s = ${S_STD.toFixed(2)} · linear interpolation retained`, color: BLUEGREY },
    ];
    const GAUGE = [{ x: 622, y: 44, w: 118, h: 290 }, { x: 622, y: 404, w: 118, h: 290 }];
    function stats(an, rho, t) { const a = aT(t, rho); const m = (1 - a) * MU1; const v = a * a * NU + (1 - a) * (1 - a) * an.s * an.s * NU; return { a, m, sd: Math.sqrt(v) }; }
    function drawPanel(P, an, rho, G) {
      const sdMax = Math.sqrt(NU) * Math.max(1, an.s);
      const yMin = -2.8 * sdMax - 0.1, yMax = MU1 + 2.8 * sdMax + 0.1;
      const toY = v => P.y + P.h * (1 - (v - yMin) / (yMax - yMin));
      const toX = t => P.x + t * P.w;
      ctx.save();
      // frame
      roundRect(ctx, P.x, P.y, P.w, P.h, 12); ctx.fillStyle = '#f7f8fc'; ctx.fill(); ctx.strokeStyle = '#e3e7ef'; ctx.stroke();
      ctx.fillStyle = '#0d1324'; ctx.font = '700 14px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(P.title, P.x, P.y - 12);
      const tw = ctx.measureText(P.title).width;
      ctx.fillStyle = '#667085'; ctx.font = '500 12px Inter, system-ui, sans-serif'; ctx.fillText(P.sub(), P.x + tw + 12, P.y - 12);
      // y ticks
      ctx.font = '500 10px Inter, system-ui, sans-serif'; ctx.fillStyle = '#8b93a5'; ctx.textAlign = 'right';
      ctx.fillText('0', P.x - 6, toY(0) + 3); ctx.fillText(MU1.toFixed(1), P.x - 6, toY(MU1) + 3);
      ctx.strokeStyle = '#e8ebf2'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(P.x, toY(0)); ctx.lineTo(P.x + P.w, toY(0)); ctx.moveTo(P.x, toY(MU1)); ctx.lineTo(P.x + P.w, toY(MU1)); ctx.stroke(); ctx.setLineDash([]);
      // bands
      const N = 120;
      const band = (k, alpha) => { ctx.beginPath(); for (let i = 0; i <= N; i++) { const t = i / N, s = stats(an, rho, t); const x = toX(t), y = toY(s.m + k * s.sd); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } for (let i = N; i >= 0; i--) { const t = i / N, s = stats(an, rho, t); ctx.lineTo(toX(t), toY(s.m - k * s.sd)); } ctx.closePath(); ctx.fillStyle = rgba(P.color, alpha); ctx.fill(); };
      band(2, 0.12); band(1, 0.22);
      // mean line
      ctx.beginPath(); for (let i = 0; i <= N; i++) { const t = i / N, s = stats(an, rho, t); i ? ctx.lineTo(toX(t), toY(s.m)) : ctx.moveTo(toX(t), toY(s.m)); } ctx.strokeStyle = rgba(P.color, 0.9); ctx.lineWidth = 1.5; ctx.stroke();
      // sample paths
      ctx.lineWidth = 1;
      for (const p of pairs) {
        const y0 = p.z0 * Math.sqrt(NU), y1 = MU1 + p.z1 * an.s * Math.sqrt(NU);
        ctx.beginPath(); for (let i = 0; i <= N; i++) { const t = i / N, a = aT(t, rho); const y = a * y0 + (1 - a) * y1; i ? ctx.lineTo(toX(t), toY(y)) : ctx.moveTo(toX(t), toY(y)); }
        ctx.strokeStyle = rgba(P.color, 0.35); ctx.stroke();
      }
      // cursor
      const cx = toX(tcur), sc = stats(an, rho, tcur);
      ctx.strokeStyle = '#0d1324'; ctx.setLineDash([3, 3]); ctx.globalAlpha = .5; ctx.beginPath(); ctx.moveTo(cx, P.y); ctx.lineTo(cx, P.y + P.h); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      // instantaneous density at the cursor (drawn to the right), clipped to the panel
      ctx.save(); roundRect(ctx, P.x, P.y, P.w, P.h, 12); ctx.clip();
      const dens = []; let dmax = 0; const M = 60;
      for (let i = 0; i <= M; i++) { const v = yMin + (yMax - yMin) * i / M; const d = Math.exp(-0.5 * ((v - sc.m) / sc.sd) ** 2) / sc.sd; dens.push([v, d]); if (d > dmax) dmax = d; }
      ctx.beginPath(); ctx.moveTo(cx, toY(dens[0][0]));
      for (const [v, d] of dens) ctx.lineTo(cx + 54 * d / dmax, toY(v));
      ctx.lineTo(cx, toY(dens[M][0])); ctx.closePath(); ctx.fillStyle = rgba(P.color, 0.28); ctx.fill(); ctx.strokeStyle = rgba(P.color, 0.9); ctx.lineWidth = 1.2; ctx.stroke();
      // dots on sample paths
      for (const p of pairs) { const y0 = p.z0 * Math.sqrt(NU), y1 = MU1 + p.z1 * an.s * Math.sqrt(NU); const y = sc.a * y0 + (1 - sc.a) * y1; ctx.beginPath(); ctx.arc(cx, toY(y), 3.2, 0, Math.PI * 2); ctx.fillStyle = rgba(P.color, 0.95); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.restore();
      // endpoint labels
      ctx.fillStyle = '#667085'; ctx.font = '500 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('source  t = 0', P.x + 6, P.y + P.h - 8); ctx.textAlign = 'right'; ctx.fillText('expert  t = 1', P.x + P.w - 6, P.y + P.h - 8);
      const lbl = `t = ${tcur.toFixed(2)}   a(t) = ${sc.a.toFixed(2)}`, lx = Math.min(Math.max(cx, P.x + 92), P.x + P.w - 92);
      ctx.font = '600 11.5px JetBrains Mono, monospace'; const lw = ctx.measureText(lbl).width + 14;
      roundRect(ctx, lx - lw / 2, P.y + 4, lw, 17, 6); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
      ctx.textAlign = 'center'; ctx.fillStyle = '#0d1324'; ctx.fillText(lbl, lx, P.y + 16);
      // gauge: risk bound R̄(t)
      const Rlin = t => an.risk(t, 0), Rours = t => an.risk(t, rho);
      let rmax = 0; for (let i = 0; i <= 50; i++) { rmax = Math.max(rmax, Rlin(i / 50), Rours(i / 50)); }
      roundRect(ctx, G.x, G.y, G.w, G.h, 12); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#e3e7ef'; ctx.stroke();
      ctx.fillStyle = '#0d1324'; ctx.font = '700 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('risk bound R̄(t)', G.x + G.w / 2, G.y - 12);
      const gx = G.x + 14, gw = G.w - 28, gy = G.y + 18, gh = G.h - 56;
      const toGX = t => gx + t * gw, toGY = r => gy + gh * (1 - r / rmax);
      ctx.strokeStyle = '#eef0f5'; ctx.beginPath(); ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
      ctx.setLineDash([4, 3]); ctx.strokeStyle = '#9aa3b5'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= 50; i++) { const t = i / 50; i ? ctx.lineTo(toGX(t), toGY(Rlin(t))) : ctx.moveTo(toGX(t), toGY(Rlin(t))); } ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = rgba(P.color, 1); ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 50; i++) { const t = i / 50; i ? ctx.lineTo(toGX(t), toGY(Rours(t))) : ctx.moveTo(toGX(t), toGY(Rours(t))); } ctx.stroke();
      // area under ours (integrated)
      ctx.beginPath(); ctx.moveTo(toGX(0), gy + gh); for (let i = 0; i <= 50; i++) { const t = i / 50; ctx.lineTo(toGX(t), toGY(Rours(t))); } ctx.lineTo(toGX(1), gy + gh); ctx.closePath(); ctx.fillStyle = rgba(P.color, 0.10); ctx.fill();
      const gcx = toGX(tcur);
      ctx.strokeStyle = '#0d1324'; ctx.globalAlpha = .5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(gcx, gy); ctx.lineTo(gcx, gy + gh); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(gcx, toGY(Rours(tcur)), 4, 0, Math.PI * 2); ctx.fillStyle = rgba(P.color, 1); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(gcx, toGY(Rlin(tcur)), 3.5, 0, Math.PI * 2); ctx.fillStyle = '#9aa3b5'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#667085'; ctx.font = '500 10.5px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
      const Jl = simpson(Rlin, 200), Jo = simpson(Rours, 200);
      ctx.fillText('∫R̄: ' + (rho > 0 ? pct(Jo / Jl) + ' vs linear' : 'linear'), G.x + G.w / 2, G.y + G.h - 22);
      ctx.fillText('dashed = linear', G.x + G.w / 2, G.y + G.h - 8);
      ctx.restore();
    }
    function render() {
      ctx.clearRect(0, 0, Wc, Hc); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, Wc, Hc);
      drawPanel(PAN[0], A, A.rho, GAUGE[0]);
      drawPanel(PAN[1], Astd, 0, GAUGE[1]);
      // svg cursor
      const [cx] = toSVG(tcur, 0); cursorLine.setAttribute('x1', cx); cursorLine.setAttribute('x2', cx);
      const [dx, dy] = toSVG(tcur, aT(tcur, A.rho)); cursorDot.setAttribute('cx', dx); cursorDot.setAttribute('cy', dy);
      const [lx, ly] = toSVG(tcur, 1 - tcur); cursorDotLin.setAttribute('cx', lx); cursorDotLin.setAttribute('cy', ly);
    }
    function frame(now) {
      if (!playing) return;
      const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016); lastT = now;
      if (vis.visible && !document.hidden) {
        if (hold > 0) { hold -= dt; if (hold <= 0) tcur = 0; }
        else { tcur += dt / 4.6; if (tcur >= 1) { tcur = 1; hold = 0.9; } }
        render();
      }
      requestAnimationFrame(frame);
    }
    updateStatic();
    if (playing) requestAnimationFrame(t => { lastT = t; frame(t); }); else { tcur = 0.55; render(); playBtn && (playBtn.innerHTML = ICON_PLAY); }
  })();
})();
