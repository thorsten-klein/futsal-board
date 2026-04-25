/**
 * Tests for right-clicking on the board canvas to show a context menu
 * with a "Reset to parent" option.
 *
 * - On a top-level board the item must be visible but disabled (greyed out).
 * - On a child board the item must be enabled.
 * - Clicking "Reset to parent" on a child board removes all child-specific
 *   changes so the board looks exactly like its parent.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Right-click on an empty part of the board (not on any entity). */
async function rightClickBoard(page) {
    // Use the top-left area of the board canvas — entities are never placed there
    // (findFreePosition starts from the centre and spirals outward).
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
}

/** Wait for the board canvas context menu to be visible and return its locator. */
async function getBoardCanvasMenu(page) {
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    return menu;
}

/** Create a child board and switch to it (via JS to keep tests fast). */
async function createAndSwitchToChildBoard(page) {
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
            if (typeof Storage !== 'undefined') {
                Storage.updateBoardNameDisplay();
                Storage.renderBoardsList();
            }
        }
        return childId;
    });
}

test.describe('Board canvas context menu', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    // ── Menu visibility ────────────────────────────────────────────────────

    test('right-clicking empty board space shows the board canvas context menu', async ({ page }) => {
        await rightClickBoard(page);
        const menu = page.locator('#board-canvas-context-menu');
        await expect(menu).toBeVisible();
    });

    test('board canvas context menu has a "Reset to parent" item', async ({ page }) => {
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        const resetItem = menu.locator('[data-action="reset-to-parent"]');
        await expect(resetItem).toBeVisible();
    });

    // ── Enabled / disabled state ────────────────────────────────────────────

    test('"Reset to parent" is disabled on a top-level board', async ({ page }) => {
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        const resetItem = menu.locator('[data-action="reset-to-parent"]');
        await expect(resetItem).toHaveClass(/disabled/);
    });

    test('"Reset to parent" is enabled on a child board', async ({ page }) => {
        await createAndSwitchToChildBoard(page);
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        const resetItem = menu.locator('[data-action="reset-to-parent"]');
        await expect(resetItem).not.toHaveClass(/disabled/);
    });

    // ── Reset functionality ─────────────────────────────────────────────────

    test('clicking "Reset to parent" removes child-specific player moves', async ({ page }) => {
        // Add a player on the parent board
        await page.locator('.team-player-template').first().click();
        await expect(page.locator('[data-player-id]')).toHaveCount(1, { timeout: 3000 });

        // Switch to child board
        await createAndSwitchToChildBoard(page);

        // Move the player to a different position in the child board
        await page.evaluate(() => {
            const player = AppState.players[0];
            if (player) {
                player.x = player.x + 500;
                player.y = player.y + 500;
                player._explicitlySet = true;
                AppState.saveCurrentBoard();
            }
        });

        const parentPos = await page.evaluate(() => {
            const parentBoard = AppState.boards.find(b => b.id !== AppState.currentBoardId && !b.parentId);
            return (parentBoard?.players || [])[0] ? { x: parentBoard.players[0].x, y: parentBoard.players[0].y } : null;
        });

        // Right-click and reset to parent
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="reset-to-parent"]').click();

        // Player should be back at the parent position
        const childPos = await page.evaluate(() => {
            const player = AppState.players[0];
            return player ? { x: player.x, y: player.y } : null;
        });

        expect(childPos).not.toBeNull();
        expect(childPos.x).toBe(parentPos.x);
        expect(childPos.y).toBe(parentPos.y);
    });

    test('clicking "Reset to parent" removes child-only entities added in child board', async ({ page }) => {
        // Switch to child board (parent has no shapes)
        await createAndSwitchToChildBoard(page);

        // Add a shape that exists only in the child board (shapes can be added in child boards)
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);
        await expect(page.locator('[data-shape]')).toHaveCount(1, { timeout: 3000 });

        // Reset to parent
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="reset-to-parent"]').click();

        // The child-only shape should be gone
        await expect(page.locator('[data-shape]')).toHaveCount(0);
    });

    test('menu closes after clicking "Reset to parent"', async ({ page }) => {
        await createAndSwitchToChildBoard(page);
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="reset-to-parent"]').click();

        await expect(menu).toBeHidden();
    });

    test('menu closes when clicking elsewhere on the board', async ({ page }) => {
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await expect(menu).toBeVisible();

        // Click somewhere else — the board canvas far from the menu
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + bb.width * 0.8, bb.y + bb.height * 0.8);

        await expect(menu).toBeHidden({ timeout: 2000 });
    });

    test('"Reset to parent" disabled click on top-level board does nothing', async ({ page }) => {
        const before = await page.evaluate(() => AppState.players.length);
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        // Item is disabled – clicking it (even with force) must not change state
        await menu.locator('[data-action="reset-to-parent"]').click({ force: true });
        const after = await page.evaluate(() => AppState.players.length);
        expect(after).toBe(before);
    });
});
