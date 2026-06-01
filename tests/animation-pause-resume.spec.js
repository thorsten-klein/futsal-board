/**
 * Pause/resume bug — user report:
 *   "Animation does weird things when I pause it and continue playing.
 *    Elements snap to wrong position."
 *
 * Scenario: on a child board the player moves from a parent start (SX, SY) to
 * a child end (EX, EY).  We start playback, wait until the player is ~halfway,
 * pause, then resume.  At the end of the animation the player MUST end up at
 * (EX, EY) — the originally-saved end position — not at some intermediate
 * snapshot.  The bug: play() rebuilds the animation chain on resume using the
 * current player position (the mid-point) as the new end, so the player ends
 * up at the wrong place.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Animation pause/resume', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('resuming after pause must NOT snap player position and must finish at original end', async ({ page }) => {
        await addPlayer(page);

        // Set up parent player + child board where player moves a large distance
        // so the bug is easy to spot.
        const { playerId, startX, endX, endY } = await page.evaluate(() => {
            const player = AppState.players[0];
            const SX = 600, SY = 1250;
            const EX = 4000, EY = 1250;
            player.x = SX;
            player.y = SY;
            player._explicitlySet = true;
            AppState.saveCurrentBoard();

            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);

            const ply = AppState.players.find(p => p.id === player.id);
            ply.x = EX;
            ply.y = EY;
            ply._explicitlySet = true;
            AppState.saveCurrentBoard();

            // Slow the animation so the test has time to pause mid-way.
            AppState.animationDuration = 1500;

            Players.render();
            Animations.renderParentPaths();

            return { playerId: player.id, startX: SX, endX: EX, endY: EY };
        });
        await page.waitForTimeout(150);

        await page.click('#btn-play-pause');

        // Wait until the player is roughly midway between start and end.
        await page.waitForFunction(({ id, sx, ex }) => {
            const p = AppState.players.find(pp => pp.id === id);
            if (!p) return false;
            const t = (p.x - sx) / (ex - sx);
            return t > 0.35 && t < 0.7;
        }, { id: playerId, sx: startX, ex: endX }, { timeout: 4000 });

        await page.click('#btn-play-pause');
        await page.waitForTimeout(50);

        const paused = await page.evaluate((id) => {
            const p = AppState.players.find(pp => pp.id === id);
            return { x: p.x, y: p.y, isAnimating: AppState.isAnimating };
        }, playerId);
        expect(paused.isAnimating).toBe(false);
        expect(paused.x).toBeLessThan(endX - 200);

        // Resume.
        await page.click('#btn-play-pause');

        // Immediately after resume, the player should be near where it was
        // when we paused — NOT snapped somewhere else.
        await page.waitForTimeout(30);
        const justAfterResume = await page.evaluate((id) => {
            const p = AppState.players.find(pp => pp.id === id);
            return { x: p.x, y: p.y };
        }, playerId);
        const snapDelta = Math.abs(justAfterResume.x - paused.x);
        expect(snapDelta).toBeLessThan(250);

        // Wait for the animation to finish.
        await page.waitForFunction(() => !AppState.isAnimating, null, { timeout: 6000 });
        await page.waitForTimeout(120);

        const final = await page.evaluate((id) => {
            const p = AppState.players.find(pp => pp.id === id);
            return { x: p.x, y: p.y };
        }, playerId);

        // Final position must be the originally-saved END position, not the
        // mid-point where we paused.
        expect(Math.abs(final.x - endX)).toBeLessThan(50);
        expect(Math.abs(final.y - endY)).toBeLessThan(50);
    });
});
