# CraviX — Full-Stack Food Ordering Platform

A production food-ordering platform originally built for a real restaurant business (Shadab Restaurant): a premium single-page ordering site — gold-on-black "royal menu" styling, iOS-style glass panels, spring animations, dark/light mode, mobile OTP login, a slide-in cart, and a full admin dashboard — backed by a real Node.js/Express API with authentication, order storage, and live menu management.

```
CraviX/
├── frontend/                 → single-page ordering site (HTML/CSS/JS, PWA)
│   ├── index.html            → page structure, all views/modals
│   ├── css/style.css         → full design system (tokens, layout, animation)
│   ├── js/app.js             → app logic and data handling
│   ├── js/api.js             → talks to the backend (set API_BASE_URL here)
│   ├── js/push.js            → web push notification handling
│   ├── sw.js                 → service worker (PWA/offline support)
│   └── images/                → dish photos, banners, brand assets
└── backend/                  → Node.js/Express REST API
    ├── server.js              → entry point, middleware, route mounting
    ├── db.js                  → Firestore connection
    ├── mailer.js              → transactional email (OTP codes)
    ├── routes/                → auth, orders, menu, settings, customers, admins, push
    └── utils/                 → auth helpers, caching, menu catalog, push utilities
```

---

## Frontend

### How to open it
Open `frontend/index.html` in any modern browser (double-click it, or drag it into Chrome/Safari/Edge). No installation, build step, or server required for browsing.

To host it live, upload the `frontend` folder to any static host (Netlify, Vercel, GitHub Pages, or your own hosting) — it's plain HTML/CSS/JS.

### Features
- **Smooth, scoped interactions** — tapping Add or adjusting a quantity updates just that one card, not the whole page; the mobile tap "flash/highlight" some browsers show is switched off everywhere, so every tap feels like a native app button, not a link.
- **Header search** — live suggestions as you type (matched by name, category, or description), with a clear "No items found" message when nothing matches. Tapping a result opens that dish's detail view.
- **Rotating banner carousel** — auto-advances every few seconds with a smooth slide animation, plus swipe support and dots/arrows.
- **Real dish photos**, a non-veg indicator, and a short description under each name.
- **Dish detail view** — larger photo, description, price, and its own quantity control before adding to cart.
- **Menu** organised into sections (Buckets, Biryani, Fry, Curry), sorted highest-price-first.
- **Live countdown** to closing time, with a 3-minute grace window after it passes before ordering fully locks.
- **Cart** — slides in from the right with a live badge; each line shows a thumbnail and stays aligned on any screen size.
- **Tree-line (☰) menu** — Home, Log in / My Account, My Orders, Cart, Admin Site, Log out (with confirmation).
- **Full account system** — signup (username, mobile, email, password with live strength meter), 6-digit email verification, login by mobile or email + password, forgot-password flow (email OTP → new password or skip).
- **My Account** — name, phone, member-since date, inline name edit.
- **My Orders** — every order the signed-in customer has placed, with live status.
- **Admin Site** (menu → *Admin Site*):
  - Shows who's currently signed in (name + phone) at the top.
  - **All Orders** — search by name, phone, or order ID; copy order list, copy order IDs, clear all orders (confirmation + cancellable 7-second countdown).
  - **Verify Orders** — search + date picker, mark Delivered per order.
  - **Menu** — add/edit/remove dishes (name, price, category, note, description, photo upload, icon) live; "Restore original menu" undoes customisations.
  - **Settings** — closing time and admin password (show/hide toggle).
- **Dark/light mode**, remembered between visits.
- **Automatic 12-hour order cleanup** to keep local storage light.
- **Back button / swipe-back support** on mobile — closes whatever's open (menu, cart, search, modal) instead of leaving the page; with nothing open, navigates Home / My Orders / My Account / Admin like a native app.
- **PWA support** — installable, with a service worker and push notifications for order updates.

### About the images
Dish photos live in `images/menu/` (named to match each item, e.g. `biryani-curry.jpg`), banners in `images/banners/`. All are resized and compressed for fast loading. New dishes added from the admin Menu tab can have a photo uploaded directly — no file editing needed.

---

## Backend

A real Express API that replaced the original browser-only mock data — handles authentication, order storage, and menu/settings management against Firestore.

**Stack:** Express · Firebase Admin (Firestore) · JWT auth · bcrypt password hashing · Brevo (transactional email for OTP) · Web Push (VAPID) · express-rate-limit · Helmet · compression

### Key design points
- Signup / password-reset codes are sent as real email — nothing is shown on-screen.
- Passwords are hashed (bcrypt) and stored server-side, never in the browser.
- The admin dashboard password is verified server-side, not readable from page source.
- Orders are stored server-side, so the admin dashboard shows every customer's order from any device.
- Daily minimum-order pool system and automated kitchen-capacity cutoff logic — turns a real operational business constraint into working automation.
- Global + route-level rate limiting, Helmet security headers, and CORS locked to an explicit origin allowlist.

### API overview

| Route | Handles |
|---|---|
| `/api/auth` | signup, email verification, login, forgot/reset password, profile (`/me`) |
| `/api/orders` | place order, pool status, order history, status updates, admin create/edit/cancel, bulk clear |
| `/api/menu` | fetch menu, add/edit/remove dishes |
| `/api/settings` | closing time, admin password |
| `/api/customers` | admin customer list/stats, block/unblock, clear data |
| `/api/admins` | admin verification, password management, block/unblock |
| `/api/push` | web push subscribe/unsubscribe (customer + admin), VAPID public key |
| `/api/health` | health check |

### Environment variables

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | signs auth tokens |
| `ADMIN_PASSWORD` | admin dashboard login |
| `BREVO_API_KEY` | sends OTP/verification emails |
| `MAIL_FROM_NAME` | display name on outgoing email |
| `ALLOWED_ORIGINS` | comma-separated list of allowed frontend origins (CORS) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_CONTACT_EMAIL` | web push notifications |
| `PORT` | server port (defaults set by host, e.g. Render) |

Firestore credentials are read from a service account JSON file (`/etc/secrets/firebase-service-account.json` on Render, or your own secret file path) — not from an environment variable.

### Run it locally
```bash
cd backend
npm install
# create a .env with the variables above, and place your Firebase
# service account JSON at the path db.js expects
node server.js
```
Requires Node.js ≥ 18.

### Deploy
1. Deploy `backend/` to a Node host (e.g. Render free tier); set the environment variables above and upload the Firebase service account JSON as a secret file.
2. In `frontend/js/api.js`, set `API_BASE_URL` to your deployed backend's URL.
3. Host `frontend/` on any static host (Netlify, Vercel, GitHub Pages) — still plain HTML/CSS/JS, no build step.

Until the frontend is pointed at a live backend, signup/login/forgot-password/admin-login show a clear "Backend not connected yet" message instead of failing silently. Cart contents and dark/light mode preference are stored in the browser regardless — no account needed to browse the menu or hold items in a cart before checkout.

---

## Notes

This project started as a Shadab Restaurant–specific build and was developed into CraviX as a more general-purpose ordering platform. Default credentials and environment secrets are intentionally excluded from version control — set your own before deploying.
