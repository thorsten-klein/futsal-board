import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Shape and Text Rotation Bug', () => {
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

    test('Rectangle rotation should work correctly', async ({ page }) => {
        // Create a rectangle
        await page.evaluate(() => {
            const shape = {
                id: 'rect-1',
                type: 'rectangle',
                x: 1000,
                y: 1000,
                width: 300,
                height: 200,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get rotation handle
        const rotationHandle = page.locator('.rotation-handle').first();
        await expect(rotationHandle).toBeVisible();

        const handleBox = await rotationHandle.boundingBox();
        const handleCenterX = handleBox.x + handleBox.width / 2;
        const handleCenterY = handleBox.y + handleBox.height / 2;


        // Get initial shape rotation
        const initialRotation = await page.evaluate(() => {
            const shape = AppState.getShape('rect-1');
            return shape.rotation || 0;
        });

        expect(initialRotation).toBe(0);

        // Drag the rotation handle to the right (should rotate clockwise)
        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.mouse.move(handleCenterX + 100, handleCenterY, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Check rotation after drag
        const afterRotation = await page.evaluate(() => {
            const shape = AppState.getShape('rect-1');
            return shape.rotation || 0;
        });


        // Moving right from top should rotate clockwise (increase rotation)
        // With proper touch overlay rotation, we get better rotation response
        expect(afterRotation).toBeGreaterThan(45);
        expect(afterRotation).toBeLessThan(65);
    });

    test('Text rotation should work correctly', async ({ page }) => {
        // Create a text shape
        await page.evaluate(() => {
            const shape = {
                id: 'text-1',
                type: 'text',
                x: 1000,
                y: 1000,
                width: 400,
                height: 100,
                rotation: 0,
                text: 'Test Text',
                fontSize: 48,
                color: 'black',
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get rotation handle
        const rotationHandle = page.locator('.rotation-handle').first();
        await expect(rotationHandle).toBeVisible();

        const handleBox = await rotationHandle.boundingBox();
        const handleCenterX = handleBox.x + handleBox.width / 2;
        const handleCenterY = handleBox.y + handleBox.height / 2;


        // Get initial rotation
        const initialRotation = await page.evaluate(() => {
            const shape = AppState.getShape('text-1');
            return shape.rotation || 0;
        });

        expect(initialRotation).toBe(0);

        // Drag the rotation handle to the right
        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.mouse.move(handleCenterX + 100, handleCenterY, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Check rotation after drag
        const afterRotation = await page.evaluate(() => {
            const shape = AppState.getShape('text-1');
            return shape.rotation || 0;
        });


        // Moving right from top should rotate clockwise
        // With proper touch overlay rotation, text rotates correctly
        expect(afterRotation).toBeGreaterThan(50);
        expect(afterRotation).toBeLessThan(65);
    });

    test('Shape position should not jump during rotation', async ({ page }) => {
        // Create a rectangle
        await page.evaluate(() => {
            const shape = {
                id: 'rect-2',
                type: 'rectangle',
                x: 1000,
                y: 1000,
                width: 300,
                height: 200,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get initial SVG position
        const svg = page.locator('svg[data-shape="rect-2"]').first();
        const initialBox = await svg.boundingBox();
        const initialCenterX = initialBox.x + initialBox.width / 2;
        const initialCenterY = initialBox.y + initialBox.height / 2;


        // Get rotation handle and drag it
        const rotationHandle = page.locator('.rotation-handle').first();
        const handleBox = await rotationHandle.boundingBox();
        const handleCenterX = handleBox.x + handleBox.width / 2;
        const handleCenterY = handleBox.y + handleBox.height / 2;

        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.mouse.move(handleCenterX + 100, handleCenterY, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Get final SVG position
        const finalBox = await svg.boundingBox();
        const finalCenterX = finalBox.x + finalBox.width / 2;
        const finalCenterY = finalBox.y + finalBox.height / 2;


        // Shape center should not move significantly during rotation
        const centerShiftX = Math.abs(finalCenterX - initialCenterX);
        const centerShiftY = Math.abs(finalCenterY - initialCenterY);


        // Allow small tolerance for rounding
        expect(centerShiftX).toBeLessThan(5);
        expect(centerShiftY).toBeLessThan(5);
    });

    test('Ellipse rotation should work correctly', async ({ page }) => {
        // Create an ellipse
        await page.evaluate(() => {
            const shape = {
                id: 'ellipse-1',
                type: 'ellipse',
                x: 1000,
                y: 1000,
                width: 300,
                height: 200,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get rotation handle
        const rotationHandle = page.locator('.rotation-handle').first();
        await expect(rotationHandle).toBeVisible();

        const handleBox = await rotationHandle.boundingBox();
        const handleCenterX = handleBox.x + handleBox.width / 2;
        const handleCenterY = handleBox.y + handleBox.height / 2;

        // Get initial rotation
        const initialRotation = await page.evaluate(() => {
            const shape = AppState.getShape('ellipse-1');
            return shape.rotation || 0;
        });

        expect(initialRotation).toBe(0);

        // Drag the rotation handle
        await page.mouse.move(handleCenterX, handleCenterY);
        await page.mouse.down();
        await page.mouse.move(handleCenterX + 100, handleCenterY, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Check rotation after drag
        const afterRotation = await page.evaluate(() => {
            const shape = AppState.getShape('ellipse-1');
            return shape.rotation || 0;
        });


        // Should rotate clockwise
        // With proper touch overlay rotation
        expect(afterRotation).toBeGreaterThan(45);
        expect(afterRotation).toBeLessThan(65);
    });
});
