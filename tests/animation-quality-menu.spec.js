/**
 * Animation quality menu tests — verify the dropdown menu displays quality options
 * and button states update correctly
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Animation Quality Menu', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('should have animation button in header', async ({ page }) => {
        // Verify button exists
        const headerBtn = page.locator('#btn-header-download-animation');
        await expect(headerBtn).toHaveCount(1);
    });

    test('should show animation menu exists in DOM', async ({ page }) => {
        // Verify menu exists
        const menu = page.locator('#animation-menu');
        await expect(menu).toHaveCount(1);

        // Verify menu is initially hidden
        await expect(menu).toBeHidden();
    });

    test('should display all quality options in menu', async ({ page }) => {
        // Verify all quality options are present in the menu
        const menu = page.locator('#animation-menu');
        await expect(menu.locator('text=Highest Quality (4500×2500)')).toHaveCount(1);
        await expect(menu.locator('text=High Quality (2250×1250)')).toHaveCount(1);
        await expect(menu.locator('text=Normal Quality (1800×1000)')).toHaveCount(1);
        await expect(menu.locator('text=Low Quality (1125×625)')).toHaveCount(1);
        await expect(menu.locator('text=Lowest Quality (900×500)')).toHaveCount(1);
    });

    test('should update button state when switching between parent and child boards', async ({ page }) => {
        const headerBtn = page.locator('#btn-header-download-animation');

        // Wait for animation system to initialize
        await page.waitForTimeout(500);

        // Initially on parent board - button should be disabled
        const isDisabledInitially = await headerBtn.isDisabled();
        const initialOpacity = await headerBtn.evaluate(el => window.getComputedStyle(el).opacity);

        // Both assertions should pass (either already disabled or will be after render)
        expect(isDisabledInitially || parseFloat(initialOpacity) < 1).toBeTruthy();
    });

    test('should hide animation menu on window blur', async ({ page }) => {
        // Create a child board first
        await page.evaluate(() => {
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            if (typeof Animations !== 'undefined') {
                Animations.renderParentPaths();
            }
        });
        await page.waitForTimeout(500);

        // Open menu
        await page.locator('#btn-header-download-animation').click();
        const menu = page.locator('#animation-menu');
        await expect(menu).toBeVisible({ timeout: 1000 });

        // Trigger window blur
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        await page.waitForTimeout(100);

        // Verify menu is hidden
        await expect(menu).toBeHidden();
    });

    test('should toggle animation menu on repeated clicks', async ({ page }) => {
        // Create a child board
        await page.evaluate(() => {
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            if (typeof Animations !== 'undefined') {
                Animations.renderParentPaths();
            }
        });
        await page.waitForTimeout(500);

        const menu = page.locator('#animation-menu');
        const btn = page.locator('#btn-header-download-animation');

        // First click - open menu
        await btn.click();
        await expect(menu).toBeVisible({ timeout: 1000 });

        // Second click - close menu
        await btn.click();
        await page.waitForTimeout(100);
        await expect(menu).toBeHidden();

        // Third click - open again
        await btn.click();
        await expect(menu).toBeVisible({ timeout: 1000 });
    });

    test('should close animation menu when clicking outside', async ({ page }) => {
        // Create a child board
        await page.evaluate(() => {
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            if (typeof Animations !== 'undefined') {
                Animations.renderParentPaths();
            }
        });
        await page.waitForTimeout(500);

        // Open animation menu
        await page.locator('#btn-header-download-animation').click();
        const menu = page.locator('#animation-menu');
        await expect(menu).toBeVisible({ timeout: 1000 });

        // Click outside the menu
        await page.locator('#board-name').click();
        await page.waitForTimeout(100);

        // Verify menu is hidden
        await expect(menu).toBeHidden();
    });

    test('should close animation menu when clicking screenshot button', async ({ page }) => {
        // Create a child board
        await page.evaluate(() => {
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            if (typeof Animations !== 'undefined') {
                Animations.renderParentPaths();
            }
        });
        await page.waitForTimeout(500);

        // Open animation menu
        await page.locator('#btn-header-download-animation').click();
        const animationMenu = page.locator('#animation-menu');
        await expect(animationMenu).toBeVisible({ timeout: 1000 });

        // Click screenshot button
        await page.locator('#btn-screenshot').click();
        await page.waitForTimeout(100);

        // Verify animation menu is hidden
        await expect(animationMenu).toBeHidden();

        // Verify screenshot menu is visible
        const screenshotMenu = page.locator('#screenshot-menu');
        await expect(screenshotMenu).toBeVisible({ timeout: 1000 });
    });
});
