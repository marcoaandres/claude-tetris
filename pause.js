'use strict';

// Menú de pausa: se abre con P / Escape (vía togglePause en game.js).
// Se carga ANTES de game.js porque init() usa resolveStartLevel() en la primera partida.
// Las referencias al estado del juego (paused, gameOver, init, togglePause)
// solo se usan dentro de manejadores, cuando game.js ya está cargado.

const START_LEVEL_KEY = 'tetris.startLevel';
const MIN_START_LEVEL = 1;
const MAX_START_LEVEL = 10;

const pauseMenu = document.getElementById('pause-menu');
const pauseControls = document.getElementById('pause-controls');
const pauseControlsBtn = pauseMenu.querySelector('[data-action="controls"]');
const pauseLevelItem = pauseMenu.querySelector('[data-action="level"]');
const pauseLevelValue = document.getElementById('pause-level-value');
const pauseItems = Array.from(pauseMenu.querySelectorAll('.pause-item'));

// Teclas pulsadas mientras el menú estaba abierto: se ignoran tras reanudar
// hasta que se suelten, para evitar movimientos o caídas accidentales.
const pauseHeldKeys = new Set();

function isValidStartLevel(n) {
  return Number.isInteger(n) && n >= MIN_START_LEVEL && n <= MAX_START_LEVEL;
}

function loadStartLevel() {
  try {
    const raw = localStorage.getItem(START_LEVEL_KEY);
    const n = raw === null || raw.trim() === '' ? NaN : Number(raw);
    if (isValidStartLevel(n)) return n;
  } catch (e) {}
  return MIN_START_LEVEL;
}

// Preferencia en memoria (funciona aunque localStorage no esté disponible)
let selectedStartLevel = loadStartLevel();

function renderStartLevel(n) {
  pauseLevelValue.textContent = n;
  pauseLevelItem.setAttribute('aria-valuenow', String(n));
}

function setStartLevel(n) {
  selectedStartLevel = n;
  try { localStorage.setItem(START_LEVEL_KEY, String(n)); } catch (e) {}
  renderStartLevel(n);
}

function changeStartLevel(step) {
  setStartLevel(Math.min(MAX_START_LEVEL, Math.max(MIN_START_LEVEL, selectedStartLevel + step)));
}

// Normaliza el argumento de init(): si no es un nivel válido (p. ej. el evento
// del botón de reinicio) se usa el nivel inicial elegido.
function resolveStartLevel(lvl) {
  return isValidStartLevel(lvl) ? lvl : selectedStartLevel;
}

function isPauseMenuOpen() {
  return !pauseMenu.classList.contains('hidden');
}

function setControlsOpen(open) {
  pauseControls.hidden = !open;
  pauseControlsBtn.setAttribute('aria-expanded', String(open));
}

// Llamada desde togglePause() al pausar
function openPauseMenu() {
  renderStartLevel(selectedStartLevel);
  setControlsOpen(false);
  pauseMenu.classList.remove('hidden');
  pauseItems[0].focus();
}

// Llamada desde togglePause() al reanudar y desde init()
function closePauseMenu() {
  if (pauseMenu.contains(document.activeElement)) document.activeElement.blur();
  pauseMenu.classList.add('hidden');
}

function resumeFromMenu() {
  if (paused && !gameOver) togglePause();
}

function restartFromMenu() {
  init(selectedStartLevel);
}

function activatePauseItem(item) {
  switch (item && item.dataset.action) {
    case 'resume': resumeFromMenu(); break;
    case 'restart': restartFromMenu(); break;
    case 'controls': setControlsOpen(pauseControls.hidden); break;
    // Enter sobre el selector: sube un nivel y vuelve a 1 tras el 10
    case 'level': setStartLevel(selectedStartLevel % MAX_START_LEVEL + 1); break;
  }
}

function movePauseFocus(delta) {
  const idx = pauseItems.indexOf(document.activeElement);
  const next = idx === -1
    ? (delta > 0 ? 0 : pauseItems.length - 1)
    : (idx + delta + pauseItems.length) % pauseItems.length;
  pauseItems[next].focus();
}

function handlePauseMenuKey(e) {
  if (e.code !== 'Tab') pauseHeldKeys.add(e.code);
  switch (e.code) {
    case 'KeyP':
    case 'Escape':
      e.preventDefault();
      if (!e.repeat) resumeFromMenu();
      break;
    case 'ArrowUp':
      e.preventDefault();
      movePauseFocus(-1);
      break;
    case 'ArrowDown':
      e.preventDefault();
      movePauseFocus(1);
      break;
    case 'Tab':
      e.preventDefault();
      movePauseFocus(e.shiftKey ? -1 : 1);
      break;
    case 'ArrowLeft':
    case 'ArrowRight':
      e.preventDefault();
      if (document.activeElement === pauseLevelItem) changeStartLevel(e.code === 'ArrowLeft' ? -1 : 1);
      break;
    case 'Enter':
    case 'NumpadEnter':
      e.preventDefault(); // evita el click nativo del botón (se activa a mano)
      if (!e.repeat && pauseItems.includes(document.activeElement)) activatePauseItem(document.activeElement);
      break;
    case 'Space':
      // Space (caída rápida) no activa botones: pulsarlo por costumbre no debe reanudar
      e.preventDefault();
      break;
  }
}

// Fase de captura en window: se ejecuta antes que el listener de game.js (en document)
// y permite que ninguna tecla llegue al juego mientras el menú está abierto.
window.addEventListener('keydown', e => {
  if (isPauseMenuOpen()) {
    e.stopPropagation();
    handlePauseMenuKey(e);
    return;
  }
  if (pauseHeldKeys.has(e.code)) {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);

window.addEventListener('keyup', e => {
  pauseHeldKeys.delete(e.code);
  if (isPauseMenuOpen()) {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);

window.addEventListener('blur', () => pauseHeldKeys.clear());

// Mantiene el foco dentro del menú (p. ej. tras pulsar el botón de tema)
document.addEventListener('focusin', e => {
  if (isPauseMenuOpen() && !pauseMenu.contains(e.target)) pauseItems[0].focus();
});
pauseMenu.addEventListener('mousedown', e => {
  if (!e.target.closest('.pause-item')) e.preventDefault(); // clic en el fondo: no pierde el foco
});
window.addEventListener('focus', () => {
  if (isPauseMenuOpen() && !pauseMenu.contains(document.activeElement)) pauseItems[0].focus();
});

// Ratón: solo un movimiento real selecciona (no los cambios de layout bajo el cursor)
pauseItems.forEach(item => {
  item.addEventListener('mousemove', () => {
    if (document.activeElement !== item) item.focus();
  });
  if (item !== pauseLevelItem) {
    item.addEventListener('click', () => activatePauseItem(item));
  }
});

pauseLevelItem.querySelectorAll('[data-step]').forEach(btn => {
  btn.addEventListener('click', () => {
    changeStartLevel(Number(btn.dataset.step));
    pauseLevelItem.focus();
  });
});

renderStartLevel(selectedStartLevel);
