/**
 * Test for context menu reopen bug
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addElement } from './helpers.js';

test.describe('Context Menu Reopen Bug', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('Can reopen element context menu after clicking cancel on position dialog', async ({ page }) => {
        // Add an element
        const element = await addElement(page);

        // Open context menu (right-click)
        await element.click({ button: 'right' });
        await page.waitForTimeout(300);

        // Verify context menu is visible
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();

        // Click "Set Position" from context menu
        await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="position"]').click();
        await page.waitForTimeout(300);

        // Verify position modal is open
        await expect(page.locator('#element-position-modal')).toBeVisible();

        // Click Cancel button
        await page.locator('#btn-cancel-position').click();
        await page.waitForTimeout(300);

        // Verify modal is closed
        await expect(page.locator('#element-position-modal')).toBeHidden();

        // Try to open context menu again - this should work!
        await element.click({ button: 'right' });
        await page.waitForTimeout(300);

        // Verify context menu is visible again
        const menu2 = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu2).toBeVisible();
    });

    test('Can reopen element context menu after clicking cancel on color dialog', async ({ page }) => {
        // Add an element
        const element = await addElement(page);

        // Open context menu (right-click)
        await element.click({ button: 'right' });
        await page.waitForTimeout(300);

        // Verify context menu is visible
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();

        // Click "Color" from context menu
        await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="color"]').click();
        await page.waitForTimeout(300);

        // Verify color modal is open
        await expect(page.locator('#element-color-modal')).toBeVisible();

        // Click Cancel button
        await page.locator('#btn-cancel-color').click();
        await page.waitForTimeout(300);

        // Verify modal is closed
        await expect(page.locator('#element-color-modal')).toBeHidden();

        // Try to open context menu again - this should work!
        await element.click({ button: 'right' });
        await page.waitForTimeout(300);

        // Verify context menu is visible again
        const menu2 = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu2).toBeVisible();
    });

    test('Can reopen ball context menu after clicking cancel', async ({ page }) => {
        // Add a ball
        const ball = await addBall(page);

        // Open context menu (right-click)
        await ball.click({ button: 'right' });
        await page.waitForTimeout(300);

        // Verify context menu is visible
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();

        // Click outside to close (simulating cancel)
        const board = page.locator('#board-canvas');
        const boardBox = await board.boundingBox();
        await page.mouse.click(boardBox.x + 50, boardBox.y + 50);
        await page.waitForTimeout(300);

        // Verify menu is closed
        await expect(menu).toBeHidden();

        // Try to open context menu again - this should work!
        await ball.click({ button: 'right' });
        await page.waitForTimeout(300);

        // Verify context menu is visible again
        await expect(menu).toBeVisible();
    });

    test('Can reopen shape context menu after clicking cancel', async ({ page }) => {
        // Add a rectangle shape
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(300);

        // Draw a rectangle
        const board = page.locator('#board-canvas');
        const boardBox = await board.boundingBox();
        await page.mouse.move(boardBox.x + 100, boardBox.y + 100);
        await page.mouse.down();
        await page.mouse.move(boardBox.x + 200, boardBox.y + 200);
        await page.mouse.up();
        await page.waitForTimeout(500);

        const shape = page.locator('.shape-svg').first();

        // Select the shape first
        await shape.click();
        await page.waitForTimeout(300);

        // Open context menu (right-click)
        await shape.click({ button: 'right' });
        await page.waitForTimeout(500);

        // Verify context menu is visible
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();

        // Click outside to close (simulating cancel)
        await page.mouse.click(boardBox.x + 50, boardBox.y + 50);
        await page.waitForTimeout(300);

        // Verify menu is closed
        await expect(menu).toBeHidden();

        // Try to open context menu again - this should work!
        await shape.click({ button: 'right' });
        await page.waitForTimeout(500);

        // Verify context menu is visible again
        await expect(menu).toBeVisible();
    });

    test('Can reopen element context menu after double-click and canceling position modal', async ({ page }) => {
        // Add a goal element
        const element = await addElement(page, 'goal');
        await page.waitForTimeout(300);

        // Double-click to open context menu
        await element.dblclick();
        await page.waitForTimeout(300);

        // Verify context menu is visible
        const menu = page.locator('#element-context-menu:not(.hidden)');
        await expect(menu).toBeVisible();

        // Click "Set Position" from context menu
        await page.locator('#element-context-menu .context-menu-item[data-action="position"]').click();
        await page.waitForTimeout(300);

        // Verify position modal is open
        await expect(page.locator('#element-position-modal')).toBeVisible();

        // Click Cancel button
        await page.locator('#btn-cancel-position').click();
        await page.waitForTimeout(300);

        // Verify modal is closed
        await expect(page.locator('#element-position-modal')).toBeHidden();

        // Try to double-click again to open context menu
        await element.dblclick();
        await page.waitForTimeout(300);

        // Verify context menu is visible again (bug fixed!)
        await expect(menu).toBeVisible();
    });

    test('Can reopen element context menu after double-click and closing by clicking empty board', async ({ page }) => {
        // Add a cone element
        const element = await addElement(page, 'cone');
        await page.waitForTimeout(300);

        // Double-click to open context menu
        await element.dblclick();
        await page.waitForTimeout(300);

        // Verify context menu is visible
        const menu = page.locator('#element-context-menu:not(.hidden)');
        await expect(menu).toBeVisible();

        // Click on empty board area to close context menu
        const board = page.locator('#board-canvas');
        const boardBox = await board.boundingBox();
        await page.mouse.click(boardBox.x + 50, boardBox.y + 50);
        await page.waitForTimeout(300);

        // Verify menu is closed
        await expect(page.locator('#element-context-menu')).toBeHidden();

        // Try to double-click again to open context menu
        await element.dblclick();
        await page.waitForTimeout(300);

        // Expected: Context menu opens
        // Actual (BUG): Nothing happens
        await expect(menu).toBeVisible();
    });
});
