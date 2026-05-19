/**
 * Tests for screenshot export at rotated board orientations.
 *
 * Bugs being reproduced and fixed:
 * 1. Screenshot is always landscape regardless of board rotation.
 *    At 90°/270° it should be portrait (width < height).
 * 2. The dropdown always shows landscape dimensions (e.g. 4500×2500).
 *    At 90°/270° it should show portrait dimensions (e.g. 2500×4500).
 * 3. Objects are not at their correct visual positions because the CSS
 *    rotate+scale transform is baked into the serialised SVG/DOM clones,
 *    corrupting positions in the export canvas.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Right-click board and choose a rotate action. */
async function rotateBoard(page, action = 'rotate-right') {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 20, bb.y + 20, { button: 'right' });
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.locator(`[data-action="${action}"]`).click();
    await page.waitForTimeout(400);
}

/**
 * Intercept the next screenshot download and return it as a data-URL.
 * Works by patching URL.createObjectURL before the export is triggered.
 */
async function interceptNextScreenshot(page) {
    await page.evaluate(() => {
        window.__screenshotDataUrl = undefined;
        const orig = URL.createObjectURL;
        URL.createObjectURL = function(blob) {
            const reader = new FileReader();
            reader.onload = (e) => { window.__screenshotDataUrl = e.target.result; };
            reader.readAsDataURL(blob);
            URL.createObjectURL = orig;   // restore for subsequent calls
            return '#';                   // prevent actual navigation
        };
    });
}

/** Open the screenshot menu, intercept download, click "Lowest Quality", wait for data. */
async function exportLowestQuality(page) {
    await interceptNextScreenshot(page);

    // Open the screenshot dropdown
    await page.click('#btn-screenshot');
    const menu = page.locator('#screenshot-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });

    // Click the lowest-quality entry (900×500 landscape or 500×900 portrait)
    await menu.locator('[data-action="screenshot"][data-width="900"]').click();

    // Wait up to 15 s for the blob to be captured
    await page.waitForFunction(() => window.__screenshotDataUrl !== undefined, { timeout: 15000 });
    return await page.evaluate(() => window.__screenshotDataUrl);
}

/** Decode image dimensions from a data-URL, using the browser. */
async function getImageDimensions(page, dataUrl) {
    return page.evaluate(async (url) => {
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });
        return { width: img.naturalWidth, height: img.naturalHeight };
    }, dataUrl);
}

/**
 * Sample the colour of a single pixel at (x, y) in a data-URL image.
 * Returns { r, g, b, a }.
 */
async function samplePixel(page, dataUrl, x, y) {
    return page.evaluate(async ({ url, px, py }) => {
        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = url;
        });
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        const [r, g, b, a] = c.getContext('2d').getImageData(px, py, 1, 1).data;
        return { r, g, b, a };
    }, { url: dataUrl, px: x, py: y });
}

test.describe('Screenshot rotation', () => {
    test.setTimeout(60000);

    // ── Dropdown labels ─────────────────────────────────────────────────────────

    test('dropdown shows landscape dimensions at 0°', async ({ page }) => {
        await goto(page);
        await page.click('#btn-screenshot');
        const menu = page.locator('#screenshot-menu');
        await expect(menu).toBeVisible({ timeout: 3000 });
        const text = await menu.innerText();
        // Board is 4500×2500 — landscape
        expect(text).toContain('4500×2500');
        expect(text).not.toContain('2500×4500');
        await page.keyboard.press('Escape');
    });

    test('dropdown shows portrait dimensions at 90°', async ({ page }) => {
        await goto(page);
        await rotateBoard(page, 'rotate-right'); // 90°

        await page.click('#btn-screenshot');
        const menu = page.locator('#screenshot-menu');
        await expect(menu).toBeVisible({ timeout: 3000 });
        const text = await menu.innerText();
        // At 90° the board is portrait → dimensions should be swapped
        expect(text).toContain('2500×4500');
        expect(text).not.toContain('4500×2500');
        await page.keyboard.press('Escape');
    });

    test('dropdown shows portrait dimensions at 270°', async ({ page }) => {
        await goto(page);
        // 3 right-rotations = 270°
        await rotateBoard(page, 'rotate-right');
        await rotateBoard(page, 'rotate-right');
        await rotateBoard(page, 'rotate-right');

        await page.click('#btn-screenshot');
        const menu = page.locator('#screenshot-menu');
        await expect(menu).toBeVisible({ timeout: 3000 });
        const text = await menu.innerText();
        expect(text).toContain('2500×4500');
        await page.keyboard.press('Escape');
    });

    test('dropdown shows landscape dimensions at 180°', async ({ page }) => {
        await goto(page);
        await rotateBoard(page, 'rotate-right');
        await rotateBoard(page, 'rotate-right'); // 180°

        await page.click('#btn-screenshot');
        const menu = page.locator('#screenshot-menu');
        await expect(menu).toBeVisible({ timeout: 3000 });
        const text = await menu.innerText();
        // 180° is still landscape (same footprint as 0°)
        expect(text).toContain('4500×2500');
        await page.keyboard.press('Escape');
    });

    // ── Screenshot dimensions ───────────────────────────────────────────────────

    test('screenshot is landscape at 0° (control)', async ({ page }) => {
        await goto(page);
        const dataUrl = await exportLowestQuality(page);
        const dims = await getImageDimensions(page, dataUrl);
        // Lowest quality: 900×500 (landscape)
        expect(dims.width).toBe(900);
        expect(dims.height).toBe(500);
    });

    test('screenshot is portrait at 90°', async ({ page }) => {
        await goto(page);
        await rotateBoard(page, 'rotate-right');
        const dataUrl = await exportLowestQuality(page);
        const dims = await getImageDimensions(page, dataUrl);
        // At 90°: swapped → 500×900
        expect(dims.width).toBe(500);
        expect(dims.height).toBe(900);
    });

    test('screenshot is portrait at 270°', async ({ page }) => {
        await goto(page);
        await rotateBoard(page, 'rotate-right');
        await rotateBoard(page, 'rotate-right');
        await rotateBoard(page, 'rotate-right');
        const dataUrl = await exportLowestQuality(page);
        const dims = await getImageDimensions(page, dataUrl);
        expect(dims.width).toBe(500);
        expect(dims.height).toBe(900);
    });

    test('screenshot is landscape at 180°', async ({ page }) => {
        await goto(page);
        await rotateBoard(page, 'rotate-right');
        await rotateBoard(page, 'rotate-right');
        const dataUrl = await exportLowestQuality(page);
        const dims = await getImageDimensions(page, dataUrl);
        // 180° keeps same aspect as 0°
        expect(dims.width).toBe(900);
        expect(dims.height).toBe(500);
    });

    // ── Player position in screenshot ──────────────────────────────────────────
    //
    // We add a player with a distinctive red colour at a known board position,
    // then verify it appears at the correct pixel in the screenshot.
    //
    // Board: 4500 × 2500.  "Lowest quality" export: 900 × 500.
    // Scale: 900/4500 = 0.2 in each direction.
    //
    // At 0°: player at board (450, 250) → screenshot pixel (90, 50).
    // At 90° CW: the canvas is rotated, so the mapping is:
    //   portrait size 500 × 900.
    //   source pixel (nx, ny) in [0..900]×[0..500] (native landscape)
    //   maps to final pixel  (500 - ny, nx).
    //   Player at board (450,250) → native (90,50) → final (450, 90).

    async function addRedPlayerAt(page, boardX, boardY) {
        return page.evaluate(({ bx, by }) => {
            // Use team-2 which has a red colour (#e74c3c) by default
            const player = {
                id: `player-test-${Date.now()}`,
                teamId: 'team-2',
                x: bx,
                y: by,
                number: 7,
                rotation: 0,
                visible: true,
            };
            AppState.players.push(player);
            Players.render();
            return player.id;
        }, { bx: boardX, by: boardY });
    }

    test('player at board centre appears at screenshot centre at 0°', async ({ page }) => {
        await goto(page);
        await addRedPlayerAt(page, 2250, 1250); // board centre

        const dataUrl = await exportLowestQuality(page);
        const dims = await getImageDimensions(page, dataUrl);

        // Centre pixel of the 900×500 screenshot
        const cx = Math.round(dims.width / 2);
        const cy = Math.round(dims.height / 2);

        // Sample a 20×20 region around the centre — at least one pixel should be reddish
        const colours = await page.evaluate(async ({ url, x, y, r }) => {
            const img = new Image();
            await new Promise(res => { img.onload = res; img.src = url; });
            const c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const result = [];
            for (let dx = -r; dx <= r; dx += 4) {
                for (let dy = -r; dy <= r; dy += 4) {
                    const d = ctx.getImageData(x + dx, y + dy, 1, 1).data;
                    result.push({ r: d[0], g: d[1], b: d[2] });
                }
            }
            return result;
        }, { url: dataUrl, x: cx, y: cy, r: 20 });

        const hasRed = colours.some(c => c.r > 160 && c.g < 80 && c.b < 80);
        expect(hasRed).toBe(true);
    });

    test('player at board centre appears at screenshot centre at 90°', async ({ page }) => {
        await goto(page);
        await rotateBoard(page, 'rotate-right');
        await addRedPlayerAt(page, 2250, 1250); // board centre

        const dataUrl = await exportLowestQuality(page);
        const dims = await getImageDimensions(page, dataUrl);

        // At 90°: portrait 500×900.  Centre of the portrait image.
        const cx = Math.round(dims.width / 2);
        const cy = Math.round(dims.height / 2);

        const colours = await page.evaluate(async ({ url, x, y, r }) => {
            const img = new Image();
            await new Promise(res => { img.onload = res; img.src = url; });
            const c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const result = [];
            for (let dx = -r; dx <= r; dx += 4) {
                for (let dy = -r; dy <= r; dy += 4) {
                    const d = ctx.getImageData(x + dx, y + dy, 1, 1).data;
                    result.push({ r: d[0], g: d[1], b: d[2] });
                }
            }
            return result;
        }, { url: dataUrl, x: cx, y: cy, r: 20 });

        const hasRed = colours.some(c => c.r > 160 && c.g < 80 && c.b < 80);
        expect(hasRed).toBe(true);
    });
});
