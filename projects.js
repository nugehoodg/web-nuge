/* Project view (opens from a bento tile) and brand-guideline style PDF export.
   Data: window.PORTFOLIO from data.js (generated from portfolio.json by tools/manifest.py). */
(() => {
  const P = window.PORTFOLIO || [];
  if (!P.length) return;
  const $ = (s, el = document) => el.querySelector(s);
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- project view ---------------- */
  const view = document.createElement('div');
  view.id = 'projectView';
  view.className = 'pv';
  view.setAttribute('role', 'dialog');
  view.setAttribute('aria-modal', 'true');
  view.setAttribute('aria-labelledby', 'pvTitle');
  view.hidden = true;
  view.innerHTML = `
    <div class="pv-bar">
      <span class="pv-index" id="pvIndex"></span>
      <div class="pv-actions">
        <button class="pv-btn" id="pvPrev" aria-label="Previous project">←</button>
        <button class="pv-btn" id="pvNext" aria-label="Next project">→</button>
        <button class="pv-btn" id="pvClose" aria-label="Close project">✕</button>
      </div>
    </div>
    <div class="pv-body" id="pvBody">
      <aside class="pv-side">
        <h2 class="pv-title" id="pvTitle"></h2>
        <p class="pv-summary" id="pvSummary"></p>
        <dl class="pv-meta" id="pvMeta"></dl>
      </aside>
      <div class="pv-plates" id="pvPlates"></div>
    </div>`;
  document.body.appendChild(view);

  let current = -1, lastFocus = null;

  function metaRows(p) {
    const rows = [['Discipline', p.disciplines], ['Year', p.year], ['Role', p.role], ['Pieces', String(p.items.length)]];
    return rows.filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('');
  }
  function plate(it, n, i) {
    const cap = `<figcaption><span>Fig ${pad(n)}.${i + 1}</span>${esc(it.title || '')}</figcaption>`;
    const ratio = `aspect-ratio:${it.w} / ${it.h}`;
    if (it.type === 'video') {
      return `<figure class="pv-plate"><video src="${esc(it.src)}" poster="${esc(it.poster || '')}" style="${ratio}" muted loop playsinline autoplay preload="metadata"></video>${cap}</figure>`;
    }
    return `<figure class="pv-plate"><img src="${esc(it.src)}" alt="${esc(it.title || '')}" style="${ratio}" loading="lazy" decoding="async">${cap}</figure>`;
  }

  function open(i, { push = true } = {}) {
    current = ((i % P.length) + P.length) % P.length;
    const p = P[current];
    $('#pvIndex').textContent = `${pad(current + 1)} / ${pad(P.length)}`;
    $('#pvTitle').textContent = p.title;
    $('#pvSummary').textContent = p.summary || '';
    $('#pvMeta').innerHTML = metaRows(p);
    $('#pvPlates').innerHTML = p.items.map((it, k) => plate(it, current + 1, k)).join('');
    $('#pvBody').scrollTop = 0;
    if (view.hidden) {
      lastFocus = document.activeElement;
      view.hidden = false;
      document.documentElement.classList.add('pv-open');
      requestAnimationFrame(() => view.classList.add('show'));
    }
    $('#pvClose').focus({ preventScroll: true });
    if (push) history.replaceState(null, '', `#project-${p.id}`);
  }
  function close() {
    if (view.hidden) return;
    view.classList.remove('show');
    view.querySelectorAll('video').forEach((v) => v.pause());
    setTimeout(() => { view.hidden = true; $('#pvPlates').innerHTML = ''; }, 220);
    document.documentElement.classList.remove('pv-open');
    history.replaceState(null, '', location.pathname + location.search + '#graphic');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  $('#pvClose').addEventListener('click', close);
  $('#pvPrev').addEventListener('click', () => open(current - 1));
  $('#pvNext').addEventListener('click', () => open(current + 1));
  document.addEventListener('keydown', (e) => {
    if (view.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') open(current + 1);
    else if (e.key === 'ArrowLeft') open(current - 1);
    else if (e.key === 'Tab') { // keep focus inside the dialog
      const f = [...view.querySelectorAll('button, [href], video, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.hidden);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // deep link: #project-<id>
  const fromHash = () => {
    const m = location.hash.match(/^#project-(.+)$/);
    if (!m) { close(); return; } // navigating to any other anchor closes the project
    const i = P.findIndex((p) => p.id === decodeURIComponent(m[1]));
    if (i >= 0) open(i, { push: false });
  };
  addEventListener('hashchange', fromHash);
  if (document.readyState === 'complete') fromHash(); else addEventListener('load', fromHash);

  /* ---------------- brand-guideline PDF ---------------- */
  // A4 landscape pages: cover → contents → foundations (colour + type) → one section per project
  // (section opener + plate pages). Built on demand, printed with window.print(), then removed.
  const SITE = 'anugerah.vercel.app';
  const year = new Date().getFullYear();

  function page(inner, { cls = '', label = '' } = {}) {
    return `<section class="pdf-page ${cls}">${inner}<footer class="pdf-foot"><span>Anugerah — Portfolio${label ? ' · ' + esc(label) : ''}</span><span class="pdf-num"></span></footer></section>`;
  }
  const stillOf = (it) => it.print || (it.type === 'video' ? it.poster : it.src); // print copies keep the PDF small

  function platePages(p, n) {
    // up to 4 plates per page: 1 big for wide pieces, else 2–4 in a grid
    const pages = [];
    let i = 0;
    while (i < p.items.length) {
      const per = p.items.length - i === 1 ? 1 : p.items.length - i === 3 ? 3 : Math.min(4, p.items.length - i);
      const group = p.items.slice(i, i + per);
      const figs = group.map((it, k) => `
        <figure class="pdf-plate"><div class="pdf-img"><img src="${esc(stillOf(it))}" alt=""></div>
        <figcaption><b>Fig ${pad(n)}.${i + k + 1}</b> ${esc(it.title || '')}${it.type === 'video' ? ' <i>(motion, still frame)</i>' : ''}</figcaption></figure>`).join('');
      pages.push(page(`<div class="pdf-head"><span>${pad(n)}</span>${esc(p.title)}</div><div class="pdf-plates n${per}">${figs}</div>`, { label: p.title }));
      i += per;
    }
    return pages.join('');
  }

  function buildDoc(indices) {
    const all = indices.length === P.length;
    const parts = [];
    if (all) {
      parts.push(`<section class="pdf-page pdf-cover">
        <img class="pdf-stamp" src="stamp.png" alt="">
        <div class="pdf-cover-t"><h1>Anugerah</h1><p>Portfolio — Project Guide</p></div>
        <div class="pdf-cover-f"><span>Creative Designer</span><span>${year}</span><span>${SITE}</span></div>
      </section>`);
      parts.push(page(`<div class="pdf-head"><span>00</span>Contents</div>
        <ol class="pdf-toc">${['Foundations', ...indices.map((i) => P[i].title)].map((t, k) =>
          `<li><span>${pad(k)}</span>${esc(t)}<em>${k === 0 ? 'Colour · Type' : esc(P[indices[k - 1]].disciplines)}</em></li>`).join('')}</ol>`, { label: 'Contents' }));
      parts.push(page(`<div class="pdf-head"><span>00</span>Foundations</div>
        <div class="pdf-found">
          <div><h3>Colour</h3><div class="pdf-swatches">
            ${[['Ink', '#0A0A0A', '#0a0a0a', '#fff'], ['Paper', '#FFFFFF', '#ffffff', '#0a0a0a'], ['Chip', '#F2F2F2', '#f2f2f2', '#0a0a0a'], ['Stamp', '#D38200', '#d38200', '#0a0a0a']]
              .map(([n, hex, bg, fg]) => `<div class="pdf-sw" style="background:${bg};color:${fg}"><b>${n}</b><span>${hex}</span></div>`).join('')}
          </div></div>
          <div><h3>Type</h3>
            <p class="pdf-spec" style="font-weight:300">Aa — Neue Haas Grotesk Display Light</p>
            <p class="pdf-spec" style="font-weight:200">Aa — Neue Haas Grotesk Display XThin</p>
            <p class="pdf-spec pdf-text">Aa — Neue Haas Grotesk Text Roman</p>
          </div>
        </div>`, { label: 'Foundations' }));
    }
    indices.forEach((i) => {
      const p = P[i], n = i + 1;
      const meta = [['Discipline', p.disciplines], ['Year', p.year], ['Role', p.role], ['Pieces', String(p.items.length)]].filter(([, v]) => v);
      parts.push(page(`
        <div class="pdf-open">
          <div class="pdf-open-l">
            <span class="pdf-bignum">${pad(n)}</span>
            <h2>${esc(p.title)}</h2>
            ${p.summary ? `<p class="pdf-summary">${esc(p.summary)}</p>` : ''}
            <table class="pdf-meta">${meta.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table>
          </div>
          <div class="pdf-open-r"><img src="${esc(stillOf(p.items.find((x) => x.src === p.cover) || p.items[0]))}" alt=""></div>
        </div>`, { label: p.title }));
      parts.push(platePages(p, n));
    });
    return parts.join('');
  }

  async function printDoc(indices) {
    document.getElementById('printDoc')?.remove();
    const doc = document.createElement('div');
    doc.id = 'printDoc';
    doc.innerHTML = buildDoc(indices);
    const first = indices.length === P.length ? 2 : 1; // the cover is page 1 and carries no number
    doc.querySelectorAll('.pdf-num').forEach((el, k) => { el.textContent = pad(k + first); });
    document.body.appendChild(doc);
    document.documentElement.classList.add('printing');
    // wait for every image so nothing prints blank
    await Promise.all([...doc.querySelectorAll('img')].map((img) =>
      img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; })));
    await document.fonts.ready;
    document.documentElement.classList.add('print-ready');
    const done = () => { document.documentElement.classList.remove('printing', 'print-ready'); doc.remove(); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done);
    window.print();
  }

  window.ProjectView = { open, close, print: printDoc, printAll: () => printDoc(P.map((_, i) => i)) };
  document.getElementById('pdfBtn')?.addEventListener('click', () => window.ProjectView.printAll());
})();
