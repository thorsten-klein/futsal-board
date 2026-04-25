/**
 * Animation frame-rate and duration recording tests — verify that
 * downloadAnimation() holds each frame for frameTime ms (smooth playback)
 * and that the total recording time matches the configured animation duration.
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
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }
    });
    await page.waitForTimeout(300);

    await page.evaluate(({ playerId }) => {
        const player = AppState.players.find(p => p.id === playerId);
        if (player) {
            player.x = 2500;
            player.y = 1500;
            // Mark as explicitly set so saveCurrentBoard() includes it in the
            // child board's stored data (child boards only save modified players).
            player._explicitlySet = true;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
        }
    }, { playerId });
    await page.waitForTimeout(200);
}

/**
 * Install the mocks shared by all recording tests and return a promise that
 * resolves with timing data when mediaRecorder.stop() fires.
 *
 * The FakeMediaRecorder resolves with:
 *   - frameCount:  number of captureToCanvas() calls
 *   - intervals:   ms gaps between consecutive calls
 *   - recordingMs: wall-clock time from start() to stop()
 */
function installMocksAndRecord(page, { fps, durationMs, toCanvasDelayMs = 0 }) {
    return page.evaluate(({ fps, durationMs, toCanvasDelayMs }) => {
        return new Promise((resolve, reject) => {
            AppState.animationFPS = fps;
            AppState.animationDuration = durationMs;

            const captureTimestamps = [];
            window.htmlToImage = {
                toCanvas: async () => {
                    captureTimestamps.push(performance.now());
                    if (toCanvasDelayMs > 0) {
                        await new Promise(r => setTimeout(r, toCanvasDelayMs));
                    }
                    const c = document.createElement('canvas');
                    c.width = 1;
                    c.height = 1;
                    return c;
                }
            };

            window.URL.createObjectURL = () => 'blob:mock';
            window.URL.revokeObjectURL = () => {};

            let startTime = null;
            window.MediaRecorder = class FakeMediaRecorder {
                constructor() {
                    this.ondataavailable = null;
                    this.onstop = null;
                    this.state = 'inactive';
                }
                start() {
                    this.state = 'recording';
                    startTime = performance.now();
                }
                stop() {
                    this.state = 'inactive';
                    const recordingMs = performance.now() - (startTime ?? 0);
                    try { if (this.onstop) this.onstop(new Event('stop')); } catch (_) {}
                    const intervals = captureTimestamps
                        .slice(1)
                        .map((t, i) => t - captureTimestamps[i]);
                    resolve({ frameCount: captureTimestamps.length, intervals, recordingMs });
                }
                static isTypeSupported(type) { return type.includes('webm'); }
            };

            Animations.downloadAnimation(320, 180).catch(reject);
            setTimeout(() => reject(new Error('Timeout waiting for recording')), 15000);
        });
    }, { fps, durationMs, toCanvasDelayMs });
}

test.describe('Animation Frame Rate', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('players move in the recorded animation without playing first', async ({ page }) => {
        // Reproduce the bug: downloadAnimation() renders static players when
        // playAnimation() has never been called because buildAnimationChain()
        // is skipped and animationChainPlayers stays empty.
        await setupAnimation(page);

        const result = await page.evaluate(() => {
            return new Promise((resolve, reject) => {
                // Capture the player X coordinate at each captured frame.
                const playerXPerFrame = [];
                window.htmlToImage = {
                    toCanvas: async () => {
                        // Record the current player X so we can detect movement.
                        const player = AppState.players[0];
                        playerXPerFrame.push(player ? player.x : null);
                        const c = document.createElement('canvas');
                        c.width = 1; c.height = 1;
                        return c;
                    }
                };

                window.URL.createObjectURL = () => 'blob:mock';
                window.URL.revokeObjectURL = () => {};

                window.MediaRecorder = class FakeMediaRecorder {
                    constructor() { this.ondataavailable = null; this.onstop = null; this.state = 'inactive'; }
                    start() { this.state = 'recording'; }
                    stop() {
                        this.state = 'inactive';
                        try { if (this.onstop) this.onstop(new Event('stop')); } catch (_) {}
                        resolve({ playerXPerFrame });
                    }
                    static isTypeSupported(t) { return t.includes('webm'); }
                };

                AppState.animationFPS = 15;
                AppState.animationDuration = 1000;

                // Deliberately skip playAnimation() — simulate a user who clicks
                // "Download" without ever pressing Play.
                Animations.downloadAnimation(320, 180).catch(reject);
                setTimeout(() => reject(new Error('Timeout')), 10000);
            });
        });

        // The player starts on the parent board at some X and moves to 2500 on
        // the child board. The recording must show at least two distinct X values.
        const uniqueX = new Set(result.playerXPerFrame.filter(x => x !== null));
        expect(uniqueX.size).toBeGreaterThan(1);
    });

    test('downloadAnimation records 15 different frames at 15 FPS', async ({ page }) => {
        await setupAnimation(page);

        const result = await installMocksAndRecord(page, { fps: 15, durationMs: 1000 });

        // Phase 1 pre-renders all frames as fast as possible (no timing constraint),
        // so gaps between captures are not meaningful. Phase 2 replays them at frameTime
        // intervals into MediaRecorder — verified by the duration test below.
        // Exactly totalFrames = Math.ceil((1000/1000) * 15) = 15 captures.
        expect(result.frameCount).toBe(15);
    });

    test('recorded video duration matches the configured animation duration', async ({ page }) => {
        await setupAnimation(page);

        const FPS = 15;
        const DURATION_MS = 1000; // 1 s animation

        const result = await installMocksAndRecord(page, { fps: FPS, durationMs: DURATION_MS });

        // The recording time (start → stop) must be within ±200 ms of DURATION_MS.
        // The 50 ms encoder-flush delay is intentional; more than 200 ms over means
        // we are capturing unnecessary extra frames or waiting too long.
        expect(result.recordingMs).toBeGreaterThanOrEqual(DURATION_MS);
        expect(result.recordingMs).toBeLessThan(DURATION_MS + 200);
    });

    test('video duration is correct even when toCanvas is slow', async ({ page }) => {
        await setupAnimation(page);

        // 100 ms per frame simulates a slow htmlToImage.toCanvas (e.g. complex board).
        // With single-phase recording (MediaRecorder runs during capture) the video
        // would be 15 × 100 ms = 1500 ms long — far over the target 1000 ms.
        // Two-phase recording decouples capture from playback: MediaRecorder only runs
        // during phase 2, where each frame is held for exactly frameTime ms.
        const result = await installMocksAndRecord(page, {
            fps: 15,
            durationMs: 1000,
            toCanvasDelayMs: 100,
        });

        expect(result.recordingMs).toBeGreaterThanOrEqual(1000);
        expect(result.recordingMs).toBeLessThan(1200);
    });

    test('recording progress bar is visible during capture and hidden afterwards', async ({ page }) => {
        await setupAnimation(page);

        // Verify the progress bar starts hidden.
        const bar = page.locator('#recording-progress');
        await expect(bar).toHaveClass(/hidden/);

        // Start a recording in the background (same mocks as the other tests).
        const done = installMocksAndRecord(page, { fps: 15, durationMs: 1000 });

        // While recording is in flight the bar should be visible
        // (it is shown synchronously before any async work starts).
        await expect(bar).not.toHaveClass(/hidden/);

        // The label must show "Recording Frame N/M" format.
        const label = page.locator('#recording-progress-label');
        await expect(label).toHaveText(/^Recording Frame \d+\/\d+$/);

        // Wait for the recording to finish.
        await done;

        // After recording the bar should be hidden again.
        await expect(bar).toHaveClass(/hidden/);
    });
});
