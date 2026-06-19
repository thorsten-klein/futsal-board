/**
 * Reproduces the screenshot bug the user reports: when clicking btn-screenshot,
 * exported players render at half their correct size and the number is
 * off-centre.  Root cause is in _buildScreenshotCanvas — Chrome's
 * SVG-as-image rasterisation (used inside html-to-image) shrinks a flex
 * container with text-bearing children to roughly half its explicit CSS
 * width.  The .player-number span is taken out of the flex flow before
 * snapping so the .player keeps its declared size.
 *
 * Test (as requested):
 *   • place four players at (0|0), (4000|0), (0|2000), (4000|2000) — the
 *     four "corners" of the board (some bodies are clipped by the canvas
 *     edge, which we account for below).
 *   • click btn-screenshot → 4500×2500 export.
 *   • for each corner check the player is rendered with the correct
 *     visible diameter (full 100 px when not clipped, ≈half when clipped
 *     by exactly one canvas edge) and the number is centred on the body.
 *
 * Annotated full screenshot + per-player crops are saved to test-results/
 * for visual inspection.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';
import * as fs from 'fs';
import * as path from 'path';

// Force the board-container to 800×500 — the size the user reports — so the
// player CSS size on screen is ~18 px, the smallest realistic scale where the
// flex-shrink-with-text rasterisation bug bites hardest.
test.use({ viewport: { width: 1100, height: 600 } });

const BW = 4500, BH = 2500;          // board dimensions
const SW = 4500, SH = 2500;          // export dimensions

// The user asked for players at "(0|0 ... 4000|2000)" — the four corners of
// the court.  In this app, the playable pitch is a 4000×2000 rectangle
// inset 250 board units from each edge of the 4500×2500 canvas (see the
// `<g id="pitch" transform="translate(250 250)">` in the court SVG).  Board
// coordinates are canvas-relative, so the four court corners in the
// coordinate system that addPlayer() consumes are (250,250), (4250,250),
// (250,2250) and (4250,2250).  Inset by 250 from each edge means the full
// 100-px-diameter player body is comfortably inside the screenshot for
// all four corners — no clipping, no missing players.
const PITCH_OFFSET = 250;
const CORNERS = [
    { name: 'top-left',     bx: PITCH_OFFSET + 0,    by: PITCH_OFFSET + 0    },
    { name: 'top-right',    bx: PITCH_OFFSET + 4000, by: PITCH_OFFSET + 0    },
    { name: 'bottom-left',  bx: PITCH_OFFSET + 0,    by: PITCH_OFFSET + 2000 },
    { name: 'bottom-right', bx: PITCH_OFFSET + 4000, by: PITCH_OFFSET + 2000 },
];

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

async function exportHighest(page) {
    await interceptNextScreenshot(page);
    await page.click('#btn-screenshot');
    const menu = page.locator('#screenshot-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.locator('[data-action="screenshot"][data-width="4500"]').click();
    await page.waitForFunction(() => window.__screenshotDataUrl !== undefined, { timeout: 30000 });
    return page.evaluate(() => window.__screenshotDataUrl);
}

test.describe('Screenshot object sizes', () => {
    test.setTimeout(60000);

    test('four players at corners render at correct size and position', async ({ page }) => {
        await goto(page);

        // Place exactly four red (team-2) players at the four requested corners.
        await page.evaluate((corners) => {
            AppState.players = [];
            for (const c of corners) {
                AppState.addPlayer('team-2', c.bx, c.by);
            }
            Players.render();
        }, CORNERS);
        await page.waitForTimeout(200);

        const dataUrl = await exportHighest(page);

        const result = await page.evaluate(async ({ url, corners, BW, BH, SW, SH }) => {
            const img = await new Promise((res, rej) => {
                const i = new Image();
                i.onload = () => res(i);
                i.onerror = rej;
                i.src = url;
            });
            const c = document.createElement('canvas');
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            const ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0);

            const FULL_DIAM = Math.round(100 * SW / BW);   // 100 px
            const isRed   = (r, g, b, a) => a > 200 && r > 180 && g < 130 && b < 130;
            const isWhite = (r, g, b, a) => a > 200 && r > 220 && g > 220 && b > 220;

            const stats = [];
            const crops = [];

            for (const corner of corners) {
                const cx = Math.round(corner.bx * SW / BW);
                const cy = Math.round(corner.by * SH / BH);

                // Bodies fit fully inside the canvas at all four pitch corners.
                const expW = FULL_DIAM;
                const expH = FULL_DIAM;

                // Measure the diameter on a row offset from the centre so the
                // white number text doesn't break the run of red pixels.  Use
                // the longest contiguous red run on a row 30 % below the player
                // centre (well clear of the number, still well inside the
                // 100 px body).
                const cyForMeasure = Math.max(0, Math.min(c.height - 1, cy + Math.round(FULL_DIAM * 0.3)));
                const halfW = 200;
                const x0 = Math.max(0, cx - halfW);
                const x1 = Math.min(c.width - 1, cx + halfW);
                const row = ctx.getImageData(x0, cyForMeasure, x1 - x0 + 1, 1).data;
                let bestLen = 0, curLen = 0;
                for (let i = 0; i < (x1 - x0 + 1); i++) {
                    if (isRed(row[i*4], row[i*4+1], row[i*4+2], row[i*4+3])) {
                        curLen++; if (curLen > bestLen) bestLen = curLen;
                    } else curLen = 0;
                }
                // At ±30 % offset from centre on a circle of radius R we get a
                // chord of length 2·R·√(1-0.36) ≈ 1.6·R, i.e. ~80 % of the full
                // diameter — adjust the expected value to match this geometry.
                const chordFactor = 2 * Math.sqrt(1 - 0.6 * 0.6);   // ≈ 1.6
                const expChordW = Math.round(FULL_DIAM * (chordFactor / 2));

                // Look for the number rendered as white text inside the body.
                // Sample a small box around the body centre and count white pixels.
                const cxClamped = Math.max(0, Math.min(c.width - 1, cx));
                const cyCentre  = Math.max(0, Math.min(c.height - 1, cy));
                const boxR = 12;
                const wx0 = Math.max(0, cxClamped - boxR);
                const wy0 = Math.max(0, cyCentre - boxR);
                const wx1 = Math.min(c.width - 1, cxClamped + boxR);
                const wy1 = Math.min(c.height - 1, cyCentre + boxR);
                const wData = ctx.getImageData(wx0, wy0, wx1 - wx0 + 1, wy1 - wy0 + 1).data;
                let whiteCentral = 0;
                for (let i = 0; i < wData.length; i += 4) {
                    if (isWhite(wData[i], wData[i+1], wData[i+2], wData[i+3])) whiteCentral++;
                }

                // Count total red pixels in a 200×200 window around the expected
                // centre — used to confirm the body is present at all.
                const bigR = 100;
                const bx0 = Math.max(0, cxClamped - bigR);
                const by0 = Math.max(0, cyCentre - bigR);
                const bx1 = Math.min(c.width - 1, cxClamped + bigR);
                const by1 = Math.min(c.height - 1, cyCentre + bigR);
                const bData = ctx.getImageData(bx0, by0, bx1 - bx0 + 1, by1 - by0 + 1).data;
                let redTotal = 0;
                for (let i = 0; i < bData.length; i += 4) {
                    if (isRed(bData[i], bData[i+1], bData[i+2], bData[i+3])) redTotal++;
                }

                // Save a 320×320 crop centred on each player for visual inspection.
                const cropR = 160;
                const ccx = Math.max(cropR, Math.min(c.width - cropR, cxClamped));
                const ccy = Math.max(cropR, Math.min(c.height - cropR, cyCentre));
                const cropCanvas = document.createElement('canvas');
                cropCanvas.width = cropR * 2;
                cropCanvas.height = cropR * 2;
                cropCanvas.getContext('2d').drawImage(
                    c, ccx - cropR, ccy - cropR, cropR * 2, cropR * 2,
                    0, 0, cropR * 2, cropR * 2);
                crops.push({ name: corner.name, url: cropCanvas.toDataURL('image/png') });

                stats.push({
                    name: corner.name,
                    cx, cy, expW, expH,
                    measuredDiameter: bestLen,
                    expectedDiameter: expChordW,
                    whiteCentral,
                    redTotal,
                });
            }

            // Annotated full screenshot with crosshairs at expected centres.
            for (const s of stats) {
                ctx.strokeStyle = '#ff00ff'; ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(Math.max(0, s.cx) - 20, Math.max(0, s.cy));
                ctx.lineTo(Math.min(c.width, s.cx) + 20, Math.max(0, s.cy));
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(Math.max(0, s.cx), Math.max(0, s.cy) - 20);
                ctx.lineTo(Math.max(0, s.cx), Math.min(c.height, s.cy) + 20);
                ctx.stroke();
                ctx.fillStyle = '#ff00ff'; ctx.font = '28px sans-serif';
                ctx.fillText(`${s.name}: ${s.measuredDiameter}px / ${s.whiteCentral} white`,
                    Math.max(8, s.cx + 12), Math.max(32, s.cy - 12));
            }

            return { stats, annotatedDataUrl: c.toDataURL('image/png'),
                     imgW: img.naturalWidth, imgH: img.naturalHeight, crops };
        }, { url: dataUrl, corners: CORNERS, BW, BH, SW, SH });

        fs.mkdirSync('test-results', { recursive: true });
        fs.writeFileSync(path.join('test-results', 'screenshot-corners-annotated.png'),
            Buffer.from(result.annotatedDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
        for (const crop of result.crops) {
            fs.writeFileSync(path.join('test-results', `screenshot-corner-${crop.name}.png`),
                Buffer.from(crop.url.replace(/^data:image\/png;base64,/, ''), 'base64'));
        }

        expect(result.imgW).toBe(SW);
        expect(result.imgH).toBe(SH);

        const failures = [];
        for (const s of result.stats) {
            // Must have a visible body: ≥200 strict-red pixels in a 200×200
            // window centred on the expected position (even a quarter-circle
            // body has thousands of red pixels).
            if (s.redTotal < 200) {
                failures.push(
                    `${s.name}: only ${s.redTotal} red pixels near (${s.cx}, ${s.cy}) — ` +
                    `player MISSING from screenshot`);
                continue;
            }
            // Allow ±25 % tolerance on the chord length to absorb AA edges
            // and the semi-transparent ring border.
            const minD = Math.round(s.expectedDiameter * 0.75);
            const maxD = Math.round(s.expectedDiameter * 1.25);
            if (s.measuredDiameter < minD || s.measuredDiameter > maxD) {
                failures.push(
                    `${s.name}: red chord ${s.measuredDiameter}px not in ` +
                    `[${minD}, ${maxD}] (expected ≈ ${s.expectedDiameter})`);
            }
            // The player number renders as white text in the centre of the body;
            // a sub-100 px body must show at least a handful of white pixels in
            // the central 24×24 window — otherwise the number is missing or
            // wildly off-centre.
            if (s.whiteCentral < 5) {
                failures.push(
                    `${s.name}: only ${s.whiteCentral} white pixels in centre — ` +
                    `player number missing or off-centre`);
            }
        }
        if (failures.length) {
            throw new Error(
                'Screenshot players incorrectly sized / placed:\n  ' +
                failures.join('\n  ') +
                '\nAnnotated: test-results/screenshot-corners-annotated.png\n' +
                'Per-player crops: test-results/screenshot-corner-*.png');
        }
    });
});
