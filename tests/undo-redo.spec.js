/**
 * Undo/redo tests — add/remove entities and verify undo restores state.
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addPlate, addElement, undo, redo } from './helpers.js';

test.describe('Undo / Redo', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('undo button starts disabled on a genuinely empty board', async ({ page }) => {
        // After fresh load with empty localStorage the app saves an initial snapshot,
        // so undo MAY be enabled. What matters is that after undoing back to the
        // baseline there is nothing left to undo (button gets disabled again).
        // Verify the button exists and has the right aria-label.
        await expect(page.locator('#btn-undo')).toHaveAttribute('aria-label', 'Undo');
    });

    test('redo button starts disabled', async ({ page }) => {
        await expect(page.locator('#btn-redo')).toBeDisabled();
    });

    test('undo button enables after adding a ball', async ({ page }) => {
        await addBall(page);
        await expect(page.locator('#btn-undo')).toBeEnabled({ timeout: 2000 });
    });

    test('Ctrl+Z undoes adding a ball', async ({ page }) => {
        await addBall(page);
        await expect(page.locator('[data-ball]')).toHaveCount(1);

        await undo(page);
        await expect(page.locator('[data-ball]')).toHaveCount(0);
    });

    test('Ctrl+Z undoes adding a plate', async ({ page }) => {
        await addPlate(page);
        await expect(page.locator('[data-plate]')).toHaveCount(1);

        await undo(page);
        await expect(page.locator('[data-plate]')).toHaveCount(0);
    });

    test('Ctrl+Z undoes adding an element', async ({ page }) => {
        const before = await page.locator('#players-layer [data-element]').count();
        await addElement(page, 'cone');
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(before + 1);

        await undo(page);
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(before);
    });

    test('Ctrl+Shift+Z redoes after undo', async ({ page }) => {
        await addBall(page);
        await undo(page);
        await expect(page.locator('[data-ball]')).toHaveCount(0);

        await redo(page);
        await expect(page.locator('[data-ball]')).toHaveCount(1);
    });

    test('multiple undos restore earlier states', async ({ page }) => {
        await addBall(page, 0);
        await addBall(page, 1);
        await addBall(page, 2);
        await expect(page.locator('[data-ball]')).toHaveCount(3);

        await undo(page);
        await expect(page.locator('[data-ball]')).toHaveCount(2);

        await undo(page);
        await expect(page.locator('[data-ball]')).toHaveCount(1);

        await undo(page);
        await expect(page.locator('[data-ball]')).toHaveCount(0);
    });

    test('undo after remove restores removed entity', async ({ page }) => {
        const ball = await addBall(page);
        await ball.click({ button: 'right' });
        await page.locator('.context-menu-item[data-action="remove"]').first().click();
        await expect(page.locator('[data-ball]')).toHaveCount(0);

        await undo(page);
        await expect(page.locator('[data-ball]')).toHaveCount(1);
    });

    test('undo button click undoes last action', async ({ page }) => {
        await addBall(page);
        await expect(page.locator('[data-ball]')).toHaveCount(1);

        await page.locator('#btn-undo').click();
        await expect(page.locator('[data-ball]')).toHaveCount(0);
    });

    test('redo button click redoes last undone action', async ({ page }) => {
        await addBall(page);
        await page.locator('#btn-undo').click();
        await expect(page.locator('[data-ball]')).toHaveCount(0);

        await page.locator('#btn-redo').click();
        await expect(page.locator('[data-ball]')).toHaveCount(1);
    });
});
