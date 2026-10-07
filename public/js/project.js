// Project page gallery.
// The grid starts with the picture chosen on the home page, which glides straight into its slot. The other photos then fan out
// from behind it into two columns and drift slowly (one column up, one down), looping for ever. Scroll or drag to move them
// yourself; let go and they settle back to the slow drift.
// Leaving reverses it: the photos fold back behind that picture, which glides home.
(function () {
  var gallery = document.getElementById('gallery');
  if (!gallery) return;
  var root = document.documentElement;
  var cols = Array.prototype.slice.call(gallery.querySelectorAll('.gcol'));
  var calm = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var SPEED = [16, 11];                                 // px per second, per column (resting drift)
  var state = [], running = false, paused = false, last = 0, boost = 0, leaving = false;
  try { sessionStorage.setItem('zc-last', document.body.dataset.slug); } catch (e) {}   // so the home page reopens on this project

  var mod = function (v, m) { return ((v % m) + m) % m; };
  var heroes = function () { return Array.prototype.slice.call(gallery.querySelectorAll('img[data-hero]')); };
  function visibleFrac(img, box) {
    var r = img.getBoundingClientRect(), h = Math.max(0, Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top));
    var w = Math.max(0, Math.min(r.right, box.right) - Math.max(r.left, box.left));
    return (h * w) / (r.width * r.height || 1);
  }
  function bestHero() {
    var box = gallery.getBoundingClientRect(), best = null, bf = -1;
    heroes().forEach(function (h) { var f = visibleFrac(h, box); if (f > bf) { bf = f; best = h; } });
    return { el: best, frac: bf };
  }
  // Only one element may carry the shared name, so move it to whichever copy of the hero is being used.
  function nameHero(el) {
    heroes().forEach(function (h) { h.style.setProperty('view-transition-name', h === el ? 'hero' : 'none'); h.classList.toggle('is-hero', h === el); });
  }

  // ---- drifting + scrolling ----
  function build() {
    state = cols.map(function (col, i) {
      var strip = col.querySelector('.gstrip');
      strip.querySelectorAll('[data-clone]').forEach(function (n) { n.remove(); });
      var gap = parseFloat(getComputedStyle(strip).rowGap) || 0;
      var setH = strip.scrollHeight + gap, need = col.clientHeight + setH, originals = Array.prototype.slice.call(strip.children);
      while (strip.scrollHeight < need) {
        originals.forEach(function (img) { var c = img.cloneNode(true); c.setAttribute('data-clone', ''); c.alt = ''; c.style.removeProperty('view-transition-name'); strip.appendChild(c); });
      }
      return { strip: strip, setH: setH, off: state[i] ? state[i].off % setH : 0, dir: i % 2 ? -1 : 1, speed: SPEED[i % 2] };
    });
  }
  function paint() {
    state.forEach(function (s) { s.strip.style.transform = 'translate3d(0,' + (s.dir > 0 ? -s.off : s.off - s.setH) + 'px,0)'; });
  }
  function nudge(px) {   // positive = the photos travel up, in both columns
    state.forEach(function (s) { s.off = mod(s.off + px * s.dir, s.setH); });
  }
  function tick(t) {
    var dt = Math.min(.05, (t - last) / 1000); last = t;
    if (!paused) {
      state.forEach(function (s) { s.off = mod(s.off + s.speed * dt + boost * dt * s.dir, s.setH); });
      boost *= Math.exp(-4 * dt);                       // a flick eases away, back to the slow drift
      if (Math.abs(boost) < .5) boost = 0;
      paint();
    }
    requestAnimationFrame(tick);
  }
  function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(tick); }

  gallery.addEventListener('wheel', function (e) {
    if (calm || leaving) return;
    e.preventDefault();
    var d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    boost = Math.max(-2600, Math.min(2600, boost + d * 4));
  }, { passive: false });
  var ty = null;
  gallery.addEventListener('touchstart', function (e) { if (!calm && !leaving) { ty = e.touches[0].clientY; paused = true; } }, { passive: true });
  gallery.addEventListener('touchmove', function (e) {
    if (ty === null) return;
    var y = e.touches[0].clientY; nudge(ty - y); ty = y; paint();
  }, { passive: true });
  function touchEnd() { if (ty === null) return; ty = null; paused = false; }
  gallery.addEventListener('touchend', touchEnd); gallery.addEventListener('touchcancel', touchEnd);

  // ---- the fan: out from behind the hero, and back again ----
  function pileTransform(img, hero, i, count) {
    var r = img.getBoundingClientRect(), h = hero.getBoundingClientRect(), a = (i - (count - 1) / 2) * (46 / count);
    return 'translate(' + (h.left + h.width / 2 - r.left - r.width / 2) + 'px,' + (h.top + h.height / 2 - r.top - r.height / 2) + 'px) rotate(' + a + 'deg) scale(.5)';
  }
  function onScreen(hero) {
    var box = gallery.getBoundingClientRect();
    return Array.prototype.slice.call(gallery.querySelectorAll('.gstrip img')).filter(function (img) {
      if (img === hero) return false;
      var r = img.getBoundingClientRect(); return r.bottom > box.top && r.top < box.bottom;
    });
  }

  function fanOut() {
    var hero = gallery.querySelector('img[data-hero]:not([data-clone])'), shown = onScreen(hero);
    nameHero(hero);
    gallery.classList.add('is-fanning');
    shown.forEach(function (img, i) {
      img.style.transition = 'none'; img.style.opacity = 0;
      img.style.transform = pileTransform(img, hero, i, shown.length);
      img.style.setProperty('--td', (i * .07) + 's');
    });
    root.classList.remove('fan-pending');
    void gallery.offsetWidth;
    shown.forEach(function (img) { img.style.transition = ''; img.style.opacity = 1; img.style.transform = 'none'; });
    setTimeout(function () {
      gallery.classList.remove('is-fanning');
      shown.forEach(function (img) { img.style.transform = img.style.opacity = ''; img.style.removeProperty('--td'); });
      start();
    }, 1300 + shown.length * 70 + 100);
  }

  // Everything except the hero hides (used when the browser's own Back button takes us away: no time to animate).
  function snapToHero() {
    var b = bestHero();
    if (b.frac < .9) { state.forEach(function (s) { s.off = 0; }); paint(); b = bestHero(); }
    nameHero(b.el); gallery.classList.add('is-leaving');
    return b.el;
  }
  window.addEventListener('pageswap', function (e) { if (e.viewTransition && !leaving) { leaving = true; snapToHero(); } });

  // The Back link: fold the photos behind the hero, then go home.
  function foldAndLeave(href) {
    leaving = true; paused = true; boost = 0; ty = null;
    var b = bestHero();
    function fold() {
      var hero = bestHero().el, shown = onScreen(hero);
      nameHero(hero);
      gallery.classList.add('is-fanning');
      shown.forEach(function (img, i) {
        var d = (shown.length - 1 - i) * .04;
        img.style.transition = 'transform .7s cubic-bezier(.5,0,.2,1) ' + d + 's,opacity .4s ease ' + (d + .3) + 's';
        img.style.transform = pileTransform(img, hero, i, shown.length); img.style.opacity = 0;
      });
      setTimeout(function () { gallery.classList.add('is-leaving'); location.href = href; }, 760 + shown.length * 40);
    }
    if (b.frac >= .9) { fold(); return; }
    // The hero has drifted out of view: scroll back up to it (the short way round), then fold the photos behind it.
    var s0 = state[0], dist = mod(-s0.off + s0.setH / 2, s0.setH) - s0.setH / 2;
    var dur = Math.max(600, Math.min(1500, 350 + Math.abs(dist) * .6)), t0 = performance.now(), done = 0;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      nudge(dist * e - done); done = dist * e; paint();
      if (p < 1) requestAnimationFrame(step); else fold();
    })(t0);
  }

  function init() {
    if (document.body.dataset.slug === 'void') {
      root.classList.remove('fan-pending');
      gallery.classList.add('is-static');
      return;
    }
    if (calm) { root.classList.remove('fan-pending'); gallery.classList.add('is-calm'); return; }
    build(); paint();
    // wait for the move from the home page to land before fanning out
    requestAnimationFrame(function () {
      var vt = window.__vt;
      (vt && vt.finished ? vt.finished.catch(function () {}) : Promise.resolve()).then(fanOut);
    });
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); paint(); }, 150); });
    document.querySelectorAll('a[href="index.html"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button || leaving) return;
        e.preventDefault(); foldAndLeave(a.href);
      });
    });
  }
  if (document.readyState === 'complete') init(); else window.addEventListener('load', init);
})();
