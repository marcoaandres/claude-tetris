# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `skins.js`](#3-skinsjs)
    - [4. `game.js`](#4-gamejs)
    - [5. `records.js` y `records.css`](#5-recordsjs-y-recordscss)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) con colores diferenciados.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Sistema de puntuación** clásico de Tetris (100 / 300 / 500 / 800 multiplicado por nivel).
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Pausa** y **Game Over** con opción de reinicio.
- **Pantalla de inicio** con botón _Jugar_ (o `Enter`): el juego ya no arranca solo al cargar la página.
- **Tabla de records local** (top 5) guardada en `localStorage`, con nombre del jugador, puntos, líneas y mejor combo. Se muestra en la pantalla de inicio y en el Game Over, resaltando la puntuación nueva si entra en el top. Incluye un botón para resetear records.
- **Mejor combo** y **líneas máximas** históricas.
- **Skins visuales** seleccionables desde el panel (Retro, Neón, Pastel y Pixel art); el cambio se aplica al instante, sin recargar, y la preferencia se guarda en `localStorage` (clave `tetris.skin`).

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `P`       | Pausar / reanudar                 |
| `Enter`   | Empezar partida (pantalla de inicio) / guardar nombre del record |

---

## Cómo funciona

El juego se compone de varios archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un título `TETRIS` (`<h1 class="game-title">`) centrado sobre el tablero y el panel, con cada letra coloreada con los colores de las piezas. También es el `<title>` de la pestaña.
- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, vista de la siguiente pieza, selector de skin (`<select id="skin-select">`) y la lista de controles.
- Un overlay para los estados **PAUSA** y **GAME OVER** (en Game Over incluye el campo de nombre y la tabla de records).
- Un overlay `#start-screen` con el botón **Jugar** y la tabla de records.

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_: fondo oscuro, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays.

### 3. `skins.js`

Define el objeto `SKINS` con las cuatro apariencias. Cada skin tiene:

- `name`: etiqueta que se muestra en el selector.
- `colors`: paleta por tipo de pieza (índice 0 vacío, 1–7 para I, O, T, S, Z, J, L).
- `boardBg`, `gridColor`, `nextBg`: fondo del tablero, color de la rejilla y fondo de la vista previa (`null` = usar los colores del tema claro/oscuro).
- `drawBlock(ctx, px, py, size, color, alpha)`: cómo se pinta un bloque.

| Skin      | Estilo                                                                         |
| --------- | ------------------------------------------------------------------------------ |
| Retro     | Bloques cuadrados y colores planos (el aspecto original).                      |
| Neón      | Fondo negro y efecto _glow_ con `shadowBlur` del color de la pieza.            |
| Pastel    | Colores suaves y bordes redondeados (`roundRect`, con _fallback_ a `arcTo`).   |
| Pixel art | Bisel y patrón de píxeles claros/oscuros dibujado sobre cada bloque.           |

También expone `getSkin()` (skin activa), `getSkinId()` (su identificador) y `setSkin(id)` (cambia y guarda la preferencia en `localStorage`; por defecto `retro`). Se carga **antes** que `game.js`.

> Retro usa los colores del tema claro/oscuro; Neón, Pastel y Pixel art pintan su propio fondo en el canvas, por lo que el tablero mantiene su aspecto en ambos temas.

### 4. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice de color (1–7) que identifica la pieza.
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW`).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.

### 5. `records.js` y `records.css`

Tabla de records local. `records.js` se carga **antes** de `game.js` y expone unos ganchos que el juego llama:

| Función                  | Llamada desde    | Qué hace                                                                                                 |
| ------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------- |
| `recordsOnGameStart()`   | `init()`         | Reinicia el combo, oculta la pantalla de inicio y guarda un record pendiente con el nombre por defecto. |
| `recordsTrackClear(n)`   | `clearLines()`   | Lleva el combo: +1 si la pieza fijada eliminó líneas, 0 si no.                                           |
| `recordsOnGameOver()`    | `endGame()`      | Actualiza estadísticas y, si la puntuación entra en el top 5, pide el nombre.                            |
| `showStartScreen()`      | arranque         | Muestra la pantalla de inicio con la tabla.                                                              |

Datos en `localStorage` (lecturas y escrituras protegidas con `try/catch`; datos corruptos = lista vacía):

- `tetris.records`: `[{ name, score, lines, maxCombo, date }]`, ordenado por puntuación descendente, máximo 5 entradas.
- `tetris.stats`: `{ bestCombo, maxLines }`, mejor combo y líneas máximas históricas. Se guardan aparte para que cuenten aunque la partida no entre en el top 5.

El **combo** es el número de piezas fijadas consecutivas que eliminan al menos una línea. El nombre admite hasta 12 caracteres (`Jugador` si se deja vacío) y se pinta con `textContent`, nunca como HTML. Si se pulsa **Reiniciar** sin guardar, el record se guarda con el nombre por defecto. **Resetear records** pide confirmación y borra ambas claves.

### Flujo del juego

```
showStartScreen()  → botón Jugar / Enter
        ↓
init()
  ├─ createBoard()                  → matriz vacía
  ├─ next = randomPiece()
  ├─ spawn()                        → mueve next a current y genera nueva next
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza actual)
     └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / pausa
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()` y se muestra el overlay de **Game Over** con la tabla de records.

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y canvas
├── style.css       # Estilos del juego (dark theme)
├── skins.js        # Skins visuales (paletas y funciones de dibujo)
├── game.js         # Toda la lógica del Tetris (~350 líneas)
├── records.js      # Tabla de records local (localStorage)
├── records.css     # Estilos de la tabla de records y pantalla de inicio
└── README.md
```

---

## Personalización

Algunos parámetros fáciles de tunear en `game.js` y `skins.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `SKINS[id].colors` (`skins.js`) | Paleta de colores por tipo de pieza de cada skin | 7 colores por skin |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |

> Para añadir una skin nueva basta con agregar una entrada a `SKINS` en `skins.js`: aparecerá automáticamente en el selector.

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
