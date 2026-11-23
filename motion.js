/* Subtle entrance motion + back-to-top.
   Every revealed element gets data-reveal="<kind>" and a stagger index (--i); an IntersectionObserver
   adds .in once, the first time it enters the viewport. Uses the individual `translate` / `scale`
   CSS properties so it composes with transforms the site already sets (tiles, box items, car).
   Reduced motion: CSS turns every kind into a short plain fade. */
(() => {
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const mark = (els, kind = 'up', start = 0, step = 1) => {
    els.forEach((el, k) => {
      if (!el || el.dataset.reveal) return;
      el.dataset.reveal = kind;
      el.style.setProperty('--i', String(start + k * step));
    });
  };

  // Landing: nav drops in, the title rises in after it
  mark($$('.top-nav > *'), 'drop');
  mark([document.querySelector('.hero-title h1'), document.querySelector('.hero-title p')], 'up', 3, 2);
  // the divider between the first two screens draws from the left
  mark([document.querySelector('.divider')], 'line');
  // Graphic Design: title, print link, tiles one after another, the road draws, controls fade
  mark([document.querySelector('#graphic .section-title'), document.getElementById('pdfBtn')], 'up', 0, 2);
  mark($$('#track .tile').sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left), 'tile', 2);
  mark([document.getElementById('roadWrap')], 'draw', 4);
  mark([document.querySelector('.gd-bottom')], 'fade', 8);
  // Video Editing: header, preview settles, clips step in along the timeline
  mark([document.querySelector('.ve-header h2'), document.querySelector('.ve-project')], 'up', 0, 2);
  mark([document.querySelector('.ve-preview')], 'scale', 3);
  mark([document.querySelector('.ve-label')], 'fade', 5);
  mark($$('.clip'), 'up', 6);
  // About: the box rises, the things inside drop in
  mark([document.querySelector('.box-img')], 'up', 0);
  mark($$('.item'), 'drop', 3, 2);
  mark([document.querySelector('.stamp')], 'stamp', 1);

  const els = $$('[data-reveal]');
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  // tiles and clips live inside horizontal scrollers, where most of them are never "in view":
  // reveal each whole group (in stagger order) when its scroller comes into view
  const groups = [[document.getElementById('gallery'), $$('#track .tile')], [document.getElementById('veScroll'), $$('.clip')]];
  const grouped = new Set(groups.flatMap(([, list]) => list));
  groups.forEach(([box, list]) => {
    if (!box || !list.length) return;
    const gio = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      list.forEach((t) => t.classList.add('in'));
      gio.disconnect();
    }, { threshold: 0.2 });
    gio.observe(box);
  });
  els.filter((el) => !grouped.has(el)).forEach((el) => io.observe(el));
  // safety net: anything already scrolled past (e.g. after jumping via a link) is revealed too
  const pending = () => els.filter((el) => !el.classList.contains('in'));
  const catchUp = () => {
    pending().forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('in'); });
    if (!pending().length) removeEventListener('scroll', onScroll);
  };
  let ticking = false;
  const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; catchUp(); }); };
  addEventListener('scroll', onScroll, { passive: true });
  setTimeout(catchUp, 2500);

  /* ---------- back to top ---------- */
  const top = document.createElement('button');
  top.className = 'to-top';
  top.type = 'button';
  top.setAttribute('aria-label', 'Back to top');
  top.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Top</span>';
  document.body.appendChild(top);
  top.addEventListener('click', () => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    document.querySelector('.top-nav a, .top-nav button')?.focus({ preventScroll: true });
  });
  // show once the bottom of the page is reached (the last screen is in view)
  const sync = () => {
    const doc = document.documentElement;
    const nearBottom = scrollY + innerHeight >= doc.scrollHeight - innerHeight * 0.35;
    top.classList.toggle('show', nearBottom && scrollY > innerHeight);
  };
  addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
  sync();
})();
