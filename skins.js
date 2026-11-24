'use strict';

// ---- Skins visuales ----
// Cada skin define su paleta (índice 0 = vacío, 1..7 = I, O, T, S, Z, J, L),
// los colores de fondo/rejilla y su propia función para dibujar un bloque.
// drawBlock(ctx, px, py, size, color, alpha) recibe coordenadas en píxeles
// de la esquina superior izquierda de la celda. La opacidad (alpha) ya viene
// aplicada en ctx.globalAlpha; se pasa por si la skin quiere ajustar efectos.
// boardBg / gridColor / nextBg en null = usar los colores del tema (CSS).

const SKIN_STORAGE_KEY = 'tetris.skin';
const DEFAULT_SKIN = 'retro';

// Rectángulo redondeado con fallback a arcTo si no hay roundRect
function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Patrón de textura para la skin pixel art (5×5 dentro del bloque):
// 1 = píxel claro, -1 = píxel oscuro, 0 = color base
const PIXEL_PATTERN = [
  [ 1,  1,  0,  0,  0],
  [ 1,  0,  0,  0,  0],
  [ 0,  0,  1,  0,  0],
  [ 0,  0,  0,  0, -1],
  [ 0,  0,  0, -1, -1],
];

const SKINS = {
  retro: {
    name: 'Retro',
    colors: [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#447170', // J - verde azulado
      '#ffb74d', // L - orange
    ],
    boardBg: null,
    gridColor: null,
    nextBg: null,
    drawBlock(ctx, px, py, size, color) {
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      // brillo superior
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(px + 1, py + 1, size - 2, 4);
    },
  },

  neon: {
    name: 'Neón',
    colors: [
      null,
      '#00f0ff', // I
      '#fff200', // O
      '#d400ff', // T
      '#39ff14', // S
      '#ff1744', // Z
      '#2979ff', // J
      '#ff9100', // L
    ],
    boardBg: '#000000',
    gridColor: '#101018',
    nextBg: '#000000',
    drawBlock(ctx, px, py, size, color, alpha) {
      const a = alpha ?? 1;
      ctx.shadowColor = color;
      ctx.shadowBlur = a < 1 ? size * 0.2 : size * 0.5;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 3, py + 3, size - 6, size - 6);
      // el glow solo se aplica al contorno: un único dibujo con desenfoque por bloque
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = color;
      ctx.globalAlpha = a * 0.35;
      ctx.fillRect(px + 3, py + 3, size - 6, size - 6);
      // núcleo brillante
      ctx.globalAlpha = a * 0.9;
      ctx.fillRect(px + size / 2 - 3, py + size / 2 - 3, 6, 6);
      ctx.globalAlpha = a;
    },
  },

  pastel: {
    name: 'Pastel',
    colors: [
      null,
      '#a8e6f0', // I
      '#fff1a8', // O
      '#dcc1ef', // T
      '#bfe8c0', // S
      '#f7b9b9', // Z
      '#a9c9e8', // J
      '#ffd6a8', // L
    ],
    boardBg: '#2a2733',
    gridColor: '#35313f',
    nextBg: '#2a2733',
    drawBlock(ctx, px, py, size, color) {
      const r = size * 0.25;
      roundedRectPath(ctx, px + 2, py + 2, size - 4, size - 4, r);
      ctx.fillStyle = color;
      ctx.fill();
      // brillo suave
      roundedRectPath(ctx, px + 5, py + 4, size - 10, size * 0.3, r * 0.6);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
    },
  },

  pixel: {
    name: 'Pixel art',
    colors: [
      null,
      '#3cbcfc', // I
      '#f8b800', // O
      '#b53fdb', // T
      '#58d854', // S
      '#e40058', // Z
      '#0058f8', // J
      '#f87858', // L
    ],
    boardBg: '#101020',
    gridColor: '#1c1c30',
    nextBg: '#101020',
    drawBlock(ctx, px, py, size, color) {
      const u = Math.max(1, Math.floor(size / 10)); // tamaño del "píxel"
      ctx.fillStyle = color;
      ctx.fillRect(px, py, size, size);
      // bisel: claro arriba/izquierda, oscuro abajo/derecha
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(px, py, size, u);
      ctx.fillRect(px, py, u, size);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(px, py + size - u, size, u);
      ctx.fillRect(px + size - u, py, u, size);
      // patrón de textura interior
      const n = PIXEL_PATTERN.length;
      const off = Math.floor((size - n * u) / 2);
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const v = PIXEL_PATTERN[r][c];
          if (!v) continue;
          ctx.fillStyle = v > 0 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
          ctx.fillRect(px + off + c * u, py + off + r * u, u, u);
        }
      }
      // contorno negro
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
    },
  },
};

let currentSkinId = DEFAULT_SKIN;
try {
  const saved = localStorage.getItem(SKIN_STORAGE_KEY);
  if (saved && Object.prototype.hasOwnProperty.call(SKINS, saved)) currentSkinId = saved;
} catch (e) {}

function getSkinId() {
  return currentSkinId;
}

function getSkin() {
  return SKINS[currentSkinId];
}

function setSkin(id) {
  if (!Object.prototype.hasOwnProperty.call(SKINS, id)) id = DEFAULT_SKIN;
  currentSkinId = id;
  try { localStorage.setItem(SKIN_STORAGE_KEY, id); } catch (e) {}
  return SKINS[id];
}
