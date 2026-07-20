const { app, BrowserWindow, BrowserView, ipcMain, session, Menu, MenuItem, clipboard } = require('electron');
const { autoUpdater } = require("electron-updater");
const path = require('path');
const fs = require('fs');

/* ── Simple JSON Store ───────────────────────────────────── */
class SimpleStore {
  constructor(defaults = {}) {
    this.filePath = path.join(app.getPath('userData'), 'buglem-settings.json');
    this.defaults = defaults;
    this.data = { ...defaults };
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = { ...this.defaults, ...JSON.parse(raw) };
      }
    } catch (e) {
      this.data = { ...this.defaults };
    }
  }

  _save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) { /* silently fail */ }
  }

  get(key) { return this.data[key]; }

  set(key, value) {
    this.data[key] = value;
    this._save();
  }
}

// Instantiate store immediately to read hardware settings before app is ready
const store = new SimpleStore({
  accentColor: '#007AFF',
  searchEngine: 'google',
  favorites: [],
  history: [],
  disableHWAccel: false,
  gamerMode: false,
  adBlocker: false,
  startupBehavior: 'newtab',
  lastOpenTabs: [],
  themeMode: 'dark',
  backgroundColor: '#0a0a0c',
  surfaceColor: '#1a1a1c',
  textColor: '#e8eaed',
  wallpaperEnabled: false,
  petData: null
});

if (store.get('disableHWAccel')) {
  app.disableHardwareAcceleration();
}

let mainWindow;
const tabs = new Map();
const tabUrls = new Map();

function saveOpenTabs() {
  const openUrls = [];
  for (const [id, url] of tabUrls) {
    if (url && !url.startsWith('file://')) {
      openUrls.push(url);
    }
  }
  store.set('lastOpenTabs', openUrls);
}

let activeTabId = null;
let tabCounter = 0;
let isAppFullScreen = false;
let sidePanelWidth = 0; // 0 = closed, 340 = open

/* ── Window ──────────────────────────────────────────────── */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: store.get('backgroundColor') || '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile('index.html');

  // Once the shell finishes loading, tell the renderer it can initialise.
  // We use a small 150ms delay to guarantee the window is fully painted and 
  // getContentBounds() on Windows returns correct dimensions, not 0x0.
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      mainWindow.webContents.send('shell-ready');
    }, 150);
  });

  mainWindow.on('resize', () => resizeActiveView());
  mainWindow.on('maximize', () => setTimeout(resizeActiveView, 80));
  mainWindow.on('unmaximize', () => setTimeout(resizeActiveView, 80));

  mainWindow.on('enter-html-full-screen', () => { isAppFullScreen = true; setTimeout(resizeActiveView, 50); });
  mainWindow.on('leave-html-full-screen', () => { isAppFullScreen = false; setTimeout(resizeActiveView, 50); });
  mainWindow.on('enter-full-screen', () => { isAppFullScreen = true; setTimeout(resizeActiveView, 50); });
  mainWindow.on('leave-full-screen', () => { isAppFullScreen = false; setTimeout(resizeActiveView, 50); });
}

/* ── BrowserView helpers ─────────────────────────────────── */
const NAV_HEIGHT = 86; // 40px tab-bar + 46px nav-bar

function viewBounds() {
  // SAFEGUARD: On Windows, the initial bounds query might return 0x0
  // before the window is fully painted. We enforce minimum safe dimensions.
  const bounds = mainWindow.getContentBounds();
  let bWidth = bounds.width || 800;
  let bHeight = bounds.height || 600;
  
  // Ensure the width is strictly larger than SidePanel Width
  if (bWidth <= sidePanelWidth) bWidth = 800;

  const yOffset = isAppFullScreen ? 0 : NAV_HEIGHT;
  return {
    x: 0,
    y: yOffset,
    width: Math.floor(bWidth) - sidePanelWidth,
    height: Math.floor(bHeight) - yOffset
  };
}

function resizeActiveView() {
  if (!activeTabId || !tabs.has(activeTabId)) return;
  const view = tabs.get(activeTabId);
  view.setBounds(viewBounds());
}

function createBrowserView(tabId, url) {
  const view = new BrowserView({
    webPreferences: {
      partition: 'persist:ebium',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  tabs.set(tabId, view);
  mainWindow.addBrowserView(view);
  view.setBounds(viewBounds());
  view.setAutoResize({ width: true, height: true });

  const updateUrl = (titleObj = null) => {
    const target = view.webContents.getURL();
    const title = (titleObj && titleObj.title) || view.webContents.getTitle();
    
    if (target && !target.startsWith('ebium://') && !target.startsWith('file://')) {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('page-url-updated', { tabId, url: target });
      tabUrls.set(tabId, target);
      saveOpenTabs();
      
      let history = store.get('history') || [];
      if (!Array.isArray(history)) history = [];
      
      if (history.length > 0 && history[0].url === target) {
        if (title) history[0].title = title;
        history[0].time = Date.now();
      } else {
        history.unshift({ url: target, title: title || target, time: Date.now() });
      }
      history.splice(200);
      store.set('history', history);
    } else if (target && target.startsWith('ebium://')) {
      tabUrls.set(tabId, target);
      saveOpenTabs();
    }
  };

  view.webContents.on('did-navigate', () => updateUrl());
  view.webContents.on('did-navigate-in-page', () => updateUrl());
  view.webContents.on('did-finish-load', () => updateUrl());
  
  view.webContents.on('did-start-navigation', (_e, navUrl, isInPlace, isMainFrame) => {
    if (isMainFrame) {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('page-url-updated', { tabId, url: navUrl });
      tabUrls.set(tabId, navUrl);
      saveOpenTabs();
    }
  });
  
  view.webContents.on('page-title-updated', (_e, title) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('page-title-updated', { tabId, title });
    updateUrl({ title });
  });
  view.webContents.on('did-start-loading', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('page-loading', { tabId, loading: true });
  });
  view.webContents.on('did-stop-loading', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('page-loading', { tabId, loading: false });
  });
  view.webContents.on('page-favicon-updated', (_e, favicons) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('page-favicon-updated', { tabId, favicon: favicons[0] });
  });

  // Context Menu
  view.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();
    
    // Default navigation options
    menu.append(new MenuItem({ label: 'Geri', click: () => view.webContents.goBack(), enabled: view.webContents.canGoBack() }));
    menu.append(new MenuItem({ label: 'İleri', click: () => view.webContents.goForward(), enabled: view.webContents.canGoForward() }));
    menu.append(new MenuItem({ label: 'Yenile', click: () => view.webContents.reload() }));
    menu.append(new MenuItem({ type: 'separator' }));
    
    // Text editing options (if editable)
    if (params.isEditable) {
      menu.append(new MenuItem({ label: 'Geri Al', role: 'undo' }));
      menu.append(new MenuItem({ label: 'İleri Al', role: 'redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ label: 'Kes', role: 'cut' }));
      menu.append(new MenuItem({ label: 'Kopyala', role: 'copy' }));
      menu.append(new MenuItem({ label: 'Yapıştır', role: 'paste' }));
      menu.append(new MenuItem({ label: 'Tümünü Seç', role: 'selectAll' }));
      menu.append(new MenuItem({ type: 'separator' }));
    } else if (params.selectionText) {
      // Just copy if text is selected but not editable
      menu.append(new MenuItem({ label: 'Kopyala', role: 'copy' }));
      menu.append(new MenuItem({ type: 'separator' }));
    }
    
    // Link options
    if (params.linkURL) {
      menu.append(new MenuItem({
        label: 'Bağlantı Adresini Kopyala',
        click: () => clipboard.writeText(params.linkURL)
      }));
      menu.append(new MenuItem({
        label: 'Bağlantıyı İnşa Et (Yeni Sekme)', // Just as user wanted: "Aynı Chrome'daki kadar özellik"
        click: () => {
          const newTabId = `tab-${++tabCounter}`;
          createBrowserView(newTabId, params.linkURL);
          showTab(newTabId); // switches to it
        }
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }
    
    // Image options
    if (params.hasImageContents && params.srcURL) {
      menu.append(new MenuItem({
        label: 'Resmi Kopyala',
        role: 'copyImage'
      }));
      menu.append(new MenuItem({
        label: 'Resim Adresini Kopyala',
        click: () => clipboard.writeText(params.srcURL)
      }));
      menu.append(new MenuItem({
        label: 'Resmi Yeni Sekmede Aç',
        click: () => {
          const newTabId = `tab-${++tabCounter}`;
          createBrowserView(newTabId, params.srcURL);
          showTab(newTabId);
        }
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }
    
    menu.append(new MenuItem({
      label: 'İncele (Inspect)',
      click: () => view.webContents.inspectElement(params.x, params.y)
    }));
    
    menu.popup();
  });

  if (url === 'ebium://yeni-sekme' || !url) {
    view.webContents.loadFile(path.join(__dirname, 'newtab.html'));
  } else if (url === 'ebium://ayarlar') {
    view.webContents.loadFile(path.join(__dirname, 'settings.html'));
  } else {
    view.webContents.loadURL(url);
  }
  return view;
}

function showTab(tabId) {
  if (!tabs.has(tabId)) return;

  for (const [id, v] of tabs) {
    if (id !== tabId) mainWindow.removeBrowserView(v);
  }
  const view = tabs.get(tabId);
  mainWindow.addBrowserView(view);
  view.setBounds(viewBounds());
  activeTabId = tabId;
  applyGamerMode();

  // FIX: Force resize slightly later. The very first BrowserView sometimes
  // gets dimensions of 0 if queried too early during window startup.
  setTimeout(() => {
    if (activeTabId === tabId) {
      view.setBounds(viewBounds());
    }
  }, 200);
}

/* ── Gamer & Performance Systems ──────────────────────────── */
const adDomains = ['doubleclick.net', 'googleadservices.com', 'googlesyndication.com', 'adsystem.com', 'analytics.yahoo.com', 'google-analytics.com'];

function applyAdBlocker() {
  if (!session.defaultSession) return;
  const filter = { urls: ['*://*/*'] };
  session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    if (store.get('adBlocker')) {
      const url = details.url.toLowerCase();
      if (adDomains.some(d => url.includes(d))) {
        return callback({ cancel: true });
      }
    }
    callback({ cancel: false });
  });
}

function applyGamerMode() {
  const isGamer = store.get('gamerMode');
  for (const [id, view] of tabs) {
    if (isGamer && id !== activeTabId) {
       view.webContents.setBackgroundThrottling(true);
    } else {
       view.webContents.setBackgroundThrottling(false);
    }
  }
}

/* ── IPC handlers ────────────────────────────────────────── */
ipcMain.handle('free-memory', async () => {
  try {
    if (session.defaultSession) {
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'shadercache'] });
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
});

let initialTabsCreated = false;
ipcMain.handle('request-initial-tabs', () => {
  if (initialTabsCreated) return [];
  initialTabsCreated = true;

  const behavior = store.get('startupBehavior');
  const lastTabs = store.get('lastOpenTabs') || [];
  const urlsToOpen = (behavior === 'continue' && lastTabs.length > 0)
    ? lastTabs
    : ['ebium://yeni-sekme'];

  const openedTabs = [];
  for (const url of urlsToOpen) {
    const tabId = `tab-${++tabCounter}`;
    createBrowserView(tabId, url);
    showTab(tabId);
    openedTabs.push({ tabId, url });
  }

  // Small delay before returning so the renderer gets the active tab view immediately
  return openedTabs;
});

ipcMain.handle('create-tab', (_e, url) => {
  const tabId = `tab-${++tabCounter}`;
  createBrowserView(tabId, url);
  showTab(tabId);
  return tabId;
});

ipcMain.handle('close-tab', (_e, tabId) => {
  const view = tabs.get(tabId);
  if (!view) return;
  mainWindow.removeBrowserView(view);

  try {
    if (view.webContents && !view.webContents.isDestroyed()) {
      view.webContents.setAudioMuted(true);
      view.webContents.destroy();
    }
  } catch (e) { console.error('Error destroying webContents:', e); }

  tabs.delete(tabId);
  tabUrls.delete(tabId);
  saveOpenTabs();

  if (activeTabId === tabId) {
    const remaining = [...tabs.keys()];
    if (remaining.length > 0) {
      showTab(remaining[remaining.length - 1]);
      return remaining[remaining.length - 1];
    }
    activeTabId = null;
    return null;
  }
  return activeTabId;
});

ipcMain.handle('switch-tab', (_e, tabId) => {
  showTab(tabId);
  const view = tabs.get(tabId);
  const url = view ? view.webContents.getURL() : '';
  const title = view ? view.webContents.getTitle() : '';
  return { url, title };
});

ipcMain.handle('navigate-to', (_e, { tabId, url }) => {
  const view = tabs.get(tabId);
  if (!view) return;
  if (url === 'ebium://yeni-sekme') {
    view.webContents.loadFile(path.join(__dirname, 'newtab.html'));
  } else if (url === 'ebium://ayarlar') {
    view.webContents.loadFile(path.join(__dirname, 'settings.html'));
  } else {
    view.webContents.loadURL(url);
  }
});

ipcMain.handle('go-back', () => {
  const view = tabs.get(activeTabId);
  if (view && view.webContents.canGoBack()) view.webContents.goBack();
});

ipcMain.handle('go-forward', () => {
  const view = tabs.get(activeTabId);
  if (view && view.webContents.canGoForward()) view.webContents.goForward();
});

ipcMain.handle('reload', () => {
  const view = tabs.get(activeTabId);
  if (view) view.webContents.reload();
});

ipcMain.handle('go-home', () => {
  const view = tabs.get(activeTabId);
  if (view) view.webContents.loadFile(path.join(__dirname, 'newtab.html'));
});

/* ── Window Controls ─────────────────────────────────────── */
ipcMain.handle('window-close', () => {
  mainWindow.close();
});
ipcMain.handle('window-minimize', () => mainWindow.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

/* ── View Controls ───────────────────────────────────────── */
ipcMain.handle('hide-views', () => {
  for (const [id, v] of tabs) mainWindow.removeBrowserView(v);
});
ipcMain.handle('show-active-view', () => {
  if (activeTabId && tabs.has(activeTabId)) {
    const view = tabs.get(activeTabId);
    mainWindow.addBrowserView(view);
    view.setBounds(viewBounds());
  }
});

ipcMain.handle('toggle-side-panel', (_e, isOpen) => {
  sidePanelWidth = isOpen ? 340 : 0;
  resizeActiveView();
  return sidePanelWidth;
});

/* ── Settings / Persistence ──────────────────────────────── */
ipcMain.handle('load-settings', () => ({
  themeMode: store.get('themeMode'),
  backgroundColor: store.get('backgroundColor'),
  surfaceColor: store.get('surfaceColor'),
  textColor: store.get('textColor'),
  accentColor: store.get('accentColor'),
  searchEngine: store.get('searchEngine'),
  disableHWAccel: store.get('disableHWAccel'),
  gamerMode: store.get('gamerMode'),
  adBlocker: store.get('adBlocker'),
  startupBehavior: store.get('startupBehavior'),
  lastOpenTabs: store.get('lastOpenTabs')
}));

ipcMain.handle('save-settings', (_e, data) => {
  if (data.themeMode) {
     store.set('themeMode', data.themeMode);
     const { nativeTheme } = require('electron');
     nativeTheme.themeSource = data.themeMode; // FORCE REPAINT OS FRAME
  }
  if (data.backgroundColor) store.set('backgroundColor', data.backgroundColor);
  if (data.surfaceColor) store.set('surfaceColor', data.surfaceColor);
  if (data.textColor) store.set('textColor', data.textColor);
  if (data.accentColor) store.set('accentColor', data.accentColor);
  if (data.searchEngine) store.set('searchEngine', data.searchEngine);
  if (data.disableHWAccel !== undefined) store.set('disableHWAccel', data.disableHWAccel);
  if (data.gamerMode !== undefined) {
    store.set('gamerMode', data.gamerMode);
    applyGamerMode();
  }
  if (data.adBlocker !== undefined) store.set('adBlocker', data.adBlocker);
  if (data.startupBehavior) store.set('startupBehavior', data.startupBehavior);
  if (data.wallpaperEnabled !== undefined) store.set('wallpaperEnabled', data.wallpaperEnabled);

  mainWindow.setBackgroundColor('#0a0a0c');
  return { success: true };
});

ipcMain.handle('save-wallpaper', async (_e, dataUrl) => {
  try {
    const wallPath = path.join(app.getPath('userData'), 'wallpaper.dat');
    if (!dataUrl) {
      if (fs.existsSync(wallPath)) fs.unlinkSync(wallPath);
      store.set('wallpaperEnabled', false);
      return true;
    }
    fs.writeFileSync(wallPath, dataUrl, 'utf-8');
    store.set('wallpaperEnabled', true);
    return true;
  } catch (e) {
    console.error('save-wallpaper error:', e);
    return false;
  }
});

ipcMain.handle('load-wallpaper', async () => {
  try {
    if (!store.get('wallpaperEnabled')) return null;
    const wallPath = path.join(app.getPath('userData'), 'wallpaper.dat');
    if (fs.existsSync(wallPath)) {
      return fs.readFileSync(wallPath, 'utf-8');
    }
    return null;
  } catch (e) {
    return null;
  }
});

ipcMain.handle('load-favorites', () => store.get('favorites'));
ipcMain.handle('save-favorites', (_e, fav) => store.set('favorites', fav));

ipcMain.handle('load-history', () => store.get('history'));
ipcMain.handle('save-history', (_e, hist) => store.set('history', hist));

ipcMain.handle('add-history', (_e, entry) => {
  const history = store.get('history') || [];
  history.unshift(entry);
  if (history.length > 200) history.length = 200;
  store.set('history', history);
});

ipcMain.handle('clear-history', () => {
  store.set('history', []);
  return true;
});

ipcMain.handle('toggle-favorite', (_e, entry) => {
  let favs = store.get('favorites') || [];
  const idx = favs.findIndex(f => f.url === entry.url);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.unshift(entry);
  store.set('favorites', favs);
  return favs;
});



/* ── Lifecycle ───────────────────────────────────────────── */
app.whenReady().then(() => {
  createWindow();
  if (store.get('adBlocker')) applyAdBlocker();

  // Auto Updater Background Check
  try {
    autoUpdater.autoDownload = false;
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.on('update-available', (info) => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-available', info);
    });
    autoUpdater.on('update-downloaded', () => {
      autoUpdater.quitAndInstall();
    });
  } catch (err) {
    console.log('Update check failed', err);
  }
});

ipcMain.handle('accept-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.handle('check-update-test', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-available', { version: '1.0.3 Test', releaseNotes: 'Custom Update Modal denemesi.' });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
