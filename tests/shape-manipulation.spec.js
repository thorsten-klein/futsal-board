/**
 * Shape manipulation tests — verify resizing, rotating, and context menu
 * operations on shapes.
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

test.describe('Shape Resizing', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('resize rectangle using corner handle', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Get initial dimensions
        const initialWidth = await page.evaluate(() => AppState.selectedShape ?
            AppState.shapes.find(s => s.id === AppState.selectedShape).width : 0
        );

        // Find a resize handle (corner)
        const handle = page.locator('.resize-handle').first();
        await expect(handle).toHaveCount(1);

        // Get handle position
        const handleBox = await handle.boundingBox();

        // Drag handle outward
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 50, handleBox.y + 50);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Verify size changed
        const newWidth = await page.evaluate(() => AppState.selectedShape ?
            AppState.shapes.find(s => s.id === AppState.selectedShape).width : 0
        );

        expect(newWidth).not.toBe(initialWidth);
    });

    test('resize ellipse using handle', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'ellipse');

        // Get initial dimensions
        const initialDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        // Find a resize handle
        const handle = page.locator('.resize-handle').first();
        const handleBox = await handle.boundingBox();

        // Drag handle
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 40, handleBox.y + 40);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Verify size changed (either width or height should change)
        const newDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        const dimensionsChanged = newDimensions.width !== initialDimensions.width ||
                                 newDimensions.height !== initialDimensions.height;
        expect(dimensionsChanged).toBe(true);
    });

    test('rectangle has 4 resize handles when selected', async ({ page }) => {
        await addAndSelectShape(page, 'rectangle');

        // Count resize handles (4 edges - no diagonal corners)
        const handleCount = await page.locator('.resize-handle').count();
        expect(handleCount).toBe(4);
    });
});

test.describe('Shape Rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('rotate shape using rotation handle', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Get initial rotation
        const initialRotation = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return shape.rotation || 0;
        });

        // Find rotation handle
        const rotationHandle = page.locator('.rotation-handle');
        await expect(rotationHandle).toHaveCount(1);

        const handleBox = await rotationHandle.boundingBox();

        // Drag rotation handle in a circular motion
        await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(handleBox.x + 100, handleBox.y);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Verify rotation changed
        const newRotation = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return shape.rotation || 0;
        });

        expect(newRotation).not.toBe(initialRotation);
    });

    test('rotation handle appears when shape is selected', async ({ page }) => {
        // Before selecting, no rotation handle
        await expect(page.locator('.rotation-handle')).toHaveCount(0);

        // Add and select shape
        await addAndSelectShape(page, 'rectangle');

        // Rotation handle should appear
        await expect(page.locator('.rotation-handle')).toHaveCount(1);
    });

    test('rotation handle disappears when shape is deselected', async ({ page }) => {
        await addAndSelectShape(page, 'rectangle');

        // Rotation handle should be visible
        await expect(page.locator('.rotation-handle')).toHaveCount(1);

        // Click elsewhere to deselect
        await page.locator('.board-container').click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(100);

        // Rotation handle should be gone
        await expect(page.locator('.rotation-handle')).toHaveCount(0);
    });
});

test.describe('Shape Context Menu', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('right-click on shape opens context menu', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Right-click on shape
        await page.locator(`[data-shape="${shapeId}"]`).click({ button: 'right' });
        await page.waitForTimeout(200);

        // Context menu should be visible
        const contextMenu = page.locator('.context-menu').filter({ hasText: 'Set Color' });
        await expect(contextMenu).toBeVisible();
    });

    test('shape context menu has color, size, and position options', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Right-click on shape
        await page.locator(`[data-shape="${shapeId}"]`).click({ button: 'right' });
        await page.waitForTimeout(200);

        // Verify menu items exist
        const menu = page.locator('.context-menu').filter({ hasText: 'Set Color' });
        await expect(menu.locator('text=Set Color')).toBeVisible();
        await expect(menu.locator('text=Set Size')).toBeVisible();
        await expect(menu.locator('text=Set Position')).toBeVisible();
    });

    test('change shape color via context menu', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Right-click and open color dialog
        await page.locator(`[data-shape="${shapeId}"]`).click({ button: 'right' });
        await page.waitForTimeout(200);

        await page.locator('.context-menu').filter({ hasText: 'Set Color' }).locator('text=Set Color').click();
        await page.waitForTimeout(200);

        // Color modal should be visible
        const colorModal = page.locator('#color-modal');
        await expect(colorModal).toBeVisible();

        // Select a color
        await page.locator('#color-modal input[type="color"]').fill('#ff0000');
        await page.locator('#btn-color-modal-ok').click();
        await page.waitForTimeout(200);

        // Verify color changed
        const newColor = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return shape.color;
        });

        expect(newColor).toBe('#ff0000');
    });

    test('change shape size via context menu', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Get initial size
        const initialSize = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        // Right-click and open size dialog
        await page.locator(`[data-shape="${shapeId}"]`).click({ button: 'right' });
        await page.waitForTimeout(200);

        await page.locator('.context-menu').filter({ hasText: 'Set Size' }).locator('text=Set Size').click();
        await page.waitForTimeout(200);

        // Size modal should be visible
        const sizeModal = page.locator('#size-modal');
        await expect(sizeModal).toBeVisible();

        // Change size
        await page.locator('#size-modal input[name="width"]').fill('500');
        await page.locator('#size-modal input[name="height"]').fill('300');
        await page.locator('#btn-size-modal-ok').click();
        await page.waitForTimeout(200);

        // Verify size changed
        const newSize = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        expect(newSize.width).toBe(500);
        expect(newSize.height).toBe(300);
    });

    test('change shape position via context menu', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Right-click and open position dialog
        await page.locator(`[data-shape="${shapeId}"]`).click({ button: 'right' });
        await page.waitForTimeout(200);

        await page.locator('.context-menu').filter({ hasText: 'Set Position' }).locator('text=Set Position').click();
        await page.waitForTimeout(200);

        // Position modal should be visible
        const positionModal = page.locator('#position-modal');
        await expect(positionModal).toBeVisible();

        // Change position
        await page.locator('#position-modal input[name="x"]').fill('1000');
        await page.locator('#position-modal input[name="y"]').fill('800');
        await page.locator('#btn-position-modal-ok').click();
        await page.waitForTimeout(200);

        // Verify position changed
        const newPos = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { x: shape.x, y: shape.y };
        });

        expect(newPos.x).toBe(1000);
        expect(newPos.y).toBe(800);
    });

    test('ellipse context menu has text option', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'ellipse');

        // Right-click on ellipse
        await page.locator(`[data-shape="${shapeId}"]`).click({ button: 'right' });
        await page.waitForTimeout(200);

        // Verify "Set Text" option exists
        const menu = page.locator('.context-menu').filter({ hasText: 'Set Text' });
        await expect(menu.locator('text=Set Text')).toBeVisible();
    });

    test('add text to ellipse via context menu', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'ellipse');

        // Right-click and open text dialog
        await page.locator(`[data-shape="${shapeId}"]`).click({ button: 'right' });
        await page.waitForTimeout(200);

        await page.locator('.context-menu').filter({ hasText: 'Set Text' }).locator('text=Set Text').click();
        await page.waitForTimeout(200);

        // Text modal should be visible
        const textModal = page.locator('#text-modal');
        await expect(textModal).toBeVisible();

        // Enter text
        await page.locator('#text-modal input[type="text"]').fill('Test Text');
        await page.locator('#btn-text-modal-ok').click();
        await page.waitForTimeout(200);

        // Verify text was added
        const shapeText = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return shape.text;
        });

        expect(shapeText).toBe('Test Text');
    });

    test('ellipse displays text content', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'ellipse');

        // Set text programmatically
        await page.evaluate(({ shapeId }) => {
            const shape = AppState.shapes.find(s => s.id === shapeId);
            if (shape) {
                shape.text = 'ABC';
                Shapes.render();
            }
        }, { shapeId });
        await page.waitForTimeout(200);

        // Verify text is rendered in the shape
        const shapeEl = page.locator(`[data-shape="${shapeId}"]`);
        const textEl = shapeEl.locator('text');
        await expect(textEl).toHaveText('ABC');
    });
});

test.describe('Shape Deletion', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('delete shape via context menu', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'rectangle');

        // Verify shape exists
        let shapeCount = await page.evaluate(() => AppState.shapes.length);
        expect(shapeCount).toBe(1);

        // Right-click and delete
        await page.locator(`[data-shape="${shapeId}"]`).click({ button: 'right' });
        await page.waitForTimeout(200);

        await page.locator('.context-menu').filter({ hasText: 'Delete' }).locator('text=Delete').click();
        await page.waitForTimeout(200);

        // Shape should be gone
        shapeCount = await page.evaluate(() => AppState.shapes.length);
        expect(shapeCount).toBe(0);
    });

    test('delete selected shape with Delete key', async ({ page }) => {
        const shapeId = await addAndSelectShape(page, 'ellipse');

        // Verify shape exists
        let shapeCount = await page.evaluate(() => AppState.shapes.length);
        expect(shapeCount).toBe(1);

        // Press Delete key
        await page.keyboard.press('Delete');
        await page.waitForTimeout(200);

        // Shape should be gone
        shapeCount = await page.evaluate(() => AppState.shapes.length);
        expect(shapeCount).toBe(0);
    });
});
