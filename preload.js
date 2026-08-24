const { contextBridge, ipcRenderer } = require('electron');

if (window.location.protocol === 'file:') {
  contextBridge.exposeInMainWorld('electronAPI', {
    /* ── Tab management ──────────────────────────────────────── */
  createTab: (url) => ipcRenderer.invoke('create-tab', url),
  closeTab: (tabId) => ipcRenderer.invoke('close-tab', tabId),
  switchTab: (tabId) => ipcRenderer.invoke('switch-tab', tabId),

  /* ── Navigation ──────────────────────────────────────────── */
  navigateTo: (tabId, url) => ipcRenderer.invoke('navigate-to', { tabId, url }),
  goBack: () => ipcRenderer.invoke('go-back'),
  goForward: () => ipcRenderer.invoke('go-forward'),
  reload: () => ipcRenderer.invoke('reload'),
  goHome: () => ipcRenderer.invoke('go-home'),

  /* ── Window Controls ─────────────────────────────────────── */
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),

  /* ── View Controls ───────────────────────────────────────── */
  hideViews: () => ipcRenderer.invoke('hide-views'),
  showActiveView: () => ipcRenderer.invoke('show-active-view'),
  toggleSidePanel: (isOpen) => ipcRenderer.invoke('toggle-side-panel', isOpen),

  /* ── Settings ────────────────────────────────────────────── */
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  saveWallpaper: (dataUrl) => ipcRenderer.invoke('save-wallpaper', dataUrl),
  loadWallpaper: () => ipcRenderer.invoke('load-wallpaper'),
  
  /* ── Performance ─────────────────────────────────────────── */
  freeMemory: () => ipcRenderer.invoke('free-memory'),

  /* ── Password Manager ─────────────────────────────────────── */
  loadPasswords: () => ipcRenderer.invoke('load-passwords'),
  savePassword: (entry) => ipcRenderer.invoke('save-password', entry),
  deletePassword: (id) => ipcRenderer.invoke('delete-password', id),

  /* ── Favorites & History ─────────────────────────────────── */
  loadFavorites: () => ipcRenderer.invoke('load-favorites'),
  saveFavorites: (data) => ipcRenderer.invoke('save-favorites', data),
  toggleFavorite: (entry) => ipcRenderer.invoke('toggle-favorite', entry),
  loadHistory: () => ipcRenderer.invoke('load-history'),
  addHistory: (entry) => ipcRenderer.invoke('add-history', entry),
  deleteHistoryItem: (url) => ipcRenderer.invoke('delete-history-item', url),
  clearHistory: () => ipcRenderer.invoke('clear-history'),


  /* ── Events from main → renderer ─────────────────────────── */
  onPageTitleUpdated: (cb) => ipcRenderer.on('page-title-updated', (_e, data) => cb(data)),
  onPageUrlUpdated: (cb) => ipcRenderer.on('page-url-updated', (_e, data) => cb(data)),
  onPageLoading: (cb) => ipcRenderer.on('page-loading', (_e, data) => cb(data)),
  onPageFaviconUpdated: (cb) => ipcRenderer.on('page-favicon-updated', (_e, data) => cb(data)),
  onThemeUpdated: (cb) => ipcRenderer.on('theme-updated', (_e, data) => cb(data)),

  /* ── Updater ─────────────────────────────────────────────── */
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_e, data) => cb(data)),
  acceptUpdate: () => ipcRenderer.invoke('accept-update'),
  checkUpdateTest: () => ipcRenderer.invoke('check-update-test'),

  /* ── Shell lifecycle ─────────────────────────────────────── */
  onShellReady: (cb) => ipcRenderer.once('shell-ready', () => cb()),
  requestInitialTabs: () => ipcRenderer.invoke('request-initial-tabs')
  });
}

