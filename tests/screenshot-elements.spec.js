/**
 * Visual tests: element SVGs (goals, cones, etc.) are correctly rendered
 * in exported screenshots.
 *
 * Background: html-to-image inlines computed styles on SVG child elements and
 * sets display:none on <defs>/<pattern> nodes, which breaks url(#id) pattern
 * references. The fix renders element SVGs as standalone SVG images drawn
 * directly on the export canvas.
 *
 * Board: 4500 × 2500 (landscape).
 * Lowest-quality export: 900 × 500 (scale = 0.2).
 *
 * Element positions chosen to be unambiguous across rotations.
 *
 *   Object    | board (bx, by) | type
 *   --------- | -------------- | ----
 *   Goal      |  (900, 1250)   | element SVG (crosshatch net + red post)
 *   Small goal| (3600, 1250)   | element SVG (crosshatch net + red post)
 *   Cone      | (2250,  625)   | element SVG (orange triangle)
 *   Player    |  (900,  500)   | regular entity (red circle)
 *
 * Expected pixel for board (bx, by) at board rotation:
 *   0°   (900×500): (bx/5, by/5)
 *   90°  (500×900): (500−by/5, bx/5)
 *   180° (900×500): (900−bx/5, 500−by/5)
 *   270° (500×900): (by/5, 900−bx/5)
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';
import * as fs from 'fs';
import * as path from 'path';

const BW = 4500, BH = 2500;   // board dimensions
const SW = 900,  SH = 500;    // landscape screenshot dimensions

// Board positions
const POS = {
    goal:      { bx: 900,  by: 1250 },
    smallGoal: { bx: 3600, by: 1250 },
    cone:      { bx: 2250, by: 625  },
    player:    { bx: 900,  by: 500  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Expected screenshot pixel (cx,cy) for board position (bx,by) at rotation. */
function expectedPixel(bx, by, rotation) {
    const nx = Math.round(bx * SW / BW);
    const ny = Math.round(by * SH / BH);
    switch (rotation) {
        case 0:   return { x: nx,        y: ny };
        case 90:  return { x: SH - ny,   y: nx };
        case 180: return { x: SW - nx,   y: SH - ny };
        case 270: return { x: ny,        y: SW - nx };
    }
}

/** Rotate board right via context-menu. */
async function rotateBoardRight(page) {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 20, bb.y + 20, { button: 'right' });
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.locator('[data-action="rotate-right"]').click();
    await page.waitForTimeout(400);
}

/** Intercept URL.createObjectURL – capture PNG only (SVG element blobs use data URIs). */
async function interceptNextScreenshot(page) {
    await page.evaluate(() => {
        window.__screenshotDataUrl = undefined;
        const orig = URL.createObjectURL;
        URL.createObjectURL = function (blob) {
            if (blob.type === 'image/png') {
                const reader = new FileReader();
                reader.onload = e => { window.__screenshotDataUrl = e.target.result; };
                reader.readAsDataURL(blob);
                URL.createObjectURL = orig;
                return '#';
            }
            return orig.call(URL, blob);
        };
    });
}

/** Export the lowest-quality (900-wide) screenshot and return its data URL. */
async function exportLowestQuality(page) {
    await interceptNextScreenshot(page);
    await page.click('#btn-screenshot');
    const menu = page.locator('#screenshot-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.locator('[data-action="screenshot"][data-width="900"]').click();
    await page.waitForFunction(() => window.__screenshotDataUrl !== undefined, { timeout: 20000 });
    return page.evaluate(() => window.__screenshotDataUrl);
}

/**
 * Count opaque non-background pixels in a radius around (cx, cy).
 * "Background" = the blue-gray futsal court colour ≈ (48, 142, 188).
 */
async function countObjectPixels(page, dataUrl, cx, cy, radius = 14) {
    return page.evaluate(({ url, cx, cy, r }) => new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            let count = 0;
            for (let dx = -r; dx <= r; dx++) {
                for (let dy = -r; dy <= r; dy++) {
                    const px = Math.max(0, Math.min(c.width - 1,  cx + dx));
                    const py = Math.max(0, Math.min(c.height - 1, cy + dy));
                    const [red, grn, blu, alpha] = ctx.getImageData(px, py, 1, 1).data;
                    if (alpha < 64) continue;
                    // Skip the court background (blue-ish ~48,142,188) and white lines
                    const isCourt = (grn > 100 && blu > 140 && red < 100);
                    const isWhite = (red > 230 && grn > 230 && blu > 230);
                    if (!isCourt && !isWhite) count++;
                }
            }
            resolve(count);
        };
        img.src = url;
    }), { url: dataUrl, cx, cy, r: radius });
}

/** Save annotated PNG to test-results/ for visual inspection. */
async function saveAnnotated(page, dataUrl, markers, outFile) {
    await page.evaluate(({ url, markers, outFile }) => new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            markers.forEach(({ x, y, color, label }) => {
                ctx.strokeStyle = color; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12); ctx.stroke();
                if (label) {
                    ctx.fillStyle = color; ctx.font = '10px sans-serif';
                    ctx.fillText(label, x + 4, y - 4);
                }
            });
            window.__annotatedDataUrl = c.toDataURL('image/png');
            resolve();
        };
        img.src = url;
    }), { url: dataUrl, markers, outFile });

    const ann = await page.evaluate(() => window.__annotatedDataUrl);
    const buf = Buffer.from(ann.replace(/^data:image\/png;base64,/, ''), 'base64');
    fs.mkdirSync('test-results', { recursive: true });
    fs.writeFileSync(path.join('test-results', outFile), buf);
}

// ── Tests ────────────────────────────────────────────────────────────────────

for (const rotation of [0, 90, 180, 270]) {
    test(`element SVGs visible in screenshot at ${rotation}° rotation`, async ({ page }) => {
        test.setTimeout(60000);
        await goto(page);

        // Clear default elements and add exactly the test set
        await page.evaluate(() => {
            AppState.elements = [];
            AppState.addElement('goal',       900,  1250);
            AppState.addElement('small-goal', 3600, 1250);
            AppState.addElement('cone',       2250,  625, '#ff6b35');
            Elements.render();

            // Add a player for reference
            AppState.addPlayer('team-2', 900, 500);
            App.render();
        });
        await page.waitForTimeout(200);

        // Rotate board to the desired angle
        for (let r = 0; r < rotation / 90; r++) {
            await rotateBoardRight(page);
        }

        // Deselect everything before screenshot
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);

        const dataUrl = await exportLowestQuality(page);

        // Compute expected pixel positions
        const goalPx      = expectedPixel(POS.goal.bx,      POS.goal.by,      rotation);
        const sgPx        = expectedPixel(POS.smallGoal.bx, POS.smallGoal.by, rotation);
        const conePx      = expectedPixel(POS.cone.bx,      POS.cone.by,      rotation);
        const playerPx    = expectedPixel(POS.player.bx,    POS.player.by,    rotation);

        // Save annotated image for inspection
        await saveAnnotated(page, dataUrl, [
            { ...goalPx,   color: '#ff0000', label: 'goal' },
            { ...sgPx,     color: '#ff6600', label: 'sg' },
            { ...conePx,   color: '#00ff00', label: 'cone' },
            { ...playerPx, color: '#0000ff', label: 'player' },
        ], `screenshot-elements-rot${rotation}.png`);

        // Count object pixels near each expected position
        const goalCount   = await countObjectPixels(page, dataUrl, goalPx.x,   goalPx.y);
        const sgCount     = await countObjectPixels(page, dataUrl, sgPx.x,     sgPx.y);
        const coneCount   = await countObjectPixels(page, dataUrl, conePx.x,   conePx.y);
        const playerCount = await countObjectPixels(page, dataUrl, playerPx.x, playerPx.y);

        // Player (reference entity) should always be visible
        expect(playerCount, `Player visible at ${rotation}°`).toBeGreaterThan(5);

        // Goal should be visible (crosshatch net renders as non-background pixels)
        expect(goalCount,   `Goal visible at ${rotation}°`).toBeGreaterThan(5);

        // Small-goal should be visible
        expect(sgCount,     `Small-goal visible at ${rotation}°`).toBeGreaterThan(5);

        // Cone should be visible (bright orange)
        expect(coneCount,   `Cone visible at ${rotation}°`).toBeGreaterThan(5);
    });
}
