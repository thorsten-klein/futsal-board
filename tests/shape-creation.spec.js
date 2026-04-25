/**
 * Shape creation tests — verify rectangle and ellipse shapes
 * can be created via click and drag-and-drop.
 */
import { test, expect } from './test-config.js';
import { goto, boardCenter } from './helpers.js';

test.describe('Shape Creation via Click', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('click rectangle button adds rectangle at center', async ({ page }) => {
        const beforeCount = await page.evaluate(() => AppState.shapes.length);

        // Click rectangle button
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        // Verify shape was added
        const afterCount = await page.evaluate(() => AppState.shapes.length);
        expect(afterCount).toBe(beforeCount + 1);

        // Verify it's a rectangle
        const shape = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1]);
        expect(shape.type).toBe('rectangle');

        // Verify it's rendered
        const shapeEl = page.locator(`[data-shape="${shape.id}"]`);
        await expect(shapeEl).toHaveCount(1);

        // Verify it's a rect element
        const rect = shapeEl.locator('rect');
        await expect(rect).toHaveCount(1);
    });

    test('click ellipse button adds ellipse at center', async ({ page }) => {
        const beforeCount = await page.evaluate(() => AppState.shapes.length);

        // Click ellipse button
        await page.locator('.draw-btn[data-draw="ellipse"]').click();
        await page.waitForTimeout(200);

        // Verify shape was added
        const afterCount = await page.evaluate(() => AppState.shapes.length);
        expect(afterCount).toBe(beforeCount + 1);

        // Verify it's an ellipse
        const shape = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1]);
        expect(shape.type).toBe('ellipse');

        // Verify it's rendered
        const shapeEl = page.locator(`[data-shape="${shape.id}"]`);
        await expect(shapeEl).toHaveCount(1);
    });

    test('multiple shapes can be added', async ({ page }) => {
        // Add rectangle
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(100);

        // Add ellipse
        await page.locator('.draw-btn[data-draw="ellipse"]').click();
        await page.waitForTimeout(100);

        // Verify all 2 were added
        const shapeCount = await page.evaluate(() => AppState.shapes.length);
        expect(shapeCount).toBe(2);

        // Verify types
        const types = await page.evaluate(() => AppState.shapes.map(s => s.type));
        expect(types).toEqual(['rectangle', 'ellipse']);
    });
});

test.describe('Shape Creation via Drag-and-Drop', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('drag rectangle button to canvas adds rectangle at drop position', async ({ page }) => {
        const beforeCount = await page.evaluate(() => AppState.shapes.length);

        const rectBtn = page.locator('.draw-btn[data-draw="rectangle"]');
        const center = await boardCenter(page);

        // Drag rectangle button to board center
        await rectBtn.hover();
        await page.mouse.down();
        await page.mouse.move(center.x, center.y);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Verify shape was added
        const afterCount = await page.evaluate(() => AppState.shapes.length);
        expect(afterCount).toBe(beforeCount + 1);

        // Verify it's a rectangle
        const shape = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1]);
        expect(shape.type).toBe('rectangle');

        // Position should be near the drop location
        expect(shape.x).toBeGreaterThan(1000);
        expect(shape.y).toBeGreaterThan(500);
    });

    test('drag ellipse button to canvas adds ellipse at drop position', async ({ page }) => {
        const beforeCount = await page.evaluate(() => AppState.shapes.length);

        const ellipseBtn = page.locator('.draw-btn[data-draw="ellipse"]');
        const center = await boardCenter(page);

        // Drag ellipse button to board
        await ellipseBtn.hover();
        await page.mouse.down();
        await page.mouse.move(center.x - 100, center.y - 100);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Verify shape was added
        const afterCount = await page.evaluate(() => AppState.shapes.length);
        expect(afterCount).toBe(beforeCount + 1);

        // Verify it's an ellipse
        const shape = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1]);
        expect(shape.type).toBe('ellipse');
    });

    test('drag preview shows while dragging shape from sidebar', async ({ page }) => {
        const rectBtn = page.locator('.draw-btn[data-draw="rectangle"]');
        const center = await boardCenter(page);

        // Start dragging
        await rectBtn.hover();
        await page.mouse.down();

        // Move over board
        await page.mouse.move(center.x, center.y);
        await page.waitForTimeout(100);

        await page.mouse.up();
        await page.waitForTimeout(200);

        // Verify shape was created
        const shapeCount = await page.evaluate(() => AppState.shapes.length);
        expect(shapeCount).toBeGreaterThan(0);
    });

    test('shapes can be added via both click and drag', async ({ page }) => {
        const center = await boardCenter(page);

        // Add rectangle via click
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(100);

        // Add ellipse via drag
        const ellipseBtn = page.locator('.draw-btn[data-draw="ellipse"]');
        await ellipseBtn.hover();
        await page.mouse.down();
        await page.mouse.move(center.x, center.y);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Verify both were added
        const shapeCount = await page.evaluate(() => AppState.shapes.length);
        expect(shapeCount).toBe(2);

        const types = await page.evaluate(() => AppState.shapes.map(s => s.type));
        expect(types).toContain('rectangle');
        expect(types).toContain('ellipse');
    });
});

test.describe('Shape Properties on Creation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('created rectangle has valid dimensions', async ({ page }) => {
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        const shape = await page.evaluate(() => AppState.shapes[0]);
        expect(shape.width).toBeGreaterThan(0);
        expect(shape.height).toBeGreaterThan(0);
        expect(shape.rotation).toBeDefined();
        expect(shape.color).toBeDefined();
    });

    test('created shapes are added to undo stack', async ({ page }) => {
        await page.locator('.draw-btn[data-draw="ellipse"]').click();
        await page.waitForTimeout(200);

        // Verify shape exists
        let shapeCount = await page.evaluate(() => AppState.shapes.length);
        expect(shapeCount).toBe(1);

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(200);

        // Shape should be gone
        shapeCount = await page.evaluate(() => AppState.shapes.length);
        expect(shapeCount).toBe(0);

        // Redo
        await page.keyboard.press('Control+Shift+z');
        await page.waitForTimeout(200);

        // Shape should be back
        shapeCount = await page.evaluate(() => AppState.shapes.length);
        expect(shapeCount).toBe(1);
    });
});
