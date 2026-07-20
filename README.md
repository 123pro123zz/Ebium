# 🚀 Ebium Browser

**Ebium** is a fast, highly customizable, Electron-powered web browser built for modern web navigation, performance optimization, and custom aesthetics.

---

## ✨ Features

- **⚡ Gamer Mode**: Background tab throttling to maximize CPU and GPU performance for gaming.
- **🛡️ Built-in Ad Blocker**: Seamlessly block intrusive ads and tracker scripts for faster page load times.
- **🎨 Deep Customization**: Custom themes, accent colors, background colors, and custom wallpaper support.
- **📑 Tab Management**: Ultra-responsive tab system with context menus, tab restoring, and inspect element functionality.
- **🔍 Custom Search Engines**: Easily switch between Google, DuckDuckGo, Bing, and custom search providers.
- **⭐️ Favorites & History**: Persistent local storage for bookmarks and browsing history.
- **🧹 Memory Cleaner**: Built-in memory optimization to clear shader caches and service worker data on demand.

---

## 🛠️ Built With

- **Framework**: [Electron](https://www.electronjs.org/) (v33.4.11)
- **Packaging**: [Electron Builder](https://www.electron.build/)
- **State Management**: `electron-store`
- **Languages**: HTML5, CSS3, JavaScript (ES6+), Node.js

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/123pro123zz/Ebium.git
   cd Ebium
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application in development mode**:
   ```bash
   npm start
   ```

4. **Build Windows executable**:
   ```bash
   npm run build
   ```

---

## 📂 Project Structure

```
Ebium/
├── main.js           # Electron main process & IPC handlers
├── preload.js        # Context bridge & secure API exposure
├── renderer.js       # Shell UI logic & tab orchestration
├── index.html        # Main browser window structure
├── styles.css        # Core styling & UI components
├── newtab.html / .js # Custom start page & inspirational quotes
├── settings.html/.js # Preferences, themes, and ad blocker config
├── sidepanel.js      # Utility sidepanel logic
└── package.json      # Project dependencies & build config
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
