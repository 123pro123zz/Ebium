'use strict';

/* ================================================================
   Ebium — Settings Dashboard Logic
   Features: General, Search Engine, Startup Tabs, Passwords, History
   ================================================================ */

const api = window.electronAPI;

// ── Toast Notification Helper ──────────────────────────────────
function showToast(message, icon = null) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  const iconHtml = icon || `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  toast.innerHTML = `${iconHtml}<span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 2600);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Tab Switching ──────────────────────────────────────────────
const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');

function switchTab(targetId) {
  navItems.forEach(nav => {
    const isTarget = nav.getAttribute('href') === `#${targetId}`;
    nav.classList.toggle('active', isTarget);
  });

  tabPanes.forEach(pane => {
    const isTarget = pane.id === targetId;
    pane.classList.toggle('active', isTarget);
  });

  if (targetId === 'tab-passwords') loadPasswords();
  if (targetId === 'tab-history') loadHistory();
  if (targetId === 'tab-bookmarks') loadBookmarks();
}

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = item.getAttribute('href').substring(1);
    switchTab(targetId);
    window.location.hash = targetId;
  });
});

// ── 1. General Settings (Engine, Startup, Wallpaper) ───────────
async function initGeneralSettings() {
  if (!api) return;

  const settings = (await api.loadSettings()) || {};

  // 1. Search Engine
  const searchEngineSelect = document.getElementById('search-engine-select');
  if (searchEngineSelect) {
    if (settings.searchEngine) {
      searchEngineSelect.value = settings.searchEngine;
    }
    searchEngineSelect.addEventListener('change', async (e) => {
      const selected = e.target.value;
      await api.saveSettings({ searchEngine: selected });
      showToast(`Varsayılan arama motoru ${selected.toUpperCase()} olarak güncellendi.`);
    });
  }

  // 2. Startup Behavior
  const radioNewtab = document.getElementById('startup-newtab');
  const radioContinue = document.getElementById('startup-continue');

  if (settings.startupBehavior === 'continue') {
    if (radioContinue) radioContinue.checked = true;
  } else {
    if (radioNewtab) radioNewtab.checked = true;
  }

  const handleStartupChange = async (val) => {
    await api.saveSettings({ startupBehavior: val });
    showToast(val === 'continue' ? 'Kaldığınız yerden devam etme modu aktif.' : 'Yeni sekme ile başlama modu aktif.');
  };

  if (radioNewtab) {
    radioNewtab.addEventListener('change', () => {
      if (radioNewtab.checked) handleStartupChange('newtab');
    });
  }
  if (radioContinue) {
    radioContinue.addEventListener('change', () => {
      if (radioContinue.checked) handleStartupChange('continue');
    });
  }

  // 3. Wallpaper Management
  const wallInput = document.getElementById('wallpaper-input');
  const wallPreview = document.getElementById('wallpaper-preview');
  const wallRemove = document.getElementById('wallpaper-remove');

  if (wallPreview && api.loadWallpaper) {
    const existingWall = await api.loadWallpaper();
    if (existingWall) {
      wallPreview.innerHTML = '';
      wallPreview.style.backgroundImage = `url(${existingWall})`;
      wallPreview.style.backgroundSize = 'cover';
      wallPreview.style.backgroundPosition = 'center';
    }
  }

  if (wallInput) {
    wallInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        if (wallPreview) {
          wallPreview.innerHTML = '';
          wallPreview.style.backgroundImage = `url(${dataUrl})`;
          wallPreview.style.backgroundSize = 'cover';
          wallPreview.style.backgroundPosition = 'center';
        }
        if (api.saveWallpaper) {
          await api.saveWallpaper(dataUrl);
          showToast('Özel duvar kağıdı kaydedildi.');
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (wallRemove) {
    wallRemove.addEventListener('click', async () => {
      if (wallPreview) {
        wallPreview.style.backgroundImage = 'none';
        wallPreview.innerHTML = '<span class="wallpaper-placeholder">Varsayılan Obsidian Teması Aktif</span>';
      }
      if (api.saveWallpaper) {
        await api.saveWallpaper(null);
        showToast('Duvar kağıdı kaldırıldı.');
      }
    });
  }
}

// ── 2. Password Manager ────────────────────────────────────────
let cachedPasswords = [];

async function loadPasswords() {
  if (!api || !api.loadPasswords) return;
  const container = document.getElementById('passwords-container');
  const emptyMsg = document.getElementById('passwords-empty');
  if (!container) return;

  cachedPasswords = (await api.loadPasswords()) || [];
  renderPasswords(cachedPasswords);
}

function renderPasswords(list) {
  const container = document.getElementById('passwords-container');
  const emptyMsg = document.getElementById('passwords-empty');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';

  container.innerHTML = list.map(item => {
    const firstLetter = (item.site || 'W').charAt(0).toUpperCase();
    return `
      <div class="password-card-item" data-id="${item.id}">
        <div class="pwd-item-left">
          <div class="pwd-site-icon">${escapeHtml(firstLetter)}</div>
          <div class="pwd-info">
            <div class="pwd-site-name">${escapeHtml(item.site)}</div>
            <div class="pwd-username">${escapeHtml(item.username)}</div>
          </div>
        </div>

        <div class="pwd-item-center">
          <span class="pwd-value-display" data-real="${escapeHtml(item.password)}">••••••••</span>
          <button class="icon-action-btn btn-toggle-pwd" title="Şifreyi Göster / Gizle">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="icon-action-btn btn-copy-pwd" title="Şifreyi Kopyala">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
        </div>

        <div class="pwd-item-actions">
          <button class="icon-action-btn btn-delete btn-del-pwd" title="Şifreyi Sil">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach Event Listeners to each item
  container.querySelectorAll('.password-card-item').forEach(card => {
    const id = card.dataset.id;
    const pwdDisplay = card.querySelector('.pwd-value-display');
    const realPwd = pwdDisplay.dataset.real;

    // Toggle Eye
    const btnToggle = card.querySelector('.btn-toggle-pwd');
    btnToggle?.addEventListener('click', () => {
      if (pwdDisplay.textContent === '••••••••') {
        pwdDisplay.textContent = realPwd;
        btnToggle.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/></svg>`;
      } else {
        pwdDisplay.textContent = '••••••••';
        btnToggle.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
      }
    });

    // Copy Password
    const btnCopy = card.querySelector('.btn-copy-pwd');
    btnCopy?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(realPwd);
        showToast('Şifre panoya kopyalandı!');
      } catch (err) {
        showToast('Kopyalama başarısız oldu.');
      }
    });

    // Delete Password
    const btnDel = card.querySelector('.btn-del-pwd');
    btnDel?.addEventListener('click', async () => {
      if (confirm('Bu kayıtlı şifreyi silmek istediğinizden emin misiniz?')) {
        await api.deletePassword(id);
        showToast('Şifre silindi.');
        loadPasswords();
      }
    });
  });
}

// Filter Passwords
const pwdSearchInput = document.getElementById('pwd-search-input');
if (pwdSearchInput) {
  pwdSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderPasswords(cachedPasswords);
      return;
    }
    const filtered = cachedPasswords.filter(p => 
      (p.site && p.site.toLowerCase().includes(q)) || 
      (p.username && p.username.toLowerCase().includes(q))
    );
    renderPasswords(filtered);
  });
}

// Add Password Modal
const addPwdModal = document.getElementById('add-pwd-modal');
const btnOpenAddPwd = document.getElementById('btn-open-add-pwd');
const btnClosePwdModal = document.getElementById('btn-close-pwd-modal');
const btnCancelPwd = document.getElementById('btn-cancel-pwd');
const addPwdForm = document.getElementById('add-pwd-form');
const pwdInput = document.getElementById('pwd-password');
const btnGeneratePwd = document.getElementById('btn-generate-pwd');
const btnToggleModalPwd = document.getElementById('btn-toggle-modal-pwd');

function openAddPasswordModal() {
  if (!addPwdModal) return;
  addPwdForm?.reset();
  if (pwdInput) pwdInput.type = 'password';
  addPwdModal.classList.remove('hidden');
  document.getElementById('pwd-site')?.focus();
}

function closeAddPasswordModal() {
  if (!addPwdModal) return;
  addPwdModal.classList.add('hidden');
}

btnOpenAddPwd?.addEventListener('click', openAddPasswordModal);
btnClosePwdModal?.addEventListener('click', closeAddPasswordModal);
btnCancelPwd?.addEventListener('click', closeAddPasswordModal);

addPwdModal?.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    closeAddPasswordModal();
  }
});

btnGeneratePwd?.addEventListener('click', () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let generated = '';
  for (let i = 0; i < 16; i++) {
    generated += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (pwdInput) {
    pwdInput.value = generated;
    pwdInput.type = 'text';
    showToast('Güçlü rastgele şifre üretildi!');
  }
});

btnToggleModalPwd?.addEventListener('click', () => {
  if (!pwdInput) return;
  pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
});

addPwdForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const site = document.getElementById('pwd-site')?.value.trim();
  const username = document.getElementById('pwd-username')?.value.trim();
  const password = document.getElementById('pwd-password')?.value;

  if (!site || !username || !password) return;

  if (api && api.savePassword) {
    await api.savePassword({ site, username, password });
    showToast('Yeni şifre başarıyla kaydedildi!');
    closeAddPasswordModal();
    loadPasswords();
  }
});

// ── 3. History Management ──────────────────────────────────────
let cachedHistory = [];

async function loadHistory() {
  if (!api || !api.loadHistory) return;
  const list = document.getElementById('history-list');
  const emptyMsg = document.getElementById('history-empty');
  if (!list) return;

  const history = (await api.loadHistory()) || [];
  cachedHistory = Array.isArray(history) ? history : Object.values(history);
  renderHistory(cachedHistory);
}

function renderHistory(items) {
  const list = document.getElementById('history-list');
  const emptyMsg = document.getElementById('history-empty');
  if (!list) return;

  if (!items || items.length === 0) {
    list.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';

  list.innerHTML = items.map(item => {
    const timeStr = item.time ? new Date(item.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
    return `
      <li class="history-item">
        <div class="history-item-left">
          <div class="history-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <div class="history-details">
            <a href="${escapeHtml(item.url)}" class="history-title" target="_blank">${escapeHtml(item.title || item.url)}</a>
            <div class="history-url">${escapeHtml(item.url)}</div>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:10px;">
          ${timeStr ? `<span class="history-time-chip">${timeStr}</span>` : ''}
          <button class="icon-action-btn btn-delete btn-del-hist" data-url="${escapeHtml(item.url)}" title="Geçmişten Sil">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
          </button>
        </div>
      </li>
    `;
  }).join('');

  // Delete individual history item
  list.querySelectorAll('.btn-del-hist').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const url = btn.dataset.url;
      if (api && api.deleteHistoryItem) {
        await api.deleteHistoryItem(url);
        showToast('Geçmiş kaydı silindi.');
        loadHistory();
      }
    });
  });
}

// Filter History
const historySearchInput = document.getElementById('history-search-input');
if (historySearchInput) {
  historySearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderHistory(cachedHistory);
      return;
    }
    const filtered = cachedHistory.filter(h => 
      (h.title && h.title.toLowerCase().includes(q)) || 
      (h.url && h.url.toLowerCase().includes(q))
    );
    renderHistory(filtered);
  });
}

// Clear History
const clearHistoryBtn = document.getElementById('clear-history-btn');
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', async () => {
    if (confirm('Tarama geçmişini tamamen silmek istediğinizden emin misiniz?')) {
      if (api && api.clearHistory) {
        await api.clearHistory();
        showToast('Tüm tarama geçmişi temizlendi.');
        loadHistory();
      }
    }
  });
}

// ── 4. Bookmarks Management ────────────────────────────────────
let cachedBookmarks = [];

async function loadBookmarks() {
  if (!api || !api.loadFavorites) return;
  const list = document.getElementById('bookmarks-list');
  const emptyMsg = document.getElementById('bookmarks-empty');
  if (!list) return;

  const favs = (await api.loadFavorites()) || [];
  cachedBookmarks = Array.isArray(favs) ? favs : Object.values(favs);
  renderBookmarks(cachedBookmarks);
}

function renderBookmarks(items) {
  const list = document.getElementById('bookmarks-list');
  const emptyMsg = document.getElementById('bookmarks-empty');
  if (!list) return;

  if (!items || items.length === 0) {
    list.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';

  list.innerHTML = items.map(item => `
    <li class="history-item">
      <div class="history-item-left">
        <div class="history-icon" style="color: #fbbf24; background: rgba(251, 191, 36, 0.1);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>
        <div class="history-details">
          <a href="${escapeHtml(item.url)}" class="history-title" target="_blank">${escapeHtml(item.title || item.url)}</a>
          <div class="history-url">${escapeHtml(item.url)}</div>
        </div>
      </div>

      <div>
        <button class="icon-action-btn btn-delete btn-del-bm" data-url="${escapeHtml(item.url)}" title="Yer İşaretini Kaldır">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
        </button>
      </div>
    </li>
  `).join('');

  list.querySelectorAll('.btn-del-bm').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const url = btn.dataset.url;
      if (api && api.toggleFavorite) {
        await api.toggleFavorite({ url });
        showToast('Yer işareti kaldırıldı.');
        loadBookmarks();
      }
    });
  });
}

// Filter Bookmarks
const bookmarksSearchInput = document.getElementById('bookmarks-search-input');
if (bookmarksSearchInput) {
  bookmarksSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderBookmarks(cachedBookmarks);
      return;
    }
    const filtered = cachedBookmarks.filter(b => 
      (b.title && b.title.toLowerCase().includes(q)) || 
      (b.url && b.url.toLowerCase().includes(q))
    );
    renderBookmarks(filtered);
  });
}

// ── 5. Performance / Gamer (Visual) ────────────────────────────
async function initPerformanceSettings() {
  if (!api) return;

  const hwAccel = document.getElementById('setting-hw-accel');
  const gamerMode = document.getElementById('setting-gamer-mode');
  const adBlock = document.getElementById('setting-adblock');
  const btnFreeMemory = document.getElementById('btn-free-memory');

  const settings = (await api.loadSettings()) || {};

  if (hwAccel) hwAccel.checked = !!settings.disableHWAccel;
  if (gamerMode) gamerMode.checked = !!settings.gamerMode;
  if (adBlock) adBlock.checked = !!settings.adBlocker;

  hwAccel?.addEventListener('change', (e) => {
    api.saveSettings({ disableHWAccel: e.target.checked });
  });

  gamerMode?.addEventListener('change', (e) => {
    api.saveSettings({ gamerMode: e.target.checked });
  });

  adBlock?.addEventListener('change', (e) => {
    api.saveSettings({ adBlocker: e.target.checked });
  });

  btnFreeMemory?.addEventListener('click', async () => {
    btnFreeMemory.innerHTML = `<span>Bellek Boşaltılıyor...</span>`;
    try {
      if (api.freeMemory) await api.freeMemory();
    } catch (err) {}
    showToast('Bellek optimize edildi!');
    setTimeout(() => {
      btnFreeMemory.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg><span>RAM Boşalt</span>`;
    }, 1200);
  });
}

// ── Initial Boot ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initGeneralSettings();
  initPerformanceSettings();

  const hash = window.location.hash.substring(1) || 'tab-general';
  switchTab(hash);
});
