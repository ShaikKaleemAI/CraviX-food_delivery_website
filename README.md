# CraviX — Full-Stack Food Ordering Platform

A production food-ordering platform built for a real restaurant business (Shadab Restaurant), live-deployed with a complete customer ordering flow and an admin dashboard for daily operations.

## What's inside

```
CraviX/
├── frontend/    → single-page ordering site (HTML/CSS/JS, PWA)
└── backend/     → Node.js/Express REST API (auth, orders, menu, settings)
```

## Frontend

Premium single-page ordering experience: dark/light mode, mobile OTP login, slide-in cart, live search, and a full admin dashboard — all plain HTML/CSS/JS, no build step required.

**Key features:**
- Rotating banner carousel with swipe support
- Live search-as-you-type across the menu
- Dish detail view with photo, description, and quantity control
- Live countdown to closing time with a grace window before ordering locks
- Slide-in cart with live badge and per-item thumbnails
- Full account system: signup, email-verified 6-digit code, login by mobile or email, forgot-password flow
- **Admin dashboard** — live order management (search, bulk copy, clear with confirmation), order verification with delivery marking, live menu editing (add/edit/remove dishes with photo upload), and configurable closing time
- Automatic order cleanup to keep local storage light
- Native-app-style back/swipe navigation on mobile

**Run it:** open `index.html` directly in any modern browser — no installation needed. To deploy, upload the folder to any static host (Netlify, Vercel, GitHub Pages).

## Backend

Real Node.js/Express backend replacing what was originally browser-only mock data — handles authentication, order storage, and menu/settings management against a real database.

**Stack:** Express · Firebase Admin (Firestore) · JWT auth · bcrypt password hashing · Nodemailer (email OTP) · Web Push · rate limiting · Helmet

**Structure:**
- `server.js` — entry point
- `routes/` — `auth`, `orders`, `menu`, `settings`, `customers`, `admins`, `push`
- `utils/` — auth helpers, caching, menu catalog, push notifications
- `mailer.js` / `db.js` — email and database integration

**Key design points:**
- Email OTP for signup/password-reset is sent as real email via Gmail — nothing is exposed client-side
- Passwords are hashed and stored server-side, not in the browser
- Admin dashboard password is verified server-side, not readable from page source
- Daily minimum-order pool system and automated kitchen-capacity cutoff logic, turning a real operational business constraint into working automation

**Run it:**
```bash
cd backend
npm install
node server.js
```
Requires Node.js ≥ 18 and a `.env` file with database/email credentials (not included in this repo for security).

## Notes

This started as a Shadab Restaurant-specific build and was developed into CraviX as a more general-purpose ordering platform. Default admin credentials and environment secrets are intentionally excluded from version control — set your own via environment variables before deploying.
