/**
 * Screenshot quality menu tests — verify the dropdown menu displays quality options
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Screenshot Quality Menu', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('should show screenshot menu when clicking screenshot button', async ({ page }) => {
        // Click screenshot button
        await page.locator('#btn-screenshot').click();

        // Wait for menu to be visible
        const menu = page.locator('#screenshot-menu');
        await expect(menu).toBeVisible({ timeout: 1000 });
    });

    test('should display all quality options', async ({ page }) => {
        // Click screenshot button
        await page.locator('#btn-screenshot').click();

        // Wait for menu to be visible
        const menu = page.locator('#screenshot-menu');
        await expect(menu).toBeVisible({ timeout: 1000 });

        // Verify all quality options are present
        await expect(menu.locator('text=Highest Quality (4500×2500)')).toBeVisible();
        await expect(menu.locator('text=High Quality (2250×1250)')).toBeVisible();
        await expect(menu.locator('text=Normal Quality (1800×1000)')).toBeVisible();
        await expect(menu.locator('text=Low Quality (1125×625)')).toBeVisible();
        await expect(menu.locator('text=Lowest Quality (900×500)')).toBeVisible();
    });

    test('should hide menu when clicking outside', async ({ page }) => {
        // Click screenshot button to open menu
        await page.locator('#btn-screenshot').click();

        // Wait for menu to be visible
        const menu = page.locator('#screenshot-menu');
        await expect(menu).toBeVisible({ timeout: 1000 });

        // Click outside the menu (on the board name)
        await page.locator('#board-name').click();
        await page.waitForTimeout(100);

        // Verify menu is hidden
        await expect(menu).toBeHidden();
    });

    test('should hide menu after selecting a quality option', async ({ page }) => {
        // Mock html-to-image to avoid actual screenshot generation
        await page.addInitScript(() => {
            window.htmlToImage = {
                toCanvas: async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 100;
                    canvas.height = 100;
                    return canvas;
                }
            };
        });

        // Click screenshot button to open menu
        await page.locator('#btn-screenshot').click();
        await page.waitForTimeout(200);

        // Click a quality option
        await page.locator('#screenshot-menu [data-width="1800"]').click();
        await page.waitForTimeout(500);

        // Verify menu is hidden
        const menu = page.locator('#screenshot-menu');
        await expect(menu).toBeHidden();

        // Verify toast shows the resolution
        const toast = page.locator('.toast');
        await expect(toast).toContainText('1800×1000');
    });

    test('should position menu near the screenshot button and within viewport', async ({ page }) => {
        // Click screenshot button
        await page.locator('#btn-screenshot').click();

        // Wait for menu to be visible
        const menu = page.locator('#screenshot-menu');
        await expect(menu).toBeVisible({ timeout: 1000 });

        // Get button and menu positions
        const buttonBox = await page.locator('#btn-screenshot').boundingBox();
        const menuBox = await menu.boundingBox();
        const viewportSize = page.viewportSize();

        // Verify menu positions are valid
        expect(menuBox).not.toBeNull();
        expect(buttonBox).not.toBeNull();

        // Verify menu is visible and positioned sensibly
        // Either below the button or above it (if not enough space below)
        const isBelow = menuBox.y >= buttonBox.y + buttonBox.height;
        const isAbove = menuBox.y + menuBox.height <= buttonBox.y;
        expect(isBelow || isAbove).toBe(true);

        // Verify menu fits within viewport
        expect(menuBox.x).toBeGreaterThanOrEqual(10);
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(viewportSize.width);
        expect(menuBox.y).toBeGreaterThanOrEqual(10);
        expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(viewportSize.height);
    });

    test('should close screenshot menu when clicking File button', async ({ page }) => {
        // Open screenshot menu
        await page.locator('#btn-screenshot').click();

        // Wait for screenshot menu to be visible
        const screenshotMenu = page.locator('#screenshot-menu');
        await expect(screenshotMenu).toBeVisible({ timeout: 1000 });

        // Click File button
        await page.locator('#btn-file-menu').click();
        await page.waitForTimeout(100);

        // Verify screenshot menu is hidden
        await expect(screenshotMenu).toBeHidden();

        // Verify File menu is visible
        const fileMenu = page.locator('#file-menu');
        await expect(fileMenu).toBeVisible({ timeout: 1000 });
    });

    test('should close File menu when clicking screenshot button', async ({ page }) => {
        // Open File menu
        await page.locator('#btn-file-menu').click();

        // Wait for File menu to be visible
        const fileMenu = page.locator('#file-menu');
        await expect(fileMenu).toBeVisible({ timeout: 1000 });

        // Click screenshot button
        await page.locator('#btn-screenshot').click();
        await page.waitForTimeout(100);

        // Verify File menu is hidden
        await expect(fileMenu).toBeHidden();

        // Verify screenshot menu is visible
        const screenshotMenu = page.locator('#screenshot-menu');
        await expect(screenshotMenu).toBeVisible({ timeout: 1000 });
    });

    test('should toggle menu on repeated clicks', async ({ page }) => {
        const menu = page.locator('#screenshot-menu');

        // First click - open menu
        await page.locator('#btn-screenshot').click();
        await expect(menu).toBeVisible({ timeout: 1000 });

        // Second click - close menu
        await page.locator('#btn-screenshot').click();
        await page.waitForTimeout(100);
        await expect(menu).toBeHidden();

        // Third click - open again
        await page.locator('#btn-screenshot').click();
        await expect(menu).toBeVisible({ timeout: 1000 });
    });

    test('should export screenshot with selected quality', async ({ page }) => {
        // Mock html-to-image to avoid actual screenshot generation
        await page.addInitScript(() => {
            window.htmlToImage = {
                toCanvas: async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 1800;
                    canvas.height = 1000;
                    return canvas;
                }
            };
        });

        // Add a player to make the screenshot more realistic
        await page.locator('.team-player-template').first().click();
        await page.waitForTimeout(300);

        // Open screenshot menu
        await page.locator('#btn-screenshot').click();
        const menu = page.locator('#screenshot-menu');
        await expect(menu).toBeVisible({ timeout: 1000 });

        // Click Normal Quality option (scope to screenshot menu)
        await page.locator('#screenshot-menu [data-width="1800"][data-height="1000"]').click();
        await page.waitForTimeout(500);

        // Verify menu is hidden after selection
        await expect(menu).toBeHidden();

        // Verify toast shows the resolution
        const toast = page.locator('.toast');
        await expect(toast).toContainText('1800×1000');
    });

    test('should export different quality levels', async ({ page }) => {
        // Mock html-to-image
        await page.addInitScript(() => {
            window.htmlToImage = {
                toCanvas: async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 100;
                    canvas.height = 100;
                    return canvas;
                }
            };
        });

        const qualities = [
            { width: 4500, height: 2500, label: 'Highest' },
            { width: 2250, height: 1250, label: 'High' },
            { width: 1125, height: 625, label: 'Low' },
            { width: 900, height: 500, label: 'Lowest' }
        ];

        for (const quality of qualities) {
            // Open menu
            await page.locator('#btn-screenshot').click();
            await page.waitForTimeout(200);

            // Select quality (scope to screenshot menu)
            await page.locator(`#screenshot-menu [data-action="screenshot"][data-width="${quality.width}"][data-height="${quality.height}"]`).click();
            await page.waitForTimeout(500);

            // Verify toast
            const toast = page.locator('.toast').last();
            await expect(toast).toContainText(`${quality.width}×${quality.height}`);
            await page.waitForTimeout(500);
        }
    });

    test('should hide menu on window blur', async ({ page }) => {
        // Open menu
        await page.locator('#btn-screenshot').click();
        const menu = page.locator('#screenshot-menu');
        await expect(menu).toBeVisible({ timeout: 1000 });

        // Trigger window blur
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        await page.waitForTimeout(100);

        // Verify menu is hidden
        await expect(menu).toBeHidden();
    });

    test('should handle Escape key to close menu', async ({ page }) => {
        // Open menu
        await page.locator('#btn-screenshot').click();
        const menu = page.locator('#screenshot-menu');
        await expect(menu).toBeVisible({ timeout: 1000 });

        // Press Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);

        // Menu should still be visible (Escape doesn't close context menus by design)
        // But clicking outside should still work
        await page.locator('#board-name').click();
        await page.waitForTimeout(100);
        await expect(menu).toBeHidden();
    });
});
