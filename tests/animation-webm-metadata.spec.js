/**
 * WebM metadata tests — verify that the downloaded animation blob contains a
 * correct Duration field in the SegmentInfo EBML element.
 *
 * MediaRecorder never writes Duration, so the app must inject it after recording.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

async function setupAnimation(page) {
    await addPlayer(page);
    const playerId = await page.evaluate(() => AppState.players[0].id);

    await page.evaluate(() => {
        AppState.saveCurrentBoard();
        const childId = AppState.createChildBoard(AppState.currentBoardId);
        if (childId) {
            AppState.loadBoard(childId);
            Players.render(); Balls.render(); Elements.render();
            Plates.render(); Shapes.render();
            Animations.renderParentPaths();
        }
    });
    await page.waitForTimeout(300);

    await page.evaluate(({ playerId }) => {
        const player = AppState.players.find(p => p.id === playerId);
        if (player) {
            player.x = 2500; player.y = 1500;
            player._explicitlySet = true;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
        }
    }, { playerId });
    await page.waitForTimeout(200);
}

/**
 * Build a minimal WebM-like buffer that has a SegmentInfo with TimecodeScale
 * but no Duration — identical to what MediaRecorder produces.
 */
function buildMinimalWebmWithoutDuration() {
    return [
        // SegmentInfo element
        0x15, 0x49, 0xA9, 0x66,  // ID: 1549A966
        0x40, 0x07,              // VINT size = 7
        // TimecodeScale = 1,000,000 ns (3-byte int)
        0x2A, 0xD7, 0xB1, 0x83, 0x0F, 0x42, 0x40
    ];
}

/**
 * Search for the EBML Duration element (ID 0x4489) inside the buffer,
 * restricting the search to within the SegmentInfo block.
 * Returns the float64 Duration value (ms) or null if not found.
 */
function parseDurationFromBuffer(bytes) {
    const data = new Uint8Array(bytes);

    // Find SegmentInfo: 15 49 A9 66
    let siPos = -1;
    for (let i = 0; i < data.length - 4; i++) {
        if (data[i] === 0x15 && data[i+1] === 0x49 && data[i+2] === 0xA9 && data[i+3] === 0x66) {
            siPos = i;
            break;
        }
    }
    if (siPos < 0) return null;

    // Find Duration (44 89) anywhere after the SegmentInfo ID
    for (let i = siPos + 4; i < Math.min(siPos + 500, data.length - 10); i++) {
        if (data[i] === 0x44 && data[i+1] === 0x89) {
            // ID (2) + VINT size (1, should be 0x88 = 8) + Float64 (8)
            if (data[i+2] === 0x88) {
                const view = new DataView(data.buffer, i + 3, 8);
                return view.getFloat64(0, false); // big-endian
            }
        }
    }
    return null;
}

test.describe('WebM Metadata', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('injectWebmDuration adds Duration element to a WebM blob without one', async ({ page }) => {
        // Build a minimal WebM blob that has SegmentInfo but no Duration
        // (simulating raw MediaRecorder output), call the injection function,
        // and verify the result contains a correct Duration element.
        const result = await page.evaluate(async (rawBytes) => {
            const blob = new Blob([new Uint8Array(rawBytes)], { type: 'video/webm' });

            // Must call the injection function
            const fixed = await Animations.injectWebmDuration(blob, 1000);

            const ab = await fixed.arrayBuffer();
            const data = new Uint8Array(ab);

            // Search for Duration (44 89) after SegmentInfo (15 49 A9 66)
            let siPos = -1;
            for (let i = 0; i < data.length - 4; i++) {
                if (data[i] === 0x15 && data[i+1] === 0x49 && data[i+2] === 0xA9 && data[i+3] === 0x66) {
                    siPos = i; break;
                }
            }
            if (siPos < 0) return null;

            for (let i = siPos + 4; i < Math.min(siPos + 500, data.length - 10); i++) {
                if (data[i] === 0x44 && data[i+1] === 0x89 && data[i+2] === 0x88) {
                    const view = new DataView(data.buffer, i + 3, 8);
                    return view.getFloat64(0, false);
                }
            }
            return null;
        }, buildMinimalWebmWithoutDuration());

        expect(result).not.toBeNull();
        // Duration should be exactly 1000 ms (as passed to injectWebmDuration)
        expect(result).toBeCloseTo(1000, 0);
    });

    test('downloadAnimation blob contains Duration metadata', async ({ page }) => {
        await setupAnimation(page);

        // Use a FakeMediaRecorder that pushes a minimal WebM chunk so that
        // onstop receives real-ish data to process with injectWebmDuration.
        // URL.createObjectURL captures the final (fixed) blob.
        const duration = await page.evaluate(async (rawBytes) => {
            window._capturedBlobBuffer = null;

            window.htmlToImage = {
                toCanvas: async () => {
                    const c = document.createElement('canvas');
                    c.width = 1; c.height = 1;
                    return c;
                }
            };

            // Capture the blob passed to URL.createObjectURL and read it.
            window.URL.createObjectURL = (blob) => {
                blob.arrayBuffer().then(ab => { window._capturedBlobBuffer = Array.from(new Uint8Array(ab)); });
                return 'blob:captured';
            };
            window.URL.revokeObjectURL = () => {};

            // FakeMediaRecorder: push a minimal-but-valid WebM chunk so that
            // the Blob created in onstop is parseable.
            window.MediaRecorder = class FakeMediaRecorder {
                constructor() {
                    this.ondataavailable = null;
                    this.onstop = null;
                    this.state = 'inactive';
                }
                start() {
                    this.state = 'recording';
                    // Push a minimal WebM blob as a single data chunk
                    const chunk = new Blob([new Uint8Array(rawBytes)], { type: 'video/webm' });
                    if (this.ondataavailable) this.ondataavailable({ data: chunk, size: chunk.size });
                }
                stop() {
                    this.state = 'inactive';
                    if (this.onstop) this.onstop(new Event('stop'));
                }
                static isTypeSupported(t) { return t.includes('webm'); }
            };

            AppState.animationFPS = 15;
            AppState.animationDuration = 1000;

            Animations.downloadAnimation(320, 180).catch(() => {});

            // Poll until URL.createObjectURL captured the blob (max 8 s)
            await new Promise((resolve, reject) => {
                const deadline = Date.now() + 8000;
                const check = () => {
                    if (window._capturedBlobBuffer) return resolve();
                    if (Date.now() > deadline) return reject(new Error('Timeout'));
                    setTimeout(check, 100);
                };
                check();
            });

            const data = new Uint8Array(window._capturedBlobBuffer);

            // Find Duration (44 89) in SegmentInfo
            let siPos = -1;
            for (let i = 0; i < data.length - 4; i++) {
                if (data[i] === 0x15 && data[i+1] === 0x49 && data[i+2] === 0xA9 && data[i+3] === 0x66) {
                    siPos = i; break;
                }
            }
            if (siPos < 0) return null;

            for (let i = siPos + 4; i < Math.min(siPos + 500, data.length - 10); i++) {
                if (data[i] === 0x44 && data[i+1] === 0x89 && data[i+2] === 0x88) {
                    const view = new DataView(data.buffer, i + 3, 8);
                    return view.getFloat64(0, false);
                }
            }
            return null;
        }, buildMinimalWebmWithoutDuration());

        expect(duration).not.toBeNull();
        // Duration in ms should match animationDuration × animationPhaseCount = 1000 ms
        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeCloseTo(1000, -1); // within ±50 ms
    });
});
