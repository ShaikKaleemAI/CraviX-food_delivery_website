/* =========================================================
   NOTIFICATION SOUND ENGINE (website fallback, NOT the primary channel)
   The real, primary notification channel is the native phone/OS push
   notification sent from the backend and shown by sw.js (silent:false
   on every push, so it always rings on its own). THIS file only exists
   to cover the person who has NOT granted notification permission for
   their role (declined the prompt, hasn't decided yet, or their browser
   doesn't support push at all) — for them there is no native
   notification happening, so the site plays its own sound + shows its
   own in-page banner instead, using the same poll that already runs
   every ~25s (see refreshLiveViews in app.js) to notice a genuine status
   change or a brand-new order.

   The moment permission IS granted, every function below becomes a
   no-op (see pushGranted() just below) — on a granted device the only
   thing that should ever ring or pop up is the real phone notification,
   never both. That's what stops the "multiple notification sounds when
   the website is open" problem: previously this file played its own
   sound on every poll AND every push-arrived-on-open-tab event
   regardless of permission state, stacking on top of the native alert.

   Sounds are synthesized with the Web Audio API (a couple of short
   oscillator tones with an envelope) rather than shipped as audio
   files — no asset to fail to load, no CORS/caching edge cases, and
   it sounds identical everywhere instantly. This is the same
   technique behind most "ding" sounds on the web.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- push-active check ----------
     The website's own sound + banner below exist ONLY as a fallback for
     someone who hasn't turned phone notifications on (declined the
     prompt, browser doesn't support push, etc). The moment a person has
     granted notification permission for their role, the native OS/phone
     notification (sent from the backend, see sw.js's push handler) is
     the ONLY alert that should fire — that's what "show phone
     notifications, not website notifications" means in practice. Without
     this check, someone with an open tab got BOTH the real phone
     notification AND this file's own chime/banner for the exact same
     event, which is the "multiple notification sounds" behavior being
     fixed here. */
  function pushGranted(kind) {
    try {
      if (!window.ShadabPush) return false;
      if (kind === "admin") {
        if (window.ShadabPush.adminAlertsStatus() !== "granted") return false;
        // Browser permission alone isn't enough for admin: the backend
        // only ever sends new-order push alerts to devices that unlocked
        // with the CENTRAL admin password (see notifyAllAdmins in
        // utils/push.js) — a device that only ever used the local/session
        // password can show "granted" here yet never actually receive a
        // push. For that device the website fallback below is still the
        // only alert it will ever get, so it must stay on. Same
        // localStorage key app.js's getAdminMasterPw() reads.
        try { if (!localStorage.getItem("shadab_admin_master_pw")) return false; } catch { return false; }
        return true;
      }
      return window.ShadabPush.customerAlertsStatus() === "granted";
    } catch { return false; }
  }

  // True only when this exact tab is the one the person is looking at
  // right now. This is what separates the two situations that both look
  // like "pushGranted() is true":
  //  1) Tab focused, a push just arrived → Chrome/Firefox deliberately
  //     withhold the OS sound for a focused tab (see sw.js), so THIS
  //     page must be the one to make a sound.
  //  2) Tab backgrounded/not focused → the OS/phone already played (or
  //     silently failed to play, per device notification-channel
  //     settings) the real notification; this page making its own sound
  //     from a backgrounded tab would either double up or not be heard
  //     anyway due to background-tab audio throttling.
  function isForeground() {
    try { return document.visibilityState === "visible" && document.hasFocus(); } catch { return false; }
  }

  const MUTE_KEY = "shadab_sound_muted_v1";
  function isMuted() {
    try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
  }
  function setMuted(v) {
    try { localStorage.setItem(MUTE_KEY, v ? "1" : "0"); } catch {}
  }

  /* ---------- synth ---------- */
  let ctx = null;
  let masterGain = null;
  function getCtx() {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      // A compressor on the master bus is what lets the tones below run
      // noticeably louder (previous version peaked well under half of
      // what's audible on a phone speaker in a normal room) without
      // clipping or distorting when two tones overlap — the same trick
      // real notification/UI sounds use to sound "loud but clean".
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 24;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.002;
      compressor.release.value = 0.15;
      masterGain = ctx.createGain();
      masterGain.gain.value = 1.0;
      masterGain.connect(compressor).connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }
  // Browsers block audio until a real user gesture has happened on the
  // page at least once — wake the context on the first tap/click/key
  // anywhere so it's already unlocked by the time a sound needs to play,
  // instead of the first genuine notification silently failing to play.
  ["pointerdown", "keydown", "touchstart"].forEach((evt) => {
    window.addEventListener(evt, () => getCtx(), { once: true, passive: true });
  });

  // A single tone with a touch of harmonic body (a quiet octave-up layer)
  // instead of one bare oscillator — this is most of why it now sounds
  // "full" and loud rather than thin, on top of the higher peak levels.
  function tone(c, { freq, start, duration, type = "sine", peak = 0.4 }) {
    const t0 = c.currentTime + start;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(masterGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);

    const osc2 = c.createOscillator();
    const gain2 = c.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2, t0);
    gain2.gain.setValueAtTime(0, t0);
    gain2.gain.linearRampToValueAtTime(peak * 0.22, t0 + 0.012);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t0 + duration * 0.7);
    osc2.connect(gain2).connect(masterGain);
    osc2.start(t0);
    osc2.stop(t0 + duration + 0.05);
  }

  // Warm, clearly-audible two-note ascending chime ("ding-dong") — the
  // same family of sound as a phone's built-in message tone — for
  // customer order updates.
  function playCustomerChime() {
    if (isMuted()) return;
    const c = getCtx();
    if (!c) return;
    tone(c, { freq: 987.77, start: 0, duration: 0.24, peak: 0.42 });    // B5
    tone(c, { freq: 1318.51, start: 0.13, duration: 0.4, peak: 0.5 });  // E6
  }

  // Bright, urgent triple-chime — new admin orders, needs to cut through
  // whatever else the person is doing (matches the attention level of a
  // POS/kitchen "new order" bell), noticeably louder than the customer
  // chime since it needs to be heard from across a room.
  function playAdminChimeOnce() {
    if (isMuted()) return;
    const c = getCtx();
    if (!c) return;
    [0, 0.15, 0.3].forEach((t) => tone(c, { freq: 880, start: t, duration: 0.16, peak: 0.55, type: "triangle" }));
    tone(c, { freq: 1318.51, start: 0.44, duration: 0.42, peak: 0.5 });
  }

  let adminLoopTimer = null;
  let adminLoopCount = 0;
  function playAdminAlertLoop() {
    stopAdminAlertLoop();
    playAdminChimeOnce();
    adminLoopCount = 1;
    // Rings twice more (3 total) unless dismissed sooner — enough to be
    // impossible to miss without turning into a nuisance for a single
    // real order.
    adminLoopTimer = setInterval(() => {
      if (adminLoopCount >= 3) { stopAdminAlertLoop(); return; }
      playAdminChimeOnce();
      adminLoopCount++;
    }, 3200);
  }
  function stopAdminAlertLoop() {
    if (adminLoopTimer) { clearInterval(adminLoopTimer); adminLoopTimer = null; }
  }

  /* ---------- sound control is surfaced inside the existing
     "Notifications" settings panel (see js/push.js) instead of its own
     topbar icon — a 6th icon crowded the header and read as
     unpolished. Nothing about sound being ON by default changes: it's
     unmuted unless someone explicitly turns it off from Settings. ---------- */

  /* ---------- admin "new order" spotlight banner ----------
     Pairs with the alert loop above — a persistent, unmissable banner
     (not just the small toast) that stays up until the admin actually
     looks at it, the same way delivery-partner apps surface a new
     order rather than a easy-to-miss ping. */
  let bannerEl = null;
  function showAdminAlertBanner(newOrders) {
    if (!bannerEl) {
      bannerEl = document.createElement("div");
      bannerEl.id = "adminAlertBanner";
      bannerEl.className = "admin-alert-banner";
      bannerEl.innerHTML = `
        <div class="admin-alert-banner__ring"></div>
        <span class="admin-alert-banner__icon">🧾</span>
        <div class="admin-alert-banner__text">
          <strong id="adminAlertBannerTitle"></strong>
          <span id="adminAlertBannerSub"></span>
        </div>
        <button class="admin-alert-banner__view" id="adminAlertBannerView">View</button>
        <button class="admin-alert-banner__close" id="adminAlertBannerClose" aria-label="Dismiss">✕</button>
      `;
      document.body.appendChild(bannerEl);
      bannerEl.querySelector("#adminAlertBannerClose").addEventListener("click", hideAdminAlertBanner);
      bannerEl.querySelector("#adminAlertBannerView").addEventListener("click", () => {
        hideAdminAlertBanner();
        const link = document.querySelector('[data-nav="admin"]');
        if (link) link.click();
      });
    }
    const count = newOrders.length;
    const title = count === 1 ? "New order just came in" : `${count} new orders just came in`;
    const sub = count === 1 && newOrders[0].total
      ? `${newOrders[0].customerName || "Customer"} — ₹${newOrders[0].total}`
      : "Tap View to open the dashboard";
    bannerEl.querySelector("#adminAlertBannerTitle").textContent = title;
    bannerEl.querySelector("#adminAlertBannerSub").textContent = sub;
    bannerEl.classList.remove("is-leaving");
    bannerEl.hidden = false;
    void bannerEl.offsetWidth;
    bannerEl.classList.add("is-visible");
  }
  function hideAdminAlertBanner() {
    if (!bannerEl) return;
    stopAdminAlertLoop();
    bannerEl.classList.remove("is-visible");
    bannerEl.classList.add("is-leaving");
    setTimeout(() => { if (bannerEl) bannerEl.hidden = true; }, 260);
  }

  /* ---------- diff hooks called from app.js polling ---------- */
  // prevMap: Map<id, order> from the PREVIOUS render/poll (undefined/empty
  // Map on first load — callers already guard against firing on first load).
  function onCustomerOrdersUpdated(prevMap, freshOrders, opts) {
    if (!prevMap || !prevMap.size) return;
    // Notifications are on for this device — the real phone notification
    // for this exact status change is already on its way from the
    // backend (see routes/orders.js notifyCustomer calls). Don't also
    // sound the website's own chime on top of it — UNLESS this call is
    // specifically the SW->page push bridge firing on a foregrounded tab
    // (opts.fromPush), in which case the OS notification's sound was
    // just withheld by the browser and this IS the compensating sound.
    const bypassGrantedSkip = !!(opts && opts.fromPush) && isForeground();
    if (pushGranted("customer") && !bypassGrantedSkip) return;
    let changedOrder = null;
    freshOrders.forEach((o) => {
      const prev = prevMap.get(o.id);
      if (prev && prev.status !== o.status) changedOrder = o;
    });
    if (!changedOrder) return;
    playCustomerChime();
  }

  function onAdminOrdersUpdated(prevMap, freshOrders, opts) {
    if (!prevMap || !prevMap.size) return;
    // Same reasoning as onCustomerOrdersUpdated: with admin alerts
    // granted, the real phone notification for this new order already
    // fired (or is about to) from notifyAllAdmins on the backend. Skip
    // both the website chime AND the in-page banner — UNLESS this is the
    // push-bridge call on a foregrounded tab (opts.fromPush), where the
    // browser just withheld the OS sound and this chime is the only
    // sound that will ever play for this order.
    const bypassGrantedSkip = !!(opts && opts.fromPush) && isForeground();
    if (pushGranted("admin") && !bypassGrantedSkip) return;
    const newOnes = freshOrders.filter((o) => !prevMap.has(o.id));
    if (!newOnes.length) return;
    playAdminAlertLoop();
    showAdminAlertBanner(newOnes);
  }

  /* ---------- SW -> page bridge (handles push arriving on an open tab) ----------
     A push landing means this device already has notifications granted —
     the real phone notification is what the person should hear (sw.js
     sets silent:false on every push). This bridge's only job is to keep
     the open tab's data in sync with that event (so the order list/status
     the person sees updates immediately instead of waiting for the next
     poll) — never to play a second sound or show the in-page banner on
     top of the notification that already fired. onCustomerOrdersUpdated/
     onAdminOrdersUpdated (called from inside syncOrdersForPush) already
     no-op for a granted device, so there's nothing extra to guard here. */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      const msg = event.data;
      if (!msg || msg.type !== "shadab-push") return;
      const tag = (msg.payload && msg.payload.tag) || "";
      const kind = tag === "new-order" ? "admin" : "customer";
      if (window.ShadabOrdersSync && window.ShadabOrdersSync.syncOrdersForPush) {
        window.ShadabOrdersSync.syncOrdersForPush(kind);
      }
    });
  }

  window.ShadabNotifySound = {
    playCustomerChime,
    playAdminAlert: playAdminAlertLoop,
    onCustomerOrdersUpdated,
    onAdminOrdersUpdated,
    isMuted,
    setMuted: (v) => { setMuted(v); getCtx(); if (!v) playCustomerChime(); },
  };

  document.addEventListener("DOMContentLoaded", () => getCtx());
})();
