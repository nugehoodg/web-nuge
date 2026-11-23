/* Anugerah — portfolio
   Sections: orbit landing · car-driven gallery with physics · video editor · box of things */
(() => {
  const DESIGNS = window.DESIGNS || [];
  const VIDEOS = window.VIDEOS || [];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  /* Track which sections are on screen so idle ones don't burn frames. */
  const visible = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const on = e.target.id === 'video' ? e.intersectionRatio >= 0.35 : e.isIntersecting;
      on ? visible.add(e.target.id) : visible.delete(e.target.id);
    });
    onVisibilityChange();
  }, { threshold: [0, 0.35] });
  document.querySelectorAll('.screen').forEach((s) => io.observe(s));

  /* =========================================================
     1. LANDING — designs orbiting on a tilted 3D ring
     ========================================================= */
  const orbit = (() => {
    const stage = $('#orbit');
    const N = 16;
    let cards = [];
    let w = innerWidth, h = innerHeight;

    function build() {
      stage.innerHTML = '';
      // Prefer portrait-ish pieces: they read like posters on the ring.
      const pool = shuffle(DESIGNS.filter((d) => d.h / d.w > 0.9));
      const picks = (pool.length >= N ? pool : shuffle(DESIGNS)).slice(0, N);
      cards = picks.map((d, i) => {
        const el = document.createElement('div');
        el.className = 'orbit-card';
        const img = new Image();
        img.src = d.src; img.alt = ''; img.decoding = 'async';
        el.appendChild(img);
        stage.appendChild(el);
        return { el, phase: (i / N) * Math.PI * 2, spin: (Math.random() - 0.5) * 10, blur: -1, ratio: d.h / d.w };
      });
    }

    function frame(t) {
      const s = t / 1000;
      const portrait = w < h;
      // ring size and card size scale with the viewport
      const R = portrait ? w * 0.9 : clamp(w * 0.5, 380, 1500);
      const cw = portrait ? clamp(w * 0.26, 84, 200) : clamp(Math.min(w * 0.125, h * 0.24), 90, 320);
      // gentle sway of the ring's tilt (independent of the cursor)
      const tiltZ = ((portrait ? 34 : 24) + Math.sin(s * 0.45) * 4) * Math.PI / 180;
      const tiltX = (-13 + Math.sin(s * 0.33) * 5) * Math.PI / 180;
      // the orbit itself: one full revolution roughly every 24s
      const spin = s * (reduceMotion ? 0.04 : 0.26);
      const cx = w * 0.5, cy = h * (portrait ? 0.44 : 0.42);
      const f = Math.max(w, h) * 2.2;
      const cosZ = Math.cos(tiltZ), sinZ = Math.sin(tiltZ), cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);

      for (const c of cards) {
        const a = c.phase + spin;
        let x = R * Math.sin(a), y = Math.sin(s * 0.8 + c.phase * 3) * 10, z = R * Math.cos(a);
        const y1 = y * cosX - z * sinX, z1 = y * sinX + z * cosX;
        const x2 = x * cosZ - y1 * sinZ, y2 = x * sinZ + y1 * cosZ;
        const k = f / (f - z1 * 0.9);
        const sx = cx + x2 * k, sy = cy + y2 * k;
        const depth = clamp((R - z) / (2 * R), 0, 1); // 0 near, 1 far
        // cards turn with the ring as they travel around it
        const yaw = Math.sin(a) * 50;
        const rot = tiltZ * 180 / Math.PI * 0.6 + c.spin + Math.sin(s * 0.6 + c.phase) * 3;
        c.el.style.setProperty('--cw', cw + 'px');
        c.el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%) scale(${k}) rotate(${rot}deg) perspective(900px) rotateY(${yaw}deg)`;
        c.el.style.zIndex = String(Math.round(1000 + z1));
        const blur = Math.round(Math.max(0, depth - 0.42) * 22 * 2) / 2;
        if (blur !== c.blur) { c.el.style.filter = blur ? `blur(${blur}px)` : 'none'; c.blur = blur; }
        c.el.style.opacity = String(1 - Math.max(0, depth - 0.75) * 1.6);
      }
    }

    addEventListener('resize', () => { w = innerWidth; h = innerHeight; });
    $('#diceBtn').addEventListener('click', () => {
      stage.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220 }).onfinish = () => {
        build();
        stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
      };
    });
    build();
    return { frame };
  })();

  /* =========================================================
     2. GRAPHIC DESIGN — drive the car, wobble the road, smash it
     ========================================================= */
  const gallery = (() => {
    const section = $('#graphic');
    const track = $('#track');
    const scroller = $('#gallery');
    const roadWrap = $('#roadWrap');
    const roadPath = $('#roadPath');
    const roadSvg = $('#road');
    const car = $('#car');
    const btn = $('#destroyBtn');
    const hint = $('#gdHint');
    let CAR = 52;
    let ROAD_Y = 70; // dotted line height inside the 80px road box

    // Bento of projects from portfolio.json (grouped in tools/manifest.py); one tile per project,
    // clicking a tile opens the project (projects.js). Falls back to one tile per design.
    const PORTFOLIO = (window.PORTFOLIO && window.PORTFOLIO.length) ? window.PORTFOLIO
      : (window.PROJECTS || []).map((d, i) => ({ id: 'p' + i, title: d.title, disciplines: (d.tags || []).join(' · '), summary: '', cover: d.src, items: [d] }));
    const items = PORTFOLIO.map((p, i) => {
      const cover = p.items.find((it) => it.src === p.cover) || p.items[0];
      const el = document.createElement('figure');
      el.className = 'design tile';
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Open project: ${p.title}`);
      let img;
      if (cover.type === 'video') {
        img = document.createElement('video');
        img.muted = true; img.loop = true; img.playsInline = true; img.preload = 'none';
        if (cover.poster) img.poster = cover.poster;
      } else {
        img = document.createElement('img');
        img.alt = ''; img.decoding = 'async'; img.draggable = false;
      }
      img.className = 'tile-media';
      el.appendChild(img);
      const cap = document.createElement('figcaption');
      cap.className = 'tile-info';
      cap.innerHTML = '<span class="tile-num"></span><strong></strong><small></small>';
      cap.children[0].textContent = String(i + 1).padStart(2, '0');
      cap.children[1].textContent = p.title;
      cap.children[2].textContent = `${p.disciplines}${p.disciplines ? ' · ' : ''}${p.items.length} ${p.items.length === 1 ? 'piece' : 'pieces'}`;
      el.appendChild(cap);
      el.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !physics) { e.preventDefault(); window.ProjectView && window.ProjectView.open(i); }
      });
      track.appendChild(el);
      return { d: cover, p, idx: i, el, img, loaded: false, playing: false, w: 0, h: 0, hx: 0, hy: 0, x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, r: 0 };
    });
    // a plain click (not a drag, not in Destroy mode) opens the project
    track.addEventListener('click', (e) => {
      const el = e.target.closest('.tile');
      if (!el || physics || arranging) return;
      const it = items.find((x) => x.el === el);
      if (it && window.ProjectView) window.ProjectView.open(it.idx);
    });

    let vw = 0, vh = 0, trackW = 0, roadW = 0;
    let carX = 0, carTarget = 0, prevCarX = 0, facing = 1;
    let scroll = 0;
    let driving = false; // true while the car is steering the scroll position
    let wobbleA = 0, wobbleT = 0;
    let physics = false, arranging = 0;
    let floorY = 0;
    let carDrag = null;
    let held = null, heldOff = { x: 0, y: 0 }, heldPrev = { x: 0, y: 0, t: 0 };

    function layout() {
      vw = section.clientWidth; vh = section.clientHeight;
      const gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || Math.max(16, vw * 0.038);
      CAR = car.offsetWidth || 52;
      ROAD_Y = roadWrap.clientHeight - 10;
      const title = $('.section-title', section);
      const topY = title.offsetTop + title.offsetHeight + Math.min(24, vh * 0.02);
      const roadTop = roadWrap.offsetTop + ROAD_Y - CAR - 8;
      const avail = roadTop - topY;
      // horizontal bento: R rows of square cells; big projects take 2×2, wide covers 2×1,
      // tall covers a full-height column; packed densely left to right
      const gap = clamp(vw * 0.012, 10, 22);
      const R = vw < 600 && avail > 420 ? 3 : 2;
      const cell = Math.max(60, (avail - gap * (R - 1)) / R);
      const occ = []; // occ[col][row] = taken
      const free = (c, r) => !(occ[c] && occ[c][r]);
      const take = (c, r) => { (occ[c] = occ[c] || [])[r] = true; };
      let maxCol = 0;
      items.forEach((it) => {
        const n = it.p.items.length;
        const ratio = it.d.w / it.d.h;
        let sw = 1, sh = 1;
        if (n >= 5) { sw = 2; sh = 2; }
        else if (ratio > 1.35) sw = 2;
        else if (ratio < 0.72) sh = R;
        sh = Math.min(sh, R);
        let placed = false;
        for (let c = 0; !placed; c++) {
          for (let r = 0; r + sh <= R && !placed; r++) {
            let ok = true;
            for (let dc = 0; dc < sw && ok; dc++) for (let dr = 0; dr < sh && ok; dr++) ok = free(c + dc, r + dr);
            if (!ok) continue;
            for (let dc = 0; dc < sw; dc++) for (let dr = 0; dr < sh; dr++) take(c + dc, r + dr);
            it.hx = gutter + c * (cell + gap);
            it.hy = topY + r * (cell + gap);
            it.w = Math.round(sw * cell + (sw - 1) * gap);
            it.h = Math.round(sh * cell + (sh - 1) * gap);
            maxCol = Math.max(maxCol, c + sw);
            placed = true;
          }
        }
        it.r = Math.min(it.w, it.h) * 0.5;
        it.el.style.width = it.w + 'px';
        it.el.style.height = it.h + 'px';
        it.el.classList.toggle('tile-big', it.w > cell * 1.5 && it.h > cell * 1.5);
        if (!physics) { it.x = it.hx + it.w / 2; it.y = it.hy + it.h / 2; it.a = 0; }
      });
      trackW = gutter + maxCol * (cell + gap) - gap + gutter;
      track.style.width = trackW + 'px';
      roadW = roadWrap.clientWidth;
      roadSvg.setAttribute("viewBox", `0 0 ${roadW} ${roadWrap.clientHeight}`);
      floorY = roadWrap.offsetTop + ROAD_Y - 1;
      carX = carTarget = clamp(carTarget, 0, roadW - CAR);
      render(true);
    }

    const maxScroll = () => Math.max(0, trackW - vw);

    function loadVisible() {
      const left = scroll - vw * 0.5, right = scroll + vw * 1.6;
      for (const it of items) {
        const x = it.x - it.w / 2;
        const near = x + it.w > left && x < right;
        if (near && !it.loaded) { it.img.src = it.d.src; it.loaded = true; }
        // video projects only play while they're on screen
        if (it.d.type === 'video' && it.loaded) {
          const onScreen = near && x + it.w > scroll && x < scroll + vw && visible.has('graphic');
          if (onScreen && !it.playing) { it.playing = true; it.img.play().catch(() => {}); }
          else if (!onScreen && it.playing) { it.playing = false; it.img.pause(); }
        }
      }
    }

    /* road shape: ripple that radiates out from the car, decaying with distance */
    const wave = (x) => {
      const dx = Math.abs(x - (carX + CAR / 2));
      return wobbleA * Math.sin(dx * 0.045 - wobbleT * 9) * Math.exp(-dx / 380);
    };

    function drawRoad() {
      let d = '';
      for (let x = 0; x <= roadW; x += 6) d += (x ? 'L' : 'M') + x + ' ' + (ROAD_Y + wave(x)).toFixed(2);
      if (roadW % 6) d += 'L' + roadW + ' ' + (ROAD_Y + wave(roadW)).toFixed(2);
      roadPath.setAttribute('d', d);
      const cxm = carX + CAR / 2;
      const yL = wave(cxm - 16), yR = wave(cxm + 16), yC = wave(cxm);
      const ang = Math.atan2(yR - yL, 32) * 180 / Math.PI;
      const ix = carX + idle.dx;
      car.style.transform = `translate(${ix}px, ${ROAD_Y + yC - CAR + 4 - idle.hop}px) rotate(${ang + idle.tilt * facing}deg) scaleX(${facing})`;
      // exhaust puffs out of the back of the car while it revs
      const rearX = facing > 0 ? ix - 4 : ix + CAR + 4;
      puffs.forEach((p, k) => {
        const age = idle.puffAge[k];
        if (age < 0 || age > 0.8) { p.style.opacity = '0'; return; }
        const u = age / 0.8;
        const s = 0.5 + u * 1.3;
        p.style.opacity = String((1 - u) * 0.55);
        p.style.transform = `translate(${rearX - facing * (6 + u * 26) - 7}px, ${ROAD_Y - 14 - u * 14 - k * 3}px) scale(${s})`;
      });
    }

    function render(force) {
      if (driving || force) {
        const want = (carX / Math.max(1, roadW - CAR)) * maxScroll();
        const cur = scroller.scrollLeft;
        const next = force || Math.abs(want - cur) < 1 ? want : lerp(cur, want, 0.22);
        scroller.scrollLeft = next;
        if (!carDrag && Math.abs(carX - carTarget) < 0.5 && Math.abs(want - next) < 1) driving = false;
      }
      scroll = scroller.scrollLeft;
      for (const it of items) {
        it.el.style.transform = `translate3d(${it.x - it.w / 2}px, ${it.y - it.h / 2}px, 0) rotate(${it.a}rad)`;
      }
      drawRoad();
      loadVisible();
    }

    /* ---------- idle "rev": tells people the car can be driven ----------
       After 1.2s untouched, every 2.6s: two quick hops with exhaust puffs (a toy revving),
       then a small nudge toward the open road and back. Any movement or touch resets it. */
    const idle = { t: 0, dx: 0, hop: 0, tilt: 0, puffAge: [-1, -1] };
    const puffs = [0, 1].map(() => {
      const p = document.createElement('span');
      p.className = 'car-puff';
      roadWrap.appendChild(p);
      return p;
    });
    // reduced motion: no hopping; a "Drag →" label fades in and out beside the car instead
    const dragLabel = document.createElement('span');
    dragLabel.className = 'car-drag-label';
    dragLabel.textContent = 'Drag →';
    dragLabel.setAttribute('aria-hidden', 'true');
    roadWrap.appendChild(dragLabel);
    const IDLE_DELAY = 1.2, IDLE_CYCLE = 2.6;
    function updateIdle(dt, v) {
      const busy = Math.abs(v) > 0.3 || carDrag || physics || arranging;
      idle.t = busy ? 0 : idle.t + dt;
      idle.dx = idle.hop = idle.tilt = 0;
      idle.puffAge[0] = idle.puffAge[1] = -1;
      const on = idle.t >= IDLE_DELAY;
      if (reduceMotion) {
        const t = on ? (idle.t - IDLE_DELAY) % IDLE_CYCLE : 0;
        dragLabel.style.opacity = on ? String(0.25 + 0.75 * Math.sin((t / IDLE_CYCLE) * Math.PI)) : '0';
        dragLabel.style.transform = `translate(${carX + CAR + 10}px, ${ROAD_Y - CAR * 0.7}px)`;
        return;
      }
      if (!on) return;
      const t = (idle.t - IDLE_DELAY) % IDLE_CYCLE;
      // two hops, 0.28s each; nose lifts on the way up
      for (let k = 0; k < 2; k++) {
        const h = (t - k * 0.28) / 0.28;
        if (h >= 0 && h < 1) {
          idle.hop = Math.sin(h * Math.PI) * (k ? 5 : 8);
          idle.tilt = -Math.sin(h * Math.PI) * 5;
        }
        idle.puffAge[k] = t - k * 0.28;
      }
      // nudge toward the side with more road, then settle back
      const dir = carX < (roadW - CAR) * 0.85 ? 1 : -1;
      const n = (t - 0.7) / 0.9;
      if (n > 0 && n < 1) idle.dx = dir * 14 * Math.sin(n * Math.PI) * (1 - n * 0.3);
    }

    function step(dt) {
      // car eases towards where it's dragged
      prevCarX = carX;
      carX = lerp(carX, carTarget, 0.35);
      const v = carX - prevCarX;
      if (Math.abs(v) > 0.3) facing = v > 0 ? 1 : -1;
      wobbleA = Math.min(16, wobbleA * 0.93 + Math.abs(v) * 0.18);
      wobbleT += dt;
      updateIdle(dt, v);
      car.setAttribute('aria-valuenow', String(Math.round((carX / Math.max(1, roadW - CAR)) * 100)));
      if (physics) simulate(dt);
      if (arranging) arrangeStep();
      render(false);
    }

    /* ---------- physics ---------- */
    function lowestPoint(it) {
      const c = Math.abs(Math.cos(it.a)), s = Math.abs(Math.sin(it.a));
      return (it.w * s + it.h * c) / 2;
    }

    function simulate(dt) {
      const sub = 2;
      const g = 2200;
      for (let n = 0; n < sub; n++) {
        const h = Math.min(dt, 1 / 30) / sub;
        for (const it of items) {
          if (it === held) continue;
          it.vy += g * h;
          it.vx *= 0.995; it.va *= 0.98;
          it.x += it.vx * h; it.y += it.vy * h; it.a += it.va * h;
        }
        for (let pass = 0; pass < 2; pass++) {
          // item vs item (circle approximation keeps it cheap and stable)
          for (let i = 0; i < items.length; i++) {
            const A = items[i];
            for (let j = i + 1; j < items.length; j++) {
              const B = items[j];
              const dx = B.x - A.x, dy = B.y - A.y;
              const min = A.r + B.r;
              if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
              const dist = Math.hypot(dx, dy) || 0.01;
              if (dist >= min) continue;
              const nx = dx / dist, ny = dy / dist, push = (min - dist) / 2;
              const aw = A === held ? 0 : 1, bw = B === held ? 0 : 1;
              const tot = aw + bw || 1;
              A.x -= nx * push * 2 * aw / tot; A.y -= ny * push * 2 * aw / tot;
              B.x += nx * push * 2 * bw / tot; B.y += ny * push * 2 * bw / tot;
              const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
              if (rv < 0) {
                const imp = -rv * 0.6;
                if (aw) { A.vx -= nx * imp * aw / tot * 2; A.vy -= ny * imp * aw / tot * 2; }
                if (bw) { B.vx += nx * imp * bw / tot * 2; B.vy += ny * imp * bw / tot * 2; }
                A.va += (Math.random() - 0.5) * 0.3; B.va += (Math.random() - 0.5) * 0.3;
              }
            }
          }
          // floor & walls
          for (const it of items) {
            if (it === held) continue;
            const lp = lowestPoint(it);
            if (it.y + lp > floorY) {
              it.y = floorY - lp;
              if (it.vy > 0) it.vy *= -0.25;
              if (Math.abs(it.vy) < 40) it.vy = 0;
              it.vx *= 0.86;
              // settle onto the nearest flat side
              const target = Math.round(it.a / (Math.PI / 2)) * (Math.PI / 2);
              it.va = it.va * 0.8 + (target - it.a) * 6;
              it.va += it.vx * 0.002;
            }
            const half = Math.max(it.w, it.h) / 2;
            if (it.x < half) { it.x = half; it.vx = Math.abs(it.vx) * 0.4; }
            if (it.x > trackW - half) { it.x = trackW - half; it.vx = -Math.abs(it.vx) * 0.4; }
            if (it.y < -vh) { it.y = -vh; it.vy = 0; }
          }
        }
      }
    }

    function destroy() {
      physics = true; arranging = 0;
      track.classList.add('physics');
      for (const it of items) {
        it.vx = (Math.random() - 0.5) * 380;
        it.vy = -Math.random() * 420;
        it.va = (Math.random() - 0.5) * 9;
      }
      hint.textContent = 'Grab and throw the designs';
    }

    let arrangeStart = 0, arrangeFrom = [];
    function arrange() {
      physics = false; held = null;
      track.classList.remove('physics');
      arrangeFrom = items.map((it) => ({ x: it.x, y: it.y, a: ((it.a % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI }));
      arrangeStart = performance.now();
      arranging = 1;
      hint.textContent = 'Drag the car · tap a project';
    }
    function arrangeStep() {
      const t = performance.now() - arrangeStart;
      let done = true;
      items.forEach((it, i) => {
        const p = clamp((t - i * 8) / 750, 0, 1);
        if (p < 1) done = false;
        const e = 1 - Math.pow(1 - p, 4);
        const f = arrangeFrom[i];
        it.x = lerp(f.x, it.hx + it.w / 2, e);
        it.y = lerp(f.y, it.hy + it.h / 2, e) - Math.sin(e * Math.PI) * 60;
        it.a = lerp(f.a, 0, e);
      });
      if (done) arranging = 0;
    }

    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      on ? destroy() : arrange();
    });

    /* ---------- dragging designs ---------- */
    const toTrack = (e) => {
      const r = section.getBoundingClientRect();
      return { x: e.clientX - r.left + scroller.scrollLeft, y: e.clientY - r.top };
    };
    track.addEventListener('pointerdown', (e) => {
      if (!physics) return;
      const el = e.target.closest('.design');
      if (!el) return;
      held = items.find((it) => it.el === el);
      const p = toTrack(e);
      heldOff = { x: held.x - p.x, y: held.y - p.y };
      heldPrev = { x: p.x, y: p.y, t: performance.now() };
      held.vx = held.vy = 0;
      el.classList.add('held');
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    track.addEventListener('pointermove', (e) => {
      if (!held) return;
      const p = toTrack(e);
      const now = performance.now();
      const dt = Math.max(1, now - heldPrev.t) / 1000;
      held.vx = lerp(held.vx, (p.x - heldPrev.x) / dt, 0.5);
      held.vy = lerp(held.vy, (p.y - heldPrev.y) / dt, 0.5);
      held.va = held.vx * 0.003;
      held.x = p.x + heldOff.x; held.y = Math.min(p.y + heldOff.y, floorY - lowestPoint(held));
      heldPrev = { x: p.x, y: p.y, t: now };
    });
    const release = () => {
      if (!held) return;
      held.el.classList.remove('held');
      held.vx = clamp(held.vx, -2500, 2500); held.vy = clamp(held.vy, -2500, 2500);
      held = null;
    };
    track.addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);

    /* ---------- driving the car ---------- */
    car.addEventListener('pointerdown', (e) => {
      carDrag = { start: e.clientX, x0: carTarget };
      driving = true;
      car.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    car.addEventListener('pointermove', (e) => {
      if (!carDrag) return;
      carTarget = clamp(carDrag.x0 + e.clientX - carDrag.start, 0, roadW - CAR);
    });
    const carUp = () => (carDrag = null);
    car.addEventListener('pointerup', carUp);
    car.addEventListener('pointercancel', carUp);
    car.addEventListener('keydown', (e) => {
      const stepPx = (roadW - CAR) / 20;
      if (e.key === 'ArrowRight') carTarget = clamp(carTarget + stepPx, 0, roadW - CAR);
      else if (e.key === 'ArrowLeft') carTarget = clamp(carTarget - stepPx, 0, roadW - CAR);
      else if (e.key === 'Home') carTarget = 0;
      else if (e.key === 'End') carTarget = roadW - CAR;
      else return;
      driving = true;
      e.preventDefault();
    });
    // clicking anywhere on the road drives the car there
    roadWrap.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.car')) return;
      const r = roadWrap.getBoundingClientRect();
      carTarget = clamp(e.clientX - r.left - CAR / 2, 0, roadW - CAR);
      driving = true;
    });
    // swiping / trackpad / shift+wheel scroll the gallery natively; the car follows along
    scroller.addEventListener('scroll', () => {
      if (driving) return;
      carTarget = (scroller.scrollLeft / Math.max(1, maxScroll())) * (roadW - CAR);
      loadVisible();
    }, { passive: true });

    addEventListener('resize', layout);
    layout();
    document.fonts && document.fonts.ready.then(layout);
    const pauseAll = () => items.forEach((it) => { if (it.playing) { it.playing = false; it.img.pause(); } });
    return { step, pauseAll };
  })();

  /* =========================================================
     3. VIDEO EDITING — scrub the playhead across clips
     ========================================================= */
  const editor = (() => {
    const player = $('#player');
    const lane = $('#veLane');
    const scroller = $('#veScroll');
    const playhead = $('#playhead');
    const projectName = $('#projectName');
    const timeEl = $('#veTime');
    const soundBtn = $('#soundBtn');
    const START = 14, GAP = 42;
    let current = -1, headX = START, dragging = false, wantPlay = false;
    let offsets = [];

    const clips = VIDEOS.map((v, i) => {
      const el = document.createElement('div');
      el.className = 'clip';
      el.innerHTML = `<div class="body"><span>Video ${i + 1}</span></div>`;
      el.title = v.name;
      lane.appendChild(el);
      return { ...v, el, x: 0, w: 0 };
    });

    function layout() {
      const pxPerSec = clamp(innerWidth / 300, 2.6, 9);
      let x = START, acc = 0;
      offsets = [];
      clips.forEach((c) => {
        c.w = Math.round(Math.max(clamp(innerWidth * 0.133, 120, 340), c.dur * pxPerSec));
        c.x = x;
        c.el.style.left = x + 'px';
        c.el.style.width = c.w + 'px';
        offsets.push(acc); acc += c.dur;
        x += c.w + GAP;
      });
      lane.style.width = x + 'px';
      if (current >= 0) syncHead();
    }

    function clipAt(x) {
      let best = 0, bestD = Infinity;
      clips.forEach((c, i) => {
        const d = x < c.x ? c.x - x : x > c.x + c.w ? x - (c.x + c.w) : 0;
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }

    function select(i, t = 0, autoplay = wantPlay) {
      if (i !== current) {
        current = i;
        clips.forEach((c, k) => c.el.classList.toggle('active', k === i));
        player.src = clips[i].src;
        projectName.textContent = clips[i].src.split('/').pop();
      }
      try { player.currentTime = t; } catch (_) { /* before metadata */ }
      if (autoplay) player.play().catch(() => {});
    }

    function seekTo(x) {
      headX = clamp(x, 0, lane.clientWidth);
      const i = clipAt(headX);
      const c = clips[i];
      const frac = clamp((headX - c.x) / c.w, 0, 0.999);
      const dur = (i === current && isFinite(player.duration)) ? player.duration : c.dur;
      select(i, frac * dur, false);
      drawHead();
    }

    function syncHead() {
      const c = clips[current];
      const dur = isFinite(player.duration) && player.duration ? player.duration : c.dur;
      headX = c.x + (player.currentTime / dur) * c.w;
    }

    function drawHead() {
      playhead.style.left = headX + 'px';
      const total = current >= 0 ? offsets[current] + (player.currentTime || 0) : 0;
      const m = Math.floor(total / 60), s = Math.floor(total % 60), f = Math.floor((total % 1) * 30);
      timeEl.textContent = [m, s, f].map((n) => String(n).padStart(2, '0')).join(':');
    }

    function frame() {
      if (current < 0) return;
      if (!dragging) {
        syncHead();
        // keep playhead in view while playing
        if (!player.paused) {
          const left = scroller.scrollLeft, right = left + scroller.clientWidth;
          if (headX > right - 60 || headX < left) scroller.scrollLeft = headX - 60;
        }
      }
      drawHead();
    }

    player.addEventListener('ended', () => {
      select((current + 1) % clips.length, 0, true);
    });

    // drag the playhead, or scrub by pressing on empty timeline
    const laneX = (e) => e.clientX - lane.getBoundingClientRect().left;
    function startScrub(e) {
      dragging = true;
      player.pause();
      e.currentTarget.setPointerCapture(e.pointerId);
      seekTo(laneX(e));
      e.preventDefault();
    }
    function moveScrub(e) {
      if (!dragging) return;
      seekTo(laneX(e));
      // edge auto-scroll
      const r = scroller.getBoundingClientRect();
      if (e.clientX > r.right - 30) scroller.scrollLeft += 12;
      else if (e.clientX < r.left + 30) scroller.scrollLeft -= 12;
    }
    function endScrub() {
      if (!dragging) return;
      dragging = false;
      if (wantPlay) player.play().catch(() => {});
    }
    playhead.addEventListener('pointerdown', startScrub);
    playhead.addEventListener('pointermove', moveScrub);
    playhead.addEventListener('pointerup', endScrub);
    playhead.addEventListener('pointercancel', endScrub);

    lane.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.ve-playhead')) return;
      const clipEl = e.target.closest('.clip');
      if (clipEl) {
        const i = clips.findIndex((c) => c.el === clipEl);
        headX = clips[i].x;
        select(i, 0, wantPlay);
        drawHead();
        return;
      }
      startScrub(e);
    });
    lane.addEventListener('pointermove', moveScrub);
    lane.addEventListener('pointerup', endScrub);
    lane.addEventListener('pointercancel', endScrub);

    soundBtn.addEventListener('click', () => {
      player.muted = !player.muted;
      soundBtn.textContent = player.muted ? 'Sound off' : 'Sound on';
      if (wantPlay) player.play().catch(() => {});
    });
    $('.ve-preview').addEventListener('click', (e) => {
      if (e.target === soundBtn) return;
      player.paused ? player.play().catch(() => {}) : player.pause();
    });

    function setActive(on) {
      wantPlay = on;
      if (on) {
        if (current < 0) select(0, 0, true);
        else if (!dragging) player.play().catch(() => {});
      } else player.pause();
    }

    addEventListener('resize', layout);
    layout();
    return { frame, setActive };
  })();

  /* =========================================================
     4. BOX — hover for info, click to visit
     ========================================================= */
  (() => {
    const tip = $('#tip');
    const title = $('strong', tip), text = $('p', tip);
    let active = null;

    function show(item, x, y) {
      active = item;
      title.textContent = item.dataset.title;
      text.textContent = item.dataset.text.split('|').join('\n');
      tip.classList.toggle('multi', item.dataset.text.includes('|'));
      tip.classList.add('show');
      place(x, y);
    }
    function place(x, y) {
      if (innerWidth < 600 || matchMedia('(hover: none)').matches) { tip.style.left = ''; tip.style.top = ''; tip.classList.add('docked'); return; }
      tip.classList.remove('docked');
      const r = tip.getBoundingClientRect();
      let left = x + 18, top = y + 18;
      if (left + r.width > innerWidth - 12) left = x - r.width - 18;
      if (top + r.height > innerHeight - 12) top = y - r.height - 18;
      tip.style.left = Math.max(12, left) + 'px';
      tip.style.top = Math.max(12, top) + 'px';
    }
    function hide() { active = null; tip.classList.remove('show'); }

    document.querySelectorAll('.item').forEach((item) => {
      item.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(item, e.clientX, e.clientY); });
      item.addEventListener('pointermove', (e) => { if (active === item && e.pointerType === 'mouse') place(e.clientX, e.clientY); });
      item.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hide(); });
      item.addEventListener('focus', () => { const r = item.getBoundingClientRect(); show(item, r.right - 20, r.top + 20); });
      item.addEventListener('blur', hide);
      // touch: first tap explains, second tap follows the link
      item.addEventListener('click', (e) => {
        if (matchMedia('(hover: none)').matches && active !== item) {
          e.preventDefault();
          const r = item.getBoundingClientRect();
          show(item, r.left + r.width / 2, r.top + r.height / 2);
        }
      });
    });
    addEventListener('scroll', () => { if (matchMedia('(hover: none)').matches) hide(); }, { passive: true });
  })();

  /* =========================================================
     Confetti (party popper button)
     ========================================================= */
  const confetti = (() => {
    const cv = $('#confetti');
    const ctx = cv.getContext('2d');
    let parts = [];
    const colors = ['#e39a15', '#111', '#f2d230', '#2f55d4', '#e2412f', '#3a9a4d'];
    function resize() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
    function burst(x, y) {
      for (let i = 0; i < 140; i++) {
        const a = Math.PI + Math.random() * Math.PI * 0.9 - 0.2;
        const sp = 6 + Math.random() * 12;
        parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
          w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, c: colors[(Math.random() * colors.length) | 0], life: 1 });
      }
    }
    function frame() {
      if (!parts.length) return;
      const d = devicePixelRatio;
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
      for (const p of parts) {
        p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.006;
        ctx.save();
        ctx.translate(p.x * d, p.y * d); ctx.rotate(p.r); ctx.scale(d, Math.cos(p.r * 2) * d);
        ctx.globalAlpha = Math.min(1, p.life * 2);
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (!parts.length) ctx.clearRect(0, 0, cv.width, cv.height);
    }
    addEventListener('resize', resize); resize();
    const btn = $('#confettiBtn');
    const sync = () => {
      const on = !!(window.toyCursor && window.toyCursor.enabled());
      btn.setAttribute('aria-pressed', String(on));
      btn.title = on ? 'Switch to normal cursor' : 'Switch to toy hand cursor';
    };
    btn.addEventListener('click', (e) => {
      if (window.toyCursor) {
        window.toyCursor.toggle();
        sync();
        if (!window.toyCursor.enabled()) return;
      }
      const r = e.currentTarget.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2);
    });
    sync();
    return { frame };
  })();

  /* =========================================================
     Main loop
     ========================================================= */
  function onVisibilityChange() {
    editor && editor.setActive(visible.has('video'));
    if (gallery && !visible.has('graphic')) gallery.pauseAll();
  }
  let last = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    if (visible.has('landing')) orbit.frame(t);
    if (visible.has('graphic')) gallery.step(dt);
    if (visible.has('video')) editor.frame();
    confetti.frame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  onVisibilityChange();
})();
