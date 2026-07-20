'use strict';

const navItems = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = item.getAttribute('href').substring(1);

    // Update nav
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');

    // Update panes
    tabPanes.forEach(pane => pane.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');

    if (targetId === 'tab-history') loadHistory();
    if (targetId === 'tab-bookmarks') loadBookmarks();
  });
});

async function loadHistory() {
  const list = document.getElementById('history-list');
  if (!window.electronAPI) return;
  const history = await window.electronAPI.loadHistory();
  if (!history || history.length === 0) {
    list.innerHTML = '<li class="list-item"><span class="list-item-title" style="color:#8b8b98">Henüz tarama geçmişi yok.</span></li>';
    return;
  }
  
  const arrayHistory = Array.isArray(history) ? history : Object.values(history);
  list.innerHTML = arrayHistory.map(item => `
    <li class="list-item">
      <div>
        <div class="list-item-title">${item.title || item.url}</div>
        <div class="list-item-url">${item.url}</div>
      </div>
    </li>
  `).join('');
}

async function loadBookmarks() {
  const list = document.getElementById('bookmarks-list');
  if (!window.electronAPI) return;
  
  const favs = await window.electronAPI.loadFavorites();
  if (!favs || favs.length === 0) {
    list.innerHTML = '<li class="list-item"><span class="list-item-title" style="color:#8b8b98">Henüz yer işaretiniz yok.</span></li>';
    return;
  }

  list.innerHTML = favs.map(item => `
    <li class="list-item">
      <div>
        <div class="list-item-title">${item.title || item.url}</div>
        <div class="list-item-url">${item.url}</div>
      </div>
    </li>
  `).join('');
}

if (document.getElementById('clear-history-btn')) {
  document.getElementById('clear-history-btn').addEventListener('click', async () => {
    if (confirm("Tarama geçmişi tamamen silinecek. Emin misiniz?")) {
      if (window.electronAPI && window.electronAPI.clearHistory) {
        await window.electronAPI.clearHistory();
        loadHistory();
      }
    }
  });
}

setInterval(async () => {
  if (window.electronAPI && window.electronAPI.getMemoryUsage) {
    const usage = await window.electronAPI.getMemoryUsage();
    const memText = document.getElementById('memory-usage-text');
    if (memText && usage) memText.textContent = usage;
  }
}, 2000);

// Performance & Gamer Mode bindings
async function initPerformanceSettings() {
  if (!window.electronAPI) return;
  
  const hwAccel = document.getElementById('setting-hw-accel');
  const gamerMode = document.getElementById('setting-gamer-mode');
  const adBlock = document.getElementById('setting-adblock');
  const btnFreeMemory = document.getElementById('btn-free-memory');

  // Load Initial settings
  const settings = await window.electronAPI.loadSettings();

  if (hwAccel) hwAccel.checked = !!settings.disableHWAccel;
  if (gamerMode) gamerMode.checked = !!settings.gamerMode;
  if (adBlock) adBlock.checked = !!settings.adBlocker;

  // Initial State Tab Selection via Hash
  const hash = window.location.hash || '#tab-general';
  navItems.forEach(nav => nav.classList.remove('active'));
  tabPanes.forEach(pane => pane.classList.remove('active'));
  
  const activeNav = Array.from(navItems).find(n => n.getAttribute('href') === hash) || navItems[0];
  activeNav.classList.add('active');
  
  const activePaneId = activeNav.getAttribute('href').substring(1);
  const activePane = document.getElementById(activePaneId);
  if (activePane) activePane.classList.add('active');
  
  if (activePaneId === 'tab-history') loadHistory();
  if (activePaneId === 'tab-bookmarks') loadBookmarks();

  // Bind Listeners
  if (hwAccel) {
    hwAccel.addEventListener('change', (e) => {
      window.electronAPI.saveSettings({ disableHWAccel: e.target.checked });
    });
  }
  
  if (gamerMode) {
    gamerMode.addEventListener('change', (e) => {
      window.electronAPI.saveSettings({ gamerMode: e.target.checked });
    });
  }

  if (adBlock) {
    adBlock.addEventListener('change', (e) => {
      window.electronAPI.saveSettings({ adBlocker: e.target.checked });
    });
  }

  const startupRadios = document.querySelectorAll('input[name="startup"]');
  if (startupRadios.length > 0) {
    if (settings.startupBehavior === 'continue') {
      startupRadios[1].checked = true;
    } else {
      startupRadios[0].checked = true;
    }
    startupRadios.forEach((radio, idx) => {
      radio.addEventListener('change', () => {
        window.electronAPI.saveSettings({ startupBehavior: idx === 0 ? 'newtab' : 'continue' });
      });
    });
  }

  if (btnFreeMemory) {
    btnFreeMemory.addEventListener('click', async () => {
      btnFreeMemory.textContent = 'İşleniyor...';
      try {
        await window.electronAPI.freeMemory();
        btnFreeMemory.textContent = 'Bitti!';
      } catch (e) {
        btnFreeMemory.textContent = 'Bitti!';
      }
      setTimeout(() => { btnFreeMemory.textContent = 'RAM Boşalt'; }, 2000);
    });
  }

  /* ── Wallpaper ── */
  const wallInput = document.getElementById('wallpaper-input');
  const wallPreview = document.getElementById('wallpaper-preview');
  const wallRemove = document.getElementById('wallpaper-remove');

  if (wallPreview && window.electronAPI.loadWallpaper) {
    const existingWall = await window.electronAPI.loadWallpaper();
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
        if (window.electronAPI.saveWallpaper) {
          await window.electronAPI.saveWallpaper(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (wallRemove) {
    wallRemove.addEventListener('click', async () => {
      if (wallPreview) {
        wallPreview.style.backgroundImage = 'none';
        wallPreview.innerHTML = '<span class="wallpaper-placeholder">Resim seçilmedi</span>';
      }
      if (window.electronAPI.saveWallpaper) {
        await window.electronAPI.saveWallpaper(null);
      }
    });
  }
}

initPerformanceSettings();
