# ♠ Sedmica Score Table

A scorecard web app for the card game **Sedmica**, built as a Progressive Web App (PWA) — works offline and can be installed on mobile or desktop.

[![Live Demo](https://img.shields.io/badge/♠_Live_Demo-sedmica-1a1a2e?style=for-the-badge)](https://pero-grubac.github.io/sedmica/)

---

## Features

- **2–4 players** — optional players can be left blank
- **Per-player score input** — each player has their own card with a score field
- **Šuster button** — mark one or more players as losers; they receive 0 points for that round and their cumulative score resets to 0
- **Validation** — total points per round must be 8 or 9; šuster players are excluded from the count
- **Score table** — every round is a separate row; šuster rounds marked with 💀
- **Running total** — underlined sum row always visible at the bottom of the table
- **Offline support** — works without internet after first load (PWA / Service Worker)
- **Installable** — add to home screen on mobile or install as a desktop app via Chrome

---

## Game rules (short)

- Each round, players collectively score **8 or 9 points**
- Player with the **most points** at the end loses
- **Šuster** — a player who goes šuster receives 0 points for that round and their running total resets to 0

---

## 📂 Structure

```
sedmica/
├── index.html
├── style.css
├── script.js
├── assets/
│   ├── images/
│   ├── fonts/
│   └── icons/
├── manifest.json
├── service-worker.js
├── README.md
└── .gitignore
```

---

## 🚀 Getting Started

> Service Workers require a local HTTP server — they don't run on `file://`.

**VS Code Live Server:**

```
Right-click index.html → Open with Live Server
```

Open `http://localhost:5500`

**Python:**

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`

> **Note for local development:** The Service Worker is automatically disabled on `localhost` and `127.0.0.1`. This means the app always loads fresh files during development — no stale cache, no need to manually clear anything. The Service Worker activates only on a deployed HTTPS origin (e.g. GitHub Pages).

---

## Deploy to GitHub Pages

1. Create a new repository (e.g. `sedmica`)
2. Push all files to the `main` branch root
3. Go to **Settings → Pages → Source** → `main` / `/ (root)`
4. Site will be live at `https://pero-grubac.github.io/sedmica`

---

## Installing as an app

### Mobile (Android / iOS)

1. Open the site in Chrome or Safari
2. Chrome: menu (⋮) → _Add to Home Screen_
3. Safari: Share → _Add to Home Screen_

### Desktop (Chrome)

An install icon (⊕) appears in the address bar — click it to install as a standalone desktop app.

> HTTPS is required for PWA installation. `localhost` works for local testing; for mobile use [GitHub Pages](https://pero-grubac.github.io/sedmica/).

---

## Tech stack

- Vanilla HTML / CSS / JavaScript — no frameworks, no build tools
- PWA: Web App Manifest + Service Worker (cache-first strategy, disabled on localhost)
- Fonts: Playfair Display, Source Sans 3 (self-hosted, no Google Fonts dependency)
