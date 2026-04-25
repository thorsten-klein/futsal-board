/**
 * Animation export tests — verify downloadAnimation() works correctly
 * when optional DOM buttons are absent from the page.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

/** Create a child board with a player that has moved, setting up an animation */
async function setupAnimation(page) {
    await addPlayer(page);
    const playerId = await page.evaluate(() => AppState.players[0].id);

    const childId = await page.evaluate(() => {
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
        return childId;
    });
    await page.waitForTimeout(300);

    await page.evaluate(({ playerId }) => {
        const player = AppState.players.find(p => p.id === playerId);
        if (player) {
            player.x = 2500;
            player.y = 1500;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
        }
    }, { playerId });
    await page.waitForTimeout(200);

    return { childId, playerId };
}

test.describe('Animation Export', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('btn-download-animation is absent from the DOM', async ({ page }) => {
        // The sidebar download button was removed; only the header variant exists.
        const count = await page.locator('#btn-download-animation').count();
        expect(count).toBe(0);
    });

    test('no CSS SecurityError or CORS errors logged during downloadAnimation', async ({ page }) => {
        // Regression: when CSS was loaded via <link> tags under file://, html-to-image
        // would fail to read cssRules (SecurityError) and fail to fetch the CSS files
        // (CORS). The fix inlines all CSS into <style> tags.
        await setupAnimation(page);

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

        await page.evaluate(async () => {
            Animations.downloadAnimation(320, 180);
        });
        await page.waitForTimeout(1000);
        await page.evaluate(() => { AppState.isAnimating = false; });

        expect(cssErrors).toHaveLength(0);
    });

    test('downloadAnimation does not crash when btn-download-animation is absent', async ({ page }) => {
        await setupAnimation(page);

        // Collect console errors during the download attempt
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Call downloadAnimation directly; MediaRecorder is available in Chromium
        // so it will pass the guard and enter the try block.
        await page.evaluate(async () => {
            // Kick off recording but don't wait for it to finish — we only need
            // to verify the null-pointer crash no longer happens at startup.
            Animations.downloadAnimation(320, 180);
        });

        // Give the try block time to execute (button-state update happens synchronously
        // before any async work).
        await page.waitForTimeout(500);

        // Stop recording if still in progress so the test cleans up cleanly
        await page.evaluate(() => {
            AppState.isAnimating = false;
        });

        const nullErrors = errors.filter(e => e.includes("Cannot read properties of null"));
        expect(nullErrors).toHaveLength(0);
    });
});
