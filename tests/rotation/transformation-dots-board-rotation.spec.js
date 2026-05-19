/**
 * Tests for transformation dots (resize handles) position when board is rotated 90°.
 * The transformation dots should appear at the correct position relative to shapes
 * even when the board itself is rotated.
 *
 * These tests verify that the transformation dots are correctly positioned
 * accounting for board rotation.
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

/** Rotate the board 90° clockwise. */
async function rotateBoard90(page) {
    await rightClickBoard(page);
    const menu = await getBoardCanvasMenu(page);
    await menu.locator('[data-action="rotate-right"]').click();
    await page.waitForTimeout(300);
}

test.describe('Transformation dots position when board is rotated 90°', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('transformation dots appear at correct positions after board rotation', async ({ page }) => {
        // Create a rectangle shape at position 500|500
        const shapeId = await page.evaluate(() => {
            const shape = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'rectangle',
                x: 500,
                y: 500,
                width: 400,
                height: 200,
                rotation: 0,
                color: '#ff0000',
                fillColor: '#ff0000',
                fillOpacity: 0.3,
                lineWidth: 3,
                visible: true
            };
            AppState.shapes.push(shape);
            Shapes.render();
            return shape.id;
        });

        console.log('\n=== STEP 1: Rotate board 90° clockwise ===');
        await rotateBoard90(page);

        console.log('\n=== STEP 2: Select the shape ===');
        await page.evaluate((id) => {
            AppState.selectedShape = id;
            AppState.currentTool = 'select';
            if (typeof Shapes !== 'undefined' && Shapes.updateHandles) {
                Shapes.updateHandles();
            }
        }, shapeId);

        await page.waitForTimeout(100);

        // Get shape position and handles
        const initialData = await page.evaluate((id) => {
            const shape = AppState.getShape(id);
            const shapeSvg = document.querySelector(`[data-shape="${id}"]`);
            const resizeHandles = document.querySelectorAll('.resize-handle');
            const rotationHandle = document.querySelector('.rotation-handle');

            const shapeRect = shapeSvg.getBoundingClientRect();
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            const shapeCenterX = shapeRect.left + shapeRect.width / 2 - containerRect.left;
            const shapeCenterY = shapeRect.top + shapeRect.height / 2 - containerRect.top;

            const resizeHandleData = Array.from(resizeHandles).map((handle, idx) => {
                const rect = handle.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2 - containerRect.left;
                const centerY = rect.top + rect.height / 2 - containerRect.top;
                return {
                    index: idx,
                    centerX: centerX,
                    centerY: centerY,
                    relativeX: centerX - shapeCenterX,
                    relativeY: centerY - shapeCenterY
                };
            });

            let rotationHandleData = null;
            if (rotationHandle) {
                const rect = rotationHandle.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2 - containerRect.left;
                const centerY = rect.top + rect.height / 2 - containerRect.top;
                rotationHandleData = {
                    centerX: centerX,
                    centerY: centerY,
                    relativeX: centerX - shapeCenterX,
                    relativeY: centerY - shapeCenterY
                };
            }

            return {
                shapeX: shape.x,
                shapeY: shape.y,
                shapeCenterX,
                shapeCenterY,
                shapeWidth: shapeRect.width,
                shapeHeight: shapeRect.height,
                boardRotation: AppState.boardRotation,
                resizeHandles: resizeHandleData,
                rotationHandle: rotationHandleData
            };
        }, shapeId);

        console.log(`Board rotation: ${initialData.boardRotation}°`);
        console.log(`Shape at (${initialData.shapeX}, ${initialData.shapeY})`);
        console.log(`Shape visual center: (${initialData.shapeCenterX.toFixed(2)}, ${initialData.shapeCenterY.toFixed(2)})`);
        console.log(`Shape visual size: ${initialData.shapeWidth.toFixed(2)} x ${initialData.shapeHeight.toFixed(2)}`);
        console.log('Resize handles:');
        initialData.resizeHandles.forEach(h => {
            console.log(`  Handle ${h.index}: relative (${h.relativeX.toFixed(2)}, ${h.relativeY.toFixed(2)})`);
        });
        if (initialData.rotationHandle) {
            console.log(`Rotation handle: relative (${initialData.rotationHandle.relativeX.toFixed(2)}, ${initialData.rotationHandle.relativeY.toFixed(2)})`);
        }

        // Expected positions for a 400x200 rectangle after 90° board rotation
        // After 90° rotation, the rectangle appears visually rotated
        // The shape dimensions swap: 400x200 becomes visually 200x400
        // Handles should be at the edges of the VISUAL rectangle
        const expectedHandlePositions = [
            { relativeX: initialData.shapeWidth / 2, relativeY: 0, name: 'Right edge' },
            { relativeX: -initialData.shapeWidth / 2, relativeY: 0, name: 'Left edge' },
            { relativeX: 0, relativeY: -initialData.shapeHeight / 2, name: 'Top edge' },
            { relativeX: 0, relativeY: initialData.shapeHeight / 2, name: 'Bottom edge' }
        ];

        console.log('\n=== Checking resize handle positions ===');
        console.log('Expected handle positions (relative to shape center):');
        expectedHandlePositions.forEach((expected, idx) => {
            console.log(`  ${expected.name}: (${expected.relativeX.toFixed(2)}, ${expected.relativeY.toFixed(2)})`);
        });

        let allHandlesCorrect = true;
        const tolerance = 5; // 5 pixels tolerance

        initialData.resizeHandles.forEach((handle, idx) => {
            if (idx >= expectedHandlePositions.length) return;

            const expected = expectedHandlePositions[idx];
            const errorX = Math.abs(handle.relativeX - expected.relativeX);
            const errorY = Math.abs(handle.relativeY - expected.relativeY);

            console.log(`\nHandle ${idx} (${expected.name}):`);
            console.log(`  Expected: (${expected.relativeX.toFixed(2)}, ${expected.relativeY.toFixed(2)})`);
            console.log(`  Actual:   (${handle.relativeX.toFixed(2)}, ${handle.relativeY.toFixed(2)})`);
            console.log(`  Error:    X=${errorX.toFixed(2)}px, Y=${errorY.toFixed(2)}px`);

            if (errorX > tolerance || errorY > tolerance) {
                console.log(`  ❌ FAIL: Handle is off by more than ${tolerance}px`);
                allHandlesCorrect = false;
            } else {
                console.log(`  ✓ PASS: Handle is within ${tolerance}px tolerance`);
            }

            expect(errorX).toBeLessThan(tolerance);
            expect(errorY).toBeLessThan(tolerance);
        });

        // Check rotation handle position
        console.log('\n=== Checking rotation handle position ===');
        if (initialData.rotationHandle) {
            // Rotation handle should be above the shape (at -90° from 0° = top)
            // After 90° board rotation, "top" becomes "right" visually
            const handleDistance = initialData.shapeHeight / 2 + 50;

            // In local coords, handle is at (0, -handleDistance) (top of shape)
            let expectedOffsetX = 0;
            let expectedOffsetY = -handleDistance;

            // After board rotation, this becomes (handleDistance, 0) (right of shape)
            const boardRotationRad = initialData.boardRotation * Math.PI / 180;
            const rotatedOffsetX = expectedOffsetX * Math.cos(boardRotationRad) - expectedOffsetY * Math.sin(boardRotationRad);
            const rotatedOffsetY = expectedOffsetX * Math.sin(boardRotationRad) + expectedOffsetY * Math.cos(boardRotationRad);

            console.log(`Expected rotation handle: relative (${rotatedOffsetX.toFixed(2)}, ${rotatedOffsetY.toFixed(2)})`);
            console.log(`Actual rotation handle: relative (${initialData.rotationHandle.relativeX.toFixed(2)}, ${initialData.rotationHandle.relativeY.toFixed(2)})`);

            const rotErrorX = Math.abs(initialData.rotationHandle.relativeX - rotatedOffsetX);
            const rotErrorY = Math.abs(initialData.rotationHandle.relativeY - rotatedOffsetY);
            console.log(`Rotation handle error: X=${rotErrorX.toFixed(2)}px, Y=${rotErrorY.toFixed(2)}px`);

            if (rotErrorX > 10 || rotErrorY > 10) {
                console.log(`❌ FAIL: Rotation handle is off by more than 10px`);
            } else {
                console.log(`✓ PASS: Rotation handle is within 10px tolerance`);
            }

            // Rotation handle should be accurate
            expect(rotErrorX).toBeLessThan(10);
            expect(rotErrorY).toBeLessThan(10);
        }

        if (allHandlesCorrect) {
            console.log('\n✓ All handles are correctly positioned!');
        } else {
            console.log('\n❌ BUG: Some handles are not correctly positioned');
        }
    });

    test('transformation dots after move and re-select on rotated board', async ({ page }) => {
        // Create a rectangle shape at position 500|500
        const shapeId = await page.evaluate(() => {
            const shape = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'rectangle',
                x: 500,
                y: 500,
                width: 400,
                height: 200,
                rotation: 0,
                color: '#ff0000',
                fillColor: '#ff0000',
                fillOpacity: 0.3,
                lineWidth: 3,
                visible: true
            };
            AppState.shapes.push(shape);
            Shapes.render();
            return shape.id;
        });

        console.log('\n=== STEP 1: Rotate board 90° clockwise ===');
        await rotateBoard90(page);

        console.log('\n=== STEP 2: Select the shape ===');
        await page.evaluate((id) => {
            AppState.selectedShape = id;
            AppState.currentTool = 'select';
            if (typeof Shapes !== 'undefined' && Shapes.updateHandles) {
                Shapes.updateHandles();
            }
        }, shapeId);

        await page.waitForTimeout(100);

        // Get initial handle positions
        const initialData = await page.evaluate((id) => {
            const shape = AppState.getShape(id);
            const shapeSvg = document.querySelector(`[data-shape="${id}"]`);
            const resizeHandles = document.querySelectorAll('.resize-handle');

            const shapeRect = shapeSvg.getBoundingClientRect();
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            const shapeCenterX = shapeRect.left + shapeRect.width / 2 - containerRect.left;
            const shapeCenterY = shapeRect.top + shapeRect.height / 2 - containerRect.top;

            const resizeHandleData = Array.from(resizeHandles).map((handle, idx) => {
                const rect = handle.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2 - containerRect.left;
                const centerY = rect.top + rect.height / 2 - containerRect.top;
                return {
                    index: idx,
                    relativeX: centerX - shapeCenterX,
                    relativeY: centerY - shapeCenterY
                };
            });

            return {
                shapeX: shape.x,
                shapeY: shape.y,
                resizeHandles: resizeHandleData
            };
        }, shapeId);

        console.log(`Initial shape position: (${initialData.shapeX}, ${initialData.shapeY})`);

        console.log('\n=== STEP 3: Move shape to new position (1000, 800) ===');
        await page.evaluate((id) => {
            const shape = AppState.getShape(id);
            shape.x = 1000;
            shape.y = 800;
            Shapes.render();
            // Update handles for the moved shape
            if (typeof Shapes !== 'undefined' && Shapes.updateHandles) {
                Shapes.updateHandles();
            }
        }, shapeId);

        await page.waitForTimeout(100);

        console.log('\n=== STEP 4: Unselect the shape ===');
        await page.evaluate(() => {
            AppState.selectedShape = null;
            if (typeof Shapes !== 'undefined' && Shapes.updateHandles) {
                Shapes.updateHandles();
            }
        });

        await page.waitForTimeout(100);

        console.log('\n=== STEP 5: Re-select the shape ===');
        await page.evaluate((id) => {
            AppState.selectedShape = id;
            AppState.currentTool = 'select';
            if (typeof Shapes !== 'undefined' && Shapes.updateHandles) {
                Shapes.updateHandles();
            }
        }, shapeId);

        await page.waitForTimeout(100);

        // Get handle positions after re-selection
        const afterReselectData = await page.evaluate((id) => {
            const shape = AppState.getShape(id);
            const shapeSvg = document.querySelector(`[data-shape="${id}"]`);
            const resizeHandles = document.querySelectorAll('.resize-handle');

            const shapeRect = shapeSvg.getBoundingClientRect();
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            const shapeCenterX = shapeRect.left + shapeRect.width / 2 - containerRect.left;
            const shapeCenterY = shapeRect.top + shapeRect.height / 2 - containerRect.top;

            const resizeHandleData = Array.from(resizeHandles).map((handle, idx) => {
                const rect = handle.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2 - containerRect.left;
                const centerY = rect.top + rect.height / 2 - containerRect.top;
                return {
                    index: idx,
                    relativeX: centerX - shapeCenterX,
                    relativeY: centerY - shapeCenterY
                };
            });

            return {
                shapeX: shape.x,
                shapeY: shape.y,
                shapeWidth: shapeRect.width,
                shapeHeight: shapeRect.height,
                resizeHandles: resizeHandleData
            };
        }, shapeId);

        console.log(`Final shape position: (${afterReselectData.shapeX}, ${afterReselectData.shapeY})`);

        console.log('\n=== Comparing initial vs after-reselect handle positions ===');

        // Compare handle positions - they should be the same relative to shape center
        initialData.resizeHandles.forEach((initialHandle, idx) => {
            const afterHandle = afterReselectData.resizeHandles[idx];
            if (!afterHandle) return;

            const deltaX = Math.abs(afterHandle.relativeX - initialHandle.relativeX);
            const deltaY = Math.abs(afterHandle.relativeY - initialHandle.relativeY);

            console.log(`Handle ${idx}:`);
            console.log(`  Initial relative: (${initialHandle.relativeX.toFixed(2)}, ${initialHandle.relativeY.toFixed(2)})`);
            console.log(`  After re-select:  (${afterHandle.relativeX.toFixed(2)}, ${afterHandle.relativeY.toFixed(2)})`);
            console.log(`  Position change:  ΔX=${deltaX.toFixed(2)}px, ΔY=${deltaY.toFixed(2)}px`);

            // Handles should stay at same relative position after move and re-select
            // Allowing small tolerance for floating point errors
            if (deltaX > 5 || deltaY > 5) {
                console.log(`  ❌ FAIL: Handle position drifted by more than 5px`);
            } else {
                console.log(`  ✓ PASS: Handle position is stable`);
            }

            expect(deltaX).toBeLessThan(5);
            expect(deltaY).toBeLessThan(5);
        });

        // Also check that handles are at expected positions
        console.log('\n=== Checking if handles are at correct visual positions ===');
        const expectedHandlePositions = [
            { relativeX: afterReselectData.shapeWidth / 2, relativeY: 0, name: 'Right edge' },
            { relativeX: -afterReselectData.shapeWidth / 2, relativeY: 0, name: 'Left edge' },
            { relativeX: 0, relativeY: -afterReselectData.shapeHeight / 2, name: 'Top edge' },
            { relativeX: 0, relativeY: afterReselectData.shapeHeight / 2, name: 'Bottom edge' }
        ];

        afterReselectData.resizeHandles.forEach((handle, idx) => {
            if (idx >= expectedHandlePositions.length) return;

            const expected = expectedHandlePositions[idx];
            const errorX = Math.abs(handle.relativeX - expected.relativeX);
            const errorY = Math.abs(handle.relativeY - expected.relativeY);

            console.log(`Handle ${idx} (${expected.name}):`);
            console.log(`  Expected: (${expected.relativeX.toFixed(2)}, ${expected.relativeY.toFixed(2)})`);
            console.log(`  Actual:   (${handle.relativeX.toFixed(2)}, ${handle.relativeY.toFixed(2)})`);
            console.log(`  Error:    X=${errorX.toFixed(2)}px, Y=${errorY.toFixed(2)}px`);

            // This should fail initially - documenting the bug
            expect(errorX).toBeLessThan(5);
            expect(errorY).toBeLessThan(5);
        });
    });
});
