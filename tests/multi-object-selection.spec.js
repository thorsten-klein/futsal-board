import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Multi-Object Selection Bug', () => {
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

    test('clicking between two shapes should only select ONE shape (TOUCH MODE)', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create two shapes close together
        await page.evaluate(() => {
            const shape1 = {
                id: 'shape-nearby-1',
                type: 'circle',
                x: 1000,
                y: 1000,
                width: 100,
                height: 100,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };
            const shape2 = {
                id: 'shape-nearby-2',
                type: 'circle',
                x: 1150, // 150cm away from shape1
                y: 1000,
                width: 100,
                height: 100,
                rotation: 0,
                color: '#e74c3c',
                fillColor: 'rgba(231, 76, 60, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape1, shape2);
            AppState.saveToLocalStorage();
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get the bounding boxes of both shapes
        const shape1Svg = page.locator('svg[data-shape="shape-nearby-1"]');
        const shape2Svg = page.locator('svg[data-shape="shape-nearby-2"]');

        await expect(shape1Svg).toBeVisible();
        await expect(shape2Svg).toBeVisible();

        const box1 = await shape1Svg.boundingBox();
        const box2 = await shape2Svg.boundingBox();

        // Click exactly in the middle between the two shapes
        const middleX = (box1.x + box1.width / 2 + box2.x + box2.width / 2) / 2;
        const middleY = (box1.y + box1.height / 2 + box2.y + box2.height / 2) / 2;


        await page.mouse.click(middleX, middleY);
        await page.waitForTimeout(50);

        const selectedShapeId = await page.evaluate(() => AppState.selectedShape);

        // Exactly ONE shape should be selected (either shape-nearby-1 or shape-nearby-2)
        expect(selectedShapeId).not.toBeNull();
        expect(['shape-nearby-1', 'shape-nearby-2']).toContain(selectedShapeId);


        // Now drag and verify ONLY the selected shape moves
        const selectedShape = selectedShapeId === 'shape-nearby-1' ? shape1Svg : shape2Svg;
        const otherShape = selectedShapeId === 'shape-nearby-1' ? shape2Svg : shape1Svg;

        const selectedInitialBox = await selectedShape.boundingBox();
        const otherInitialBox = await otherShape.boundingBox();

        // Drag from middle position
        await page.mouse.move(middleX, middleY);
        await page.mouse.down();
        await page.mouse.move(middleX + 50, middleY + 50, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Check the selected shape moved
        const selectedFinalBox = await selectedShape.boundingBox();
        const selectedMovedX = selectedFinalBox.x - selectedInitialBox.x;
        const selectedMovedY = selectedFinalBox.y - selectedInitialBox.y;

        // Check the other shape did NOT move
        const otherFinalBox = await otherShape.boundingBox();
        const otherMovedX = otherFinalBox.x - otherInitialBox.x;
        const otherMovedY = otherFinalBox.y - otherInitialBox.y;


        // Selected shape should have moved approximately 50px
        expect(Math.abs(selectedMovedX - 50)).toBeLessThan(10);
        expect(Math.abs(selectedMovedY - 50)).toBeLessThan(10);

        // Other shape should NOT have moved
        expect(Math.abs(otherMovedX)).toBeLessThan(2);
        expect(Math.abs(otherMovedY)).toBeLessThan(2);
    });
});
