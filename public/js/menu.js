// Shared menu: hover opens it on desktop (CSS); on touch, tap the circle. Tap elsewhere or press Escape to close.
(function () {
  var menu = document.getElementById('menu'), btn = document.getElementById('menu-trigger');
  if (!menu || !btn) return;
  function close() { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  btn.addEventListener('click', function (e) {
    if (e.pointerType === 'mouse') return;
    btn.setAttribute('aria-expanded', String(menu.classList.toggle('open')));
  });
  document.addEventListener('pointerdown', function (e) { if (!menu.contains(e.target)) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();
