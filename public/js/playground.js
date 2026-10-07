/* Playground canvas: endless masonry collage you can drag / scroll around.
   One tile of the layout is built with every column the same height, then
   repeated in a grid and wrapped, so it never ends and repeats seamlessly. */
(() => {
  'use strict';

  const stage = document.getElementById('canvas');
  const world = document.getElementById('world');
  let intro = document.getElementById('intro');
  const lookBtn = document.getElementById('look');
  const lightbox = document.getElementById('lightbox');
  const menu = document.getElementById('menu');
  const menuTrigger = document.getElementById('menu-trigger');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = reduceMotion ? 20 : 850;
  const WHEEL_SPEED = 0.5; // scroll/trackpad sensitivity (1 = native speed)

  /* ---- Real pieces: `src` is the image (or the poster frame when `video` is set).
     `ratio` is height / width of the media, used for the close-up. ---- */
  const BASE = 'assets/images/playground/';
  const PIECES = [
    { title: 'Desktop OS', kind: 'Web', year: '2026', src: 'desktop-os.jpg', video: 'recording-3.mp4', ratio: 1240 / 2520,
      desc: 'A portfolio that behaves like a desktop. Windows, a character sheet, sticky notes and a dock.' },
    { title: 'Tagging the Body', kind: 'Typography', year: '2026', src: 'tagging-the-body.png', ratio: 699 / 995,
      desc: 'A type study in tall, condensed letterforms. Tan fill, red outline.' },
    { title: 'Mandaloun', kind: 'Website', year: '2026', src: 'recording-1.jpg', video: 'recording-1.mp4', ratio: 492 / 960,
      desc: 'A website for a Lebanese restaurant in London, built around a cedar tree.' },
    { title: 'Portfolio Concept', kind: 'Website', year: '2026', src: 'recording-2.jpg', video: 'recording-2.mp4', ratio: 528 / 960,
      desc: 'A portfolio concept where the homepage is one big statement in type.' },
    { title: 'Squish the Letters', kind: 'Website', year: '2026', src: 'recording-4.jpg', video: 'recording-4.mp4', ratio: 828 / 1920,
      desc: 'A homepage where you can push and squash the letters of my name.' },
    { title: 'Things To Tell Tim Today', kind: 'Website', year: '2026', src: 'recording-5.jpg', video: 'recording-5.mp4', ratio: 1252 / 1920,
      desc: 'A small note on a cherry blossom tree. Open it to see what I have to tell Tim today.' },
    { title: 'Falling Photos', kind: 'Website', year: '2026', src: 'falling-photos.jpg', video: 'falling-photos.mp4', ratio: 960 / 1920,
      desc: 'A website where photographs fall onto the page and pile up on top of the content.' },
    { title: 'Museum of Us', kind: 'Website', year: '2026', images: ['museum-of-us-1.png', 'museum-of-us-2.png'], ratio: (2 * 1004) / 1975, viewRatio: 1004 / 1975,
      desc: 'A permanent archive of the things we keep. A quiet, typewriter-set website sorting objects into eight collections.' },
    { title: 'Piko', kind: 'Typography', year: '2026', src: 'piko.png', ratio: 1384 / 1966,
      desc: 'A type study in heavy, blocky letterforms. Red fill with pale inset slots.' },
    { title: 'Muni', kind: 'Branding', year: '2026', src: 'muni.png', ratio: 1684 / 1226,
      desc: 'A logotype for Muni. Tall white serif capitals over a warm, blurred amber field.' },
  ].map((p) => {
    const images = p.images && p.images.map((f) => BASE + f);
    return { ...p, images, src: images ? images[0] : BASE + p.src, video: p.video && BASE + p.video };
  });

  const ITEMS = PIECES;

  /* ---- Layout ---- */
  let vw = 0, vh = 0, W = 0, H = 0;
  let x = 0, y = 0, vx = 0, vy = 0;

  const mod = (n, m) => ((n % m) + m) % m;
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  function applyVars(el, item) {
    el.style.setProperty('--c1', item.c1);
    el.style.setProperty('--c2', item.c2);
    el.style.setProperty('--a', item.angle + 'deg');
  }

  // Fills a tile / close-up with the piece's picture, or its gradient placeholder
  function fillMedia(el, item) {
    if (!item.src) {
      el.classList.add('ph');
      applyVars(el, item);
      return;
    }
    // A project with several images stacks them top to bottom as one tall piece
    (item.images || [item.src]).forEach((src) => {
      const img = document.createElement('img');
      img.className = item.images ? 'stack-img' : 'media';
      img.src = src;
      img.alt = '';
      img.draggable = false;
      img.decoding = 'async';
      el.append(img);
    });
  }

  /* Video tiles only play while they are on screen; off-screen ones drop back to
     their still frame so the repeated copies of the canvas never decode together. */
  function setTileVideo(tile, on) {
    const fill = tile.querySelector('.fill');
    let video = fill.querySelector('video');
    if (!on) {
      if (video) { video.pause(); video.remove(); }
      return;
    }
    if (video) { video.play().catch(() => {}); return; }
    video = document.createElement('video');
    video.className = 'media';
    video.src = ITEMS[tile.dataset.item].video;
    video.setAttribute('muted', '');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.disableRemotePlayback = true;
    video.preload = 'auto';
    video.tabIndex = -1;
    video.setAttribute('aria-hidden', 'true');
    video.addEventListener('canplay', () => { if (video.paused) video.play().catch(() => {}); });
    fill.append(video);
    video.play().catch(() => {});
  }
  // Safari (Low Power Mode, "Never Auto-Play") can refuse autoplay: retry on the first touch of the page
  const wake = () => {
    for (const v of world.querySelectorAll('video')) if (v.paused) v.play().catch(() => {});
  };
  for (const type of ['pointerdown', 'wheel', 'keydown']) {
    addEventListener(type, wake, { once: true, passive: true });
  }
  const videoWatch = new IntersectionObserver((entries) => {
    for (const en of entries) setTileVideo(en.target, en.isIntersecting && !opened);
  }, { root: stage, rootMargin: '80px' });

  function build() {
    if (videoWatch) videoWatch.disconnect();
    vw = stage.clientWidth;
    vh = stage.clientHeight;
    const gap = vw < 600 ? 10 : Math.max(24, Math.min(48, Math.round(vw * 0.025)));
    const cols = Math.max(2, Math.min(5, Math.round(vw / 450)));
    const colW = (vw + gap) / cols - gap;
    const widths = Array.from({ length: cols }, () => colW);
    W = vw + gap;
    H = Math.max(2400, vh * 2);

    // Every column adds up to exactly H so the tile wraps without a seam.
    // Every piece keeps its own aspect ratio. Each column tries many random orderings and keeps the
    // one that fills H most neatly; the small leftover is shared out between the gaps.
    // A piece is never placed beside itself: not above/below in its column, and not next to the
    // same piece in the neighbouring columns (the last column also borders the first, as the canvas wraps).
    const tiles = [];
    const cols_ = [];
    const touches = (a, b) => {
      for (const s of [-H, 0, H]) {
        if (a.top - gap * 2 < b.top + s + b.h && b.top + s < a.top + a.h + gap * 2) return true;
      }
      return false;
    };
    const clashes = (placed, others) => others.some((o) => placed.some((p) => p.item === o.item && touches(p, o)));
    let left = 0;
    for (let c = 0; c < cols; c++) {
      const colW = widths[c];
      const rand = rng(c * 7919 + 11);
      const neighbours = [];
      if (c > 0) neighbours.push(cols_[c - 1]);
      if (c === cols - 1 && cols > 2) neighbours.push(cols_[0]);
      let best = null;
      for (const strict of [true, false]) {
        for (let t = 0; t < 1500; t++) {
          const n = 3 + Math.floor(rand() * 18);
          const seq = [];
          let sum = 0;
          for (let j = 0; j < n; j++) {
            let k;
            do { k = Math.floor(rand() * ITEMS.length); } while (j && (k === seq[j - 1] || (j === n - 1 && k === seq[0])));
            seq.push(k);
            sum += colW * ITEMS[k].ratio;
          }
          const extra = (H - sum - gap * n) / n; // added to each gap
                    if (extra < -gap * 0.15) continue;
          const score = Math.abs(extra);
          if (best && score >= best.score) continue;
          let top = 0;
          const placed = seq.map((k) => {
            const h = colW * ITEMS[k].ratio;
            const p = { item: k, left, top, w: colW, h };
            top += h + gap + extra;
            return p;
          });
          if (strict && neighbours.some((nb) => clashes(placed, nb))) continue;
          best = { placed, score };
        }
        if (best) break;
      }
      cols_.push(best.placed);
      tiles.push(...best.placed);
      left += colW + gap;
    }

    const nx = 2;
    const ny = Math.ceil(vh / H) + 1;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const copy = document.createElement('div');
        copy.className = 'copy';
        copy.style.transform = `translate3d(${i * W}px,${j * H}px,0)`;
        const primary = i === 0 && j === 0;
        for (const t of tiles) {
          const item = ITEMS[t.item];
          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'tile';
          el.style.left = t.left + 'px';
          el.style.top = t.top + 'px';
          el.style.width = t.w + 'px';
          el.style.height = t.h + 'px';
          el.dataset.item = t.item;
          el.setAttribute('aria-label', `${item.title}, ${item.kind}, ${item.year}`);
          if (!primary) { el.tabIndex = -1; el.setAttribute('aria-hidden', 'true'); }
          if (item.src) el.classList.add('has-media');
          if (item.video && videoWatch) videoWatch.observe(el);
          const ph = document.createElement('span');
          ph.className = 'fill';
          fillMedia(ph, item);
          const film = document.createElement('span');
          film.className = 'film';
          const title = document.createElement('span');
          title.className = 't';
          title.textContent = item.title;
          const meta = document.createElement('span');
          meta.className = 'm';
          meta.textContent = `${item.kind} · ${item.year}`;
          film.append(title, meta);
          el.append(ph, film);
          copy.append(el);
        }
        frag.append(copy);
      }
    }
    world.replaceChildren(frag);
    render();
  }

  function render() {
    x = mod(x, W);
    y = mod(y, H);
    world.style.transform = `translate3d(${x - W}px,${y - H}px,0)`;
  }

  /* ---- Motion loop (only runs while something is moving) ---- */
  let raf = 0, last = 0, drifting = !reduceMotion;
  let pid = null, sx = 0, sy = 0, lx = 0, ly = 0, lt = 0, moved = false;

  function tick(now) {
    raf = 0;
    const k = Math.min(40, now - last) / 16.7;
    last = now;
    let active = false;
    if (!opened && pid === null && (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05)) {
      x += vx * k;
      y += vy * k;
      const f = Math.pow(0.94, k);
      vx *= f;
      vy *= f;
      active = true;
    }
    if (drifting && !opened) {
      x -= 0.35 * k;
      y -= 0.2 * k;
      active = true;
    }
    render();
    if (active) raf = requestAnimationFrame(tick);
  }
  function kick() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  /* ---- Intro ---- */
  function dismissIntro() {
    if (!intro) return;
    const el = intro;
    intro = null;
    drifting = false;
    el.classList.add('gone');
    setTimeout(() => el.remove(), 1200);
  }
  lookBtn.addEventListener('click', dismissIntro);

  /* ---- Panning: drag (mouse + touch), wheel, arrow keys ---- */
  stage.addEventListener('pointerdown', (e) => {
    if (opened || pid !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    pid = e.pointerId;
    sx = lx = e.clientX;
    sy = ly = e.clientY;
    lt = performance.now();
    moved = false;
    vx = vy = 0;
    if (!e.target.closest('.tile')) clearPeek();
  });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid) return;
    if (!moved) {
      if (Math.hypot(e.clientX - sx, e.clientY - sy) < 6) return;
      moved = true;
      stage.classList.add('dragging');
      dismissIntro();
      clearPeek();
    }
    const now = performance.now();
    const dt = Math.max(1, now - lt);
    const dx = e.clientX - lx, dy = e.clientY - ly;
    x += dx;
    y += dy;
    vx = 0.6 * (dx / dt) * 16.7 + 0.4 * vx;
    vy = 0.6 * (dy / dt) * 16.7 + 0.4 * vy;
    lx = e.clientX;
    ly = e.clientY;
    lt = now;
    render();
  });
  const endDrag = (e) => {
    if (e.pointerId !== pid) return;
    pid = null;
    stage.classList.remove('dragging');
    if (moved) {
      if (performance.now() - lt > 80) vx = vy = 0;
      kick();
    }
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (opened) return;
    dismissIntro();
    const u = (e.deltaMode === 1 ? 16 : 1) * WHEEL_SPEED;
    x -= e.deltaX * u;
    y -= e.deltaY * u;
    vx = vy = 0;
    kick();
  }, { passive: false });

  const ARROWS = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
  document.addEventListener('keydown', (e) => {
    moved = false;
    if (e.key === 'Escape') {
      if (opened) close();
      else closeMenu();
      return;
    }
    const dir = ARROWS[e.key];
    if (!dir || opened || e.target.closest('.menu')) return;
    e.preventDefault();
    dismissIntro();
    vx += dir[0] * 9;
    vy += dir[1] * 9;
    kick();
  });

  // Keyboard focus: bring an off-screen tile into view
  stage.addEventListener('focusin', (e) => {
    const tile = e.target.closest('.tile');
    if (!tile || opened) return;
    const r = tile.getBoundingClientRect();
    if (r.left < 0 || r.top < 0 || r.right > vw || r.bottom > vh) {
      x += vw / 2 - (r.left + r.width / 2);
      y += vh / 2 - (r.top + r.height / 2);
      render();
    }
  });

  /* ---- Hover / tap / open ---- */
  let peeked = null, opened = null, closing = false, lastPt = 'mouse';
  stage.addEventListener('pointerdown', (e) => { lastPt = e.pointerType; }, true);

  function clearPeek() {
    if (peeked) peeked.classList.remove('peek');
    peeked = null;
  }

  stage.addEventListener('click', (e) => {
    const tile = e.target.closest('.tile');
    if (!tile || moved || opened) return;
    const pt = e.pointerType === undefined ? lastPt : e.pointerType;
    // Touch / pen: first tap shows the details, second tap opens the piece
    if ((pt === 'touch' || pt === 'pen') && peeked !== tile) {
      clearPeek();
      peeked = tile;
      tile.classList.add('peek');
      return;
    }
    open(tile);
  });

  function open(tile) {
    dismissIntro();
    clearPeek();
    const item = ITEMS[tile.dataset.item];
    const r = tile.getBoundingClientRect();
    opened = { tile, rect: r };
    if (item.video) setTileVideo(tile, false); // the close-up plays its own copy
    stage.classList.add('is-open');

    // Everything else is pushed straight away from the chosen piece, out of frame
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dist = Math.hypot(vw, vh);
    for (const t of world.querySelectorAll('.tile')) {
      if (t === tile) continue;
      const tr = t.getBoundingClientRect();
      const dx = tr.left + tr.width / 2 - cx, dy = tr.top + tr.height / 2 - cy;
      const len = Math.hypot(dx, dy) || 1;
      t.style.transform = `translate3d(${(dx / len) * dist}px,${(dy / len) * dist}px,0)`;
    }

    // The chosen piece grows from where it sits to a centred close-up
    const zoom = document.createElement('div');
    zoom.className = 'zoom';
    fillMedia(zoom, item);
    if (item.video) {
      const video = document.createElement('video');
      video.className = 'media';
      video.src = item.video;
      video.poster = item.src;
      video.setAttribute('muted', '');
      video.muted = true; // browsers only autoplay silent video
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('autoplay', '');
      video.controls = false;
      video.tabIndex = -1;
      video.setAttribute('aria-hidden', 'true');
      video.addEventListener('canplay', () => { if (video.paused) video.play().catch(() => {}); });
      video.preload = 'auto';
      zoom.append(video);
      video.play().catch(() => {});
    }
    place(zoom, r.left, r.top, r.width, r.height);

    const detail = document.createElement('div');
    detail.className = 'detail';
    const k = document.createElement('p');
    k.className = 'k';
    k.textContent = `${item.kind} · ${item.year}`;
    const h2 = document.createElement('h2');
    h2.textContent = item.title;
    const p = document.createElement('p');
    p.textContent = item.desc;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'look close';
    btn.textContent = 'Close';
    detail.append(k, h2, p);
    if (item.images) {
      const shots = document.createElement('div');
      shots.className = 'shots';
      zoom.classList.add('scrolly');
      zoom.tabIndex = 0;
      zoom.setAttribute('aria-label', `${item.title}: scroll to move between ${item.images.length} images`);
      const marks = item.images.map((_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = String(i + 1).padStart(2, '0');
        b.setAttribute('aria-label', `Image ${i + 1} of ${item.images.length}`);
        b.addEventListener('click', () => zoom.scrollTo({ top: i * zoom.clientHeight, behavior: reduceMotion ? 'auto' : 'smooth' }));
        shots.append(b);
        return b;
      });
      const sync = () => {
        const at = Math.round(zoom.scrollTop / Math.max(1, zoom.clientHeight));
        marks.forEach((b, i) => b.setAttribute('aria-pressed', String(i === at)));
      };
      zoom.addEventListener('scroll', sync, { passive: true });
      sync();
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'Scroll to move through';
      detail.append(hint, shots);
    }
    detail.append(btn);
    lightbox.setAttribute('aria-label', item.title);
    lightbox.replaceChildren(zoom, detail);
    lightbox.hidden = false;
    tile.style.visibility = 'hidden';

    // viewRatio: the close-up frames one image at a time when the tile shows several stacked
    const g = target(1 / (item.viewRatio || item.ratio || r.height / r.width));
    zoom.getBoundingClientRect(); // flush styles so the move below animates from the tile's rect
    place(zoom, g.left, g.top, g.w, g.h);
    detail.style.left = g.dLeft + 'px';
    detail.style.top = g.dTop + 'px';
    detail.style.width = g.dW + 'px';
    detail.classList.add('on');
    lightbox.focus({ preventScroll: true });
  }

  function place(el, left, top, w, h) {
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.width = w + 'px';
    el.style.height = h + 'px';
  }

  // Close-up size + where the details sit (beside the image on wide screens, below on narrow)
  function target(ratio) {
    const pad = vw < 600 ? 16 : 40;
    const wide = vw >= 900;
    const boxW = wide ? vw - pad * 2 - 340 : vw - pad * 2;
    const boxH = wide ? vh - pad * 2 : vh - pad * 2 - 190;
    let w = boxW, h = w / ratio;
    if (h > boxH) { h = boxH; w = h * ratio; }
    if (wide) {
      const left = pad + (boxW - w) / 2;
      const dLeft = left + w + 36;
      return { left, top: (vh - h) / 2, w, h, dLeft, dTop: (vh - h) / 2, dW: Math.min(300, vw - dLeft - pad) };
    }
    return { left: (vw - w) / 2, top: pad, w, h, dLeft: pad, dTop: pad + h + 20, dW: vw - pad * 2 };
  }

  function close(instant) {
    if (!opened || closing) return;
    closing = true;
    const { tile, rect } = opened;
    const finish = () => {
      tile.style.visibility = '';
      if (ITEMS[tile.dataset.item].video && videoWatch) setTileVideo(tile, true);
      lightbox.hidden = true;
      lightbox.replaceChildren();
      opened = null;
      closing = false;
      tile.focus({ preventScroll: true });
    };
    stage.classList.remove('is-open');
    for (const t of world.querySelectorAll('.tile')) t.style.transform = '';
    if (instant) { finish(); return; }
    const zoom = lightbox.querySelector('.zoom');
    zoom.scrollTop = 0; // so it shrinks back into the tile as the stacked view
    lightbox.querySelector('.detail').classList.remove('on');
    place(zoom, rect.left, rect.top, rect.width, rect.height);
    setTimeout(finish, DUR + 50);
  }

  lightbox.addEventListener('click', (e) => {
    if (e.target.closest('video') || (e.target.closest('.detail') && !e.target.closest('.close'))) return;
    close();
  });

  /* ---- Menu: hover the top-right corner (tap it on touch) ---- */
  function closeMenu() {
    menu.classList.remove('open');
    menuTrigger.setAttribute('aria-expanded', 'false');
  }
  menuTrigger.addEventListener('click', (e) => {
    if (e.pointerType === 'mouse') return; // hover handles mouse
    const open = menu.classList.toggle('open');
    menuTrigger.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.contains(e.target)) closeMenu();
  });

  /* ---- Boot ---- */
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (opened) { closing = false; close(true); }
      build();
    }, 150);
  });

  build();
  if (drifting) kick();
})();
