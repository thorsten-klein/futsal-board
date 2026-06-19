/**
 * Two HiDPI regressions live in _buildScreenshotCanvas:
 *
 * (1) On displays with devicePixelRatio > 1 (Windows scaling 125 %/150 %,
 *     retina Macs, etc.) html-to-image multiplied the entity-canvas
 *     dimensions by DPR, so its output was (w*dpr) × (h*dpr).  We then
 *     drew that oversized canvas at native size onto the w × h export,
 *     clipping the bottom-right and shifting every entity into the upper
 *     left of the PNG — a centre-placed player landed in the lower-right.
 *     Fix: pass pixelRatio:1 and use explicit dimensions on drawImage.
 *
 * (2) The .player-number was rendered as HTML text inside the labelHost,
 *     which centres on the line-box baseline rather than the glyph centre.
 *     Combined with subpixel rounding at fractional DPRs the digit drifted
 *     a couple of pixels off-centre.  Fix: render the number as inline
 *     SVG <text> with text-anchor="middle" + dominant-baseline="central".
 *
 * Tests: drop a single player at the canvas centre (2250, 1250) at three
 * DPRs, screenshot at 4500×2500, and verify (a) the body lands within
 * ±15 px of the PNG centre and (b) the white centre dot of the number
 * sits within ±5 px of the body centre.
 */
import { test, expect, devices } from '@playwright/test';
import { goto } from './helpers.js';
import * as fs from 'fs';

for (const dpr of [1, 1.5, 2]) {
    test.describe(`devicePixelRatio ${dpr}`, () => {
        test.use({ viewport: { width: 737, height: 500 }, deviceScaleFactor: dpr });

        test(`centre player lands at PNG centre`, async ({ page }) => {
            test.setTimeout(45000);
            await goto(page);

            await page.evaluate(() => {
                AppState.players = [];
                AppState.addPlayer('team-1', 2250, 1250);
                Players.render();
            });
            await page.waitForTimeout(150);

            await page.evaluate(() => {
                window.__screenshotDataUrl = undefined;
                const orig = URL.createObjectURL;
                URL.createObjectURL = function (blob) {
                    if (blob.type === 'image/png') {
                        const r = new FileReader();
                        r.onload = e => { window.__screenshotDataUrl = e.target.result; };
                        r.readAsDataURL(blob);
                        URL.createObjectURL = orig;
                        return '#';
                    }
                    return orig.call(URL, blob);
                };
            });
            await page.click('#btn-screenshot');
            await expect(page.locator('#screenshot-menu')).toBeVisible({ timeout: 3000 });
            await page.locator('#screenshot-menu [data-action="screenshot"][data-width="4500"]').click();
            await page.waitForFunction(() => window.__screenshotDataUrl !== undefined, { timeout: 30000 });
            const url = await page.evaluate(() => window.__screenshotDataUrl);

            // Measure both the player blue body and the white number digit
            // inside it.  If the body drifted, the window finds no blue.
            // If the number is mis-centred, its white centroid won't sit
            // close to the body centroid.
            const where = await page.evaluate(async (dataUrl) => {
                const img = await new Promise((r, j) => {
                    const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = dataUrl;
                });
                const c = document.createElement('canvas');
                c.width = img.naturalWidth; c.height = img.naturalHeight;
                c.getContext('2d').drawImage(img, 0, 0);
                const cx = 2250, cy = 1250, R = 200;
                const data = c.getContext('2d').getImageData(cx - R, cy - R, R * 2, R * 2).data;

                const isPlayerBlue = (r, g, b, a) =>
                    a > 200 && r >= 35 && r <= 75 && g >= 135 && g <= 175 && b >= 200 && b <= 240;
                // The number renders black on team-1 (bright background).
                const isNumberBlack = (r, g, b, a) =>
                    a > 200 && r < 60 && g < 60 && b < 60;

                let bMinX = R * 2, bMaxX = 0, bMinY = R * 2, bMaxY = 0, bCount = 0;
                let nSumX = 0, nSumY = 0, nCount = 0;
                for (let y = 0; y < R * 2; y++) {
                    for (let x = 0; x < R * 2; x++) {
                        const o = (y * R * 2 + x) * 4;
                        const r = data[o], g = data[o+1], b = data[o+2], a = data[o+3];
                        if (isPlayerBlue(r, g, b, a)) {
                            if (x < bMinX) bMinX = x;
                            if (x > bMaxX) bMaxX = x;
                            if (y < bMinY) bMinY = y;
                            if (y > bMaxY) bMaxY = y;
                            bCount++;
                        } else if (isNumberBlack(r, g, b, a)) {
                            nSumX += x; nSumY += y; nCount++;
                        }
                    }
                }
                return {
                    bodyFound: bCount > 100,
                    numberFound: nCount > 20,
                    imgW: c.width, imgH: c.height,
                    bodyCenterX: bCount ? Math.round((bMinX + bMaxX) / 2) + cx - R : null,
                    bodyCenterY: bCount ? Math.round((bMinY + bMaxY) / 2) + cy - R : null,
                    numberCenterX: nCount ? Math.round(nSumX / nCount) + cx - R : null,
                    numberCenterY: nCount ? Math.round(nSumY / nCount) + cy - R : null,
                    bCount, nCount,
                };
            }, url);

            console.log(`[DPR ${dpr}]`, where);
            fs.mkdirSync('test-results', { recursive: true });
            fs.writeFileSync(`test-results/dpr-${dpr}.png`,
                Buffer.from(url.replace(/^data:image\/png;base64,/, ''), 'base64'));

            // Body must land near the expected centre (the ±15 px tolerance is
            // wider in Y because the arms extend upward and shift the bbox).
            expect(where.bodyFound,
                `Player body missing near board centre at DPR ${dpr}`).toBe(true);
            expect(Math.abs(where.bodyCenterX - 2250),
                `Body X off at DPR ${dpr}: got ${where.bodyCenterX}`).toBeLessThan(15);
            expect(Math.abs(where.bodyCenterY - 1250),
                `Body Y off at DPR ${dpr}: got ${where.bodyCenterY}`).toBeLessThan(15);

            // Number must be visible AND its centroid must sit within ±5 px of
            // the expected centre (2250, 1250) — proves glyph centring works.
            expect(where.numberFound,
                `Player number missing at DPR ${dpr}`).toBe(true);
            expect(Math.abs(where.numberCenterX - 2250),
                `Number X off at DPR ${dpr}: got ${where.numberCenterX}`).toBeLessThan(5);
            expect(Math.abs(where.numberCenterY - 1250),
                `Number Y off at DPR ${dpr}: got ${where.numberCenterY}`).toBeLessThan(5);
        });

        test('5 players in cross — each number centred in its own body', async ({ page }) => {
            test.setTimeout(45000);
            await goto(page);
            const POS = [
                { x: 2250, y: 1250 }, // centre
                { x: 2500, y: 1250 }, // right
                { x: 2250, y: 1500 }, // bottom
                { x: 2000, y: 1250 }, // left
                { x: 2250, y: 1000 }, // top
            ];
            await page.evaluate((pos) => {
                AppState.players = [];
                for (const p of pos) AppState.addPlayer('team-1', p.x, p.y);
                Players.render();
            }, POS);
            await page.waitForTimeout(150);

            await page.evaluate(() => {
                window.__url = undefined;
                const orig = URL.createObjectURL;
                URL.createObjectURL = function (blob) {
                    if (blob.type === 'image/png') {
                        const r = new FileReader();
                        r.onload = e => { window.__url = e.target.result; };
                        r.readAsDataURL(blob);
                        URL.createObjectURL = orig;
                        return '#';
                    }
                    return orig.call(URL, blob);
                };
            });
            await page.click('#btn-screenshot');
            await expect(page.locator('#screenshot-menu')).toBeVisible({ timeout: 3000 });
            await page.locator('#screenshot-menu [data-action="screenshot"][data-width="4500"]').click();
            await page.waitForFunction(() => window.__url !== undefined, { timeout: 30000 });
            const url = await page.evaluate(() => window.__url);

            // For each expected centre, find the black-number centroid within
            // a 100×100 window and assert it's within ±5 px of expected.
            const offsets = await page.evaluate(async ({ dataUrl, pos }) => {
                const img = await new Promise((r, j) => {
                    const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = dataUrl;
                });
                const c = document.createElement('canvas');
                c.width = img.naturalWidth; c.height = img.naturalHeight;
                c.getContext('2d').drawImage(img, 0, 0);
                const isNumberBlack = (r, g, b, a) =>
                    a > 200 && r < 60 && g < 60 && b < 60;
                const R = 50;
                return pos.map(p => {
                    const data = c.getContext('2d').getImageData(p.x - R, p.y - R, R * 2, R * 2).data;
                    let sumX = 0, sumY = 0, count = 0;
                    for (let y = 0; y < R * 2; y++) {
                        for (let x = 0; x < R * 2; x++) {
                            const o = (y * R * 2 + x) * 4;
                            if (isNumberBlack(data[o], data[o+1], data[o+2], data[o+3])) {
                                sumX += x; sumY += y; count++;
                            }
                        }
                    }
                    if (!count) return { ...p, foundAtCount: 0 };
                    return {
                        ...p,
                        foundAtCount: count,
                        numCx: Math.round(sumX / count) + p.x - R,
                        numCy: Math.round(sumY / count) + p.y - R,
                    };
                });
            }, { dataUrl: url, pos: POS });

            for (const o of offsets) {
                expect(o.foundAtCount,
                    `Number missing at (${o.x}, ${o.y}) — DPR ${dpr}`).toBeGreaterThan(20);
                expect(Math.abs(o.numCx - o.x),
                    `Number X off-centre at (${o.x},${o.y}) DPR ${dpr}: got ${o.numCx}`,
                ).toBeLessThanOrEqual(5);
                expect(Math.abs(o.numCy - o.y),
                    `Number Y off-centre at (${o.x},${o.y}) DPR ${dpr}: got ${o.numCy}`,
                ).toBeLessThanOrEqual(5);
            }
        });
    });
}
