/**
 * Regression test: board-tree context menu must stay within the viewport.
 *
 * The bug: showBoardContextMenu() in storage.js set menu.style.left/top
 * directly from the raw click coordinates, with no clamping.  Right-clicking
 * (or double-clicking) a board-tree item near the bottom or right edge of the
 * sidebar could push the menu off-screen.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('board-tree context menu stays on screen', () => {
    test('right-click near bottom of viewport keeps menu fully on screen', async ({ page }) => {
        // Use a small viewport so the sidebar bottom is near the screen bottom.
        await page.setViewportSize({ width: 900, height: 400 });
        await goto(page);

        // Open the Workbook tab.
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();
        await page.waitForTimeout(100);

        const vw = await page.evaluate(() => window.innerWidth);
        const vh = await page.evaluate(() => window.innerHeight);

        // Right-click the first board-tree item.
        const boardItem = page.locator('.board-item').first();
        await boardItem.click({ button: 'right' });
        await page.waitForTimeout(100);

        const menu = page.locator('#board-context-menu');
        await expect(menu).not.toHaveClass(/hidden/);

        const box = await menu.boundingBox();

        // The menu must be fully within the viewport.
        expect(box.x, 'left edge').toBeGreaterThanOrEqual(0);
        expect(box.y, 'top edge').toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, 'right edge').toBeLessThanOrEqual(vw);
        expect(box.y + box.height, 'bottom edge').toBeLessThanOrEqual(vh);
    });

    test('context menu opened via JS near bottom-right corner is clamped', async ({ page }) => {
        await page.setViewportSize({ width: 900, height: 400 });
        await goto(page);

        await page.locator('.sidebar-tab[data-tab="workbook"]').click();
        await page.waitForTimeout(100);

        const { vw, vh } = await page.evaluate(() => ({
            vw: window.innerWidth,
            vh: window.innerHeight,
        }));

        // Simulate the bug: open the context menu at a coordinate that would
        // overflow both the right and bottom edges of the screen.
        await page.evaluate(({ x, y }) => {
            const boardId = AppState.boards[0].id;
            Storage.showBoardContextMenu(x, y, boardId);
        }, { x: vw - 5, y: vh - 5 });

        await page.waitForTimeout(50);

        const menu = page.locator('#board-context-menu');
        await expect(menu).not.toHaveClass(/hidden/);

        const box = await menu.boundingBox();

        expect(box.x + box.width, 'right edge clamped').toBeLessThanOrEqual(vw);
        expect(box.y + box.height, 'bottom edge clamped').toBeLessThanOrEqual(vh);
    });
});
