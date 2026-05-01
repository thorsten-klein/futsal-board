import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Shape Hit Area Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#board-area', { state: 'attached' });
        await page.waitForTimeout(300);

        // Enable select tool
        await page.evaluate(() => {
            AppState.currentTool = 'select';
        });
    });

    test('flat ellipse (wide) - should NOT be selectable far above/below the actual shape', async ({ page }) => {
        // Create a flat ellipse: 400 wide x 100 tall
        await page.evaluate(() => {
            const flatEllipse = {
                id: 'test-flat-ellipse-wide',
                type: 'ellipse',
                x: 1000,
                y: 1000,
                width: 400,
                height: 100,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(flatEllipse);
            AppState.saveToLocalStorage();
            Shapes.render();
        });

        await page.waitForTimeout(300);

        const ellipseSvg = page.locator('svg[data-shape="test-flat-ellipse-wide"]');
        await expect(ellipseSvg).toBeVisible();

        // Get the bounding box
        const box = await ellipseSvg.boundingBox();

        // Click in the CENTER - should select
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(50);

        let selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId).toBe('test-flat-ellipse-wide');

        // Deselect
        await page.evaluate(() => { AppState.selectedShape = null; });

        // Click far ABOVE the shape (80% of height above center)
        // For a 100px tall ellipse, this should be ~40px above center, which is outside the ~50px radius
        await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.1);
        await page.waitForTimeout(50);

        selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId, 'Should NOT select when clicking far above flat ellipse').toBeNull();

        // Click far BELOW the shape
        await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.9);
        await page.waitForTimeout(50);

        selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId, 'Should NOT select when clicking far below flat ellipse').toBeNull();
    });

    test('flat ellipse (tall) - should NOT be selectable far left/right of the actual shape', async ({ page }) => {
        // Create a tall ellipse: 100 wide x 400 tall
        await page.evaluate(() => {
            const flatEllipse = {
                id: 'test-flat-ellipse-tall',
                type: 'ellipse',
                x: 1000,
                y: 1000,
                width: 100,
                height: 400,
                rotation: 0,
                color: '#e74c3c',
                fillColor: 'rgba(231, 76, 60, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(flatEllipse);
            AppState.saveToLocalStorage();
            Shapes.render();
        });

        await page.waitForTimeout(200);

        const ellipseSvg = page.locator('svg[data-shape="test-flat-ellipse-tall"]');
        await expect(ellipseSvg).toBeVisible();

        const box = await ellipseSvg.boundingBox();

        // Click in the CENTER - should select
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(50);

        let selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId).toBe('test-flat-ellipse-tall');

        // Deselect
        await page.evaluate(() => { AppState.selectedShape = null; });

        // Click far LEFT of the shape
        await page.mouse.click(box.x + box.width * 0.1, box.y + box.height / 2);
        await page.waitForTimeout(50);

        selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId, 'Should NOT select when clicking far left of tall ellipse').toBeNull();

        // Click far RIGHT of the shape
        await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2);
        await page.waitForTimeout(50);

        selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId, 'Should NOT select when clicking far right of tall ellipse').toBeNull();
    });

    test('flat rectangle (wide) - should NOT be selectable far above/below the actual shape', async ({ page }) => {
        // Create a flat rectangle: 400 wide x 80 tall
        await page.evaluate(() => {
            const flatRect = {
                id: 'test-flat-rect-wide',
                type: 'rectangle',
                x: 1200,
                y: 1000,
                width: 400,
                height: 80,
                rotation: 0,
                color: '#2ecc71',
                fillColor: 'rgba(46, 204, 113, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(flatRect);
            AppState.saveToLocalStorage();
            Shapes.render();
        });

        await page.waitForTimeout(300);

        const rectSvg = page.locator('svg[data-shape="test-flat-rect-wide"]');
        await expect(rectSvg).toBeVisible();

        const box = await rectSvg.boundingBox();

        // Click in the CENTER - should select
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(50);

        let selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId).toBe('test-flat-rect-wide');

        // Deselect
        await page.evaluate(() => { AppState.selectedShape = null; });

        // Click far ABOVE the shape (2px from edge, should be outside the stroke)
        await page.mouse.click(box.x + box.width / 2, box.y + 2);
        await page.waitForTimeout(50);

        selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId, 'Should NOT select when clicking far above flat rectangle').toBeNull();

        // Click far BELOW the shape
        await page.mouse.click(box.x + box.width / 2, box.y + box.height - 2);
        await page.waitForTimeout(50);

        selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId, 'Should NOT select when clicking far below flat rectangle').toBeNull();
    });

    test('flat rectangle (tall) - should NOT be selectable far left/right of the actual shape', async ({ page }) => {
        // Create a tall rectangle: 80 wide x 400 tall
        await page.evaluate(() => {
            const flatRect = {
                id: 'test-flat-rect-tall',
                type: 'rectangle',
                x: 1200,
                y: 1200,
                width: 80,
                height: 400,
                rotation: 0,
                color: '#9b59b6',
                fillColor: 'rgba(155, 89, 182, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(flatRect);
            AppState.saveToLocalStorage();
            Shapes.render();
        });

        await page.waitForTimeout(300);

        const rectSvg = page.locator('svg[data-shape="test-flat-rect-tall"]');
        await expect(rectSvg).toBeVisible();

        const box = await rectSvg.boundingBox();

        // Click in the CENTER - should select
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(50);

        let selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId).toBe('test-flat-rect-tall');

        // Deselect
        await page.evaluate(() => { AppState.selectedShape = null; });

        // Click far LEFT of the shape (2px from edge, should be outside the stroke)
        await page.mouse.click(box.x + 2, box.y + box.height / 2);
        await page.waitForTimeout(50);

        selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId, 'Should NOT select when clicking far left of tall rectangle').toBeNull();

        // Click far RIGHT of the shape
        await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
        await page.waitForTimeout(50);

        selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId, 'Should NOT select when clicking far right of tall rectangle').toBeNull();
    });

    test('circle - should be selectable within radius and NOT outside', async ({ page }) => {
        // Create a circle: 200 x 200
        await page.evaluate(() => {
            const circle = {
                id: 'test-circle',
                type: 'circle',
                x: 800,
                y: 1000,
                width: 200,
                height: 200,
                rotation: 0,
                color: '#f39c12',
                fillColor: 'rgba(243, 156, 18, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(circle);
            AppState.saveToLocalStorage();
            Shapes.render();
        });

        await page.waitForTimeout(300);

        const circleSvg = page.locator('svg[data-shape="test-circle"]');
        await expect(circleSvg).toBeVisible();

        const box = await circleSvg.boundingBox();

        // Click in the CENTER - should select
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(50);

        let selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId).toBe('test-circle');

        // Deselect
        await page.evaluate(() => { AppState.selectedShape = null; });

        // Click well outside the bounding box (accounting for 30px tolerance in touch mode)
        // Circle is 200x200 at (800, 1000), so click at (-35, -35) from top-left corner
        await page.mouse.click(box.x - 35, box.y - 35);
        await page.waitForTimeout(50);

        selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId, 'Should NOT select when clicking outside circle radius + tolerance').toBeNull();
    });

    test('shapes can be moved after selection', async ({ page }) => {
        // Create shapes
        await page.evaluate(() => {
            AppState.shapes.push({
                id: 'test-move-ellipse',
                type: 'ellipse',
                x: 1000,
                y: 1000,
                width: 300,
                height: 100,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            });
            AppState.shapes.push({
                id: 'test-move-rect',
                type: 'rectangle',
                x: 1500,
                y: 1000,
                width: 100,
                height: 300,
                rotation: 0,
                color: '#e74c3c',
                fillColor: 'rgba(231, 76, 60, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            });
            AppState.saveToLocalStorage();
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Test moving the ellipse
        const ellipseSvg = page.locator('svg[data-shape="test-move-ellipse"]');
        const initialBox = await ellipseSvg.boundingBox();

        // Select the ellipse
        await page.mouse.click(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2);
        await page.waitForTimeout(50);

        // Drag it
        await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(initialBox.x + initialBox.width / 2 + 50, initialBox.y + initialBox.height / 2 + 50, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Check it moved
        const newBox = await ellipseSvg.boundingBox();
        const movedX = newBox.x - initialBox.x;
        const movedY = newBox.y - initialBox.y;

        expect(Math.abs(movedX - 50)).toBeLessThan(10);
        expect(Math.abs(movedY - 50)).toBeLessThan(10);

    });

    test('rotated flat shapes maintain correct hit area', async ({ page }) => {
        // Create a flat ellipse and rotate it 45 degrees
        await page.evaluate(() => {
            const rotatedEllipse = {
                id: 'test-rotated-ellipse',
                type: 'ellipse',
                x: 1000,
                y: 1000,
                width: 400,
                height: 100,
                rotation: 45,
                color: '#1abc9c',
                fillColor: 'rgba(26, 188, 156, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(rotatedEllipse);
            AppState.saveToLocalStorage();
            Shapes.render();
        });

        await page.waitForTimeout(300);

        const ellipseSvg = page.locator('svg[data-shape="test-rotated-ellipse"]');
        await expect(ellipseSvg).toBeVisible();

        const box = await ellipseSvg.boundingBox();

        // Click in the CENTER - should select (rotation doesn't affect center point)
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(50);

        const selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId).toBe('test-rotated-ellipse');

    });

    test('TOUCH MODE: shapes should be selectable via touch overlays', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create a small shape
        await page.evaluate(() => {
            AppState.shapes.push({
                id: 'test-touch-shape',
                type: 'circle',
                x: 1000,
                y: 1000,
                width: 50,
                height: 50,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            });
            AppState.saveToLocalStorage();
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Check that touch overlay was created
        const touchOverlay = page.locator('.touch-overlay[data-shape="test-touch-shape"]');
        await expect(touchOverlay).toBeVisible();

        // Click on the center of the touch overlay to select the shape
        const overlayBox = await touchOverlay.boundingBox();
        await page.mouse.click(overlayBox.x + overlayBox.width / 2, overlayBox.y + overlayBox.height / 2);
        await page.waitForTimeout(50);

        const selectedId = await page.evaluate(() => AppState.selectedShape);
        expect(selectedId, 'Should select shape via touch overlay').toBe('test-touch-shape');
    });
});
