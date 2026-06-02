/**
 * Tests for the + button on board-tree items that creates a child board.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('board-tree add-child button', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
        // Open the Workbook tab where the board tree lives
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();
        await page.waitForTimeout(100);
    });

    test('+ button is present on each board-tree item', async ({ page }) => {
        const btn = page.locator('[data-board-add-child]').first();
        await expect(btn).toBeAttached();
        expect(await btn.getAttribute('title')).toBe('Add child board');
    });

    test('+ button has opacity 0 by default (shown only on hover via CSS)', async ({ page }) => {
        const item = page.locator('.board-item').first();
        const btn = item.locator('.board-add-child-btn');

        // The button exists but is invisible without a hover
        await expect(btn).toBeAttached();
        const opacity = await btn.evaluate(el => getComputedStyle(el).opacity);
        expect(Number(opacity)).toBe(0);

        // The CSS rule ".board-item:hover .board-add-child-btn { opacity: 1 }" should be present
        const ruleFound = await page.evaluate(() => {
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        if (rule.selectorText && rule.selectorText.includes('.board-add-child-btn') &&
                            rule.selectorText.includes(':hover') &&
                            rule.style && rule.style.opacity === '1') {
                            return true;
                        }
                    }
                } catch (_) {}
            }
            return false;
        });
        expect(ruleFound).toBe(true);
    });

    test('clicking + creates a child board and switches to it', async ({ page }) => {
        const item = page.locator('.board-item').first();
        const parentId = await item.getAttribute('data-board-id');
        const btn = item.locator('.board-add-child-btn');

        // Hover to make button operable, then click
        await item.hover();
        await btn.click();
        await page.waitForTimeout(200);

        // A new child board should now be the active board
        const currentBoardId = await page.evaluate(() => AppState.currentBoardId);
        expect(currentBoardId).not.toBe(parentId);

        // The parent should have the new board in its children
        const parentHasChild = await page.evaluate((pid) => {
            const parent = AppState.boards.find(b => b.id === pid);
            return parent && parent.children && parent.children.length > 0;
        }, parentId);
        expect(parentHasChild).toBe(true);
    });

    test('+ button on a child board creates a grandchild board', async ({ page }) => {
        // Create a child board via the first + button
        const rootItem = page.locator('.board-item').first();
        await rootItem.hover();
        await rootItem.locator('.board-add-child-btn').click();
        await page.waitForTimeout(200);

        const childId = await page.evaluate(() => AppState.currentBoardId);

        // The child board tree item should also have a + button
        const childItem = page.locator(`.board-item[data-board-id="${childId}"]`);
        await expect(childItem).toBeAttached({ timeout: 2000 });
        await childItem.hover();

        const grandchildBtn = childItem.locator('.board-add-child-btn');
        await expect(grandchildBtn).toBeAttached();
        await grandchildBtn.click();
        await page.waitForTimeout(200);

        const grandchildId = await page.evaluate(() => AppState.currentBoardId);
        expect(grandchildId).not.toBe(childId);

        const childHasGrandchild = await page.evaluate((cid) => {
            const child = AppState.boards.find(b => b.id === cid);
            return child && child.children && child.children.length > 0;
        }, childId);
        expect(childHasGrandchild).toBe(true);
    });
});
