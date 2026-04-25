/**
 * Rotation handle visibility tests.
 *
 * When a rotatable object is selected, a rotation dot (.rotation-handle)
 * must appear in the DOM and be visible.
 *
 * Rotatable objects:
 * - Players (all players are rotatable)
 * - Elements: goal, small-goal, ladder
 * - Shapes: rectangle, ellipse, line, arrow
 *
 * Non-rotatable elements (cone, pole) are NOT tested here.
 */
import { test, expect } from './test-config.js';
import { goto, addElement } from './helpers.js';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Click the first team template to add one player; return its locator. */
async function addPlayer(page) {
    const before = await page.locator('.player').count();
    await page.locator('.team-player-template').first().click();
    await expect(page.locator('.player')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('.player').nth(before);
}

/** Click a draw-toolbar button to add a shape; return its locator. */
async function addShape(page, type) {
    const before = await page.locator('[data-shape]').count();
    await page.locator(`.draw-btn[data-draw="${type}"]`).click();
    await expect(page.locator('[data-shape]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-shape]').nth(before);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Rotation handle visibility', () => {
    test.beforeEach(async ({ page }) => { await goto(page); });

    // ── Players ──────────────────────────────────────────────────────────────

    test('rotation handle appears when a player is selected', async ({ page }) => {
        const player = await addPlayer(page);
        await player.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
    });

    test('rotation handle disappears when player is deselected', async ({ page }) => {
        const player = await addPlayer(page);
        await player.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
        // Click empty board area to deselect
        await page.locator('.board-container').click({ position: { x: 10, y: 10 } });
        await expect(page.locator('.rotation-handle')).toHaveCount(0);
    });

    // ── Elements ─────────────────────────────────────────────────────────────

    test('rotation handle appears when a goal element is selected', async ({ page }) => {
        // Default board has 2 goals already (element-1 and element-2)
        const goal = page.locator('#players-layer [data-element]').first();
        await goal.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
    });

    test('rotation handle appears when a small-goal element is selected', async ({ page }) => {
        const el = await addElement(page, 'small-goal');
        await el.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
    });

    test('rotation handle appears when a ladder element is selected', async ({ page }) => {
        const el = await addElement(page, 'ladder');
        await el.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
    });

    test('rotation handle does NOT appear for non-rotatable cone element', async ({ page }) => {
        const el = await addElement(page, 'cone');
        await el.click();
        await expect(page.locator('.rotation-handle')).toHaveCount(0);
    });

    test('rotation handle does NOT appear for non-rotatable pole element', async ({ page }) => {
        const el = await addElement(page, 'pole');
        await el.click();
        await expect(page.locator('.rotation-handle')).toHaveCount(0);
    });

    // ── Shapes ───────────────────────────────────────────────────────────────

    test('rotation handle appears when a rectangle shape is selected', async ({ page }) => {
        const shape = await addShape(page, 'rectangle');
        await shape.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
    });

    test('rotation handle appears when an ellipse shape is selected', async ({ page }) => {
        const shape = await addShape(page, 'ellipse');
        await shape.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
    });

    test('rotation handle appears when a line shape is selected', async ({ page }) => {
        const shape = await addShape(page, 'line');
        await shape.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
    });

    test('rotation handle appears when an arrow shape is selected', async ({ page }) => {
        const shape = await addShape(page, 'arrow');
        await shape.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
    });

    test('rotation handle disappears when shape is deselected', async ({ page }) => {
        const shape = await addShape(page, 'rectangle');
        await shape.click();
        await expect(page.locator('.rotation-handle')).toBeVisible({ timeout: 2000 });
        await page.locator('.board-container').click({ position: { x: 10, y: 10 } });
        await expect(page.locator('.rotation-handle')).toHaveCount(0);
    });
});
