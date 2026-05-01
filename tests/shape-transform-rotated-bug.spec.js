/**
 * Test that edge handles on rotated shapes only change one dimension
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Rotated Shape Transform Bug', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('45-degree rotated rectangle: right handle should only change width', async ({ page }) => {
        // Add rectangle
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        // Get shape ID
        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);

        // Select and rotate
        await page.locator(`[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(100);

        // Rotate 45 degrees
        await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            shape.rotation = 45;
            Shapes.render();
            Shapes.updateHandles();
        });
        await page.waitForTimeout(200);

        // Get initial dimensions
        const initialDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height, rotation: shape.rotation };
        });


        // Get handle positions after rotation
        const handles = page.locator('.resize-handle');
        const handleCount = await handles.count();


        // Get all handle positions
        const handlePositions = [];
        for (let i = 0; i < handleCount; i++) {
            const box = await handles.nth(i).boundingBox();
            handlePositions.push({
                index: i,
                x: box.x + box.width / 2,
                y: box.y + box.height / 2
            });
        }


        // Pick the first handle and drag it
        const firstHandle = handles.first();
        const handleBox = await firstHandle.boundingBox();
        const startX = handleBox.x + handleBox.width / 2;
        const startY = handleBox.y + handleBox.height / 2;


        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 70, startY + 70); // Drag diagonally
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Get new dimensions
        const newDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height, rotation: shape.rotation };
        });


        // For a horizontal edge handle, only width should change
        // For a vertical edge handle, only height should change
        // One should change, the other should NOT
        const widthChanged = Math.abs(newDimensions.width - initialDimensions.width) > 5;
        const heightChanged = Math.abs(newDimensions.height - initialDimensions.height) > 5;

        // Either width changed OR height changed, but NOT both
        if (widthChanged) {
            expect(newDimensions.height).toBe(initialDimensions.height);
        } else if (heightChanged) {
            expect(newDimensions.width).toBe(initialDimensions.width);
        } else {
        }
    });

    test('30-degree rotated rectangle: horizontal handle behavior', async ({ page }) => {
        // Add rectangle
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        // Get shape ID
        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);

        // Select and rotate
        await page.locator(`[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(100);

        // Rotate 30 degrees
        await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            shape.rotation = 30;
            Shapes.render();
            Shapes.updateHandles();
        });
        await page.waitForTimeout(200);

        // Get initial dimensions
        const initialDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return {
                width: shape.width,
                height: shape.height,
                x: shape.x,
                y: shape.y,
                rotation: shape.rotation
            };
        });


        // Find which handle is the "right" handle (horizontal edge)
        // It should be on the positive width direction from center
        const shapeData = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;

            const centerX = canvasRect.left + shape.x * scaleX;
            const centerY = canvasRect.top + shape.y * scaleY;

            const rotation = (shape.rotation || 0) * Math.PI / 180;
            const widthHalf = (shape.width / 2) * scaleX;

            // Right handle position (before any drag)
            const rightHandleX = centerX + Math.cos(rotation) * widthHalf;
            const rightHandleY = centerY + Math.sin(rotation) * widthHalf;

            return {
                centerX,
                centerY,
                expectedRightHandle: { x: rightHandleX, y: rightHandleY }
            };
        });


        // Find the handle closest to expected right handle position
        const handles = page.locator('.resize-handle');
        const handleCount = await handles.count();

        let closestHandle = null;
        let minDistance = Infinity;

        for (let i = 0; i < handleCount; i++) {
            const box = await handles.nth(i).boundingBox();
            const handleX = box.x + box.width / 2;
            const handleY = box.y + box.height / 2;

            const distance = Math.sqrt(
                Math.pow(handleX - shapeData.expectedRightHandle.x, 2) +
                Math.pow(handleY - shapeData.expectedRightHandle.y, 2)
            );


            if (distance < minDistance) {
                minDistance = distance;
                closestHandle = handles.nth(i);
            }
        }

        expect(closestHandle).not.toBeNull();

        // Drag the right handle
        const handleBox = await closestHandle.boundingBox();
        const startX = handleBox.x + handleBox.width / 2;
        const startY = handleBox.y + handleBox.height / 2;

        // Calculate drag direction along the rotation angle (to make it grow)
        const rotation = 30 * Math.PI / 180;
        const dragDistance = 100;
        const endX = startX + Math.cos(rotation) * dragDistance;
        const endY = startY + Math.sin(rotation) * dragDistance;


        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Get new dimensions
        const newDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return {
                width: shape.width,
                height: shape.height,
                x: shape.x,
                y: shape.y
            };
        });


        // Width should have increased (we're dragging the horizontal edge outward)
        expect(newDimensions.width).toBeGreaterThan(initialDimensions.width);

        // Height MUST NOT change
        expect(newDimensions.height).toBe(initialDimensions.height);
    });
});
