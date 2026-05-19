/**
 * Test transformation handle dragging after board rotation.
 * This test should reveal bugs in handle positioning/dragging.
 *
 * Test procedure:
 * 1. Create board
 * 2. Rotate board 90°
 * 3. Add a rectangle
 * 4. Click on rectangle to select it
 * 5. Drag transformation handle 10px to the right
 * 6. Verify rectangle position and size changed as expected
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

/** Get all resize handles positions. */
async function getResizeHandles(page) {
    return await page.evaluate(() => {
        const handles = document.querySelectorAll('.resize-handle');
        const container = document.querySelector('.board-container');
        const containerRect = container.getBoundingClientRect();

        return Array.from(handles).map((handle, idx) => {
            const rect = handle.getBoundingClientRect();
            return {
                index: idx,
                centerX: rect.left + rect.width / 2 - containerRect.left,
                centerY: rect.top + rect.height / 2 - containerRect.top,
                left: rect.left - containerRect.left,
                top: rect.top - containerRect.top,
                width: rect.width,
                height: rect.height,
                screenCenterX: rect.left + rect.width / 2,
                screenCenterY: rect.top + rect.height / 2
            };
        });
    });
}

/** Get shape state from AppState. */
async function getShapeState(page, shapeId) {
    return await page.evaluate((id) => {
        const shape = AppState.getShape(id);
        if (!shape) return null;
        return {
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            rotation: shape.rotation,
            type: shape.type,
            boardRotation: AppState.boardRotation || 0
        };
    }, shapeId);
}

/** Get the actual visual center of the shape element on screen (container-relative). */
async function getShapeVisualCenter(page, shapeId) {
    return await page.evaluate((id) => {
        const element = document.querySelector(`[data-shape="${id}"]`);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const container = document.querySelector('.board-container');
        const containerRect = container.getBoundingClientRect();
        return {
            containerX: rect.left + rect.width / 2 - containerRect.left,
            containerY: rect.top + rect.height / 2 - containerRect.top,
            width: rect.width,
            height: rect.height
        };
    }, shapeId);
}

/**
 * Get the expected visual center of the shape derived from its current board-state
 * coordinates via Utils.boardToScreenCoords, which correctly accounts for the board's
 * CSS rotation transform.  If the rendered SVG position matches this, the shape is
 * displayed at the right place on screen.
 */
async function getExpectedVisualCenter(page, shapeId) {
    return await page.evaluate((id) => {
        const shape = AppState.getShape(id);
        if (!shape) return null;
        const pos = Utils.boardToScreenCoords(shape.x, shape.y);
        return { containerX: pos.x, containerY: pos.y };
    }, shapeId);
}

test.describe('Transformation handle 10px drag test after board rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('rectangle - drag right edge handle 10px to the right after 90° board rotation', async ({ page }) => {
        console.log('\n=== RECTANGLE RIGHT EDGE HANDLE - 10PX RIGHT DRAG ===');

        // Step 1: Board is created (done by goto)
        console.log('Step 1: Board created');

        // Step 2: Rotate board 90°
        await rotateBoard90(page);
        console.log('Step 2: Board rotated 90°');

        // Step 3: Add a rectangle at a specific position
        const shapeId = await page.evaluate(() => {
            const shape = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'rectangle',
                x: 1000,  // 1000cm from left
                y: 1000,  // 1000cm from top
                width: 400,  // 400cm wide
                height: 200, // 200cm tall
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
        console.log(`Step 3: Rectangle created at (1000, 1000), size 400x200, id=${shapeId}`);

        // Step 4: Click on rectangle to select it
        const shapeSelector = `[data-shape="${shapeId}"]`;
        await page.click(shapeSelector);
        await page.waitForTimeout(200);
        console.log('Step 4: Rectangle selected');

        // Verify selection
        const isSelected = await page.evaluate((id) => {
            return AppState.selectedShape === id;
        }, shapeId);
        expect(isSelected).toBe(true);

        // Get initial state
        const stateBefore = await getShapeState(page, shapeId);
        console.log('Initial state:', stateBefore);

        // Get handles
        const handlesBefore = await getResizeHandles(page);
        console.log(`Found ${handlesBefore.length} handles`);
        expect(handlesBefore.length).toBe(4); // Rectangle should have 4 edge handles

        // Log all handles
        handlesBefore.forEach((h, i) => {
            console.log(`  Handle ${i}: screen (${h.screenCenterX.toFixed(1)}, ${h.screenCenterY.toFixed(1)}), container (${h.centerX.toFixed(1)}, ${h.centerY.toFixed(1)})`);
        });

        // Step 5: Drag the first handle (should be a horizontal edge handle) 10px to the right
        const handleToDrag = handlesBefore[0];
        const startX = handleToDrag.screenCenterX;
        const startY = handleToDrag.screenCenterY;
        const endX = startX + 10;  // 10px to the right
        const endY = startY;

        console.log(`Step 5: Dragging handle 0 from (${startX.toFixed(1)}, ${startY.toFixed(1)}) to (${endX.toFixed(1)}, ${endY.toFixed(1)})`);
        console.log(`  Delta: (+10px, 0px)`);

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);
        await page.mouse.up();
        await page.waitForTimeout(300);

        // Step 6: Check if rectangle position and size changed as expected
        const stateAfter = await getShapeState(page, shapeId);
        console.log('State after drag:', stateAfter);

        // Calculate changes
        const deltaX = stateAfter.x - stateBefore.x;
        const deltaY = stateAfter.y - stateBefore.y;
        const deltaWidth = stateAfter.width - stateBefore.width;
        const deltaHeight = stateAfter.height - stateBefore.height;

        console.log('\nChanges:');
        console.log(`  Position: (${deltaX.toFixed(2)}, ${deltaY.toFixed(2)})`);
        console.log(`  Size: width ${deltaWidth.toFixed(2)}, height ${deltaHeight.toFixed(2)}`);

        // After 90° board rotation, dragging a handle 10px to the RIGHT in screen space
        // should affect the shape in a specific way depending on which edge we grabbed

        // For a horizontal edge handle (left or right edge):
        // - At 0° rotation: dragging right would increase/decrease width
        // - At 90° rotation: the visual "right" is actually "down" in board space
        //   So dragging the handle right should affect height in board space

        // Expected behavior:
        // The shape should resize, but the resize should be reasonable (not massive jumps)

        // Let's check what actually happened:
        console.log('\n=== VERIFICATION ===');

        // 1. At least one dimension should have changed
        const dimensionsChanged = Math.abs(deltaWidth) > 0.1 || Math.abs(deltaHeight) > 0.1;
        console.log(`1. Dimensions changed: ${dimensionsChanged} (width: ${deltaWidth.toFixed(2)}, height: ${deltaHeight.toFixed(2)})`);
        expect(dimensionsChanged).toBe(true);

        // 2. Changes should be reasonable (not huge jumps)
        // 10px screen drag should not cause 1000cm changes in board space
        const widthChangeReasonable = Math.abs(deltaWidth) < 500;
        const heightChangeReasonable = Math.abs(deltaHeight) < 500;
        console.log(`2. Width change reasonable (<500cm): ${widthChangeReasonable} (${Math.abs(deltaWidth).toFixed(2)}cm)`);
        console.log(`   Height change reasonable (<500cm): ${heightChangeReasonable} (${Math.abs(deltaHeight).toFixed(2)}cm)`);
        expect(widthChangeReasonable).toBe(true);
        expect(heightChangeReasonable).toBe(true);

        // 3. Position changes should be reasonable
        const positionChangeReasonable = Math.abs(deltaX) < 500 && Math.abs(deltaY) < 500;
        console.log(`3. Position change reasonable (<500cm): ${positionChangeReasonable} (${Math.abs(deltaX).toFixed(2)}, ${Math.abs(deltaY).toFixed(2)}cm)`);
        expect(positionChangeReasonable).toBe(true);

        // 4. Get handles after drag to verify they're still positioned correctly
        const handlesAfter = await getResizeHandles(page);
        console.log(`\n4. Handles after drag: ${handlesAfter.length} handles`);
        handlesAfter.forEach((h, i) => {
            console.log(`  Handle ${i}: screen (${h.screenCenterX.toFixed(1)}, ${h.screenCenterY.toFixed(1)})`);
        });

        // Verify handle positions are still reasonable relative to shape
        expect(handlesAfter.length).toBe(4);

        // 5. The shape SVG must be rendered at the position its board-state implies.
        // Utils.boardToScreenCoords converts board (x, y) → container-relative screen coords,
        // correctly accounting for the CSS rotation transform on all board layers.
        // A mismatch reveals that the SVG DOM update inside handleResizeMove used wrong
        // scale factors (e.g. from getBoundingClientRect on a rotated canvas).
        const visualAfter = await getShapeVisualCenter(page, shapeId);
        const expectedAfter = await getExpectedVisualCenter(page, shapeId);
        const maxRenderError = 5; // pixels
        const renderErrorX = Math.abs(visualAfter.containerX - expectedAfter.containerX);
        const renderErrorY = Math.abs(visualAfter.containerY - expectedAfter.containerY);

        console.log(`\n5. Render position error after drag:`);
        console.log(`   Actual visual center:   (${visualAfter.containerX.toFixed(1)}, ${visualAfter.containerY.toFixed(1)})`);
        console.log(`   Expected visual center: (${expectedAfter.containerX.toFixed(1)}, ${expectedAfter.containerY.toFixed(1)})`);
        console.log(`   Error: (${renderErrorX.toFixed(1)}px, ${renderErrorY.toFixed(1)}px) - should be < ${maxRenderError}px`);
        console.log(`   ${renderErrorX < maxRenderError && renderErrorY < maxRenderError ? '✓ PASSED' : '❌ FAILED: Shape rendered at wrong position!'}`);

        expect(renderErrorX).toBeLessThan(maxRenderError);
        expect(renderErrorY).toBeLessThan(maxRenderError);

        console.log('\n✓ Test complete');
    });

    test('rectangle - drag top edge handle 10px to the right after 90° board rotation', async ({ page }) => {
        console.log('\n=== RECTANGLE TOP EDGE HANDLE - 10PX RIGHT DRAG ===');

        // Rotate board 90°
        await rotateBoard90(page);
        console.log('Board rotated 90°');

        // Add a rectangle
        const shapeId = await page.evaluate(() => {
            const shape = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'rectangle',
                x: 1000,
                y: 1000,
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
        console.log(`Rectangle created, id=${shapeId}`);

        // Select rectangle
        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(200);

        const stateBefore = await getShapeState(page, shapeId);
        console.log('Initial state:', stateBefore);

        // Get handles
        const handlesBefore = await getResizeHandles(page);
        expect(handlesBefore.length).toBe(4);

        // Drag handle 2 (should be a vertical edge handle - top or bottom)
        const handleToDrag = handlesBefore[2];
        const startX = handleToDrag.screenCenterX;
        const startY = handleToDrag.screenCenterY;
        const endX = startX + 10;
        const endY = startY;

        console.log(`Dragging handle 2 from (${startX.toFixed(1)}, ${startY.toFixed(1)}) to (${endX.toFixed(1)}, ${endY.toFixed(1)})`);

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);
        await page.mouse.up();
        await page.waitForTimeout(300);

        const stateAfter = await getShapeState(page, shapeId);
        console.log('State after drag:', stateAfter);

        const deltaX = stateAfter.x - stateBefore.x;
        const deltaY = stateAfter.y - stateBefore.y;
        const deltaWidth = stateAfter.width - stateBefore.width;
        const deltaHeight = stateAfter.height - stateBefore.height;

        console.log('Changes:');
        console.log(`  Position: (${deltaX.toFixed(2)}, ${deltaY.toFixed(2)})`);
        console.log(`  Size: width ${deltaWidth.toFixed(2)}, height ${deltaHeight.toFixed(2)})`);

        // Verify changes are reasonable
        const dimensionsChanged = Math.abs(deltaWidth) > 0.1 || Math.abs(deltaHeight) > 0.1;
        expect(dimensionsChanged).toBe(true);

        const widthChangeReasonable = Math.abs(deltaWidth) < 500;
        const heightChangeReasonable = Math.abs(deltaHeight) < 500;
        expect(widthChangeReasonable).toBe(true);
        expect(heightChangeReasonable).toBe(true);

        const positionChangeReasonable = Math.abs(deltaX) < 500 && Math.abs(deltaY) < 500;
        expect(positionChangeReasonable).toBe(true);

        console.log('✓ Test complete');
    });

    test('rectangle - drag bottom edge handle 10px down after 90° board rotation', async ({ page }) => {
        console.log('\n=== RECTANGLE BOTTOM EDGE HANDLE - 10PX DOWN DRAG ===');

        // Rotate board 90°
        await rotateBoard90(page);
        console.log('Board rotated 90°');

        // Add a rectangle
        const shapeId = await page.evaluate(() => {
            const shape = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'rectangle',
                x: 1000,
                y: 1000,
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
        console.log(`Rectangle created, id=${shapeId}`);

        // Select rectangle
        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(200);

        const stateBefore = await getShapeState(page, shapeId);
        console.log('Initial state:', stateBefore);

        // Get handles
        const handlesBefore = await getResizeHandles(page);
        expect(handlesBefore.length).toBe(4);

        // Drag handle 3 (should be the other vertical edge handle)
        const handleToDrag = handlesBefore[3];
        const startX = handleToDrag.screenCenterX;
        const startY = handleToDrag.screenCenterY;
        const endX = startX;
        const endY = startY + 10;  // 10px down

        console.log(`Dragging handle 3 from (${startX.toFixed(1)}, ${startY.toFixed(1)}) to (${endX.toFixed(1)}, ${endY.toFixed(1)})`);
        console.log(`  Delta: (0px, +10px)`);

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);
        await page.mouse.up();
        await page.waitForTimeout(300);

        const stateAfter = await getShapeState(page, shapeId);
        console.log('State after drag:', stateAfter);

        const deltaX = stateAfter.x - stateBefore.x;
        const deltaY = stateAfter.y - stateBefore.y;
        const deltaWidth = stateAfter.width - stateBefore.width;
        const deltaHeight = stateAfter.height - stateBefore.height;

        console.log('Changes:');
        console.log(`  Position: (${deltaX.toFixed(2)}, ${deltaY.toFixed(2)})`);
        console.log(`  Size: width ${deltaWidth.toFixed(2)}, height ${deltaHeight.toFixed(2)})`);

        // Verify changes are reasonable
        const dimensionsChanged = Math.abs(deltaWidth) > 0.1 || Math.abs(deltaHeight) > 0.1;
        expect(dimensionsChanged).toBe(true);

        const widthChangeReasonable = Math.abs(deltaWidth) < 500;
        const heightChangeReasonable = Math.abs(deltaHeight) < 500;
        console.log(`Width change reasonable: ${widthChangeReasonable} (${Math.abs(deltaWidth).toFixed(2)}cm)`);
        console.log(`Height change reasonable: ${heightChangeReasonable} (${Math.abs(deltaHeight).toFixed(2)}cm)`);
        expect(widthChangeReasonable).toBe(true);
        expect(heightChangeReasonable).toBe(true);

        const positionChangeReasonable = Math.abs(deltaX) < 500 && Math.abs(deltaY) < 500;
        expect(positionChangeReasonable).toBe(true);

        console.log('✓ Test complete');
    });
});

// ─── Line ────────────────────────────────────────────────────────────────────

test.describe('Transformation handle drag – line – after 90° board rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('line - drag endpoint handle 20px after 90° board rotation', async ({ page }) => {
        console.log('\n=== LINE ENDPOINT HANDLE - 20PX DRAG ===');

        await rotateBoard90(page);
        console.log('Board rotated 90°');

        // Create a horizontal line centred on the board
        const shapeId = await page.evaluate(() => {
            const shape = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'line',
                x: 1000,
                y: 1000,
                width: 400,   // line length in cm
                rotation: 0,
                color: '#ff0000',
                lineWidth: 3,
                strokeWidth: 3,
                visible: true
            };
            AppState.shapes.push(shape);
            Shapes.render();
            return shape.id;
        });
        console.log(`Line created at (1000, 1000), width=400, id=${shapeId}`);

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(200);
        console.log('Line selected');

        const stateBefore = await getShapeState(page, shapeId);
        console.log('Initial state:', stateBefore);

        // Line has exactly 1 resize handle (the movable endpoint)
        const handlesBefore = await getResizeHandles(page);
        console.log(`Handles found: ${handlesBefore.length}`);
        expect(handlesBefore.length).toBe(1);

        const handle = handlesBefore[0];
        const startX = handle.screenCenterX;
        const startY = handle.screenCenterY;
        // Drag 20px right and 20px down in screen space
        const endX = startX + 20;
        const endY = startY + 20;

        console.log(`Dragging handle from (${startX.toFixed(1)}, ${startY.toFixed(1)}) to (${endX.toFixed(1)}, ${endY.toFixed(1)})`);

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);
        await page.mouse.up();
        await page.waitForTimeout(300);

        const stateAfter = await getShapeState(page, shapeId);
        console.log('State after drag:', stateAfter);

        const deltaX   = stateAfter.x        - stateBefore.x;
        const deltaY   = stateAfter.y        - stateBefore.y;
        const deltaW   = stateAfter.width    - stateBefore.width;
        const deltaRot = stateAfter.rotation - stateBefore.rotation;

        console.log('\nChanges:');
        console.log(`  Position: (${deltaX.toFixed(2)}, ${deltaY.toFixed(2)})`);
        console.log(`  Width:    ${deltaW.toFixed(2)} cm`);
        console.log(`  Rotation: ${deltaRot.toFixed(2)}°`);

        console.log('\n=== VERIFICATION ===');

        // 1. The endpoint moved, so position and/or width must change
        const somethingChanged = Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1 || Math.abs(deltaW) > 0.1;
        console.log(`1. Something changed: ${somethingChanged}`);
        expect(somethingChanged).toBe(true);

        // 2. Changes must be proportionate – a 20px screen drag cannot move the endpoint
        //    hundreds of centimetres away
        const maxBoardChange = 500; // cm
        const positionReasonable = Math.abs(deltaX) < maxBoardChange && Math.abs(deltaY) < maxBoardChange;
        const widthReasonable    = Math.abs(deltaW) < maxBoardChange;
        console.log(`2. Position change reasonable (<${maxBoardChange}cm): ${positionReasonable} (${Math.abs(deltaX).toFixed(1)}, ${Math.abs(deltaY).toFixed(1)})`);
        console.log(`   Width change reasonable    (<${maxBoardChange}cm): ${widthReasonable} (${Math.abs(deltaW).toFixed(1)})`);
        expect(positionReasonable).toBe(true);
        expect(widthReasonable).toBe(true);

        // 3. The shape SVG must be rendered at the screen position that its board-state
        //    coordinates imply.  handleResizeMove updates the SVG DOM using scale factors
        //    taken from getBoundingClientRect(), which returns post-CSS-transform dimensions.
        //    After a 90° rotation the width and height reported by getBoundingClientRect()
        //    are SWAPPED relative to the canvas element's natural width/height, so the SVG
        //    ends up positioned at the wrong place on screen even though the board state is
        //    correct.  Utils.boardToScreenCoords uses the CSS matrix inverse and is always
        //    accurate; comparing it against the element's getBoundingClientRect() exposes
        //    the rendering discrepancy.
        const visualAfter   = await getShapeVisualCenter(page, shapeId);
        const expectedAfter = await getExpectedVisualCenter(page, shapeId);
        const maxRenderError = 5; // pixels
        const renderErrX = Math.abs(visualAfter.containerX - expectedAfter.containerX);
        const renderErrY = Math.abs(visualAfter.containerY - expectedAfter.containerY);

        console.log(`\n3. Render position error after drag:`);
        console.log(`   Actual visual center:   (${visualAfter.containerX.toFixed(1)}, ${visualAfter.containerY.toFixed(1)})`);
        console.log(`   Expected visual center: (${expectedAfter.containerX.toFixed(1)}, ${expectedAfter.containerY.toFixed(1)})`);
        console.log(`   Error: (${renderErrX.toFixed(1)}px, ${renderErrY.toFixed(1)}px) – should be < ${maxRenderError}px`);
        console.log(`   ${renderErrX < maxRenderError && renderErrY < maxRenderError ? '✓ PASSED' : '❌ FAILED: shape rendered at wrong position!'}`);
        expect(renderErrX).toBeLessThan(maxRenderError);
        expect(renderErrY).toBeLessThan(maxRenderError);

        console.log('\n✓ Test complete');
    });
});

// ─── Arrow ───────────────────────────────────────────────────────────────────

test.describe('Transformation handle drag – arrow – after 90° board rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('arrow - drag endpoint handle 20px after 90° board rotation', async ({ page }) => {
        console.log('\n=== ARROW ENDPOINT HANDLE - 20PX DRAG ===');

        await rotateBoard90(page);
        console.log('Board rotated 90°');

        const shapeId = await page.evaluate(() => {
            const shape = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'arrow',
                x: 1000,
                y: 1000,
                width: 400,
                rotation: 0,
                color: '#0000ff',
                lineWidth: 3,
                strokeWidth: 3,
                visible: true
            };
            AppState.shapes.push(shape);
            Shapes.render();
            return shape.id;
        });
        console.log(`Arrow created at (1000, 1000), width=400, id=${shapeId}`);

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(200);
        console.log('Arrow selected');

        const stateBefore = await getShapeState(page, shapeId);
        console.log('Initial state:', stateBefore);

        const handlesBefore = await getResizeHandles(page);
        console.log(`Handles found: ${handlesBefore.length}`);
        expect(handlesBefore.length).toBe(1);

        const handle = handlesBefore[0];
        const startX = handle.screenCenterX;
        const startY = handle.screenCenterY;
        const endX = startX + 20;
        const endY = startY + 20;

        console.log(`Dragging handle from (${startX.toFixed(1)}, ${startY.toFixed(1)}) to (${endX.toFixed(1)}, ${endY.toFixed(1)})`);

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);
        await page.mouse.up();
        await page.waitForTimeout(300);

        const stateAfter = await getShapeState(page, shapeId);
        console.log('State after drag:', stateAfter);

        const deltaX = stateAfter.x     - stateBefore.x;
        const deltaY = stateAfter.y     - stateBefore.y;
        const deltaW = stateAfter.width - stateBefore.width;

        console.log('\nChanges:');
        console.log(`  Position: (${deltaX.toFixed(2)}, ${deltaY.toFixed(2)})`);
        console.log(`  Width:    ${deltaW.toFixed(2)} cm`);

        console.log('\n=== VERIFICATION ===');

        const somethingChanged = Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1 || Math.abs(deltaW) > 0.1;
        console.log(`1. Something changed: ${somethingChanged}`);
        expect(somethingChanged).toBe(true);

        const maxBoardChange = 500;
        const positionReasonable = Math.abs(deltaX) < maxBoardChange && Math.abs(deltaY) < maxBoardChange;
        const widthReasonable    = Math.abs(deltaW) < maxBoardChange;
        console.log(`2. Position change reasonable (<${maxBoardChange}cm): ${positionReasonable}`);
        console.log(`   Width change reasonable    (<${maxBoardChange}cm): ${widthReasonable}`);
        expect(positionReasonable).toBe(true);
        expect(widthReasonable).toBe(true);

        // 3. Rendering position must match board-state coordinates.
        //    Same SVG live-update bug as for lines: getBoundingClientRect() returns
        //    post-rotation visual dimensions (width ↔ height swapped at 90°), so the
        //    scale factors used to place the SVG element are wrong.
        const visualAfter   = await getShapeVisualCenter(page, shapeId);
        const expectedAfter = await getExpectedVisualCenter(page, shapeId);
        const maxRenderError = 5;
        const renderErrX = Math.abs(visualAfter.containerX - expectedAfter.containerX);
        const renderErrY = Math.abs(visualAfter.containerY - expectedAfter.containerY);

        console.log(`\n3. Render position error after drag:`);
        console.log(`   Actual visual center:   (${visualAfter.containerX.toFixed(1)}, ${visualAfter.containerY.toFixed(1)})`);
        console.log(`   Expected visual center: (${expectedAfter.containerX.toFixed(1)}, ${expectedAfter.containerY.toFixed(1)})`);
        console.log(`   Error: (${renderErrX.toFixed(1)}px, ${renderErrY.toFixed(1)}px) – should be < ${maxRenderError}px`);
        console.log(`   ${renderErrX < maxRenderError && renderErrY < maxRenderError ? '✓ PASSED' : '❌ FAILED: arrow rendered at wrong position!'}`);
        expect(renderErrX).toBeLessThan(maxRenderError);
        expect(renderErrY).toBeLessThan(maxRenderError);

        console.log('\n✓ Test complete');
    });
});

// ─── Text ────────────────────────────────────────────────────────────────────

test.describe('Transformation handle drag – text – after 90° board rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('text - drag resize handle outward doubles distance → font size should grow after 90° board rotation', async ({ page }) => {
        console.log('\n=== TEXT RESIZE HANDLE - OUTWARD DRAG ===');

        await rotateBoard90(page);
        console.log('Board rotated 90°');

        const shapeId = await page.evaluate(() => {
            const fontSize = 48;
            const shape = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'text',
                x: 1000,
                y: 1000,
                width: fontSize * 3,   // 144 cm
                height: fontSize * 1.5, // 72 cm
                fontSize,
                rotation: 0,
                text: 'Test',
                color: '#333333',
                visible: true
            };
            AppState.shapes.push(shape);
            Shapes.render();
            return shape.id;
        });
        console.log(`Text created at (1000, 1000), fontSize=48, id=${shapeId}`);

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(200);
        console.log('Text selected');

        const stateBefore = await getShapeState(page, shapeId);
        const fontSizeBefore = await page.evaluate((id) => AppState.getShape(id)?.fontSize, shapeId);
        console.log('Initial state:', stateBefore, 'fontSize:', fontSizeBefore);

        // Text has exactly 1 resize handle
        const handlesBefore = await getResizeHandles(page);
        console.log(`Handles found: ${handlesBefore.length}`);
        expect(handlesBefore.length).toBe(1);

        const handle = handlesBefore[0];
        const startX = handle.screenCenterX;
        const startY = handle.screenCenterY;

        // Determine the shape's screen center so we can drag the handle outward
        const shapeCenterScreen = await page.evaluate((id) => {
            const pos = Utils.boardToScreenCoords(
                AppState.getShape(id).x,
                AppState.getShape(id).y
            );
            const containerRect = document.querySelector('.board-container').getBoundingClientRect();
            return {
                screenX: pos.x + containerRect.left,
                screenY: pos.y + containerRect.top
            };
        }, shapeId);

        // Direction from shape center to handle (unit vector)
        const dx = startX - shapeCenterScreen.screenX;
        const dy = startY - shapeCenterScreen.screenY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        console.log(`Handle is ${dist.toFixed(1)}px from shape center`);

        // Drag 60px outward along the center-to-handle direction, so the handle
        // ends up roughly (dist + 60) / dist times further from the center.
        // That should cause fontSize to scale up by the same ratio.
        const dragAmount = 60; // px
        const ux = dist > 0 ? dx / dist : 1;
        const uy = dist > 0 ? dy / dist : 0;
        const endX = startX + ux * dragAmount;
        const endY = startY + uy * dragAmount;
        const expectedScaleFactor = (dist + dragAmount) / dist;

        console.log(`Dragging handle outward ${dragAmount}px`);
        console.log(`  From: (${startX.toFixed(1)}, ${startY.toFixed(1)})`);
        console.log(`  To:   (${endX.toFixed(1)}, ${endY.toFixed(1)})`);
        console.log(`  Expected scale factor: ~${expectedScaleFactor.toFixed(2)}x`);

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);
        await page.mouse.up();
        await page.waitForTimeout(300);

        const fontSizeAfter = await page.evaluate((id) => AppState.getShape(id)?.fontSize, shapeId);
        const actualScaleFactor = fontSizeAfter / fontSizeBefore;
        console.log(`fontSize after: ${fontSizeAfter?.toFixed(1)}, actual scale factor: ${actualScaleFactor?.toFixed(2)}x`);

        console.log('\n=== VERIFICATION ===');

        // 1. Font size must have increased (handle dragged outward)
        const fontSizeIncreased = fontSizeAfter > fontSizeBefore;
        console.log(`1. Font size increased: ${fontSizeIncreased} (${fontSizeBefore} → ${fontSizeAfter?.toFixed(1)})`);
        console.log(`   ${fontSizeIncreased ? '✓ PASSED' : '❌ FAILED: font size did not grow when handle dragged outward!'}`);
        expect(fontSizeIncreased).toBe(true);

        // 2. The scale factor must be close to what we expect from the drag geometry.
        //    The text resize code computes:
        //      scaleFactor = currentMouseDistance / initialTextHandleDistance
        //    where both distances are measured from the shape's screen-space center.
        //    At 90° board rotation the center is computed using getBoundingClientRect()
        //    scale factors (post-rotation visual dimensions), which are swapped relative
        //    to the canvas element's natural dimensions.  This makes the computed center
        //    wrong, distorting both initialTextHandleDistance and currentMouseDistance.
        //    Although they share the same wrong base the offset from the true center is
        //    non-zero, so the two distances don't share a common factor and the ratio –
        //    the scale factor – ends up meaningfully different from the geometric truth.
        //    We allow a generous ±50% tolerance around the expected scale factor; the
        //    bug produces ratios that fall well outside this window.
        const tolerance = 0.5; // 50 % around expected
        const scaleFactorReasonable =
            actualScaleFactor >= expectedScaleFactor * (1 - tolerance) &&
            actualScaleFactor <= expectedScaleFactor * (1 + tolerance);

        console.log(`2. Scale factor reasonable (${(expectedScaleFactor * (1 - tolerance)).toFixed(2)}–${(expectedScaleFactor * (1 + tolerance)).toFixed(2)}): ${scaleFactorReasonable} (got ${actualScaleFactor?.toFixed(2)})`);
        console.log(`   ${scaleFactorReasonable ? '✓ PASSED' : '❌ FAILED: font size scaled by wrong factor!'}`);
        expect(scaleFactorReasonable).toBe(true);

        // 3. Rendering position must match board-state coordinates.
        //    For text, shape.x / shape.y never change during resize, so the visual
        //    center should remain exactly where boardToScreenCoords says it should be.
        //    The same getBoundingClientRect()-based scale-factor bug in handleResizeMove
        //    causes the SVG element to be placed at wrong CSS left/top values, shifting
        //    the shape visually even though its board coordinates are unchanged.
        const visualAfter   = await getShapeVisualCenter(page, shapeId);
        const expectedAfter = await getExpectedVisualCenter(page, shapeId);
        const maxRenderError = 5; // pixels
        const renderErrX = Math.abs(visualAfter.containerX - expectedAfter.containerX);
        const renderErrY = Math.abs(visualAfter.containerY - expectedAfter.containerY);

        console.log(`\n3. Render position error after drag:`);
        console.log(`   Actual visual center:   (${visualAfter.containerX.toFixed(1)}, ${visualAfter.containerY.toFixed(1)})`);
        console.log(`   Expected visual center: (${expectedAfter.containerX.toFixed(1)}, ${expectedAfter.containerY.toFixed(1)})`);
        console.log(`   Error: (${renderErrX.toFixed(1)}px, ${renderErrY.toFixed(1)}px) – should be < ${maxRenderError}px`);
        console.log(`   ${renderErrX < maxRenderError && renderErrY < maxRenderError ? '✓ PASSED' : '❌ FAILED: text rendered at wrong position!'}`);
        expect(renderErrX).toBeLessThan(maxRenderError);
        expect(renderErrY).toBeLessThan(maxRenderError);

        console.log('\n✓ Test complete');
    });
});
