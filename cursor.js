/* Toy hand pointer: a plastic pointing hand on a telescoping rod held by its far end.
   The fingertip is the click point; the rod trails behind with springy inertia.
   Click to tap, hold to extend the rod. Mouse/trackpad only. */
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  if (!fine.matches) return;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  const svg = document.createElementNS(NS, 'svg');
  svg.id = 'toyCursor';
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <defs>
      <linearGradient id="tcSkin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="var(--hand-light, #f6b24a)"/>
        <stop offset="1" stop-color="var(--hand-dark, #c97708)"/>
      </linearGradient>
      <linearGradient id="tcCuff" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset="1" stop-color="#d9d9d9"/>
      </linearGradient>
      <filter id="tcOutline" x="-30%" y="-30%" width="160%" height="160%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="1.4" result="grow"/>
        <feFlood flood-color="#0a0a0a"/>
        <feComposite in2="grow" operator="in" result="edge"/>
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
        <feOffset in="blur" dx="2" dy="5" result="drop"/>
        <feComponentTransfer in="drop" result="shadow"><feFuncA type="linear" slope=".22"/></feComponentTransfer>
        <feMerge><feMergeNode in="shadow"/><feMergeNode in="edge"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <g id="tcStick"></g>
    <g id="tcRipples"></g>
    <g id="tcHand">
      <g id="tcHandInner" filter="url(#tcOutline)">
        <rect x="-5" y="53" width="27" height="11" rx="3.5" fill="url(#tcCuff)"/>
        <circle cx="10.5" cy="27.5" r="6.6" fill="url(#tcSkin)"/>
        <circle cx="18"   cy="28.6" r="6.2" fill="url(#tcSkin)"/>
        <circle cx="24.4" cy="31"   r="5.6" fill="url(#tcSkin)"/>
        <rect x="-9" y="25" width="35" height="31" rx="11" fill="url(#tcSkin)"/>
        <rect x="-6.5" y="0" width="13" height="38" rx="6.5" fill="url(#tcSkin)"/>
        <path d="M-8 44 C -2 38, 9 37, 15 40" fill="none" stroke="var(--hand-dark, #c97708)" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>
        <path d="M7 31.5 v6 M14.5 32.5 v5.5 M21 34 v5" stroke="var(--hand-dark, #c97708)" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
        <rect x="-3.6" y="4" width="3.4" height="17" rx="1.7" fill="#fff" opacity=".6"/>
        <ellipse cx="-2" cy="31.5" rx="4" ry="2.4" fill="#fff" opacity=".45"/>
      </g>
    </g>`;
  document.body.appendChild(svg);

  // on/off switch (the party popper button in the header), remembered per browser
  let enabled = true;
  try { enabled = localStorage.getItem('toyCursor') !== 'off'; } catch (_) { /* storage blocked */ }
  function setEnabled(on) {
    enabled = on;
    document.documentElement.classList.toggle('toy-cursor', on);
    svg.style.display = on ? '' : 'none';
    try { localStorage.setItem('toyCursor', on ? 'on' : 'off'); } catch (_) { /* storage blocked */ }
  }
  window.toyCursor = { enabled: () => enabled, toggle: () => setEnabled(!enabled), set: setEnabled };
  setEnabled(enabled);

  const stickG = svg.querySelector('#tcStick');
  const handG = svg.querySelector('#tcHand');
  const ripplesG = svg.querySelector('#tcRipples');

  const line = (stroke, width) => {
    const el = document.createElementNS(NS, 'line');
    el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', width);
    el.setAttribute('stroke-linecap', 'round');
    return el;
  };
  // telescoping rod: three nested tubes, thickest at the held end
  const tubes = [9, 6.8, 4.8].map((w) => {
    const outline = line('#0a0a0a', w + 2.8), fill = line('#f3f3f3', w);
    stickG.append(outline, fill);
    return { outline, fill };
  });
  const shine = line('#fff', 1.6);
  stickG.appendChild(shine);
  // end cap on the held end of the rod
  const cap = document.createElementNS(NS, 'circle');
  cap.setAttribute('r', 6.5);
  cap.setAttribute('fill', '#2a2a2a');
  cap.setAttribute('stroke', '#0a0a0a');
  cap.setAttribute('stroke-width', 1.4);
  stickG.appendChild(cap);

  const HAND_SCALE = 1.1;
  const ATTACH = { x: 8.5, y: 63 };          // where the rod meets the cuff, in hand space
  const ROD = 120;                            // resting rod length (px)
  const REST = Math.atan2(0.87, 0.5);         // rod hangs down-right when still, so the finger points up-left
  let mx = -200, my = -200, seen = false, visible = false;
  let tx = 0, ty = 0, ptx = 0, pty = 0;      // held end of the rod (verlet point)
  let theta = REST - Math.PI / 2;             // hand rotation
  let ext = 0, extV = 0, press = false;       // tap jab / hold extension
  let squash = 1, squashV = 0;
  let hoverScale = 1, hoverTarget = 1;

  const interactive = '.tile, a, button, [role="slider"], .clip, .item, .ve-playhead, .ve-lane, .road-wrap, .track.physics .design, .ve-preview';

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    if (!seen) {
      seen = true;
      tx = ptx = mx + Math.cos(REST) * (ROD + 70);
      ty = pty = my + Math.sin(REST) * (ROD + 70);
    }
    setVisible(true);
    const t = e.target instanceof Element ? e.target : null;
    hoverTarget = t && t.closest(interactive) ? 1.1 : 1;
  }, { passive: true });

  addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    press = true;
    extV += 900;
    squashV -= 10;
    ripple(e.clientX, e.clientY);
  });
  const up = () => { press = false; squashV += 6; };
  addEventListener('pointerup', up);
  addEventListener('pointercancel', up);
  document.addEventListener('mouseleave', () => setVisible(false));
  document.addEventListener('mouseenter', () => seen && setVisible(true));
  addEventListener('blur', () => setVisible(false));

  function setVisible(v) {
    if (v === visible) return;
    visible = v;
    svg.style.opacity = v ? '1' : '0';
  }

  function ripple(x, y) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 4);
    c.setAttribute('fill', 'none'); c.setAttribute('stroke', '#0a0a0a'); c.setAttribute('stroke-width', 2);
    ripplesG.appendChild(c);
    c.animate([{ r: 4, opacity: 0.8, strokeWidth: 2.5 }, { r: 22, opacity: 0, strokeWidth: 0.5 }],
      { duration: 420, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => c.remove();
  }

  const setLine = (el, x1, y1, x2, y2) => {
    el.setAttribute('x1', x1.toFixed(1)); el.setAttribute('y1', y1.toFixed(1));
    el.setAttribute('x2', x2.toFixed(1)); el.setAttribute('y2', y2.toFixed(1));
  };

  let last = performance.now();
  function frame(t) {
    const dt = Math.min(0.033, (t - last) / 1000);
    const f = dt * 60; // 1 at 60fps
    last = t;
    if (visible && enabled) {
      // tap / hold: the rod telescopes out and the hand jabs forward
      const extTarget = press ? 22 : 0;
      extV += ((extTarget - ext) * 520 - extV * 26) * dt;
      ext += extV * dt;
      squashV += ((1 - squash) * 600 - squashV * 22) * dt;
      squash += squashV * dt;
      hoverScale += (hoverTarget - hoverScale) * Math.min(1, dt * 14);
      const s = HAND_SCALE * hoverScale;
      const sq = Math.max(0.82, Math.min(1.12, squash));

      // finger direction (away from the rod), from last frame's angle
      const fx = Math.sin(theta), fy = -Math.cos(theta);
      const tipX = mx + fx * ext * 0.45, tipY = my + fy * ext * 0.45;

      // cuff (rod attachment) in screen space
      const ca = Math.cos(theta), sa = Math.sin(theta);
      const bx = tipX + (ATTACH.x * ca - ATTACH.y * sa) * s * sq;
      const by = tipY + (ATTACH.x * sa + ATTACH.y * ca) * s * sq;

      // held end of the rod: a point with inertia, gently pulled back towards its resting angle
      const L = ROD + ext;
      if (reduceMotion) {
        tx = bx + Math.cos(REST) * L; ty = by + Math.sin(REST) * L; ptx = tx; pty = ty;
      } else {
        const damp = Math.pow(0.72, f);
        let vx = (tx - ptx) * damp, vy = (ty - pty) * damp;
        const sp = Math.hypot(vx, vy), maxSp = 60 * f;
        if (sp > maxSp) { vx *= maxSp / sp; vy *= maxSp / sp; }
        ptx = tx; pty = ty;
        tx += vx; ty += vy;
        const k = 1 - Math.pow(1 - 0.03, f);
        tx += (bx + Math.cos(REST) * L - tx) * k;
        ty += (by + Math.sin(REST) * L - ty) * k;
      }
      // rigid rod: keep the held end exactly L away from the hand
      let dx = tx - bx, dy = ty - by;
      const d = Math.hypot(dx, dy) || 1;
      tx = bx + dx / d * L; ty = by + dy / d * L;
      dx = tx - bx; dy = ty - by;

      // the hand faces away from the rod
      theta = Math.atan2(dy, dx) - Math.PI / 2;
      handG.setAttribute('transform',
        `translate(${tipX.toFixed(2)} ${tipY.toFixed(2)}) rotate(${(theta * 180 / Math.PI).toFixed(2)}) scale(${(s * (2 - sq)).toFixed(3)} ${(s * sq).toFixed(3)})`);

      // tubes from the held end (thick) to the hand (thin)
      const ux = dx / L, uy = dy / L;
      const seg = [0, L * 0.42, L * 0.71, L];
      const pt = (dist) => [tx - ux * dist, ty - uy * dist];
      tubes.forEach((tb, i) => {
        const [x1, y1] = pt(seg[i]);
        const [x2, y2] = pt(seg[i + 1]);
        setLine(tb.outline, x1, y1, x2, y2);
        setLine(tb.fill, x1, y1, x2, y2);
      });
      const nx = -uy, ny = ux;
      setLine(shine, tx - ux * 8 + nx * 1.8, ty - uy * 8 + ny * 1.8, bx + nx, by + ny);
      cap.setAttribute('cx', tx.toFixed(1)); cap.setAttribute('cy', ty.toFixed(1));
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // if the device changes (e.g. tablet mode), give the native cursor back
  if (fine.addEventListener) fine.addEventListener('change', (e) => {
    if (!e.matches) { enabled = false; document.documentElement.classList.remove('toy-cursor'); svg.remove(); delete window.toyCursor; }
  });
})();
