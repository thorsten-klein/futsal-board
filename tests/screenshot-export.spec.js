/**
 * Screenshot export tests — the camera button must work when the page is
 * opened directly as a file:// URL (no HTTP server), AND the exported PNG
 * must correctly contain every visual layer: background, court, and entities.
 *
 * Strategy for pixel-level verification
 * ──────────────────────────────────────
 * app.js calls URL.createObjectURL(blob) then immediately revokes the URL after
 * triggering the <a> download.  To sample pixels we intercept createObjectURL,
 * convert the blob to a data: URL via FileReader (synchronous blob read), store
 * it in window.__screenshotDataUrl, then load that data: URL into an offscreen
 * canvas and call getImageData at strategic positions.
 *
 * Expected colours (parquet background — light beige planks, avg ≈ #ead5b0):
 *
 *   • Court pitch centre (50 %, 50 %)
 *       Court fill #0280c6 @ 80 % opacity over #b47035
 *       ≈ R: 38, G: 124, B: 169  → blue clearly dominates red  (B > R + 80)
 *
 *   • Court gray border (2 %, 50 %) — between canvas edge and pitch
 *       Court border #b7b7b7 @ 80 % over #b47035
 *       ≈ R: 182, G: 168, B: 157  → light and neutral (all channels > 100,
 *         channels within 30 of each other)
 *
 *     REGRESSION CATCH: before the width/height-injection fix, Chrome rendered
 *     the SVG at its intrinsic 300 × 150 viewport (2 : 1 AR) while the viewBox
 *     is 4500 × 2500 (1.8 : 1 AR).  preserveAspectRatio="xMidYMid meet" then
 *     letterboxed the content into a 270 × 150 area, leaving 15 px transparent
 *     bands on each side.  After scaling to the export canvas, x=2 % mapped
 *     into that transparent band — showing only the parquet background (warm,
 *     R > B by ~120) instead of the neutral gray court border.
 *
 *   • Player entity — a team-1 player (default blue #3498db) is added before
 *     the screenshot and its screen position is mapped to canvas coordinates.
 *     Blue channel should clearly dominate red at that pixel.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

// The background is now an inline SVG parquet pattern (no fetch needed).
// The court SVG is also inlined in the DOM.  Neither layer requires a server
// or special flags to work under file:// protocol.
test.use({
    launchOptions: { args: ['--allow-file-access-from-files'] },
});

// ── helper ────────────────────────────────────────────────────────────────────
/**
 * Intercept the next PNG blob produced by the screenshot button, convert it to
 * a data URL inside the page (before the blob URL is revoked), then sample
 * pixels at the given fractional positions {name: [xFrac, yFrac]}.
 * Returns { size: {w, h}, pixels: {name: {r,g,b,a}} }.
 */
async function captureAndSamplePixels(page, positions) {
    // Install interceptor: grab blob → data URL synchronously via FileReader
    // BEFORE app.js calls URL.revokeObjectURL().
    await page.evaluate(() => {
        window.__screenshotDataUrl = null;
        const origCOU = URL.createObjectURL.bind(URL);
        URL.createObjectURL = function (blob) {
            const url = origCOU(blob);
            // FileReader.readAsDataURL reads the in-memory blob synchronously
            // (the onload fires in a microtask, well before revocation).
            const fr = new FileReader();
            fr.onload = () => { window.__screenshotDataUrl = fr.result; };
            fr.readAsDataURL(blob);
            return url;   // return the real URL so the app behaves normally
        };
    });

    // Click screenshot button to open menu, then select highest quality option
    await page.locator('#btn-screenshot').click();
    await page.locator('#screenshot-menu .context-menu-item[data-action="screenshot"][data-width="4500"]').click();

    // Wait until the FileReader has stored the data URL
    await page.waitForFunction(
        () => window.__screenshotDataUrl !== null,
        { timeout: 10000 }
    );

    // Load the data URL into an offscreen canvas and sample requested pixels
    return page.evaluate(async (positions) => {
        const dataUrl = window.__screenshotDataUrl;

        const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload  = () => resolve(i);
            i.onerror = reject;
            i.src = dataUrl;
        });

        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const W = canvas.width, H = canvas.height;
        const pixels = {};
        for (const [name, [xf, yf]] of Object.entries(positions)) {
            const x = Math.max(0, Math.min(W - 1, Math.round(xf * W)));
            const y = Math.max(0, Math.min(H - 1, Math.round(yf * H)));
            const d = ctx.getImageData(x, y, 1, 1).data;
            pixels[name] = { r: d[0], g: d[1], b: d[2], a: d[3] };
        }
        return { size: { w: W, h: H }, pixels };
    }, positions);
}

// ── tests ─────────────────────────────────────────────────────────────────────
test.describe('Screenshot export (file:// protocol)', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('no Export Error dialog appears', async ({ page }) => {
        page.on('download', download => download.cancel());
        await page.locator('#btn-screenshot').click();
        await page.locator('#screenshot-menu .context-menu-item[data-action="screenshot"][data-width="4500"]').click();
        await page.waitForTimeout(3000);
        await expect(page.locator('#message-modal')).toBeHidden();
    });

    test('no CSS SecurityError or CORS errors logged during capture', async ({ page }) => {
        // Regression: when CSS was loaded via <link> tags under file://, html-to-image
        // would fail to read cssRules (SecurityError) and fail to fetch the CSS files
        // (CORS). The fix inlines all CSS into <style> tags.
        const cssErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                const text = msg.text();
                if (
                    text.includes('cssRules') ||
                    text.includes('Cannot access rules') ||
                    text.includes('Error inlining remote css') ||
                    text.includes('Error loading remote stylesheet') ||
                    text.includes('Error while reading CSS rules')
                ) {
                    cssErrors.push(text);
                }
            }
        });
        page.on('pageerror', err => {
            if (err.message.includes('cssRules') || err.message.includes('Cannot access rules')) {
                cssErrors.push(err.message);
            }
        });

        page.on('download', download => download.cancel());
        await page.locator('#btn-screenshot').click();
        await page.locator('#screenshot-menu .context-menu-item[data-action="screenshot"][data-width="4500"]').click();
        await page.waitForTimeout(3000);

        expect(cssErrors).toHaveLength(0);
    });

    test('exported PNG has correct dimensions (non-zero)', async ({ page }) => {
        const { size } = await captureAndSamplePixels(page, { dummy: [0.5, 0.5] });
        expect(size.w).toBeGreaterThan(100);
        expect(size.h).toBeGreaterThan(100);
    });

    test('court pitch blue is visible at the centre of the screenshot', async ({ page }) => {
        // Sample the court pitch interior at (30%, 30%) — well within the pitch area,
        // away from the white centre dot which sits at exactly (50%, 50%).
        // Court fill #0280c6 @ 80 % opacity dominates the background there.
        // Blue channel should be well above red (B > R + 80) regardless of
        // whether the wood-floor image loaded or the solid-colour fallback was used.
        const { pixels } = await captureAndSamplePixels(page, {
            pitchInterior: [0.3, 0.3],
        });
        const { r, b } = pixels.pitchInterior;
        expect(b).toBeGreaterThan(r + 80);
        expect(b).toBeGreaterThan(100);
    });

    test('court gray border is correctly rendered at the canvas edge', async ({ page }) => {
        // x=2 %, y=50 % is within the 250 / 4500 ≈ 5.6 % gray border zone of the court SVG.
        // With correct rendering (explicit width/height injected into SVG text):
        //   colour ≈ #b7b7b7 @ 80 % over #34495e → R≈157, G≈161, B≈165 (light gray)
        // With the old broken rendering (transparent SVG band at edges):
        //   colour ≈ bare background #34495e → R≈52 (dark — this assertion would fail)
        const { pixels } = await captureAndSamplePixels(page, {
            leftBorder: [0.02, 0.5],
        });
        const { r, g, b } = pixels.leftBorder;
        // All channels must be light (> 100) — rules out the dark background fallback
        expect(r).toBeGreaterThan(100);
        expect(g).toBeGreaterThan(100);
        expect(b).toBeGreaterThan(100);
        // Channels must be similar (neutral gray, not a saturated colour)
        expect(Math.abs(r - g)).toBeLessThan(30);
        expect(Math.abs(g - b)).toBeLessThan(30);
    });

    test('player entity is visible at the correct position in the screenshot', async ({ page }) => {
        // Add a team-1 player (default colour #3498db — blue)
        await page.locator('.team-player-template').first().click();
        await expect(page.locator('[data-player-id]')).toHaveCount(1, { timeout: 3000 });

        // Map player screen position → fractional position on the export canvas
        const boardBB  = await page.locator('#board-canvas').boundingBox();
        const playerBB = await page.locator('[data-player-id]').first().boundingBox();
        const xFrac = (playerBB.x + playerBB.width  / 2 - boardBB.x) / boardBB.width;
        const yFrac = (playerBB.y + playerBB.height / 2 - boardBB.y) / boardBB.height;
        const radiusFrac = (playerBB.width / 2) / boardBB.width;

        // Scan a rectangle covering the player circle (with generous margin)
        // and check that the dominant colour in that region is the player blue.
        // Team-1 default colour: #3498db = R:52, G:152, B:219.
        const found = await page.evaluate(async (p) => {
            window.__screenshotDataUrl = null;
            const origCOU = URL.createObjectURL.bind(URL);
            URL.createObjectURL = function (blob) {
                const url = origCOU(blob);
                const fr = new FileReader();
                fr.onload = () => { window.__screenshotDataUrl = fr.result; };
                fr.readAsDataURL(blob);
                return url;
            };

            // Trigger the screenshot (html-to-image already warmed on first call)
            // First click opens the menu, then we need to click the menu item
            document.getElementById('btn-screenshot').click();
            await new Promise(r => setTimeout(r, 100)); // Wait for menu to appear
            const menuItem = document.querySelector('#screenshot-menu .context-menu-item[data-action="screenshot"][data-width="4500"]');
            if (menuItem) menuItem.click();

            await new Promise(r => {
                const t = setInterval(() => {
                    if (window.__screenshotDataUrl) { clearInterval(t); r(); }
                }, 100);
            });

            const img = await new Promise((res, rej) => {
                const i = new Image(); i.onload = () => res(i); i.onerror = rej;
                i.src = window.__screenshotDataUrl;
            });
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const W = canvas.width, H = canvas.height;

            // Scan the player's bounding region at export resolution
            const margin = 4;   // ×4 from 1 CSS pixel
            const px0 = Math.max(0, Math.round((p.xFrac - p.radiusFrac) * W) - margin);
            const py0 = Math.max(0, Math.round((p.yFrac - p.radiusFrac) * H) - margin);
            const px1 = Math.min(W - 1, Math.round((p.xFrac + p.radiusFrac) * W) + margin);
            const py1 = Math.min(H - 1, Math.round((p.yFrac + p.radiusFrac) * H) + margin);

            let playerBlueCount = 0;
            let totalPixels = (px1 - px0 + 1) * (py1 - py0 + 1);
            const regionData = ctx.getImageData(px0, py0, px1 - px0 + 1, py1 - py0 + 1).data;
            for (let i = 0; i < regionData.length; i += 4) {
                const r = regionData[i], g = regionData[i+1], b = regionData[i+2];
                // Match #3498db = (52, 152, 219) within ±40 tolerance per channel
                if (Math.abs(r - 52) < 40 && Math.abs(g - 152) < 40 && Math.abs(b - 219) < 40) {
                    playerBlueCount++;
                }
            }
            return { playerBlueCount, totalPixels, px0, py0, px1, py1 };
        }, { xFrac, yFrac, radiusFrac });

        // At least 10% of the player's bounding region should be the player colour
        expect(found.playerBlueCount).toBeGreaterThan(found.totalPixels * 0.1);
    });
});
