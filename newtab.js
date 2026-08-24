'use strict';

/* ================================================================
   Ebium — New Tab Dashboard Logic
   ================================================================ */

// ── 1. Clock, Date & Greeting ───────────────────────────────────
const ICONS = {
  morning: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  afternoon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  evening: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m8 6 4-4 4 4"/><path d="M16 18a4 4 0 0 0-8 0"/></svg>`,
  night: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  default: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`
};

function updateClockAndGreeting() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  
  const timeEl = document.getElementById('time-text');
  if (timeEl) timeEl.textContent = `${h}:${m}`;

  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateEl = document.getElementById('date-text');
  if (dateEl) dateEl.textContent = now.toLocaleDateString('tr-TR', dateOptions);

  const hour = now.getHours();
  let greeting = 'Merhaba!';
  let iconSvg = ICONS.default;

  if (hour >= 5 && hour < 12) {
    greeting = 'Günaydın!';
    iconSvg = ICONS.morning;
  } else if (hour >= 12 && hour < 18) {
    greeting = 'Tünaydın!';
    iconSvg = ICONS.afternoon;
  } else if (hour >= 18 && hour < 23) {
    greeting = 'İyi Akşamlar!';
    iconSvg = ICONS.evening;
  } else {
    greeting = 'İyi Geceler!';
    iconSvg = ICONS.night;
  }

  const greetEl = document.getElementById('greeting');
  if (greetEl) greetEl.textContent = greeting;

  const iconEl = document.getElementById('greeting-icon');
  if (iconEl) iconEl.innerHTML = iconSvg;
}

setInterval(updateClockAndGreeting, 1000);
updateClockAndGreeting();

// ── 2. Search & Engine Selector ─────────────────────────────────
const ENGINES = {
  google:     { name: 'Google', url: 'https://www.google.com/search?q=' },
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  bing:       { name: 'Bing', url: 'https://www.bing.com/search?q=' },
  youtube:    { name: 'YouTube', url: 'https://www.youtube.com/results?search_query=' }
};

let activeEngine = 'google';

function setEngine(engineKey) {
  if (!ENGINES[engineKey]) return;
  activeEngine = engineKey;
  
  const label = document.getElementById('current-engine-label');
  if (label) label.textContent = ENGINES[engineKey].name;

  document.querySelectorAll('.engine-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.engine === engineKey);
  });
}

document.querySelectorAll('.engine-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    setEngine(chip.dataset.engine);
  });
});

const searchForm = document.getElementById('search-form');
if (searchForm) {
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('search-input')?.value.trim();
    if (!query) return;

    if (/^https?:\/\//i.test(query) || /^[^\s]+\.[^\s]+$/.test(query)) {
      window.location.href = /^https?:\/\//i.test(query) ? query : `https://${query}`;
    } else {
      window.location.href = ENGINES[activeEngine].url + encodeURIComponent(query);
    }
  });
}

// ── 3. Quick Access Shortcuts ───────────────────────────────────
const DEFAULT_SHORTCUTS = [
  { title: 'YouTube', url: 'https://youtube.com' },
  { title: 'GitHub', url: 'https://github.com' },
  { title: 'ChatGPT', url: 'https://chatgpt.com' },
  { title: 'X (Twitter)', url: 'https://twitter.com' },
  { title: 'Twitch', url: 'https://twitch.tv' },
  { title: 'Instagram', url: 'https://instagram.com' },
  { title: 'Reddit', url: 'https://reddit.com' },
  { title: 'Wikipedia', url: 'https://wikipedia.org' }
];

let shortcuts = JSON.parse(localStorage.getItem('ebium-shortcuts-v2'));
if (!shortcuts || !Array.isArray(shortcuts)) {
  shortcuts = DEFAULT_SHORTCUTS;
  localStorage.setItem('ebium-shortcuts-v2', JSON.stringify(shortcuts));
}

function renderShortcuts() {
  const container = document.getElementById('shortcuts-container');
  if (!container) return;
  container.innerHTML = '';

  shortcuts.forEach((sc, index) => {
    let hostname = '';
    try {
      hostname = new URL(sc.url.startsWith('http') ? sc.url : `https://${sc.url}`).hostname;
    } catch {
      hostname = sc.url;
    }

    const card = document.createElement('a');
    card.href = sc.url;
    card.className = 'shortcut-card';
    card.title = sc.title;

    const initial = (sc.title || 'W').substring(0, 2).toUpperCase();

    card.innerHTML = `
      <div class="shortcut-icon-wrapper">
        <img class="shortcut-img" src="https://www.google.com/s2/favicons?domain=${hostname}&sz=64" alt="${sc.title}"
             onerror="this.style.display='none'; this.parentElement.textContent='${initial}';">
      </div>
      <span class="shortcut-label">${escapeHtml(sc.title)}</span>
      <button class="shortcut-del-btn" data-index="${index}" title="Sil">✕</button>
    `;

    container.appendChild(card);
  });

  // "Add" tile
  if (shortcuts.length < 12) {
    const addTile = document.createElement('button');
    addTile.className = 'shortcut-add-card';
    addTile.title = 'Kısayol Ekle';
    addTile.innerHTML = `
      <div class="add-icon-box">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </div>
      <span class="shortcut-label" style="color:var(--nt-text-dim);">Ekle</span>
    `;
    addTile.onclick = openAddModal;
    container.appendChild(addTile);
  }

  // Delete event listeners
  container.querySelectorAll('.shortcut-del-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      shortcuts.splice(idx, 1);
      localStorage.setItem('ebium-shortcuts-v2', JSON.stringify(shortcuts));
      renderShortcuts();
    });
  });
}

function openAddModal() {
  const modal = document.getElementById('add-shortcut-modal');
  if (modal) modal.classList.remove('hidden');
  document.getElementById('shortcut-title')?.focus();
}

function closeAddModal() {
  const modal = document.getElementById('add-shortcut-modal');
  if (modal) modal.classList.add('hidden');
  const t = document.getElementById('shortcut-title');
  const u = document.getElementById('shortcut-url');
  if (t) t.value = '';
  if (u) u.value = '';
}

document.getElementById('btn-close-modal')?.addEventListener('click', closeAddModal);
document.getElementById('btn-cancel-shortcut')?.addEventListener('click', closeAddModal);

document.getElementById('btn-save-shortcut')?.addEventListener('click', () => {
  const title = document.getElementById('shortcut-title')?.value.trim();
  let url = document.getElementById('shortcut-url')?.value.trim();

  if (title && url) {
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    shortcuts.push({ title, url });
    localStorage.setItem('ebium-shortcuts-v2', JSON.stringify(shortcuts));
    renderShortcuts();
    closeAddModal();
  }
});

renderShortcuts();

// ── 4. Daily Inspiration Quotes ─────────────────────────────────
const QUOTES = [
  { text: "Muhtaç olduğun kudret, damarlarındaki asil kanda mevcuttur!", author: "— Gazi Mustafa Kemal Atatürk" },
  { text: "Bir yeri elde tutmak, o yeri fethetmekten daha zordur.", author: "— Osman Gazi" },
  { text: "Geçmişini iyi bil ki, geleceğe sağlam basasın.", author: "— Şeyh Edebali" },
  { text: "Cesaret insanı zafere, kararsızlık tehlikeye götürür.", author: "— Yavuz Sultan Selim" },
  { text: "Haklı olduğun mücadeleden asla korkma!", author: "— Şeyh Edebali" },
  { text: "Zaman bendedir ve mekan bana emanettir.", author: "— Necip Fazıl Kısakürek" },
  { text: "Büyük başarılar, değerli anaların yetiştirdikleri seçkin çocuklarla elde edilir.", author: "— Mustafa Kemal Atatürk" }
];

function displayDailyQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const textEl = document.getElementById('quote-text');
  const authEl = document.getElementById('quote-author');
  if (textEl) textEl.textContent = `"${q.text}"`;
  if (authEl) authEl.textContent = q.author;
}
displayDailyQuote();

// ── 5. Quick Note Autosave ──────────────────────────────────────
const noteArea = document.getElementById('quick-note-input');
if (noteArea) {
  noteArea.value = localStorage.getItem('ebium-quick-note') || '';
  noteArea.addEventListener('input', (e) => {
    localStorage.setItem('ebium-quick-note', e.target.value);
  });
}

// ── 6. 3D Interactive Emblem Tilt ───────────────────────────────
const brand3d = document.getElementById('brand-3d');
if (brand3d) {
  const maxTilt = 22;

  document.addEventListener('mousemove', (e) => {
    const rect = brand3d.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (window.innerWidth / 2);
    const dy = (e.clientY - cy) / (window.innerHeight / 2);
    const rotY = dx * maxTilt;
    const rotX = -dy * maxTilt;
    brand3d.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  });

  document.addEventListener('mouseleave', () => {
    brand3d.style.transform = 'rotateX(0deg) rotateY(0deg)';
  });
}

// ── 7. Wallpaper & Theme Synchronization ────────────────────────
async function loadWallpaper() {
  const api = window.electronAPI;
  if (!api || !api.loadWallpaper) return;
  const dataUrl = await api.loadWallpaper();
  if (dataUrl) {
    document.body.classList.add('has-wallpaper');
    const style = document.createElement('style');
    style.textContent = `body.has-wallpaper::before { background-image: url(${dataUrl}); }`;
    document.head.appendChild(style);
  }
}

async function bootstrapTheme() {
  await loadWallpaper();
  const api = window.electronAPI;
  if (api && api.loadSettings) {
    const settings = await api.loadSettings();
    if (settings.searchEngine) setEngine(settings.searchEngine);
  }
  if (api && api.onThemeUpdated) {
    api.onThemeUpdated((data) => {
      if (data.searchEngine) setEngine(data.searchEngine);
    });
  }
}
bootstrapTheme();

// ── Utility ─────────────────────────────────────────────────────
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

