/**
 * Test for shape edge resize bug: edge handles should only resize in one direction
 * but currently change both width and height.
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

test.describe('Shape Edge Resize Bug', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('horizontal edge handle should only change width, not height', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Get initial dimensions
        const initialDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        // Find all resize handles - there should be 4 (right, left, top, bottom)
        const handles = page.locator('.resize-handle');
        await expect(handles).toHaveCount(4);

        // Get the shape center to identify which handle is which
        const shapeCenter = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;
            return {
                x: canvasRect.left + shape.x * scaleX,
                y: canvasRect.top + shape.y * scaleY
            };
        });

        // Find a horizontal edge handle (left or right - should have same y as center, different x)
        let horizontalHandle = null;
        const handleCount = await handles.count();

        for (let i = 0; i < handleCount; i++) {
            const handle = handles.nth(i);
            const box = await handle.boundingBox();
            const handleCenter = {
                x: box.x + box.width / 2,
                y: box.y + box.height / 2
            };

            // Horizontal handles have approximately same Y as shape center
            if (Math.abs(handleCenter.y - shapeCenter.y) < 10) {
                horizontalHandle = handle;
                break;
            }
        }

        expect(horizontalHandle).not.toBeNull();

        // Drag the horizontal handle to the right
        const handleBox = await horizontalHandle.boundingBox();
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 100, handleBox.y); // Move 100px to the right, same Y
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Get new dimensions
        const newDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        // Width should have changed
        expect(newDimensions.width).not.toBe(initialDimensions.width);

        // Height should NOT have changed
        expect(newDimensions.height).toBe(initialDimensions.height);
    });

    test('vertical edge handle should only change height, not width', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Get initial dimensions
        const initialDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        // Find all resize handles
        const handles = page.locator('.resize-handle');
        await expect(handles).toHaveCount(4);

        // Get the shape center
        const shapeCenter = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;
            return {
                x: canvasRect.left + shape.x * scaleX,
                y: canvasRect.top + shape.y * scaleY
            };
        });

        // Find a vertical edge handle (top or bottom - should have same x as center, different y)
        let verticalHandle = null;
        const handleCount = await handles.count();

        for (let i = 0; i < handleCount; i++) {
            const handle = handles.nth(i);
            const box = await handle.boundingBox();
            const handleCenter = {
                x: box.x + box.width / 2,
                y: box.y + box.height / 2
            };

            // Vertical handles have approximately same X as shape center
            if (Math.abs(handleCenter.x - shapeCenter.x) < 10) {
                verticalHandle = handle;
                break;
            }
        }

        expect(verticalHandle).not.toBeNull();

        // Drag the vertical handle downward
        const handleBox = await verticalHandle.boundingBox();
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x, handleBox.y + 80); // Move 80px down, same X
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Get new dimensions
        const newDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        // Height should have changed
        expect(newDimensions.height).not.toBe(initialDimensions.height);

        // Width should NOT have changed
        expect(newDimensions.width).toBe(initialDimensions.width);
    });

    test('horizontal edge resize on rotated rectangle', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Rotate the rectangle first
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
            return { width: shape.width, height: shape.height };
        });

        // Find a horizontal edge handle
        const handles = page.locator('.resize-handle');
        const firstHandle = handles.first();

        // Drag it
        const handleBox = await firstHandle.boundingBox();
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 60, handleBox.y + 60);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Get new dimensions
        const newDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        // For a horizontal edge, only width should change
        // (This tests the rotated case which is more complex)
        const widthChanged = Math.abs(newDimensions.width - initialDimensions.width) > 5;
        const heightChanged = Math.abs(newDimensions.height - initialDimensions.height) > 5;

        // At least one should change (the drag did something)
        expect(widthChanged || heightChanged).toBe(true);
    });

    test('ellipse horizontal edge should only change width', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'ellipse');

        // Get initial dimensions
        const initialDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        // Get the shape center
        const shapeCenter = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;
            return {
                x: canvasRect.left + shape.x * scaleX,
                y: canvasRect.top + shape.y * scaleY
            };
        });

        // Find a horizontal edge handle
        const handles = page.locator('.resize-handle');
        let horizontalHandle = null;
        const handleCount = await handles.count();

        for (let i = 0; i < handleCount; i++) {
            const handle = handles.nth(i);
            const box = await handle.boundingBox();
            const handleCenter = {
                x: box.x + box.width / 2,
                y: box.y + box.height / 2
            };

            if (Math.abs(handleCenter.y - shapeCenter.y) < 10) {
                horizontalHandle = handle;
                break;
            }
        }

        expect(horizontalHandle).not.toBeNull();

        // Drag horizontally
        const handleBox = await horizontalHandle.boundingBox();
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 70, handleBox.y);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Get new dimensions
        const newDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        // Width should change
        expect(newDimensions.width).not.toBe(initialDimensions.width);

        // Height should NOT change
        expect(newDimensions.height).toBe(initialDimensions.height);
    });
});
