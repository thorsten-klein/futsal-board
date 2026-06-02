/**
 * Regression test: duplicating a child board must register the copy in its
 * parent's children array so it appears in the board tree.
 *
 * The bug: AppState.duplicateBoard() cloned the board (including parentId) but
 * never added the new id to the parent's children array, leaving the duplicate
 * orphaned and invisible in the tree.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Open the context menu for a board item via right-click, waiting for any
 *  previously-open menu to be fully dismissed first. */
async function openContextMenu(page, boardId) {
    // Dismiss any open menu by pressing Escape.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(50);

    const item = page.locator(`.board-item[data-board-id="${boardId}"]`);
    await item.click({ button: 'right' });
    await expect(page.locator('#board-context-menu')).not.toHaveClass(/hidden/);
}

test.describe('Duplicate child board', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();
        await page.waitForTimeout(100);
    });

    test('duplicated child board is registered in parent.children and visible in the tree', async ({ page }) => {
        // Create a child board via the + button on the root item.
        const rootItem = page.locator('.board-item').first();
        const rootId = await rootItem.getAttribute('data-board-id');
        await rootItem.hover();
        await rootItem.locator('.board-add-child-btn').click();
        await page.waitForTimeout(200);

        const childId = await page.evaluate(() => AppState.currentBoardId);

        // Duplicate the child board via its context menu.
        await openContextMenu(page, childId);
        await page.locator('#board-context-menu .context-menu-item[data-action="duplicate"]').click();
        await expect(page.locator('#board-name-modal')).toBeVisible();
        await page.locator('#btn-confirm-board-name').click();
        await page.waitForTimeout(200);

        // The parent's children array must include the duplicate id.
        const result = await page.evaluate(({ rid, cid }) => {
            const parent = AppState.boards.find(b => b.id === rid);
            const dup = AppState.boards.find(b => b.parentId === rid && b.id !== cid);
            return {
                parentChildren: parent?.children ?? [],
                dupId: dup?.id ?? null,
            };
        }, { rid: rootId, cid: childId });

        expect(result.dupId, 'duplicate board should exist in AppState').not.toBeNull();
        expect(result.parentChildren, 'parent.children should contain the duplicate').toContain(result.dupId);

        // The duplicate must appear in the board tree UI.
        const dupItem = page.locator(`.board-item[data-board-id="${result.dupId}"]`);
        await expect(dupItem).toBeVisible({ timeout: 2000 });
    });

    test('duplicated child board has the same parentId as the original', async ({ page }) => {
        const rootItem = page.locator('.board-item').first();
        const rootId = await rootItem.getAttribute('data-board-id');
        await rootItem.hover();
        await rootItem.locator('.board-add-child-btn').click();
        await page.waitForTimeout(200);

        const childId = await page.evaluate(() => AppState.currentBoardId);

        await openContextMenu(page, childId);
        await page.locator('#board-context-menu .context-menu-item[data-action="duplicate"]').click();
        await expect(page.locator('#board-name-modal')).toBeVisible();
        await page.locator('#btn-confirm-board-name').click();
        await page.waitForTimeout(200);

        const dupParentId = await page.evaluate(({ rid, cid }) => {
            const dup = AppState.boards.find(b => b.parentId === rid && b.id !== cid);
            return dup?.parentId ?? null;
        }, { rid: rootId, cid: childId });

        expect(dupParentId).toBe(rootId);
    });
});
