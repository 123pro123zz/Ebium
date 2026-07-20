'use strict';

(() => {
  const api = window.electronAPI;
  const $btnSidepanel = document.getElementById('btn-sidepanel');
  const $sidePanel = document.getElementById('side-panel');
  const $btnClose = document.getElementById('btn-sp-close');
  const $tabs = document.querySelectorAll('.sp-tab');
  const $panes = document.querySelectorAll('.sp-pane');

  let panelOpen = false;

  function togglePanel() {
    panelOpen = !panelOpen;
    if (panelOpen) {
      $sidePanel.classList.remove('hidden');
    } else {
      $sidePanel.classList.add('hidden');
    }
    // Tell main process to resize BrowserView
    if (api && api.toggleSidePanel) {
      api.toggleSidePanel(panelOpen);
    }
  }

  $btnSidepanel?.addEventListener('click', togglePanel);
  $btnClose?.addEventListener('click', () => {
    if (panelOpen) togglePanel();
  });

  // Tab switching
  $tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      $tabs.forEach(t => t.classList.remove('active'));
      $panes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const pane = document.getElementById(tab.dataset.sp);
      if (pane) pane.classList.add('active');
    });
  });

  /* ── 1. Notes ── */
  const $notesText = document.getElementById('sp-notes-text');
  if ($notesText) {
    $notesText.value = localStorage.getItem('ebium-sp-notes') || '';
    $notesText.addEventListener('input', (e) => {
      localStorage.setItem('ebium-sp-notes', e.target.value);
    });
  }

  /* ── 2. To-Do ── */
  const $todoList = document.getElementById('todo-list');
  const $todoInput = document.getElementById('todo-input');
  const $todoAdd = document.getElementById('todo-add');
  
  let todos = JSON.parse(localStorage.getItem('ebium-sp-todos') || '[]');

  function renderTodos() {
    if (!$todoList) return;
    $todoList.innerHTML = '';
    todos.forEach((todo, idx) => {
      const li = document.createElement('li');
      li.className = `todo-item ${todo.done ? 'done' : ''}`;
      li.innerHTML = `
        <input type="checkbox" ${todo.done ? 'checked' : ''} data-idx="${idx}">
        <span class="todo-text">${todo.text}</span>
        <button class="todo-del" data-idx="${idx}">&#10005;</button>
      `;
      $todoList.appendChild(li);
    });
    localStorage.setItem('ebium-sp-todos', JSON.stringify(todos));
  }

  $todoAdd?.addEventListener('click', () => {
    const text = $todoInput.value.trim();
    if (text) {
      todos.push({ text, done: false });
      $todoInput.value = '';
      renderTodos();
    }
  });

  $todoInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $todoAdd?.click();
  });

  $todoList?.addEventListener('click', (e) => {
    if (e.target.type === 'checkbox') {
      const idx = e.target.dataset.idx;
      todos[idx].done = e.target.checked;
      renderTodos();
    } else if (e.target.classList.contains('todo-del')) {
      const idx = e.target.dataset.idx;
      todos.splice(idx, 1);
      renderTodos();
    }
  });
  renderTodos();

  /* ── 3. Pomodoro ── */
  let pomoTimer = null;
  let pomoTimeLeft = 25 * 60;
  let isPomoRunning = false;
  const $pomoCircle = document.getElementById('pomo-circle');
  const $pomoStart = document.getElementById('pomo-start');
  const $pomoReset = document.getElementById('pomo-reset');

  function updatePomoDisplay() {
    if (!$pomoCircle) return;
    const m = Math.floor(pomoTimeLeft / 60).toString().padStart(2, '0');
    const s = (pomoTimeLeft % 60).toString().padStart(2, '0');
    $pomoCircle.textContent = `${m}:${s}`;
  }

  $pomoStart?.addEventListener('click', () => {
    if (isPomoRunning) {
      clearInterval(pomoTimer);
      $pomoStart.textContent = 'Devam Et';
      isPomoRunning = false;
      $pomoCircle?.classList.remove('active');
    } else {
      isPomoRunning = true;
      $pomoStart.textContent = 'Duraklat';
      $pomoCircle?.classList.add('active');
      pomoTimer = setInterval(() => {
        pomoTimeLeft--;
        if (pomoTimeLeft <= 0) {
          clearInterval(pomoTimer);
          isPomoRunning = false;
          $pomoStart.textContent = 'Başlat';
          $pomoCircle?.classList.remove('active');
          pomoTimeLeft = 5 * 60;
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.connect(ctx.destination);
            osc.start(); setTimeout(() => osc.stop(), 400);
          } catch(e) {}
        }
        updatePomoDisplay();
      }, 1000);
    }
  });

  $pomoReset?.addEventListener('click', () => {
    clearInterval(pomoTimer);
    isPomoRunning = false;
    if ($pomoStart) $pomoStart.textContent = 'Başlat';
    $pomoCircle?.classList.remove('active');
    pomoTimeLeft = 25 * 60;
    updatePomoDisplay();
  });

  /* ── 4. Speed Test ── */
  const $speedBtn = document.getElementById('speed-test-btn');
  const $speedDl = document.getElementById('speed-download');
  const $speedUl = document.getElementById('speed-upload');
  const $speedPing = document.getElementById('speed-ping');
  const $speedStatus = document.getElementById('speed-status');

  async function runSpeedTest() {
    if (!$speedBtn) return;
    $speedBtn.disabled = true;
    $speedBtn.textContent = 'Test Ediliyor...';
    if ($speedStatus) $speedStatus.textContent = '';
    if ($speedDl) $speedDl.textContent = '...';
    if ($speedUl) $speedUl.textContent = '...';
    if ($speedPing) $speedPing.textContent = '...';

    try {
      // Ping test
      const pingStart = performance.now();
      await fetch('https://www.google.com/generate_204', { mode: 'no-cors', cache: 'no-store' });
      const pingMs = Math.round(performance.now() - pingStart);
      if ($speedPing) $speedPing.textContent = pingMs;

      // Download test (~5MB file from Cloudflare)
      if ($speedStatus) $speedStatus.textContent = 'İndirme testi...';
      const dlUrl = 'https://speed.cloudflare.com/__down?bytes=5000000&r=' + Math.random();
      const dlStart = performance.now();
      const dlResp = await fetch(dlUrl, { cache: 'no-store' });
      const dlBlob = await dlResp.blob();
      const dlTime = (performance.now() - dlStart) / 1000; // seconds
      const dlBytes = dlBlob.size;
      const dlMbps = ((dlBytes * 8) / dlTime / 1000000).toFixed(1);
      if ($speedDl) $speedDl.textContent = dlMbps;

      // Upload test (~2MB)
      if ($speedStatus) $speedStatus.textContent = 'Yükleme testi...';
      const ulData = new Uint8Array(2000000);
      const ulStart = performance.now();
      await fetch('https://speed.cloudflare.com/__up', {
        method: 'POST',
        body: ulData,
        mode: 'no-cors',
        cache: 'no-store'
      });
      const ulTime = (performance.now() - ulStart) / 1000;
      const ulMbps = ((ulData.length * 8) / ulTime / 1000000).toFixed(1);
      if ($speedUl) $speedUl.textContent = ulMbps;

      if ($speedStatus) $speedStatus.textContent = 'Test tamamlandı!';
    } catch (err) {
      if ($speedStatus) $speedStatus.textContent = 'Hata: ' + err.message;
    }

    $speedBtn.disabled = false;
    $speedBtn.textContent = 'Hız Testi Başlat';
  }

  $speedBtn?.addEventListener('click', runSpeedTest);

  /* ── 5. Color Picker ── */
  const $colorInput = document.getElementById('color-picker-input');
  const $colorBox = document.getElementById('color-box');
  const $colorHexText = document.getElementById('color-hex-text');
  const $colorPalette = document.getElementById('color-palette');
  
  let savedColors = JSON.parse(localStorage.getItem('ebium-sp-colors') || '[]');

  function renderColors() {
    if (!$colorPalette) return;
    $colorPalette.innerHTML = '';
    savedColors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'color-swatch';
      sw.style.background = c;
      sw.onclick = () => {
        if ($colorInput) $colorInput.value = c;
        if ($colorBox) $colorBox.style.background = c;
        if ($colorHexText) $colorHexText.textContent = c;
        try { navigator.clipboard.writeText(c); } catch(e) {}
      };
      $colorPalette.appendChild(sw);
    });
  }

  $colorInput?.addEventListener('input', (e) => {
    const val = e.target.value;
    if ($colorBox) $colorBox.style.background = val;
    if ($colorHexText) $colorHexText.textContent = val;
  });

  $colorInput?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (!savedColors.includes(val)) {
      savedColors.unshift(val);
      if (savedColors.length > 10) savedColors.pop();
      localStorage.setItem('ebium-sp-colors', JSON.stringify(savedColors));
      renderColors();
    }
    try { navigator.clipboard.writeText(val); } catch(e) {}
  });
  
  renderColors();
})();
