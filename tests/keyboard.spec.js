/**
 * Keyboard shortcut tests.
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addElement } from './helpers.js';

test.describe('Keyboard shortcuts', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('Ctrl+Z undoes (keyboard shortcut)', async ({ page }) => {
        await addBall(page);
        await expect(page.locator('[data-ball]')).toHaveCount(1);
        await page.keyboard.press('Control+z');
        await expect(page.locator('[data-ball]')).toHaveCount(0);
    });

    test('Ctrl+Shift+Z redoes (keyboard shortcut)', async ({ page }) => {
        await addBall(page);
        await page.keyboard.press('Control+z');
        await expect(page.locator('[data-ball]')).toHaveCount(0);
        await page.keyboard.press('Control+Shift+z');
        await expect(page.locator('[data-ball]')).toHaveCount(1);
    });

    test('Ctrl+Y redoes (alternative shortcut)', async ({ page }) => {
        await addBall(page);
        await page.keyboard.press('Control+z');
        await page.keyboard.press('Control+y');
        await expect(page.locator('[data-ball]')).toHaveCount(1);
    });

    test('Delete key removes selected ball', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click();
        await page.keyboard.press('Delete');
        await expect(page.locator('[data-ball]')).toHaveCount(0);
    });

    test('Escape closes open context menu', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click({ button: 'right' });
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(menu).toBeHidden({ timeout: 2000 });
    });

    test('Escape closes open modal', async ({ page }) => {
        await page.evaluate(() => Utils.showMessage('test', 'title'));
        await expect(page.locator('#message-modal')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('#message-modal')).toBeHidden({ timeout: 2000 });
    });

    test('Ctrl+C and Ctrl+V copies and pastes selected ball', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click();
        await expect(page.locator('[data-ball]')).toHaveCount(1);

        await page.keyboard.press('Control+c');
        await page.keyboard.press('Control+v');
        await expect(page.locator('[data-ball]')).toHaveCount(2);
    });
});
