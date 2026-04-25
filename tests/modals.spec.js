/**
 * Modal tests — verify modals open, accept input, and close correctly.
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addPlate, addElement } from './helpers.js';

test.describe('Modals', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    // ── Element position modal ─────────────────────────────────────────────

    test('position modal has correct ARIA attributes', async ({ page }) => {
        const el = await addElement(page, 'cone');
        await el.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="position"]').click();

        const modal = page.locator('#element-position-modal');
        await expect(modal).toBeVisible();
        await expect(modal).toHaveAttribute('role', 'dialog');
        await expect(modal).toHaveAttribute('aria-modal', 'true');
        await expect(modal).toHaveAttribute('aria-labelledby', 'element-position-modal-title');
    });

    test('position modal focuses first element on open', async ({ page }) => {
        const el = await addElement(page, 'cone');
        await el.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="position"]').click();

        await expect(page.locator('#element-position-modal')).toBeVisible();
        // Utils.openModal focuses the first focusable element (a button or input)
        const focused = page.locator('#element-position-modal :focus');
        await expect(focused).toBeVisible({ timeout: 2000 });
    });

    test('position modal Cancel button closes modal', async ({ page }) => {
        const el = await addElement(page, 'cone');
        await el.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="position"]').click();

        await expect(page.locator('#element-position-modal')).toBeVisible();
        await page.locator('#btn-cancel-position').click();
        await expect(page.locator('#element-position-modal')).toBeHidden();
    });

    test('position modal Escape key closes modal', async ({ page }) => {
        const el = await addElement(page, 'cone');
        await el.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="position"]').click();

        await expect(page.locator('#element-position-modal')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('#element-position-modal')).toBeHidden();
    });

    // ── Color modal ────────────────────────────────────────────────────────

    test('color modal opens from ball context menu', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click({ button: 'right' });
        await page.locator('.context-menu-item[data-action="color"]').first().click();

        await expect(page.locator('#element-color-modal')).toBeVisible();
        await expect(page.locator('#element-color-modal')).toHaveAttribute('aria-labelledby', 'element-color-modal-title');
    });

    test('color modal Cancel closes without changes', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click({ button: 'right' });
        await page.locator('.context-menu-item[data-action="color"]').first().click();

        await expect(page.locator('#element-color-modal')).toBeVisible();
        await page.locator('#btn-cancel-color').click();
        await expect(page.locator('#element-color-modal')).toBeHidden();
    });

    // ── Message modal ──────────────────────────────────────────────────────

    test('message modal has correct ARIA attributes', async ({ page }) => {
        // Trigger message modal via JS
        await page.evaluate(() => Utils.showMessage('Test message', 'Test Title'));
        const modal = page.locator('#message-modal');
        await expect(modal).toBeVisible();
        await expect(modal).toHaveAttribute('role', 'dialog');
        await expect(modal).toHaveAttribute('aria-modal', 'true');
        await expect(modal).toHaveAttribute('aria-labelledby', 'message-modal-title');
        await expect(modal).toHaveAttribute('aria-describedby', 'message-modal-text');
    });

    test('message modal shows correct title and text', async ({ page }) => {
        await page.evaluate(() => Utils.showMessage('Hello World', 'My Title'));
        await expect(page.locator('#message-modal-title')).toHaveText('My Title');
        await expect(page.locator('#message-modal-text')).toHaveText('Hello World');
    });

    test('message modal OK button closes it', async ({ page }) => {
        await page.evaluate(() => Utils.showMessage('Test', 'Title'));
        await expect(page.locator('#message-modal')).toBeVisible();
        await page.locator('#btn-message-modal-ok').click();
        await expect(page.locator('#message-modal')).toBeHidden();
    });

    test('message modal closes on Escape', async ({ page }) => {
        await page.evaluate(() => Utils.showMessage('Test', 'Title'));
        await expect(page.locator('#message-modal')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('#message-modal')).toBeHidden();
    });

    test('message modal focuses OK button on open', async ({ page }) => {
        await page.evaluate(() => Utils.showMessage('Test', 'Title'));
        const focused = await page.evaluate(() => document.activeElement?.id);
        expect(focused).toBe('btn-message-modal-ok');
    });

    // ── Workbook name modal ────────────────────────────────────────────────

    test('workbook name modal has aria-labelledby', async ({ page }) => {
        await expect(page.locator('#workbook-name-modal')).toHaveAttribute('aria-labelledby', 'workbook-modal-title');
    });
});
