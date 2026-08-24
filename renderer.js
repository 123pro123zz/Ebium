/* ================================================================
   Ebium Browser — Renderer Process (Tabs, Navigation & Chrome)
   ================================================================ */

(() => {
  'use strict';

  const api = window.electronAPI;
  if (!api) {
    console.error('Electron API not found in renderer!');
    return;
  }

  /* ── DOM Elements ────────────────────────────────────────── */
  const $tabsContainer = document.getElementById('tabs-container');
  const $newTabBtn     = document.getElementById('new-tab-btn');
  const $addressBar    = document.getElementById('address-bar');
  const $btnBack       = document.getElementById('btn-back');
  const $btnForward    = document.getElementById('btn-forward');
  const $btnReload     = document.getElementById('btn-reload');
  const $btnHome       = document.getElementById('btn-home');
  const $btnFavorite   = document.getElementById('btn-favorite');
  const $btnSettings   = document.getElementById('btn-settings');
  const $btnMainMenu   = document.getElementById('btn-main-menu');

  /* ── State ───────────────────────────────────────────────── */
  let activeTabId = null;
  const tabMeta = new Map(); // tabId -> { title, url, favicon }
  let currentSearchEngine = 'google';
  let favorites = [];

  const SEARCH_URLS = {
    google:     'https://www.google.com/search?q=',
    bing:       'https://www.bing.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q='
  };

  /* ── Theme helpers ───────────────────────────────────────── */
  function applyAccentColor(color) {
    if (!color) return;
    const r = document.documentElement;
    r.style.setProperty('--primary-color', color);
  }

  /* ── Tab DOM helpers ─────────────────────────────────────── */
  function createTabElement(tabId, initialTitle = 'Yeni Sekme') {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.tabId = tabId;

    tab.innerHTML = `
      <div class="tab-favicon-placeholder"></div>
      <span class="tab-title">${escapeHtml(initialTitle)}</span>
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
    tab.querySelector('.tab-close')?.addEventListener('click', (e) => {
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
    if (meta && meta.url && !meta.url.includes('newtab.html') && !meta.url.includes('ebium://yeni-sekme')) {
      if ($addressBar) $addressBar.value = meta.url;
      updateFavoriteButton(meta.url);
    } else {
      if ($addressBar) $addressBar.value = '';
      if ($btnFavorite) $btnFavorite.classList.remove('is-favorite');
    }
    activeTabId = tabId;
  }

  /* ── Tab actions ─────────────────────────────────────────── */
  async function createNewTab(url = 'ebium://yeni-sekme') {
    const tabId = await api.createTab(url);
    const title = url.includes('ayarlar') ? 'Ayarlar' : 'Yeni Sekme';
    tabMeta.set(tabId, { title, url, favicon: null });
    const el = createTabElement(tabId, title);
    if ($tabsContainer) $tabsContainer.appendChild(el);
    setActiveTabUI(tabId);
  }

  async function closeTab(tabId) {
    const newActiveId = await api.closeTab(tabId);
    tabMeta.delete(tabId);
    const el = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (el) el.remove();

    if (newActiveId && tabMeta.has(newActiveId)) {
      setActiveTabUI(newActiveId);
    } else if (document.querySelectorAll('.tab').length === 0) {
      await createNewTab('ebium://yeni-sekme');
    }
  }

  async function switchToTab(tabId) {
    const res = await api.switchTab(tabId);
    const meta = tabMeta.get(tabId) || {};
    if (res) {
      meta.url = res.url || meta.url;
      meta.title = res.title || meta.title;
    }
    tabMeta.set(tabId, meta);
    setActiveTabUI(tabId);
  }

  /* ── Navigation ──────────────────────────────────────────── */
  function isUrl(input) {
    if (/^https?:\/\//i.test(input)) return true;
    if (/^ebium:\/\//i.test(input)) return true;
    if (/^[^\s]+\.[^\s]+$/.test(input)) return true;
    return false;
  }

  function buildUrl(input) {
    const trimmed = (input || '').trim();
    if (!trimmed) return null;

    if (isUrl(trimmed)) {
      return (/^https?:\/\//i.test(trimmed) || /^ebium:\/\//i.test(trimmed))
        ? trimmed
        : `https://${trimmed}`;
    }

    return (SEARCH_URLS[currentSearchEngine] || SEARCH_URLS.google) + encodeURIComponent(trimmed);
  }

  async function navigateToInput() {
    if (!$addressBar || !activeTabId) return;
    const url = buildUrl($addressBar.value);
    if (!url) return;
    $addressBar.value = url;
    await api.navigateTo(activeTabId, url);
    const meta = tabMeta.get(activeTabId) || {};
    meta.url = url;
    tabMeta.set(activeTabId, meta);
    $addressBar.blur();
  }

  /* ── Favorites ───────────────────────────────────────────── */
  function updateFavoriteButton(url) {
    if (!$btnFavorite) return;
    const isFav = favorites.some(f => f.url === url);
    $btnFavorite.classList.toggle('is-favorite', isFav);
  }

  async function toggleCurrentFavorite() {
    if (!activeTabId) return;
    const meta = tabMeta.get(activeTabId);
    if (!meta || !meta.url || meta.url.startsWith('ebium://') || meta.url.includes('newtab.html')) return;
    favorites = await api.toggleFavorite({ url: meta.url, title: meta.title || meta.url });
    updateFavoriteButton(meta.url);
  }

  /* ── Utility ─────────────────────────────────────────────── */
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  /* ── Event wiring ────────────────────────────────────────── */

  // Window Controls
  document.getElementById('win-close')?.addEventListener('click', () => api.windowClose());
  document.getElementById('win-minimize')?.addEventListener('click', () => api.windowMinimize());
  document.getElementById('win-maximize')?.addEventListener('click', () => api.windowMaximize());

  // New tab button
  $newTabBtn?.addEventListener('click', () => createNewTab('ebium://yeni-sekme'));

  // Address bar Enter & Focus
  $addressBar?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigateToInput();
  });

  $addressBar?.addEventListener('focus', () => {
    setTimeout(() => $addressBar.select(), 50);
  });

  // Navigation buttons
  $btnBack?.addEventListener('click', () => api.goBack());
  $btnForward?.addEventListener('click', () => api.goForward());
  $btnReload?.addEventListener('click', () => api.reload());
  $btnHome?.addEventListener('click', () => api.goHome());

  // Favorite button
  $btnFavorite?.addEventListener('click', () => toggleCurrentFavorite());

  // Settings & Main Menu
  $btnSettings?.addEventListener('click', () => createNewTab('ebium://ayarlar'));
  $btnMainMenu?.addEventListener('click', () => createNewTab('ebium://yeni-sekme'));

  // Keyboard shortcuts: Ctrl/Cmd+T, Ctrl/Cmd+W, Ctrl/Cmd+L, Ctrl/Cmd+R
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 't') {
      e.preventDefault();
      createNewTab('ebium://yeni-sekme');
    } else if (mod && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      if (activeTabId) closeTab(activeTabId);
    } else if (mod && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      $addressBar?.focus();
    } else if (mod && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      api.reload();
    }
  });

  /* ── IPC event listeners (from Main) ─────────────────────── */
  api.onPageTitleUpdated(({ tabId, title }) => {
    const meta = tabMeta.get(tabId) || {};
    meta.title = title;
    tabMeta.set(tabId, meta);

    const el = document.querySelector(`.tab[data-tab-id="${tabId}"] .tab-title`);
    if (el) el.textContent = title || 'Yeni Sekme';
  });

  api.onPageUrlUpdated(({ tabId, url }) => {
    const meta = tabMeta.get(tabId) || {};
    meta.url = url;
    tabMeta.set(tabId, meta);

    if (tabId === activeTabId && $addressBar) {
      if (url.startsWith('file://') || url.includes('newtab.html') || url === 'ebium://yeni-sekme') {
        $addressBar.value = '';
      } else if (url.includes('settings.html') || url === 'ebium://ayarlar') {
        $addressBar.value = 'ebium://ayarlar';
      } else {
        $addressBar.value = url;
      }
      updateFavoriteButton(url);
    }
  });

  api.onPageLoading(({ tabId, loading }) => {
    const el = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (el) el.classList.toggle('loading', !!loading);
  });

  api.onPageFaviconUpdated(({ tabId, favicon }) => {
    const meta = tabMeta.get(tabId) || {};
    meta.favicon = favicon;
    tabMeta.set(tabId, meta);

    const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (!tabEl) return;

    const placeholder = tabEl.querySelector('.tab-favicon-placeholder');
    const existing = tabEl.querySelector('.tab-favicon');

    if (favicon) {
      if (existing) {
        existing.src = favicon;
      } else {
        const img = document.createElement('img');
        img.className = 'tab-favicon';
        img.src = favicon;
        img.onerror = () => {
          img.remove();
          if (!tabEl.querySelector('.tab-favicon-placeholder')) {
            const ph = document.createElement('div');
            ph.className = 'tab-favicon-placeholder';
            tabEl.insertBefore(ph, tabEl.querySelector('.tab-title'));
          }
        };
        if (placeholder) placeholder.replaceWith(img);
        else tabEl.insertBefore(img, tabEl.querySelector('.tab-title'));
      }
    }
  });

  /* ── Initialization ──────────────────────────────────────── */
  async function init() {
    try {
      // Load persisted settings
      const settings = (await api.loadSettings()) || {};
      if (settings.accentColor) applyAccentColor(settings.accentColor);
      if (settings.searchEngine) currentSearchEngine = settings.searchEngine;

      if (api.onThemeUpdated) {
        api.onThemeUpdated((data) => {
          if (data.accentColor) applyAccentColor(data.accentColor);
          if (data.searchEngine) currentSearchEngine = data.searchEngine;
        });
      }

      // Load favorites
      favorites = (await api.loadFavorites()) || [];

      // Request initial tabs from main process
      if (api.requestInitialTabs) {
        const initialTabs = await api.requestInitialTabs();
        if (initialTabs && initialTabs.length > 0) {
          if ($tabsContainer) $tabsContainer.innerHTML = '';
          for (const { tabId, url } of initialTabs) {
            const isSettings = (url || '').includes('settings.html') || url === 'ebium://ayarlar';
            const title = isSettings ? 'Ayarlar' : 'Yeni Sekme';
            tabMeta.set(tabId, { title, url: url || 'ebium://yeni-sekme', favicon: null });
            const el = createTabElement(tabId, title);
            if ($tabsContainer) $tabsContainer.appendChild(el);
          }
          const lastTabId = initialTabs[initialTabs.length - 1].tabId;
          setActiveTabUI(lastTabId);
        } else {
          // Fallback: create default tab
          await createNewTab('ebium://yeni-sekme');
        }
      }

      // Update Modal
      if (api.onUpdateAvailable) {
        api.onUpdateAvailable(() => {
          const modal = document.getElementById('update-modal');
          if (modal) modal.classList.remove('hidden');
        });

        const btnAccept = document.getElementById('btn-update-accept');
        const btnReject = document.getElementById('btn-update-reject');
        const updateModal = document.getElementById('update-modal');

        btnAccept?.addEventListener('click', () => {
          api.acceptUpdate();
          const content = updateModal?.querySelector('.modal-content');
          if (content) {
            content.innerHTML = `<h2>Güncelleniyor...</h2><p>Lütfen bekleyin, Ebium arka planda son sürümü indirip otomatik olarak yeniden başlatılacak.</p>`;
          }
        });

        btnReject?.addEventListener('click', () => {
          updateModal?.classList.add('hidden');
        });
      }
    } catch (err) {
      console.error('Startup Error:', err);
    }
  }

  let initCalled = false;
  async function safeInit() {
    if (initCalled) return;
    initCalled = true;
    await init();
  }

  if (api.onShellReady) {
    api.onShellReady(safeInit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
  } else {
    setTimeout(safeInit, 50);
  }
})();
