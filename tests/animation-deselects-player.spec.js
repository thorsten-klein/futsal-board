/**
 * Regression test: starting animation while a player is selected must
 * deselect that player first.
 *
 * Bug: play() and playFrame() in animations.js set AppState.isAnimating = true
 * without clearing AppState.selectedPlayer, so the player remained selected
 * (highlighted, rotation handle visible) during playback.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Create a child board programmatically and switch to it. */
async function createChildBoard(page) {
    return page.evaluate(() => {
        AppState.saveCurrentBoard();
        const childId = AppState.createChildBoard(AppState.currentBoardId);
        AppState.loadBoard(childId);
        Players.render();
        Balls.render();
        Elements.render();
        Plates.render();
        Shapes.render();
        return childId;
    });
}

/** Add a player via the sidebar template click. */
async function addPlayer(page) {
    const before = await page.locator('[data-player-id]').count();
    await page.locator('.team-player-template').first().click();
    await expect(page.locator('[data-player-id]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-player-id]').nth(before);
}

test.describe('animation deselects selected player', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('play() clears selectedPlayer before animating', async ({ page }) => {
        // Add a player on the root board, then create a child board.
        await addPlayer(page);
        await createChildBoard(page);
        await page.waitForTimeout(150);

        // Select the player by clicking it.
        const playerEl = page.locator('[data-player-id]').first();
        await playerEl.click();
        await page.waitForTimeout(100);

        // Confirm the player is selected in state and has the CSS class.
        const selectedBefore = await page.evaluate(() => AppState.selectedPlayer?.id ?? null);
        expect(selectedBefore).not.toBeNull();
        await expect(playerEl).toHaveClass(/selected/);

        // Start the full-chain animation.
        await page.evaluate(() => Animations.play());
        await page.waitForTimeout(50);

        // selectedPlayer must be null immediately after play() starts.
        const selectedAfter = await page.evaluate(() => AppState.selectedPlayer);
        expect(selectedAfter).toBeNull();

        // The .selected CSS class must also be gone.
        await expect(playerEl).not.toHaveClass(/selected/);

        // Clean up.
        await page.evaluate(() => Animations.pause());
    });

    test('playFrame() clears selectedPlayer before animating', async ({ page }) => {
        // Add a player on the root board, then create a child board.
        await addPlayer(page);
        await createChildBoard(page);
        await page.waitForTimeout(150);

        // Select the player.
        const playerEl = page.locator('[data-player-id]').first();
        await playerEl.click();
        await page.waitForTimeout(100);

        const selectedBefore = await page.evaluate(() => AppState.selectedPlayer?.id ?? null);
        expect(selectedBefore).not.toBeNull();

        // Start the single-frame animation.
        await page.evaluate(() => Animations.playFrame());
        await page.waitForTimeout(50);

        const selectedAfter = await page.evaluate(() => AppState.selectedPlayer);
        expect(selectedAfter).toBeNull();

        await expect(playerEl).not.toHaveClass(/selected/);

        await page.evaluate(() => Animations.pause());
    });
});
