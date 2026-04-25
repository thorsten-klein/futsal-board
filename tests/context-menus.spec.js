/**
 * Context menu tests — right-click on entities opens the correct menu,
 * double-click also opens the context menu, menu items work.
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addPlate, addElement, dismissMenu } from './helpers.js';

test.describe('Context menus', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    // ── Balls ──────────────────────────────────────────────────────────────

    test('right-click on ball shows context menu', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click({ button: 'right' });
        // Balls reuse the element-context-menu (they clone and modify it)
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        await dismissMenu(page);
    });

    test('double-click on ball shows context menu', async ({ page }) => {
        const ball = await addBall(page);
        await ball.dblclick();
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        await dismissMenu(page);
    });

    test('right-click context menu disappears on Escape', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click({ button: 'right' });
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(menu).toBeHidden({ timeout: 2000 });
    });

    test('right-click context menu disappears when clicking elsewhere', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click({ button: 'right' });
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        // Click on the board container (away from menu)
        await page.locator('.board-container').click({ position: { x: 10, y: 10 } });
        await expect(menu).toBeHidden({ timeout: 2000 });
    });

    // ── Remove via context menu ────────────────────────────────────────────

    test('removing ball via context menu deletes it from board', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click({ button: 'right' });

        // Wait for menu, click remove item
        const removeItem = page.locator('.context-menu-item[data-action="remove"]').first();
        await expect(removeItem).toBeVisible();
        await removeItem.click();

        await expect(page.locator('[data-ball]')).toHaveCount(0);
    });

    test('removing plate via context menu deletes it', async ({ page }) => {
        const plate = await addPlate(page);
        await plate.click({ button: 'right' });

        const removeItem = page.locator('.context-menu-item[data-action="remove"]').first();
        await expect(removeItem).toBeVisible();
        await removeItem.click();

        await expect(page.locator('[data-plate]')).toHaveCount(0);
    });

    // ── Plates ─────────────────────────────────────────────────────────────

    test('right-click on plate shows context menu', async ({ page }) => {
        const plate = await addPlate(page);
        await plate.click({ button: 'right' });
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        await dismissMenu(page);
    });

    test('double-click on plate shows context menu', async ({ page }) => {
        const plate = await addPlate(page);
        await plate.dblclick();
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        await dismissMenu(page);
    });

    // ── Elements ───────────────────────────────────────────────────────────

    test('right-click on element shows context menu', async ({ page }) => {
        const el = await addElement(page, 'cone');
        await el.click({ button: 'right' });
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        await dismissMenu(page);
    });

    test('double-click on element shows context menu', async ({ page }) => {
        const el = await addElement(page, 'cone');
        await el.dblclick();
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        await dismissMenu(page);
    });

    // ── Color modal via context menu ───────────────────────────────────────

    test('selecting Color from ball context menu opens color modal', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click({ button: 'right' });

        const colorItem = page.locator('.context-menu-item[data-action="color"]').first();
        await expect(colorItem).toBeVisible();
        await colorItem.click();

        await expect(page.locator('#element-color-modal')).toBeVisible();
        // Modal should have aria-modal
        await expect(page.locator('#element-color-modal')).toHaveAttribute('aria-modal', 'true');
    });

    test('selecting Position from element context menu opens position modal', async ({ page }) => {
        const el = await addElement(page, 'cone');
        await el.click({ button: 'right' });

        const posItem = page.locator('#element-context-menu .context-menu-item[data-action="position"]');
        await expect(posItem).toBeVisible();
        await posItem.click();

        await expect(page.locator('#element-position-modal')).toBeVisible();
    });

    // ── Board context menu (sidebar board list) ───────────────────────────

    test('right-click on board name in sidebar shows board context menu', async ({ page }) => {
        // Switch to the workbook tab to see the board list
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();
        await page.waitForTimeout(200);

        // Right-click the first board item in the list
        const boardItem = page.locator('.board-item').first();
        await expect(boardItem).toBeVisible();
        await boardItem.click({ button: 'right' });

        await expect(page.locator('#board-context-menu:not(.hidden)')).toBeVisible({ timeout: 3000 });
        await dismissMenu(page);
    });

    // ── Board canvas context menu (right-click on empty board space) ──────

    test('right-click on empty board space shows board-canvas context menu', async ({ page }) => {
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        await expect(page.locator('#board-canvas-context-menu')).toBeVisible({ timeout: 3000 });
        await dismissMenu(page);
    });

    test('board-canvas context menu closes when clicking an empty area of the board', async ({ page }) => {
        const bb = await page.locator('#board-canvas').boundingBox();
        // Open at top-left corner
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        const menu = page.locator('#board-canvas-context-menu');
        await expect(menu).toBeVisible({ timeout: 3000 });

        // Click on empty board space far from the menu
        await page.mouse.click(bb.x + bb.width * 0.8, bb.y + bb.height * 0.8);
        await expect(menu).toBeHidden({ timeout: 2000 });
    });

    test('board-canvas context menu closes when clicking on an entity (ball)', async ({ page }) => {
        const bb = await page.locator('#board-canvas').boundingBox();
        // Open the board canvas menu first
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        const canvasMenu = page.locator('#board-canvas-context-menu');
        await expect(canvasMenu).toBeVisible({ timeout: 3000 });

        // Add a ball and left-click it — this should close the canvas menu
        const ball = await addBall(page);
        await ball.click();
        await expect(canvasMenu).toBeHidden({ timeout: 2000 });
    });

    test('board-canvas context menu closes on Escape', async ({ page }) => {
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        const menu = page.locator('#board-canvas-context-menu');
        await expect(menu).toBeVisible({ timeout: 3000 });
        await page.keyboard.press('Escape');
        await expect(menu).toBeHidden({ timeout: 2000 });
    });

    test('right-click on an entity does NOT show board-canvas context menu', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click({ button: 'right' });
        // The entity context menu shows, the board-canvas one must not
        await expect(page.locator('.context-menu:not(.hidden)').first()).toBeVisible();
        await expect(page.locator('#board-canvas-context-menu')).toBeHidden();
        await dismissMenu(page);
    });
});
