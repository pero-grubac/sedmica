<div align="center">

# ♠ Sedmica Score Table

![HTML](https://img.shields.io/badge/HTML-5-e34f26?style=flat-square&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-3-1572b6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2024-f7df1e?style=flat-square&logo=javascript&logoColor=black)
![PWA](https://img.shields.io/badge/PWA-offline--ready-5a0fc8?style=flat-square&logo=pwa&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-deployed-4c1?style=flat-square&logo=github&logoColor=white)

[![Live Demo](https://img.shields.io/badge/♠_Live_Demo-sedmica-1a1a2e?style=for-the-badge)](https://pero-grubac.github.io/sedmica/)

</div>

---

## 📌 Project Overview

**Sedmica Score Table** is a digital scorecard for the card game Sedmica. It supports 2–4 players, tracks cumulative scores across rounds, handles the šuster rule, and validates point totals per round. Runs entirely in the browser — no backend, no dependencies, no build step. Works offline as a PWA.

---

## ✨ Features

- 👥 **2–4 players** — optional players can be left blank
- 🃏 **Per-player score input** — each player has their own card with a dedicated score field
- 💀 **Šuster button** — mark one or more players as losers; they receive 0 points and their cumulative score resets to 0
- ✅ **Validation** — total points per round must be 8 or 9; šuster players are excluded from the count
- 📋 **Score table** — every round is a separate row; šuster rounds marked with 💀
- ➕ **Running total** — underlined sum row always visible at the bottom of the table
- 📱 **PWA** — installable on mobile and desktop, works fully offline after first load

---

## 🃏 Game Rules (short)

| Rule | Description |
|------|-------------|
| Points per round | Players collectively score **8 or 9 points** each round |
| Losing condition | Player with the **most points** at the end loses |
| Šuster | Player receives **0 points** for that round; their running total resets to 0 |

---

## 📁 Project Structure

| File / Folder | Purpose |
|---------------|---------|
| `index.html` | Markup and layout |
| `style.css` | Dark theme styling |
| `script.js` | All game logic and rendering |
| `manifest.json` | PWA manifest (name, icons, display mode) |
| `service-worker.js` | Offline caching (cache-first strategy, disabled on localhost) |
| `assets/images/` | Game imagery |
| `assets/fonts/` | Self-hosted typefaces (Playfair Display, Source Sans 3) |
| `assets/icons/` | PWA home screen icons |

---

## 🚀 Deploy to GitHub Pages

1. Create a new repo (e.g. `sedmica`)
2. Push all files to the `main` branch root
3. Go to **Settings → Pages → Source** → `main` / `/ (root)`
4. Site will be live at `https://pero-grubac.github.io/sedmica`

> **Service Workers require HTTPS** — the PWA only activates on a deployed origin. On `localhost`, the Service Worker is automatically disabled so you always get fresh files during development.

---

## 🛠️ Local Development

No build step needed. A local HTTP server is required — Service Workers don't run on `file://`.

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

---

## 📲 Installing as an App

### Mobile (Android / iOS)
1. Open the site in Chrome or Safari
2. **Chrome:** menu (⋮) → *Add to Home Screen*
3. **Safari:** Share → *Add to Home Screen*

### Desktop (Chrome)
An install icon (⊕) appears in the address bar — click it to install as a standalone desktop app.

> HTTPS is required for PWA installation. `localhost` works for local testing; for mobile installation use [GitHub Pages](https://pero-grubac.github.io/sedmica/).

---

## 🔧 Tech Stack

- Vanilla HTML / CSS / JavaScript — no frameworks, no build tools
- PWA: Web App Manifest + Service Worker (cache-first strategy)
- Fonts: Playfair Display, Source Sans 3 (self-hosted, no Google Fonts dependency)
