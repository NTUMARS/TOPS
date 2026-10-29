# TOPS project page

Static project website for **TOPS: Reshaping Flow Source and Transport for Multi-Task Robot Manipulation**.

## Preview locally

Any static file server works. The bundled one supports HTTP range requests (needed for smooth video seeking):

```bash
cd website
node serve.js . 8765      # then open http://127.0.0.1:8765/
# or: python3 -m http.server 8765
```

## Layout

- `index.html` – the page (hero, abstract, motivation, method explainers, results, real-world demos, BibTeX)
- `css/style.css` – styles
- `js/hero.js` – hero background: particles flowing from source distributions to task targets (Standard FM vs TOPS)
- `js/method.js` – interactive explainers A (flow reversal → task sources) and B (spectral scheduling, exact Gaussian-endpoint maths)
- `js/main.js` – nav, scroll reveals, results table marks, π0.5 bars, real-world chart, video gallery, BibTeX copy
- `assets/figs/` – paper figures rendered from the PDF sources at 220 dpi
- `assets/videos/` – real-world rollouts transcoded to 720p H.264 (+ poster frames) and the full demo reel
- `TOPS_final.pdf` – the paper

## Deployment (GitHub Pages)

The site is published at **https://ntumars.github.io/TOPS/** from the `gh-pages` branch of
[NTUMARS/TOPS](https://github.com/NTUMARS/TOPS). The site source lives **only** on `gh-pages`; the `main` branch is
reserved for the code release (currently a README announcing that the code is coming soon).
(The repo started as `Morpheus-An/TOPS` and was transferred to the NTUMARS organisation on 27 Oct 2026. GitHub does
not redirect Pages after a transfer, so the old `morpheus-an.github.io/TOPS` URL returns 404.)

To publish an update, commit on `gh-pages` in this folder and push it:

```bash
git push origin gh-pages
```

A "pages build and deployment" run appears under the repo's Actions tab; the site refreshes within a minute or two.

## Visitor counter

The footer shows a live page-view counter (`js/visits.js`, markup in the footer of `index.html`).

* **Default: [hits.sh](https://hits.sh)** — free, no sign-up, no cookies. The badge image *is* the counting
  request (one per page load = one view) and shows `today / total`. The counter key is derived from the page URL,
  so the live site counts under `ntumars.github.io/TOPS` while local previews count under their own key.
  If hits.sh is unreachable the chip shows `—` instead of a broken image.
* **Optional upgrade: [GoatCounter](https://www.goatcounter.com)** — adds *unique visitors* and a private
  dashboard (countries, referrers). Create a site there (pick a code such as `tops`), enable *Settings → Allow
  adding visitor counts on your website*, then set `data-goatcounter="tops"` on `#visits` in `index.html`.
  The module switches to native, animated numbers automatically; nothing else changes.
* Not used: busuanzi (不蒜子). Its counting endpoint was returning 502s at build time, and it keys counts by the
  `Referer` header, which browsers (Safari especially) trim to the origin for cross-site requests — on a shared
  `*.github.io` host that merges this page with your other GitHub Pages sites.

## Notes

* The hero buttons link to the arXiv PDF (`https://arxiv.org/pdf/2610.36694v1`) and the GitHub repo; the BibTeX block carries the arXiv id.
* Fonts and KaTeX load from Google Fonts / jsDelivr; the page still renders without network, with system fonts and raw LaTeX.
