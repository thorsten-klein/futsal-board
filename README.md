# Futsal Tactics Board

A fully client-side, offline-capable futsal tactics board for coaches. No build step, no server required — open `index.html` directly in a browser or serve with `serve.sh`.

## Features

- **Multi-board workbooks** — create linked boards with parent/child inheritance for showing movement progressions
- **Players & teams** — add players with custom numbers, names, and colours for two teams
- **Balls, plates, cones** — additional pitch elements
- **Free-draw shapes** — arrows, rectangles, circles, and freehand lines
- **Animation recording** — record multi-step animations by saving board states as a chain
- **Video export** — export animations as WebM video (Chrome/Firefox; see [Browser Support](#browser-support))
- **Screenshot export** — export the current board as a PNG image
- **Workbook import/export** — save and load full workbooks as JSON files for sharing and backup
- **Undo/redo** — full undo/redo history (up to 50 steps)
- **Keyboard shortcuts** — `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Shift+Z` / `Ctrl/Cmd+Y` redo, `Delete` remove selected, `Ctrl/Cmd+C`/`V` copy/paste, `F` fullscreen
- **Touch support** — works on tablets and touchscreens
- **Auto-save** — board state is automatically saved to `localStorage`

## Getting Started

### Option 1: Open directly (simplest)

```
open index.html
```

Works in any modern browser. Screenshot and animation export also work offline because the `html-to-image` library is bundled in `ext/`.

### Option 2: Local HTTP server

```bash
./serve.sh
```

Then open [http://localhost:8000](http://localhost:8000). A local server is only needed if your browser blocks `file://` requests (rare).

## Browser Support

| Feature | Chrome | Firefox | Safari / iOS |
|---|---|---|---|
| General use | ✅ | ✅ | ✅ |
| Screenshot export | ✅ | ✅ | ✅ |
| Animation video export | ✅ | ✅ | ❌ (WebM not supported) |
| Offline use | ✅ | ✅ | ✅ |

Safari and iOS do not support WebM video recording. Animation video export will show an error message on those browsers.

## File Structure

```
futsal-board/
├── index.html          — App entry point
├── serve.sh            — Simple Python HTTP server helper
├── favicon.svg
├── css/
│   ├── main.css        — Global styles and layout
│   ├── board.css       — Board and pitch styles
│   └── controls.css    — Sidebar and control panel styles
├── ext/
│   ├── court.svg       — Futsal court graphic
│   ├── ball.svg        — Ball graphic
│   └── html-to-image.js — Vendored html-to-image@1.11.11 library
└── js/
    ├── app.js          — App initialisation, keyboard/touch handlers, screenshot export
    ├── state.js        — Global state, board management, undo/redo, localStorage persistence
    ├── board.js        — Board canvas rendering and resize
    ├── teams.js        — Team management and player templates
    ├── players.js      — Player elements, drag/drop, context menus
    ├── balls.js        — Ball elements
    ├── plates.js       — Plate/cone elements
    ├── elements.js     — Generic pitch elements
    ├── shapes.js       — Drawing shapes (arrows, rectangles, circles, freehand)
    ├── drawings.js     — Drawing layer management
    ├── animations.js   — Animation recording, playback, and video export
    └── storage.js      — Workbook/formation import and export
```

## Data Persistence

- **Auto-save**: The current workbook is saved to `localStorage` on every change.
- **Manual export**: Use *Export Workbook* to download a `.json` file for backup or sharing.
- **Import**: Use *Import Workbook* to load a previously exported `.json` file.

Clearing browser data will erase the auto-saved workbook. Export regularly for safety.

## Testing

The project uses Playwright for end-to-end testing with code coverage.

```bash
# Run all tests with coverage report
./test.sh

# Run tests in UI mode
npm run test:ui

# Update visual regression snapshots
npm run test:update-snapshots
```

After running tests, view the HTML coverage report at `coverage/index.html`.
