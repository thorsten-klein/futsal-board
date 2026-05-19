/**
 * Tests for shape position and scaling during board rotation.
 * Shapes should rotate with the board and scale proportionally.
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

/** Right-click on an empty part of the board to open context menu. */
async function rightClickBoard(page) {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
}

/** Get the board canvas context menu. */
async function getBoardCanvasMenu(page) {
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    return menu;
}

test.describe('Shape rotation and scaling', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('rectangle shape scales proportionally with board', async ({ page }) => {
        // Create rectangle at center
        const shapeId = await page.evaluate(() => {
            const shape = {
                id: 'test-rect',
                type: 'rectangle',
                x: 2250,
                y: 1250,
                width: 200,
                height: 100,
                rotation: 0,
                color: '#000000',
                fillColor: 'rgba(0,0,0,0.1)',
                strokeWidth: 2,
                visible: true
            };
            AppState.shapes.push(shape);
            Shapes.render();
            return shape.id;
        });

        // Measure at 0° rotation
        const at0deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) throw new Error(`Shape SVG not found: ${id}`);
            const rect = svg.getBoundingClientRect();

            return {
                width: rect.width,
                height: rect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, shapeId);

        console.log('Rectangle at 0°: size', at0deg.width, 'x', at0deg.height);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Measure at 90° rotation
        const at90deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) throw new Error(`Shape SVG not found: ${id}`);
            const rect = svg.getBoundingClientRect();

            return {
                width: rect.width,
                height: rect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, shapeId);

        console.log('Rectangle at 90°: size', at90deg.width, 'x', at90deg.height);
        console.log('Board scale factor:', at90deg.boardRotationScaleFactor);

        // Rectangle rotates with board, so dimensions swap and scale
        // Expected: (100 * 0.556) x (200 * 0.556) ≈ 56 x 111 (swapped)
        const expectedWidth = at0deg.height * at90deg.boardRotationScaleFactor;
        const expectedHeight = at0deg.width * at90deg.boardRotationScaleFactor;

        expect(Math.abs(at90deg.width - expectedWidth)).toBeLessThan(expectedWidth * 0.15);
        expect(Math.abs(at90deg.height - expectedHeight)).toBeLessThan(expectedHeight * 0.15);
    });

    test('circle shape scales proportionally with board', async ({ page }) => {
        // Create circle at center
        const shapeId = await page.evaluate(() => {
            const shape = {
                id: 'test-circle',
                type: 'circle',
                x: 2250,
                y: 1250,
                width: 150,
                height: 150,
                rotation: 0,
                color: '#ff0000',
                fillColor: 'rgba(255,0,0,0.1)',
                strokeWidth: 2,
                visible: true
            };
            AppState.shapes.push(shape);
            Shapes.render();
            return shape.id;
        });

        // Measure at 0° rotation
        const at0deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) throw new Error(`Shape SVG not found: ${id}`);
            const rect = svg.getBoundingClientRect();

            return {
                width: rect.width,
                height: rect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, shapeId);

        console.log('Circle at 0°: size', at0deg.width, 'x', at0deg.height);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Measure at 90° rotation
        const at90deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) throw new Error(`Shape SVG not found: ${id}`);
            const rect = svg.getBoundingClientRect();

            return {
                width: rect.width,
                height: rect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, shapeId);

        console.log('Circle at 90°: size', at90deg.width, 'x', at90deg.height);

        // Circle is symmetric, dimensions don't swap, just scale
        const expectedWidth = at0deg.width * at90deg.boardRotationScaleFactor;
        const expectedHeight = at0deg.height * at90deg.boardRotationScaleFactor;

        expect(Math.abs(at90deg.width - expectedWidth)).toBeLessThan(expectedWidth * 0.15);
        expect(Math.abs(at90deg.height - expectedHeight)).toBeLessThan(expectedHeight * 0.15);
    });

    test('shape at center appears at visual center before and after rotation', async ({ page }) => {
        // Create shape at board center (2250, 1250)
        const result = await page.evaluate(() => {
            const shape = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'rectangle',
                x: 2250,  // Board center X
                y: 1250,  // Board center Y
                width: 200,
                height: 100,
                rotation: 0,
                color: '#0000ff',
                fillColor: 'rgba(0,0,255,0.1)',
                strokeWidth: 2,
                visible: true
            };
            AppState.shapes.push(shape);
            Shapes.render();

            // Debug: check if shape was rendered
            const shapeSvgs = document.querySelectorAll('.shape-svg');
            const shapeIds = Array.from(shapeSvgs).map(svg => svg.id);

            return {
                shapeId: shape.id,
                shapesInState: AppState.shapes.length,
                shapeSvgsInDOM: shapeSvgs.length,
                shapeIds: shapeIds
            };
        });

        console.log('Shape creation result:', result);
        const shapeId = result.shapeId;

        // Small wait for render
        await page.waitForTimeout(200);

        // Get visual center at 0°
        const at0deg = await page.evaluate(() => {
            // Get the last shape (the one we just created)
            const shapeSvgs = document.querySelectorAll('.shape-svg');
            const svg = shapeSvgs[shapeSvgs.length - 1];
            if (!svg) {
                throw new Error(`No shape SVGs found`);
            }
            const rect = svg.getBoundingClientRect();
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            return {
                shapeCenterX: rect.left + rect.width / 2 - containerRect.left,
                shapeCenterY: rect.top + rect.height / 2 - containerRect.top,
                containerWidth: containerRect.width,
                containerHeight: containerRect.height,
                expectedCenterX: containerRect.width / 2,
                expectedCenterY: containerRect.height / 2
            };
        });

        console.log('At 0°: shape center', at0deg.shapeCenterX, at0deg.shapeCenterY);
        console.log('At 0°: expected center', at0deg.expectedCenterX, at0deg.expectedCenterY);

        // Shape should be at visual center
        expect(Math.abs(at0deg.shapeCenterX - at0deg.expectedCenterX)).toBeLessThan(5);
        expect(Math.abs(at0deg.shapeCenterY - at0deg.expectedCenterY)).toBeLessThan(5);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Get visual center at 90°
        const at90deg = await page.evaluate(() => {
            // Get the last shape (the one we created)
            const shapeSvgs = document.querySelectorAll('.shape-svg');
            const svg = shapeSvgs[shapeSvgs.length - 1];
            if (!svg) {
                throw new Error(`No shape SVGs found`);
            }
            const rect = svg.getBoundingClientRect();
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            return {
                shapeCenterX: rect.left + rect.width / 2 - containerRect.left,
                shapeCenterY: rect.top + rect.height / 2 - containerRect.top,
                containerWidth: containerRect.width,
                containerHeight: containerRect.height,
                expectedCenterX: containerRect.width / 2,
                expectedCenterY: containerRect.height / 2
            };
        });

        console.log('At 90°: shape center', at90deg.shapeCenterX, at90deg.shapeCenterY);
        console.log('At 90°: expected center', at90deg.expectedCenterX, at90deg.expectedCenterY);

        // Shape should still be at visual center after rotation
        expect(Math.abs(at90deg.shapeCenterX - at90deg.expectedCenterX)).toBeLessThan(5);
        expect(Math.abs(at90deg.shapeCenterY - at90deg.expectedCenterY)).toBeLessThan(5);
    });

    test('line shape scales proportionally with board', async ({ page }) => {
        // Create line shape
        const shapeId = await page.evaluate(() => {
            const shape = {
                id: 'test-line',
                type: 'line',
                x: 2250,
                y: 1250,
                width: 300,  // Line length
                height: 0,
                rotation: 0,
                color: '#000000',
                strokeWidth: 2,
                visible: true
            };
            AppState.shapes.push(shape);
            Shapes.render();
            return shape.id;
        });

        // Measure at 0° rotation
        const at0deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) throw new Error(`Shape SVG not found: ${id}`);
            const rect = svg.getBoundingClientRect();

            return {
                width: rect.width,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, shapeId);

        console.log('Line at 0°: width', at0deg.width);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Measure at 90° rotation
        const at90deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) throw new Error(`Shape SVG not found: ${id}`);
            const rect = svg.getBoundingClientRect();

            return {
                width: rect.width,
                height: rect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, shapeId);

        console.log('Line at 90°: dimensions', at90deg.width, 'x', at90deg.height);

        // Line rotates 90°, so width becomes height
        // And scales by board scale factor
        const expectedDimension = at0deg.width * at90deg.boardRotationScaleFactor;

        // After 90° rotation, the line is vertical, so check height
        expect(Math.abs(at90deg.height - expectedDimension)).toBeLessThan(expectedDimension * 0.15);
    });

    test('arrow shape scales proportionally with board', async ({ page }) => {
        // Create arrow shape
        const shapeId = await page.evaluate(() => {
            const shape = {
                id: 'test-arrow',
                type: 'arrow',
                x: 2250,
                y: 1250,
                width: 400,  // Arrow length
                height: 0,
                rotation: 0,
                color: '#ff0000',
                strokeWidth: 2,
                visible: true
            };
            AppState.shapes.push(shape);
            Shapes.render();
            return shape.id;
        });

        // Measure at 0° rotation
        const at0deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) throw new Error(`Shape SVG not found: ${id}`);
            const rect = svg.getBoundingClientRect();

            return {
                width: rect.width,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, shapeId);

        console.log('Arrow at 0°: width', at0deg.width);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Measure at 90° rotation
        const at90deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) throw new Error(`Shape SVG not found: ${id}`);
            const rect = svg.getBoundingClientRect();

            return {
                width: rect.width,
                height: rect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, shapeId);

        console.log('Arrow at 90°: dimensions', at90deg.width, 'x', at90deg.height);

        // Arrow rotates 90°, so width becomes height and scales
        const expectedDimension = at0deg.width * at90deg.boardRotationScaleFactor;

        // After 90° rotation, the arrow is vertical, so check height
        expect(Math.abs(at90deg.height - expectedDimension)).toBeLessThan(expectedDimension * 0.15);
    });

    test('text shape scales proportionally with board', async ({ page }) => {
        // Create text shape
        const shapeId = await page.evaluate(() => {
            const shape = {
                id: 'test-text',
                type: 'text',
                x: 2250,
                y: 1250,
                width: 144,
                height: 72,
                rotation: 0,
                color: '#000000',
                text: 'Test',
                fontSize: 48,
                visible: true
            };
            AppState.shapes.push(shape);
            Shapes.render();
            return shape.id;
        });

        // Measure at 0° rotation
        const at0deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) throw new Error(`Shape SVG not found: ${id}`);
            const rect = svg.getBoundingClientRect();

            return {
                width: rect.width,
                height: rect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, shapeId);

        console.log('Text at 0°: size', at0deg.width, 'x', at0deg.height);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Measure at 90° rotation
        const at90deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) throw new Error(`Shape SVG not found: ${id}`);
            const rect = svg.getBoundingClientRect();

            return {
                width: rect.width,
                height: rect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, shapeId);

        console.log('Text at 90°: size', at90deg.width, 'x', at90deg.height);

        // Text now rotates WITH the board. At 90° board rotation the SVG is tilted,
        // so getBoundingClientRect() returns swapped dimensions (width↔height).
        const expectedWidth  = at0deg.height * at90deg.boardRotationScaleFactor;
        const expectedHeight = at0deg.width  * at90deg.boardRotationScaleFactor;

        expect(Math.abs(at90deg.width - expectedWidth)).toBeLessThan(expectedWidth * 0.15);
        expect(Math.abs(at90deg.height - expectedHeight)).toBeLessThan(expectedHeight * 0.15);
    });
});
