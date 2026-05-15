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

    test('Ctrl+S triggers save (keyboard shortcut)', async ({ page }) => {
        // Add some content to the board
        await addBall(page);
        await expect(page.locator('[data-ball]')).toHaveCount(1);

        // Mock the File System Access API if available
        const saveTriggered = await page.evaluate(async () => {
            let triggered = false;

            // If File System Access API is available, mock it
            if ('showSaveFilePicker' in window) {
                window.showSaveFilePicker = async () => {
                    triggered = true;
                    throw new Error('AbortError'); // Simulate user canceling
                };
            } else {
                // For browsers without File System Access API, check if download was triggered
                const originalCreateElement = document.createElement;
                document.createElement = function(tagName) {
                    const element = originalCreateElement.call(document, tagName);
                    if (tagName === 'a' && element.download) {
                        triggered = true;
                    }
                    return element;
                };
            }

            // Press Ctrl+S
            const event = new KeyboardEvent('keydown', {
                key: 's',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);

            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            return triggered;
        });

        // Verify that save was triggered
        expect(saveTriggered).toBe(true);
    });

    test('Ctrl+O triggers open workbook (keyboard shortcut)', async ({ page }) => {
        // Mock the File System Access API or file input click
        const openTriggered = await page.evaluate(async () => {
            let triggered = false;

            // If File System Access API is available, mock it
            if ('showOpenFilePicker' in window) {
                window.showOpenFilePicker = async () => {
                    triggered = true;
                    throw new Error('AbortError'); // Simulate user canceling
                };
            } else {
                // For browsers without File System Access API, check if file input was clicked
                const fileInput = document.getElementById('import-workbook-input');
                if (fileInput) {
                    const originalClick = fileInput.click;
                    fileInput.click = function() {
                        triggered = true;
                        // Don't actually click to avoid opening file picker
                    };
                }
            }

            // Press Ctrl+O
            const event = new KeyboardEvent('keydown', {
                key: 'o',
                ctrlKey: true,
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);

            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 100));

            return triggered;
        });

        // Verify that open was triggered
        expect(openTriggered).toBe(true);
    });
});
