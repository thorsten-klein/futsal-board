/**
 * Test that shape resize handles are positioned correctly
 * This verifies the bug fix for heightHalf using scaleX instead of scaleY
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Add a shape and select it */
async function addAndSelectShape(page, shapeType = 'rectangle') {
    // Add shape
    await page.locator(`.draw-btn[data-draw="${shapeType}"]`).click();
    await page.waitForTimeout(200);

    // Get shape ID
    const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);

    // Select the shape
    await page.locator(`[data-shape="${shapeId}"]`).click();
    await page.waitForTimeout(100);

    return shapeId;
}

test.describe('Shape Handle Positions', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('resize handles are positioned at shape edges', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Get shape data and handle positions
        const data = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;

            const centerX = canvasRect.left + shape.x * scaleX;
            const centerY = canvasRect.top + shape.y * scaleY;
            const halfWidth = (shape.width / 2) * scaleX;
            const halfHeight = (shape.height / 2) * scaleY;

            return {
                center: { x: centerX, y: centerY },
                halfWidth,
                halfHeight,
                expectedEdges: {
                    right: { x: centerX + halfWidth, y: centerY },
                    left: { x: centerX - halfWidth, y: centerY },
                    top: { x: centerX, y: centerY - halfHeight },
                    bottom: { x: centerX, y: centerY + halfHeight }
                }
            };
        });

        // Get actual handle positions
        const handles = page.locator('.resize-handle');
        await expect(handles).toHaveCount(4);

        const handlePositions = [];
        for (let i = 0; i < 4; i++) {
            const box = await handles.nth(i).boundingBox();
            handlePositions.push({
                x: box.x + box.width / 2,
                y: box.y + box.height / 2
            });
        }

        // Check that each expected edge has a handle nearby (within 5px tolerance)
        const tolerance = 5;

        const edges = ['right', 'left', 'top', 'bottom'];
        for (const edge of edges) {
            const expected = data.expectedEdges[edge];
            const found = handlePositions.some(pos =>
                Math.abs(pos.x - expected.x) < tolerance &&
                Math.abs(pos.y - expected.y) < tolerance
            );
            expect(found).toBe(true);
        }
    });

    test('vertical handles are at correct Y position', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Get expected positions for vertical handles (top and bottom)
        const expectedY = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;

            const centerY = canvasRect.top + shape.y * scaleY;
            const halfHeight = (shape.height / 2) * scaleY;

            return {
                top: centerY - halfHeight,
                bottom: centerY + halfHeight,
                center: centerY
            };
        });

        // Find vertical handles (handles with X near center)
        const shapeCenter = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            return canvasRect.left + shape.x * scaleX;
        });

        const handles = page.locator('.resize-handle');
        const handleCount = await handles.count();

        let topHandleY = null;
        let bottomHandleY = null;

        for (let i = 0; i < handleCount; i++) {
            const box = await handles.nth(i).boundingBox();
            const handleX = box.x + box.width / 2;
            const handleY = box.y + box.height / 2;

            // If X is near center, this is a vertical handle
            if (Math.abs(handleX - shapeCenter) < 10) {
                if (handleY < expectedY.center) {
                    topHandleY = handleY;
                } else {
                    bottomHandleY = handleY;
                }
            }
        }

        // Verify both vertical handles were found and are at correct positions
        expect(topHandleY).not.toBeNull();
        expect(bottomHandleY).not.toBeNull();
        expect(Math.abs(topHandleY - expectedY.top)).toBeLessThan(5);
        expect(Math.abs(bottomHandleY - expectedY.bottom)).toBeLessThan(5);
    });

    test('horizontal handles are at correct X position', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Get expected positions for horizontal handles (left and right)
        const expectedX = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;

            const centerX = canvasRect.left + shape.x * scaleX;
            const halfWidth = (shape.width / 2) * scaleX;

            return {
                left: centerX - halfWidth,
                right: centerX + halfWidth,
                center: centerX
            };
        });

        // Find horizontal handles (handles with Y near center)
        const shapeCenter = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleY = canvasRect.height / AppState.boardHeight;
            return canvasRect.top + shape.y * scaleY;
        });

        const handles = page.locator('.resize-handle');
        const handleCount = await handles.count();

        let leftHandleX = null;
        let rightHandleX = null;

        for (let i = 0; i < handleCount; i++) {
            const box = await handles.nth(i).boundingBox();
            const handleX = box.x + box.width / 2;
            const handleY = box.y + box.height / 2;

            // If Y is near center, this is a horizontal handle
            if (Math.abs(handleY - shapeCenter) < 10) {
                if (handleX < expectedX.center) {
                    leftHandleX = handleX;
                } else {
                    rightHandleX = handleX;
                }
            }
        }

        // Verify both horizontal handles were found and are at correct positions
        expect(leftHandleX).not.toBeNull();
        expect(rightHandleX).not.toBeNull();
        expect(Math.abs(leftHandleX - expectedX.left)).toBeLessThan(5);
        expect(Math.abs(rightHandleX - expectedX.right)).toBeLessThan(5);
    });

    test('ellipse handles are positioned correctly', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'ellipse');

        // Get expected and actual handle positions
        const data = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;

            const centerX = canvasRect.left + shape.x * scaleX;
            const centerY = canvasRect.top + shape.y * scaleY;
            const halfWidth = (shape.width / 2) * scaleX;
            const halfHeight = (shape.height / 2) * scaleY;

            return {
                center: { x: centerX, y: centerY },
                halfWidth,
                halfHeight,
                expectedEdges: {
                    right: { x: centerX + halfWidth, y: centerY },
                    left: { x: centerX - halfWidth, y: centerY },
                    top: { x: centerX, y: centerY - halfHeight },
                    bottom: { x: centerX, y: centerY + halfHeight }
                }
            };
        });

        // Get actual handle positions
        const handles = page.locator('.resize-handle');
        await expect(handles).toHaveCount(4);

        const handlePositions = [];
        for (let i = 0; i < 4; i++) {
            const box = await handles.nth(i).boundingBox();
            handlePositions.push({
                x: box.x + box.width / 2,
                y: box.y + box.height / 2
            });
        }

        // Verify all edge handles are positioned correctly
        const tolerance = 5;
        const edges = ['right', 'left', 'top', 'bottom'];

        for (const edge of edges) {
            const expected = data.expectedEdges[edge];
            const found = handlePositions.some(pos =>
                Math.abs(pos.x - expected.x) < tolerance &&
                Math.abs(pos.y - expected.y) < tolerance
            );
            expect(found).toBe(true);
        }
    });
});
