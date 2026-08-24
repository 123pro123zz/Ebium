# Ebium Browser — Developer & Architecture Guidelines

Welcome to the **Ebium Browser** project! This document outlines the core architecture, design system, file map, and best practices so any assistant or developer can jump straight into building and improving Ebium with full creative freedom and maximum efficiency.

---

## 1. Project Overview & Architecture

Ebium is a modern, lightweight, highly customizable Chromium-based desktop browser built with **Electron**.

### Architectural Flow:
- **Main Process (`main.js`)**: 
  - Manages the main `BrowserWindow` (frameless custom window) and multiple `BrowserView` tab instances.
  - Handles tab creation, lifecycle, view geometry below the navigation bar (`NAV_HEIGHT = 86px`), and persistent tab sessions.
  - Manages persistent settings, password store, history, and bookmarks using `SimpleStore` (`%APPDATA%/Ebium/buglem-settings.json`).
  - Listens to all IPC events and coordinates state across processes.
- **Preload Bridge (`preload.js`)**:
  - Securely exposes `window.electronAPI` into internal renderer pages (`index.html`, `newtab.html`, `settings.html`).
- **Browser Chrome Shell (`index.html`, `renderer.js`, `styles.css`)**:
  - Renders top tab bar, window controls (close, minimize, maximize), navigation controls (back, forward, reload, home), address bar (omnibar), and star favorite toggle.
- **Main Menu / New Tab Dashboard (`newtab.html`, `newtab.js`, `newtab.css`)**:
  - Internal URL: `ebium://yeni-sekme` (loads `newtab.html`).
  - Features: Header status chips (greeting with dynamic time-of-day SVG icons, date, settings shortcut), bold hero clock, search engine switcher (Google, DuckDuckGo, Bing, YouTube), high-resolution shortcut tiles, daily inspiration quote card, and auto-saving quick notes widget.
- **Settings Dashboard (`settings.html`, `settings.js`, `settings.css`)**:
  - Internal URL: `ebium://ayarlar` (loads `settings.html`).
  - Features:
    - **Genel Ayarlar**: Custom wallpaper upload & preview, default search engine selector with live persistence, startup behavior selector (`newtab` vs `continue` - session restore).
    - **Şifre Yöneticisi**: Full CRUD password manager with random password generator, reveal/hide eye toggle, copy-to-clipboard toast, search filtering, and deletion.
    - **Tarama Geçmişi**: Browsing history with instant search filter, single-item deletion, and clear history.
    - **Yer İşaretleri**: Saved bookmarks list with instant search filter and deletion.
    - **Performans (Gamer)**: Visual performance and gamer optimization dashboard.
- **Side Panel Tools (`sidepanel.js`)**:
  - Notes, To-Do list, Pomodoro timer, Ping/Speed test, and Color picker.

---

## 2. File Map

```
Ebium/
├── main.js             # Electron main process, window & BrowserView tab management, store & IPC
├── preload.js          # contextBridge API exposing window.electronAPI
├── index.html          # Browser frame shell (tab bar, nav bar, omnibar, window controls)
├── renderer.js         # Shell logic (tab tabs, address bar, omnibar search, active tab sync)
├── styles.css          # Browser chrome stylesheet (obsidian dark, rounded tabs, pill omnibar)
├── newtab.html         # Start page / Main menu HTML structure
├── newtab.js           # Start page logic (search engine selector, shortcuts CRUD, widgets)
├── newtab.css          # Start page stylesheet (obsidian dark, Outfit & Plus Jakarta Sans)
├── settings.html       # Settings page HTML (General, Passwords, History, Bookmarks, Gamer)
├── settings.js         # Settings logic (engine sync, tab restore, password manager, history filter)
├── settings.css        # Settings stylesheet (cards, modals, toggles, toast notifications)
├── sidepanel.js        # Side panel tools logic (Pomodoro, speed test, color picker, notes)
├── Ebium.ico           # Application brand icon
├── package.json        # Electron dependencies and scripts
├── start.bat           # Quick launch script
└── rules.md            # Project architecture and guidance (this file)
```

---

## 3. Design System & Aesthetics (Obsidian Theme)

Always follow these visual design rules when extending or creating UI components:

### Color Palette:
- **Base Background**: `#09090b` (Deep Zinc/Obsidian Dark)
- **Sidebar & Surface**: `#0c0d10` to `#121318`
- **Card Surfaces**: `rgba(18, 19, 24, 0.75)` with `backdrop-filter: blur(16px)`
- **Hover Surfaces**: `rgba(28, 30, 38, 0.9)`
- **Borders**: `rgba(255, 255, 255, 0.08)` (hover: `rgba(255, 255, 255, 0.16)`)
- **Primary / Accent**: `#6366f1` (Electric Indigo) / `#818cf8` (Light Indigo) / glow `rgba(99, 102, 241, 0.25)`
- **Danger**: `#f43f5e` (Rose Red)
- **Text**: Primary `#f4f4f5`, Secondary `#d4d4d8`, Muted `#a1a1aa`, Tertiary `#71717a`

### Typography:
- **Display Headings**: Google Fonts **Outfit** (`font-weight: 700, 800, 900`)
- **Body & UI Text**: Google Fonts **Plus Jakarta Sans** (`font-weight: 500, 600, 700`)
- *Never use thin or washed-out fonts.* Ensure bold, crisp, punchy weights.

### Geometry & Shape:
- **Cards**: `border-radius: 20px–24px` with smooth glassmorphism.
- **Pills & Chips**: `border-radius: 9999px` (search bars, status chips, badges).
- **Buttons & Inputs**: `border-radius: 12px` with glowing focus rings (`box-shadow: 0 0 0 3px var(--s-primary-glow)`).
- *Avoid sharp 90-degree box corners.*

### Icons:
- **Always use modern vector SVG icons** (Lucide / Feather style with `stroke="currentColor"`, `stroke-width="2"` or `2.2`, `stroke-linecap="round"`).
- **Never use emoji characters** (like ⛅, 📅, ✨) in the UI.

---

## 4. Key IPC Methods Reference

`window.electronAPI` provides:
- **Tabs**: `createTab(url)`, `closeTab(tabId)`, `switchTab(tabId)`, `requestInitialTabs()`
- **Navigation**: `navigateTo(tabId, url)`, `goBack()`, `goForward()`, `reload()`, `goHome()`
- **Window**: `windowClose()`, `windowMinimize()`, `windowMaximize()`
- **Settings**: `loadSettings()`, `saveSettings(data)`, `loadWallpaper()`, `saveWallpaper(dataUrl)`
- **Passwords**: `loadPasswords()`, `savePassword(entry)`, `deletePassword(id)`
- **History & Favorites**: `loadHistory()`, `addHistory(entry)`, `deleteHistoryItem(url)`, `clearHistory()`, `loadFavorites()`, `saveFavorites(data)`, `toggleFavorite(entry)`
- **Events**: `onPageTitleUpdated(cb)`, `onPageUrlUpdated(cb)`, `onPageLoading(cb)`, `onPageFaviconUpdated(cb)`, `onThemeUpdated(cb)`, `onShellReady(cb)`

---

## 5. Development & Testing Workflow

1. **Syntax Check**: Run `node -c main.js; node -c preload.js; node -c renderer.js; node -c newtab.js; node -c settings.js; node -c sidepanel.js` in PowerShell.
2. **Launch App**: Run `./start.bat` or `npx electron .`.
3. **Internal URLs**:
   - `ebium://yeni-sekme` -> loads `newtab.html`
   - `ebium://ayarlar` -> loads `settings.html`
