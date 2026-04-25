/**
 * Tests that context menus are always fully visible within the viewport,
 * even when triggered near the edges of the screen.
 *
 * Bug: for player context menus, positionContextMenu() was called BEFORE
 * extra items (Set Name, Edit Number) were inserted, so the height
 * measurement was too small and the menu overflowed the bottom of the screen.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

async function addPlayer(page) {
    const before = await page.locator('[data-player-id]').count();
    await page.locator('.team-player-template').first().click();
    await expect(page.locator('[data-player-id]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-player-id]').nth(before);
}

/** Returns the bounding rect of the first visible context menu. */
async function getMenuBox(page) {
    const menu = page.locator('.context-menu:not(.hidden)').first();
    await expect(menu).toBeVisible({ timeout: 3000 });
    return menu.boundingBox();
}

test.describe('Context menu stays within viewport', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player context menu is fully on screen when triggered near the bottom edge', async ({ page }) => {
        await addPlayer(page);

        // Trigger the player context menu programmatically near the bottom of the viewport,
        // where a menu with extra items (Set Name, Edit Number) would overflow before the fix.
        const viewportHeight = await page.evaluate(() => window.innerHeight);
        const triggerY = viewportHeight - 10; // deliberately at the very bottom

        await page.evaluate((y) => {
            const player = AppState.players[0];
            if (player) Players.showContextMenu(100, y, player);
        }, triggerY);

        const menuBox = await getMenuBox(page);
        // Menu bottom must not exceed the viewport
        expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewportHeight);
    });

    test('player context menu is fully on screen when triggered near the right edge', async ({ page }) => {
        await addPlayer(page);

        const viewportWidth = await page.evaluate(() => window.innerWidth);
        const triggerX = viewportWidth - 10;

        await page.evaluate((x) => {
            const player = AppState.players[0];
            if (player) Players.showContextMenu(x, 100, player);
        }, triggerX);

        const menuBox = await getMenuBox(page);
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewportWidth);
    });

    test('ball context menu is fully on screen when triggered near the bottom edge', async ({ page }) => {
        const before = await page.locator('[data-ball]').count();
        await page.locator('.ball-template').first().click();
        await expect(page.locator('[data-ball]')).toHaveCount(before + 1, { timeout: 3000 });

        const viewportHeight = await page.evaluate(() => window.innerHeight);
        const triggerY = viewportHeight - 10;

        await page.evaluate((y) => {
            const ball = AppState.balls[0];
            if (ball) Balls.showContextMenu(100, y, ball);
        }, triggerY);

        const menuBox = await getMenuBox(page);
        expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewportHeight);
    });

    test('element context menu is fully on screen when triggered near the bottom edge', async ({ page }) => {
        await page.locator('.element-btn[data-element="cone"]').click();
        await page.waitForTimeout(200);

        const viewportHeight = await page.evaluate(() => window.innerHeight);
        const triggerY = viewportHeight - 10;

        await page.evaluate((y) => {
            const element = AppState.elements[0];
            if (element) Elements.showContextMenu(100, y, element);
        }, triggerY);

        const menuBox = await getMenuBox(page);
        expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewportHeight);
    });

    test('context menu is fully on screen when triggered near the top-left corner', async ({ page }) => {
        await addPlayer(page);

        await page.evaluate(() => {
            const player = AppState.players[0];
            if (player) Players.showContextMenu(5, 5, player);
        });

        const menuBox = await getMenuBox(page);
        expect(menuBox.x).toBeGreaterThanOrEqual(0);
        expect(menuBox.y).toBeGreaterThanOrEqual(0);
    });
});
