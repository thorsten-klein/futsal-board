/**
 * Visual tests for screenshot object positioning.
 *
 * Four distinctly-coloured objects are placed at the four "quarters" of the
 * board (not at the centre) and the exported screenshot is analysed pixel by
 * pixel to verify each object appears at the mathematically expected position.
 *
 * Objects:
 *   • Red   player  (team-2 #e74c3c) at board (900,  500)   ← top-left
 *   • Orange ball   (#FF6B35)         at board (3600, 500)   ← top-right
 *   • Yellow plate  (#FFD700)         at board (900,  2000)  ← bottom-left
 *   • Green  rect   (#2ecc71 fill)    at board (3600, 2000)  ← bottom-right
 *
 * Board: 4500 × 2500.  Lowest-quality export: 900 × 500 (scale = 0.2).
 *
 * Expected screenshot pixel for board position (bx, by):
 *   0°   (900×500): (bx/5,       by/5)
 *   90°  (500×900): (500−by/5,   bx/5)
 *   180° (900×500): (900−bx/5,   500−by/5)
 *   270° (500×900): (by/5,       900−bx/5)
 *
 * Also verifies that the selected-state glow of a player is NOT included
 * in the exported screenshot (the exporter must deselect before rendering).
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';
import * as fs from 'fs';
import * as path from 'path';

// ── Constants ─────────────────────────────────────────────────────────────────
const BW = 4500, BH = 2500;          // board dimensions (board units / cm)
const SW = 900,  SH = 500;           // native-landscape screenshot dimensions

// Object board positions (non-centre so rotation errors are detectable)
const POS = {
    player: { bx: 900,  by: 500  },  // top-left
    ball:   { bx: 3600, by: 500  },  // top-right
    plate:  { bx: 900,  by: 2000 },  // bottom-left
    shape:  { bx: 3600, by: 2000 },  // bottom-right
};

// Colour predicates
const isRed    = p => p.r > 160 && p.g < 100 && p.b < 100;
const isOrange = p => p.r > 200 && p.g > 60  && p.g < 160 && p.b < 80;
const isYellow = p => p.r > 200 && p.g > 170 && p.b < 80;
const isGreen  = p => p.r < 80  && p.g > 150 && p.b < 130;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Right-click board and rotate right. */
async function rotateBoardRight(page) {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 20, bb.y + 20, { button: 'right' });
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.locator('[data-action="rotate-right"]').click();
    await page.waitForTimeout(400);
}

/** Intercept the next URL.createObjectURL call and return the blob as dataURL. */
async function interceptNextScreenshot(page) {
    await page.evaluate(() => {
        window.__screenshotDataUrl = undefined;
        const orig = URL.createObjectURL;
        URL.createObjectURL = function (blob) {
            const reader = new FileReader();
            reader.onload = e => { window.__screenshotDataUrl = e.target.result; };
            reader.readAsDataURL(blob);
            URL.createObjectURL = orig;
            return '#';
        };
    });
}

/** Open the screenshot menu and click the 900×500 (lowest quality) entry. */
async function exportLowestQuality(page) {
    await interceptNextScreenshot(page);
    await page.click('#btn-screenshot');
    const menu = page.locator('#screenshot-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.locator('[data-action="screenshot"][data-width="900"]').click();
    await page.waitForFunction(() => window.__screenshotDataUrl !== undefined, { timeout: 15000 });
    return page.evaluate(() => window.__screenshotDataUrl);
}

/**
 * For board position (bx,by) compute the expected pixel in the exported
 * screenshot at the given board rotation.
 */
function expectedPixel(bx, by, rotation) {
    const nx = Math.round(bx * SW / BW);  // native landscape x pixel
    const ny = Math.round(by * SH / BH);  // native landscape y pixel
    switch (rotation) {
        case 0:   return { x: nx,        y: ny };
        case 90:  return { x: SH - ny,   y: nx };   // output is SH×SW (500×900)
        case 180: return { x: SW - nx,   y: SH - ny };
        case 270: return { x: ny,        y: SW - nx }; // output is SH×SW (500×900)
    }
}

/**
 * Sample all pixels in a radius around (cx, cy) in the dataUrl image.
 * Returns [{r,g,b}, …].
 */
async function sampleRegion(page, dataUrl, cx, cy, radius = 14) {
    return page.evaluate(({ url, cx, cy, r }) => new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const pixels = [];
            for (let dx = -r; dx <= r; dx += 2) {
                for (let dy = -r; dy <= r; dy += 2) {
                    const px = Math.max(0, Math.min(c.width  - 1, cx + dx));
                    const py = Math.max(0, Math.min(c.height - 1, cy + dy));
                    const d = ctx.getImageData(px, py, 1, 1).data;
                    pixels.push({ r: d[0], g: d[1], b: d[2] });
                }
            }
            resolve(pixels);
        };
        img.src = url;
    }), { url: dataUrl, cx, cy, r: radius });
}

/**
 * Save an annotated PNG to test-results/ for visual inspection.
 * Draws a coloured cross-hair at each expected position.
 */
async function saveAnnotated(page, dataUrl, rotation, markers) {
    const annotated = await page.evaluate(({ url, markers }) => new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            markers.forEach(({ x, y, color, label }) => {
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10); ctx.stroke();
                ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
                ctx.strokeText(label, x + 4, y - 4);
                ctx.fillStyle = color;
                ctx.fillText(label, x + 4, y - 4);
            });
            resolve(c.toDataURL('image/png'));
        };
        img.src = url;
    }), { url: dataUrl, markers });

    const base64 = annotated.replace(/^data:image\/png;base64,/, '');
    const dir = path.join(process.cwd(), 'test-results');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `screenshot-objects-rot${rotation}.png`), Buffer.from(base64, 'base64'));
}

/** Add all test objects at the four corners and re-render. */
async function addTestObjects(page) {
    await page.evaluate(() => {
        // Red player (team-2) – top-left
        AppState.addPlayer('team-2', 900, 500);

        // Orange ball – top-right
        AppState.addBall('#FF6B35', 3600, 500);

        // Yellow plate – bottom-left
        AppState.addPlate('#FFD700', 900, 2000);

        // Green rectangle shape (solid fill) – bottom-right
        AppState.shapes.push({
            id: 'test-shape-rect',
            type: 'rectangle',
            x: 3600, y: 2000,
            width: 600, height: 400,
            rotation: 0,
            color: '#27ae60',
            fillColor: '#2ecc71',
            strokeWidth: 8,
            visible: true,
            inherited: false,
        });

        Players.render();
        Balls.render();
        Plates.render();
        Shapes.render();
        Elements.render();
    });
    await page.waitForTimeout(200);
}

// ── Core check ────────────────────────────────────────────────────────────────

/**
 * Export a screenshot at the given rotation (board already rotated by the
 * caller) and assert each object appears at its expected pixel location.
 */
async function checkPositions(page, rotation) {
    const dataUrl = await exportLowestQuality(page);

    const portrait = rotation === 90 || rotation === 270;
    const dims = await page.evaluate(url => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.src = url;
    }), dataUrl);
    expect(dims.w).toBe(portrait ? SH : SW);
    expect(dims.h).toBe(portrait ? SW : SH);

    const checks = [
        { name: 'player (red)',   ...POS.player, pred: isRed    },
        { name: 'ball (orange)',  ...POS.ball,   pred: isOrange },
        { name: 'plate (yellow)', ...POS.plate,  pred: isYellow },
        { name: 'shape (green)',  ...POS.shape,  pred: isGreen  },
    ];

    const markers = [];
    const failures = [];

    for (const { name, bx, by, pred } of checks) {
        const pt = expectedPixel(bx, by, rotation);
        const pixels = await sampleRegion(page, dataUrl, pt.x, pt.y, 14);
        const found = pixels.some(pred);
        markers.push({ x: pt.x, y: pt.y, color: found ? '#00ff00' : '#ff0000', label: name });
        if (!found) failures.push(`${name}: expected colour not found near (${pt.x}, ${pt.y}) at ${rotation}°`);
    }

    await saveAnnotated(page, dataUrl, rotation, markers);

    if (failures.length > 0) {
        throw new Error('Screenshot object positions incorrect:\n' + failures.join('\n'));
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Screenshot – object visual positions', () => {
    test.setTimeout(90000);

    test('objects at correct positions in 0° screenshot', async ({ page }) => {
        await goto(page);
        await addTestObjects(page);
        await checkPositions(page, 0);
    });

    test('objects at correct positions in 90° screenshot', async ({ page }) => {
        await goto(page);
        await addTestObjects(page);
        await rotateBoardRight(page);
        await checkPositions(page, 90);
    });

    test('objects at correct positions in 180° screenshot', async ({ page }) => {
        await goto(page);
        await addTestObjects(page);
        await rotateBoardRight(page);
        await rotateBoardRight(page);
        await checkPositions(page, 180);
    });

    test('objects at correct positions in 270° screenshot', async ({ page }) => {
        await goto(page);
        await addTestObjects(page);
        await rotateBoardRight(page);
        await rotateBoardRight(page);
        await rotateBoardRight(page);
        await checkPositions(page, 270);
    });

    test('rotation handle is NOT visible in exported screenshot when player is selected', async ({ page }) => {
        await goto(page);
        // Add a player at board centre and select it — this creates the orange rotation handle
        await page.evaluate(() => {
            AppState.addPlayer('team-2', 2250, 1250);  // board centre
            const player = AppState.players[AppState.players.length - 1];
            AppState.selectedPlayer = player;
            Players.render(); // creates the orange rotation handle div in #board-area
        });
        await page.waitForTimeout(200);

        const dataUrl = await exportLowestQuality(page);

        // The rotation handle is a DOM div with orange background (#f39c12 = rgb(243,156,18)).
        // It is placed ABOVE the player centre (rotation = 0, so directly upward).
        // At 0° rotation the player is at screenshot pixel (450, 250).
        // The handle sits ~40-50 px above that in screenshot coordinates.
        // We scan the region above the player for orange pixels.
        const centre = expectedPixel(2250, 1250, 0); // (450, 250)
        const hasOrangeHandle = await page.evaluate(({ url, cx, cy }) => new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth; c.height = img.naturalHeight;
                c.getContext('2d').drawImage(img, 0, 0);
                const ctx = c.getContext('2d');
                for (let x = cx - 50; x <= cx + 50; x += 2) {
                    for (let y = cy - 90; y <= cy - 10; y += 2) {
                        const px = Math.max(0, Math.min(c.width - 1, x));
                        const py = Math.max(0, Math.min(c.height - 1, y));
                        const [r, g, b] = ctx.getImageData(px, py, 1, 1).data;
                        if (r > 200 && g > 100 && g < 180 && b < 60) {
                            resolve(true);
                            return;
                        }
                    }
                }
                resolve(false);
            };
            img.src = url;
        }), { url: dataUrl, cx: centre.x, cy: centre.y });

        expect(
            hasOrangeHandle,
            'Orange rotation handle must NOT appear in screenshot when a player is selected — deselect before exporting'
        ).toBe(false);
    });
});

