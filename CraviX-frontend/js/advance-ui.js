/* =========================================================
   ADVANCE UI — a focused round of micro-interaction polish on top
   of the existing design (not a redesign): the kind of tactile
   feedback modern food-delivery apps use everywhere — press ripple,
   an item visibly flying into the cart on add, and skeleton loaders
   instead of bare "Loading…" text. Self-contained, same pattern as
   js/push.js and js/notify.js — no index.html changes required.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 1) press ripple on every button / tappable control ---------- */
  function spawnRipple(target, x, y) {
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ui-ripple";
    const size = Math.max(rect.width, rect.height) * 1.6;
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = (x - rect.left - size / 2) + "px";
    ripple.style.top = (y - rect.top - size / 2) + "px";
    target.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  }
  document.addEventListener("pointerdown", (e) => {
    const target = e.target.closest("button, .addbtn, .dish-card, .stepper button, a.btn");
    if (!target || target.disabled) return;
    const style = getComputedStyle(target);
    if (style.position === "static") target.classList.add("ui-ripple-host");
    spawnRipple(target, e.clientX || 0, e.clientY || 0);
  }, { passive: true });

  /* ---------- 2) fly-to-cart flourish on "add" taps ---------- */
  function flyToCart(originEl) {
    const cartBtn = document.getElementById("cartBtn");
    if (!cartBtn || !originEl) return;
    const from = originEl.getBoundingClientRect();
    const to = cartBtn.getBoundingClientRect();
    const dot = document.createElement("div");
    dot.className = "ui-fly-dot";
    dot.textContent = "🛒";
    dot.style.left = (from.left + from.width / 2) + "px";
    dot.style.top = (from.top + from.height / 2) + "px";
    document.body.appendChild(dot);
    const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
    requestAnimationFrame(() => {
      dot.style.transform = `translate(${dx}px, ${dy}px) scale(.35)`;
      dot.style.opacity = "0";
    });
    setTimeout(() => dot.remove(), 620);
  }
  document.addEventListener("click", (e) => {
    const addBtn = e.target.closest(".addbtn, .item-detail__addbtn, .stepper .qty-plus");
    if (!addBtn || addBtn.disabled) return;
    flyToCart(addBtn);
  });

  /* ---------- 3) skeleton loaders ---------- */
  function skeletonOrderCards(n) {
    const card = `
      <div class="skeleton-card">
        <div class="skeleton-line skeleton-line--title"></div>
        <div class="skeleton-line skeleton-line--sub"></div>
        <div class="skeleton-bar"></div>
      </div>`;
    return `<div class="skeleton-wrap">${card.repeat(n || 3)}</div>`;
  }

  window.ShadabAdvanceUI = { skeletonOrderCards };
})();
