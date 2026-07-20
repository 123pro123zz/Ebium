'use strict';

// ── Clock & Date ────────
function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  document.getElementById('time-text').textContent = `${h}:${m}`;

  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('date-text').textContent = now.toLocaleDateString('tr-TR', options);

  const hour = now.getHours();
  let greeting = 'Merhaba!';
  if (hour < 6) greeting = 'İyi Geceler!';
  else if (hour < 12) greeting = 'Günaydın!';
  else if (hour < 18) greeting = 'Tünaydın!';
  else greeting = 'İyi Akşamlar!';
  document.getElementById('greeting').textContent = greeting;
}
setInterval(updateClock, 1000);
updateClock();

// ── Search ────────
document.getElementById('search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = e.target.elements['q'].value;
  if (q.trim()) {
    if (/^https?:\/\//i.test(q) || /^[^\s]+\.[^\s]+$/.test(q)) {
      window.location.href = /^https?:\/\//i.test(q) ? q : `https://${q}`;
    } else {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    }
  }
});

// ── Quick Access ────────
const defaultShortcuts = [
  { title: 'YouTube', url: 'https://youtube.com', icon: 'YT' },
  { title: 'GitHub', url: 'https://github.com', icon: 'GH' },
  { title: 'X (Twitter)', url: 'https://twitter.com', icon: 'X' },
  { title: 'ChatGPT', url: 'https://chatgpt.com', icon: 'AI' },
  { title: 'Instagram', url: 'https://instagram.com', icon: 'IG' },
  { title: 'Reddit', url: 'https://reddit.com', icon: 'RE' }
];

let shortcuts = JSON.parse(localStorage.getItem('ebium-shortcuts'));
if (!shortcuts) {
  shortcuts = defaultShortcuts;
  localStorage.setItem('ebium-shortcuts', JSON.stringify(shortcuts));
}

function renderShortcuts() {
  const container = document.getElementById('shortcuts-container');
  if (!container) return;
  container.innerHTML = '';

  shortcuts.forEach((sc, index) => {
    const a = document.createElement('a');
    a.href = sc.url;
    a.className = 'shortcut';
    const u = new URL(sc.url.startsWith('http') ? sc.url : `https://${sc.url}`);
    const domain = u.hostname;
    
    a.innerHTML = `
      <div class="icon">
        <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" alt="${sc.title}" onerror="this.style.display='none'; this.parentElement.innerText=sc.title.substring(0,2).toUpperCase();">
      </div>
      <span>${sc.title}</span>
      <button class="shortcut-delete" data-index="${index}" title="Sil">✕</button>
    `;
    container.appendChild(a);
  });

  if (shortcuts.length < 10) {
    const addBtn = document.createElement('button');
    addBtn.className = 'shortcut-add';
    addBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Ekle</span>';
    addBtn.onclick = () => document.getElementById('add-shortcut-modal').classList.remove('hidden');
    container.appendChild(addBtn);
  }

  document.querySelectorAll('.shortcut-delete').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      shortcuts.splice(idx, 1);
      localStorage.setItem('ebium-shortcuts', JSON.stringify(shortcuts));
      renderShortcuts();
    };
  });
}

function getIconText(title) {
  return title.substring(0, 2).toUpperCase() || '🔗';
}

const cancelBtn = document.getElementById('btn-cancel-shortcut');
if (cancelBtn) cancelBtn.onclick = () => {
  document.getElementById('add-shortcut-modal').classList.add('hidden');
};

const saveBtn = document.getElementById('btn-save-shortcut');
if (saveBtn) saveBtn.onclick = () => {
  const title = document.getElementById('shortcut-title').value.trim();
  let url = document.getElementById('shortcut-url').value.trim();
  if (title && url) {
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    shortcuts.push({ title, url, icon: getIconText(title) });
    localStorage.setItem('ebium-shortcuts', JSON.stringify(shortcuts));
    renderShortcuts();
    document.getElementById('add-shortcut-modal').classList.add('hidden');
    document.getElementById('shortcut-title').value = '';
    document.getElementById('shortcut-url').value = '';
  }
};

renderShortcuts();

// ── Quotes ────────
const QUOTES = [
  { text: "Bir yeri elde tutmak, o yeri fethetmekten daha zordur.", author: "— Osman Gazi" },
  { text: "Niyeti halis olana, Allah her zaman yardım eder.", author: "— Osman Gazi" },
  { text: "Muhtaç olduğun kudret, damarlarındaki asil kanda mevcuttur!", author: "— Mustafa Kemal Atatürk" },
  { text: "Geçmişini iyi bil ki, geleceğe sağlam basasın.", author: "— Şeyh Edebali" },
  { text: "Haklı olduğun mücadeleden korkma!", author: "— Şeyh Edebali" },
  { text: "Cesaret insanı zafere, kararsızlık tehlikeye götürür.", author: "— Yavuz Sultan Selim" },
  { text: "Zaman bendedir ve mekan bana emanettir.", author: "— Necip Fazıl Kısakürek" }
];

function showRandomQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const box = document.getElementById('quote-box');
  if (box) {
    document.getElementById('quote-text').textContent = `"${q.text}"`;
    document.getElementById('quote-author').textContent = q.author;
  }
}
showRandomQuote();

// ── 3D Interactive Logo ────────
const brand3d = document.getElementById('brand-3d');
if (brand3d) {
  const maxTilt = 25;
  
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

// ── Wallpaper & theme (new tab) ────────
function parseColorToRgb(color) {
  if (!color || typeof color !== 'string') return null;
  const s = color.trim();
  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }
  }
  const m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  return null;
}

function bgLuminance01(rgb) {
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

function rgbaFromColor(color, a) {
  const rgb = parseColorToRgb(color);
  if (!rgb) return null;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function applySurfaceVars(bgColor, surfaceColor) {
  const bgRgb = parseColorToRgb(bgColor);
  const sfRgb = parseColorToRgb(surfaceColor);
  const root = document.documentElement;
  if (!bgRgb) return;
  const lum = bgLuminance01(bgRgb);
  
  if (lum > 0.5) {
    // Light mode: use dark overlays so elements are visible
    root.style.setProperty('--nt-glass', 'rgba(0, 0, 0, 0.06)');
    root.style.setProperty('--nt-glass-border', 'rgba(0, 0, 0, 0.10)');
    root.style.setProperty('--nt-surface', 'rgba(0, 0, 0, 0.04)');
    root.style.setProperty('--nt-surface-hover', 'rgba(0, 0, 0, 0.09)');
  } else {
    // Dark mode: use light overlays
    root.style.setProperty('--nt-glass', 'rgba(255, 255, 255, 0.04)');
    root.style.setProperty('--nt-glass-border', 'rgba(255, 255, 255, 0.08)');
    root.style.setProperty('--nt-surface', 'rgba(255, 255, 255, 0.03)');
    root.style.setProperty('--nt-surface-hover', 'rgba(255, 255, 255, 0.06)');
  }
}

function applyMutedTextTiers(bgColor) {
  const rgb = parseColorToRgb(bgColor);
  if (!rgb) return;
  const root = document.documentElement;
  const lum = bgLuminance01(rgb);
  if (lum > 0.5) {
    // Light bg → dark muted text
    root.style.setProperty('--nt-text-muted', '#5f6368');
    root.style.setProperty('--nt-text-dim', '#80868b');
  } else {
    // Dark bg → light muted text
    root.style.setProperty('--nt-text-muted', '#9aa0a6');
    root.style.setProperty('--nt-text-dim', '#5f6368');
  }
}

/** Wallpaper uses a dark scrim; keep copy readable even if settings say "light" text. */
function applyWallpaperTextContrast() {
  if (!document.body.classList.contains('has-wallpaper')) return;
  const root = document.documentElement;
  root.style.setProperty('--nt-text', '#e8eaed');
  root.style.setProperty('--nt-text-muted', 'rgba(232, 234, 237, 0.78)');
  root.style.setProperty('--nt-text-dim', 'rgba(232, 234, 237, 0.55)');
}

function applyNewtabTheme(settings) {
  const root = document.documentElement;
  if (settings.accentColor) {
    root.style.setProperty('--nt-primary', settings.accentColor);
  }
  if (settings.backgroundColor) {
    root.style.setProperty('--nt-bg', settings.backgroundColor);
  }
  if (settings.backgroundColor) {
    applySurfaceVars(settings.backgroundColor, settings.surfaceColor);
    applyMutedTextTiers(settings.backgroundColor);
  }
  if (settings.textColor) {
    root.style.setProperty('--nt-text', settings.textColor);
  }
  applyWallpaperTextContrast();
}

async function loadWallpaper() {
  const api = window.electronAPI;
  if (!api || !api.loadWallpaper) return;
  const dataUrl = await api.loadWallpaper();
  if (dataUrl) {
    document.body.classList.add('has-wallpaper');
    document.body.style.setProperty('--wallpaper-url', `url(${dataUrl})`);
    const style = document.createElement('style');
    style.textContent = `body.has-wallpaper::before { background-image: url(${dataUrl}); }`;
    document.head.appendChild(style);
  }
}

async function bootstrapNewtabTheme() {
  const api = window.electronAPI;
  if (!api) return;
  await loadWallpaper();
  const settings = await api.loadSettings();
  applyNewtabTheme(settings);
  if (api.onThemeUpdated) {
    api.onThemeUpdated(async () => {
      const s = await api.loadSettings();
      applyNewtabTheme(s);
    });
  }
}
bootstrapNewtabTheme();
