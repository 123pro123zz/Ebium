/* ================================================================
   Buğlem Browser — Renderer (Tab management, Navigation, Settings)
   ================================================================ */

(() => {
  'use strict';

  const api = window.electronAPI;

  /* ── DOM refs ───────────────────────────────────────────── */
  const $tabsContainer = document.getElementById('tabs-container');
  const $newTabBtn      = document.getElementById('new-tab-btn');
  const $addressBar     = document.getElementById('address-bar');
  const $btnBack        = document.getElementById('btn-back');
  const $btnForward     = document.getElementById('btn-forward');
  const $btnReload      = document.getElementById('btn-reload');
  const $btnHome        = document.getElementById('btn-home');
  const $btnFavorite    = document.getElementById('btn-favorite');
  const $btnSettings    = document.getElementById('btn-settings');
  
  /* ── State ──────────────────────────────────────────────── */
  let activeTabId = null;
  const tabMeta = new Map(); // tabId -> { title, url, favicon }
  let currentSearchEngine = 'google';
  let favorites = [];

  const SEARCH_URLS = {
    google:     'https://www.google.com/search?q=',
    bing:       'https://www.bing.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q='
  };

  /* ── Theme helpers ──────────────────────────────────────── */
  function applyAccentColor(color) {
    const r = document.documentElement;
    r.style.setProperty('--primary-color', color);

    // Derive hover (darken 15%)
    const hsl = hexToHSL(color);
    if (hsl) {
      const hoverL = Math.max(0, hsl.l - 12);
      r.style.setProperty('--primary-hover', `hsl(${hsl.h}, ${hsl.s}%, ${hoverL}%)`);
      r.style.setProperty('--primary-glow', `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.25)`);
    }

    // Update swatch UI
    document.querySelectorAll('.swatch').forEach(sw => {
      sw.classList.toggle('selected', sw.dataset.color === color);
    });
    const cInput = document.getElementById('custom-accent-color');
    if (cInput) cInput.value = color;
  }

  /* Dynamic theme logic removed for simplified dark mode. */

  function rgbToHslObj(rgb) {
    const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hexToHSL(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  /* ── Tab DOM helpers ────────────────────────────────────── */
  function createTabElement(tabId) {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.tabId = tabId;

    tab.innerHTML = `
      <div class="tab-favicon-placeholder"></div>
      <span class="tab-title">Yeni Sekme</span>
      <button class="tab-close" title="Kapat">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div class="tab-loading"></div>
    `;

    // Switch tab
    tab.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) return;
      switchToTab(tabId);
    });

    // Close tab
    tab.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tabId);
    });

    return tab;
  }

  function setActiveTabUI(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const el = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (el) el.classList.add('active');

    const meta = tabMeta.get(tabId);
    if (meta && meta.url && !meta.url.includes('newtab.html')) {
      $addressBar.value = meta.url;
      updateFavoriteButton(meta.url);
    } else {
      $addressBar.value = '';
      $btnFavorite.classList.remove('is-favorite');
    }
    activeTabId = tabId;
  }

  /* ── Tab actions ────────────────────────────────────────── */
  async function createNewTab(url) {
    const tabId = await api.createTab(url || undefined);
    tabMeta.set(tabId, { title: 'Yeni Sekme', url: url || 'https://www.google.com', favicon: null });
    const el = createTabElement(tabId);
    $tabsContainer.appendChild(el);
    setActiveTabUI(tabId);
    $addressBar.focus();
    $addressBar.select();
  }

  async function closeTab(tabId) {
    const newActiveId = await api.closeTab(tabId);
    tabMeta.delete(tabId);
    const el = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (el) el.remove();

    if (newActiveId) {
      setActiveTabUI(newActiveId);
    } else {
      // No more tabs – create a fresh one
      await createNewTab();
    }
  }

  async function switchToTab(tabId) {
    const { url, title } = await api.switchTab(tabId);
    const meta = tabMeta.get(tabId) || {};
    meta.url = url;
    meta.title = title;
    tabMeta.set(tabId, meta);
    setActiveTabUI(tabId);
  }

  /* ── Navigation ─────────────────────────────────────────── */
  function isUrl(input) {
    // If it starts with a protocol, it's a URL
    if (/^https?:\/\//i.test(input)) return true;
    // If it has a dot and no spaces, treat as domain
    if (/^[^\s]+\.[^\s]+$/.test(input)) return true;
    return false;
  }

  function buildUrl(input) {
    const trimmed = input.trim();
    if (!trimmed) return null;

    if (isUrl(trimmed)) {
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    }

    // Search query
    return SEARCH_URLS[currentSearchEngine] + encodeURIComponent(trimmed);
  }

  async function navigateToInput() {
    const url = buildUrl($addressBar.value);
    if (!url || !activeTabId) return;
    $addressBar.value = url; // Instant UI feedback
    await api.navigateTo(activeTabId, url);
    const meta = tabMeta.get(activeTabId) || {};
    meta.url = url;
    tabMeta.set(activeTabId, meta);
    $addressBar.blur();
  }

  /* ── Favorites ──────────────────────────────────────────── */
  function updateFavoriteButton(url) {
    const isFav = favorites.some(f => f.url === url);
    $btnFavorite.classList.toggle('is-favorite', isFav);
  }

  async function toggleCurrentFavorite() {
    if (!activeTabId) return;
    const meta = tabMeta.get(activeTabId);
    if (!meta || !meta.url) return;
    favorites = await api.toggleFavorite({ url: meta.url, title: meta.title || meta.url });
    updateFavoriteButton(meta.url);
    renderFavorites();
  }

  function renderFavorites() {
    if (favorites.length === 0) {
      $favoritesList.innerHTML = '<p class="empty-msg">Henüz favori yok.</p>';
      return;
    }
    $favoritesList.innerHTML = favorites.map((f, i) => `
      <div class="list-item" data-idx="${i}" data-url="${escapeAttr(f.url)}">
        <span class="list-item-title">${escapeHtml(f.title || f.url)}</span>
        <span class="list-item-url">${escapeHtml(trimUrl(f.url))}</span>
        <button class="list-item-remove" data-action="remove-fav" data-idx="${i}">&#10005;</button>
      </div>
    `).join('');

    // Click to navigate
    $favoritesList.querySelectorAll('.list-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.list-item-remove')) return;
        const url = el.dataset.url;
        if (activeTabId) api.navigateTo(activeTabId, url);
        closeSettings();
      });
    });

    // Remove button
    $favoritesList.querySelectorAll('[data-action="remove-fav"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        const entry = favorites[idx];
        if (entry) {
          favorites = await api.toggleFavorite(entry);
          renderFavorites();
          if (activeTabId) updateFavoriteButton(tabMeta.get(activeTabId)?.url);
        }
      });
    });
  }

  /* ── History ────────────────────────────────────────────── */
  async function renderHistory() {
    const history = await api.loadHistory();
    if (!history || history.length === 0) {
      $historyList.innerHTML = '<p class="empty-msg">Henüz geçmiş yok.</p>';
      return;
    }
    const recent = history.slice(0, 50);
    $historyList.innerHTML = recent.map(h => `
      <div class="list-item" data-url="${escapeAttr(h.url)}">
        <span class="list-item-title">${escapeHtml(h.title || h.url)}</span>
        <span class="list-item-url">${escapeHtml(trimUrl(h.url))}</span>
      </div>
    `).join('');

    $historyList.querySelectorAll('.list-item').forEach(el => {
      el.addEventListener('click', () => {
        if (activeTabId) api.navigateTo(activeTabId, el.dataset.url);
        closeSettings();
      });
    });
  }

  /* ── Settings Panel ─────────────────────────────────────── */
  async function openSettings() {
    await api.hideViews();
    $settingsPanel.classList.remove('hidden');
    $settingsBackdrop.classList.remove('hidden');
    renderFavorites();
    renderHistory();
  }

  async function closeSettings() {
    $settingsPanel.classList.add('hidden');
    $settingsBackdrop.classList.add('hidden');
    await api.showActiveView();
  }

  /* ── Utility ────────────────────────────────────────────── */
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function trimUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname !== '/' ? u.pathname : '');
    } catch { return url; }
  }

  /* ── Event wiring ───────────────────────────────────────── */

  // Window Controls
  document.getElementById('win-close').addEventListener('click', () => api.windowClose());
  document.getElementById('win-minimize').addEventListener('click', () => api.windowMinimize());
  document.getElementById('win-maximize').addEventListener('click', () => api.windowMaximize());

  // New tab
  $newTabBtn.addEventListener('click', () => createNewTab());

  // Address bar Enter
  $addressBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigateToInput();
  });

  // Select-all on focus
  $addressBar.addEventListener('focus', () => {
    setTimeout(() => $addressBar.select(), 50);
  });

  // Navigation buttons
  $btnBack.addEventListener('click', () => api.goBack());
  $btnForward.addEventListener('click', () => api.goForward());
  $btnReload.addEventListener('click', () => api.reload());
  $btnHome.addEventListener('click', () => api.goHome());

  // Favorite
  $btnFavorite.addEventListener('click', () => toggleCurrentFavorite());

  // Settings / Main Menu
  const btnSettings = document.getElementById('btn-settings');
  if (btnSettings) btnSettings.addEventListener('click', () => createNewTab('ebium://ayarlar'));
  
  const btnMainMenu = document.getElementById('btn-main-menu');
  if (btnMainMenu) btnMainMenu.addEventListener('click', () => createNewTab('ebium://ayarlar'));

  // Custom color
  $customColor.addEventListener('input', (e) => {
    applyAccentColor(e.target.value);
    api.saveSettings({ accentColor: e.target.value });
  });

  // Search engine radios
  document.querySelectorAll('input[name="search-engine"]').forEach(radio => {
    radio.addEventListener('change', () => {
      currentSearchEngine = radio.value;
      api.saveSettings({ searchEngine: radio.value });
    });
  });

  // Keyboard shortcut: Ctrl/Cmd+T new tab, Ctrl/Cmd+W close tab, Ctrl/Cmd+L focus address bar
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 't') { e.preventDefault(); createNewTab(); }
    if (mod && e.key === 'w') { e.preventDefault(); if (activeTabId) closeTab(activeTabId); }
    if (mod && e.key === 'l') { e.preventDefault(); $addressBar.focus(); }
    if (mod && e.key === 'u') { e.preventDefault(); if(api.checkUpdateTest) api.checkUpdateTest(); }
  });

  /* ── IPC event listeners (from Main) ────────────────────── */
  api.onPageTitleUpdated(({ tabId, title }) => {
    const meta = tabMeta.get(tabId) || {};
    meta.title = title;
    tabMeta.set(tabId, meta);

    const el = document.querySelector(`.tab[data-tab-id="${tabId}"] .tab-title`);
    if (el) el.textContent = title;
  });

  api.onPageUrlUpdated(({ tabId, url }) => {
    const meta = tabMeta.get(tabId) || {};
    meta.url = url;
    tabMeta.set(tabId, meta);

    if (tabId === activeTabId) {
      if ($addressBar.value !== url) {
        $addressBar.value = url;
        // Anti-DOM blockade hack for rapid typing -> navigate instances
        setTimeout(() => {
          if ($addressBar.value !== url && tabId === activeTabId) {
            $addressBar.value = url;
          }
        }, 15);
        setTimeout(() => {
          if ($addressBar.value !== url && tabId === activeTabId) {
            $addressBar.value = url;
          }
        }, 50);
        setTimeout(() => {
          if ($addressBar.value !== url && tabId === activeTabId) {
            $addressBar.value = url;
          }
        }, 300);
      }
      updateFavoriteButton(url);
    }
  });

  api.onPageLoading(({ tabId, loading }) => {
    const el = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (el) el.classList.toggle('loading', loading);
  });

  api.onPageFaviconUpdated(({ tabId, favicon }) => {
    const meta = tabMeta.get(tabId) || {};
    meta.favicon = favicon;
    tabMeta.set(tabId, meta);

    const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (!tabEl) return;

    const placeholder = tabEl.querySelector('.tab-favicon-placeholder');
    const existing = tabEl.querySelector('.tab-favicon');

    if (existing) {
      existing.src = favicon;
    } else if (placeholder) {
      const img = document.createElement('img');
      img.className = 'tab-favicon';
      img.src = favicon;
      img.onerror = () => {
        img.remove();
        const ph = document.createElement('div');
        ph.className = 'tab-favicon-placeholder';
        tabEl.insertBefore(ph, tabEl.querySelector('.tab-title'));
      };
      placeholder.replaceWith(img);
    }
  });

  /* ── Initialization ─────────────────────────────────────── */

  async function init() {
    // Load persisted settings
    const settings = await api.loadSettings();
    if (settings.accentColor) applyAccentColor(settings.accentColor);
    if (settings.searchEngine) {
      currentSearchEngine = settings.searchEngine;
      const radio = document.querySelector(`input[name="search-engine"][value="${settings.searchEngine}"]`);
      if (radio) radio.checked = true;
    }

    // Load favorites
    favorites = (await api.loadFavorites()) || [];

    // Request the initial tabs from the main process. This guarantees
    // the main process has fully setup the BrowserViews before we render UI.
    if (api.requestInitialTabs) {
      const initialTabs = await api.requestInitialTabs();
      for (const { tabId, url } of initialTabs) {
        tabMeta.set(tabId, { title: 'Yeni Sekme', url: url || '', favicon: null });
        const el = createTabElement(tabId);
        $tabsContainer.appendChild(el);
      }
      // Activate the last tab
      if (initialTabs.length > 0) {
        const lastTabId = initialTabs[initialTabs.length - 1].tabId;
        setActiveTabUI(lastTabId);
      }
    }

    // Update Modal Bindings
    if (api.onUpdateAvailable) {
      api.onUpdateAvailable((info) => {
        const modal = document.getElementById('update-modal');
        if (modal) modal.classList.remove('hidden');
      });
      
      const btnAccept = document.getElementById('btn-update-accept');
      const btnReject = document.getElementById('btn-update-reject');
      const updateModal = document.getElementById('update-modal');
      
      if (btnAccept && btnReject && updateModal) {
        btnAccept.addEventListener('click', () => {
          api.acceptUpdate();
          const content = updateModal.querySelector('.modal-content');
          if (content) {
            content.innerHTML = `<h2>Güncelleniyor...</h2><p>Lütfen bekleyin, Ebium arka planda son sürümü indirip otomatik olarak yeniden başlatılacak.</p>`;
          }
        });
        btnReject.addEventListener('click', () => {
          updateModal.classList.add('hidden');
        });
      }
    }
  }

  // Wait for main process to confirm the window is ready before running init().
  let initCalled = false;
  async function safeInit() {
    if (initCalled) return;
    initCalled = true;
    try {
      await init();
    } catch (err) {
      alert("STARTUP ERROR: " + err.message + "\n" + err.stack);
    }
  }

  if (api && api.onShellReady) {
    api.onShellReady(safeInit);
  }
  // Fallback: if shell-ready was missed, still init after 1 second
  setTimeout(safeInit, 1000);
})();
