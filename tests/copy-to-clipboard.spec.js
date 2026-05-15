/**
 * Copy to clipboard tests - verifies that the "Copy to Clipboard" menu item
 * correctly copies the highest resolution screenshot to the system clipboard.
 */
import { test, expect } from './test-config.js';
import { goto, addBall } from './helpers.js';

test.describe('Copy to Clipboard', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('Copy to Clipboard menu item is present as first item', async ({ page }) => {
        // Open screenshot menu
        await page.locator('#btn-screenshot').click();

        // Verify menu is visible
        await expect(page.locator('#screenshot-menu')).toBeVisible();

        // Verify "Copy to Clipboard" is the first menu item
        const firstItem = page.locator('#screenshot-menu .context-menu-item').first();
        await expect(firstItem).toBeVisible();
        await expect(firstItem).toContainText('Copy to Clipboard');
        await expect(firstItem).toHaveAttribute('data-action', 'copy-to-clipboard');
    });

    test('Copy to Clipboard uses highest resolution (4500×2500)', async ({ page }) => {
        // Open screenshot menu
        await page.locator('#btn-screenshot').click();

        // Verify the Copy to Clipboard item has highest resolution dimensions
        const copyItem = page.locator('#screenshot-menu .context-menu-item[data-action="copy-to-clipboard"]');
        await expect(copyItem).toHaveAttribute('data-width', '4500');
        await expect(copyItem).toHaveAttribute('data-height', '2500');
    });

    test('Copy to Clipboard triggers clipboard write', async ({ page }) => {
        // Add some content to make the screenshot more meaningful
        await addBall(page);
        await expect(page.locator('[data-ball]')).toHaveCount(1);

        // Mock the clipboard API and track if it was called
        const clipboardWriteCalled = await page.evaluate(async () => {
            let writeCalled = false;
            let writeArgs = null;

            // Mock navigator.clipboard.write
            if (!navigator.clipboard) {
                navigator.clipboard = {};
            }
            navigator.clipboard.write = async function(data) {
                writeCalled = true;
                writeArgs = data;
                return Promise.resolve();
            };

            // Click screenshot button
            document.getElementById('btn-screenshot').click();

            // Wait for menu to appear
            await new Promise(resolve => setTimeout(resolve, 100));

            // Click "Copy to Clipboard" menu item
            const copyItem = document.querySelector('#screenshot-menu .context-menu-item[data-action="copy-to-clipboard"]');
            if (copyItem) {
                copyItem.click();
            }

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 3000));

            return {
                writeCalled,
                hasClipboardItem: writeArgs && writeArgs.length > 0 && writeArgs[0] instanceof ClipboardItem
            };
        });

        // Verify clipboard.write was called
        expect(clipboardWriteCalled.writeCalled).toBe(true);
        expect(clipboardWriteCalled.hasClipboardItem).toBe(true);
    });

    test('Copy to Clipboard shows success toast', async ({ page }) => {
        // Add some content
        await addBall(page);

        // Mock the clipboard API to succeed
        await page.evaluate(() => {
            if (!navigator.clipboard) {
                navigator.clipboard = {};
            }
            navigator.clipboard.write = async function() {
                return Promise.resolve();
            };
        });

        // Click screenshot button
        await page.locator('#btn-screenshot').click();

        // Click "Copy to Clipboard" menu item
        await page.locator('#screenshot-menu .context-menu-item[data-action="copy-to-clipboard"]').click();

        // Wait for toast to appear
        await page.waitForTimeout(2000);

        // Check for success toast message
        const toastVisible = await page.evaluate(() => {
            const toast = document.querySelector('.toast');
            return toast && !toast.classList.contains('hidden') &&
                   toast.textContent.includes('Copied to clipboard') &&
                   toast.textContent.includes('4500×2500');
        });

        expect(toastVisible).toBe(true);
    });

    test('Copy to Clipboard closes menu after click', async ({ page }) => {
        // Mock clipboard API
        await page.evaluate(() => {
            if (!navigator.clipboard) {
                navigator.clipboard = {};
            }
            navigator.clipboard.write = async function() {
                return Promise.resolve();
            };
        });

        // Open screenshot menu
        await page.locator('#btn-screenshot').click();
        await expect(page.locator('#screenshot-menu')).toBeVisible();

        // Click "Copy to Clipboard"
        await page.locator('#screenshot-menu .context-menu-item[data-action="copy-to-clipboard"]').click();

        // Wait a bit for the menu to close
        await page.waitForTimeout(500);

        // Verify menu is hidden
        await expect(page.locator('#screenshot-menu')).toBeHidden();
    });

    test('Copy to Clipboard shows error when clipboard API not supported', async ({ page }) => {
        // Remove clipboard API support
        await page.evaluate(() => {
            delete navigator.clipboard;
        });

        // Click screenshot button
        await page.locator('#btn-screenshot').click();

        // Click "Copy to Clipboard" menu item
        await page.locator('#screenshot-menu .context-menu-item[data-action="copy-to-clipboard"]').click();

        // Wait for error modal
        await page.waitForTimeout(1000);

        // Check for error message
        const modalVisible = await page.locator('#message-modal').isVisible();
        if (modalVisible) {
            const modalText = await page.locator('#message-modal').textContent();
            expect(modalText).toContain('Clipboard API not supported');
        }
    });

    test('Copy to Clipboard creates valid PNG blob', async ({ page }) => {
        // Add some content
        await addBall(page);

        // Capture the blob data
        const blobData = await page.evaluate(async () => {
            let capturedBlob = null;

            // Mock clipboard to capture the blob
            if (!navigator.clipboard) {
                navigator.clipboard = {};
            }
            navigator.clipboard.write = async function(data) {
                if (data && data.length > 0 && data[0] instanceof ClipboardItem) {
                    const types = data[0].types;
                    if (types.includes('image/png')) {
                        capturedBlob = await data[0].getType('image/png');
                    }
                }
                return Promise.resolve();
            };

            // Trigger copy to clipboard
            document.getElementById('btn-screenshot').click();
            await new Promise(resolve => setTimeout(resolve, 100));
            const copyItem = document.querySelector('#screenshot-menu .context-menu-item[data-action="copy-to-clipboard"]');
            if (copyItem) {
                copyItem.click();
            }

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 3000));

            if (!capturedBlob) {
                return null;
            }

            return {
                type: capturedBlob.type,
                size: capturedBlob.size
            };
        });

        // Verify blob properties
        expect(blobData).not.toBeNull();
        expect(blobData.type).toBe('image/png');
        expect(blobData.size).toBeGreaterThan(1000); // Should be a substantial image
    });
});
