/* Page behaviour: nav, reveal, counters, table marks, pi0.5 bars, real-world chart, video gallery, bibtex */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- nav ---- */
  const nav = $('#nav');
  const hero = $('.hero');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > ((hero ? hero.offsetHeight : 600) - 64));
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---- reveal on scroll ---- */
  const revealIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => revealIO.observe(el));

  /* ---- counters ---- */
  function animateCount(el) {
    const to = parseFloat(el.dataset.to), dec = parseInt(el.dataset.decimals || '0', 10);
    if (reduced) { el.textContent = to.toFixed(dec); return; }
    const dur = 1500, t0 = performance.now();
    const step = now => { const p = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - p, 3); el.textContent = (to * e).toFixed(dec); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  const countIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { animateCount(e.target); countIO.unobserve(e.target); } }), { threshold: 0.5 });
  $$('.count').forEach(el => countIO.observe(el));

  /* ---- results table: mark best / second best per column ---- */
  (function markTable() {
    const tbl = $('#tbl-main'); if (!tbl) return;
    const heads = $$('thead tr:last-child th', tbl);
    const rows = $$('tbody tr', tbl);
    heads.forEach((th, ci) => {
      const mode = th.dataset.best; if (!mode) return;
      const cells = rows.map(r => r.children[ci]).filter(c => c && c.dataset.v !== undefined);
      const vals = cells.map(c => parseFloat(c.dataset.v));
      const uniq = Array.from(new Set(vals)).sort((a, b) => mode === 'max' ? b - a : a - b);
      cells.forEach((c, i) => { if (vals[i] === uniq[0]) c.classList.add('best'); else if (uniq.length > 1 && vals[i] === uniq[1]) c.classList.add('second'); });
    });
  })();

  /* ---- pi0.5 bars ---- */
  const barIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { $$('.fill', e.target).forEach(f => { f.style.width = (parseFloat(f.dataset.w) / parseFloat(f.dataset.max) * 100).toFixed(1) + '%'; }); barIO.unobserve(e.target); } }), { threshold: 0.4 });
  $$('.pi-card').forEach(c => barIO.observe(c));

  /* ---- real-world chart ---- */
  (function rwChart() {
    const host = $('#rw-svg'); if (!host) return;
    const METHODS = [{ id: 'fm', name: 'Standard FM', color: '#b57a2a' }, { id: 'pg', name: 'PriorGrad', color: '#1e9a82' }, { id: 'ours', name: 'TOPS (ours)', color: '#2b5fb4' }];
    const SUITES = [
      { name: 'Drawer Opening', tasks: [{ name: 'Upper', v: [20, 40, 80] }, { name: 'Lower', v: [20, 15, 50] }, { name: 'Avg.', v: [20, 27.5, 65], avg: true }] },
      { name: 'Color Matching', tasks: [{ name: 'Purple', v: [75, 80, 95] }, { name: 'Black', v: [55, 55, 75] }, { name: 'Avg.', v: [65, 67.5, 85], avg: true }] },
      { name: 'Pick-Vegetable', tasks: [{ name: 'Daikon', v: [100, 100, 100] }, { name: 'Corn', v: [100, 100, 100] }, { name: 'Mango', v: [0, 35, 50] }, { name: 'Peach', v: [40, 50, 70] }, { name: 'Avg.', v: [60, 71.3, 80], avg: true }] },
    ];
    const NS = 'http://www.w3.org/2000/svg';
    const el = (n, at, parent) => { const e = document.createElementNS(NS, n); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
    const W = 1100, H = 320, ML = 44, MR = 10, MT = 44, MB = 40;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Grouped bar chart of real-world success rates for Standard FM, PriorGrad and TOPS across eight tasks' }, host);
    const plotW = W - ML - MR, plotH = H - MT - MB;
    const y = v => MT + plotH * (1 - v / 100);
    // grid
    for (let v = 0; v <= 100; v += 20) {
      el('line', { x1: ML, x2: W - MR, y1: y(v), y2: y(v), stroke: v === 0 ? '#cfd6e4' : '#eef0f5' }, svg);
      const t = el('text', { x: ML - 8, y: y(v) + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#667085', 'font-family': 'Inter, sans-serif' }, svg); t.textContent = v;
    }
    const nGroups = SUITES.reduce((a, s) => a + s.tasks.length, 0);
    const gapSuite = 26, groupW = (plotW - gapSuite * (SUITES.length - 1)) / nGroups, barW = Math.min(22, groupW / 4.2), inner = 2;
    const bars = []; let gx = ML; const tip = $('#rw-tip'), chart = $('#rw-chart');
    SUITES.forEach((s, si) => {
      const start = gx;
      s.tasks.forEach(task => {
        if (task.avg) el('rect', { x: gx + 2, y: MT - 6, width: groupW - 4, height: plotH + 6, fill: '#f3f5f9', rx: 6 }, svg);
        const cx = gx + groupW / 2, x0 = cx - (3 * barW + 2 * inner) / 2;
        task.v.forEach((v, mi) => {
          const bx = x0 + mi * (barW + inner);
          const r = el('rect', { x: bx, y: y(0), width: barW, height: 0, fill: METHODS[mi].color, rx: 3, opacity: mi === 2 ? 1 : 0.78 }, svg);
          r.dataset.v = v; bars.push({ r, v, task: task.name, suite: s.name, m: METHODS[mi].name, cx: bx + barW / 2 });
          const hit = el('rect', { x: bx - 2, y: MT, width: barW + 4, height: plotH, fill: 'transparent' }, svg);
          hit.addEventListener('mouseenter', () => { tip.innerHTML = `<b>${METHODS[mi].name}</b> · ${s.name} / ${task.name}: <b>${v}%</b>`; const cb = chart.getBoundingClientRect(), hb = r.getBoundingClientRect(); tip.style.left = (hb.left - cb.left + hb.width / 2) + 'px'; tip.style.top = (hb.top - cb.top) + 'px'; tip.classList.add('show'); });
          hit.addEventListener('mouseleave', () => tip.classList.remove('show'));
          if (mi === 2) { const t = el('text', { x: bx + barW / 2, y: y(v) - 6, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#1d4a94', 'font-family': 'Inter, sans-serif' }, svg); t.textContent = v; t.dataset.label = '1'; t.setAttribute('opacity', 0); bars[bars.length - 1].label = t; }
        });
        const t = el('text', { x: cx, y: H - MB + 18, 'text-anchor': 'middle', 'font-size': 12.5, fill: task.avg ? '#0d1324' : '#2f3850', 'font-family': 'Inter, sans-serif', 'font-weight': task.avg ? 700 : 500 }, svg); t.textContent = task.name;
        gx += groupW;
      });
      // suite header bracket
      const end = gx;
      el('line', { x1: start + 4, x2: end - 4, y1: MT - 18, y2: MT - 18, stroke: '#cfd6e4', 'stroke-width': 1.5 }, svg);
      const t = el('text', { x: (start + end) / 2, y: MT - 24, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#0d1324', 'font-family': 'Inter, sans-serif' }, svg); t.textContent = s.name;
      const bg = el('rect', { x: (start + end) / 2 - t.getComputedTextLength() / 2 - 8, y: MT - 36, width: t.getComputedTextLength() + 16, height: 18, fill: '#fff' }, svg); svg.insertBefore(bg, t);
      gx += gapSuite;
    });
    const ylab = el('text', { x: 12, y: MT + plotH / 2, 'text-anchor': 'middle', 'font-size': 11.5, fill: '#2f3850', 'font-weight': 600, 'font-family': 'Inter, sans-serif', transform: `rotate(-90 12 ${MT + plotH / 2})` }, svg); ylab.textContent = 'success rate (%)';
    // animate
    function grow() {
      const t0 = performance.now();
      const step = now => {
        let done = true;
        bars.forEach((b, i) => { const p = Math.min(1, Math.max(0, (now - t0 - i * 18) / 700)); const e = 1 - Math.pow(1 - p, 3); const h = (plotH * b.v / 100) * e; b.r.setAttribute('y', y(0) - h); b.r.setAttribute('height', h); if (b.label) b.label.setAttribute('opacity', p); if (p < 1) done = false; });
        if (!done) requestAnimationFrame(step);
      };
      if (reduced) { bars.forEach(b => { const h = plotH * b.v / 100; b.r.setAttribute('y', y(0) - h); b.r.setAttribute('height', h); if (b.label) b.label.setAttribute('opacity', 1); }); return; }
      requestAnimationFrame(step);
    }
    new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { grow(); io.disconnect(); } }, { threshold: 0.3 }).observe(host);
    // table view
    const tbl = $('#rw-table');
    let html = '<table class="mini-table"><thead><tr><th>Method</th>';
    SUITES.forEach(s => s.tasks.forEach(t => { html += `<th>${t.name === 'Avg.' ? s.name.split(' ')[0] + ' avg.' : t.name}</th>`; }));
    html += '</tr></thead><tbody>';
    METHODS.forEach((m, mi) => { html += `<tr${mi === 2 ? ' class="ours"' : ''}><td>${m.name}</td>`; SUITES.forEach(s => s.tasks.forEach(t => { html += `<td>${t.v[mi]}</td>`; })); html += '</tr>'; });
    html += '</tbody></table>'; tbl.innerHTML = html;
    const tog = $('#rw-table-toggle'); tog.addEventListener('click', () => { const on = chart.classList.toggle('table-mode'); tog.textContent = on ? 'Chart view' : 'Table view'; });
  })();

  /* ---- video gallery ---- */
  (function gallery() {
    const root = $('#gallery'); if (!root) return;
    const METHODS = [{ id: 'fm', name: 'Standard FM' }, { id: 'pg', name: 'PriorGrad' }, { id: 'ours', name: 'TOPS (ours)' }];
    const SUITES = [
      { id: 'drawer', name: 'Drawer Opening', prefix: 'Drawer-Opening', tasks: [
        { id: 'upper', name: 'Upper drawer', instr: 'open the upper drawer', files: ['upper_fail_fm', 'upper_fail_priorgrad', 'upper_success_ours'], sr: [20, 40, 80] },
        { id: 'lower', name: 'Lower drawer', instr: 'open the lower drawer', files: ['lower_fail_fm', 'lower_fail_priorgrad', 'lower_success_ours'], sr: [20, 15, 50] }] },
      { id: 'color', name: 'Color Matching', prefix: 'Color-Matching', tasks: [
        { id: 'purple', name: 'Purple cube', instr: 'place the purple cube into the purple tray', files: ['purple_fail_fm', 'purple_fail_priorgrad', 'purple_success_ours'], sr: [75, 80, 95] },
        { id: 'black', name: 'Black cube', instr: 'place the black cube into the black tray', files: ['black_fail_fm', 'black_fail_priorgrad', 'black_success_ours'], sr: [55, 55, 75] }] },
      { id: 'veg', name: 'Pick-Vegetable', prefix: 'Pick-Vegetable', tasks: [
        { id: 'daikon', name: 'Daikon', instr: 'put the daikon in the box', files: ['daikon_success_fm', 'daikon_success_priorgrad', 'daikon_success_ours'], sr: [100, 100, 100] },
        { id: 'corn', name: 'Corn', instr: 'put the corn in the box', files: ['corn_success_fm', 'corn_success_priorgrad', 'corn_success_ours'], sr: [100, 100, 100] },
        { id: 'mango', name: 'Mango', instr: 'put the mango in the box', files: ['mango_fail_fm', 'mango_fail_priorgrad', 'mango_success_ours'], sr: [0, 35, 50] },
        { id: 'peach', name: 'Peach', instr: 'put the peach in the box', files: ['peach_fail_fm', 'peach_fail_priorgrad', 'peach_success_ours'], sr: [40, 50, 70] }] },
    ];
    const tabs = $('#suite-tabs'), chips = $('#task-chips'), grid = $('#video-grid'), instr = $('#instr-text');
    let suite = SUITES[0], task = suite.tasks[0], inView = false;
    const vidIO = new IntersectionObserver(es => { inView = es[0].isIntersecting; $$('video', grid).forEach(v => { if (inView) v.play().catch(() => {}); else v.pause(); }); }, { threshold: 0.25 });
    vidIO.observe(grid);
    function renderTabs() {
      tabs.innerHTML = ''; SUITES.forEach(s => { const b = document.createElement('button'); b.type = 'button'; b.textContent = s.name; b.setAttribute('role', 'tab'); b.classList.toggle('active', s === suite); b.addEventListener('click', () => { suite = s; task = s.tasks[0]; renderTabs(); renderChips(); renderGrid(); }); tabs.appendChild(b); });
    }
    function renderChips() {
      chips.innerHTML = ''; suite.tasks.forEach(t => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t.name; b.setAttribute('role', 'tab'); b.classList.toggle('active', t === task); b.addEventListener('click', () => { task = t; renderChips(); renderGrid(); }); chips.appendChild(b); });
    }
    function renderGrid() {
      instr.textContent = task.instr;
      grid.innerHTML = '';
      METHODS.forEach((m, i) => {
        const f = task.files[i], ok = /success/.test(f), base = `assets/videos/${suite.prefix}_${f}`;
        const card = document.createElement('div'); card.className = 'vcard' + (m.id === 'ours' ? ' ours' : '');
        card.innerHTML = `<span class="ribbon badge ${ok ? 'ok' : 'fail'}">${ok ? '✓ success' : '✗ fail'}</span>
          <video muted loop playsinline preload="metadata" poster="${base}.jpg" aria-label="${m.name}, ${task.name}, ${ok ? 'success' : 'failure'}"><source src="${base}.mp4" type="video/mp4"></video>
          <div class="meta"><span>${m.name}</span><span style="font-weight:500;opacity:.75">SR ${task.sr[i]}%</span></div>`;
        grid.appendChild(card);
        const v = $('video', card); if (inView) v.play().catch(() => {});
      });
    }
    $('#replay-btn').addEventListener('click', () => { $$('video', grid).forEach(v => { v.currentTime = 0; v.play().catch(() => {}); }); });
    renderTabs(); renderChips(); renderGrid();
  })();

  /* ---- bibtex copy ---- */
  const toast = $('#toast');
  function showToast(msg) { toast.textContent = msg; toast.classList.add('show'); clearTimeout(showToast._t); showToast._t = setTimeout(() => toast.classList.remove('show'), 1800); }
  const copyBtn = $('#bib-copy');
  if (copyBtn) copyBtn.addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#bib-text').textContent); showToast('BibTeX copied to clipboard'); } catch (e) { showToast('Copy failed — select the text manually'); } });

  /* ---- placeholder links ---- */
  $$('a[aria-disabled="true"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); showToast(a.title || 'Link coming soon'); }));
})();
