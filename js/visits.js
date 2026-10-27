/* Footer visitor counter.
   Default provider: hits.sh — free, no sign-up. One badge request per page load = one page view.
   The counter key is derived from the page URL (host + path), so local previews count under their own
   key and never touch the live counter (morpheus-an.github.io/TOPS).
   Optional provider: GoatCounter — set data-goatcounter="CODE" on #visits (see README). Shows page views
   AND unique visitors as native text, with a private dashboard at https://CODE.goatcounter.com. */
(function () {
  const root = document.getElementById('visits');
  if (!root) return;
  const chips = document.getElementById('visits-chips');
  const note = document.getElementById('visits-note');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SINCE = '27 Oct 2026';
  const fmt = n => new Intl.NumberFormat('en-US').format(n);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const chip = (label, valueNode) => { const c = el('span', 'chip'); c.append(el('span', 'lab', label), valueNode); return c; };

  const code = (root.dataset.goatcounter || '').trim();
  if (code) goatcounter(code); else hitsSh();

  /* ---- hits.sh: the badge image is both the counting request and the display ---- */
  function hitsSh() {
    const key = location.host + location.pathname.replace(/index\.html$/i, '').replace(/\/+$/, '');
    const img = new Image();
    img.alt = 'page views today / total';
    img.decoding = 'async';
    img.addEventListener('error', () => { img.replaceWith(el('b', 'val', '—')); root.classList.add('is-off'); });
    img.src = 'https://hits.sh/' + key + '.svg?view=today-total&style=flat-square&label=%20&color=2b5fb4';
    chips.append(chip('page views', img));
    if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(location.host)) note.append(' (Local preview: separate counter key.)');
  }

  /* ---- GoatCounter: count.js records the view; /counter/TOTAL.json reports views + unique visitors ---- */
  function goatcounter(code) {
    const base = 'https://' + encodeURIComponent(code) + '.goatcounter.com';
    const s = document.createElement('script');
    s.async = true; s.src = 'https://gc.zgo.at/count.js'; s.dataset.goatcounter = base + '/count';
    document.head.appendChild(s);

    const views = el('b', 'val', '…'), uniq = el('b', 'val', '…');
    chips.append(chip('page views', views), chip('visitors', uniq));
    note.innerHTML = 'Page views and unique visitors since ' + SINCE + ' · counted by <a href="https://www.goatcounter.com" target="_blank" rel="noopener">GoatCounter</a>, no cookies.';

    const num = v => parseInt(String(v).replace(/\D/g, ''), 10) || 0;
    let data = null, visible = false, done = false;
    const maybeAnimate = () => { if (done || !data || !visible) return; done = true; countUp(views, data.count); countUp(uniq, data.unique); };
    new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { visible = true; io.disconnect(); maybeAnimate(); } }, { threshold: 0.2 }).observe(root);
    fetch(base + '/counter/TOTAL.json', { mode: 'cors' })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(d => { data = { count: num(d.count), unique: num(d.count_unique) }; maybeAnimate(); })
      .catch(() => { views.textContent = '—'; uniq.textContent = '—'; root.classList.add('is-off'); });
  }

  function countUp(node, to) {
    if (reduced || to < 10) { node.textContent = fmt(to); return; }
    const dur = 1400, t0 = performance.now();
    const step = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); node.textContent = fmt(Math.round(to * e)); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
})();
