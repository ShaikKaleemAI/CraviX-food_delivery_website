/* =========================================================
   SHADAB RESTAURANT — APP LOGIC
   Front-end only demo: uses localStorage as the data store.
   ========================================================= */
(function(){
  "use strict";

  /* ---------------- ICONS (inline SVG, no external images) ---------------- */
  const ICONS = {
    handi: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 20h28l-2.4 15.4A5 5 0 0 1 30.6 40H17.4a5 5 0 0 1-5-4.6L10 20Z"/><path d="M7 20h34"/><path d="M17 20c0-5 3-9 7-9s7 4 7 9"/><path d="M20 6.5c0 1.4-1.2 1.6-1.2 3s1.2 1.6 1.2 3M28 6.5c0 1.4-1.2 1.6-1.2 3s1.2 1.6 1.2 3"/></svg>`,
    plate: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="27" r="13"/><path d="M24 18v18M18 20v14M30 20v14"/><path d="M15 8c0 2-1.4 2.2-1.4 4.2S15 14.4 15 16.4M22 6c0 2-1.4 2.2-1.4 4.2S22 12.4 22 14.4M29 8c0 2-1.4 2.2-1.4 4.2S29 14.4 29 16.4"/></svg>`,
    drumstick: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 30c-4 4-8 5-10 7a3.2 3.2 0 0 0 4.5 4.5c2-2 3-6 7-10"/><path d="M18 30c-4-6-2-14 5-19 6-4.3 13-3 16 2s1 12-5 16.3c-5.5 4-13.6 5-16-.3Z"/></svg>`,
    lollipop: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="17" r="11"/><path d="M24 28v14"/><path d="M19 34h10"/><path d="M17 13c1.5-3 4-4.5 7-4.5"/></svg>`,
  };
  const ICON_KEYS = Object.keys(ICONS);

  /* ---------------- BASE MENU (from restaurant price list) ---------------- */
  const CATEGORY_ORDER = ["Buckets", "Biryani", "Fry", "Curry"];
  const BASE_MENU = [
    { id:"dumbucket-chicken", name:"Chicken Dum Biryani Bucket", note:"", price:480, category:"Buckets", icon:"handi",
      description:"Our signature bucket — layers of fragrant basmati rice slow-cooked on dum with tender chicken, sealed in its own steam for maximum flavour." },
    { id:"dumbucket-medium",  name:"Medium Dum Bucket",          note:"", price:850, category:"Buckets", icon:"handi",
      description:"A larger, family-style portion of our dum biryani — perfect for sharing or a bigger appetite." },
    { id:"biryani-2pc",       name:"Two Piece Biryani",          note:"", price:180, category:"Biryani", icon:"plate",
      description:"Our classic dum biryani served with two well-marinated chicken pieces, sealed and slow-cooked for deep flavour." },
    { id:"biryani-lolipop",   name:"Lolipop Biryani",            note:"", price:210, category:"Biryani", icon:"lollipop",
      description:"Dum biryani paired with tandoor-style chicken lollipops for a little extra bite alongside the classic flavours." },
    { id:"biryani-1pc",       name:"One Piece Biryani",          note:"", price:120, category:"Biryani", icon:"plate",
      description:"A lighter portion of our classic dum biryani with one chicken piece — perfect for a quick, satisfying meal." },
    { id:"biryani-fry",       name:"Fry Biryani",                note:"", price:210, category:"Fry", icon:"plate",
      description:"Dum biryani topped with crispy fried chicken pieces, for those who love a bit of crunch with their rice." },
    { id:"fry-130",           name:"Chicken Fry - 130",          note:"200–250gm", price:130, category:"Fry", icon:"drumstick",
      description:"Crispy, spice-marinated chicken fry, cooked fresh to order — a perfect side or standalone snack." },
    { id:"fry-180",           name:"Chicken Fry - 180",          note:"400–450gm", price:180, category:"Fry", icon:"drumstick",
      description:"A bigger portion of our crispy, spice-marinated chicken fry — cooked fresh to order." },
    { id:"biryani-curry",     name:"Curry Biryani",              note:"", price:210, category:"Curry", icon:"plate",
      description:"Dum biryani served alongside a rich, home-style chicken curry for dipping and drizzling over the rice." },
  ];
  // static product photos, named to match each item's id (see images/menu/)
  BASE_MENU.forEach(item => { item.image = "images/menu/" + item.id + ".jpg"; });

  const DEFAULT_ADMIN_PASSWORD = "Shadab@2026";
  const DEFAULT_CLOSING_TIME = "19:15"; // 7:15 PM
  const ORDER_RETENTION_MS = 12 * 60 * 60 * 1000; // 12 hours

  /* ---------------- LIVE SETTINGS (synced from the backend, so every
     customer and the admin see the same closing time, grace window,
     delivery window, contacts, and WhatsApp link — not just this device) --- */
  const DEFAULT_SETTINGS = {
    closingTime: DEFAULT_CLOSING_TIME,
    graceMinutes: 3,
    deliveryWindowStart: "20:30",
    deliveryWindowEnd: "20:45",
    whatsappGroupLink: "https://chat.whatsapp.com/JiF939y4TlyKkZaFuznaWe",
    contacts: [
      { id: "shareef", name: "Shareef", phone: "+91 63009 47969", details: "" },
    ],
    minOrderPoolAmount: 600,
    cancelWindowMinutes: 15,
    cancellationMode: "afterClosing",
    cancelWindowStart: "18:00",
    cancelWindowEnd: "19:00",
  };
  let liveSettings = { ...DEFAULT_SETTINGS };
  // Today's pool progress ({ total, minAmount, met }), refreshed
  // periodically — drives the continuous fill of the "Pending" segment
  // of each order's live progress bar. Starts optimistic (0/DEFAULT) so
  // the first paint has something sane before the first fetch resolves.
  let livePool = { total: 0, minAmount: DEFAULT_SETTINGS.minOrderPoolAmount, met: false, deliveryArrivedAt: null, poolFailedAt: null };

  /* Escapes user-supplied text (customer names, addresses, emails —
     anything not written by us) before it goes into an innerHTML template
     string. Without this, a customer could put e.g. an <img onerror=...>
     tag as their name/address at checkout and have it execute in the
     ADMIN's browser the moment they view orders — a stored XSS hole that
     hands over the admin's session. Every place below that interpolates
     user-entered text into innerHTML now runs it through this first. */
  function escapeHtml(str){
    return String(str ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  /* ---------------- STORAGE HELPERS ---------------- */
  const LS = {
    get(key, fallback){ try{ const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }catch(e){ return fallback; } },
    set(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
  };

  const store = {
    get theme(){ return LS.get("shadab_theme", "light"); },
    set theme(v){ LS.set("shadab_theme", v); },

    get cart(){ return LS.get("shadab_cart", {}); },
    set cart(v){ LS.set("shadab_cart", v); },

    get currentUser(){ return LS.get("shadab_current_user", null); },
    set currentUser(v){ LS.set("shadab_current_user", v); },

    get users(){ return LS.get("shadab_users", {}); },
    set users(v){ LS.set("shadab_users", v); },

    get orders(){ return LS.get("shadab_orders", []); },
    set orders(v){ LS.set("shadab_orders", v); },

    get settings(){ return LS.get("shadab_settings", { closingTime: DEFAULT_CLOSING_TIME }); },
    set settings(v){ LS.set("shadab_settings", v); },

    get adminPassword(){ return LS.get("shadab_admin_password", DEFAULT_ADMIN_PASSWORD); },
    set adminPassword(v){ LS.set("shadab_admin_password", v); },

    get adminUnlocked(){ return LS.get("shadab_admin_unlocked", false); },
    set adminUnlocked(v){ LS.set("shadab_admin_unlocked", !!v); },

    // menu customisation
    // Menu customisations now live on the backend (Firestore, via
    // /api/menu) so every device — admin and customer alike — sees the
    // same menu. This cache is only an offline/first-paint fallback,
    // refreshed from the server on load (see loadMenuCatalog()).
    get menuDocsCache(){ return LS.get("shadab_menu_docs_cache", []); },
    set menuDocsCache(v){ LS.set("shadab_menu_docs_cache", v); },
  };

  /* ---------------- MENU (base + admin customisations, merged live) ----------------
     menuDocs holds the raw override docs fetched from the backend: one per
     customised/added item, keyed by id. An id that matches a BASE_MENU item
     is a price/name/etc override on that item; any other id is a fully
     custom item. `deleted: true` on a doc hides a base item (custom items
     are removed outright via the API instead). */
  let menuDocs = store.menuDocsCache || [];
  function getMenu(){
    const overridesById = {};
    menuDocs.forEach(d => { if(d && d.id) overridesById[d.id] = d; });
    let items = BASE_MENU
      .map(item => {
        const ov = overridesById[item.id];
        if(!ov) return item;
        if(ov.deleted) return null;
        return { ...item, ...ov };
      })
      .filter(Boolean);
    const baseIds = new Set(BASE_MENU.map(m => m.id));
    const customItems = menuDocs.filter(d => d && d.id && !baseIds.has(d.id) && !d.deleted);
    return items.concat(customItems);
  }
  function findItem(id){ return getMenu().find(m => m.id === id); }
  /* Pulls the real menu from the backend so admin edits (price changes,
     added/removed items) show up for every customer, not just the admin's
     own browser. Falls back to the last-known cache if the request fails,
     same pattern as loadSettings(). */
  async function loadMenuCatalog(){
    try{
      const data = await ShadabAPI.getMenuOverrides();
      menuDocs = data.items || [];
      store.menuDocsCache = menuDocs;
    }catch(err){
      menuDocs = store.menuDocsCache || [];
    }
    renderMenu();
    try{ renderMenuManage(); }catch(e){}
  }

  /* Renders a dish's media: an uploaded photo, else a static photo, else the icon.
     If an <img> fails to load, a global error listener (added once, see init())
     swaps it for the icon automatically. */
  function mediaHTML(item){
    const iconKey = ICONS[item.icon] ? item.icon : "plate";
    const src = item.imageData || item.image;
    if(src) return `<img src="${src}" alt="" data-fallback-icon="${iconKey}">`;
    return ICONS[iconKey];
  }
  function wireImageFallback(container){
    container.addEventListener("error", (e)=>{
      const img = e.target;
      if(img.tagName === "IMG" && img.dataset.fallbackIcon){
        img.outerHTML = ICONS[img.dataset.fallbackIcon] || ICONS.plate;
      }
    }, true);
  }

  /* ---------------- housekeeping: auto-clear orders older than 12h ---------------- */
  function purgeOldOrders(){
    const cutoff = Date.now() - ORDER_RETENTION_MS;
    const orders = store.orders;
    const kept = orders.filter(o => (o.timestamp || 0) >= cutoff);
    if(kept.length !== orders.length) store.orders = kept;
  }

  /* ---------------- DOM SHORTCUTS ---------------- */
  const $ = (sel, root=document) => root.querySelector(sel);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const el = {
    body: document.body,
    themeToggle: $("#themeToggle"),
    hamburgerBtn: $("#hamburgerBtn"),
    sideNav: $("#sideNav"),
    navShade: $("#navShade"),
    sideNavClose: $("#sideNavClose"),
    sideNavUserName: $("#sideNavUserName"),
    sideNavUserHint: $("#sideNavUserHint"),
    navAuth: $("#navAuth"),
    navAuthLabel: $("#navAuthLabel"),
    navLogoutItem: $("#navLogoutItem"),
    navLogout: $("#navLogout"),
    navCart: $("#navCart"),

    cartBtn: $("#cartBtn"),
    cartBadge: $("#cartBadge"),
    bottomNavCartBadge: $("#bottomNavCartBadge"),
    bottomNavCartBtn: $("#bottomNavCartBtn"),
    drawerShade: $("#drawerShade"),
    cartDrawer: $("#cartDrawer"),
    cartCloseBtn: $("#cartCloseBtn"),
    cartItems: $("#cartItems"),
    cartTotal: $("#cartTotal"),
    checkoutBtn: $("#checkoutBtn"),
    cartClosedNote: $("#cartClosedNote"),

    menuList: $("#menuList"),
    menuCatNav: $("#menuCatNav"),
    heroOrderBtn: $("#heroOrderBtn"),
    topbar: $("#topbar"),

    orderTimeStrip: $("#orderTimeStrip"),
    orderTimeText: $("#orderTimeText"),
    eventBanner: $("#eventBanner"),
    eventBannerIcon: $("#eventBannerIcon"),
    eventBannerText: $("#eventBannerText"),
    trustCutoff: $("#trustCutoff"),

    myOrdersList: $("#myOrdersList"),
    myOrdersFilterTabs: $("#myOrdersFilterTabs"),
    myOrdersActiveTabLabel: $("#myOrdersActiveTabLabel"),
    myOrdersDayToggle: $("#myOrdersDayToggle"),
    myOrdersDayInfo: $("#myOrdersDayInfo"),
    myOrdersDayToggleBtn: $("#myOrdersDayToggleBtn"),

    orderPlacedShade: $("#orderPlacedShade"),
    orderPlacedModal: $("#orderPlacedModal"),
    orderPlacedIcon: $("#orderPlacedIcon"),
    orderPlacedTitle: $("#orderPlacedTitle"),
    orderPlacedMsg: $("#orderPlacedMsg"),
    orderPlacedMeta: $("#orderPlacedMeta"),
    viewMyOrdersBtn: $("#viewMyOrdersBtn"),
    continueBrowsingBtn: $("#continueBrowsingBtn"),
    orderPlacedCloseBtn: $("#orderPlacedCloseBtn"),

    statusInfoShade: $("#statusInfoShade"),
    statusInfoModal: $("#statusInfoModal"),
    statusInfoIcon: $("#statusInfoIcon"),
    statusInfoTitle: $("#statusInfoTitle"),
    statusInfoMsg: $("#statusInfoMsg"),
    statusInfoCloseBtn: $("#statusInfoCloseBtn"),
    statusInfoGotItBtn: $("#statusInfoGotItBtn"),

    profileNameInput: $("#profileNameInput"),
    profileNameEditBtn: $("#profileNameEditBtn"),
    profileAvatar: $("#profileAvatar"),
    profilePhotoBtn: $("#profilePhotoBtn"),
    profilePhotoInput: $("#profilePhotoInput"),
    profilePhoneInput: $("#profilePhoneInput"),
    profilePhoneEditBtn: $("#profilePhoneEditBtn"),
    profileChangePwBtn: $("#profileChangePwBtn"),
    changePwShade: $("#changePwShade"),
    changePwModal: $("#changePwModal"),
    changePwForm: $("#changePwForm"),
    currentPwInput: $("#currentPwInput"),
    newPwInput: $("#newPwInput"),
    confirmPwInput: $("#confirmPwInput"),
    changePwError: $("#changePwError"),
    cancelChangePwBtn: $("#cancelChangePwBtn"),
    confirmChangePwBtn: $("#confirmChangePwBtn"),
    profileSinceValue: $("#profileSinceValue"),
    profileLogoutBtn: $("#profileLogoutBtn"),

    adminGate: $("#adminGate"),
    adminDash: $("#adminDash"),
    adminGateForm: $("#adminGateForm"),
    adminPassword: $("#adminPassword"),
    adminGateError: $("#adminGateError"),
    adminLogoutBtn: $("#adminLogoutBtn"),
    copyOrdersBtn: $("#copyOrdersBtn"),
    copyOrdersBtnLabel: $("#copyOrdersBtnLabel"),
    allOrdersList: $("#allOrdersList"),
    adminOrderProgressWrap: $("#adminOrderProgressWrap"),
    statOrderCount: $("#statOrderCount"),
    statTotalAmount: $("#statTotalAmount"),
    poolBanner: $("#poolBanner"),
    poolBannerAmount: $("#poolBannerAmount"),
    poolBannerStatus: $("#poolBannerStatus"),
    poolBannerFill: $("#poolBannerFill"),
    adminDeliverArrivedBtn: $("#adminDeliverArrivedBtn"),
    adminDeliverArrivedLabel: $("#adminDeliverArrivedLabel"),
    deliverArrivedShade: $("#deliverArrivedShade"),
    deliverArrivedModal: $("#deliverArrivedModal"),
    deliverArrivedModalIco: $("#deliverArrivedModalIco"),
    deliverArrivedModalTitle: $("#deliverArrivedModalTitle"),
    deliverArrivedModalBody: $("#deliverArrivedModalBody"),
    cancelDeliverArrivedBtn: $("#cancelDeliverArrivedBtn"),
    confirmDeliverArrivedBtn: $("#confirmDeliverArrivedBtn"),
    adminsList: $("#adminsList"),
    statCustomersRegistered: $("#statCustomersRegistered"),
    statCustomersOrdered: $("#statCustomersOrdered"),
    customersSearchInput: $("#customersSearchInput"),
    clearCustomersSearchBtn: $("#clearCustomersSearchBtn"),
    customersSortChips: $("#customersSortChips"),
    customersMatchHint: $("#customersMatchHint"),
    customersList: $("#customersList"),
    customerDetailShade: $("#customerDetailShade"),
    customerDetailModal: $("#customerDetailModal"),
    customerDetailCloseBtn: $("#customerDetailCloseBtn"),
    customerDetailName: $("#customerDetailName"),
    customerDetailContact: $("#customerDetailContact"),
    customerDetailStats: $("#customerDetailStats"),
    customerDetailStatus: $("#customerDetailStatus"),
    customerDetailActions: $("#customerDetailActions"),
    customerBlockToggleBtn: $("#customerBlockToggleBtn"),
    customerClearDataBtn: $("#customerClearDataBtn"),
    customerRemoveBtn: $("#customerRemoveBtn"),
    customerActionShade: $("#customerActionShade"),
    customerActionModal: $("#customerActionModal"),
    customerActionIco: $("#customerActionIco"),
    customerActionTitle: $("#customerActionTitle"),
    customerActionBody: $("#customerActionBody"),
    cancelCustomerActionBtn: $("#cancelCustomerActionBtn"),
    confirmCustomerActionBtn: $("#confirmCustomerActionBtn"),
    poolAmountInput: $("#poolAmountInput"),
    savePoolAmountBtn: $("#savePoolAmountBtn"),
    currentPoolLabel: $("#currentPoolLabel"),
    settingsSummaryPool: $("#settingsSummaryPool"),
    cancelWindowInput: $("#cancelWindowInput"),
    saveCancelWindowBtn: $("#saveCancelWindowBtn"),
    currentCancelWindowLabel: $("#currentCancelWindowLabel"),
    settingsSummaryCancelWindow: $("#settingsSummaryCancelWindow"),
    cancelModeChips: $("#cancelModeChips"),
    cancelRangeStartInput: $("#cancelRangeStartInput"),
    cancelRangeEndInput: $("#cancelRangeEndInput"),
    verifyDateInput: $("#verifyDateInput"),
    verifyOrdersList: $("#verifyOrdersList"),
    closingTimeInput: $("#closingTimeInput"),
    saveClosingTimeBtn: $("#saveClosingTimeBtn"),
    resetClosingTimeBtn: $("#resetClosingTimeBtn"),
    currentClosingLabel: $("#currentClosingLabel"),
    changeCentralPasswordForm: $("#changeCentralPasswordForm"),
    currentCentralPasswordInput: $("#currentCentralPasswordInput"),
    newCentralPasswordInput: $("#newCentralPasswordInput"),
    confirmCentralPasswordInput: $("#confirmCentralPasswordInput"),
    changeCentralPasswordError: $("#changeCentralPasswordError"),
    changeCentralPasswordSuccess: $("#changeCentralPasswordSuccess"),
    centralPwdStrength: $("#centralPwdStrength"),
    centralPwdStrengthFill: $("#centralPwdStrengthFill"),
    centralPwdStrengthLabel: $("#centralPwdStrengthLabel"),

    changeLocalPasswordForm: $("#changeLocalPasswordForm"),
    currentLocalPasswordInput: $("#currentLocalPasswordInput"),
    newLocalPasswordInput: $("#newLocalPasswordInput"),
    confirmLocalPasswordInput: $("#confirmLocalPasswordInput"),
    changeLocalPasswordError: $("#changeLocalPasswordError"),
    changeLocalPasswordSuccess: $("#changeLocalPasswordSuccess"),
    localPwdStrength: $("#localPwdStrength"),
    localPwdStrengthFill: $("#localPwdStrengthFill"),
    localPwdStrengthLabel: $("#localPwdStrengthLabel"),

    menuManageList: $("#menuManageList"),
    addItemBtn: $("#addItemBtn"),
    restoreMenuBtn: $("#restoreMenuBtn"),
    itemForm: $("#itemForm"),
    itemFormTitle: $("#itemFormTitle"),
    itemNameInput: $("#itemNameInput"),
    itemPriceInput: $("#itemPriceInput"),
    itemCategoryInput: $("#itemCategoryInput"),
    itemNoteInput: $("#itemNoteInput"),
    iconChoiceRow: $("#iconChoiceRow"),
    cancelItemFormBtn: $("#cancelItemFormBtn"),
    itemPhotoInput: $("#itemPhotoInput"),
    itemPhotoPreview: $("#itemPhotoPreview"),
    removeItemPhotoBtn: $("#removeItemPhotoBtn"),

    loginShade: $("#loginShade"),
    loginModal: $("#loginModal"),
    loginCloseBtn: $("#loginCloseBtn"),
    loginIdentifier: $("#loginIdentifier"),
    loginPassword: $("#loginPassword"),
    loginError: $("#loginError"),
    loginSubmitBtn: $("#loginSubmitBtn"),
    openForgotBtn: $("#openForgotBtn"),
    loginToSignupBtn: $("#loginToSignupBtn"),

    signupShade: $("#signupShade"),
    signupModal: $("#signupModal"),
    signupCloseBtn: $("#signupCloseBtn"),
    signupStepDetails: $("#signupStepDetails"),
    signupStepVerify: $("#signupStepVerify"),
    signupStepSuccess: $("#signupStepSuccess"),
    signupUsername: $("#signupUsername"),
    signupMobile: $("#signupMobile"),
    signupEmail: $("#signupEmail"),
    signupEmailError: $("#signupEmailError"),
    signupPassword: $("#signupPassword"),
    signupConfirm: $("#signupConfirm"),
    signupStrengthBar: $("#signupStrengthBar"),
    signupStrengthLabel: $("#signupStrengthLabel"),
    signupError: $("#signupError"),
    signupDetailsBtn: $("#signupDetailsBtn"),
    signupToLoginBtn: $("#signupToLoginBtn"),
    signupEmailEcho: $("#signupEmailEcho"),
    signupEditDetailsBtn: $("#signupEditDetailsBtn"),
    signupOtpBoxes: $$("#signupOtpBoxesWrap .otp-box"),
    signupOtpTimer: $("#signupOtpTimer"),
    signupOtpTimerText: $("#signupOtpTimerText"),
    signupOtpTimerBar: $("#signupOtpTimerBar"),
    signupDemoHint: $("#signupDemoHint"),
    signupVerifyBtn: $("#signupVerifyBtn"),
    signupResendBtn: $("#signupResendBtn"),
    signupSuccessName: $("#signupSuccessName"),
    signupContinueBtn: $("#signupContinueBtn"),

    forgotShade: $("#forgotShade"),
    forgotModal: $("#forgotModal"),
    forgotCloseBtn: $("#forgotCloseBtn"),
    forgotStepEmail: $("#forgotStepEmail"),
    forgotStepOtp: $("#forgotStepOtp"),
    forgotStepNewPass: $("#forgotStepNewPass"),
    forgotStepDone: $("#forgotStepDone"),
    forgotEmail: $("#forgotEmail"),
    forgotEmailError: $("#forgotEmailError"),
    forgotSendBtn: $("#forgotSendBtn"),
    forgotBackToLoginBtn: $("#forgotBackToLoginBtn"),
    forgotEmailEcho: $("#forgotEmailEcho"),
    forgotEditEmailBtn: $("#forgotEditEmailBtn"),
    forgotOtpBoxes: $$("#forgotOtpBoxesWrap .otp-box"),
    forgotOtpTimer: $("#forgotOtpTimer"),
    forgotOtpTimerText: $("#forgotOtpTimerText"),
    forgotOtpTimerBar: $("#forgotOtpTimerBar"),
    forgotDemoHint: $("#forgotDemoHint"),
    forgotVerifyBtn: $("#forgotVerifyBtn"),
    forgotResendBtn: $("#forgotResendBtn"),
    forgotNewPass: $("#forgotNewPass"),
    forgotConfirmPass: $("#forgotConfirmPass"),
    forgotStrengthBar: $("#forgotStrengthBar"),
    forgotStrengthLabel: $("#forgotStrengthLabel"),
    forgotPassError: $("#forgotPassError"),
    forgotSaveBtn: $("#forgotSaveBtn"),
    forgotSkipBtn: $("#forgotSkipBtn"),
    forgotDoneTitle: $("#forgotDoneTitle"),
    forgotDoneMessage: $("#forgotDoneMessage"),
    forgotDoneBtn: $("#forgotDoneBtn"),

    profileEmailValue: $("#profileEmailValue"),

    checkoutShade: $("#checkoutShade"),
    checkoutModal: $("#checkoutModal"),
    checkoutCloseBtn: $("#checkoutCloseBtn"),
    checkoutSummary: $("#checkoutSummary"),
    confirmOrderBtn: $("#confirmOrderBtn"),

    logoutShade: $("#logoutShade"),
    logoutModal: $("#logoutModal"),
    cancelLogoutBtn: $("#cancelLogoutBtn"),
    confirmLogoutBtn: $("#confirmLogoutBtn"),

    copyOrderIdsBtn: $("#copyOrderIdsBtn"),
    copyOrderIdsBtnLabel: $("#copyOrderIdsBtnLabel"),
    clearOrdersBtn: $("#clearOrdersTabBtn"),
    clearOrdersShade: $("#clearOrdersShade"),
    clearOrdersModal: $("#clearOrdersModal"),
    cancelClearOrdersBtn: $("#cancelClearOrdersBtn"),
    confirmClearOrdersBtn: $("#confirmClearOrdersBtn"),
    restoreOrdersBtn: $("#restoreOrdersTabBtn"),
    restoreOrdersShade: $("#restoreOrdersShade"),
    restoreOrdersModal: $("#restoreOrdersModal"),
    cancelRestoreOrdersBtn: $("#cancelRestoreOrdersBtn"),
    confirmRestoreOrdersBtn: $("#confirmRestoreOrdersBtn"),
    itemDescInput: $("#itemDescInput"),
    ordersSearchInput: $("#ordersSearchInput"),
    ordersSearchWrap: $("#ordersSearchWrap"),
    clearOrdersSearchBtn: $("#clearOrdersSearchBtn"),
    verifySearchInput: $("#verifySearchInput"),

    searchToggleBtn: $("#searchToggleBtn"),
    searchPanel: $("#searchPanel"),
    searchInput: $("#searchInput"),
    searchCloseBtn: $("#searchCloseBtn"),
    searchResults: $("#searchResults"),

    bannerCarousel: $("#bannerCarousel"),
    bannerTrack: $("#bannerTrack"),
    bannerDots: $("#bannerDots"),
    bannerPrev: $("#bannerPrev"),
    bannerNext: $("#bannerNext"),

    itemDetailShade: $("#itemDetailShade"),
    itemDetailModal: $("#itemDetailModal"),
    itemDetailCloseBtn: $("#itemDetailCloseBtn"),
    itemDetailMedia: $("#itemDetailMedia"),
    itemDetailCategory: $("#itemDetailCategory"),
    itemDetailName: $("#itemDetailName"),
    itemDetailDesc: $("#itemDetailDesc"),
    itemDetailPrice: $("#itemDetailPrice"),
    itemDetailQty: $("#itemDetailQty"),
    itemDetailMinus: $("#itemDetailMinus"),
    itemDetailPlus: $("#itemDetailPlus"),
    itemDetailAddBtn: $("#itemDetailAddBtn"),

    toast: $("#toast"),

    navContact: $("#navContact"),
    navNotifications: $("#navNotifications"),
    trustDelivery: $("#trustDelivery"),
    homeFooterDelivery: $("#homeFooterDelivery"),
    homeFooterWhatsapp: $("#homeFooterWhatsapp"),
    heroWhatsapp: $("#heroWhatsapp"),

    contactShade: $("#contactShade"),
    contactModal: $("#contactModal"),
    contactCloseBtn: $("#contactCloseBtn"),
    contactList: $("#contactList"),
    contactWhatsappBtn: $("#contactWhatsappBtn"),

    devContactShade: $("#devContactShade"),
    devContactModal: $("#devContactModal"),
    devContactCloseBtn: $("#devContactCloseBtn"),
    devCreditBtn: $("#devCreditBtn"),
    devCreditBtnFooter: $("#devCreditBtnFooter"),

    footerYear: $("#footerYear"),
    footerCutoff: $("#footerCutoff"),
    footerDelivery: $("#footerDelivery"),
    footerNavCart: $("#footerNavCart"),
    footerNavContact: $("#footerNavContact"),
    footerNavWhatsapp: $("#footerNavWhatsapp"),

    checkoutDeliveryTime: $("#checkoutDeliveryTime"),

    cancelOrderShade: $("#cancelOrderShade"),
    cancelOrderModal: $("#cancelOrderModal"),
    editOrderShade: $("#editOrderShade"),
    editOrderModal: $("#editOrderModal"),
    editOrderCloseBtn: $("#editOrderCloseBtn"),
    editOrderIdLabel: $("#editOrderIdLabel"),
    editOrderSubtitle: $("#editOrderSubtitle"),
    editOrderItems: $("#editOrderItems"),
    editOrderAddBtn: $("#editOrderAddBtn"),
    editOrderContactToggle: $("#editOrderContactToggle"),
    editOrderContactFields: $("#editOrderContactFields"),
    editOrderAddress: $("#editOrderAddress"),
    editOrderPhone: $("#editOrderPhone"),
    editOrderTotal: $("#editOrderTotal"),
    editOrderError: $("#editOrderError"),
    saveEditOrderBtn: $("#saveEditOrderBtn"),

    dishPickerShade: $("#dishPickerShade"),
    dishPickerModal: $("#dishPickerModal"),
    dishPickerCloseBtn: $("#dishPickerCloseBtn"),
    dishPickerSearchInput: $("#dishPickerSearchInput"),
    dishPickerList: $("#dishPickerList"),
    dishPickerDoneBtn: $("#dishPickerDoneBtn"),

    emptyOrderShade: $("#emptyOrderShade"),
    emptyOrderModal: $("#emptyOrderModal"),
    emptyOrderKeepBtn: $("#emptyOrderKeepBtn"),
    emptyOrderCancelBtn: $("#emptyOrderCancelBtn"),

    photoCropShade: $("#photoCropShade"),
    photoCropModal: $("#photoCropModal"),
    photoCropCloseBtn: $("#photoCropCloseBtn"),
    photoCropStage: $("#photoCropStage"),
    photoCropCanvas: $("#photoCropCanvas"),
    photoCropZoom: $("#photoCropZoom"),
    photoCropSaveBtn: $("#photoCropSaveBtn"),

    adminNewOrderBtn: $("#adminNewOrderBtn"),
    adminNewOrderShade: $("#adminNewOrderShade"),
    adminNewOrderModal: $("#adminNewOrderModal"),
    adminNewOrderCloseBtn: $("#adminNewOrderCloseBtn"),
    adminNewOrderName: $("#adminNewOrderName"),
    adminNewOrderPhone: $("#adminNewOrderPhone"),
    adminNewOrderItems: $("#adminNewOrderItems"),
    adminNewOrderAddBtn: $("#adminNewOrderAddBtn"),
    adminNewOrderAddress: $("#adminNewOrderAddress"),
    adminNewOrderForceConfirm: $("#adminNewOrderForceConfirm"),
    adminNewOrderTotal: $("#adminNewOrderTotal"),
    adminNewOrderError: $("#adminNewOrderError"),
    adminNewOrderSaveBtn: $("#adminNewOrderSaveBtn"),
    keepOrderBtn: $("#keepOrderBtn"),
    confirmCancelOrderBtn: $("#confirmCancelOrderBtn"),

    cancelTermsShade: $("#cancelTermsShade"),
    cancelTermsModal: $("#cancelTermsModal"),
    cancelTermsBody: $("#cancelTermsBody"),
    cancelTermsCloseBtn: $("#cancelTermsCloseBtn"),
    cancelTermsGotItBtn: $("#cancelTermsGotItBtn"),

    orderStatusChips: $("#orderStatusChips"),
    statCancelledCount: $("#statCancelledCount"),

    settingsList: $("#settingsList"),
    settingsPushAlertsBtn: $("#settingsPushAlertsBtn"),
    settingsSummaryPushAlerts: $("#settingsSummaryPushAlerts"),
    settingsDetail: $("#settingsDetail"),
    settingsBackBtn: $("#settingsBackBtn"),
    settingsSummaryClosing: $("#settingsSummaryClosing"),
    settingsSummaryGrace: $("#settingsSummaryGrace"),
    settingsSummaryDelivery: $("#settingsSummaryDelivery"),
    settingsSummaryContacts: $("#settingsSummaryContacts"),
    settingsSummaryWhatsapp: $("#settingsSummaryWhatsapp"),

    graceMinutesInput: $("#graceMinutesInput"),
    saveGraceBtn: $("#saveGraceBtn"),
    currentGraceLabel: $("#currentGraceLabel"),

    deliveryStartInput: $("#deliveryStartInput"),
    deliveryEndInput: $("#deliveryEndInput"),
    saveDeliveryBtn: $("#saveDeliveryBtn"),
    currentDeliveryLabel: $("#currentDeliveryLabel"),

    adminContactsList: $("#adminContactsList"),
    addContactBtn: $("#addContactBtn"),
    contactFormCard: $("#contactFormCard"),
    contactFormTitle: $("#contactFormTitle"),
    contactForm: $("#contactForm"),
    contactNameInput: $("#contactNameInput"),
    contactPhoneInput: $("#contactPhoneInput"),
    contactDetailsInput: $("#contactDetailsInput"),
    cancelContactFormBtn: $("#cancelContactFormBtn"),

    whatsappLinkInput: $("#whatsappLinkInput"),
    saveWhatsappBtn: $("#saveWhatsappBtn"),
  };

  let toastTimer = null;
  let editingItemId = null;       // null = adding new, else editing this id
  let selectedIconKey = ICON_KEYS[0];
  let pendingImageData = null;    // base64 photo for the item being added/edited

  /* =========================================================
     TOAST
     ========================================================= */
  function showToast(msg){
    el.toast.textContent = msg;
    el.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> el.toast.classList.remove("is-visible"), 2600);
  }
  // Exposed so js/push.js (a separate, self-contained module) can surface a
  // push-subscribe failure instead of only logging it to the console where
  // nobody would ever see it — that silence is exactly what made a broken
  // admin-notification subscription impossible to diagnose before.
  window.ShadabToast = showToast;

  /* =========================================================
     EVENT BANNER — transient below-header strip for order placed /
     status updates that happen while the person is on-site. Separate
     from the toast (which is a floating overlay) and from the always-
     present ordertime-strip below it (closing time / delivery-arrived),
     so this never fights either for the same space.
     ========================================================= */
  let eventBannerTimer = null;
  let pendingOrderBanner = null; // queued banner shown once the "order placed" modal is closed — see placeOrder()
  function showEventBanner(icon, text, ms = 4200){
    if(!el.eventBanner) return;
    clearTimeout(eventBannerTimer);
    el.eventBanner.classList.remove("is-leaving");
    el.eventBannerIcon.textContent = icon;
    el.eventBannerText.textContent = text;
    el.eventBanner.hidden = false;
    eventBannerTimer = setTimeout(()=>{
      el.eventBanner.classList.add("is-leaving");
      setTimeout(()=>{ el.eventBanner.hidden = true; el.eventBanner.classList.remove("is-leaving"); }, 300);
    }, ms);
  }

  // Order status badges show just a short word ("Pending", "Confirmed"…)
  // to avoid overflowing the card — tapping one opens a small, properly
  // designed info card (not a toast bubble floating over content) with
  // the full explanation.
  const STATUS_INFO_ICONS = { pending:"⏳", confirmed:"✅", preparing:"👨‍🍳", delivered:"🎉", cancelled:"❌" };
  function openStatusInfoModal(badge){
    const statusKey = Object.keys(STATUS_INFO_ICONS).find(k => badge.classList.contains(k)) || "pending";
    el.statusInfoIcon.textContent = STATUS_INFO_ICONS[statusKey];
    el.statusInfoTitle.textContent = badge.textContent.trim();
    el.statusInfoMsg.textContent = badge.dataset.tip || "";
    el.statusInfoShade.classList.add("is-open");
    el.statusInfoModal.classList.add("is-open");
    registerOverlay("statusInfo", closeStatusInfoModal);
  }
  function closeStatusInfoModal(){
    el.statusInfoShade.classList.remove("is-open");
    el.statusInfoModal.classList.remove("is-open");
    unregisterOverlay("statusInfo");
  }
  if(el.statusInfoCloseBtn) el.statusInfoCloseBtn.addEventListener("click", closeStatusInfoModal);
  if(el.statusInfoGotItBtn) el.statusInfoGotItBtn.addEventListener("click", closeStatusInfoModal);
  if(el.statusInfoShade) el.statusInfoShade.addEventListener("click", closeStatusInfoModal);
  document.addEventListener("click", (e)=>{
    const badge = e.target.closest(".order-card__status[data-tip]");
    if(badge) openStatusInfoModal(badge);
  });

  /* =========================================================
     THEME
     ========================================================= */
  function applyTheme(theme){
    el.body.setAttribute("data-theme", theme);
    store.theme = theme;
  }
  el.themeToggle.addEventListener("click", ()=>{
    const next = el.body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });
  applyTheme(store.theme);

  /* =========================================================
     PASSWORD SHOW/HIDE
     ========================================================= */
  $$(".pwd-eye").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const input = document.getElementById(btn.dataset.target);
      if(!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "🙈" : "👁";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });

  /* =========================================================
     BACK-BUTTON / SWIPE-BACK SUPPORT
     Every overlay (side nav, cart, modals) pushes a history entry when it
     opens. Pressing the hardware/on-screen back button — or swiping back
     on mobile — fires 'popstate', which this closes the topmost overlay
     instead of leaving the page. With nothing open, it falls back to
     normal in-app view navigation (home/orders/profile/admin).
     ========================================================= */
  const VALID_VIEWS = ["home","orders","profile","admin"];
  const MODAL_SWITCH_MS = 180;
  function switchModal(closeFn, openFn){
    closeFn();
    setTimeout(openFn, MODAL_SWITCH_MS);
  }

  const overlayStack = [];
  function registerOverlay(name, closeFn){
    overlayStack.push({ name, closeFn });
    history.pushState({ shadabOverlay: name }, "", location.href);
  }
  function unregisterOverlay(name){
    const idx = overlayStack.findIndex(o => o.name === name);
    if(idx !== -1) overlayStack.splice(idx, 1);
  }
  window.addEventListener("popstate", ()=>{
    if(overlayStack.length > 0){
      const top = overlayStack.pop();
      top.closeFn();
    } else {
      const hash = location.hash.replace("#","");
      showView(VALID_VIEWS.includes(hash) ? hash : "home");
    }
  });

  /* =========================================================
     SIDE NAV (tree-line menu)
     ========================================================= */
  function openNav(){
    el.sideNav.classList.add("is-open");
    el.navShade.classList.add("is-open");
    el.hamburgerBtn.setAttribute("aria-expanded","true");
    registerOverlay("nav", closeNav);
  }
  function closeNav(){
    el.sideNav.classList.remove("is-open");
    el.navShade.classList.remove("is-open");
    el.hamburgerBtn.setAttribute("aria-expanded","false");
    unregisterOverlay("nav");
  }
  el.hamburgerBtn.addEventListener("click", ()=>{
    el.sideNav.classList.contains("is-open") ? closeNav() : openNav();
  });
  el.sideNavClose.addEventListener("click", closeNav);
  el.navShade.addEventListener("click", closeNav);

  /* =========================================================
     VIEW ROUTER
     ========================================================= */
  let viewTransitionToken = 0;
  const VIEW_LEAVE_MS = 130;
  function showView(name){
    const views = $$(".view");
    const target = views.find(v => v.dataset.view === name);
    if(!target) return;

    $$("[data-nav]").forEach(a => a.classList.toggle("is-active", a.dataset.nav === name));
    closeNav();

    const finishSwap = ()=>{
      views.forEach(v => {
        v.classList.remove("is-leaving", "is-entering");
        v.hidden = v !== target;
      });
      // force reflow so the entrance keyframe reliably restarts every time
      void target.offsetWidth;
      target.classList.add("is-entering");
      window.scrollTo({top:0, behavior:"auto"});
      if(name === "orders") renderMyOrders(false, true);
      if(name === "profile") renderProfile();
      if(name === "admin") renderAdmin();
    };

    const myToken = ++viewTransitionToken;
    const current = views.find(v => !v.hidden && v !== target);
    if(current){
      current.classList.add("is-leaving");
      setTimeout(()=>{
        if(myToken !== viewTransitionToken) return; // a newer navigation already took over
        finishSwap();
      }, VIEW_LEAVE_MS);
    } else {
      finishSwap();
    }
  }
  function navigateTo(name){
    showView(name);
    history.pushState({ shadabView: name }, "", "#"+name);
  }
  $$("[data-nav]").forEach(a=>{
    a.addEventListener("click", (e)=>{
      e.preventDefault();
      navigateTo(a.dataset.nav);
    });
  });
  el.heroOrderBtn.addEventListener("click", (e)=>{ e.preventDefault(); document.getElementById("menu").scrollIntoView({behavior:"smooth"}); });

  /* =========================================================
     CLOSING TIME + COUNTDOWN + GRACE PERIOD
     ========================================================= */
  function formatTime12(hhmm){
    const [h,m] = hhmm.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    let hr = h % 12; if(hr === 0) hr = 12;
    return `${hr}:${String(m).padStart(2,"0")} ${period}`;
  }
  function formatCountdown(ms){
    const totalSec = Math.max(0, Math.floor(ms/1000));
    const h = Math.floor(totalSec/3600);
    const m = Math.floor((totalSec%3600)/60);
    const s = totalSec%60;
    if(h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    return `${m}:${String(s).padStart(2,"0")}`;
  }
  function getOrderingState(){
    const closing = liveSettings.closingTime || DEFAULT_CLOSING_TIME;
    const graceMs = (Number(liveSettings.graceMinutes) || 0) * 60 * 1000;
    const [ch, cm] = closing.split(":").map(Number);
    const now = new Date();
    const closeDate = new Date(now);
    closeDate.setHours(ch, cm, 0, 0);
    const graceEnd = new Date(closeDate.getTime() + graceMs);
    if(now < closeDate) return { phase:"open", msLeft: closeDate - now, label: formatTime12(closing) };
    if(now < graceEnd)  return { phase:"grace", msLeft: graceEnd - now, label: formatTime12(closing) };
    return { phase:"closed", msLeft: 0, label: formatTime12(closing) };
  }
  function isOrderingOpen(){ return getOrderingState().phase !== "closed"; }
  /* Cancellation deadline has two admin-selectable modes (mirrors the
     backend's getCancelWindow in orders.js):
       - "afterClosing": a single shared clock deadline for the whole day
         — closing time + extra/grace time + the admin's cancellation
         allowance. Open from the moment the order is placed.
       - "timeRange": cancellation is only allowed inside a fixed daily
         clock-time window, independent of closing time.
     Always computed from the CURRENT liveSettings (not a value frozen on
     the order at creation time) — so if the admin changes the closing
     time, grace period, cancellation allowance, or mode, every open
     order's countdown, "Cancellation terms" text, and Cancel-button
     visibility update to match immediately, on the very next tick.
     Returns { mode, opensAtMs, closesAtMs, isOpen, notYetOpen, closed }. */
  /* Combines an order's calendar date with an "HH:MM" clock time into an
     absolute instant — shared by the cancellation window and the live
     progress calculations below. */
  function dateTimeMs(o, hhmm){
    const dateBase = o && o.dateKey ? new Date(`${o.dateKey}T00:00:00`) : new Date();
    const [h,m] = String(hhmm || "00:00").split(":").map(Number);
    const d = new Date(dateBase);
    d.setHours(h||0, m||0, 0, 0);
    return d.getTime();
  }
  function getCancelWindow(o){
    if(!o) return { mode:"afterClosing", opensAtMs:null, closesAtMs:Infinity, isOpen:isOrderingOpen(), notYetOpen:false, closed:!isOrderingOpen() };
    const mode = liveSettings.cancellationMode === "timeRange" ? "timeRange" : "afterClosing";
    let opensAtMs, closesAtMs;
    if(mode === "timeRange"){
      opensAtMs = dateTimeMs(o, liveSettings.cancelWindowStart || "18:00");
      closesAtMs = dateTimeMs(o, liveSettings.cancelWindowEnd || "19:00");
    } else {
      const closing = liveSettings.closingTime || DEFAULT_CLOSING_TIME;
      const grace = Number(liveSettings.graceMinutes) || 0;
      const cancelMins = Number.isFinite(Number(liveSettings.cancelWindowMinutes)) ? Number(liveSettings.cancelWindowMinutes) : 15;
      opensAtMs = null;
      closesAtMs = dateTimeMs(o, closing) + (grace + cancelMins) * 60 * 1000;
    }
    const now = Date.now();
    const notYetOpen = !!(opensAtMs && now < opensAtMs);
    const closed = now > closesAtMs;
    return { mode, opensAtMs, closesAtMs, isOpen: !notYetOpen && !closed, notYetOpen, closed };
  }
  function isCancelWindowOpen(o){
    return getCancelWindow(o).isOpen;
  }

  /* =========================================================
     SETTINGS SYNC — fetched from the backend so the closing time,
     extra/grace minutes, delivery window, contacts, and WhatsApp link
     the admin sets are the same for every customer and every device.
     Falls back to the last-known cached copy (or defaults) if the
     backend can't be reached, so the site still works offline.
     ========================================================= */
  function formatTimeRange12(start, end){
    return `${formatTime12(start)} – ${formatTime12(end)}`;
  }
  async function loadSettings(){
    try{
      const data = await ShadabAPI.getSettings();
      liveSettings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
      store.settings = liveSettings; // cache locally as an offline fallback
    }catch(err){
      liveSettings = { ...DEFAULT_SETTINGS, ...store.settings };
    }
    renderDeliveryInfo();
    tick();
  }
  function renderDeliveryInfo(){
    const range = formatTimeRange12(liveSettings.deliveryWindowStart, liveSettings.deliveryWindowEnd);
    if(el.trustDelivery) el.trustDelivery.textContent = range;
    if(el.homeFooterDelivery) el.homeFooterDelivery.textContent = range;
    if(el.checkoutDeliveryTime) el.checkoutDeliveryTime.textContent = range;
    if(el.footerDelivery) el.footerDelivery.textContent = range;
    const link = liveSettings.whatsappGroupLink || "";
    if(el.homeFooterWhatsapp) el.homeFooterWhatsapp.href = link || "#";
    if(el.contactWhatsappBtn) el.contactWhatsappBtn.href = link || "#";
    if(el.footerNavWhatsapp) el.footerNavWhatsapp.href = link || "#";
    if(el.heroWhatsapp) el.heroWhatsapp.href = link || "#";
    if(el.heroWhatsapp) el.heroWhatsapp.classList.toggle("is-hidden", !link);
  }

  /* =========================================================
     CONTACT US MODAL
     ========================================================= */
  function renderContactList(){
    const contacts = liveSettings.contacts || [];
    if(contacts.length === 0){
      el.contactList.innerHTML = `<div class="empty-state"><span>📞</span>No contact numbers added yet</div>`;
      return;
    }
    el.contactList.innerHTML = contacts.map(c => `
      <a class="contact-row" href="tel:${(c.phone||"").replace(/\s+/g,"")}">
        <span class="contact-row__ico">📞</span>
        <span class="contact-row__body">
          <strong>${escapeHtml(c.name) || "Contact"}</strong>
          <span>${c.phone || ""}</span>
          ${c.details ? `<small>${c.details}</small>` : ""}
        </span>
      </a>`).join("");
  }
  function openContactModal(){
    renderContactList();
    el.contactShade.classList.add("is-open");
    el.contactModal.classList.add("is-open");
    registerOverlay("contact", closeContactModal);
  }
  function closeContactModal(){
    el.contactShade.classList.remove("is-open");
    el.contactModal.classList.remove("is-open");
    unregisterOverlay("contact");
  }
  if(el.navContact) el.navContact.addEventListener("click", (e)=>{ e.preventDefault(); closeNav(); openContactModal(); });
  if(el.navNotifications) el.navNotifications.addEventListener("click", (e)=>{
    e.preventDefault(); closeNav();
    // Enabling/disabling saves the subscription against the logged-in
    // account (see subscribe-customer, requireAuth) — a guest has nowhere
    // for that to attach to, so send them to log in first instead of
    // opening a settings screen whose only button would just fail.
    if(!store.currentUser){ showToast("Log in to manage order notifications."); openLoginModal(); return; }
    if(window.ShadabPush) window.ShadabPush.openCustomerSettings();
  });
  if(el.contactCloseBtn) el.contactCloseBtn.addEventListener("click", closeContactModal);
  if(el.contactShade) el.contactShade.addEventListener("click", closeContactModal);

  /* =========================================================
     SITE FOOTER — copyright year, quick links, developer credit
     ========================================================= */
  if(el.footerYear) el.footerYear.textContent = new Date().getFullYear();
  if(el.footerNavCart) el.footerNavCart.addEventListener("click", (e)=>{ e.preventDefault(); openCart(); });
  if(el.footerNavContact) el.footerNavContact.addEventListener("click", (e)=>{ e.preventDefault(); openContactModal(); });

  const siteFooterEl = $("#siteFooter");
  if(siteFooterEl){
    if("IntersectionObserver" in window){
      const footerObserver = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            siteFooterEl.classList.add("is-visible");
            footerObserver.unobserve(entry.target);
          }
        });
      }, { threshold: .15 });
      footerObserver.observe(siteFooterEl);
    } else {
      siteFooterEl.classList.add("is-visible");
    }
  }

  function openDevContactModal(){
    el.devContactShade.classList.add("is-open");
    el.devContactModal.classList.add("is-open");
    registerOverlay("devContact", closeDevContactModal);
  }
  function closeDevContactModal(){
    el.devContactShade.classList.remove("is-open");
    el.devContactModal.classList.remove("is-open");
    unregisterOverlay("devContact");
  }
  if(el.devCreditBtn) el.devCreditBtn.addEventListener("click", ()=>{ closeNav(); openDevContactModal(); });
  if(el.devCreditBtnFooter) el.devCreditBtnFooter.addEventListener("click", openDevContactModal);
  if(el.devContactCloseBtn) el.devContactCloseBtn.addEventListener("click", closeDevContactModal);
  if(el.devContactShade) el.devContactShade.addEventListener("click", closeDevContactModal);

  let lastPhase = null;
  let lastArrivedAt = null;
  let lastPoolFailedAt = null;
  function tick(){
    const state = getOrderingState();
    el.trustCutoff.textContent = state.label + " daily";
    if(el.footerCutoff) el.footerCutoff.textContent = state.label;
    el.currentClosingLabel.textContent = state.label;

    const arrived = !!livePool.deliveryArrivedAt;
    // Whether THIS customer is actually affected by today's pool failure
    // (i.e. they have a still-pending order today) — the strip only
    // switches to the "sorry" message for people it actually applies to,
    // not every visitor to the site.
    const myPoolFailed = !!livePool.poolFailedAt && myOrdersRaw.some(o => o.status === "held" && isOrderToday(o));
    el.orderTimeStrip.classList.toggle("is-closed", !arrived && !myPoolFailed && state.phase === "closed");
    el.orderTimeStrip.classList.toggle("is-grace", !arrived && !myPoolFailed && state.phase === "grace");
    el.orderTimeStrip.classList.toggle("is-arrived", arrived);
    el.orderTimeStrip.classList.toggle("is-pool-failed", !arrived && myPoolFailed);

    if(arrived){
      el.orderTimeText.textContent = "🛵 Delivery has arrived — enjoy your meal!";
    } else if(myPoolFailed){
      el.orderTimeText.textContent = "😞 Sorry, today's minimum order pool wasn't reached — the restaurant can't deliver today.";
    } else if(state.phase === "open"){
      el.orderTimeText.innerHTML = `Ordering closes in <strong>${formatCountdown(state.msLeft)}</strong> (by ${state.label})`;
    } else if(state.phase === "grace"){
      el.orderTimeText.innerHTML = `⏳ Extra time! Order within <strong>${formatCountdown(state.msLeft)}</strong>`;
    } else {
      el.orderTimeText.textContent = `Kitchen closed for today — reopens tomorrow (cut-off ${state.label})`;
    }

    // A fresh arrival (banner just switched on) is worth a toast too, in
    // case the person isn't looking at the header strip right this
    // second — but only once per broadcast, not every tick.
    if(livePool.deliveryArrivedAt && livePool.deliveryArrivedAt !== lastArrivedAt){
      lastArrivedAt = livePool.deliveryArrivedAt;
      if(store.currentUser) showToast("🛵 Delivery has arrived!");
    } else if(!livePool.deliveryArrivedAt){
      lastArrivedAt = null;
    }

    // Same one-time toast pattern for a fresh pool failure, but only for
    // customers it actually applies to (see myPoolFailed above) — a push
    // notification already reached their device even if the tab isn't
    // open; this is the in-page echo for anyone currently looking at it.
    if(livePool.poolFailedAt && livePool.poolFailedAt !== lastPoolFailedAt){
      lastPoolFailedAt = livePool.poolFailedAt;
      if(myPoolFailed) showToast("😞 Today's minimum order pool wasn't reached");
    } else if(!livePool.poolFailedAt){
      lastPoolFailedAt = null;
    }

    const open = state.phase !== "closed";
    el.checkoutBtn.disabled = !open || cartCount() === 0;
    el.checkoutBtn.textContent = open ? "Place Order" : "Ordering Closed";
    el.cartClosedNote.hidden = open;

    if(state.phase !== lastPhase){
      lastPhase = state.phase;
      renderMenu();
      const ordersView = document.getElementById("view-orders");
      if(ordersView && !ordersView.hidden) renderMyOrders();
    }
    updateLiveOrderCards();
  }

  /* =========================================================
     MENU RENDER + CART
     ========================================================= */
  function cartCount(){
    return Object.values(store.cart).reduce((a,b)=>a+b, 0);
  }
  function cartTotalAmount(cart = store.cart){
    return Object.entries(cart).reduce((sum,[id,qty])=>{
      const item = findItem(id);
      return sum + (item ? item.price*qty : 0);
    },0);
  }
  function setQty(id, qty){
    const cart = store.cart;
    const wasZero = !cart[id];
    if(qty <= 0) delete cart[id]; else cart[id] = qty;
    store.cart = cart;
    const nowZero = !cart[id];
    // only a full rebuild changes a card between "Add" and "stepper" layouts;
    // everything else patches in place so a single tap doesn't reflow the page.
    if(wasZero !== nowZero) renderMenu(); else patchDishCardAction(id);
    renderCart();
    el.checkoutBtn.disabled = !isOrderingOpen() || cartCount() === 0;
  }

  function dishActionHTML(item, open){
    const qty = store.cart[item.id] || 0;
    if(!open && qty === 0) return `<button class="addbtn is-closed-pill" disabled>Closed</button>`;
    if(qty > 0) return `
      <div class="stepper">
        <button class="qty-minus" aria-label="Decrease quantity">−</button>
        <span class="stepper__count">${qty}</span>
        <button class="qty-plus" aria-label="Increase quantity" ${!open ? "disabled":""}>+</button>
      </div>`;
    return `<button class="addbtn">Add</button>`;
  }
  function wireDishCardActions(row, id){
    const add = $(".addbtn:not([disabled])", row);
    if(add) add.addEventListener("click", ()=> setQty(id, 1));
    const minus = $(".qty-minus", row);
    const plus = $(".qty-plus", row);
    if(minus) minus.addEventListener("click", ()=> setQty(id, (store.cart[id]||0) - 1));
    if(plus && !plus.disabled) plus.addEventListener("click", ()=> setQty(id, (store.cart[id]||0) + 1));
  }
  function patchDishCardAction(id){
    const row = el.menuList.querySelector(`.dish-card[data-id="${id}"]`);
    if(!row){ renderMenu(); return; }
    const item = findItem(id);
    const bottom = $(".dish-card__bottom", row);
    bottom.innerHTML = `<span class="dish-card__price">₹${item.price}/-</span>${dishActionHTML(item, isOrderingOpen())}`;
    wireDishCardActions(row, id);
  }

  function slugify(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""); }

  let menuScrollSpyObserver = null;
  function wireMenuScrollSpy(){
    if(menuScrollSpyObserver) menuScrollSpyObserver.disconnect();
    const sections = $$(".menu-category", el.menuList);
    if(!sections.length || !("IntersectionObserver" in window)) return;
    menuScrollSpyObserver = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          const cat = entry.target.id.replace("cat-","");
          $$("button", el.menuCatNav).forEach(b=> b.classList.toggle("is-active", b.dataset.cat === cat));
          const activeBtn = $(`button[data-cat="${cat}"]`, el.menuCatNav);
          if(activeBtn) activeBtn.scrollIntoView({ block:"nearest", inline:"center", behavior:"smooth" });
        }
      });
    }, { rootMargin: `-${(el.topbar ? el.topbar.offsetHeight : 70) + (el.menuCatNav ? el.menuCatNav.offsetHeight : 50) + 10}px 0px -70% 0px`, threshold: 0 });
    sections.forEach(s => menuScrollSpyObserver.observe(s));
  }

  function renderMenu(){
    const open = isOrderingOpen();
    el.menuList.classList.toggle("is-closed", !open);

    const menu = getMenu();
    const groups = {};
    menu.forEach(item=>{
      const cat = item.category || "Other";
      if(!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    const orderedCats = CATEGORY_ORDER.filter(c => groups[c]).concat(Object.keys(groups).filter(c => !CATEGORY_ORDER.includes(c)));

    let cardIdx = 0;
    el.menuList.innerHTML = orderedCats.map(cat=>{
      const items = groups[cat].slice().sort((a,b)=> b.price - a.price);
      const cardsHTML = items.map(item=>{
        const html = `
        <div class="dish-card" data-id="${item.id}" style="animation-delay:${cardIdx*40}ms">
          <div class="dish-card__top">
            <div class="dish-card__media">${mediaHTML(item)}</div>
            <div class="dish-card__title">
              <div class="dish-card__name-row">
                <span class="nonveg-dot" title="Non-vegetarian" aria-hidden="true"></span>
                <p class="dish-card__name">${item.name}</p>
              </div>
              ${item.description ? `<p class="dish-card__desc">${item.description}</p>` : ""}
              ${item.note ? `<span class="dish-card__note">${item.note}</span>` : ""}
            </div>
          </div>
          <div class="dish-card__bottom">
            <span class="dish-card__price">₹${item.price}/-</span>
            ${dishActionHTML(item, open)}
          </div>
        </div>`;
        cardIdx++;
        return html;
      }).join("");
      return `
      <div class="menu-category" id="cat-${slugify(cat)}">
        <div class="menu-category__title">${cat}</div>
        <div class="menu__grid">${cardsHTML}</div>
      </div>`;
    }).join("");

    if(el.menuCatNav){
      el.menuCatNav.innerHTML = orderedCats.map((cat,i)=>
        `<button data-cat="${slugify(cat)}" class="${i===0?"is-active":""}">${cat}</button>`
      ).join("");
      $$("button", el.menuCatNav).forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const target = $("#cat-" + btn.dataset.cat);
          if(target){
            const y = target.getBoundingClientRect().top + window.scrollY - (el.menuCatNav.offsetHeight + (el.topbar ? el.topbar.offsetHeight : 0) + 8);
            window.scrollTo({ top: y, behavior: "smooth" });
          }
        });
      });
      wireMenuScrollSpy();
    }

    $$(".dish-card", el.menuList).forEach(row=>{
      const id = row.dataset.id;
      wireDishCardActions(row, id);
      row.addEventListener("click", (e)=>{
        if(e.target.closest(".addbtn, .stepper")) return;
        openItemDetail(id);
      });
    });
  }

  function renderCart(){
    const cart = store.cart;
    const ids = Object.keys(cart);
    const count = cartCount();

    el.cartBadge.textContent = count;
    el.cartBadge.classList.toggle("is-visible", count > 0);
    if(el.bottomNavCartBadge){
      el.bottomNavCartBadge.textContent = count;
      el.bottomNavCartBadge.classList.toggle("is-visible", count > 0);
    }

    if(ids.length === 0){
      el.cartItems.innerHTML = `<div class="empty-state"><span>🛒</span>Your cart is empty<br><small>Add something delicious from the menu.</small></div>`;
    } else {
      el.cartItems.innerHTML = ids.map(id=>{
        const item = findItem(id);
        if(!item) return "";
        const qty = cart[id];
        return `
        <div class="cart-line" data-id="${id}">
          <div class="cart-line__top">
            <div class="cart-line__media">${mediaHTML(item)}</div>
            <div class="cart-line__info">
              <div class="cart-line__name">${item.name} ${item.note ? `<span style="color:var(--text-faint);font-weight:400;">(${item.note})</span>`:""}</div>
              <div class="cart-line__price">₹${item.price} × ${qty} = ₹${item.price*qty}</div>
            </div>
            <button class="cart-line__remove" aria-label="Remove item">✕</button>
          </div>
          <div class="cart-line__bottom">
            <div class="stepper">
              <button class="qty-minus" aria-label="Decrease quantity">−</button>
              <span class="stepper__count">${qty}</span>
              <button class="qty-plus" aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>`;
      }).join("");

      $$(".cart-line", el.cartItems).forEach(row=>{
        const id = row.dataset.id;
        $(".qty-minus", row).addEventListener("click", ()=> setQty(id, (store.cart[id]||0)-1));
        $(".qty-plus", row).addEventListener("click", ()=> setQty(id, (store.cart[id]||0)+1));
        $(".cart-line__remove", row).addEventListener("click", ()=> setQty(id, 0));
      });
    }
    animateCartTotal(cartTotalAmount());
    if(count>0){ el.cartBadge.classList.add("bump"); setTimeout(()=>el.cartBadge.classList.remove("bump"),400); }
  }

  let cartTotalRAF = null;
  let cartTotalShown = null;
  function animateCartTotal(target){
    const from = cartTotalShown === null ? target : cartTotalShown;
    cartTotalShown = target;
    if(cartTotalRAF) cancelAnimationFrame(cartTotalRAF);
    if(from === target){ el.cartTotal.textContent = "₹" + target; return; }
    const duration = 320;
    const start = performance.now();
    function step(now){
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = Math.round(from + (target - from) * eased);
      el.cartTotal.textContent = "₹" + value;
      if(p < 1) cartTotalRAF = requestAnimationFrame(step);
    }
    cartTotalRAF = requestAnimationFrame(step);
  }

  /* Cart drawer open/close */
  function openCart(){
    el.cartDrawer.classList.add("is-open"); el.drawerShade.classList.add("is-open");
    el.checkoutBtn.disabled = !isOrderingOpen() || cartCount() === 0;
    registerOverlay("cart", closeCart);
  }
  function closeCart(){
    el.cartDrawer.classList.remove("is-open"); el.drawerShade.classList.remove("is-open");
    unregisterOverlay("cart");
  }
  el.cartBtn.addEventListener("click", openCart);
  if(el.bottomNavCartBtn) el.bottomNavCartBtn.addEventListener("click", (e)=>{ e.preventDefault(); openCart(); });
  el.navCart.addEventListener("click", (e)=>{ e.preventDefault(); closeNav(); openCart(); });
  el.cartCloseBtn.addEventListener("click", closeCart);
  el.drawerShade.addEventListener("click", closeCart);

  /* =========================================================
     AUTH — Log in, Create account (with real email verification),
     and Forgot password (real email OTP + reset).
     Talks to the real backend (js/api.js -> Node/Express server)
     which sends actual emails via Gmail and stores accounts with
     hashed passwords in a real database.
     ========================================================= */
  let pendingSignup = null;        // { email } — actual account data lives server-side until verified
  let pendingForgotEmail = null;
  let pendingForgotResetToken = null;

  function normalizeEmail(v){ return (v||"").trim().toLowerCase(); }
  function isValidEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function isValidMobile(v){ return /^\d{10}$/.test(v); }

  function setBtnLoading(btn, loading, loadingLabel){
    if(!btn) return;
    if(loading){
      btn.dataset.originalLabel = btn.dataset.originalLabel || btn.textContent;
      btn.textContent = loadingLabel || "Please wait…";
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.originalLabel || btn.textContent;
      btn.disabled = false;
    }
  }

  function passwordStrength(pw){
    if(!pw) return { level:0, label:"", pct:0 };
    if(pw.length < 6) return { level:1, label:"Too short", pct:15 };
    let score = 0;
    if(pw.length >= 8) score++;
    if(pw.length >= 12) score++;
    if(/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if(/\d/.test(pw)) score++;
    if(/[^A-Za-z0-9]/.test(pw)) score++;
    if(score <= 2) return { level:1, label:"Weak", pct:33 };
    if(score <= 3) return { level:2, label:"Moderate", pct:66 };
    return { level:3, label:"Strong", pct:100 };
  }
  function wirePasswordStrength(input, barEl, labelEl){
    input.addEventListener("input", ()=>{
      const s = passwordStrength(input.value);
      barEl.style.width = s.pct + "%";
      barEl.className = "pwd-strength__bar" + (s.level ? " lvl-"+s.level : "");
      labelEl.textContent = s.label;
    });
  }
  function wireOtpBoxes(boxes, onComplete){
    const checkComplete = ()=>{
      const full = boxes.every(b=>b.value.length === 1);
      if(full && typeof onComplete === "function") onComplete();
    };
    boxes.forEach((box,i)=>{
      box.addEventListener("input", ()=>{
        box.value = box.value.replace(/\D/g,"").slice(0,1);
        box.classList.toggle("is-filled", !!box.value);
        if(box.value && boxes[i+1]){
          boxes[i+1].focus();
        } else if(box.value && i === boxes.length-1){
          // Last digit entered — proceed automatically instead of
          // waiting for the user to press Verify.
          checkComplete();
        }
      });
      box.addEventListener("keydown", (e)=>{
        if(e.key === "Backspace" && !box.value && boxes[i-1]) boxes[i-1].focus();
      });
      box.addEventListener("paste", (e)=>{
        const text = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g,"");
        if(!text) return;
        e.preventDefault();
        text.split("").slice(0, boxes.length).forEach((ch,idx)=>{ if(boxes[idx]){ boxes[idx].value = ch; boxes[idx].classList.add("is-filled"); } });
        const next = boxes[Math.min(text.length, boxes.length-1)];
        if(next) next.focus();
        checkComplete();
      });
    });
  }
  function otpValue(boxes){ return boxes.map(b=>b.value).join(""); }
  function clearOtpBoxes(boxes){
    boxes.forEach(b=>{ b.value=""; b.disabled = false; b.classList.remove("is-filled","is-invalid"); });
  }
  function setFieldError(node, msg, critical){
    if(!node) return;
    if(msg){
      node.textContent = msg;
      node.hidden = false;
      if(critical){
        // Remove + reflow so the shake animation restarts even if the
        // same error message fires twice in a row.
        node.classList.remove("field-error--shake");
        void node.offsetWidth;
        node.classList.add("field-error--shake");
      } else {
        node.classList.remove("field-error--shake");
      }
    } else {
      node.hidden = true; node.textContent = ""; node.classList.remove("field-error--shake");
    }
  }
  function shakeOtpBoxes(boxes){
    boxes.forEach(b=>{
      b.classList.remove("is-invalid");
      void b.offsetWidth;
      b.classList.add("is-invalid");
    });
    setTimeout(()=>boxes.forEach(b=>b.classList.remove("is-invalid")), 450);
  }

  /* ---------- College-only email policy (mirrors the backend check) ---------- */
  const CAMPUS_EMAIL_DOMAIN = "rguktong.ac.in";
  const OTHER_CAMPUS_DOMAINS = ["rguktrkv.ac.in", "rguktn.ac.in", "rguktsklm.ac.in", "rgukt.ac.in"];
  function campusEmailCheck(email){
    const value = (email || "").trim().toLowerCase();
    if(!isValidEmail(value)) return { ok:false, message:"Enter a valid email address." };
    const domain = value.split("@")[1] || "";
    if(domain === CAMPUS_EMAIL_DOMAIN) return { ok:true };
    if(OTHER_CAMPUS_DOMAINS.includes(domain)){
      return { ok:false, message:"Delivery isn't available at your campus yet — this service currently runs only for RGUKT Ongole. Thanks for exploring us!" };
    }
    return { ok:false, message:"Personal emails aren't valid here. Please enter your college email ID (yourid@rguktong.ac.in)." };
  }

  /* ---------- OTP countdown (1 minute 30 seconds validity) ---------- */
  const OTP_VALID_SECONDS = 90;
  const otpTimers = new WeakMap(); // keyed by the timer wrapper element

  function formatMmSs(totalSeconds){
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2,"0")}`;
  }

  function startOtpTimer({ wrapEl, textEl, barEl, verifyBtn, resendBtn, boxes, onExpire }){
    clearInterval(otpTimers.get(wrapEl));
    wrapEl.classList.remove("is-expired","is-warning");
    resendBtn.hidden = true;
    verifyBtn.disabled = false;
    boxes.forEach(b=>{ b.disabled = false; });

    let remaining = OTP_VALID_SECONDS;
    textEl.textContent = `Code valid for ${formatMmSs(remaining)}`;
    barEl.style.width = "100%";

    const iv = setInterval(()=>{
      remaining--;
      const pct = Math.max(0, (remaining / OTP_VALID_SECONDS) * 100);
      barEl.style.width = pct + "%";
      if(remaining <= 20 && remaining > 0) wrapEl.classList.add("is-warning");

      if(remaining <= 0){
        clearInterval(iv);
        wrapEl.classList.add("is-expired");
        wrapEl.classList.remove("is-warning");
        textEl.textContent = "OTP expired";
        verifyBtn.disabled = true;
        boxes.forEach(b=>{ b.disabled = true; });
        resendBtn.hidden = false;
        if(typeof onExpire === "function") onExpire();
        return;
      }
      textEl.textContent = `Code valid for ${formatMmSs(remaining)}`;
    }, 1000);
    otpTimers.set(wrapEl, iv);
  }
  function stopOtpTimer(wrapEl){
    clearInterval(otpTimers.get(wrapEl));
    wrapEl.classList.remove("is-expired","is-warning");
  }

  function updateAuthUI(){
    const user = store.currentUser;
    if(user){
      el.sideNavUserName.textContent = "Welcome, " + user.name.split(" ")[0];
      el.sideNavUserHint.textContent = user.email || user.phone;
      el.navAuthLabel.textContent = "My Account";
      el.navLogoutItem.hidden = false;
    } else {
      el.sideNavUserName.textContent = "Welcome, Guest";
      el.sideNavUserHint.textContent = "Sign in to track your orders";
      el.navAuthLabel.textContent = "Log in / Create account";
      el.navLogoutItem.hidden = true;
    }
  }

  /* ---------- Log in modal ---------- */
  function openLoginModal(){
    resetLoginForm();
    el.loginShade.classList.add("is-open");
    el.loginModal.classList.add("is-open");
    registerOverlay("login", closeLoginModal);
  }
  function closeLoginModal(){
    el.loginShade.classList.remove("is-open");
    el.loginModal.classList.remove("is-open");
    unregisterOverlay("login");
  }
  function resetLoginForm(keepIdentifier){
    if(!keepIdentifier) el.loginIdentifier.value = "";
    el.loginPassword.value = "";
    setFieldError(el.loginError, null);
  }
  const openAuthModal = openLoginModal; // used elsewhere (checkout gate, profile gate)

  /* ---------- Create account modal ---------- */
  function openSignupModal(){
    resetSignupSteps();
    el.signupShade.classList.add("is-open");
    el.signupModal.classList.add("is-open");
    registerOverlay("signup", closeSignupModal);
  }
  function closeSignupModal(){
    el.signupShade.classList.remove("is-open");
    el.signupModal.classList.remove("is-open");
    unregisterOverlay("signup");
  }
  function resetSignupSteps(){
    el.signupStepDetails.hidden = false;
    el.signupStepVerify.hidden = true;
    el.signupStepSuccess.hidden = true;
    el.signupUsername.value = "";
    el.signupMobile.value = "";
    el.signupEmail.value = "";
    el.signupPassword.value = "";
    el.signupConfirm.value = "";
    el.signupStrengthBar.style.width = "0%";
    el.signupStrengthBar.className = "pwd-strength__bar";
    el.signupStrengthLabel.textContent = "";
    setFieldError(el.signupError, null);
    setFieldError(el.signupEmailError, null);
    clearOtpBoxes(el.signupOtpBoxes);
    stopOtpTimer(el.signupOtpTimer);
    el.signupOtpTimerText.textContent = `Code valid for ${formatMmSs(OTP_VALID_SECONDS)}`;
    el.signupOtpTimerBar.style.width = "100%";
    el.signupResendBtn.hidden = true;
    el.signupResendBtn.disabled = false;
    el.signupResendBtn.textContent = el.signupResendBtn.dataset.originalLabel || "Resend code";
  }

  /* ---------- Forgot password modal ---------- */
  function openForgotModal(){
    resetForgotSteps();
    el.forgotShade.classList.add("is-open");
    el.forgotModal.classList.add("is-open");
    registerOverlay("forgot", closeForgotModal);
  }
  function closeForgotModal(){
    el.forgotShade.classList.remove("is-open");
    el.forgotModal.classList.remove("is-open");
    unregisterOverlay("forgot");
  }
  function resetForgotSteps(){
    el.forgotStepEmail.hidden = false;
    el.forgotStepOtp.hidden = true;
    el.forgotStepNewPass.hidden = true;
    el.forgotStepDone.hidden = true;
    el.forgotEmail.value = "";
    el.forgotNewPass.value = "";
    el.forgotConfirmPass.value = "";
    el.forgotStrengthBar.style.width = "0%";
    el.forgotStrengthBar.className = "pwd-strength__bar";
    el.forgotStrengthLabel.textContent = "";
    setFieldError(el.forgotEmailError, null);
    setFieldError(el.forgotPassError, null);
    clearOtpBoxes(el.forgotOtpBoxes);
    stopOtpTimer(el.forgotOtpTimer);
    el.forgotOtpTimerText.textContent = `Code valid for ${formatMmSs(OTP_VALID_SECONDS)}`;
    el.forgotOtpTimerBar.style.width = "100%";
    el.forgotResendBtn.hidden = true;
    el.forgotResendBtn.disabled = false;
    el.forgotResendBtn.textContent = el.forgotResendBtn.dataset.originalLabel || "Resend code";
  }

  wirePasswordStrength(el.signupPassword, el.signupStrengthBar, el.signupStrengthLabel);
  wirePasswordStrength(el.forgotNewPass, el.forgotStrengthBar, el.forgotStrengthLabel);
  el.signupEmail.addEventListener("blur", ()=>{
    const value = el.signupEmail.value.trim();
    if(!value){ setFieldError(el.signupEmailError, null); return; }
    const check = campusEmailCheck(value);
    setFieldError(el.signupEmailError, check.ok ? null : check.message, !check.ok);
  });
  el.signupEmail.addEventListener("input", ()=>{
    if(!el.signupEmailError.hidden) setFieldError(el.signupEmailError, null);
  });
  el.forgotEmail.addEventListener("blur", ()=>{
    const value = el.forgotEmail.value.trim();
    if(!value){ setFieldError(el.forgotEmailError, null); return; }
    // Password reset is for an account that's already registered — unlike
    // signup, it must work for existing accounts on a personal or
    // other-campus email too (see routes/auth.js), so this only checks
    // the email is shaped like an email, not which domain it's on.
    setFieldError(el.forgotEmailError, isValidEmail(value) ? null : "Enter a valid email address.", !isValidEmail(value));
  });
  el.forgotEmail.addEventListener("input", ()=>{
    if(!el.forgotEmailError.hidden) setFieldError(el.forgotEmailError, null);
  });
  wireOtpBoxes(el.signupOtpBoxes, ()=>verifySignupOtp());
  wireOtpBoxes(el.forgotOtpBoxes, ()=>verifyForgotOtp());

  /* ---------- nav entry point ---------- */
  el.navAuth.addEventListener("click", (e)=>{
    e.preventDefault();
    closeNav();
    if(store.currentUser){
      showView("profile"); history.replaceState(null,"","#profile");
    } else {
      openLoginModal();
    }
  });

  /* ---------- LOG IN ---------- */
  el.loginCloseBtn.addEventListener("click", closeLoginModal);
  el.loginShade.addEventListener("click", closeLoginModal);
  el.loginToSignupBtn.addEventListener("click", ()=>{ switchModal(closeLoginModal, openSignupModal); });
  el.openForgotBtn.addEventListener("click", (e)=>{ e.preventDefault(); switchModal(closeLoginModal, openForgotModal); });

  async function submitLogin(){
    const email = el.loginIdentifier.value.trim();
    const password = el.loginPassword.value;
    setFieldError(el.loginError, null);
    if(!email || !password){ setFieldError(el.loginError, "Enter your college email and password."); return; }
    setBtnLoading(el.loginSubmitBtn, true, "Logging in…");
    try{
      const { token, user } = await ShadabAPI.login(email, password);
      ShadabAPI.setToken(token);
      store.currentUser = { phone: user.mobile, name: user.username, email: user.email, photo: user.photo || null };
      updateAuthUI();
      closeLoginModal();
      showToast(`Welcome back, ${user.username.split(" ")[0]}!`);
      if(window.ShadabPush) setTimeout(()=> window.ShadabPush.promptCustomer(), 700);
    }catch(err){
      setFieldError(el.loginError, err.message, err.code === "invalid_credentials" || err.code === "account_blocked");
    }finally{
      setBtnLoading(el.loginSubmitBtn, false);
    }
  }
  el.loginSubmitBtn.addEventListener("click", submitLogin);
  [el.loginIdentifier, el.loginPassword].forEach(inp=>{
    inp.addEventListener("keydown", (e)=>{ if(e.key === "Enter"){ e.preventDefault(); submitLogin(); } });
  });

  /* ---------- CREATE ACCOUNT ---------- */
  el.signupCloseBtn.addEventListener("click", closeSignupModal);
  el.signupShade.addEventListener("click", closeSignupModal);
  el.signupToLoginBtn.addEventListener("click", ()=>{ switchModal(closeSignupModal, openLoginModal); });

  el.signupDetailsBtn.addEventListener("click", async ()=>{
    const username = el.signupUsername.value.trim();
    const mobile = el.signupMobile.value.trim().replace(/\D/g,"");
    const email = normalizeEmail(el.signupEmail.value);
    const password = el.signupPassword.value;
    const confirm = el.signupConfirm.value;
    setFieldError(el.signupError, null);
    setFieldError(el.signupEmailError, null);

    if(!username){ setFieldError(el.signupError, "Enter a username."); return; }
    if(!isValidMobile(mobile)){ setFieldError(el.signupError, "Enter a valid 10-digit mobile number."); return; }

    const emailCheck = campusEmailCheck(email);
    if(!emailCheck.ok){ setFieldError(el.signupEmailError, emailCheck.message, true); return; }

    if(password.length < 6){ setFieldError(el.signupError, "Password must be at least 6 characters."); return; }
    if(password !== confirm){ setFieldError(el.signupError, "Passwords don't match.", true); return; }

    setBtnLoading(el.signupDetailsBtn, true, "Sending code…");
    try{
      await ShadabAPI.signup({ username, mobile, email, password });
      pendingSignup = { email };
      el.signupEmailEcho.textContent = email;
      el.signupStepDetails.hidden = true;
      el.signupStepVerify.hidden = false;
      clearOtpBoxes(el.signupOtpBoxes);
      el.signupOtpBoxes[0].focus();
      el.signupDemoHint.textContent = "Check your inbox (and spam folder) for the 6-digit code.";
      showToast("Confirmation code sent to " + email);
      startOtpTimer({
        wrapEl: el.signupOtpTimer, textEl: el.signupOtpTimerText, barEl: el.signupOtpTimerBar,
        verifyBtn: el.signupVerifyBtn, resendBtn: el.signupResendBtn, boxes: el.signupOtpBoxes,
      });
    }catch(err){
      if(err.code === "wrong_campus" || err.code === "personal_email" || err.code === "invalid_format"){
        setFieldError(el.signupEmailError, err.message, true);
      } else {
        setFieldError(el.signupError, err.message);
      }
    }finally{
      setBtnLoading(el.signupDetailsBtn, false);
    }
  });
  el.signupEditDetailsBtn.addEventListener("click", ()=>{
    stopOtpTimer(el.signupOtpTimer);
    el.signupStepVerify.hidden = true;
    el.signupStepDetails.hidden = false;
  });
  el.signupResendBtn.addEventListener("click", async ()=>{
    if(!pendingSignup) return;
    setBtnLoading(el.signupResendBtn, true, "Sending…");
    try{
      await ShadabAPI.resendSignupOtp(pendingSignup.email);
      el.signupDemoHint.textContent = "New code sent — check your inbox.";
      showToast("New confirmation code sent");
      clearOtpBoxes(el.signupOtpBoxes);
      el.signupOtpBoxes[0].focus();
      startOtpTimer({
        wrapEl: el.signupOtpTimer, textEl: el.signupOtpTimerText, barEl: el.signupOtpTimerBar,
        verifyBtn: el.signupVerifyBtn, resendBtn: el.signupResendBtn, boxes: el.signupOtpBoxes,
      });
    }catch(err){
      showToast(err.message);
    }finally{
      setBtnLoading(el.signupResendBtn, false);
    }
  });
  async function verifySignupOtp(){
    const entered = otpValue(el.signupOtpBoxes);
    if(entered.length < 6){ showToast("Enter the 6-digit code"); return; }
    if(!pendingSignup) return;
    if(el.signupVerifyBtn.disabled) return; // OTP already expired

    setBtnLoading(el.signupVerifyBtn, true, "Verifying…");
    try{
      const { token, user } = await ShadabAPI.verifySignup(pendingSignup.email, entered);
      stopOtpTimer(el.signupOtpTimer);
      ShadabAPI.setToken(token);
      store.currentUser = { phone: user.mobile, name: user.username, email: user.email, photo: user.photo || null };
      updateAuthUI();

      el.signupStepVerify.hidden = true;
      el.signupSuccessName.textContent = user.username;
      el.signupStepSuccess.hidden = false;
      pendingSignup = null;
      if(window.ShadabPush) setTimeout(()=> window.ShadabPush.promptCustomer(), 900);
    }catch(err){
      showToast(err.message);
      if(err.code === "otp_incorrect" || err.code === "otp_expired") shakeOtpBoxes(el.signupOtpBoxes);
      if(err.code === "otp_expired"){
        el.signupOtpTimer.classList.add("is-expired");
        el.signupOtpTimerText.textContent = "OTP expired";
        el.signupVerifyBtn.disabled = true;
        el.signupResendBtn.hidden = false;
      }
    }finally{
      setBtnLoading(el.signupVerifyBtn, false);
    }
  }
  el.signupVerifyBtn.addEventListener("click", verifySignupOtp);
  el.signupContinueBtn.addEventListener("click", ()=>{
    closeSignupModal();
    showToast("Account created successfully!");
  });

  /* ---------- FORGOT PASSWORD ---------- */
  el.forgotCloseBtn.addEventListener("click", closeForgotModal);
  el.forgotShade.addEventListener("click", closeForgotModal);
  el.forgotBackToLoginBtn.addEventListener("click", ()=>{ switchModal(closeForgotModal, openLoginModal); });

  el.forgotSendBtn.addEventListener("click", async ()=>{
    const email = normalizeEmail(el.forgotEmail.value);
    setFieldError(el.forgotEmailError, null);

    // Same reasoning as the blur check above — this is account recovery,
    // not account creation, so it isn't gated by the campus-only domain
    // policy. The backend is the real source of truth here (it checks
    // whether the account exists); this is just a basic format guard.
    if(!isValidEmail(email)){ setFieldError(el.forgotEmailError, "Enter a valid email address.", true); return; }

    setBtnLoading(el.forgotSendBtn, true, "Sending…");
    try{
      await ShadabAPI.forgotPassword(email);
      pendingForgotEmail = email;
      el.forgotEmailEcho.textContent = email;
      el.forgotStepEmail.hidden = true;
      el.forgotStepOtp.hidden = false;
      clearOtpBoxes(el.forgotOtpBoxes);
      el.forgotOtpBoxes[0].focus();
      el.forgotDemoHint.textContent = "Check your inbox (and spam folder) for the reset code.";
      showToast("OTP sent to " + email);
      startOtpTimer({
        wrapEl: el.forgotOtpTimer, textEl: el.forgotOtpTimerText, barEl: el.forgotOtpTimerBar,
        verifyBtn: el.forgotVerifyBtn, resendBtn: el.forgotResendBtn, boxes: el.forgotOtpBoxes,
      });
    }catch(err){
      if(err.code === "not_registered"){
        setFieldError(el.forgotEmailError, "Account not created with this email.", true);
      } else if(err.code === "wrong_campus" || err.code === "personal_email" || err.code === "invalid_format"){
        setFieldError(el.forgotEmailError, err.message, true);
      } else {
        setFieldError(el.forgotEmailError, err.message, true);
      }
    }finally{
      setBtnLoading(el.forgotSendBtn, false);
    }
  });
  el.forgotEditEmailBtn.addEventListener("click", ()=>{
    stopOtpTimer(el.forgotOtpTimer);
    el.forgotStepOtp.hidden = true;
    el.forgotStepEmail.hidden = false;
  });
  el.forgotResendBtn.addEventListener("click", async ()=>{
    if(!pendingForgotEmail) return;
    setBtnLoading(el.forgotResendBtn, true, "Sending…");
    try{
      await ShadabAPI.resendForgotOtp(pendingForgotEmail);
      el.forgotDemoHint.textContent = "New code sent — check your inbox.";
      showToast("New OTP sent");
      clearOtpBoxes(el.forgotOtpBoxes);
      el.forgotOtpBoxes[0].focus();
      startOtpTimer({
        wrapEl: el.forgotOtpTimer, textEl: el.forgotOtpTimerText, barEl: el.forgotOtpTimerBar,
        verifyBtn: el.forgotVerifyBtn, resendBtn: el.forgotResendBtn, boxes: el.forgotOtpBoxes,
      });
    }catch(err){
      showToast(err.message);
    }finally{
      setBtnLoading(el.forgotResendBtn, false);
    }
  });
  async function verifyForgotOtp(){
    const entered = otpValue(el.forgotOtpBoxes);
    if(entered.length < 6){ showToast("Enter the 6-digit code"); return; }
    if(el.forgotVerifyBtn.disabled) return; // OTP already expired

    setBtnLoading(el.forgotVerifyBtn, true, "Verifying…");
    try{
      const { resetToken } = await ShadabAPI.verifyForgotOtp(pendingForgotEmail, entered);
      stopOtpTimer(el.forgotOtpTimer);
      pendingForgotResetToken = resetToken;
      el.forgotStepOtp.hidden = true;
      el.forgotStepNewPass.hidden = false;
    }catch(err){
      showToast(err.message);
      if(err.code === "otp_incorrect" || err.code === "otp_expired") shakeOtpBoxes(el.forgotOtpBoxes);
      if(err.code === "otp_expired"){
        el.forgotOtpTimer.classList.add("is-expired");
        el.forgotOtpTimerText.textContent = "OTP expired";
        el.forgotVerifyBtn.disabled = true;
        el.forgotResendBtn.hidden = false;
      }
    }finally{
      setBtnLoading(el.forgotVerifyBtn, false);
    }
  }
  el.forgotVerifyBtn.addEventListener("click", verifyForgotOtp);
  el.forgotSaveBtn.addEventListener("click", async ()=>{
    const pw = el.forgotNewPass.value;
    const confirm = el.forgotConfirmPass.value;
    setFieldError(el.forgotPassError, null);
    if(pw.length < 6){ setFieldError(el.forgotPassError, "Password must be at least 6 characters."); return; }
    if(pw !== confirm){ setFieldError(el.forgotPassError, "Passwords don't match.", true); return; }

    setBtnLoading(el.forgotSaveBtn, true, "Saving…");
    try{
      const { token, user } = await ShadabAPI.resetPassword(pendingForgotEmail, pendingForgotResetToken, pw);
      if(token && user){
        ShadabAPI.setToken(token);
        store.currentUser = { phone: user.mobile, name: user.username, email: user.email, photo: user.photo || null };
        updateAuthUI();
      }
      el.forgotStepNewPass.hidden = true;
      el.forgotDoneTitle.textContent = "Password updated";
      el.forgotDoneMessage.textContent = "Your password has been changed and you're logged in.";
      el.forgotDoneBtn.textContent = "Continue";
      el.forgotStepDone.hidden = false;
    }catch(err){
      setFieldError(el.forgotPassError, err.message);
    }finally{
      setBtnLoading(el.forgotSaveBtn, false);
    }
  });
  el.forgotSkipBtn.addEventListener("click", async ()=>{
    el.forgotSkipBtn.disabled = true;
    try{
      const { token, user } = await ShadabAPI.skipForgotPassword(pendingForgotEmail, pendingForgotResetToken);
      ShadabAPI.setToken(token);
      store.currentUser = { phone: user.mobile, name: user.username, email: user.email, photo: user.photo || null };
      updateAuthUI();
      el.forgotStepNewPass.hidden = true;
      el.forgotDoneTitle.textContent = "Verified";
      el.forgotDoneMessage.textContent = "Your identity is verified and you're logged in. You can change your password anytime from your profile.";
      el.forgotDoneBtn.textContent = "Continue";
      el.forgotStepDone.hidden = false;
    }catch(err){
      showToast(err.message || "Couldn't verify — please try again.");
    }finally{
      el.forgotSkipBtn.disabled = false;
    }
  });
  el.forgotDoneBtn.addEventListener("click", ()=>{
    closeForgotModal();
    if(!store.currentUser) openLoginModal();
    pendingForgotEmail = null; pendingForgotResetToken = null;
  });

  /* -- logout with confirmation -- */
  function openLogoutConfirm(){
    el.logoutShade.classList.add("is-open");
    el.logoutModal.classList.add("is-open");
    registerOverlay("logout", closeLogoutConfirm);
  }
  function closeLogoutConfirm(){
    el.logoutShade.classList.remove("is-open");
    el.logoutModal.classList.remove("is-open");
    unregisterOverlay("logout");
  }
  function doLogout(){
    store.currentUser = null;
    ShadabAPI.setToken(null);
    updateAuthUI();
    closeNav();
    closeLogoutConfirm();
    showToast("Logged out");
    showView("home"); history.replaceState(null,"","#home");
  }
  el.navLogout.addEventListener("click", (e)=>{ e.preventDefault(); closeNav(); openLogoutConfirm(); });
  el.profileLogoutBtn.addEventListener("click", openLogoutConfirm);
  el.cancelLogoutBtn.addEventListener("click", closeLogoutConfirm);
  el.logoutShade.addEventListener("click", closeLogoutConfirm);
  el.confirmLogoutBtn.addEventListener("click", doLogout);

  /* =========================================================
     PROFILE
     ========================================================= */
  function renderProfile(){
    const user = store.currentUser;
    if(!user){
      showView("home"); history.replaceState(null,"","#home");
      openAuthModal();
      return;
    }
    el.profileNameInput.value = user.name;
    el.profilePhoneInput.value = user.phone;
    el.profileEmailValue.textContent = user.email || "—";
    if(el.profileAvatar) el.profileAvatar.innerHTML = user.photo ? `<img src="${user.photo}" alt="Profile photo">` : "🧑";
    const users = store.users;
    const since = users[user.phone] && users[user.phone].since ? new Date(users[user.phone].since) : new Date();
    el.profileSinceValue.textContent = since.toLocaleDateString(undefined, { day:"numeric", month:"long", year:"numeric" });
  }
  el.profileNameEditBtn.addEventListener("click", async ()=>{
    const editing = !el.profileNameInput.disabled;
    if(editing){
      const newName = el.profileNameInput.value.trim();
      if(!newName){ showToast("Name can't be empty"); return; }
      const user = store.currentUser;
      try{
        await ShadabAPI.updateMe({ username: newName });
        store.currentUser = { ...user, name: newName };
        updateAuthUI();
        el.profileNameInput.disabled = true;
        el.profileNameEditBtn.textContent = "✎";
        showToast("Name updated");
      }catch(err){
        showToast(err.message);
      }
    } else {
      el.profileNameInput.disabled = false;
      el.profileNameInput.focus();
      el.profileNameEditBtn.textContent = "✓";
    }
  });

  /* ---- Profile photo upload — opens a 1:1 cropper before uploading,
     the same pattern most major apps use for avatar photos, instead of
     just uploading whatever raw rectangle the camera/gallery gave us. ---- */
  const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // raw file cap before cropping; the cropper itself outputs a small square JPEG well under the backend's 2MB limit
  if(el.profilePhotoBtn) el.profilePhotoBtn.addEventListener("click", ()=> el.profilePhotoInput.click());
  if(el.profilePhotoInput) el.profilePhotoInput.addEventListener("change", ()=>{
    const file = el.profilePhotoInput.files && el.profilePhotoInput.files[0];
    el.profilePhotoInput.value = "";
    if(!file) return;
    if(!file.type.startsWith("image/")){ showToast("Please choose an image file"); return; }
    if(file.size > MAX_PHOTO_BYTES){ showToast("Photo is too large — please use one under 8MB"); return; }
    openPhotoCropModal(file);
  });

  /* ---- Profile photo cropper: drag to reposition, slider to zoom,
     always exports a perfect 1:1 square (500×500 JPEG). ---- */
  const PHOTO_CROP_OUTPUT = 500;
  let cropImg = null, cropScale = 1, cropMinScale = 1, cropOffsetX = 0, cropOffsetY = 0;
  let cropDragging = false, cropDragStartX = 0, cropDragStartY = 0, cropStartOffsetX = 0, cropStartOffsetY = 0;
  const cropStageSize = 280; // must match .photo-crop__stage width/height in CSS

  function openPhotoCropModal(file){
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        cropImg = img;
        cropMinScale = Math.max(cropStageSize / img.width, cropStageSize / img.height);
        cropScale = cropMinScale;
        cropOffsetX = 0; cropOffsetY = 0;
        el.photoCropZoom.value = "1";
        el.photoCropCanvas.width = cropStageSize;
        el.photoCropCanvas.height = cropStageSize;
        drawCrop();
        el.photoCropShade.classList.add("is-open");
        el.photoCropModal.classList.add("is-open");
        registerOverlay("photoCrop", closePhotoCropModal);
      };
      img.onerror = ()=> showToast("Couldn't load that image — try another one");
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function closePhotoCropModal(){
    el.photoCropShade.classList.remove("is-open");
    el.photoCropModal.classList.remove("is-open");
    cropImg = null;
    unregisterOverlay("photoCrop");
  }
  if(el.photoCropCloseBtn) el.photoCropCloseBtn.addEventListener("click", closePhotoCropModal);
  if(el.photoCropShade) el.photoCropShade.addEventListener("click", closePhotoCropModal);

  function clampCropOffsets(){
    const w = cropImg.width * cropScale, h = cropImg.height * cropScale;
    const maxX = Math.max(0, (w - cropStageSize) / 2);
    const maxY = Math.max(0, (h - cropStageSize) / 2);
    cropOffsetX = clamp(cropOffsetX, -maxX, maxX);
    cropOffsetY = clamp(cropOffsetY, -maxY, maxY);
  }
  function drawCrop(){
    if(!cropImg) return;
    const ctx = el.photoCropCanvas.getContext("2d");
    ctx.clearRect(0, 0, cropStageSize, cropStageSize);
    clampCropOffsets();
    const w = cropImg.width * cropScale, h = cropImg.height * cropScale;
    const x = (cropStageSize - w) / 2 + cropOffsetX;
    const y = (cropStageSize - h) / 2 + cropOffsetY;
    ctx.drawImage(cropImg, x, y, w, h);
  }
  if(el.photoCropZoom) el.photoCropZoom.addEventListener("input", ()=>{
    if(!cropImg) return;
    cropScale = cropMinScale * Number(el.photoCropZoom.value);
    drawCrop();
  });

  function cropPointerDown(clientX, clientY){
    cropDragging = true;
    cropDragStartX = clientX; cropDragStartY = clientY;
    cropStartOffsetX = cropOffsetX; cropStartOffsetY = cropOffsetY;
  }
  function cropPointerMove(clientX, clientY){
    if(!cropDragging) return;
    cropOffsetX = cropStartOffsetX + (clientX - cropDragStartX);
    cropOffsetY = cropStartOffsetY + (clientY - cropDragStartY);
    drawCrop();
  }
  function cropPointerUp(){ cropDragging = false; }
  if(el.photoCropStage){
    el.photoCropStage.addEventListener("pointerdown", (e)=>{ e.preventDefault(); cropPointerDown(e.clientX, e.clientY); });
    window.addEventListener("pointermove", (e)=> cropPointerMove(e.clientX, e.clientY));
    window.addEventListener("pointerup", cropPointerUp);
  }

  if(el.photoCropSaveBtn) el.photoCropSaveBtn.addEventListener("click", async ()=>{
    if(!cropImg) return;
    setBtnLoading(el.photoCropSaveBtn, true, "Saving…");
    try{
      const out = document.createElement("canvas");
      out.width = PHOTO_CROP_OUTPUT; out.height = PHOTO_CROP_OUTPUT;
      const octx = out.getContext("2d");
      const ratio = PHOTO_CROP_OUTPUT / cropStageSize;
      const w = cropImg.width * cropScale, h = cropImg.height * cropScale;
      const x = (cropStageSize - w) / 2 + cropOffsetX;
      const y = (cropStageSize - h) / 2 + cropOffsetY;
      octx.drawImage(cropImg, x * ratio, y * ratio, w * ratio, h * ratio);
      const dataUrl = out.toDataURL("image/jpeg", 0.88);
      await ShadabAPI.updateMe({ photoDataUrl: dataUrl });
      const user = store.currentUser;
      store.currentUser = { ...user, photo: dataUrl };
      renderProfile();
      updateAuthUI();
      closePhotoCropModal();
      showToast("Profile photo updated");
    }catch(err){
      showToast(err.message || "Couldn't update photo");
    }finally{
      setBtnLoading(el.photoCropSaveBtn, false);
    }
  });

  /* ---- Mobile number edit ---- */
  if(el.profilePhoneEditBtn) el.profilePhoneEditBtn.addEventListener("click", async ()=>{
    const editing = !el.profilePhoneInput.disabled;
    if(editing){
      const newPhone = el.profilePhoneInput.value.trim();
      if(!isValidMobile(newPhone)){ showToast("Enter a valid 10-digit mobile number"); return; }
      const user = store.currentUser;
      if(newPhone === user.phone){
        el.profilePhoneInput.disabled = true;
        el.profilePhoneEditBtn.textContent = "✎";
        return;
      }
      try{
        const res = await ShadabAPI.updateMe({ mobile: newPhone });
        if(res && res.token) ShadabAPI.setToken(res.token);
        store.currentUser = { ...user, phone: newPhone };
        el.profilePhoneInput.disabled = true;
        el.profilePhoneEditBtn.textContent = "✎";
        renderProfile();
        showToast("Mobile number updated");
      }catch(err){
        showToast(err.message || "Couldn't update mobile number");
      }
    } else {
      el.profilePhoneInput.disabled = false;
      el.profilePhoneInput.focus();
      el.profilePhoneEditBtn.textContent = "✓";
    }
  });

  /* ---- Change password ---- */
  function openChangePwModal(){
    el.changePwForm.reset();
    el.changePwError.hidden = true;
    el.changePwShade.classList.add("is-open");
    el.changePwModal.classList.add("is-open");
    registerOverlay("changePw", closeChangePwModal);
  }
  function closeChangePwModal(){
    el.changePwShade.classList.remove("is-open");
    el.changePwModal.classList.remove("is-open");
    unregisterOverlay("changePw");
  }
  if(el.profileChangePwBtn) el.profileChangePwBtn.addEventListener("click", openChangePwModal);
  if(el.cancelChangePwBtn) el.cancelChangePwBtn.addEventListener("click", closeChangePwModal);
  if(el.changePwShade) el.changePwShade.addEventListener("click", closeChangePwModal);
  if(el.changePwForm) el.changePwForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const current = el.currentPwInput.value;
    const next = el.newPwInput.value;
    const confirm = el.confirmPwInput.value;
    if(next.length < 6){ el.changePwError.textContent = "New password must be at least 6 characters."; el.changePwError.hidden = false; return; }
    if(next !== confirm){ el.changePwError.textContent = "New passwords don't match."; el.changePwError.hidden = false; return; }
    el.changePwError.hidden = true;
    setBtnLoading(el.confirmChangePwBtn, true, "Updating…");
    try{
      await ShadabAPI.changePassword(current, next);
      showToast("Password updated");
      closeChangePwModal();
    }catch(err){
      el.changePwError.textContent = err.message || "Couldn't update password.";
      el.changePwError.hidden = false;
    }finally{
      setBtnLoading(el.confirmChangePwBtn, false);
    }
  });

  /* =========================================================
     HEADER SEARCH (live suggestions as you type)
     ========================================================= */
  function openSearchPanel(){
    el.searchPanel.classList.add("is-open");
    registerOverlay("search", closeSearchPanel);
    setTimeout(()=> el.searchInput.focus(), 200);
  }
  function closeSearchPanel(){
    el.searchPanel.classList.remove("is-open");
    unregisterOverlay("search");
    // Give the collapse transition a moment to finish, then make sure the
    // category bar's sticky offset is resynced to the header's real
    // (now-shorter) height — the ResizeObserver will also catch this, but
    // doing it explicitly here avoids even a single stale frame.
    setTimeout(syncTopbarHeightVar, 260);
  }
  el.searchToggleBtn.addEventListener("click", ()=>{
    el.searchPanel.classList.contains("is-open") ? closeSearchPanel() : openSearchPanel();
  });
  el.searchCloseBtn.addEventListener("click", closeSearchPanel);

  function runSearch(){
    const term = el.searchInput.value.trim().toLowerCase();
    if(!term){ el.searchResults.hidden = true; el.searchResults.innerHTML = ""; return; }
    const matches = getMenu().filter(item =>
      item.name.toLowerCase().includes(term) ||
      (item.category || "").toLowerCase().includes(term) ||
      (item.description || "").toLowerCase().includes(term)
    );
    el.searchResults.hidden = false;
    if(matches.length === 0){
      el.searchResults.innerHTML = `<div class="search-empty">No items found for "${el.searchInput.value.trim()}"</div>`;
      return;
    }
    el.searchResults.innerHTML = matches.map(item => `
      <div class="search-result-row" data-id="${item.id}">
        <div class="search-result-row__media">${mediaHTML(item)}</div>
        <span class="search-result-row__name">${item.name}</span>
        <span class="search-result-row__price">₹${item.price}</span>
      </div>`).join("");
    $$(".search-result-row", el.searchResults).forEach(row=>{
      row.addEventListener("click", ()=>{
        const id = row.dataset.id;
        closeSearchPanel();
        el.searchInput.value = "";
        el.searchResults.hidden = true;
        navigateTo("home");
        setTimeout(()=> openItemDetail(id), 250);
      });
    });
  }
  el.searchInput.addEventListener("input", runSearch);
  wireImageFallback(el.searchResults);

  /* =========================================================
     ITEM DETAIL MODAL (click any dish to learn more)
     ========================================================= */
  let detailItemId = null;
  function openItemDetail(id){
    const item = findItem(id);
    if(!item) return;
    detailItemId = id;
    el.itemDetailMedia.innerHTML = mediaHTML(item);
    el.itemDetailCategory.textContent = item.category || "";
    el.itemDetailName.textContent = item.name;
    el.itemDetailDesc.textContent = item.description || "Freshly prepared and dum-sealed, delivered hot to your door.";
    el.itemDetailPrice.textContent = "₹" + item.price + (item.note ? `  ·  ${item.note}` : "");
    const startQty = store.cart[id] || 1;
    el.itemDetailQty.textContent = startQty;
    const open = isOrderingOpen();
    el.itemDetailAddBtn.disabled = !open;
    el.itemDetailAddBtn.textContent = !open ? "Ordering Closed" : (store.cart[id] ? "Update Cart" : "Add to Cart");
    el.itemDetailShade.classList.add("is-open");
    el.itemDetailModal.classList.add("is-open");
    registerOverlay("itemDetail", closeItemDetail);
  }
  function closeItemDetail(){
    el.itemDetailShade.classList.remove("is-open");
    el.itemDetailModal.classList.remove("is-open");
    detailItemId = null;
    unregisterOverlay("itemDetail");
  }
  el.itemDetailCloseBtn.addEventListener("click", closeItemDetail);
  el.itemDetailShade.addEventListener("click", closeItemDetail);
  el.itemDetailMinus.addEventListener("click", ()=>{
    const q = Number(el.itemDetailQty.textContent);
    if(q > 1) el.itemDetailQty.textContent = q - 1;
  });
  el.itemDetailPlus.addEventListener("click", ()=>{
    el.itemDetailQty.textContent = Number(el.itemDetailQty.textContent) + 1;
  });
  el.itemDetailAddBtn.addEventListener("click", ()=>{
    if(!isOrderingOpen() || !detailItemId) return;
    setQty(detailItemId, Number(el.itemDetailQty.textContent));
    showToast("Added to cart");
    closeItemDetail();
  });

  /* =========================================================
     CHECKOUT
     ========================================================= */
  function openCheckout(){
    if(!isOrderingOpen()){ showToast("Ordering is closed for today"); return; }
    if(cartCount() === 0){ showToast("Your cart is empty"); return; }
    if(!store.currentUser){
      closeCart();
      openAuthModal();
      showToast("Please log in to place your order");
      return;
    }
    const cart = store.cart;
    const rows = Object.entries(cart).map(([id,qty])=>{
      const item = findItem(id);
      return `<div class="cs-row"><span>${item.name} × ${qty}</span><span>₹${item.price*qty}</span></div>`;
    }).join("");
    el.checkoutSummary.innerHTML = rows + `<div class="cs-total"><span>Total</span><span>₹${cartTotalAmount()}</span></div>`;
    el.checkoutShade.classList.add("is-open");
    el.checkoutModal.classList.add("is-open");
    registerOverlay("checkout", closeCheckout);
  }
  function closeCheckout(){
    el.checkoutShade.classList.remove("is-open");
    el.checkoutModal.classList.remove("is-open");
    unregisterOverlay("checkout");
  }
  el.checkoutBtn.addEventListener("click", openCheckout);
  el.checkoutCloseBtn.addEventListener("click", closeCheckout);
  el.checkoutShade.addEventListener("click", closeCheckout);

  /* Order IDs read as SH + 2 letters + 4 digits (e.g. SHTX4821) — always
     ends in 4 digits, easier to read aloud than a raw timestamp. */
  function generateOrderId(){
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no ambiguous I/O
    let code = "SH";
    code += letters[Math.floor(Math.random()*letters.length)];
    code += letters[Math.floor(Math.random()*letters.length)];
    code += String(Math.floor(1000 + Math.random()*9000));
    return code;
  }

  el.confirmOrderBtn.addEventListener("click", async ()=>{
    if(!isOrderingOpen()){ showToast("Ordering just closed — try again tomorrow"); closeCheckout(); tick(); return; }
    const user = store.currentUser;
    const cart = store.cart;
    if(!user || Object.keys(cart).length === 0) return;

    const items = Object.entries(cart).map(([id,qty])=>{
      const item = findItem(id);
      return { id, name:item.name, note:item.note, price:item.price, qty };
    });

    const payload = {
      customerName: user.name,
      customerPhone: user.phone,
      items,
      total: cartTotalAmount(),
    };

    el.confirmOrderBtn.disabled = true;
    try{
      const res = await ShadabAPI.placeOrder(payload);
      store.cart = {};
      closeCheckout();
      closeCart();
      renderMenu();
      renderCart();
      tick();
      const order = res && res.order;
      const held = order && order.status === "held";
      openOrderPlacedModal(order, held);
      // The below-header banner is a fallback for people who haven't
      // enabled push notifications — for them there's otherwise no signal
      // once they close this modal. Someone WITH push enabled gets a real
      // phone/OS notification instead (from the backend, independent of
      // this tab even being open), so showing the in-page banner too would
      // just be a redundant, confusing second "notification" for the same
      // event. Queued rather than shown immediately: firing it now would
      // just have it sit invisible behind the modal's shade and often
      // finish its few seconds before the modal is even closed.
      const pushAlreadyEnabled = typeof Notification !== "undefined" && Notification.permission === "granted";
      pendingOrderBanner = pushAlreadyEnabled ? null : {
        icon: held ? "⏳" : "🎉",
        text: held ? "Order received — confirming once today's minimum is reached." : `Order confirmed${order && order.id ? " — #" + order.id : ""}!`,
      };
      if(window.ShadabPush) setTimeout(()=> window.ShadabPush.promptCustomer(), 1600);
    }catch(err){
      showToast(err.message || "Couldn't place order — try again.");
    }finally{
      el.confirmOrderBtn.disabled = false;
    }
  });

  /* -- clear "order placed" modal: replaces a toast that used to float over
     the menu list (overlapping item cards) with an unambiguous dialog that
     dims the background, states plainly whether the order is confirmed or
     still pending the day's pool minimum, and gives a direct way into
     My Orders instead of making the person hunt for it. -- */
  function openOrderPlacedModal(order, held){
    if(!el.orderPlacedModal) return;
    el.orderPlacedIcon.textContent = held ? "⏳" : "🎉";
    el.orderPlacedTitle.textContent = held ? "Order received!" : "Order confirmed!";
    el.orderPlacedMsg.textContent = held
      ? "It'll confirm the moment today's orders reach the minimum pool amount — no action needed from you."
      : "The kitchen has accepted your order and it's on today's confirmed list.";
    const bits = [];
    if(order && order.id) bits.push(`#${order.id}`);
    if(order && order.total != null) bits.push(`₹${order.total}`);
    const range = order && order.deliveryWindowStart && order.deliveryWindowEnd
      ? formatTimeRange12(order.deliveryWindowStart, order.deliveryWindowEnd)
      : (liveSettings.deliveryWindowStart ? formatTimeRange12(liveSettings.deliveryWindowStart, liveSettings.deliveryWindowEnd) : "");
    if(range) bits.push(`Delivery ${range}`);
    el.orderPlacedMeta.textContent = bits.join(" · ");
    el.orderPlacedShade.classList.add("is-open");
    el.orderPlacedModal.classList.add("is-open");
    registerOverlay("orderPlaced", closeOrderPlacedModal);
  }
  function closeOrderPlacedModal(){
    el.orderPlacedShade.classList.remove("is-open");
    el.orderPlacedModal.classList.remove("is-open");
    unregisterOverlay("orderPlaced");
    // Fire the queued fallback banner (see placeOrder above) only now that
    // the modal is actually out of the way, so it's visible for its full
    // few seconds instead of ticking away hidden behind the modal shade.
    if(pendingOrderBanner){
      showEventBanner(pendingOrderBanner.icon, pendingOrderBanner.text);
      pendingOrderBanner = null;
    }
  }
  if(el.orderPlacedCloseBtn) el.orderPlacedCloseBtn.addEventListener("click", closeOrderPlacedModal);
  if(el.continueBrowsingBtn) el.continueBrowsingBtn.addEventListener("click", closeOrderPlacedModal);
  if(el.orderPlacedShade) el.orderPlacedShade.addEventListener("click", closeOrderPlacedModal);
  if(el.viewMyOrdersBtn) el.viewMyOrdersBtn.addEventListener("click", ()=>{
    closeOrderPlacedModal();
    navigateTo("orders");
  });

  /* -- map a backend order object to the shape the UI already expects -- */
  function mapServerOrder(o){
    const d = new Date(o.createdAt);
    return {
      id: o.id,
      customerName: o.customerName,
      phone: o.customerPhone,
      address: o.address || "",
      items: o.items,
      total: o.total,
      dateISO: (o.createdAt || "").slice(0,10),
      dateKey: o.dateKey || (o.createdAt || "").slice(0,10),
      timeLabel: isNaN(d) ? "" : d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}),
      timestamp: isNaN(d) ? 0 : d.getTime(),
      createdAt: o.createdAt || "",
      confirmedAt: o.confirmedAt || "",
      preparingAt: o.preparingAt || "",
      deliveredAt: o.deliveredAt || "",
      cancelledAt: o.cancelledAt || "",
      status: o.status || "placed",
      delivered: o.status === "delivered",
      cancelled: o.status === "cancelled",
      deliveryWindowStart: o.deliveryWindowStart || liveSettings.deliveryWindowStart,
      deliveryWindowEnd: o.deliveryWindowEnd || liveSettings.deliveryWindowEnd,
      cancellationMode: o.cancellationMode || liveSettings.cancellationMode || "afterClosing",
      cancelWindowStart: o.cancelWindowStart || liveSettings.cancelWindowStart,
      cancelWindowEnd: o.cancelWindowEnd || liveSettings.cancelWindowEnd,
      closingTime: o.closingTime || liveSettings.closingTime || DEFAULT_CLOSING_TIME,
      graceMinutes: Number.isFinite(Number(o.graceMinutes)) ? Number(o.graceMinutes) : Number(liveSettings.graceMinutes || 0),
      cancelWindowMinutes: Number.isFinite(Number(o.cancelWindowMinutes)) ? Number(o.cancelWindowMinutes) : Number(liveSettings.cancelWindowMinutes || 15),
    };
  }

  /* =========================================================
     MY ORDERS
     ========================================================= */
  let myOrdersHash = null;
  // Cache of the last-rendered order objects, keyed by id — the live
  // ticker (see updateLiveOrderCards below) reads from this to update
  // progress bars and cancel-button visibility every second WITHOUT
  // rebuilding the DOM, so the fill animates smoothly instead of
  // snapping, and stale controls (like a Cancel button after the window
  // has closed) disappear on their own even between polls.
  let renderedOrdersById = new Map();
  // The full (unfiltered) list from the last successful fetch — tab
  // switches re-render from this cache instantly, with no re-fetch and
  // no loading flash.
  let myOrdersRaw = [];
  let myOrdersFilter = "all";
  // Only "All" and "Delivered" are fixed categories — everything before
  // delivery (held/confirmed/preparing) is one combined "in progress" tab
  // instead of three separate ones, so the tab row never overflows and
  // needs horizontal scrolling to see "Delivered". The tab's own label
  // still reflects where those orders actually are: it shows the single
  // matching stage name when every in-progress order shares one status,
  // and falls back to "In Progress" the moment they don't (e.g. one
  // order still pending while another is already preparing).
  const MY_ORDERS_FILTERS = {
    all: (o) => true,
    active: (o) => !o.cancelled,
    cancelled: (o) => !!o.cancelled,
  };
  const MY_ORDERS_FILTER_LABELS = { all: "orders", active: "in-progress", cancelled: "cancelled" };
  // My Orders shows only TODAY's orders by default — a fresh, uncluttered
  // list each new day, without ever deleting or hiding anything from the
  // account's real history. "Show all orders" switches to the full list;
  // it stays on "all" for the rest of the session once tapped, so the
  // choice doesn't reset every time the tab is revisited.
  let myOrdersDayScope = "today";
  function isOrderToday(o){ return o.dateISO === todayISO(); }
  function activeStageLabel(o){
    if(o.delivered) return "Delivered";
    if(o.status === "held") return "Pending";
    return effectiveStatus(o) === "preparing" ? "Preparing" : "Confirmed";
  }
  function updateMyOrdersFilterCounts(list){
    if(!el.myOrdersFilterTabs) return;
    const counts = { all: list.length, active: 0, cancelled: 0 };
    const activeStages = new Set();
    list.forEach(o=>{
      if(o.cancelled){ counts.cancelled++; return; }
      counts.active++;
      activeStages.add(activeStageLabel(o));
    });
    $$("[data-count]", el.myOrdersFilterTabs).forEach(span=>{
      const key = span.dataset.count;
      span.textContent = counts[key] != null ? counts[key] : 0;
    });
    if(el.myOrdersActiveTabLabel){
      el.myOrdersActiveTabLabel.textContent = activeStages.size === 1 ? [...activeStages][0] : "In Progress";
    }
  }
  // Renders the currently-selected filter tab from the cached list —
  // no network call, so switching tabs feels instant.
  function renderMyOrdersList(){
    if(myOrdersRaw.length === 0){
      if(el.myOrdersFilterTabs) el.myOrdersFilterTabs.hidden = true;
      if(el.myOrdersDayToggle) el.myOrdersDayToggle.hidden = true;
      el.myOrdersList.innerHTML = `<div class="empty-state"><span>🧾</span>No orders yet<br><small>Your first CraviX order is one tap away.</small></div>`;
      return;
    }
    const todaysCount = myOrdersRaw.filter(isOrderToday).length;
    // The toggle is only worth showing once there's actually a choice to
    // make — i.e. some orders fall outside today. Otherwise "today" and
    // "all" are the same list, and a toggle between two identical views
    // would just be confusing clutter.
    const hasOlderOrders = todaysCount < myOrdersRaw.length;
    if(el.myOrdersDayToggle){
      el.myOrdersDayToggle.hidden = !hasOlderOrders;
      if(el.myOrdersDayInfo) el.myOrdersDayInfo.textContent = myOrdersDayScope === "today" ? "Showing today's orders" : "Showing all orders";
      if(el.myOrdersDayToggleBtn) el.myOrdersDayToggleBtn.textContent = myOrdersDayScope === "today" ? "Show all orders" : "Show today's orders only";
    }
    const dayScoped = (myOrdersDayScope === "today" && hasOlderOrders) ? myOrdersRaw.filter(isOrderToday) : myOrdersRaw;
    if(el.myOrdersFilterTabs) el.myOrdersFilterTabs.hidden = dayScoped.length === 0;
    updateMyOrdersFilterCounts(dayScoped);
    if(dayScoped.length === 0){
      // Today scope active, but nothing's been ordered yet today —
      // distinct from "no orders yet" (this account does have history,
      // just not from today).
      el.myOrdersList.innerHTML = `<div class="empty-state"><span>📅</span>No orders today<br><small>You have ${myOrdersRaw.length} earlier order${myOrdersRaw.length === 1 ? "" : "s"} — tap "Show all orders" above to see them.</small></div>`;
      return;
    }
    const pick = MY_ORDERS_FILTERS[myOrdersFilter] || MY_ORDERS_FILTERS.all;
    const filtered = dayScoped.filter(pick);
    if(filtered.length === 0){
      el.myOrdersList.innerHTML = `<div class="empty-state"><span>🗂️</span>No ${MY_ORDERS_FILTER_LABELS[myOrdersFilter]} orders<br><small>Try a different tab above.</small></div>`;
      return;
    }
    el.myOrdersList.innerHTML = filtered.map(orderCardHTML).join("");
    wireMyOrderCancelButtons();
    updateLiveOrderCards();
  }
  if(el.myOrdersDayToggleBtn){
    el.myOrdersDayToggleBtn.addEventListener("click", ()=>{
      myOrdersDayScope = myOrdersDayScope === "today" ? "all" : "today";
      renderMyOrdersList();
    });
  }
  if(el.myOrdersFilterTabs){
    $$("[data-filter]", el.myOrdersFilterTabs).forEach(btn=>{
      btn.addEventListener("click", ()=>{
        if(btn.dataset.filter === myOrdersFilter) return;
        myOrdersFilter = btn.dataset.filter;
        $$("[data-filter]", el.myOrdersFilterTabs).forEach(b=>b.classList.toggle("is-active", b===btn));
        renderMyOrdersList();
      });
    });
  }
  async function renderMyOrders(silent, resetTabDefault, fromPush){
    const user = store.currentUser;
    if(!user){
      myOrdersHash = null;
      renderedOrdersById = new Map();
      myOrdersRaw = [];
      myOrdersDayScope = "today";
      if(el.myOrdersFilterTabs) el.myOrdersFilterTabs.hidden = true;
      if(el.myOrdersDayToggle) el.myOrdersDayToggle.hidden = true;
      el.myOrdersList.innerHTML = `<div class="empty-state"><span>🔒</span>Log in to see your orders<br><small>Your order history will appear here.</small></div>`;
      return;
    }
    if(!silent) el.myOrdersList.innerHTML = (window.ShadabAdvanceUI && window.ShadabAdvanceUI.skeletonOrderCards) ? window.ShadabAdvanceUI.skeletonOrderCards(3) : `<div class="empty-state"><span>⏳</span>Loading your orders…</div>`;
    let mine = [];
    try{
      const data = await ShadabAPI.myOrders();
      mine = (data.orders || []).map(mapServerOrder);
    }catch(err){
      if(!silent) el.myOrdersList.innerHTML = `<div class="empty-state"><span>⚠️</span>${err.message || "Couldn't load orders"}</div>`;
      return;
    }
    if(mine.some(o => o.status === "held")) refreshLivePool();
    // Every time the orders page is freshly opened (not a background
    // poll), the "In Progress" tab is selected by default whenever there's
    // at least one active (non-cancelled) order to show — that's the info
    // someone opening the page actually wants to see. Only when there's
    // nothing active does it fall back to "All" (which, with nothing
    // there either, just shows the empty state). Manually switching tabs
    // afterward is left alone; this only runs on a fresh page open.
    if(resetTabDefault){
      myOrdersFilter = mine.some(o => !o.cancelled) ? "active" : "all";
      if(el.myOrdersFilterTabs){
        $$("[data-filter]", el.myOrdersFilterTabs).forEach(b=>b.classList.toggle("is-active", b.dataset.filter === myOrdersFilter));
      }
    }
    // Skip the DOM rebuild entirely when nothing actually changed — this is
    // what makes background polling feel instant instead of causing a
    // visible flash/reflow every few seconds on a screen the person is
    // actively looking at. Time-driven changes (progress %, cancel-button
    // visibility) don't need a rebuild at all — updateLiveOrderCards()
    // keeps those current every second regardless of this hash.
    const hash = JSON.stringify(mine.map(o=>[o.id,o.status]));
    myOrdersRaw = mine;
    if(silent && hash === myOrdersHash){
      mine.forEach(o => renderedOrdersById.set(o.id, o));
      const todaysCount = myOrdersRaw.filter(isOrderToday).length;
      const hasOlderOrders = todaysCount < myOrdersRaw.length;
      const dayScoped = (myOrdersDayScope === "today" && hasOlderOrders) ? myOrdersRaw.filter(isOrderToday) : myOrdersRaw;
      updateMyOrdersFilterCounts(dayScoped);
      return;
    }
    // Plays a chime + lets the person know when a poll (not just a push)
    // finds a real status change — this is what makes in-app updates
    // audible even for someone who never granted push permission at all.
    // Guarded on myOrdersHash!==null so it never fires on the very first
    // load of a page that already has active orders.
    if(myOrdersHash !== null && window.ShadabNotifySound){
      window.ShadabNotifySound.onCustomerOrdersUpdated(renderedOrdersById, mine, { fromPush: !!fromPush });
    }
    myOrdersHash = hash;
    renderedOrdersById = new Map(mine.map(o => [o.id, o]));
    renderMyOrdersList();
  }
  /* The backend auto-promotes "confirmed" -> "preparing" the moment an
     order's cancellation window closes (see reconcilePool in orders.js),
     but that only actually lands in the browser on the next poll
     (LIVE_REFRESH_MS later). Rather than have the tracker visibly sit
     still for those few seconds, effectiveStatus() predicts the same
     transition locally from the live clock — the instant the window
     closes, the UI already treats the order as "preparing", and the next
     poll just confirms what the tracker already showed. cancelled/held/
     delivered are always authoritative from the server, never predicted. */
  function effectiveStatus(o){
    if(o.cancelled || o.delivered || o.status === "held" || o.status === "preparing") return o.status;
    if(o.status === "confirmed"){
      const win = getCancelWindow(o);
      if(Number.isFinite(win.closesAtMs) && Date.now() > win.closesAtMs) return "preparing";
    }
    return o.status;
  }
  function orderStatusLabel(o){
    if(o.cancelled) return "Cancelled";
    if(o.delivered) return "Order reached";
    if(effectiveStatus(o) === "preparing") return "Preparing";
    if(o.status === "held") return "Pending";
    return "Confirmed";
  }
  function orderStatusClass(o){
    if(o.cancelled) return "cancelled";
    if(o.delivered) return "delivered";
    if(effectiveStatus(o) === "preparing") return "preparing";
    if(o.status === "held") return "pending";
    return "confirmed";
  }
  /* The full explanation used to live inline in the badge itself
     ("PENDING — WAITING FOR TODAY'S MINIMUM…"), which is what was
     overflowing past the edge of the card on narrow phones. The badge
     now just shows the short word; tapping it reveals the same
     explanation in a toast instead of permanently eating card width. */
  function orderStatusTip(o){
    if(o.cancelled) return "This order was cancelled.";
    if(o.delivered) return "Your order has reached you — enjoy your meal!";
    if(effectiveStatus(o) === "preparing") return "The kitchen has started cooking this order.";
    if(o.status === "held") return "Pending — waiting for today's minimum order pool to be reached. It confirms automatically, no action needed.";
    return "Confirmed — the kitchen has accepted this order as part of today's batch.";
  }
  function escapeAttr(s){
    return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }
  function statusBadgeHTML(o){
    return `<span class="order-card__status ${orderStatusClass(o)}" data-tip="${escapeAttr(orderStatusTip(o))}">${orderStatusLabel(o)}</span>`;
  }
  const ORDER_STAGES = [
    { key: "held", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "preparing", label: "Preparing" },
    { key: "delivered", label: "Order reached" },
  ];
  // Percentage boundary each stage's segment fills between. The last
  // segment deliberately stops well short of 100 — real-world delivery
  // timing is never perfectly predictable, so the bar shouldn't claim the
  // order has fully arrived just because the estimated delivery time
  // passed. It only completes to 100 the moment the admin actually
  // confirms the order has reached the customer. The gap between this cap
  // and 100 also has to be wide enough to render as an actual visible gap
  // on screen, not just a slightly-short fill that looks the same as
  // "done" at a glance — 98 was so close to the final dot that the two
  // were visually indistinguishable; 90 leaves a clear, deliberate space.
  const PROGRESS_BOUNDS = [0, 25, 62, 90, 100];
  /* The instant the cancellation clock actually starts counting down
     against an order — the moment the front-end progress bar should
     start moving off the 25% mark. In "timeRange" mode that's simply
     when the admin's window opens. In "afterClosing" mode cancellation
     is technically allowed from the moment the order is placed, but the
     admin's cancellation ALLOWANCE (the "10 minutes" in "if 5 of 10
     minutes have passed, the segment is 50% full") only really starts
     ticking once the kitchen closes — everything before that is just
     ordinary open-for-cancellation time, not the countdown itself. */
  function getCancelClockStartMs(o){
    const win = getCancelWindow(o);
    if(win.mode === "timeRange") return win.opensAtMs;
    const closing = o.closingTime || liveSettings.closingTime || DEFAULT_CLOSING_TIME;
    return dateTimeMs(o, closing);
  }
  /* Continuous (not stepped) progress calculation — the bar creeps
     forward smoothly as the real-world conditions behind each stage
     move, instead of jumping in four discrete blocks:
       - Pending: fills 0→25% as today's order pool total climbs toward
         the admin's minimum (real pool data, shared across all
         customers).
       - Confirmed: fills 25→62% across the order's ACTUAL confirmed
         lifetime — from confirmedAt (the moment the backend flipped it
         held -> confirmed, stamped by reconcilePool) to the moment its
         cancellation window closes. Using confirmedAt as the start
         (rather than the closing-time-triggered cancellation allowance)
         is what makes this segment move visibly the whole time an order
         sits confirmed, instead of sitting frozen at 25% for however
         long remains before closing time and then rushing through in
         the last few minutes — which is what made the tracker look like
         it "jumped" straight from Confirmed to Preparing.
       - Preparing: fills 62→90% as time elapses from when preparation
         started (or the cancellation window closed, if the admin hasn't
         explicitly flipped the order to "preparing" yet) toward the END
         of the estimated delivery window — not the start of it — so the
         bar keeps creeping right up until delivery is actually due,
         instead of hitting its cap the moment the window opens and then
         sitting still for the rest of it.
       - The final 90→100% stretch only fills once the admin marks the
         order as reached/delivered from the admin panel — never
         automatically, no matter how much time has passed. If the
         delivery window's end time arrives first, progress simply holds
         at 90% — with a clear, deliberate gap still showing before
         "Order reached" — and waits. */
  function computeOrderProgress(o){
    if(o.cancelled) return null;
    if(o.delivered) return { pct: 100, idx: 3 };
    if(o.status === "held"){
      const denom = livePool.minAmount > 0 ? livePool.minAmount : 1;
      const frac = clamp(livePool.total / denom, 0, 1);
      return { pct: PROGRESS_BOUNDS[0] + frac * (PROGRESS_BOUNDS[1] - PROGRESS_BOUNDS[0]), idx: 0 };
    }
    if(effectiveStatus(o) === "preparing"){
      const win = getCancelWindow(o);
      const start = o.preparingAt ? new Date(o.preparingAt).getTime() : win.closesAtMs;
      const end = dateTimeMs(o, o.deliveryWindowEnd);
      const frac = clamp(end > start ? (Date.now() - start) / (end - start) : 1, 0, 1);
      return { pct: PROGRESS_BOUNDS[2] + frac * (PROGRESS_BOUNDS[3] - PROGRESS_BOUNDS[2]), idx: 2 };
    }
    // confirmed — animate from the real confirmedAt timestamp (falling
    // back to the old closing-time-based estimate only for legacy orders
    // placed before this field existed) through to the cancellation
    // window's close.
    const win = getCancelWindow(o);
    const start = o.confirmedAt ? new Date(o.confirmedAt).getTime() : getCancelClockStartMs(o);
    const end = win.closesAtMs;
    const now = Date.now();
    const frac = now <= start ? 0 : clamp(end > start && Number.isFinite(end) ? (now - start) / (end - start) : 1, 0, 1);
    return { pct: PROGRESS_BOUNDS[1] + frac * (PROGRESS_BOUNDS[2] - PROGRESS_BOUNDS[1]), idx: 1 };
  }
  /* Professional line-progress tracker (the kind seen in top food-delivery
     apps): a horizontal track with a dot per stage, a filled portion that
     animates continuously, and a soft pulse on the active dot. Skipped
     entirely for cancelled orders — a stalled progress bar reads as a
     bug, not as "this stopped here on purpose". */
  // The track visually spans only the inner 75% of the card (from the
  // first dot's center at 12.5% to the last dot's center at 87.5%) — so a
  // raw 0-100 progress % has to be rescaled into that same 12.5-87.5%
  // span, or the fill/cursor overshoot past the last dot at high progress
  // instead of landing on it. progressTrackPct gives the CURSOR its
  // absolute position in that space; progressFillWidthPct gives the FILL
  // bar its width, which is different because the fill's CSS anchors it
  // with a fixed `left:12.5%` — its width has to be the distance from
  // that anchor, not the same absolute number used for the cursor's left.
  function progressTrackPct(pct){ return 12.5 + (clamp(pct, 0, 100) / 100) * 75; }
  function progressFillWidthPct(pct){ return (clamp(pct, 0, 100) / 100) * 75; }
  // Each stage dot's physical position is derived from the SAME boundary
  // values computeOrderProgress uses to decide when a stage's color
  // flips to "reached" (PROGRESS_BOUNDS), converted through the exact
  // same progressTrackPct formula the moving cursor uses. This was the
  // actual source of every "tracker doesn't line up" glitch so far: dots
  // were previously placed at even quarters (12.5/37.5/62.5/87.5%), but
  // a stage's color turns gold based on those UNEVEN real-world
  // boundaries (pending ends at 25%, confirmed at 62%, preparing caps at
  // 92%) — so a dot could visually sit ahead of or behind where the
  // cursor actually was when its color changed. Building both from one
  // shared source guarantees the cursor is always exactly ON a dot at
  // the instant that dot lights up, and never drifts from it in between.
  const STAGE_POSITIONS = [
    progressTrackPct(PROGRESS_BOUNDS[0]),
    progressTrackPct(PROGRESS_BOUNDS[1]),
    progressTrackPct(PROGRESS_BOUNDS[2]),
    progressTrackPct(PROGRESS_BOUNDS[4]), // 100, not the 90 "preparing" cap — the last dot represents actual delivery, which only ever happens as the discrete cap→100 jump once the admin confirms.
  ];
  function orderProgressHTML(o){
    if(o.cancelled) return "";
    const progress = computeOrderProgress(o) || { pct: 0, idx: 0 };
    const trackPct = progressTrackPct(progress.pct);
    const fillWidthPct = progressFillWidthPct(progress.pct);
    return `
    <div class="order-progress" data-progress-for="${o.id}">
      <div class="order-progress__track"></div>
      <div class="order-progress__fill" style="width:${fillWidthPct}%"></div>
      ${o.delivered ? "" : `<div class="order-progress__cursor" style="left:${trackPct}%"></div>`}
      ${ORDER_STAGES.map((s,i)=>{
        const state = i < progress.idx ? "done" : i === progress.idx ? "active" : "upcoming";
        return `<div class="order-progress__step order-progress__step--${state}" style="left:${STAGE_POSITIONS[i]}%">
          <span class="order-progress__dot"></span>
          <span class="order-progress__label">${s.label}</span>
        </div>`;
      }).join("")}
    </div>`;
  }
  // Plain note text only (no markup) — used both to build the combined
  // footer below and read out loud nowhere else, so it stays a single
  // source of truth for the wording.
  function cancelNoteText(o){
    if(o.delivered || o.cancelled) return "";
    if(effectiveStatus(o) === "preparing") return "The kitchen has started preparing this order — it can no longer be cancelled.";
    const win = getCancelWindow(o);
    if(win.notYetOpen) return `Cancellation opens at ${new Date(win.opensAtMs).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}.`;
    if(win.closed) return `The cancellation window for today's orders closed at ${new Date(win.closesAtMs).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})}.`;
    return "";
  }
  /* Combines the cancel-status note and the "Cancellation terms" link
     into ONE paragraph, with the link sitting right beside the note text
     (a small gap between them) instead of on its own separate line below
     — reads as a single, natural sentence with a "learn more" link
     attached, rather than two disconnected pieces of text stacked on top
     of each other. Always renders (as long as the order is still open),
     even when there's no note text, so the terms link keeps showing on
     its own. */
  function cancelFooterHTML(o){
    if(o.delivered || o.cancelled) return "";
    const note = cancelNoteText(o);
    const termsBtn = `<button type="button" class="order-card__terms-link" data-terms-id="${o.id}">Cancellation terms</button>`;
    return `<p class="order-card__cancel-note">${note ? `<span class="order-card__cancel-note-text">${note}</span> ` : ""}${termsBtn}</p>`;
  }
  function cancelTermsText(o){
    const win = getCancelWindow(o);
    const lines = [];
    lines.push(`Ordered on ${o.dateISO}${o.timeLabel ? " at " + o.timeLabel : ""}.`);
    if(win.mode === "timeRange"){
      lines.push(`Cancellation is allowed only between ${new Date(win.opensAtMs).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})} and ${new Date(win.closesAtMs).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})} on the day the order was placed.`);
    } else {
      lines.push(`Cancellation is allowed until ${new Date(win.closesAtMs).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"})} — the daily closing time plus any extra time and the cancellation allowance the restaurant has set.`);
    }
    lines.push("Once the kitchen marks an order as preparing, it can no longer be cancelled — even if the time window above hasn't ended yet.");
    lines.push("An order already marked as reached/delivered can't be cancelled.");
    return lines;
  }
  /* Shown on a still-"held" order once today's ordering window (closing
     time + extra/grace time) has fully closed without the pool ever
     reaching the admin's minimum. Up to that point a held order is just
     normally "Pending" — plenty of time left for other orders to join the
     pool. Only once the session is genuinely over does it become honest
     to tell the customer their order won't be confirmed today, instead of
     leaving it looking like it's still quietly waiting forever. Never
     shown for cancelled/delivered orders, and never shown for anything
     that already reached "confirmed" or later — those did get through. */
  function sessionEndedNoteHTML(o){
    if(o.cancelled || o.delivered || o.status !== "held") return "";
    if(getOrderingState().phase !== "closed") return "";
    return `
    <div class="order-card__session-ended">
      <span class="order-card__session-ended-ico">😔</span>
      <span>Not taking orders this session — today's minimum order pool wasn't reached in time, so the kitchen won't prepare this order. Nothing you need to do; feel free to order again next session.</span>
    </div>`;
  }
  function orderCardHTML(o){
    const itemsHTML = o.items.map(i=>`${i.name}${i.note?` (${i.note})`:""} × ${i.qty}`).join("<br>");
    const canCancel = !o.delivered && !o.cancelled && effectiveStatus(o) !== "preparing" && isCancelWindowOpen(o);
    const deliveryRange = o.deliveryWindowStart && o.deliveryWindowEnd ? formatTimeRange12(o.deliveryWindowStart, o.deliveryWindowEnd) : "";
    return `
    <div class="order-card ${o.cancelled ? "order-card--cancelled" : ""}" data-id="${o.id}">
      <div class="order-card__top">
        <span class="order-card__id">#${o.id}</span>
        ${statusBadgeHTML(o)}
      </div>
      <div class="order-card__items">${itemsHTML}</div>
      ${orderProgressHTML(o)}
      <div data-session-ended>${sessionEndedNoteHTML(o)}</div>
      ${deliveryRange && !o.cancelled ? `<div class="order-card__delivery">🛵 Delivery ${deliveryRange}</div>` : ""}
      <div class="order-card__foot">
        <span class="order-card__meta">Ordered ${o.dateISO} · ${o.timeLabel}</span>
        <span class="order-card__total">₹${o.total}</span>
      </div>
      <div class="order-card__actions" data-cancel-actions>
        ${canCancel ? `<button class="btn btn--ghost btn--block order-card__edit" data-edit-id="${o.id}">Edit order</button>` : ""}
        ${canCancel ? `<button class="btn btn--danger btn--block order-card__cancel" data-cancel-id="${o.id}">Cancel order</button>` : ""}
      </div>
      <div data-cancel-note>${cancelFooterHTML(o)}</div>
    </div>`;
  }
  let pendingCancelOrderId = null;
  // Delegated on the LIST CONTAINER (not the individual buttons) so it
  // keeps working after updateLiveOrderCards() swaps a card's cancel-note
  // innerHTML every second to keep the countdown/terms text current — a
  // per-button listener would otherwise get silently thrown away the
  // first time that happens, since the button it was attached to no
  // longer exists in the DOM. Wired once; no need to re-run on re-render.
  let myOrdersClickWired = false;
  function wireMyOrderCancelButtons(){
    if(myOrdersClickWired) return;
    myOrdersClickWired = true;
    el.myOrdersList.addEventListener("click", (e)=>{
      const cancelBtn = e.target.closest("[data-cancel-id]");
      if(cancelBtn){
        pendingCancelOrderId = cancelBtn.dataset.cancelId;
        el.cancelOrderShade.classList.add("is-open");
        el.cancelOrderModal.classList.add("is-open");
        registerOverlay("cancelOrder", closeCancelOrderModal);
        return;
      }
      const editBtn = e.target.closest("[data-edit-id]");
      if(editBtn){
        openEditOrderModal(editBtn.dataset.editId);
        return;
      }
      const termsBtn = e.target.closest("[data-terms-id]");
      if(termsBtn){
        const o = renderedOrdersById.get(termsBtn.dataset.termsId);
        if(!o) return;
        el.cancelTermsBody.innerHTML = cancelTermsText(o).map(t=>`<p>${t}</p>`).join("");
        el.cancelTermsShade.classList.add("is-open");
        el.cancelTermsModal.classList.add("is-open");
        registerOverlay("cancelTerms", closeCancelTermsModal);
      }
    });
  }
  function closeCancelTermsModal(){
    el.cancelTermsShade.classList.remove("is-open");
    el.cancelTermsModal.classList.remove("is-open");
    unregisterOverlay("cancelTerms");
  }
  if(el.cancelTermsCloseBtn) el.cancelTermsCloseBtn.addEventListener("click", closeCancelTermsModal);
  if(el.cancelTermsGotItBtn) el.cancelTermsGotItBtn.addEventListener("click", closeCancelTermsModal);
  if(el.cancelTermsShade) el.cancelTermsShade.addEventListener("click", closeCancelTermsModal);
  /* Runs every second while My Orders is open (hooked from tick()) and
     directly updates each already-rendered card's progress bar width,
     stage states, and cancel button/note — WITHOUT touching innerHTML —
     so the fill animates smoothly via the existing CSS transition and
     time-based UI (like the Cancel button disappearing once the window
     closes) stays correct between the ~4s server polls. This is what
     fixes the Cancel button lingering after the cancellation deadline:
     previously it only ever re-evaluated on a full re-render. */
  function updateLiveOrderCards(){
    const ordersView = document.getElementById("view-orders");
    if(!ordersView || ordersView.hidden) return;
    renderedOrdersById.forEach((o, id) => {
      const card = el.myOrdersList.querySelector(`.order-card[data-id="${CSS.escape(id)}"]`);
      if(!card) return;
      // Progress bar
      const progress = computeOrderProgress(o);
      const track = card.querySelector(".order-progress");
      if(track && progress){
        const trackPct = progressTrackPct(progress.pct);
        const fill = track.querySelector(".order-progress__fill");
        if(fill) fill.style.width = progressFillWidthPct(progress.pct) + "%";
        const cursor = track.querySelector(".order-progress__cursor");
        if(cursor) cursor.style.left = trackPct + "%";
        $$(".order-progress__step", track).forEach((step, i)=>{
          step.classList.remove("order-progress__step--done","order-progress__step--active","order-progress__step--upcoming");
          step.classList.add(`order-progress__step--${i < progress.idx ? "done" : i === progress.idx ? "active" : "upcoming"}`);
        });
      }
      // Cancel button + note (only for orders still eligible to change)
      if(!o.delivered && !o.cancelled){
        const actions = card.querySelector("[data-cancel-actions]");
        const noteWrap = card.querySelector("[data-cancel-note]");
        const canCancel = effectiveStatus(o) !== "preparing" && isCancelWindowOpen(o);
        const hasBtn = !!actions.querySelector("[data-cancel-id]");
        const hasEditBtn = !!actions.querySelector("[data-edit-id]");
        if(canCancel && !hasBtn){
          const btn = document.createElement("button");
          btn.className = "btn btn--danger btn--block order-card__cancel";
          btn.dataset.cancelId = id;
          btn.textContent = "Cancel order";
          // No listener attached here — the delegated click handler on
          // el.myOrdersList (set up once in wireMyOrderCancelButtons)
          // already covers this button via its data-cancel-id attribute.
          actions.prepend(btn);
        } else if(!canCancel && hasBtn){
          actions.querySelector("[data-cancel-id]").remove();
        }
        if(canCancel && !hasEditBtn){
          const editBtn = document.createElement("button");
          editBtn.className = "btn btn--ghost btn--block order-card__edit";
          editBtn.dataset.editId = id;
          editBtn.textContent = "Edit order";
          actions.prepend(editBtn);
        } else if(!canCancel && hasEditBtn){
          actions.querySelector("[data-edit-id]").remove();
        }
        if(noteWrap) noteWrap.innerHTML = cancelFooterHTML(o);
        const sessionWrap = card.querySelector("[data-session-ended]");
        if(sessionWrap) sessionWrap.innerHTML = sessionEndedNoteHTML(o);
      }
    });
  }
  function closeCancelOrderModal(){
    el.cancelOrderShade.classList.remove("is-open");
    el.cancelOrderModal.classList.remove("is-open");
    pendingCancelOrderId = null;
    unregisterOverlay("cancelOrder");
  }
  if(el.keepOrderBtn) el.keepOrderBtn.addEventListener("click", closeCancelOrderModal);
  if(el.cancelOrderShade) el.cancelOrderShade.addEventListener("click", closeCancelOrderModal);
  if(el.confirmCancelOrderBtn) el.confirmCancelOrderBtn.addEventListener("click", async ()=>{
    if(!pendingCancelOrderId) return;
    const id = pendingCancelOrderId;
    el.confirmCancelOrderBtn.disabled = true;
    try{
      await ShadabAPI.cancelOrder(id);
      showToast("Order cancelled");
      closeCancelOrderModal();
      renderMyOrders();
    }catch(err){
      showToast(err.message || "Couldn't cancel the order");
    }finally{
      el.confirmCancelOrderBtn.disabled = false;
    }
  });

  /* =========================================================
     EDIT ORDER — change quantities, add dishes via a picker, and
     (optionally) edit the delivery address/contact number, while
     still inside the cancellation window. Shared between the
     customer's own "My Orders" edit and the admin panel's "Edit"
     button on any order (mode: "admin"), which skips the window
     check and calls the admin-only backend route instead.
     ========================================================= */
  let editOrderState = null; // { id, itemsMap: {itemId: qty}, mode }
  function openEditOrderModal(id, opts){
    const mode = (opts && opts.mode === "admin") ? "admin" : "customer";
    const o = mode === "admin" ? adminOrdersById.get(id) : renderedOrdersById.get(id);
    if(!o) return;
    const itemsMap = {};
    o.items.forEach(i => { itemsMap[i.id] = (itemsMap[i.id] || 0) + i.qty; });
    editOrderState = { id, itemsMap, mode };
    el.editOrderIdLabel.textContent = "#" + o.id;
    if(el.editOrderSubtitle){
      el.editOrderSubtitle.textContent = mode === "admin"
        ? "Editing on the customer's behalf — no cancellation-window limit for admins."
        : "Change quantities or add dishes until the cancellation window closes.";
    }
    el.editOrderAddress.value = o.address || "";
    el.editOrderPhone.value = o.phone || "";
    el.editOrderContactFields.hidden = true;
    el.editOrderContactToggle.classList.remove("is-open");
    el.editOrderError.hidden = true;
    renderEditOrderItems();
    el.editOrderShade.classList.add("is-open");
    el.editOrderModal.classList.add("is-open");
    registerOverlay("editOrder", closeEditOrderModal);
  }
  function closeEditOrderModal(){
    el.editOrderShade.classList.remove("is-open");
    el.editOrderModal.classList.remove("is-open");
    editOrderState = null;
    unregisterOverlay("editOrder");
  }
  if(el.editOrderCloseBtn) el.editOrderCloseBtn.addEventListener("click", closeEditOrderModal);
  if(el.editOrderShade) el.editOrderShade.addEventListener("click", closeEditOrderModal);

  /* ---- collapsed "Edit delivery address & contact number" link ---- */
  if(el.editOrderContactToggle) el.editOrderContactToggle.addEventListener("click", ()=>{
    const opening = el.editOrderContactFields.hidden;
    el.editOrderContactFields.hidden = !opening;
    el.editOrderContactToggle.classList.toggle("is-open", opening);
    if(opening) el.editOrderAddress.focus();
  });

  function editOrderTotalAmount(){
    if(!editOrderState) return 0;
    return Object.entries(editOrderState.itemsMap).reduce((sum, [id, qty])=>{
      const item = findItem(id);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }
  function renderEditOrderItems(){
    if(!editOrderState) return;
    const entries = Object.entries(editOrderState.itemsMap).filter(([,qty]) => qty > 0);
    if(entries.length === 0){
      el.editOrderItems.innerHTML = `<div class="empty-state empty-state--compact"><span>🍽️</span>No items left<br><small>Add a dish below, or save to cancel this order.</small></div>`;
    } else {
      el.editOrderItems.innerHTML = entries.map(([id, qty])=>{
        const item = findItem(id);
        if(!item) return "";
        return `
        <div class="cart-line" data-id="${id}">
          <div class="cart-line__top">
            <div class="cart-line__media">${mediaHTML(item)}</div>
            <div class="cart-line__info">
              <div class="cart-line__name">${item.name}${item.note ? ` <span style="color:var(--text-faint);font-weight:400;">(${item.note})</span>`:""}</div>
              <div class="cart-line__price">₹${item.price} × ${qty} = ₹${item.price*qty}</div>
            </div>
            <button class="cart-line__remove" aria-label="Remove item">✕</button>
          </div>
          <div class="cart-line__bottom">
            <div class="stepper">
              <button class="qty-minus" aria-label="Decrease quantity">−</button>
              <span class="stepper__count">${qty}</span>
              <button class="qty-plus" aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>`;
      }).join("");
      $$(".cart-line", el.editOrderItems).forEach(row=>{
        const id = row.dataset.id;
        $(".qty-minus", row).addEventListener("click", ()=> setEditOrderQty(id, (editOrderState.itemsMap[id]||0)-1));
        $(".qty-plus", row).addEventListener("click", ()=> setEditOrderQty(id, (editOrderState.itemsMap[id]||0)+1));
        $(".cart-line__remove", row).addEventListener("click", (e)=>{
          const line = e.currentTarget.closest(".cart-line");
          // a quick fade+collapse before the row actually leaves the DOM,
          // instead of an abrupt snap — this is the "smooth, not glitchy"
          // feedback the edit-order list was missing.
          line.classList.add("is-removing");
          setTimeout(()=> setEditOrderQty(id, 0), 180);
        });
      });
    }
    el.editOrderTotal.textContent = "₹" + editOrderTotalAmount();
  }
  function setEditOrderQty(id, qty){
    if(!editOrderState) return;
    editOrderState.itemsMap[id] = Math.max(0, Math.min(20, qty));
    renderEditOrderItems();
  }
  if(el.editOrderAddBtn) el.editOrderAddBtn.addEventListener("click", ()=>{
    if(!editOrderState) return;
    openDishPicker(editOrderState.itemsMap, renderEditOrderItems);
  });

  if(el.saveEditOrderBtn) el.saveEditOrderBtn.addEventListener("click", async ()=>{
    if(!editOrderState) return;
    el.editOrderError.hidden = true;
    const entries = Object.entries(editOrderState.itemsMap).filter(([,qty]) => qty > 0);

    if(entries.length === 0){
      // Emptying the cart used to just fail with "needs at least one
      // item" and leave the person stuck. Since removing every item can
      // only mean one thing, offer to cancel the order instead — shown
      // as its own confirm modal, stacked on top of this one.
      openEmptyOrderConfirm();
      return;
    }

    const items = entries.map(([id, qty])=>{
      const item = findItem(id);
      return { id, name: item.name, note: item.note, price: item.price, qty };
    });
    const payload = { items, total: editOrderTotalAmount() };

    const contactOpen = !el.editOrderContactFields.hidden;
    if(contactOpen){
      const phone = el.editOrderPhone.value.trim();
      if(phone && !isValidMobile(phone)){
        el.editOrderError.textContent = "Enter a valid 10-digit contact number, or leave it blank to keep the current one.";
        el.editOrderError.hidden = false;
        return;
      }
      payload.address = el.editOrderAddress.value.trim();
      if(phone) payload.phone = phone;
    }

    setBtnLoading(el.saveEditOrderBtn, true, "Saving…");
    try{
      const { id, mode } = editOrderState;
      if(mode === "admin"){
        await ShadabAPI.adminEditOrder(id, payload);
        showToast("Order updated");
        closeEditOrderModal();
        await loadAdminOrders();
        renderAllOrders();
      } else {
        await ShadabAPI.updateOrder(id, payload);
        showToast("Order updated");
        closeEditOrderModal();
        renderMyOrders();
      }
    }catch(err){
      el.editOrderError.textContent = err.message || "Couldn't save changes — try again.";
      el.editOrderError.hidden = false;
    }finally{
      setBtnLoading(el.saveEditOrderBtn, false);
    }
  });

  /* ---- "No items left — cancel this order instead?" confirm, stacked
     on top of the edit-order modal ---- */
  function openEmptyOrderConfirm(){
    el.emptyOrderShade.classList.add("is-open");
    el.emptyOrderModal.classList.add("is-open");
    registerOverlay("emptyOrder", closeEmptyOrderConfirm);
  }
  function closeEmptyOrderConfirm(){
    el.emptyOrderShade.classList.remove("is-open");
    el.emptyOrderModal.classList.remove("is-open");
    unregisterOverlay("emptyOrder");
  }
  if(el.emptyOrderKeepBtn) el.emptyOrderKeepBtn.addEventListener("click", closeEmptyOrderConfirm);
  if(el.emptyOrderShade) el.emptyOrderShade.addEventListener("click", closeEmptyOrderConfirm);
  if(el.emptyOrderCancelBtn) el.emptyOrderCancelBtn.addEventListener("click", async ()=>{
    if(!editOrderState) return;
    const { id, mode } = editOrderState;
    setBtnLoading(el.emptyOrderCancelBtn, true, "Cancelling…");
    try{
      if(mode === "admin"){
        await ShadabAPI.adminEditOrder(id, { items: [], cancelIfEmpty: true });
      } else {
        await ShadabAPI.updateOrder(id, { items: [], cancelIfEmpty: true });
      }
      showToast("Order cancelled");
      closeEmptyOrderConfirm();
      closeEditOrderModal();
      if(mode === "admin"){ await loadAdminOrders(); renderAllOrders(); }
      else { renderMyOrders(); }
    }catch(err){
      showToast(err.message || "Couldn't cancel the order");
      closeEmptyOrderConfirm();
    }finally{
      setBtnLoading(el.emptyOrderCancelBtn, false);
    }
  });

  /* =========================================================
     DISH PICKER — shared checkbox-list modal used by both "Add a
     dish" in Edit Order and the admin's New Order builder. Shows
     every menu item with its photo/icon and price; checking a box
     adds it to the order (qty 1) immediately, unchecking removes
     it — quantities beyond 1 are still adjusted with the +/− steppers
     on the underlying list, so this stays a simple picker rather
     than a second quantity UI.
     ========================================================= */
  let dishPickerCtx = null; // { itemsMap, onChange }
  function openDishPicker(itemsMap, onChange){
    dishPickerCtx = { itemsMap, onChange };
    el.dishPickerSearchInput.value = "";
    renderDishPickerList("");
    el.dishPickerShade.classList.add("is-open");
    el.dishPickerModal.classList.add("is-open");
    registerOverlay("dishPicker", closeDishPicker);
    setTimeout(()=> el.dishPickerSearchInput.focus(), 260);
  }
  function closeDishPicker(){
    el.dishPickerShade.classList.remove("is-open");
    el.dishPickerModal.classList.remove("is-open");
    dishPickerCtx = null;
    unregisterOverlay("dishPicker");
  }
  if(el.dishPickerCloseBtn) el.dishPickerCloseBtn.addEventListener("click", closeDishPicker);
  if(el.dishPickerShade) el.dishPickerShade.addEventListener("click", closeDishPicker);
  if(el.dishPickerDoneBtn) el.dishPickerDoneBtn.addEventListener("click", closeDishPicker);
  if(el.dishPickerSearchInput) el.dishPickerSearchInput.addEventListener("input", ()=>{
    renderDishPickerList(el.dishPickerSearchInput.value);
  });
  function renderDishPickerList(term){
    if(!dishPickerCtx) return;
    const q = (term || "").trim().toLowerCase();
    const menu = getMenu().filter(item => !q || item.name.toLowerCase().includes(q));
    if(!menu.length){
      el.dishPickerList.innerHTML = `<div class="empty-state empty-state--compact"><span>🔍</span>No dishes match "${escapeHtml(term)}"</div>`;
      return;
    }
    el.dishPickerList.innerHTML = menu.map(item=>{
      const checked = (dishPickerCtx.itemsMap[item.id] || 0) > 0;
      return `
      <label class="dish-picker__row ${checked ? "is-checked" : ""}" data-id="${item.id}">
        <div class="dish-picker__media">${mediaHTML(item)}</div>
        <div class="dish-picker__info">
          <div class="dish-picker__name">${item.name}${item.note ? ` <span class="dish-picker__note">(${item.note})</span>` : ""}</div>
          <div class="dish-picker__price">₹${item.price}</div>
        </div>
        <input type="checkbox" class="dish-picker__check" ${checked ? "checked" : ""}>
      </label>`;
    }).join("");
    $$(".dish-picker__row", el.dishPickerList).forEach(row=>{
      $(".dish-picker__check", row).addEventListener("change", ()=>{
        const id = row.dataset.id;
        const has = (dishPickerCtx.itemsMap[id] || 0) > 0;
        dishPickerCtx.itemsMap[id] = has ? 0 : 1;
        row.classList.toggle("is-checked", !has);
        dishPickerCtx.onChange();
      });
    });
  }

  /* =========================================================
     ADMIN — NEW ORDER (create an order on a customer's behalf:
     phone orders, walk-ins, or fixing a botched checkout)
     ========================================================= */
  let adminNewOrderState = null; // { itemsMap }
  function openAdminNewOrderModal(){
    adminNewOrderState = { itemsMap: {} };
    el.adminNewOrderName.value = "";
    el.adminNewOrderPhone.value = "";
    el.adminNewOrderAddress.value = "";
    el.adminNewOrderForceConfirm.checked = false;
    el.adminNewOrderError.hidden = true;
    renderAdminNewOrderItems();
    el.adminNewOrderShade.classList.add("is-open");
    el.adminNewOrderModal.classList.add("is-open");
    registerOverlay("adminNewOrder", closeAdminNewOrderModal);
  }
  function closeAdminNewOrderModal(){
    el.adminNewOrderShade.classList.remove("is-open");
    el.adminNewOrderModal.classList.remove("is-open");
    adminNewOrderState = null;
    unregisterOverlay("adminNewOrder");
  }
  if(el.adminNewOrderBtn) el.adminNewOrderBtn.addEventListener("click", openAdminNewOrderModal);
  if(el.adminNewOrderCloseBtn) el.adminNewOrderCloseBtn.addEventListener("click", closeAdminNewOrderModal);
  if(el.adminNewOrderShade) el.adminNewOrderShade.addEventListener("click", closeAdminNewOrderModal);

  function adminNewOrderTotalAmount(){
    if(!adminNewOrderState) return 0;
    return Object.entries(adminNewOrderState.itemsMap).reduce((sum, [id, qty])=>{
      const item = findItem(id);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  }
  function renderAdminNewOrderItems(){
    if(!adminNewOrderState) return;
    const entries = Object.entries(adminNewOrderState.itemsMap).filter(([,qty]) => qty > 0);
    if(entries.length === 0){
      el.adminNewOrderItems.innerHTML = `<div class="empty-state empty-state--compact"><span>🍽️</span>No dishes added yet</div>`;
    } else {
      el.adminNewOrderItems.innerHTML = entries.map(([id, qty])=>{
        const item = findItem(id);
        if(!item) return "";
        return `
        <div class="cart-line" data-id="${id}">
          <div class="cart-line__top">
            <div class="cart-line__media">${mediaHTML(item)}</div>
            <div class="cart-line__info">
              <div class="cart-line__name">${item.name}${item.note ? ` <span style="color:var(--text-faint);font-weight:400;">(${item.note})</span>`:""}</div>
              <div class="cart-line__price">₹${item.price} × ${qty} = ₹${item.price*qty}</div>
            </div>
            <button class="cart-line__remove" aria-label="Remove item">✕</button>
          </div>
          <div class="cart-line__bottom">
            <div class="stepper">
              <button class="qty-minus" aria-label="Decrease quantity">−</button>
              <span class="stepper__count">${qty}</span>
              <button class="qty-plus" aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>`;
      }).join("");
      $$(".cart-line", el.adminNewOrderItems).forEach(row=>{
        const id = row.dataset.id;
        $(".qty-minus", row).addEventListener("click", ()=> setAdminNewOrderQty(id, (adminNewOrderState.itemsMap[id]||0)-1));
        $(".qty-plus", row).addEventListener("click", ()=> setAdminNewOrderQty(id, (adminNewOrderState.itemsMap[id]||0)+1));
        $(".cart-line__remove", row).addEventListener("click", ()=> setAdminNewOrderQty(id, 0));
      });
    }
    el.adminNewOrderTotal.textContent = "₹" + adminNewOrderTotalAmount();
  }
  function setAdminNewOrderQty(id, qty){
    if(!adminNewOrderState) return;
    adminNewOrderState.itemsMap[id] = Math.max(0, Math.min(20, qty));
    renderAdminNewOrderItems();
  }
  if(el.adminNewOrderAddBtn) el.adminNewOrderAddBtn.addEventListener("click", ()=>{
    if(!adminNewOrderState) return;
    openDishPicker(adminNewOrderState.itemsMap, renderAdminNewOrderItems);
  });

  if(el.adminNewOrderSaveBtn) el.adminNewOrderSaveBtn.addEventListener("click", async ()=>{
    if(!adminNewOrderState) return;
    el.adminNewOrderError.hidden = true;
    const name = el.adminNewOrderName.value.trim();
    const phone = el.adminNewOrderPhone.value.trim();
    const entries = Object.entries(adminNewOrderState.itemsMap).filter(([,qty]) => qty > 0);
    if(!name){
      el.adminNewOrderError.textContent = "Enter the customer's name.";
      el.adminNewOrderError.hidden = false;
      return;
    }
    if(!isValidMobile(phone)){
      el.adminNewOrderError.textContent = "Enter a valid 10-digit mobile number.";
      el.adminNewOrderError.hidden = false;
      return;
    }
    if(entries.length === 0){
      el.adminNewOrderError.textContent = "Add at least one dish.";
      el.adminNewOrderError.hidden = false;
      return;
    }
    const items = entries.map(([id, qty])=>{
      const item = findItem(id);
      return { id, name: item.name, note: item.note, price: item.price, qty };
    });
    setBtnLoading(el.adminNewOrderSaveBtn, true, "Creating…");
    try{
      await ShadabAPI.adminCreateOrder({
        customerName: name,
        customerPhone: phone,
        address: el.adminNewOrderAddress.value.trim(),
        items,
        forceConfirmed: el.adminNewOrderForceConfirm.checked,
      });
      showToast("Order created");
      closeAdminNewOrderModal();
      await loadAdminOrders();
      renderAllOrders();
    }catch(err){
      el.adminNewOrderError.textContent = err.message || "Couldn't create the order — try again.";
      el.adminNewOrderError.hidden = false;
    }finally{
      setBtnLoading(el.adminNewOrderSaveBtn, false);
    }
  });

  /* =========================================================
     ADMIN
     ========================================================= */
  let adminOrdersCache = [];
  let adminOrdersById = new Map();
  let adminOrdersHash = null;
  let dashboardCanRestore = false;
  // The admin dashboard's OWN view of pool progress — computed server-side
  // from only what's currently visible on the dashboard (i.e. respecting
  // Clear Orders), separate from the real day-wide `livePool` used for
  // actually confirming orders and for customers' own progress bars. See
  // the GET /orders adminPool comment in orders.js for why these two
  // numbers are allowed to differ.
  let adminPoolView = null;
  async function loadAdminOrders(silent, fromPush){
    try{
      const data = await ShadabAPI.allOrders();
      const fresh = (data.orders || []).map(mapServerOrder);
      dashboardCanRestore = !!data.canRestore;
      adminPoolView = data.adminPool || null;
      renderRestoreOrdersButton();
      const hash = JSON.stringify(fresh.map(o=>[o.id,o.status]));
      const prevAdminOrdersById = adminOrdersById;
      adminOrdersById = new Map(fresh.map(o => [o.id, o]));
      if(silent && hash === adminOrdersHash) return false;
      // Same reasoning as onCustomerOrdersUpdated above, admin side: a
      // poll finding a brand-new order plays the attention-grabbing
      // alert + spotlight banner even with no push subscription active
      // on this device. adminOrdersHash!==null skips the first load.
      if(adminOrdersHash !== null && window.ShadabNotifySound){
        window.ShadabNotifySound.onAdminOrdersUpdated(prevAdminOrdersById, fresh, { fromPush: !!fromPush });
      }
      adminOrdersHash = hash;
      adminOrdersCache = fresh;
      return true;
    }catch(err){
      if(silent) return false;
      adminOrdersCache = [];
      showToast(err.message || "Couldn't load orders");
      return true;
    }
  }
  // Shows/hides the "Restore Cleared" tab button depending on whether
  // there's anything to restore — no point offering an undo when the
  // dashboard hasn't been cleared (manually or automatically) recently.
  function renderRestoreOrdersButton(){
    if(el.restoreOrdersBtn) el.restoreOrdersBtn.hidden = !dashboardCanRestore;
  }
  async function renderPoolBanner(){
    if(!el.poolBanner) return;
    try{
      const data = await ShadabAPI.poolStatus();
      livePool = { total: data.total, minAmount: data.minAmount, met: data.met, deliveryArrivedAt: data.deliveryArrivedAt || null, poolFailedAt: data.poolFailedAt || null };
      // Prefer the admin-scoped figure (respects Clear Orders) for what's
      // actually painted in the banner; fall back to the real total if
      // it's not available yet (e.g. the very first paint before
      // loadAdminOrders has resolved).
      const view = adminPoolView || { total: data.total, minAmount: data.minAmount, met: data.met, poolFailedAt: data.poolFailedAt || null };
      el.poolBanner.hidden = false;
      el.poolBanner.classList.toggle("is-met", view.met);
      el.poolBanner.classList.toggle("is-failed", !view.met && !!view.poolFailedAt);
      if(!view.met && view.poolFailedAt){
        el.poolBannerAmount.textContent = `₹${view.total} of ₹${view.minAmount}`;
        el.poolBannerStatus.textContent = "😞 minimum pool not reached — today's kitchen batch didn't go ahead";
      } else {
        el.poolBannerAmount.textContent = `₹${view.total} of ₹${view.minAmount}`;
        el.poolBannerStatus.textContent = view.met
          ? "reached today — every order confirms instantly now"
          : `reached today — ₹${Math.max(0, view.minAmount - view.total)} more unlocks everyone's pending orders`;
      }
      const pct = view.minAmount > 0 ? Math.min(100, Math.round((view.total / view.minAmount) * 100)) : 100;
      el.poolBannerFill.style.width = pct + "%";
    }catch(err){
      el.poolBanner.hidden = true;
    }
    renderDeliverArrivedButton();
  }
  // Reflects whether today's delivery has already been broadcast as
  // arrived — flips the compact header button between "Delivery arrived"
  // (the broadcast action) and "Undo delivery" (reverses it), so the admin
  // never has to guess which state they're in or lose the ability to
  // correct an accidental tap.
  function renderDeliverArrivedButton(){
    if(!el.adminDeliverArrivedBtn) return;
    const arrived = !!livePool.deliveryArrivedAt;
    // This is a manual notification the admin sends on their own judgment
    // — not something that should be gated on order status — so it's
    // always tappable (aside from the brief in-flight "is-loading" state
    // set around the actual API call). Before it's sent: a bell + "Notify
    // order arrived". Once sent: an undo icon + "Undo delivery arrived",
    // so the admin always knows which action is one tap away.
    el.adminDeliverArrivedBtn.classList.toggle("is-arrived", arrived);
    el.adminDeliverArrivedBtn.querySelector(".admin-deliver-btn__ico").textContent = arrived ? "↩" : "🔔";
    if(el.adminDeliverArrivedLabel) el.adminDeliverArrivedLabel.textContent = arrived ? "Undo delivery arrived" : "Notify order arrived";
  }
  // Keeps livePool fresh for the customer-facing "Pending" progress fill
  // even when the admin pool banner isn't on screen (e.g. a customer
  // sitting on My Orders with a still-pending order).
  async function refreshLivePool(){
    try{
      const data = await ShadabAPI.poolStatus();
      livePool = { total: data.total, minAmount: data.minAmount, met: data.met, deliveryArrivedAt: data.deliveryArrivedAt || null, poolFailedAt: data.poolFailedAt || null };
    }catch(err){ /* keep the last-known value */ }
  }
  async function renderAdminsList(){
    if(!el.adminsList) return;
    el.adminsList.innerHTML = `<div class="empty-state"><span>⏳</span>Loading admins…</div>`;
    try{
      const data = await ShadabAPI.listAdmins();
      const admins = data.admins || [];
      if(admins.length === 0){
        el.adminsList.innerHTML = `<div class="empty-state"><span>🛡️</span>No admin logins recorded yet</div>`;
        return;
      }
      el.adminsList.innerHTML = admins.map(a=>{
        const isSelf = a.mobile === data.currentMobile;
        const lastSeen = a.lastAccess ? new Date(a.lastAccess).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
        return `
        <div class="admin-row ${a.blocked ? "admin-row--blocked" : ""}">
          <div class="admin-row__info">
            <strong>${escapeHtml(a.name) || "Unnamed"}${isSelf ? " (you)" : ""}</strong>
            <small>+91 ${escapeHtml(a.mobile)} · ${escapeHtml(a.email) || "no email on file"}</small>
            <small>Last active: ${lastSeen} · ${a.accessCount || 1} unlock${(a.accessCount||1) === 1 ? "" : "s"}</small>
          </div>
          <div class="admin-row__actions">
            ${a.blocked
              ? `<span class="admin-row__badge">Blocked</span>${!isSelf ? `<button type="button" class="btn btn--ghost btn--sm" data-unblock="${a.mobile}">Unblock</button>` : ""}`
              : (!isSelf ? `<button type="button" class="btn btn--danger btn--sm" data-block="${a.mobile}">Block</button>` : `<span class="admin-row__badge admin-row__badge--active">Active</span>`)}
          </div>
        </div>`;
      }).join("");

      $$("[data-block]", el.adminsList).forEach(btn=>{
        btn.addEventListener("click", async ()=>{
          btn.disabled = true;
          try{
            await ShadabAPI.blockAdmin(btn.dataset.block);
            showToast("Admin blocked");
            renderAdminsList();
          }catch(err){
            showToast(err.message || "Couldn't block that admin");
            btn.disabled = false;
          }
        });
      });
      $$("[data-unblock]", el.adminsList).forEach(btn=>{
        btn.addEventListener("click", async ()=>{
          btn.disabled = true;
          try{
            await ShadabAPI.unblockAdmin(btn.dataset.unblock);
            showToast("Admin unblocked");
            renderAdminsList();
          }catch(err){
            showToast(err.message || "Couldn't unblock that admin");
            btn.disabled = false;
          }
        });
      });
    }catch(err){
      el.adminsList.innerHTML = `<div class="empty-state"><span>⚠️</span>${err.message || "Couldn't load admins"}</div>`;
    }
  }

  /* ---------- Customers (registered-user directory) ---------- */
  let customersSearchDebounce = null;
  let customersSort = "recent";
  let customerDetailCache = null; // the customer object currently open in the detail modal
  let pendingCustomerAction = null; // { type: "block"|"unblock"|"remove", id }

  async function renderCustomersStats(){
    if(!el.statCustomersRegistered) return;
    try{
      const data = await ShadabAPI.customerStats();
      el.statCustomersRegistered.textContent = (data.totalRegistered ?? 0).toLocaleString("en-IN");
      el.statCustomersOrdered.textContent = (data.totalOrderedUsers ?? 0).toLocaleString("en-IN");
    }catch(err){ /* stats are supplementary — leave last-known values on screen */ }
  }

  function customerRowHtml(c){
    const joined = c.createdAt ? new Date(c.createdAt).toLocaleDateString([], { dateStyle: "medium" }) : "—";
    return `
    <div class="customer-row ${c.blocked ? "customer-row--blocked" : ""}" data-customer-id="${c.id}">
      <div class="customer-row__info">
        <strong>${escapeHtml(c.username) || "Unnamed"}${c.blocked ? " · Blocked" : ""}</strong>
        <small>+91 ${escapeHtml(c.mobile)} · ${escapeHtml(c.email)}</small>
        <small>Joined ${joined}</small>
      </div>
      <div class="customer-row__stats">
        <div class="customer-row__stat"><strong>${c.activeOrders}</strong><span>Orders</span></div>
        <div class="customer-row__stat"><strong>₹${(c.totalSpent||0).toLocaleString("en-IN")}</strong><span>Spent</span></div>
        <span class="customer-row__chevron">›</span>
      </div>
    </div>`;
  }

  async function renderCustomersList(){
    if(!el.customersList) return;
    el.customersList.innerHTML = `<div class="empty-state"><span>⏳</span>Loading customers…</div>`;
    const q = (el.customersSearchInput?.value || "").trim();
    try{
      const data = await ShadabAPI.listCustomers(q, customersSort);
      const users = data.users || [];
      if(el.customersMatchHint){
        el.customersMatchHint.textContent = q
          ? `${data.matched} of ${data.totalRegistered} registered user${data.totalRegistered === 1 ? "" : "s"} match "${q}"`
          : `${data.totalRegistered} registered user${data.totalRegistered === 1 ? "" : "s"} total`;
      }
      if(users.length === 0){
        el.customersList.innerHTML = `<div class="empty-state"><span>👥</span>No customers match that search</div>`;
        return;
      }
      el.customersList.innerHTML = users.map(customerRowHtml).join("");
      $$("[data-customer-id]", el.customersList).forEach(row=>{
        row.addEventListener("click", ()=> openCustomerDetail(row.dataset.customerId));
      });
    }catch(err){
      el.customersList.innerHTML = `<div class="empty-state"><span>⚠️</span>${err.message || "Couldn't load customers"}</div>`;
    }
  }

  function renderCustomersPanel(){
    renderCustomersStats();
    renderCustomersList();
  }

  if(el.customersSearchInput){
    el.customersSearchInput.addEventListener("input", ()=>{
      if(el.clearCustomersSearchBtn) el.clearCustomersSearchBtn.hidden = !el.customersSearchInput.value;
      clearTimeout(customersSearchDebounce);
      customersSearchDebounce = setTimeout(renderCustomersList, 260);
    });
  }
  if(el.clearCustomersSearchBtn){
    el.clearCustomersSearchBtn.addEventListener("click", ()=>{
      el.customersSearchInput.value = "";
      el.clearCustomersSearchBtn.hidden = true;
      renderCustomersList();
    });
  }
  if(el.customersSortChips){
    $$(".filter-chip", el.customersSortChips).forEach(chip=>{
      chip.addEventListener("click", ()=>{
        customersSort = chip.dataset.sort;
        $$(".filter-chip", el.customersSortChips).forEach(c=>c.classList.toggle("is-active", c === chip));
        renderCustomersList();
      });
    });
  }

  function closeCustomerDetail(){
    if(!el.customerDetailShade) return;
    el.customerDetailShade.classList.remove("is-open");
    el.customerDetailModal.classList.remove("is-open");
    unregisterOverlay("customerDetail");
  }
  async function openCustomerDetail(id){
    if(!el.customerDetailShade) return;
    el.customerDetailName.textContent = "Loading…";
    el.customerDetailContact.textContent = "";
    el.customerDetailStats.innerHTML = "";
    el.customerDetailStatus.textContent = "";
    // Keep the action buttons out of the DOM flow entirely while the
    // fetch is in flight — this is what fixed the glitch where "Block"
    // and "Remove" used to render, full-size, on top of "Loading…"
    // before the customer's details had actually arrived.
    if(el.customerDetailActions) el.customerDetailActions.hidden = true;
    el.customerDetailShade.classList.add("is-open");
    el.customerDetailModal.classList.add("is-open");
    registerOverlay("customerDetail", closeCustomerDetail);
    try{
      const { customer } = await ShadabAPI.getCustomer(id);
      customerDetailCache = customer;
      renderCustomerDetail();
      if(el.customerDetailActions) el.customerDetailActions.hidden = false;
    }catch(err){
      el.customerDetailName.textContent = "Couldn't load customer";
      el.customerDetailContact.textContent = err.message || "";
    }
  }
  function renderCustomerDetail(){
    const c = customerDetailCache;
    if(!c) return;
    el.customerDetailName.textContent = c.username || "Unnamed";
    el.customerDetailContact.textContent = `+91 ${c.mobile} · ${c.email}`;
    el.customerDetailStats.innerHTML = `
      <div class="customer-detail-stat"><strong>${c.ordersPlaced}</strong><span>Orders placed</span></div>
      <div class="customer-detail-stat"><strong>${c.cancelledOrders}</strong><span>Cancelled</span></div>
      <div class="customer-detail-stat"><strong>₹${(c.totalSpent||0).toLocaleString("en-IN")}</strong><span>Total spent</span></div>
      <div class="customer-detail-stat"><strong>${c.createdAt ? new Date(c.createdAt).toLocaleDateString([], { dateStyle: "medium" }) : "—"}</strong><span>Joined</span></div>
    `;
    el.customerDetailStatus.textContent = c.blocked ? "This account is currently blocked and can't log in." : "";
    el.customerBlockToggleBtn.textContent = c.blocked ? "Unblock customer" : "Block customer";
    el.customerBlockToggleBtn.classList.toggle("btn--danger", !c.blocked);
    el.customerBlockToggleBtn.classList.toggle("btn--ghost", c.blocked);
  }
  if(el.customerDetailCloseBtn) el.customerDetailCloseBtn.addEventListener("click", closeCustomerDetail);
  if(el.customerDetailShade) el.customerDetailShade.addEventListener("click", closeCustomerDetail);

  function openCustomerActionConfirm(type){
    if(!customerDetailCache || !el.customerActionShade) return;
    pendingCustomerAction = { type, id: customerDetailCache.id };
    const name = customerDetailCache.username || "this customer";
    if(type === "block"){
      el.customerActionIco.textContent = "🚫";
      el.customerActionTitle.textContent = "Block this customer?";
      el.customerActionBody.textContent = `${name} won't be able to log in or place orders until unblocked. Their order history is kept.`;
      el.confirmCustomerActionBtn.textContent = "Yes, block";
      el.confirmCustomerActionBtn.classList.add("btn--danger");
    } else if(type === "unblock"){
      el.customerActionIco.textContent = "✅";
      el.customerActionTitle.textContent = "Unblock this customer?";
      el.customerActionBody.textContent = `${name} will be able to log in and order again immediately.`;
      el.confirmCustomerActionBtn.textContent = "Yes, unblock";
      el.confirmCustomerActionBtn.classList.remove("btn--danger");
    } else if(type === "cleardata"){
      el.customerActionIco.textContent = "🧹";
      el.customerActionTitle.textContent = "Clear this customer's data?";
      el.customerActionBody.textContent = `${name}'s entire order history will be wiped and any block lifted — the account will look brand new again. They keep the same login. This can't be undone.`;
      el.confirmCustomerActionBtn.textContent = "Yes, clear data";
      el.confirmCustomerActionBtn.classList.add("btn--danger");
    } else {
      el.customerActionIco.textContent = "🗑️";
      el.customerActionTitle.textContent = "Remove this customer?";
      el.customerActionBody.textContent = `${name}'s account will be permanently deleted. This can't be undone — they'd need to sign up again to order. Their past order records are kept for the restaurant.`;
      el.confirmCustomerActionBtn.textContent = "Yes, remove";
      el.confirmCustomerActionBtn.classList.add("btn--danger");
    }
    el.customerActionShade.classList.add("is-open");
    el.customerActionModal.classList.add("is-open");
    registerOverlay("customerAction", closeCustomerActionConfirm);
  }
  function closeCustomerActionConfirm(){
    if(!el.customerActionShade) return;
    el.customerActionShade.classList.remove("is-open");
    el.customerActionModal.classList.remove("is-open");
    unregisterOverlay("customerAction");
  }
  if(el.customerBlockToggleBtn) el.customerBlockToggleBtn.addEventListener("click", ()=>{
    if(!customerDetailCache) return;
    openCustomerActionConfirm(customerDetailCache.blocked ? "unblock" : "block");
  });
  if(el.customerClearDataBtn) el.customerClearDataBtn.addEventListener("click", ()=> openCustomerActionConfirm("cleardata"));
  if(el.customerRemoveBtn) el.customerRemoveBtn.addEventListener("click", ()=> openCustomerActionConfirm("remove"));
  if(el.cancelCustomerActionBtn) el.cancelCustomerActionBtn.addEventListener("click", closeCustomerActionConfirm);
  if(el.customerActionShade) el.customerActionShade.addEventListener("click", closeCustomerActionConfirm);
  if(el.confirmCustomerActionBtn) el.confirmCustomerActionBtn.addEventListener("click", async ()=>{
    if(!pendingCustomerAction) return;
    const { type, id } = pendingCustomerAction;
    el.confirmCustomerActionBtn.disabled = true;
    try{
      if(type === "block"){
        await ShadabAPI.blockCustomer(id);
        showToast("Customer blocked");
        closeCustomerActionConfirm();
        await openCustomerDetail(id);
      } else if(type === "unblock"){
        await ShadabAPI.unblockCustomer(id);
        showToast("Customer unblocked");
        closeCustomerActionConfirm();
        await openCustomerDetail(id);
      } else if(type === "cleardata"){
        await ShadabAPI.clearCustomerData(id);
        showToast("Customer data cleared");
        closeCustomerActionConfirm();
        await openCustomerDetail(id);
      } else {
        await ShadabAPI.removeCustomer(id);
        showToast("Customer removed");
        closeCustomerActionConfirm();
        closeCustomerDetail();
      }
      renderCustomersPanel();
    }catch(err){
      showToast(err.message || "Couldn't complete that action");
    }finally{
      el.confirmCustomerActionBtn.disabled = false;
    }
  });

  /* -- admin password storage --
     Two admin passwords now exist (see backend utils/auth.js):
       - CENTRAL: once verified, the password is kept in localStorage
         ("shadab_admin_master_pw") — it survives closing the browser,
         restarting the device, everything. That device never has to
         enter an admin password again, for as long as the central
         password stays what it is.
       - LOCAL (normal): kept in sessionStorage exactly like before, PLUS
         an explicit inactivity timeout ("shadab_admin_local_expiry") —
         once that timestamp passes, the local session is treated as
         expired even if the tab is still open, and the admin is sent
         back to the password gate.
     getAdminPassword() below is the single source of truth both api.js
     (for the X-Admin-Password header) and this file read from. */
  const ADMIN_LOCAL_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  function getAdminMasterPw(){ try{ return localStorage.getItem("shadab_admin_master_pw"); }catch(e){ return null; } }
  function setAdminMasterPw(v){ try{ if(v) localStorage.setItem("shadab_admin_master_pw", v); else localStorage.removeItem("shadab_admin_master_pw"); }catch(e){} }
  function getAdminLocalPw(){ return sessionStorage.getItem("shadab_admin_session_pw"); }
  function setAdminLocalSession(pw){
    sessionStorage.setItem("shadab_admin_session_pw", pw);
    sessionStorage.setItem("shadab_admin_local_expiry", String(Date.now() + ADMIN_LOCAL_SESSION_TIMEOUT_MS));
  }
  function clearAdminLocalSession(){
    sessionStorage.removeItem("shadab_admin_session_pw");
    sessionStorage.removeItem("shadab_admin_local_expiry");
  }
  function isAdminLocalSessionExpired(){
    const expiry = Number(sessionStorage.getItem("shadab_admin_local_expiry") || 0);
    return !expiry || Date.now() > expiry;
  }
  function clearAllAdminAuth(){
    setAdminMasterPw(null);
    clearAdminLocalSession();
  }

  async function renderAdmin(){
    const masterPw = getAdminMasterPw();
    if(masterPw){
      // Central password — always considered unlocked on this device,
      // no session/timeout logic applies at all.
      store.adminUnlocked = true;
    } else if(store.adminUnlocked){
      // Local (normal) password — must still have a live, non-expired
      // session; otherwise force a fresh login, exactly like a
      // session-timeout would in any normal admin panel.
      if(!getAdminLocalPw() || isAdminLocalSessionExpired()){
        store.adminUnlocked = false;
        clearAdminLocalSession();
      }
    }
    if(store.adminUnlocked){
      el.adminGate.hidden = true;
      el.adminDash.hidden = false;
      // Whatever tab an admin last left the dashboard on (Menu, Settings,
      // etc.), opening/unlocking the dashboard fresh always lands back on
      // "All Orders" — the panel with the most time-sensitive info — so
      // the admin never has to hunt for it.
      showAdminPanel("allorders");
      await loadAdminOrders();
      await loadSettings();
      renderAllOrders();
      renderPoolBanner();
      renderVerifyPanel();
      renderSettingsPanel();
      renderMenuManage();
    } else {
      el.adminGate.hidden = false;
      el.adminDash.hidden = true;
      el.adminPassword.value = "";
      el.adminGateError.hidden = true;
    }
  }
  el.adminGateForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const submitBtn = el.adminGateForm.querySelector("button[type=submit]") || el.adminGateForm.querySelector("button");
    const pw = el.adminPassword.value;
    // Try it as a LOCAL session first (sessionStorage) purely so the
    // X-Admin-Password header has something to send while we ask the
    // server which kind of password this actually is — nothing is
    // trusted as "unlocked" until /admins/verify succeeds below.
    sessionStorage.setItem("shadab_admin_session_pw", pw);
    setBtnLoading(submitBtn, true, "Checking…");
    try{
      const res = await ShadabAPI.verifyAdminPassword(); // throws if the password is wrong
      if(res.type === "central"){
        // Central password: persist it forever on this device, and
        // don't keep a redundant session-only copy around.
        setAdminMasterPw(pw);
        clearAdminLocalSession();
      } else {
        setAdminLocalSession(pw);
      }
      store.adminUnlocked = true;
      el.adminGateError.hidden = true;
      renderAdmin();
      showToast(res.type === "central" ? "Admin unlocked — this device won't ask again" : "Admin unlocked");
      if(window.ShadabPush) setTimeout(()=> window.ShadabPush.promptAdmin(), 900);
    }catch(err){
      clearAdminLocalSession();
      el.adminGateError.hidden = false;
      el.adminGateError.textContent = err.message || "Incorrect admin password.";
    }finally{
      setBtnLoading(submitBtn, false);
    }
  });
  el.adminLogoutBtn.addEventListener("click", ()=>{
    store.adminUnlocked = false;
    clearAllAdminAuth();
    renderAdmin();
    showToast("Admin locked");
  });

  /* -- tabs -- */
  // Scoped to [data-tab] only: the Clear Orders button shares the same
  // grid/styling for a clean 6-button layout, but it isn't a panel switch —
  // it opens the clear-all-orders confirmation (wired separately below).
  // Binding the generic handler to it too would call showAdminPanel(undefined)
  // and blank out the dashboard.
  $$(".admin-tab[data-tab]").forEach(tab=>{
    tab.addEventListener("click", ()=>{
      showAdminPanel(tab.dataset.tab);
      if(tab.dataset.tab === "admins") renderAdminsList();
      if(tab.dataset.tab === "customers") renderCustomersPanel();
    });
  });

  /* -- all orders -- */
  function orderMatchesSearch(o, term){
    if(!term) return true;
    const t = term.toLowerCase();
    return o.customerName.toLowerCase().includes(t) || o.phone.includes(t) || o.id.toLowerCase().includes(t);
  }
  // Only three tabs now: Confirmed (anything active — held or already
  // confirmed — but not delivered/cancelled), Delivered, and Cancelled.
  // "All" was removed on purpose: mixing cancelled orders in with active
  // ones made it too easy to accidentally count/copy a cancelled order.
  let activeOrderStatusFilter = "confirmed";
  const orderTabLabels = { confirmed: "Confirmed", delivered: "Delivered", cancelled: "Cancelled" };
  if(el.orderStatusChips){
    $$(".filter-chip", el.orderStatusChips).forEach(chip=>{
      chip.addEventListener("click", ()=>{
        activeOrderStatusFilter = chip.dataset.status;
        $$(".filter-chip", el.orderStatusChips).forEach(c=>c.classList.toggle("is-active", c === chip));
        renderAllOrders();
      });
    });
  }
  // Kept in sync by renderAllOrders() — copy buttons read from this so
  // they only ever copy what's currently on screen (Confirmed, Delivered,
  // or Cancelled), never a mix of tabs.
  let currentFilteredOrders = [];
  /* One shared progress tracker for the whole tab, shown once at the top
     of the admin panel instead of repeated on every order card — every
     order sitting in the same tab is moving through the same stage
     together, so a single tracker (taken from the first non-cancelled
     order in the current filter) says everything the per-card ones did.
     Hidden entirely on the Cancelled tab, and whenever there's nothing
     to show progress for. */
  function renderAdminOrderProgress(filtered){
    if(!el.adminOrderProgressWrap) return;
    const reference = filtered.find(o => !o.cancelled);
    if(!reference){ el.adminOrderProgressWrap.innerHTML = ""; return; }
    el.adminOrderProgressWrap.innerHTML = `
    <div class="admin-order-progress-card">
      <span class="admin-order-progress-card__title">Order progress</span>
      ${orderProgressHTML(reference)}
    </div>`;
  }
  function renderAllOrders(){
    const orders = adminOrdersCache;
    const activeOrders = orders.filter(o => !o.delivered && !o.cancelled);
    el.statOrderCount.textContent = activeOrders.length;
    // Cancelled orders never happened, financially — don't count their
    // value toward the day's total.
    el.statTotalAmount.textContent = "₹" + orders.filter(o=>!o.cancelled).reduce((s,o)=>s+o.total,0);
    if(el.statCancelledCount) el.statCancelledCount.textContent = orders.filter(o=>o.cancelled).length;

    const term = el.ordersSearchInput.value.trim();
    let filtered = orders.filter(o => orderMatchesSearch(o, term));
    if(activeOrderStatusFilter === "confirmed"){
      filtered = filtered.filter(o => !o.delivered && !o.cancelled);
    } else if(activeOrderStatusFilter === "delivered"){
      filtered = filtered.filter(o => o.delivered);
    } else if(activeOrderStatusFilter === "cancelled"){
      filtered = filtered.filter(o => o.cancelled);
    }
    currentFilteredOrders = filtered;
    renderAdminOrderProgress(filtered);

    const tabLabel = orderTabLabels[activeOrderStatusFilter] || "";
    if(el.copyOrdersBtnLabel) el.copyOrdersBtnLabel.textContent = "Copy list";
    if(el.copyOrderIdsBtnLabel) el.copyOrderIdsBtnLabel.textContent = "Copy IDs";

    if(orders.length === 0){
      el.allOrdersList.innerHTML = `<div class="empty-state"><span>🧾</span>No orders placed yet</div>`;
      return;
    }
    if(filtered.length === 0){
      el.allOrdersList.innerHTML = term
        ? `<div class="empty-state"><span>🔍</span>No orders match "${term}"</div>`
        : `<div class="empty-state"><span>📭</span>No ${tabLabel.toLowerCase()} orders</div>`;
      return;
    }
    el.allOrdersList.innerHTML = filtered.map(o=>{
      const itemsHTML = o.items.map(i=>`${i.name}${i.note?` (${i.note})`:""} × ${i.qty} — ₹${i.price*i.qty}`).join("<br>");
      return `
      <div class="order-card ${o.cancelled ? "order-card--cancelled" : ""}">
        <div class="order-card__top">
          <div class="order-card__who">
            <div class="order-card__customer">${escapeHtml(o.customerName)}</div>
            <div class="order-card__phone">${escapeHtml(o.phone)}${o.address ? " · "+escapeHtml(o.address) : ""}</div>
          </div>
          ${statusBadgeHTML(o)}
        </div>
        <div class="order-card__items">${itemsHTML}</div>
        <div class="order-card__foot">
          <span class="order-card__meta">#${o.id} · ${o.dateISO} · ${o.timeLabel}</span>
          <span class="order-card__total">₹${o.total}</span>
        </div>
        ${!o.cancelled ? `<button type="button" class="btn btn--ghost btn--block admin-order-edit-btn" data-admin-edit-id="${o.id}">✎ Edit order</button>` : ""}
      </div>`;
    }).join("");
    $$(".admin-order-edit-btn", el.allOrdersList).forEach(btn=>{
      btn.addEventListener("click", ()=> openEditOrderModal(btn.dataset.adminEditId, { mode: "admin" }));
    });
  }
  // The search field for All Orders is always visible now (no icon to
  // tap first) — its own ✕ just clears whatever's typed and refocuses,
  // shown only once there's something to clear.
  el.ordersSearchInput.addEventListener("input", ()=>{
    if(el.clearOrdersSearchBtn) el.clearOrdersSearchBtn.hidden = !el.ordersSearchInput.value;
    renderAllOrders();
  });
  function clearOrdersSearch(){
    if(!el.ordersSearchInput.value) return;
    el.ordersSearchInput.value = "";
    if(el.clearOrdersSearchBtn) el.clearOrdersSearchBtn.hidden = true;
    el.ordersSearchInput.focus();
    renderAllOrders();
  }
  if(el.clearOrdersSearchBtn) el.clearOrdersSearchBtn.addEventListener("click", clearOrdersSearch);

  /* -- simple, clean copy format: consolidated item + quantity list --
     Copies only whichever tab is active (Confirmed / Delivered /
     Cancelled) so an admin can never accidentally paste cancelled orders
     into a kitchen list, or vice versa.
     Format is plain "Item name-Qty" per line (e.g. "Fry piece-2") in the
     normal chat font — no space-padded columns and no ``` code-block
     wrapper, since that wrapper is what forced the old monospace look. */
  function buildCopyText(){
    const orders = currentFilteredOrders;
    if(orders.length === 0) return null;
    const totals = {};
    orders.forEach(o=>{ o.items.forEach(i=>{ totals[i.id] = (totals[i.id]||0) + i.qty; }); });
    const menu = getMenu();
    const lines = menu
      .filter(m => totals[m.id])
      .map(m => `${m.name}${m.note ? ` (${m.note})` : ""}-${totals[m.id]}`);
    if(lines.length === 0) return null;

    const grandTotal = orders.reduce((s,o)=>s+o.total,0);
    return lines.join("\n") + `\n\nOrders: ${orders.length}    Grand Total: ₹${grandTotal}`;
  }
  el.copyOrdersBtn.addEventListener("click", ()=>{
    const text = buildCopyText();
    const tabLabel = orderTabLabels[activeOrderStatusFilter] || "";
    if(!text){ showToast(`No ${tabLabel.toLowerCase()} orders to copy`); return; }
    navigator.clipboard.writeText(text).then(()=>{
      showToast(`${tabLabel} order list copied to clipboard`);
    }).catch(()=>{
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try{ document.execCommand("copy"); showToast(`${tabLabel} order list copied to clipboard`); }
      catch(e){ showToast("Could not copy — try manually selecting"); }
      document.body.removeChild(ta);
    });
  });

  el.copyOrderIdsBtn.addEventListener("click", ()=>{
    const orders = currentFilteredOrders;
    const tabLabel = orderTabLabels[activeOrderStatusFilter] || "";
    if(orders.length === 0){ showToast(`No ${tabLabel.toLowerCase()} orders to copy`); return; }
    const text = orders.map(o => o.id).join("\n");
    navigator.clipboard.writeText(text).then(()=>{
      showToast(`Copied ${orders.length} ${tabLabel.toLowerCase()} order ID${orders.length > 1 ? "s" : ""}`);
    }).catch(()=>{
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try{ document.execCommand("copy"); showToast(`${tabLabel} order IDs copied to clipboard`); }
      catch(e){ showToast("Could not copy — try manually selecting"); }
      document.body.removeChild(ta);
    });
  });

  /* -- clear the admin dashboard: requires an explicit "Yes, clear" tap.
     This no longer deletes anything — it just hides today's (and every
     earlier) order from the ADMIN's view via a clearedAt cutoff on the
     backend. Customers still see their full order history untouched, and
     the admin can bring everything back with Restore Cleared. -- */
  function openClearOrdersConfirm(){
    if(adminOrdersCache.length === 0){ showToast("No orders to clear"); return; }
    el.clearOrdersShade.classList.add("is-open");
    el.clearOrdersModal.classList.add("is-open");
    registerOverlay("clearOrders", closeClearOrdersConfirm);
  }
  function closeClearOrdersConfirm(){
    el.clearOrdersShade.classList.remove("is-open");
    el.clearOrdersModal.classList.remove("is-open");
    unregisterOverlay("clearOrders");
  }
  el.clearOrdersBtn.addEventListener("click", openClearOrdersConfirm);
  el.cancelClearOrdersBtn.addEventListener("click", closeClearOrdersConfirm);
  el.confirmClearOrdersBtn.addEventListener("click", async ()=>{
    el.confirmClearOrdersBtn.disabled = true;
    try{
      await ShadabAPI.clearAllOrders();
      closeClearOrdersConfirm();
      await loadAdminOrders();
      renderAllOrders();
      renderVerifyPanel();
      renderPoolBanner();
      showToast("Dashboard cleared — restore anytime from Restore Cleared");
    }catch(err){
      showToast(err.message || "Couldn't clear orders");
    }finally{
      el.confirmClearOrdersBtn.disabled = false;
    }
  });

  /* -- admin's one-tap "delivery arrived" broadcast for the whole day, and
     its undo. Same explicit-confirm pattern as Clear Orders above — this
     touches every customer's order at once, so it shouldn't be one
     accidental tap away in either direction. The button and modal are
     shared between the two actions; which one fires depends on whether
     today's delivery has already been broadcast (see
     renderDeliverArrivedButton, which keeps livePool.deliveryArrivedAt in
     sync with the button's label/icon). -- */
  function openDeliverArrivedConfirm(){
    if(!el.deliverArrivedShade) return;
    const arrived = !!livePool.deliveryArrivedAt;
    if(el.deliverArrivedModalIco) el.deliverArrivedModalIco.textContent = arrived ? "↩" : "🔔";
    if(el.deliverArrivedModalTitle) el.deliverArrivedModalTitle.textContent = arrived
      ? "Undo the delivery-arrived notification?"
      : "Notify customers their order has arrived?";
    if(el.deliverArrivedModalBody) el.deliverArrivedModalBody.textContent = arrived
      ? "Orders this notification marked Delivered move back to their previous status, and the \"arrived\" notice is cleared for every customer. Orders changed separately since then are left as they are."
      : "Every customer with an order today will see a \"🛵 Delivery has arrived\" notice, and every confirmed or preparing order today moves straight to Delivered. Use this once the batch has actually reached everyone — you can undo it afterward if you tap it by mistake.";
    if(el.confirmDeliverArrivedBtn) el.confirmDeliverArrivedBtn.textContent = arrived ? "Yes, undo it" : "Yes, notify everyone";
    el.deliverArrivedShade.classList.add("is-open");
    el.deliverArrivedModal.classList.add("is-open");
    registerOverlay("deliverArrived", closeDeliverArrivedConfirm);
  }
  function closeDeliverArrivedConfirm(){
    if(!el.deliverArrivedShade) return;
    el.deliverArrivedShade.classList.remove("is-open");
    el.deliverArrivedModal.classList.remove("is-open");
    unregisterOverlay("deliverArrived");
  }
  if(el.adminDeliverArrivedBtn) el.adminDeliverArrivedBtn.addEventListener("click", openDeliverArrivedConfirm);
  if(el.cancelDeliverArrivedBtn) el.cancelDeliverArrivedBtn.addEventListener("click", closeDeliverArrivedConfirm);
  if(el.confirmDeliverArrivedBtn) el.confirmDeliverArrivedBtn.addEventListener("click", async ()=>{
    const arrived = !!livePool.deliveryArrivedAt;
    el.confirmDeliverArrivedBtn.disabled = true;
    try{
      if(arrived){
        const res = await ShadabAPI.undoDeliverToday();
        closeDeliverArrivedConfirm();
        await loadAdminOrders();
        renderAllOrders();
        renderVerifyPanel();
        renderPoolBanner();
        showToast(`Undone — ${res.revertedCount || 0} order(s) restored`);
      } else {
        const res = await ShadabAPI.deliverToday();
        closeDeliverArrivedConfirm();
        await loadAdminOrders();
        renderAllOrders();
        renderVerifyPanel();
        renderPoolBanner();
        showToast(`Delivery marked arrived — ${res.deliveredCount || 0} order(s) moved to Delivered`);
      }
    }catch(err){
      showToast(err.message || (arrived ? "Couldn't undo delivery" : "Couldn't mark delivery as arrived"));
    }finally{
      el.confirmDeliverArrivedBtn.disabled = false;
    }
  });
  el.clearOrdersShade.addEventListener("click", closeClearOrdersConfirm);

  /* -- restore the dashboard's last clear (manual or automatic). Same
     explicit-confirm pattern as Clear Orders — nothing was ever deleted,
     so this is safe, but it's still a dashboard-wide change worth a
     deliberate tap rather than a stray one. -- */
  function openRestoreOrdersConfirm(){
    if(!el.restoreOrdersShade || !dashboardCanRestore) return;
    el.restoreOrdersShade.classList.add("is-open");
    el.restoreOrdersModal.classList.add("is-open");
    registerOverlay("restoreOrders", closeRestoreOrdersConfirm);
  }
  function closeRestoreOrdersConfirm(){
    if(!el.restoreOrdersShade) return;
    el.restoreOrdersShade.classList.remove("is-open");
    el.restoreOrdersModal.classList.remove("is-open");
    unregisterOverlay("restoreOrders");
  }
  if(el.restoreOrdersBtn) el.restoreOrdersBtn.addEventListener("click", openRestoreOrdersConfirm);
  if(el.cancelRestoreOrdersBtn) el.cancelRestoreOrdersBtn.addEventListener("click", closeRestoreOrdersConfirm);
  if(el.restoreOrdersShade) el.restoreOrdersShade.addEventListener("click", closeRestoreOrdersConfirm);
  if(el.confirmRestoreOrdersBtn) el.confirmRestoreOrdersBtn.addEventListener("click", async ()=>{
    el.confirmRestoreOrdersBtn.disabled = true;
    try{
      await ShadabAPI.restoreClearedOrders();
      closeRestoreOrdersConfirm();
      await loadAdminOrders();
      renderAllOrders();
      renderVerifyPanel();
      renderPoolBanner();
      showToast("Cleared orders restored");
    }catch(err){
      showToast(err.message || "Couldn't restore orders");
    }finally{
      el.confirmRestoreOrdersBtn.disabled = false;
    }
  });
  if(el.deliverArrivedShade) el.deliverArrivedShade.addEventListener("click", closeDeliverArrivedConfirm);

  /* -- verify orders (per day) -- */
  function todayISO(){ return new Date().toISOString().slice(0,10); }
  if(!el.verifyDateInput.value) el.verifyDateInput.value = todayISO();

  function renderVerifyPanel(){
    const date = el.verifyDateInput.value || todayISO();
    const term = el.verifySearchInput.value.trim();
    // Cancelled orders never belong here — there's nothing to verify or
    // deliver. Still-"held" orders (today's minimum hasn't been reached
    // yet) are also excluded, since they can't be marked delivered until
    // they're confirmed anyway.
    const dayOrders = adminOrdersCache.filter(o=>
      o.dateISO === date && o.status !== "held" && !o.cancelled && orderMatchesSearch(o, term)
    );
    if(dayOrders.length === 0){
      el.verifyOrdersList.innerHTML = term
        ? `<div class="empty-state"><span>🔍</span>No orders match "${term}" on this date</div>`
        : `<div class="empty-state"><span>📋</span>No confirmed orders for this date<br><small>Cancelled and still-pending orders won't show up here.</small></div>`;
      return;
    }
    el.verifyOrdersList.innerHTML = dayOrders.map(o=>{
      const itemsSummary = o.items.map(i=>`${i.name} ×${i.qty}`).join(", ");
      return `
      <div class="verify-item ${o.delivered ? "is-delivered":""}" data-id="${o.id}">
        <div class="verify-item__info">
          <div class="verify-item__name">${escapeHtml(o.customerName)} <span style="color:var(--text-faint); font-weight:400;">· #${escapeHtml(o.id)}</span></div>
          <div class="verify-item__detail">${itemsSummary} — ₹${o.total} · ${o.timeLabel}</div>
        </div>
        <label class="checkbox-wrap">
          <input type="checkbox" ${o.delivered ? "checked":""}>
          <span class="checkbox-box"></span>
          Delivered
        </label>
      </div>`;
    }).join("");

    $$(".verify-item", el.verifyOrdersList).forEach(row=>{
      const id = row.dataset.id;
      const checkbox = $("input", row);
      checkbox.addEventListener("change", async ()=>{
        const wasChecked = checkbox.checked;
        checkbox.disabled = true;
        try{
          // Ticking marks the order delivered; unticking now actually
          // undoes that on the backend too (previously this branch did
          // nothing, so the next refresh re-fetched the order still
          // "delivered" and the checkbox silently snapped back to
          // checked — the reported verification glitch).
          if(wasChecked) await ShadabAPI.markDelivered(id);
          else await ShadabAPI.undeliverOrder(id);
          await loadAdminOrders();
          renderAllOrders();
          renderVerifyPanel();
          renderDeliverArrivedButton();
        }catch(err){
          checkbox.checked = !wasChecked;
          checkbox.disabled = false;
          showToast(err.message || "Couldn't update order");
        }
      });
    });
  }
  el.verifyDateInput.addEventListener("change", renderVerifyPanel);
  el.verifySearchInput.addEventListener("input", renderVerifyPanel);

  /* -- settings: list-first navigation (tap an item -> full detail view) -- */
  function showSettingsList(){
    el.settingsList.hidden = false;
    el.settingsDetail.hidden = true;
  }
  function showSettingsDetail(key){
    el.settingsList.hidden = true;
    el.settingsDetail.hidden = false;
    $$(".settings-subpanel", el.settingsDetail).forEach(p=>{
      p.classList.toggle("is-active", p.dataset.panel === key);
    });
  }
  if(el.settingsList){
    $$(".settings-list__item[data-setting]", el.settingsList).forEach(item=>{
      item.addEventListener("click", ()=> showSettingsDetail(item.dataset.setting));
    });
  }
  if(el.settingsBackBtn) el.settingsBackBtn.addEventListener("click", showSettingsList);

  /* -- settings: "New-Order Alerts on This Device" row — a permanent,
     always-available control (unlike the one-time popup, which can end up
     permanently silenced if it's ever dismissed once). Reflects live
     status and lets the admin (re)trigger a subscription attempt on
     demand, with a real success/failure toast either way. */
  function refreshPushAlertsRow(){
    if(!el.settingsSummaryPushAlerts || !window.ShadabPush) return;
    if(!window.ShadabPush.supportsPush()){
      el.settingsSummaryPushAlerts.textContent = "Not supported on this browser";
      return;
    }
    const status = window.ShadabPush.adminAlertsStatus();
    el.settingsSummaryPushAlerts.textContent =
      status === "granted" ? "Enabled — tap to refresh" :
      status === "denied" ? "Blocked in browser settings — tap for help" :
      "Not enabled yet — tap to turn on";
  }
  if(el.settingsPushAlertsBtn){
    el.settingsPushAlertsBtn.addEventListener("click", async ()=>{
      if(!window.ShadabPush) return;
      el.settingsSummaryPushAlerts.textContent = "Enabling…";
      await window.ShadabPush.enableAdminAlerts();
      refreshPushAlertsRow();
    });
  }

  /* -- settings: render everything (list summaries + detail form values) -- */
  function renderSettingsPanel(){
    showSettingsList();
    refreshPushAlertsRow();

    const closing = liveSettings.closingTime || DEFAULT_CLOSING_TIME;
    el.closingTimeInput.value = closing;
    el.currentClosingLabel.textContent = formatTime12(closing);
    el.settingsSummaryClosing.textContent = formatTime12(closing);

    const grace = Number(liveSettings.graceMinutes) || 0;
    el.graceMinutesInput.value = grace;
    el.currentGraceLabel.textContent = `${grace} minute${grace === 1 ? "" : "s"}`;
    el.settingsSummaryGrace.textContent = `${grace} minute${grace === 1 ? "" : "s"}`;

    el.deliveryStartInput.value = liveSettings.deliveryWindowStart;
    el.deliveryEndInput.value = liveSettings.deliveryWindowEnd;
    const deliveryLabel = formatTimeRange12(liveSettings.deliveryWindowStart, liveSettings.deliveryWindowEnd);
    el.currentDeliveryLabel.textContent = deliveryLabel;
    el.settingsSummaryDelivery.textContent = deliveryLabel;

    const contactCount = (liveSettings.contacts || []).length;
    el.settingsSummaryContacts.textContent = `${contactCount} contact${contactCount === 1 ? "" : "s"}`;
    renderAdminContactsList();

    el.whatsappLinkInput.value = liveSettings.whatsappGroupLink || "";
    el.settingsSummaryWhatsapp.textContent = liveSettings.whatsappGroupLink ? "Set" : "Not set";

    const poolAmount = Number(liveSettings.minOrderPoolAmount);
    const poolValue = Number.isFinite(poolAmount) ? poolAmount : 600;
    el.poolAmountInput.value = poolValue;
    el.currentPoolLabel.textContent = `₹${poolValue}`;
    el.settingsSummaryPool.textContent = `₹${poolValue}`;

    const cancelWindow = Number.isFinite(Number(liveSettings.cancelWindowMinutes)) ? Number(liveSettings.cancelWindowMinutes) : 15;
    el.cancelWindowInput.value = cancelWindow;
    const cancelMode = liveSettings.cancellationMode === "timeRange" ? "timeRange" : "afterClosing";
    setCancelModeUI(cancelMode);
    el.cancelRangeStartInput.value = liveSettings.cancelWindowStart || "18:00";
    el.cancelRangeEndInput.value = liveSettings.cancelWindowEnd || "19:00";
    const cancelSummary = cancelMode === "timeRange"
      ? formatTimeRange12(liveSettings.cancelWindowStart || "18:00", liveSettings.cancelWindowEnd || "19:00")
      : `${cancelWindow} minute${cancelWindow === 1 ? "" : "s"} after closing`;
    el.currentCancelWindowLabel.textContent = cancelSummary;
    el.settingsSummaryCancelWindow.textContent = cancelSummary;
  }

  /* Cancellation window has two admin-selectable modes — reuses the same
     filter-chip visual language as the order status chips elsewhere in
     admin, so switching feels consistent rather than like a separate
     control system. Only the active mode's fields are shown. */
  let selectedCancelMode = "afterClosing";
  function setCancelModeUI(mode){
    selectedCancelMode = mode === "timeRange" ? "timeRange" : "afterClosing";
    if(el.cancelModeChips){
      $$(".filter-chip", el.cancelModeChips).forEach(chip=>{
        chip.classList.toggle("is-active", chip.dataset.mode === selectedCancelMode);
      });
    }
    $$(".cancel-mode-panel").forEach(panel=>{
      panel.hidden = panel.dataset.modePanel !== selectedCancelMode;
    });
  }
  if(el.cancelModeChips){
    $$(".filter-chip", el.cancelModeChips).forEach(chip=>{
      chip.addEventListener("click", ()=> setCancelModeUI(chip.dataset.mode));
    });
  }

  async function saveSettings(partial, successMsg){
    try{
      const data = await ShadabAPI.updateSettings(partial);
      liveSettings = { ...DEFAULT_SETTINGS, ...(data.settings || partial) };
      store.settings = liveSettings;
      renderSettingsPanel();
      renderDeliveryInfo();
      tick();
      if(successMsg) showToast(successMsg);
      return true;
    }catch(err){
      showToast(err.message || "Couldn't save — try again.");
      return false;
    }
  }

  el.saveClosingTimeBtn.addEventListener("click", async ()=>{
    const val = el.closingTimeInput.value;
    if(!val){ showToast("Pick a valid time"); return; }
    el.saveClosingTimeBtn.disabled = true;
    await saveSettings({ closingTime: val }, "Closing time updated to " + formatTime12(val));
    el.saveClosingTimeBtn.disabled = false;
  });
  el.resetClosingTimeBtn.addEventListener("click", async ()=>{
    el.resetClosingTimeBtn.disabled = true;
    await saveSettings({ closingTime: DEFAULT_CLOSING_TIME }, "Closing time reset to default");
    el.resetClosingTimeBtn.disabled = false;
  });

  el.saveGraceBtn.addEventListener("click", async ()=>{
    const val = Math.max(0, Math.min(60, Number(el.graceMinutesInput.value) || 0));
    el.saveGraceBtn.disabled = true;
    await saveSettings({ graceMinutes: val }, `Extra time set to ${val} minute${val === 1 ? "" : "s"}`);
    el.saveGraceBtn.disabled = false;
  });

  el.savePoolAmountBtn.addEventListener("click", async ()=>{
    const val = Math.max(0, Number(el.poolAmountInput.value) || 0);
    el.savePoolAmountBtn.disabled = true;
    await saveSettings({ minOrderPoolAmount: val }, `Minimum order pool set to ₹${val}`);
    el.savePoolAmountBtn.disabled = false;
  });

  el.saveCancelWindowBtn.addEventListener("click", async ()=>{
    el.saveCancelWindowBtn.disabled = true;
    if(selectedCancelMode === "timeRange"){
      const start = el.cancelRangeStartInput.value;
      const end = el.cancelRangeEndInput.value;
      if(!start || !end){ showToast("Pick both a start and end time"); el.saveCancelWindowBtn.disabled = false; return; }
      if(start >= end){ showToast("End time must be after the start time"); el.saveCancelWindowBtn.disabled = false; return; }
      await saveSettings(
        { cancellationMode: "timeRange", cancelWindowStart: start, cancelWindowEnd: end },
        `Cancellation window set to ${formatTimeRange12(start, end)}`
      );
    } else {
      const val = Math.max(0, Math.min(1440, Number(el.cancelWindowInput.value) || 0));
      await saveSettings(
        { cancellationMode: "afterClosing", cancelWindowMinutes: val },
        `Cancellation window set to ${val} minute${val === 1 ? "" : "s"} after closing`
      );
    }
    el.saveCancelWindowBtn.disabled = false;
  });

  el.saveDeliveryBtn.addEventListener("click", async ()=>{
    const start = el.deliveryStartInput.value;
    const end = el.deliveryEndInput.value;
    if(!start || !end){ showToast("Pick both a start and end time"); return; }
    el.saveDeliveryBtn.disabled = true;
    await saveSettings({ deliveryWindowStart: start, deliveryWindowEnd: end }, "Delivery window updated");
    el.saveDeliveryBtn.disabled = false;
  });

  el.saveWhatsappBtn.addEventListener("click", async ()=>{
    const link = el.whatsappLinkInput.value.trim();
    el.saveWhatsappBtn.disabled = true;
    await saveSettings({ whatsappGroupLink: link }, "WhatsApp group link updated");
    el.saveWhatsappBtn.disabled = false;
  });

  /* -- settings: contact numbers (add / edit / delete) -- */
  let editingContactId = null;
  function renderAdminContactsList(){
    const contacts = liveSettings.contacts || [];
    if(contacts.length === 0){
      el.adminContactsList.innerHTML = `<div class="empty-state"><span>📞</span>No contacts added yet</div>`;
    } else {
      el.adminContactsList.innerHTML = contacts.map(c => `
        <div class="manage-row" data-id="${c.id}">
          <div class="manage-row__media">📞</div>
          <div class="manage-row__info">
            <div class="manage-row__name">${escapeHtml(c.name)}</div>
            <div class="manage-row__meta">${c.phone}${c.details ? " · " + c.details : ""}</div>
          </div>
          <div class="manage-row__actions">
            <button class="edit-contact" aria-label="Edit contact">✎</button>
            <button class="delete-contact danger" aria-label="Remove contact">✕</button>
          </div>
        </div>`).join("");
      $$(".manage-row", el.adminContactsList).forEach(row=>{
        const id = row.dataset.id;
        $(".edit-contact", row).addEventListener("click", ()=> openContactForm(id));
        $(".delete-contact", row).addEventListener("click", ()=> deleteContact(id));
      });
    }
  }
  function openContactForm(id){
    editingContactId = id || null;
    const contact = id ? (liveSettings.contacts || []).find(c => c.id === id) : null;
    el.contactFormTitle.textContent = contact ? "Edit contact" : "Add contact";
    el.contactNameInput.value = contact ? contact.name : "";
    el.contactPhoneInput.value = contact ? contact.phone : "";
    el.contactDetailsInput.value = contact ? (contact.details || "") : "";
    el.contactFormCard.hidden = false;
    el.contactNameInput.focus();
  }
  function closeContactForm(){
    editingContactId = null;
    el.contactFormCard.hidden = true;
    el.contactForm.reset();
  }
  el.addContactBtn.addEventListener("click", ()=> openContactForm(null));
  el.cancelContactFormBtn.addEventListener("click", closeContactForm);
  el.contactForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const name = el.contactNameInput.value.trim();
    const phone = el.contactPhoneInput.value.trim();
    const details = el.contactDetailsInput.value.trim();
    if(!name || !phone){ showToast("Enter a name and phone number"); return; }
    const contacts = [...(liveSettings.contacts || [])];
    if(editingContactId){
      const idx = contacts.findIndex(c => c.id === editingContactId);
      if(idx !== -1) contacts[idx] = { ...contacts[idx], name, phone, details };
    } else {
      contacts.push({ id: "contact-" + Date.now().toString(36), name, phone, details });
    }
    const submitBtn = el.contactForm.querySelector("button[type=submit]");
    setBtnLoading(submitBtn, true, "Saving…");
    const ok = await saveSettings({ contacts }, "Contact saved");
    setBtnLoading(submitBtn, false);
    if(ok) closeContactForm();
  });
  async function deleteContact(id){
    const contacts = (liveSettings.contacts || []).filter(c => c.id !== id);
    await saveSettings({ contacts }, "Contact removed");
  }

  /* -- settings: password strength meter --
     A small, dependency-free heuristic (mirrors the server-side check in
     backend utils/auth.js's passwordStrength) — purely visual feedback
     as the admin types; the real validation always happens server-side
     at submit time regardless of what this shows. */
  function computePasswordStrength(pw){
    const s = String(pw || "");
    let score = 0;
    if(s.length >= 8) score++;
    if(s.length >= 12) score++;
    if(/[a-z]/.test(s) && /[A-Z]/.test(s)) score++;
    if(/\d/.test(s)) score++;
    if(/[^A-Za-z0-9]/.test(s)) score++;
    const labels = ["Very weak","Weak","Fair","Good","Strong","Very strong"];
    const colors = ["#e5484d","#f5a524","#f5d90a","#8bc34a","#2e7d32","#1b5e20"];
    return { score, label: labels[Math.min(score, labels.length-1)], color: colors[Math.min(score, colors.length-1)] };
  }
  function wirePasswordStrengthMeter(input, wrap, fill, label){
    if(!input || !wrap || !fill || !label) return;
    input.addEventListener("input", ()=>{
      const pw = input.value;
      if(!pw){ wrap.hidden = true; return; }
      wrap.hidden = false;
      const { score, label: text, color } = computePasswordStrength(pw);
      const pct = Math.min(100, Math.round((score / 5) * 100));
      fill.style.width = pct + "%";
      fill.style.background = color;
      label.textContent = text;
      label.style.color = color;
    });
  }
  wirePasswordStrengthMeter(el.newCentralPasswordInput, el.centralPwdStrength, el.centralPwdStrengthFill, el.centralPwdStrengthLabel);
  wirePasswordStrengthMeter(el.newLocalPasswordInput, el.localPwdStrength, el.localPwdStrengthFill, el.localPwdStrengthLabel);

  /* -- settings: change CENTRAL password --
     Requires the current CENTRAL password specifically (verified
     server-side) — knowing only the local/normal password isn't enough
     to change this one. On success, if THIS device is the one whose
     central password just changed, its stored master copy is refreshed
     too so it doesn't get logged out by its own change. */
  if(el.changeCentralPasswordForm){
    el.changeCentralPasswordForm.addEventListener("submit", async (e)=>{
      e.preventDefault();
      el.changeCentralPasswordError.hidden = true;
      el.changeCentralPasswordSuccess.hidden = true;
      const current = el.currentCentralPasswordInput.value;
      const next = el.newCentralPasswordInput.value;
      const confirm = el.confirmCentralPasswordInput.value;
      if(next !== confirm){
        el.changeCentralPasswordError.hidden = false;
        el.changeCentralPasswordError.textContent = "New passwords don't match.";
        return;
      }
      if(next.length < 8){
        el.changeCentralPasswordError.hidden = false;
        el.changeCentralPasswordError.textContent = "New password must be at least 8 characters.";
        return;
      }
      const submitBtn = el.changeCentralPasswordForm.querySelector("button[type=submit]");
      setBtnLoading(submitBtn, true, "Updating…");
      try{
        await ShadabAPI.changeCentralPassword(current, next);
        // Keep this device logged in with the new password if it was
        // the central password that unlocked it in the first place.
        if(getAdminMasterPw()) setAdminMasterPw(next);
        el.changeCentralPasswordSuccess.hidden = false;
        el.changeCentralPasswordSuccess.textContent = "Central password updated.";
        el.changeCentralPasswordForm.reset();
        if(el.centralPwdStrength) el.centralPwdStrength.hidden = true;
        showToast("Central password updated");
      }catch(err){
        el.changeCentralPasswordError.hidden = false;
        el.changeCentralPasswordError.textContent = err.message || "Couldn't update the central password.";
      }finally{
        setBtnLoading(submitBtn, false);
      }
    });
  }

  /* -- settings: change LOCAL (normal) admin password --
     Requires the current LOCAL password specifically. */
  if(el.changeLocalPasswordForm){
    el.changeLocalPasswordForm.addEventListener("submit", async (e)=>{
      e.preventDefault();
      el.changeLocalPasswordError.hidden = true;
      el.changeLocalPasswordSuccess.hidden = true;
      const current = el.currentLocalPasswordInput.value;
      const next = el.newLocalPasswordInput.value;
      const confirm = el.confirmLocalPasswordInput.value;
      if(next !== confirm){
        el.changeLocalPasswordError.hidden = false;
        el.changeLocalPasswordError.textContent = "New passwords don't match.";
        return;
      }
      if(next.length < 8){
        el.changeLocalPasswordError.hidden = false;
        el.changeLocalPasswordError.textContent = "New password must be at least 8 characters.";
        return;
      }
      const submitBtn = el.changeLocalPasswordForm.querySelector("button[type=submit]");
      setBtnLoading(submitBtn, true, "Updating…");
      try{
        await ShadabAPI.changeLocalPassword(current, next);
        // Keep this device's own session alive under the new password if
        // it was the local password that unlocked it.
        if(!getAdminMasterPw() && getAdminLocalPw()) setAdminLocalSession(next);
        el.changeLocalPasswordSuccess.hidden = false;
        el.changeLocalPasswordSuccess.textContent = "Local admin password updated.";
        el.changeLocalPasswordForm.reset();
        if(el.localPwdStrength) el.localPwdStrength.hidden = true;
        showToast("Local admin password updated");
      }catch(err){
        el.changeLocalPasswordError.hidden = false;
        el.changeLocalPasswordError.textContent = err.message || "Couldn't update the local admin password.";
      }finally{
        setBtnLoading(submitBtn, false);
      }
    });
  }

  /* =========================================================
     ADMIN — MENU MANAGEMENT (add / edit / delete items)
     ========================================================= */
  function renderMenuManage(){
    const menu = getMenu();
    el.menuManageList.innerHTML = menu.map(item=>{
      const isCustom = item.id.startsWith("custom-");
      return `
      <div class="manage-row" data-id="${item.id}">
        <div class="manage-row__media">${mediaHTML(item)}</div>
        <div class="manage-row__info">
          <div class="manage-row__name">${item.name}${item.note ? ` <span style="color:var(--text-faint);font-weight:400;">(${item.note})</span>`:""}</div>
          <div class="manage-row__meta">${item.category} · ₹${item.price}${isCustom ? " · custom item" : ""}</div>
        </div>
        <div class="manage-row__actions">
          <button class="edit-item" aria-label="Edit item">✎</button>
          <button class="delete-item danger" aria-label="Remove item">✕</button>
        </div>
      </div>`;
    }).join("");

    $$(".manage-row", el.menuManageList).forEach(row=>{
      const id = row.dataset.id;
      $(".edit-item", row).addEventListener("click", ()=> openItemForm(id));
      $(".delete-item", row).addEventListener("click", ()=> deleteItem(id));
    });
  }

  function renderIconChoices(){
    el.iconChoiceRow.innerHTML = ICON_KEYS.map(key=>
      `<button type="button" class="icon-choice ${key===selectedIconKey?"is-selected":""}" data-icon="${key}">${ICONS[key]}</button>`
    ).join("");
    $$(".icon-choice", el.iconChoiceRow).forEach(btn=>{
      btn.addEventListener("click", ()=>{
        selectedIconKey = btn.dataset.icon;
        $$(".icon-choice", el.iconChoiceRow).forEach(b=>b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
      });
    });
  }

  function showAdminPanel(tabKey){
    $$(".admin-tab").forEach(t=>t.classList.toggle("is-active", t.dataset.tab === tabKey));
    $$(".admin-panel").forEach(p=>{ p.classList.remove("is-active"); p.hidden = true; });
    const target = $("#panel-"+tabKey);
    target.hidden = false;
    target.classList.add("is-active");
  }

  function renderPhotoPreview(){
    if(pendingImageData){
      el.itemPhotoPreview.innerHTML = `<img src="${pendingImageData}" alt="">`;
    } else {
      el.itemPhotoPreview.textContent = "No photo";
    }
  }
  el.itemPhotoInput.addEventListener("change", (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev)=>{
      const img = new Image();
      img.onload = ()=>{
        const maxW = 480;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        pendingImageData = canvas.toDataURL("image/jpeg", 0.8);
        renderPhotoPreview();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  el.removeItemPhotoBtn.addEventListener("click", ()=>{
    pendingImageData = null;
    el.itemPhotoInput.value = "";
    renderPhotoPreview();
  });

  function openItemForm(id){
    editingItemId = id || null;
    if(id){
      const item = findItem(id);
      el.itemFormTitle.textContent = "Edit item";
      el.itemNameInput.value = item.name;
      el.itemPriceInput.value = item.price;
      el.itemCategoryInput.value = item.category;
      el.itemNoteInput.value = item.note || "";
      el.itemDescInput.value = item.description || "";
      selectedIconKey = ICONS[item.icon] ? item.icon : "plate";
      pendingImageData = item.imageData || null;
    } else {
      el.itemFormTitle.textContent = "Add new item";
      el.itemForm.reset();
      selectedIconKey = ICON_KEYS[0];
      pendingImageData = null;
    }
    renderIconChoices();
    renderPhotoPreview();
    showAdminPanel("itemform");
  }
  el.addItemBtn.addEventListener("click", ()=> openItemForm(null));
  el.cancelItemFormBtn.addEventListener("click", ()=> showAdminPanel("menu"));

  el.itemForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const name = el.itemNameInput.value.trim();
    const price = Number(el.itemPriceInput.value);
    const category = el.itemCategoryInput.value.trim() || "Other";
    const note = el.itemNoteInput.value.trim();
    const description = el.itemDescInput.value.trim();

    if(!name || !price || price <= 0){ showToast("Enter a valid name and price"); return; }

    const submitBtn = el.itemForm.querySelector('[type="submit"]');
    if(submitBtn) submitBtn.disabled = true;
    try{
      const id = editingItemId || ("custom-" + Date.now());
      const item = { name, price, category, note, description, icon: selectedIconKey, imageData: pendingImageData };
      await ShadabAPI.upsertMenuItem(id, item);
      await loadMenuCatalog();
      showToast(editingItemId ? "Item updated" : "Item added to menu");
      editingItemId = null;
      showAdminPanel("menu");
    }catch(err){
      showToast(err.message || "Couldn't save the item — try again.");
    }finally{
      if(submitBtn) submitBtn.disabled = false;
    }
  });

  async function deleteItem(id){
    const isCustom = !BASE_MENU.some(m => m.id === id);
    try{
      if(isCustom){
        // Custom items have no "base" state to fall back to, so removing
        // one deletes its doc outright.
        await ShadabAPI.deleteMenuItem(id);
      } else {
        // Base items are hidden by flagging the override `deleted: true`
        // rather than deleting the doc — that preserves whatever
        // name/price customisation was on it if the admin un-hides it
        // later, and keeps "Restore original menu" (which wipes every
        // override doc) as the one true reset.
        const existing = findItem(id) || {};
        await ShadabAPI.upsertMenuItem(id, {
          name: existing.name, price: existing.price, category: existing.category,
          note: existing.note, description: existing.description,
          icon: existing.icon, imageData: existing.imageData, deleted: true,
        });
      }
      await loadMenuCatalog();
      showToast("Item removed from menu");
    }catch(err){
      showToast(err.message || "Couldn't remove the item — try again.");
    }
  }

  el.restoreMenuBtn.addEventListener("click", async ()=>{
    try{
      await ShadabAPI.restoreMenu();
      await loadMenuCatalog();
    }catch(err){
      showToast(err.message || "Couldn't restore the menu — try again.");
      return;
    }
    showToast("Menu restored to original");
  });

  /* =========================================================
     BANNER CAROUSEL (auto-rotating, swipeable, Hotstar-style)
     ========================================================= */
  function initBannerCarousel(){
    const slides = $$(".banner-slide", el.bannerTrack);
    if(slides.length === 0) return;
    let index = 0;
    let timer = null;

    function renderDots(){
      el.bannerDots.innerHTML = slides.map((_,i)=> `<button data-i="${i}" class="${i===index?"is-active":""}" aria-label="Go to slide ${i+1}"></button>`).join("");
      $$("button", el.bannerDots).forEach(btn=>{
        btn.addEventListener("click", ()=>{ goTo(Number(btn.dataset.i)); restart(); });
      });
    }
    function setActiveSlideClass(){
      slides.forEach((s,i)=> s.classList.toggle("is-active", i===index));
    }
    function goTo(i){
      index = (i + slides.length) % slides.length;
      el.bannerTrack.style.transform = `translateX(-${index * 100}%)`;
      setActiveSlideClass();
      renderDots();
    }
    function next(){ goTo(index + 1); }
    function prev(){ goTo(index - 1); }
    function setDotsPaused(paused){ $$("button", el.bannerDots).forEach(b=> b.classList.toggle("is-paused", paused)); }
    function restart(){ clearInterval(timer); setDotsPaused(false); timer = setInterval(next, 4500); }
    function pause(){ clearInterval(timer); setDotsPaused(true); }

    el.bannerNext.addEventListener("click", ()=>{ next(); restart(); });
    el.bannerPrev.addEventListener("click", ()=>{ prev(); restart(); });

    let touchStartX = null;
    el.bannerCarousel.addEventListener("touchstart", (e)=>{ touchStartX = e.touches[0].clientX; pause(); }, { passive:true });
    el.bannerCarousel.addEventListener("touchend", (e)=>{
      if(touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if(dx > 40) prev();
      else if(dx < -40) next();
      touchStartX = null;
      restart();
    });
    el.bannerCarousel.addEventListener("mouseenter", pause);
    el.bannerCarousel.addEventListener("mouseleave", restart);

    setActiveSlideClass();
    renderDots();
    restart();
  }

  function syncTopbarHeightVar(){
    if(!el.topbar) return;
    document.documentElement.style.setProperty("--topbar-h", el.topbar.offsetHeight + "px");
  }
  /* The category bar (.menu-catnav) sticks at `top: var(--topbar-h)` so it
     sits right below the header. That variable used to only get
     recalculated on page load and on window "resize" — but the header's
     own height changes whenever the search panel expands/collapses
     (e.g. opening it, or the on-screen keyboard popping up while typing
     in it), and mobile browsers don't reliably fire a "resize" event for
     every one of those. When --topbar-h went stale, the category bar
     stuck at the WRONG offset — reading as "stuck in place while the
     page scrolls underneath it". A ResizeObserver watches the header's
     actual rendered size directly, so it self-corrects no matter what
     caused the change, instead of guessing at every possible trigger. */
  if(el.topbar && window.ResizeObserver){
    new ResizeObserver(syncTopbarHeightVar).observe(el.topbar);
  } else {
    window.addEventListener("resize", syncTopbarHeightVar);
  }

  /* =========================================================
     LIVE REFRESH — the admin dashboard (and a customer's My Orders)
     used to only ever re-fetch after a manual action, so a pending
     order confirming, another admin cancelling something, or the pool
     total shifting could sit stale on screen for a long time until
     something happened to trigger a reload. This polls quietly in the
     background and only touches the DOM when something actually
     changed (see the hash checks in loadAdminOrders/renderMyOrders),
     so it stays smooth instead of causing a visible flash every cycle.
     ========================================================= */
  // 25s rather than 20s — the backend now caches its expensive pool
  // computation for a few seconds (see routes/orders.js), so this mostly
  // just controls request VOLUME, not real freshness. A small bump here
  // meaningfully cuts total Firestore reads across every open tab during
  // a busy window without any perceptible change in how "live" the site
  // feels.
  const LIVE_REFRESH_MS = 25000;
  async function refreshLiveViews(){
    if(document.hidden) return; // don't burn Firestore reads on backgrounded tabs
    // Re-fetch closing time / cancellation-window settings on every tick.
    // Without this, liveSettings was only ever loaded once at page load,
    // so a customer already browsing the site would never see an admin's
    // mid-day closing-time (or grace/cancellation-allowance) change take
    // effect — the countdown, "Cancellation terms" text, and Cancel
    // button would keep going by stale values until a manual page
    // refresh. loadSettings() is cheap and already re-renders the
    // affected UI (renderDeliveryInfo + tick), so it's safe to call every
    // LIVE_REFRESH_MS alongside the rest of the live polling below.
    await loadSettings();
    await refreshLivePool();

    const ordersViewOpen = !document.getElementById("view-orders").hidden;
    if(ordersViewOpen && store.currentUser) renderMyOrders(true);

    const adminViewOpen = !document.getElementById("view-admin").hidden;
    // A LOCAL (normal) admin password session that's timed out gets
    // kicked back to the gate on the very next poll, even mid-session —
    // not just the next time the admin dashboard happens to be reopened.
    // Central-password devices (getAdminMasterPw() set) never expire.
    if(store.adminUnlocked && !getAdminMasterPw() && isAdminLocalSessionExpired()){
      store.adminUnlocked = false;
      clearAdminLocalSession();
      if(adminViewOpen){
        renderAdmin();
        showToast("Admin session timed out — please log in again");
      }
      return;
    }
    if(adminViewOpen && store.adminUnlocked){
      const changed = await loadAdminOrders(true);
      const allOrdersPanelActive = $("#panel-allorders") && $("#panel-allorders").classList.contains("is-active");
      const verifyPanelActive = $("#panel-verify") && $("#panel-verify").classList.contains("is-active");
      if(changed){
        if(allOrdersPanelActive) renderAllOrders();
        if(verifyPanelActive) renderVerifyPanel();
        renderDeliverArrivedButton();
      }
      if(allOrdersPanelActive) renderPoolBanner();
    }
  }

  // Entry point for js/notify.js when a push arrives on an already-open
  // tab. Deliberately reuses renderMyOrders/loadAdminOrders — the exact
  // same functions the regular poll calls — instead of playing a sound
  // directly. That means a push and the next scheduled poll can never
  // both notify for the same change: whichever runs first updates the
  // hash the diff hooks compare against, so the other one sees nothing
  // new and stays silent. Without this, someone with an open tab and
  // push enabled could hear two separate dings for one real update —
  // exactly the "extra notifications" this fixes.
  async function syncOrdersForPush(kind){
    if(kind === "admin"){
      if(!store.adminUnlocked) return;
      // fromPush:true here specifically so onAdminOrdersUpdated (inside
      // loadAdminOrders) knows this call is happening because a push JUST
      // arrived on this exact open tab — the one case Chrome/Firefox
      // deliberately withhold the OS notification sound for (see sw.js's
      // push handler comment). Without this flag, onAdminOrdersUpdated's
      // pushGranted() check would always be true here (a push obviously
      // just arrived, so permission is obviously granted) and the
      // compensating chime would never actually play — which was exactly
      // the reported "no sound while the app is open" bug.
      const changed = await loadAdminOrders(true, true);
      if(!changed) return;
      const adminViewOpen = !document.getElementById("view-admin").hidden;
      if(!adminViewOpen) return;
      const allOrdersPanelActive = $("#panel-allorders") && $("#panel-allorders").classList.contains("is-active");
      const verifyPanelActive = $("#panel-verify") && $("#panel-verify").classList.contains("is-active");
      if(allOrdersPanelActive) renderAllOrders();
      if(verifyPanelActive) renderVerifyPanel();
      renderDeliverArrivedButton();
      if(allOrdersPanelActive) renderPoolBanner();
    } else {
      if(!store.currentUser) return;
      // Same reasoning as the admin branch above — fromPush:true lets
      // onCustomerOrdersUpdated bypass the pushGranted() skip specifically
      // for this push-triggered call, since THIS is the call meant to
      // compensate for the OS sound Chrome/Firefox withheld because the
      // tab was focused when the push landed.
      await renderMyOrders(true, false, true);
    }
  }
  window.ShadabOrdersSync = { syncOrdersForPush };

  function init(){
    syncTopbarHeightVar();
    purgeOldOrders();
    wireImageFallback(el.menuList);
    wireImageFallback(el.menuManageList);
    wireImageFallback(el.itemDetailMedia);
    wireImageFallback(el.cartItems);
    initBannerCarousel();
    renderMenu();
    renderCart();
    updateAuthUI();
    renderDeliveryInfo(); // paint with cached/defaults immediately
    tick();
    loadSettings(); // then refresh from the backend
    loadMenuCatalog(); // ...and the real menu (prices/items admin has changed)
    setInterval(()=>{ purgeOldOrders(); tick(); }, 1000);
    setInterval(refreshLiveViews, LIVE_REFRESH_MS);
    document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) refreshLiveViews(); });

    const hash = location.hash.replace("#","");
    const startView = VALID_VIEWS.includes(hash) ? hash : "home";
    showView(startView);
    history.replaceState({ shadabView: startView }, "", "#"+startView);

    if(window.ShadabPush && store.currentUser){
      setTimeout(()=> window.ShadabPush.promptCustomer(), 1400);
    }
  }
  /* =========================================================
     LIGHT COPY DETERRENT
     Note: this only discourages casual right-click "view/save"
     and a couple of devtools shortcuts — it can't and doesn't
     claim to stop someone determined to inspect the page (that
     is not possible for any website). Real protection lives on
     the server: auth, validation and rate limiting. Text inputs
     are explicitly excluded so typing, pasting and OTP entry
     still work normally.
     ========================================================= */
  document.addEventListener("contextmenu", (e)=>{
    const tag = (e.target.tagName || "").toLowerCase();
    if(tag === "input" || tag === "textarea") return;
    e.preventDefault();
  });
  document.addEventListener("keydown", (e)=>{
    const tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();
    if(tag === "input" || tag === "textarea") return;
    const k = e.key.toLowerCase();
    const blocked =
      k === "f12" ||
      (e.ctrlKey && e.shiftKey && ["i","j","c"].includes(k)) ||
      (e.metaKey && e.altKey && ["i","j","c"].includes(k)) ||
      (e.ctrlKey && k === "u");
    if(blocked) e.preventDefault();
  });

  init();
})();
