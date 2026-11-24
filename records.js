'use strict';

// ---- Tabla de records local (localStorage) ----
// Se carga ANTES de game.js: aquí solo se declaran funciones y estado propio.
// Las variables globales del juego (score, lines, init…) se leen en tiempo de llamada.

const RECORDS_KEY = 'tetris.records';
const STATS_KEY = 'tetris.stats';
const MAX_RECORDS = 5;
const MAX_NAME = 12;
const DEFAULT_NAME = 'Jugador';

// Combo: piezas fijadas consecutivas que eliminan al menos una línea.
let combo = 0;
let maxCombo = 0;
// Record de la última partida, ya guardado con el nombre por defecto, a la espera
// de que el jugador escriba su nombre.
let pendingRecord = null;
let gameOverHandled = false;

const startScreen = document.getElementById('start-screen');
const playBtn = document.getElementById('play-btn');
const startRecordsEl = document.getElementById('start-records');
const goRecordsEl = document.getElementById('go-records');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('name-input');
const newRecordMsg = document.getElementById('new-record-msg');

// ---- Persistencia ----

function sanitizeRecord(r) {
  if (!r || typeof r !== 'object') return null;
  const score = Number(r.score);
  if (!Number.isFinite(score)) return null;
  return {
    name: String(r.name ?? DEFAULT_NAME).slice(0, MAX_NAME) || DEFAULT_NAME,
    score,
    lines: Number.isFinite(Number(r.lines)) ? Number(r.lines) : 0,
    maxCombo: Number.isFinite(Number(r.maxCombo)) ? Number(r.maxCombo) : 0,
    date: typeof r.date === 'string' ? r.date : '',
  };
}

function loadRecords() {
  try {
    const data = JSON.parse(localStorage.getItem(RECORDS_KEY));
    if (!Array.isArray(data)) return [];
    return data.map(sanitizeRecord).filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RECORDS);
  } catch (e) {
    return [];
  }
}

// Devuelve false si no se pudo escribir (modo privado, cuota llena…).
function saveRecords(list) {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    return false;
  }
}

// Estadísticas históricas: se guardan aparte para que sobrevivan aunque la
// partida no entre en el top 5.
function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY));
    return {
      bestCombo: Number.isFinite(s?.bestCombo) ? s.bestCombo : 0,
      maxLines: Number.isFinite(s?.maxLines) ? s.maxLines : 0,
    };
  } catch (e) {
    return { bestCombo: 0, maxLines: 0 };
  }
}

function saveStats(stats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
}

// Posición (0-based) que ocuparía una puntuación, o -1 si no entra en el top.
function recordRank(list, value) {
  if (value <= 0) return -1;
  let i = 0;
  while (i < list.length && list[i].score >= value) i++;
  return i < MAX_RECORDS ? i : -1;
}

function insertRecord(list, entry) {
  const rank = recordRank(list, entry.score);
  if (rank < 0) return { list, rank };
  const updated = list.slice();
  updated.splice(rank, 0, entry);
  return { list: updated.slice(0, MAX_RECORDS), rank };
}

// ---- Renderizado (solo textContent: los nombres nunca se interpretan como HTML) ----

function cell(tag, text, className) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}

function renderRecords(container, list, highlightIndex) {
  container.replaceChildren();

  const table = document.createElement('table');
  table.className = 'records-table';
  const head = document.createElement('tr');
  ['#', 'Nombre', 'Puntos', 'Lín.', 'Combo'].forEach(h => head.appendChild(cell('th', h)));
  table.appendChild(head);

  if (!list.length) {
    const tr = document.createElement('tr');
    const td = cell('td', 'Sin records todavía', 'records-empty');
    td.colSpan = 5;
    tr.appendChild(td);
    table.appendChild(tr);
  }

  list.forEach((r, i) => {
    const tr = document.createElement('tr');
    if (i === highlightIndex) tr.className = 'records-highlight';
    if (r.date) {
      const d = new Date(r.date);
      if (!isNaN(d)) tr.title = d.toLocaleString();
    }
    tr.appendChild(cell('td', String(i + 1)));
    tr.appendChild(cell('td', r.name, 'records-name'));
    tr.appendChild(cell('td', r.score.toLocaleString(), 'records-num'));
    tr.appendChild(cell('td', String(r.lines), 'records-num'));
    tr.appendChild(cell('td', String(r.maxCombo), 'records-num'));
    table.appendChild(tr);
  });
  container.appendChild(table);

  const stats = loadStats();
  const statsEl = document.createElement('p');
  statsEl.className = 'records-stats';
  statsEl.append('Mejor combo: ');
  statsEl.appendChild(cell('strong', String(stats.bestCombo)));
  statsEl.append(' · Líneas máx.: ');
  statsEl.appendChild(cell('strong', String(stats.maxLines)));
  container.appendChild(statsEl);

  const resetBtn = cell('button', 'Resetear records', 'records-reset');
  resetBtn.type = 'button';
  resetBtn.addEventListener('click', resetRecords);
  container.appendChild(resetBtn);
}

function resetRecords(e) {
  if (e) e.currentTarget.blur();
  if (!confirm('¿Borrar todos los records y estadísticas?')) return;
  try {
    localStorage.removeItem(RECORDS_KEY);
    localStorage.removeItem(STATS_KEY);
  } catch (err) {}
  pendingRecord = null;
  nameForm.classList.add('hidden');
  newRecordMsg.classList.add('hidden');
  renderRecords(startRecordsEl, [], -1);
  renderRecords(goRecordsEl, [], -1);
}

// ---- Ganchos llamados desde game.js ----

// init(): reinicia el combo y aplica el nombre escrito (o el por defecto) a un record pendiente.
function recordsOnGameStart() {
  if (pendingRecord) commitPendingRecord(nameInput.value);
  combo = 0;
  maxCombo = 0;
  gameOverHandled = false;
  startScreen.classList.add('hidden');
  // El overlay también se usa para la pausa: ocultar la parte de records.
  goRecordsEl.classList.add('hidden');
  nameForm.classList.add('hidden');
  newRecordMsg.classList.add('hidden');
}

// clearLines(): se llama en cada pieza fijada con el número de líneas eliminadas.
function recordsTrackClear(cleared) {
  combo = cleared ? combo + 1 : 0;
  if (combo > maxCombo) maxCombo = combo;
}

// endGame(): actualiza estadísticas y muestra la tabla en el overlay de game over.
function recordsOnGameOver() {
  if (gameOverHandled) return; // solo una vez por partida
  gameOverHandled = true;
  const stats = loadStats();
  saveStats({
    bestCombo: Math.max(stats.bestCombo, maxCombo),
    maxLines: Math.max(stats.maxLines, lines),
  });

  const list = loadRecords();
  const entry = { name: DEFAULT_NAME, score, lines, maxCombo, date: new Date().toISOString() };
  const { list: preview, rank } = insertRecord(list, entry);

  goRecordsEl.classList.remove('hidden');
  if (rank >= 0) {
    // Se guarda ya con el nombre por defecto para no perderlo si se cierra la pestaña.
    saveRecords(preview);
    pendingRecord = entry;
    newRecordMsg.textContent = `¡Nuevo record! Puesto #${rank + 1}`;
    newRecordMsg.classList.remove('hidden');
    nameForm.classList.remove('hidden');
    renderRecords(goRecordsEl, preview.map((r, i) => (i === rank ? { ...r, name: '???' } : r)), rank);
    nameInput.value = '';
    nameInput.focus();
  } else {
    pendingRecord = null;
    newRecordMsg.classList.add('hidden');
    nameForm.classList.add('hidden');
    renderRecords(goRecordsEl, list, -1);
  }
}

// Pone el nombre al record pendiente. Devuelve su posición o -1 si no se pudo guardar.
function commitPendingRecord(name) {
  if (!pendingRecord) return -1;
  const { score: s, date } = pendingRecord;
  pendingRecord = null;
  const list = loadRecords();
  const rank = list.findIndex(r => r.score === s && r.date === date);
  if (rank < 0) return -1;
  list[rank].name = name.trim().slice(0, MAX_NAME) || DEFAULT_NAME;
  return saveRecords(list) ? rank : -1;
}

function showStartScreen() {
  renderRecords(startRecordsEl, loadRecords(), -1);
  startScreen.classList.remove('hidden');
  playBtn.focus();
}

// ---- Eventos ----

nameForm.addEventListener('submit', e => {
  e.preventDefault();
  const rank = commitPendingRecord(nameInput.value);
  nameInput.blur();
  nameForm.classList.add('hidden');
  newRecordMsg.textContent = rank >= 0 ? `Guardado en el puesto #${rank + 1}` : 'No se pudo guardar el record';
  renderRecords(goRecordsEl, loadRecords(), rank);
});

// Evita que las teclas escritas en el nombre lleguen al manejador del juego.
nameInput.addEventListener('keydown', e => {
  e.stopPropagation();
  // Ignora la auto-repetición de una tecla que seguía pulsada al acabar la partida.
  if (e.repeat) e.preventDefault();
});

// Igual que con Jugar: si Reiniciar conserva el foco, Space lo volvería a activar.
document.getElementById('restart-btn').addEventListener('click', e => e.currentTarget.blur());

playBtn.addEventListener('click', () => {
  playBtn.blur(); // evita que Space vuelva a activar el botón
  init();
});

document.addEventListener('keydown', e => {
  if (e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
  if (startScreen.classList.contains('hidden')) return;
  if (e.target instanceof HTMLButtonElement) return; // el botón ya gestiona su Enter
  e.preventDefault();
  init();
});
