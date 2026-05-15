/**
 * Board duplication modal tests — verify modal appears when duplicating a board
 * and allows the user to specify a custom name for the duplicate.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Board Duplication Modal', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    // ── Modal opening and ARIA attributes ──────────────────────────────────

    test('modal opens when duplicate is selected from board context menu', async ({ page }) => {
        // Switch to Workbook tab to see boards list
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();

        // Right-click the first board in the list
        const boardItem = page.locator('.board-item').first();
        await boardItem.click({ button: 'right' });

        // Click duplicate in context menu
        await page.locator('#board-context-menu .context-menu-item[data-action="duplicate"]').click();

        // Verify modal is visible
        const modal = page.locator('#board-name-modal');
        await expect(modal).toBeVisible();
    });

    test('modal has correct ARIA attributes', async ({ page }) => {
        // Switch to Workbook tab and open duplicate modal
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();
        const boardItem = page.locator('.board-item').first();
        await boardItem.click({ button: 'right' });
        await page.locator('#board-context-menu .context-menu-item[data-action="duplicate"]').click();

        const modal = page.locator('#board-name-modal');
        await expect(modal).toBeVisible();
        await expect(modal).toHaveAttribute('role', 'dialog');
        await expect(modal).toHaveAttribute('aria-modal', 'true');
        await expect(modal).toHaveAttribute('aria-labelledby', 'board-name-modal-title');
    });

    test('modal title reads "Duplicate Board"', async ({ page }) => {
        // Switch to Workbook tab and open duplicate modal
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();
        const boardItem = page.locator('.board-item').first();
        await boardItem.click({ button: 'right' });
        await page.locator('#board-context-menu .context-menu-item[data-action="duplicate"]').click();

        await expect(page.locator('#board-name-modal-title')).toHaveText('Duplicate Board');
    });

    // ── Input field behavior ───────────────────────────────────────────────

    test('input field is pre-filled with original board name + " (Copy)"', async ({ page }) => {
        // Switch to Workbook tab and open duplicate modal
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();
        const boardItem = page.locator('.board-item').first();
        const originalName = await boardItem.locator('.board-item-name').textContent();

        await boardItem.click({ button: 'right' });
        await page.locator('#board-context-menu .context-menu-item[data-action="duplicate"]').click();

        const input = page.locator('#board-name-input');
        await expect(input).toHaveValue(`${originalName} (Copy)`);
    });

    test('input field is focused and selected on open', async ({ page }) => {
        // Switch to Workbook tab and open duplicate modal
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();
        const boardItem = page.locator('.board-item').first();
        await boardItem.click({ button: 'right' });
        await page.locator('#board-context-menu .context-menu-item[data-action="duplicate"]').click();

        const input = page.locator('#board-name-input');
        await expect(input).toBeFocused();

        // Verify text is selected by checking that typing replaces all text
        await page.keyboard.type('X');
        await expect(input).toHaveValue('X');
    });

    // ── Cancel and Escape behavior ─────────────────────────────────────────

    test('Cancel button closes modal without duplicating', async ({ page }) => {
        // Switch to Workbook tab and count initial boards
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();
        const initialBoardCount = await page.locator('.board-item').count();

        // Open duplicate modal
        const boardItem = page.locator('.board-item').first();
        await boardItem.click({ button: 'right' });
        await page.locator('#board-context-menu .context-menu-item[data-action="duplicate"]').click();

        // Click Cancel
        await page.locator('#btn-cancel-board-name').click();

        // Verify modal is hidden
        const modal = page.locator('#board-name-modal');
        await expect(modal).toBeHidden();

        // Verify board count hasn't changed
        const finalBoardCount = await page.locator('.board-item').count();
        expect(finalBoardCount).toBe(initialBoardCount);
    });

    test('Escape key closes modal without duplicating', async ({ page }) => {
        // Switch to Workbook tab and count initial boards
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();
        const initialBoardCount = await page.locator('.board-item').count();

        // Open duplicate modal
        const boardItem = page.locator('.board-item').first();
        await boardItem.click({ button: 'right' });
        await page.locator('#board-context-menu .context-menu-item[data-action="duplicate"]').click();

        // Press Escape
        await page.keyboard.press('Escape');

        // Verify modal is hidden
        const modal = page.locator('#board-name-modal');
        await expect(modal).toBeHidden();

        // Verify board count hasn't changed
        const finalBoardCount = await page.locator('.board-item').count();
        expect(finalBoardCount).toBe(initialBoardCount);
    });

    // ── OK button and Enter key behavior ───────────────────────────────────

    test('OK button with valid name creates duplicated board with custom name', async ({ page }) => {
        // Switch to Workbook tab
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();

        // Open duplicate modal
        const boardItem = page.locator('.board-item').first();
        await boardItem.click({ button: 'right' });
        await page.locator('#board-context-menu .context-menu-item[data-action="duplicate"]').click();

        // Change the name
        const input = page.locator('#board-name-input');
        await input.fill('My Custom Duplicate');

        // Click OK
        await page.locator('#btn-confirm-board-name').click();

        // Verify modal is hidden
        const modal = page.locator('#board-name-modal');
        await expect(modal).toBeHidden();

        // Verify new board appears in list with custom name
        await expect(page.locator('.board-item-name:has-text("My Custom Duplicate")')).toBeVisible();
    });

    test('Enter key in input field confirms and creates duplicated board', async ({ page }) => {
        // Switch to Workbook tab
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();

        // Open duplicate modal
        const boardItem = page.locator('.board-item').first();
        await boardItem.click({ button: 'right' });
        await page.locator('#board-context-menu .context-menu-item[data-action="duplicate"]').click();

        // Change the name
        const input = page.locator('#board-name-input');
        await input.fill('Enter Key Duplicate');

        // Press Enter
        await page.keyboard.press('Enter');

        // Verify modal is hidden
        const modal = page.locator('#board-name-modal');
        await expect(modal).toBeHidden();

        // Verify new board appears in list with custom name
        await expect(page.locator('.board-item-name:has-text("Enter Key Duplicate")')).toBeVisible();
    });

    // ── Validation ─────────────────────────────────────────────────────────

    test('empty name shows validation error', async ({ page }) => {
        // Switch to Workbook tab
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();

        // Open duplicate modal
        const boardItem = page.locator('.board-item').first();
        await boardItem.click({ button: 'right' });
        await page.locator('#board-context-menu .context-menu-item[data-action="duplicate"]').click();

        // Clear the input
        const input = page.locator('#board-name-input');
        await input.fill('');

        // Click OK
        await page.locator('#btn-confirm-board-name').click();

        // Verify validation message appears (reuses existing validation from confirmBoardName)
        const messageModal = page.locator('#message-modal');
        await expect(messageModal).toBeVisible();
        await expect(page.locator('#message-modal-text')).toHaveText('Please enter a board name');
        await expect(page.locator('#message-modal-title')).toHaveText('Name Required');
    });

    // ── Board list verification ────────────────────────────────────────────

    test('duplicated board appears in boards list with the new name', async ({ page }) => {
        // Switch to Workbook tab
        await page.locator('.sidebar-tab[data-tab="workbook"]').click();

        // Get original board name
        const boardItem = page.locator('.board-item').first();
        const originalName = await boardItem.locator('.board-item-name').textContent();

        // Count initial boards
        const initialBoardCount = await page.locator('.board-item').count();

        // Open duplicate modal
        await boardItem.click({ button: 'right' });
        await page.locator('#board-context-menu .context-menu-item[data-action="duplicate"]').click();

        // Use the default name
        await page.locator('#btn-confirm-board-name').click();

        // Verify board count increased
        const finalBoardCount = await page.locator('.board-item').count();
        expect(finalBoardCount).toBe(initialBoardCount + 1);

        // Verify duplicated board appears with " (Copy)" suffix
        await expect(page.locator(`.board-item-name:has-text("${originalName} (Copy)")`)).toBeVisible();
    });
});
