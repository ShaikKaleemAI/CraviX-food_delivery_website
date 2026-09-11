/* =========================================================
   PUSH NOTIFICATIONS — setup + subscribe prompts
   Self-contained: builds its own small prompt UI so it doesn't need
   markup added to index.html, and degrades silently (no errors shown
   to the person) on any browser that doesn't support push at all.

   Platform notes:
   - Android Chrome/Firefox: works immediately, any open tab or not.
   - iPhone Safari: Apple ONLY allows push for a site added to the
     Home Screen (iOS 16.4+) — not a regular Safari tab. If we detect
     iOS and the site isn't running installed, we show instructions
     instead of a broken "Enable" button.
   - Desktop Chrome/Firefox/Edge: works like Android.
   - Older/unsupported browsers: everything here silently no-ops.
   ========================================================= */
(function () {
  "use strict";

  const SW_URL = "sw.js";
  const PROMPT_DISMISSED_KEY = "shadab_push_prompt_dismissed_v1";
  const ADMIN_PROMPT_DISMISSED_KEY = "shadab_admin_push_prompt_dismissed_v1";

  function supportsPush() {
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPadOS 13+ reports as Mac
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  let swRegistration = null;
  async function getRegistration() {
    if (swRegistration) return swRegistration;
    try {
      swRegistration = await navigator.serviceWorker.register(SW_URL);
      return swRegistration;
    } catch (err) {
      console.error("Service worker registration failed:", err);
      return null;
    }
  }

  // Our own record of which VAPID public key we last subscribed a device
  // with — see the comment inside subscribe() for why this replaced a
  // browser-property check.
  const VAPID_KEY_STORAGE = "shadab_push_vapid_key_v1";

  async function subscribe(reg) {
    const { publicKey } = await window.ShadabAPI.getPushPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const existing = await reg.pushManager.getSubscription();

    if (existing) {
      // A push subscription is cryptographically bound to whatever VAPID
      // public key was used when it was created — the browser has no way
      // to "update" that later. If the server's VAPID keys are ever
      // regenerated after someone already subscribed, the old subscription
      // still "exists" locally and getSubscription() keeps happily
      // returning it, but the push service rejects every send against it
      // forever (403 on Chrome/FCM, 400 on Firefox's push service).
      //
      // This USED to be detected by reading back existing.options
      // .applicationServerKey and comparing it to the current key. That
      // property isn't reliably readable on every Android browser build —
      // when it came back empty, the old code treated "unknown" as "not
      // the same key" and unsubscribed + recreated the subscription on
      // EVERY page load, even when nothing had changed. That constant
      // re-registration churn is exactly the pattern some Android OEMs'
      // "smart" notification management reads as spammy/unstable and
      // quietly mutes the sound for — matching what was reported (the
      // notification still arrives and vibrates, just silently).
      //
      // Fix: keep our own record of the key we last subscribed with, in
      // localStorage, and only force a resubscribe when THAT record
      // positively disagrees with the current key. An unreadable/missing
      // browser-side key is no longer treated as a mismatch.
      let lastKnownKey = null;
      try { lastKnownKey = localStorage.getItem(VAPID_KEY_STORAGE); } catch {}

      if (lastKnownKey === publicKey) {
        return existing; // confirmed same key — nothing to do, no churn
      }

      if (lastKnownKey === null) {
        // No local record yet (first run after this fix, or localStorage
        // was cleared). Trust the existing subscription instead of forcing
        // a resubscribe on a guess — the backend already detects and
        // prunes genuinely dead subscriptions on send (see sendOne() in
        // utils/push.js), so this only avoids punishing every device on
        // every load for a case that usually doesn't apply. Start
        // recording from here on so future loads compare cleanly.
        try { localStorage.setItem(VAPID_KEY_STORAGE, publicKey); } catch {}
        return existing;
      }

      // We have a real local record and it genuinely disagrees with the
      // current key — an actual key rotation. This is the one case that
      // legitimately needs a fresh subscription.
      try { await existing.unsubscribe(); } catch (err) { console.error("Couldn't clear stale subscription:", err); }
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    try { localStorage.setItem(VAPID_KEY_STORAGE, publicKey); } catch {}
    return sub;
  }

  /* ---------- premium permission primer (no index.html changes needed) ---------- */
  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement("style");
    style.textContent = `
      .push-primer-shade{
        position:fixed; inset:0; z-index:9998;
        background:rgba(10,7,4,.62);
        backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px);
        display:flex; align-items:flex-end; justify-content:center;
        animation:pushShadeIn .3s ease;
      }
      @media (min-width:640px){ .push-primer-shade{ align-items:center; } }
      @keyframes pushShadeIn{ from{opacity:0} to{opacity:1} }
      .push-primer-card{
        width:100%; max-width:420px; margin:0 16px 16px;
        background:linear-gradient(180deg,#241c13,#1a1410);
        border:1px solid rgba(212,169,74,.28);
        border-radius:22px 22px 18px 18px;
        padding:26px 22px 20px;
        box-shadow:0 24px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.02) inset;
        font-family:'Outfit',sans-serif; color:#f3ead9;
        animation:pushCardIn .42s cubic-bezier(.2,.9,.28,1.2);
        position:relative; overflow:hidden;
      }
      @media (min-width:640px){ .push-primer-card{ margin:16px; border-radius:22px; } }
      @keyframes pushCardIn{
        0%{ transform:translateY(28px) scale(.96); opacity:0; }
        100%{ transform:translateY(0) scale(1); opacity:1; }
      }
      .push-primer-glow{
        position:absolute; top:-60px; left:50%; transform:translateX(-50%);
        width:220px; height:180px; border-radius:50%;
        background:radial-gradient(closest-side, rgba(212,169,74,.35), transparent);
        pointer-events:none;
      }
      .push-primer-bell-wrap{
        width:64px; height:64px; margin:0 auto 14px; position:relative;
        display:flex; align-items:center; justify-content:center;
        background:linear-gradient(135deg,#e8c368,#c99a3a);
        border-radius:50%; box-shadow:0 8px 22px rgba(201,154,58,.35);
      }
      .push-primer-bell{ font-size:28px; animation:pushBellRing 2.2s ease-in-out .5s infinite; transform-origin:50% 12%; }
      @keyframes pushBellRing{
        0%,72%,100%{ transform:rotate(0deg); }
        75%{ transform:rotate(-14deg); } 79%{ transform:rotate(11deg); }
        83%{ transform:rotate(-8deg); } 87%{ transform:rotate(5deg); } 90%{ transform:rotate(0deg); }
      }
      .push-primer-title{
        font-family:'Cormorant Garamond',serif; font-weight:700; font-size:23px;
        text-align:center; margin:0 0 6px; color:#f7edd8; letter-spacing:.01em;
      }
      .push-primer-sub{
        text-align:center; font-size:13px; line-height:1.5; color:#cbbfa8; margin:0 0 18px;
      }
      .push-primer-steps{ display:flex; flex-direction:column; gap:11px; margin-bottom:20px; }
      .push-primer-step{ display:flex; align-items:center; gap:11px; opacity:0; animation:pushStepIn .45s ease forwards; }
      .push-primer-step:nth-child(1){ animation-delay:.12s; }
      .push-primer-step:nth-child(2){ animation-delay:.22s; }
      .push-primer-step:nth-child(3){ animation-delay:.32s; }
      @keyframes pushStepIn{ from{ opacity:0; transform:translateX(-8px); } to{ opacity:1; transform:translateX(0); } }
      .push-primer-step-icon{
        width:30px; height:30px; flex-shrink:0; border-radius:9px;
        background:rgba(212,169,74,.14); border:1px solid rgba(212,169,74,.22);
        display:flex; align-items:center; justify-content:center; font-size:14px;
      }
      .push-primer-step-text{ font-size:13px; color:#e6dcc6; }
      .push-primer-step-text b{ color:#f3ead9; font-weight:600; }
      .push-primer-actions{ display:flex; flex-direction:column; gap:9px; }
      .push-primer-allow{
        background:linear-gradient(135deg,#efc96e,#c8973a); color:#241b0f; border:none;
        border-radius:13px; padding:14px; font-weight:700; font-size:14.5px;
        box-shadow:0 6px 18px rgba(201,154,58,.3);
        transition:transform .15s ease, box-shadow .15s ease;
      }
      .push-primer-allow:active{ transform:scale(.97); box-shadow:0 3px 10px rgba(201,154,58,.25); }
      .push-primer-later{
        background:transparent; color:#a99b81; border:none; padding:8px; font-size:13px;
        text-decoration:underline; text-underline-offset:2px;
      }
      .push-primer-shade.is-leaving{ animation:pushShadeOut .25s ease forwards; }
      .push-primer-shade.is-leaving .push-primer-card{ animation:pushCardOut .25s ease forwards; }
      @keyframes pushShadeOut{ to{ opacity:0; } }
      @keyframes pushCardOut{ to{ transform:translateY(18px) scale(.97); opacity:0; } }
    `;
    document.head.appendChild(style);
  }

  function closePrimer(shade) {
    shade.classList.add("is-leaving");
    setTimeout(() => shade.remove(), 260);
  }

  function buildPromptCard({ title, body, confirmLabel, onConfirm, dismissKey, steps, iosMode }) {
    if (document.getElementById("pushPrimerShade")) return; // already showing one
    injectStyles();

    const shade = document.createElement("div");
    shade.className = "push-primer-shade";
    shade.id = "pushPrimerShade";
    shade.setAttribute("role", "dialog");
    shade.setAttribute("aria-modal", "true");

    const stepsHtml = (steps || [])
      .map((s) => `
        <div class="push-primer-step">
          <span class="push-primer-step-icon">${s.icon}</span>
          <span class="push-primer-step-text"><b>${s.label}</b> — ${s.detail}</span>
        </div>`)
      .join("");

    shade.innerHTML = `
      <div class="push-primer-card">
        <div class="push-primer-glow"></div>
        <div class="push-primer-bell-wrap"><span class="push-primer-bell">${iosMode ? "📲" : "🔔"}</span></div>
        <h3 class="push-primer-title">${title}</h3>
        <p class="push-primer-sub">${body}</p>
        ${stepsHtml ? `<div class="push-primer-steps">${stepsHtml}</div>` : ""}
        <div class="push-primer-actions">
          <button class="push-primer-allow" id="pushPrimerConfirm">${confirmLabel}</button>
          <button class="push-primer-later" id="pushPrimerDismiss">Maybe later</button>
        </div>
      </div>
    `;
    document.body.appendChild(shade);

    shade.addEventListener("click", (e) => { if (e.target === shade) { markDismissed(dismissKey); closePrimer(shade); } });
    shade.querySelector("#pushPrimerDismiss").addEventListener("click", () => {
      markDismissed(dismissKey);
      closePrimer(shade);
    });
    shade.querySelector("#pushPrimerConfirm").addEventListener("click", async () => {
      const btn = shade.querySelector("#pushPrimerConfirm");
      btn.textContent = "Enabling…";
      await onConfirm();
      closePrimer(shade);
    });
  }

  // Dismissing the prompt card used to silence it FOREVER (a flag of "1"
  // that never expired) — someone who tapped "Maybe later" once, before
  // they understood what it was for, would never see it again even if
  // they went on to place several orders blind with no status updates.
  // Storing today's date instead means a dismissal only holds for the
  // rest of today; the next time they open the app on a new day (or
  // place an order/land on the page), they get one more reminder. An
  // enabled subscription (Notification.permission === "granted") is
  // checked before this everywhere it's used, so someone who already
  // turned notifications on never sees this regardless.
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
  function wasDismissed(key) {
    try { return localStorage.getItem(key) === todayKey(); } catch { return false; }
  }
  function markDismissed(key) {
    try { localStorage.setItem(key, todayKey()); } catch {}
  }

  /* ---------- customer flow ---------- */
  async function promptCustomer() {
    if (!supportsPush()) return;
    if (Notification.permission === "denied") return;
    // Checked BEFORE the dismissed-prompt flag, deliberately: permission
    // can end up "granted" through paths that never went through our
    // in-app card at all (the browser's own site-settings toggle, or a
    // permission granted after an earlier visit where the card had been
    // dismissed) — in every one of those cases we still need to actually
    // create/refresh the subscription and hand it to the backend. Gating
    // this on wasDismissed() was a real bug: once someone tapped "Maybe
    // later" even once, this silent resubscribe check would never run
    // again, so a later "Allow" (granted outside our card) would show as
    // permission:"granted" in the browser while the backend never
    // actually received a subscription to send pushes to.
    if (Notification.permission === "granted") {
      silentlyEnsureCustomerSubscription();
      return;
    }
    if (wasDismissed(PROMPT_DISMISSED_KEY)) return;

    if (isIOS() && !isStandalone()) {
      buildPromptCard({
        title: "Get order updates on your iPhone",
        body: "iPhone requires the site to be added to your Home Screen first. Tap the Share button in Safari, then \u201cAdd to Home Screen\u201d — then open Shadab from there and notifications will work.",
        confirmLabel: "Got it",
        dismissKey: PROMPT_DISMISSED_KEY,
        iosMode: true,
        onConfirm: async () => {},
      });
      return;
    }

    buildPromptCard({
      title: "Turn on notifications",
      body: "Turn on notifications for a better experience — get real-time updates the moment your order is confirmed, starts preparing, and arrives.",
      confirmLabel: "Enable notifications",
      dismissKey: PROMPT_DISMISSED_KEY,
      steps: [
        { icon: "🎉", label: "Confirmed", detail: "the moment your order is locked in" },
        { icon: "👨‍🍳", label: "Preparing", detail: "when the kitchen starts cooking" },
        { icon: "✅", label: "Arrived", detail: "the second it reaches your door" },
      ],
      onConfirm: () => subscribeCustomerDevice(false),
    });
  }

  // silent=true: used by the automatic on-load/already-granted check — no
  // toast on success (that would fire on every page visit) and no toast
  // if permission simply isn't granted yet. silent=false: used by the
  // prompt card's "Enable" tap and the Notifications settings modal — a
  // real user action gets real feedback either way.
  async function subscribeCustomerDevice(silent) {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        // "default" here (as opposed to "denied") almost always means the
        // permission dialog itself never resolved cleanly — most commonly
        // Android refusing to show it at all because a floating bubble/
        // overlay from another app (chat heads, a call-recorder widget, a
        // screen-recording control, MIUI's floating assistant, etc.) is
        // active over the screen, which Android blocks on purpose to
        // prevent tap-jacking permission prompts. The OS's own dialog says
        // this, but it's easy to miss/dismiss without reading, so it's
        // repeated here in a normal in-app toast that persists.
        if (!silent) {
          window.ShadabToast && window.ShadabToast(
            permission === "denied"
              ? "Notifications are blocked for this site — enable them in your browser's site settings, then try again."
              : "Couldn't show the permission prompt — close any floating bubble/overlay apps (chat heads, screen recorder, etc.) running on top of your screen, then try again."
          );
        }
        return false;
      }
      const reg = await getRegistration();
      if (!reg) { window.ShadabToast && window.ShadabToast("Couldn't set up notifications on this browser."); return false; }
      const sub = await subscribe(reg);
      await window.ShadabAPI.subscribeCustomerPush(sub.toJSON());
      if (!silent) window.ShadabToast && window.ShadabToast("🔔 Order notifications are on.");
      return true;
    } catch (err) {
      console.error("Customer push subscribe failed:", err);
      window.ShadabToast && window.ShadabToast("Couldn't enable notifications — " + (err.message || "please try again."));
      return false;
    }
  }

  // Turns notifications off for THIS device only — unsubscribes locally
  // and tells the backend to stop sending to it. Notification.permission
  // itself can't be revoked from JS (that's a one-way grant only the
  // person can undo from their own browser settings), so "off" here means
  // "no longer subscribed," which is the only thing actually in our
  // control and is what stops pushes from arriving either way.
  async function disableCustomerAlerts() {
    try {
      const reg = await getRegistration();
      if (!reg) return;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        const endpoint = existing.endpoint;
        try { await existing.unsubscribe(); } catch (err) { console.error("Local unsubscribe failed:", err); }
        try { localStorage.removeItem(VAPID_KEY_STORAGE); } catch {}
        await window.ShadabAPI.unsubscribeCustomerPush(endpoint);
      }
      window.ShadabToast && window.ShadabToast("Notifications turned off for this device.");
    } catch (err) {
      console.error("Customer push unsubscribe failed:", err);
      window.ShadabToast && window.ShadabToast("Couldn't turn off notifications — " + (err.message || "please try again."));
    }
  }

  function customerAlertsStatus() {
    return !supportsPush() ? "unsupported" : Notification.permission;
  }

  /* ---------- Notifications settings modal (menu entry) ----------
     A permanent, always-reachable control — unlike the one-time prompt
     card, opening this never depends on whether the card was dismissed
     earlier. Shows the live status and lets the person turn notifications
     on or off for this device on demand. */
  function openCustomerNotificationSettings() {
    if (document.getElementById("pushSettingsShade")) return; // already open
    injectStyles();

    const shade = document.createElement("div");
    shade.className = "push-primer-shade";
    shade.id = "pushSettingsShade";
    shade.setAttribute("role", "dialog");
    shade.setAttribute("aria-modal", "true");
    document.body.appendChild(shade);

    function closeSettings() {
      shade.classList.add("is-leaving");
      setTimeout(() => shade.remove(), 260);
    }

    function render() {
      const status = customerAlertsStatus();
      let statusText, primaryLabel = null, primaryAction = null;

      if (status === "unsupported") {
        statusText = "Notifications aren't supported on this browser or device.";
      } else if (status === "denied") {
        statusText = "Notifications are blocked for this site in your browser's settings. Turn them on there, then come back here.";
      } else if (status === "granted") {
        // Permission being "granted" only means the browser will accept a
        // push — it does NOT guarantee Android actually wakes this browser
        // app to deliver it. Phones with aggressive battery managers
        // (Xiaomi/MIUI, Vivo, Oppo, OnePlus, Huawei) routinely kill
        // background browser processes to save power, which silently
        // blocks push delivery with no error anywhere — the exact "granted
        // but never arrives" report this line exists to head off.
        statusText = "Notifications are on for this device — you'll get updates the moment your order is confirmed, starts preparing, and arrives. If they stop arriving, check your phone's battery settings: some phones (Xiaomi/MIUI, Vivo, Oppo, OnePlus) restrict browser apps in the background by default — set this browser's battery usage to \u201cNo restrictions\u201d / \u201cUnrestricted\u201d and allow \u201cAutostart\u201d for it, so it isn't the phone's battery saver silently blocking notifications.";
        primaryLabel = "Turn off notifications";
        primaryAction = async () => { await disableCustomerAlerts(); render(); };
      } else if (isIOS() && !isStandalone()) {
        statusText = "iPhone requires the site to be added to your Home Screen first. Tap the Share button in Safari, then \u201cAdd to Home Screen\u201d — then open Shadab from there.";
      } else {
        statusText = "Turn on notifications for a better experience — get real-time updates the moment your order is confirmed, starts preparing, and arrives.";
        primaryLabel = "Enable notifications";
        primaryAction = async () => { await subscribeCustomerDevice(false); render(); };
      }

      const soundOn = !(window.ShadabNotifySound && window.ShadabNotifySound.isMuted());
      shade.innerHTML = `
        <div class="push-primer-card">
          <div class="push-primer-glow"></div>
          <div class="push-primer-bell-wrap"><span class="push-primer-bell">🔔</span></div>
          <h3 class="push-primer-title">Notifications</h3>
          <p class="push-primer-sub">${statusText}</p>
          <div class="push-primer-actions">
            ${primaryLabel ? `<button class="push-primer-allow" id="pushSettingsPrimaryBtn">${primaryLabel}</button>` : ""}
            <button class="push-primer-later" id="pushSettingsCloseBtn">Close</button>
          </div>
          ${window.ShadabNotifySound ? `
          <div class="push-primer-sound-row" id="pushSettingsSoundRow">
            <span>🔊 Notification sound</span>
            <button class="push-primer-sound-toggle${soundOn ? " is-on" : ""}" id="pushSettingsSoundToggle" role="switch" aria-checked="${soundOn}" aria-label="Toggle notification sound"><span></span></button>
          </div>` : ""}
        </div>
      `;

      if (primaryAction) {
        shade.querySelector("#pushSettingsPrimaryBtn").addEventListener("click", async () => {
          const btn = shade.querySelector("#pushSettingsPrimaryBtn");
          btn.textContent = "Please wait…";
          await primaryAction();
        });
      }
      shade.querySelector("#pushSettingsCloseBtn").addEventListener("click", closeSettings);
      const soundToggle = shade.querySelector("#pushSettingsSoundToggle");
      if (soundToggle) {
        soundToggle.addEventListener("click", () => {
          window.ShadabNotifySound.setMuted(soundToggle.classList.contains("is-on"));
          render();
        });
      }
    }

    shade.addEventListener("click", (e) => { if (e.target === shade) closeSettings(); });
    render();
  }

  async function silentlyEnsureCustomerSubscription() {
    try {
      if (!supportsPush() || Notification.permission !== "granted") return;
      const reg = await getRegistration();
      if (!reg) return;
      const sub = await subscribe(reg);
      await window.ShadabAPI.subscribeCustomerPush(sub.toJSON());
    } catch (err) {
      console.error("Silent push resubscribe failed:", err);
      window.ShadabToast && window.ShadabToast("Notifications: couldn't refresh subscription — " + (err.message || "unknown error."));
    }
  }

  /* ---------- admin flow ---------- */
  async function promptAdmin() {
    if (!supportsPush()) return;
    if (Notification.permission === "denied") return;
    // Same fix as promptCustomer() above: check granted BEFORE the
    // dismissed-prompt flag, so a permission granted via any path (browser
    // site settings, or after an earlier "Maybe later") still gets a
    // subscription actually created and sent to the backend instead of
    // silently doing nothing forever.
    if (Notification.permission === "granted") {
      await subscribeAdminDevice(true);
      return;
    }
    if (wasDismissed(ADMIN_PROMPT_DISMISSED_KEY)) return;

    if (isIOS() && !isStandalone()) {
      buildPromptCard({
        title: "Get new-order alerts on your iPhone",
        body: "Add Shadab to your Home Screen first (Share button \u2192 \u201cAdd to Home Screen\u201d), then open it from there to enable admin alerts.",
        confirmLabel: "Got it",
        dismissKey: ADMIN_PROMPT_DISMISSED_KEY,
        iosMode: true,
        onConfirm: async () => {},
      });
      return;
    }

    buildPromptCard({
      title: "Get new-order alerts",
      body: "Get a notification on this device the instant a new order comes in — even with the app closed.",
      confirmLabel: "Enable admin alerts",
      dismissKey: ADMIN_PROMPT_DISMISSED_KEY,
      steps: [
        { icon: "🧾", label: "New order", detail: "the second a customer checks out" },
        { icon: "💰", label: "Order total", detail: "amount and item count, right in the alert" },
        { icon: "⚡", label: "Instant", detail: "works even with the app fully closed" },
      ],
      onConfirm: () => subscribeAdminDevice(false),
    });
  }

  // silent=true: used by the automatic on-load check — no toast on success
  // (that would fire on literally every admin panel visit) and no toast if
  // permission simply isn't granted yet (that's an expected, common state,
  // not a failure). silent=false: used by the explicit Settings button and
  // the prompt card's own "Enable" tap — a real user action deserves real
  // feedback either way, success or failure, which is exactly what was
  // missing before and made this impossible to debug from the admin side.
  async function subscribeAdminDevice(silent) {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (!silent) window.ShadabToast && window.ShadabToast(permission === "denied" ? "Notifications are blocked for this site — enable them in your browser's site settings, then try again." : "Notifications permission wasn't granted.");
        return;
      }
      const reg = await getRegistration();
      if (!reg) { window.ShadabToast && window.ShadabToast("Couldn't set up notifications on this browser."); return; }
      const sub = await subscribe(reg);
      await window.ShadabAPI.subscribeAdminPush(sub.toJSON());
      if (!silent) window.ShadabToast && window.ShadabToast("🔔 New-order alerts enabled on this device.");
    } catch (err) {
      console.error("Admin push subscribe failed:", err);
      // Surfaced (not just logged) because this exact failure was
      // previously invisible — permission would show "granted" in the
      // browser while the backend silently never got the subscription
      // (e.g. an expired login session, or the admin password header
      // missing), and there was no way to tell without opening devtools.
      window.ShadabToast && window.ShadabToast("Couldn't enable order alerts on this device — " + (err.message || "please try again."));
    }
  }

  window.ShadabPush = {
    promptCustomer, promptAdmin, supportsPush, isIOS, isStandalone,
    // Exposed for the explicit "New-Order Alerts on This Device" row in
    // Settings — a permanent, always-available control that works even if
    // the one-time prompt card was dismissed earlier (dismissing it only
    // suppresses that popup, it shouldn't permanently lock someone out of
    // ever turning alerts on again from a real settings screen).
    enableAdminAlerts: () => subscribeAdminDevice(false),
    adminAlertsStatus: () => (!supportsPush() ? "unsupported" : Notification.permission),
    // Customer-side equivalent — the "Notifications" side-menu entry opens
    // openCustomerSettings(), a permanent control independent of whether
    // the one-time prompt card was ever shown or dismissed.
    openCustomerSettings: openCustomerNotificationSettings,
    enableCustomerAlerts: () => subscribeCustomerDevice(false),
    disableCustomerAlerts,
    customerAlertsStatus,
  };

  // Register the service worker as early as possible regardless of
  // whether/when a prompt is shown, so it's ready the moment permission
  // is granted (and so an already-granted returning visitor's
  // subscription silently stays fresh without needing to re-prompt).
  if (supportsPush()) {
    window.addEventListener("load", () => { getRegistration(); });
  }
})();
