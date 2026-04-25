/**
 * Bug: after opening a player context menu (which injects "Reset to Parent"
 * into the shared #element-context-menu DOM element), the ball context menu
 * also shows "Reset to Parent" even for balls that have no parent position.
 *
 * Root cause: players.js and balls.js both obtain the same DOM element via
 * document.getElementById('element-context-menu'), clone it, and replace it
 * in place. Any items injected during the player's turn persist as part of
 * the element that the ball's code clones next time.  The guard
 *   `!menuCopy.querySelector('[data-action="reset"]')`
 * prevents a duplicate entry but does NOT remove the leftover one, so the
 * spurious item remains visible.
 */
import { test, expect } from './test-config.js';
import { goto, dismissMenu } from './helpers.js';

async function createAndSwitchToChildBoard(page) {
    return await page.evaluate(() => {
        AppState.saveCurrentBoard();
        const childId = AppState.createChildBoard(AppState.currentBoardId);
        if (childId) {
            AppState.loadBoard(childId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
        }
        return childId;
    });
}

test.describe('Context menu cross-contamination bug', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('ball context menu does NOT show Reset to Parent after player context menu was opened', async ({ page }) => {
        // Add a player on the parent board so it is inherited on the child board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Switch to child board
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player so "Reset to Parent" is enabled (not disabled) in its menu
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1500;
            Players.render();
        });
        await page.waitForTimeout(200);

        // Open player context menu — this injects a "reset" item into the shared
        // #element-context-menu DOM element
        const player = page.locator('[data-player-id]').first();
        await player.click({ button: 'right' });
        await page.waitForTimeout(200);

        // Sanity check: player menu correctly shows Reset to Parent
        const playerMenu = page.locator('.context-menu:not(.hidden)').first();
        await expect(playerMenu).toBeVisible();
        await expect(playerMenu.locator('[data-action="reset"]')).toHaveCount(1);

        // Dismiss the player context menu
        await dismissMenu(page);
        await page.waitForTimeout(200);

        // Add a ball only on the child board — it has no parent ball position
        await page.evaluate(() => {
            AppState.addBall(null, 3000, 2000);
            Balls.render();
        });
        await page.waitForTimeout(200);

        // Open ball context menu
        const ball = page.locator('[data-ball]').first();
        await ball.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: ball menu must NOT contain "Reset to Parent"
        // The ball was added only on the child board and has no parent position
        const ballMenu = page.locator('.context-menu:not(.hidden)').first();
        await expect(ballMenu).toBeVisible();
        await expect(ballMenu.locator('[data-action="reset"]')).toHaveCount(0);
    });
});
