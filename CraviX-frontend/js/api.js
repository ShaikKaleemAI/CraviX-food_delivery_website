/* =========================================================
   API CLIENT — talks to the real backend (Node + Express +
   SQLite + Gmail) instead of localStorage for anything that
   needs to be real: accounts, email OTPs, orders, admin data.

   IMPORTANT: set API_BASE_URL below to your deployed backend's
   URL once it's live on Render, e.g.
     const API_BASE_URL = "https://shadab-backend.onrender.com/api";
   Until you do, auth/orders/admin will show a clear error
   instead of silently failing.
   ========================================================= */
(function () {
  "use strict";

  const API_BASE_URL = "https://shadab-backend.onrender.com/api";

  function getToken() {
    try { return localStorage.getItem("shadab_auth_token"); } catch (e) { return null; }
  }
  function setToken(t) {
    try {
      if (t) localStorage.setItem("shadab_auth_token", t);
      else localStorage.removeItem("shadab_auth_token");
    } catch (e) {}
  }

  async function request(path, { method = "GET", body, auth = false, admin = false } = {}) {
    if (API_BASE_URL.includes("PASTE_YOUR_RENDER_BACKEND_URL_HERE")) {
      throw new Error("Backend not connected yet — set API_BASE_URL in js/api.js to your deployed Render URL.");
    }
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = getToken();
      if (token) headers["Authorization"] = "Bearer " + token;
    }
    if (admin) {
      // Two possible sources for the admin password, checked in order:
      //  1. localStorage "master" copy — set only when the CENTRAL
      //     password unlocked admin, so it's remembered forever on this
      //     device/browser (never asked again).
      //  2. sessionStorage copy — set when the LOCAL (normal) password
      //     unlocked admin; cleared when the tab/browser session ends,
      //     and also proactively expired after an inactivity timeout
      //     (see ADMIN_LOCAL_SESSION_TIMEOUT_MS in app.js).
      const adminPw = localStorage.getItem("shadab_admin_master_pw") || sessionStorage.getItem("shadab_admin_session_pw");
      if (adminPw) headers["X-Admin-Password"] = adminPw;
      // Admin actions now also require identity — the backend logs who
      // unlocked admin and checks whether that account has been blocked.
      const token = getToken();
      if (token) headers["Authorization"] = "Bearer " + token;
    }
    let res;
    try {
      res = await fetch(API_BASE_URL + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      throw new Error("Couldn't reach the server. Check your internet connection and try again.");
    }
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      const err = new Error(data.error || "Something went wrong.");
      if (data.code) err.code = data.code;
      throw err;
    }
    return data;
  }

  window.ShadabAPI = {
    getToken, setToken,

    // Auth
    signup: (payload) => request("/auth/signup", { method: "POST", body: payload }),
    resendSignupOtp: (email) => request("/auth/signup/resend", { method: "POST", body: { email } }),
    verifySignup: (email, otp) => request("/auth/signup/verify", { method: "POST", body: { email, otp } }),
    login: (identifier, password) => request("/auth/login", { method: "POST", body: { identifier, password } }),
    forgotPassword: (email) => request("/auth/forgot-password", { method: "POST", body: { email } }),
    resendForgotOtp: (email) => request("/auth/forgot-password/resend", { method: "POST", body: { email } }),
    verifyForgotOtp: (email, otp) => request("/auth/forgot-password/verify", { method: "POST", body: { email, otp } }),
    resetPassword: (email, resetToken, newPassword) =>
      request("/auth/reset-password", { method: "POST", body: { email, resetToken, newPassword } }),
    skipForgotPassword: (email, resetToken) =>
      request("/auth/forgot-password/skip", { method: "POST", body: { email, resetToken } }),
    me: () => request("/auth/me", { auth: true }),
    // Accepts a partial profile payload, e.g. { username }, { mobile },
    // or { photoDataUrl } — only the fields present are updated.
    // (Kept backward-compatible: passing a plain string still works and
    // is treated as { username: <string> }.)
    updateMe: (payload) => request("/auth/me", {
      method: "PATCH",
      body: typeof payload === "string" ? { username: payload } : payload,
      auth: true,
    }),
    changePassword: (currentPassword, newPassword) =>
      request("/auth/me/password", { method: "POST", body: { currentPassword, newPassword }, auth: true }),

    // Orders
    placeOrder: (order) => request("/orders", { method: "POST", body: order, auth: true }),
    myOrders: () => request("/orders/mine", { auth: true }),
    allOrders: () => request("/orders", { admin: true }),
    markDelivered: (id) => request(`/orders/${id}/deliver`, { method: "PATCH", admin: true }),
    undeliverOrder: (id) => request(`/orders/${id}/undeliver`, { method: "PATCH", admin: true }),
    deliverToday: () => request("/orders/deliver-today", { method: "POST", admin: true }),
    undoDeliverToday: () => request("/orders/deliver-today/undo", { method: "POST", admin: true }),
    setOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: "PATCH", body: { status }, admin: true }),
    cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: "PATCH", auth: true }),
    // Edit a still-cancellable order: items/qty, address, contact number.
    // Body: { items:[{id,name,note,price,qty}], total, address, phone,
    // cancelIfEmpty } — cancelIfEmpty:true with an empty items array
    // cancels the order instead of rejecting the request.
    updateOrder: (id, payload) => request(`/orders/${id}`, { method: "PATCH", body: payload, auth: true }),
    // Admin equivalent — no ownership/window restriction. Same body shape.
    adminEditOrder: (id, payload) => request(`/orders/${id}/admin-edit`, { method: "PATCH", body: payload, admin: true }),
    // Admin creates an order on a customer's behalf. Body:
    // { customerName, customerPhone, items, address, forceConfirmed }
    adminCreateOrder: (payload) => request("/orders/admin-create", { method: "POST", body: payload, admin: true }),
    clearAllOrders: () => request("/orders", { method: "DELETE", admin: true }),
    restoreClearedOrders: () => request("/orders/clear-dashboard/undo", { method: "POST", admin: true }),
    poolStatus: () => request("/orders/pool-status"),

    // Admins — active admin accounts, with block/unblock control
    listAdmins: () => request("/admins", { admin: true }),
    blockAdmin: (mobile) => request(`/admins/${mobile}/block`, { method: "PATCH", admin: true }),
    unblockAdmin: (mobile) => request(`/admins/${mobile}/unblock`, { method: "PATCH", admin: true }),

    // Admin password system — verify which password (central/local) just
    // unlocked admin, and change either one independently.
    verifyAdminPassword: () => request("/admins/verify", { admin: true }),
    changeCentralPassword: (currentPassword, newPassword) =>
      request("/admins/password/central", { method: "POST", body: { currentPassword, newPassword }, admin: true }),
    changeLocalPassword: (currentPassword, newPassword) =>
      request("/admins/password/local", { method: "POST", body: { currentPassword, newPassword }, admin: true }),

    // Customers — registered-user directory, search/sort, block/unblock, remove
    customerStats: () => request("/customers/stats", { admin: true }),
    listCustomers: (q, sort) => request(`/customers?q=${encodeURIComponent(q || "")}&sort=${encodeURIComponent(sort || "recent")}`, { admin: true }),
    getCustomer: (id) => request(`/customers/${id}`, { admin: true }),
    blockCustomer: (id) => request(`/customers/${id}/block`, { method: "PATCH", admin: true }),
    unblockCustomer: (id) => request(`/customers/${id}/unblock`, { method: "PATCH", admin: true }),
    clearCustomerData: (id) => request(`/customers/${id}/clear-data`, { method: "PATCH", admin: true }),
    removeCustomer: (id) => request(`/customers/${id}`, { method: "DELETE", admin: true }),

    // Menu
    getMenuOverrides: () => request("/menu"),
    upsertMenuItem: (id, item) => request(`/menu/${id}`, { method: "PUT", body: item, admin: true }),
    deleteMenuItem: (id) => request(`/menu/${id}`, { method: "DELETE", admin: true }),
    restoreMenu: () => request("/menu", { method: "DELETE", admin: true }),

    // Settings — returns/accepts the full settings object (closingTime,
    // graceMinutes, deliveryWindowStart/End, contacts, whatsappGroupLink)
    getSettings: () => request("/settings"),
    updateSettings: (updates) => request("/settings", { method: "PUT", body: updates, admin: true }),

    // Push notifications
    getPushPublicKey: () => request("/push/public-key"),
    subscribeCustomerPush: (subscription) => request("/push/subscribe-customer", { method: "POST", body: { subscription }, auth: true }),
    unsubscribeCustomerPush: (endpoint) => request("/push/unsubscribe-customer", { method: "POST", body: { endpoint }, auth: true }),
    subscribeAdminPush: (subscription) => request("/push/subscribe-admin", { method: "POST", body: { subscription }, admin: true }),
    unsubscribeAdminPush: (endpoint) => request("/push/unsubscribe-admin", { method: "POST", body: { endpoint }, admin: true }),
  };
})();
