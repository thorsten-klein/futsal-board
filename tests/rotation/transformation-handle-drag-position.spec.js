/**
 * Test that shapes are displayed at the correct position WHILE dragging transformation handles.
 * This test should reveal if shapes jump to wrong positions during the drag operation.
 *
 * Test procedure:
 * 1. Create board
 * 2. Rotate board 90°
 * 3. Add a rectangle
 * 4. Click on rectangle to select it
 * 5. Start dragging a transformation handle
 * 6. Check shape position DURING the drag (before mouse up)
 * 7. Verify shape is displayed at a reasonable position relative to its original position
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

/** Get the visual position of the shape's center on screen. */
async function getShapeVisualCenter(page, shapeId) {
    return await page.evaluate((id) => {
        const element = document.querySelector(`[data-shape="${id}"]`);
        if (!element) return null;

        const rect = element.getBoundingClientRect();
        const container = document.querySelector('.board-container');
        const containerRect = container.getBoundingClientRect();

        return {
            screenX: rect.left + rect.width / 2,
            screenY: rect.top + rect.height / 2,
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

test.describe('Transformation handle drag position test after board rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('rectangle - shape position should be reasonable while dragging handle after 90° board rotation', async ({ page }) => {
        console.log('\n=== RECTANGLE POSITION DURING HANDLE DRAG ===');

        // Rotate board 90°
        await rotateBoard90(page);
        console.log('Board rotated 90°');

        // Add a rectangle at a specific position
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
        console.log(`Rectangle created at (1000, 1000), size 400x200, id=${shapeId}`);

        // Click on rectangle to select it
        const shapeSelector = `[data-shape="${shapeId}"]`;
        await page.click(shapeSelector);
        await page.waitForTimeout(200);
        console.log('Rectangle selected');

        // Get initial state
        const stateBefore = await getShapeState(page, shapeId);
        const visualBefore = await getShapeVisualCenter(page, shapeId);
        console.log('Initial state:', stateBefore);
        console.log('Initial visual center:', visualBefore);

        // Get handles
        const handlesBefore = await getResizeHandles(page);
        expect(handlesBefore.length).toBe(4);

        // Start dragging handle 0
        const handleToDrag = handlesBefore[0];
        const startX = handleToDrag.screenCenterX;
        const startY = handleToDrag.screenCenterY;
        const endX = startX + 50;  // 50px to the right
        const endY = startY;

        console.log(`\nStarting drag from (${startX.toFixed(1)}, ${startY.toFixed(1)}) to (${endX.toFixed(1)}, ${endY.toFixed(1)})`);

        await page.mouse.move(startX, startY);
        await page.mouse.down();

        // Move the mouse but DON'T release yet
        await page.mouse.move(endX, endY);
        await page.waitForTimeout(100);

        // Check position DURING the drag
        const stateDuring = await getShapeState(page, shapeId);
        const visualDuring = await getShapeVisualCenter(page, shapeId);
        const expectedDuring = await getExpectedVisualCenter(page, shapeId);
        console.log('\nState DURING drag:', stateDuring);
        console.log('Visual center DURING drag:', visualDuring);
        console.log('Expected visual center DURING drag:', expectedDuring);

        // Calculate changes
        const boardPosChange = {
            x: stateDuring.x - stateBefore.x,
            y: stateDuring.y - stateBefore.y
        };
        const visualPosChange = {
            x: visualDuring.containerX - visualBefore.containerX,
            y: visualDuring.containerY - visualBefore.containerY
        };

        console.log('\nBoard position change:', boardPosChange);
        console.log('Visual position change (container coords):', visualPosChange);

        // Finish the drag
        await page.mouse.up();
        await page.waitForTimeout(100);

        const stateAfter = await getShapeState(page, shapeId);
        const visualAfter = await getShapeVisualCenter(page, shapeId);
        console.log('\nFinal state:', stateAfter);
        console.log('Final visual center:', visualAfter);

        console.log('\n=== VERIFICATION ===');

        // 1. Visual position during drag should not jump hundreds of pixels away
        const maxReasonableJump = 200; // pixels
        const visualJumpX = Math.abs(visualPosChange.x);
        const visualJumpY = Math.abs(visualPosChange.y);

        console.log(`1. Visual jump during drag: (${visualJumpX.toFixed(1)}px, ${visualJumpY.toFixed(1)}px)`);
        console.log(`   Should be < ${maxReasonableJump}px`);

        const visualJumpReasonable = visualJumpX < maxReasonableJump && visualJumpY < maxReasonableJump;

        if (!visualJumpReasonable) {
            console.log(`   ❌ FAILED: Shape jumped too far during drag!`);
            console.log(`   Expected jump < ${maxReasonableJump}px, got (${visualJumpX.toFixed(1)}, ${visualJumpY.toFixed(1)}) px`);
        } else {
            console.log(`   ✓ PASSED: Visual jump is reasonable`);
        }

        expect(visualJumpReasonable).toBe(true);

        // 2. Board position change should be reasonable (for a 50px drag)
        const maxBoardChange = 500; // cm
        const boardChangeReasonable = Math.abs(boardPosChange.x) < maxBoardChange &&
                                     Math.abs(boardPosChange.y) < maxBoardChange;

        console.log(`2. Board position change: (${boardPosChange.x.toFixed(1)}cm, ${boardPosChange.y.toFixed(1)}cm)`);
        console.log(`   Should be < ${maxBoardChange}cm`);
        console.log(`   ${boardChangeReasonable ? '✓ PASSED' : '❌ FAILED'}`);

        expect(boardChangeReasonable).toBe(true);

        // 3. Size changes should be reasonable
        const widthChange = stateDuring.width - stateBefore.width;
        const heightChange = stateDuring.height - stateBefore.height;
        const maxSizeChange = 500; // cm

        console.log(`3. Size change during drag: width ${widthChange.toFixed(1)}cm, height ${heightChange.toFixed(1)}cm`);
        console.log(`   Should be < ${maxSizeChange}cm`);

        const sizeChangeReasonable = Math.abs(widthChange) < maxSizeChange &&
                                    Math.abs(heightChange) < maxSizeChange;
        console.log(`   ${sizeChangeReasonable ? '✓ PASSED' : '❌ FAILED'}`);

        expect(sizeChangeReasonable).toBe(true);

        // 4. Shape must be rendered at the position its board-state implies.
        // Utils.boardToScreenCoords converts board (x, y) → container-relative screen coords,
        // correctly accounting for the CSS rotation transform on the board layers.
        // If the SVG element's rendered center deviates from this expected position the shape
        // is visually wrong even though the board state is correct.
        const maxRenderError = 5; // pixels
        const renderErrorX = Math.abs(visualDuring.containerX - expectedDuring.containerX);
        const renderErrorY = Math.abs(visualDuring.containerY - expectedDuring.containerY);

        console.log(`\n4. Render position error DURING drag:`);
        console.log(`   Actual visual center:   (${visualDuring.containerX.toFixed(1)}, ${visualDuring.containerY.toFixed(1)})`);
        console.log(`   Expected visual center: (${expectedDuring.containerX.toFixed(1)}, ${expectedDuring.containerY.toFixed(1)})`);
        console.log(`   Error: (${renderErrorX.toFixed(1)}px, ${renderErrorY.toFixed(1)}px) - should be < ${maxRenderError}px`);
        console.log(`   ${renderErrorX < maxRenderError && renderErrorY < maxRenderError ? '✓ PASSED' : '❌ FAILED: Shape is rendered at wrong position during drag!'}`);

        expect(renderErrorX).toBeLessThan(maxRenderError);
        expect(renderErrorY).toBeLessThan(maxRenderError);

        console.log('\n✓ Test complete');
    });

    test('rectangle - shape should stay near cursor while dragging handle after 90° rotation', async ({ page }) => {
        console.log('\n=== RECTANGLE STAYS NEAR CURSOR DURING DRAG ===');

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
                color: '#00ff00',
                fillColor: '#00ff00',
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

        // Get handle position
        const handles = await getResizeHandles(page);
        const handle = handles[1];

        const startX = handle.screenCenterX;
        const startY = handle.screenCenterY;
        // handle[1] is the visual-left edge; at 90° board rotation its resize direction
        // is 'vertical' (board-Y axis).  Board-Y is controlled by screen-X movement
        // (board-X is controlled by screen-Y).  Drag only along screen-X.
        const endX = startX + 30;
        const endY = startY;

        console.log(`Dragging handle from (${startX.toFixed(1)}, ${startY.toFixed(1)}) to (${endX.toFixed(1)}, ${endY.toFixed(1)})`);

        // Start drag
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);

        // Get handle position during drag (it should have moved with the cursor)
        const handlesDuring = await getResizeHandles(page);
        const handleDuring = handlesDuring[1];
        const shapeDuring = await getShapeState(page, shapeId);
        const visualDuring = await getShapeVisualCenter(page, shapeId);
        const expectedDuring = await getExpectedVisualCenter(page, shapeId);

        console.log(`Handle position during drag: (${handleDuring.screenCenterX.toFixed(1)}, ${handleDuring.screenCenterY.toFixed(1)})`);
        console.log(`Expected near cursor X: ${endX.toFixed(1)}`);

        // handle[1] is 'vertical' (board-Y axis) at 90° board rotation.
        // Board-Y is driven by screen-X movement, so the handle tracks along screen-X only.
        const handleOffsetX = Math.abs(handleDuring.screenCenterX - endX);

        console.log(`Handle X offset from cursor: ${handleOffsetX.toFixed(1)}px`);

        const maxHandleOffset = 20;
        const handleNearCursor = handleOffsetX < maxHandleOffset;

        console.log(`Handle near cursor X (<${maxHandleOffset}px): ${handleNearCursor ? '✓ PASSED' : '❌ FAILED'}`);

        expect(handleNearCursor).toBe(true);

        // The shape SVG must be rendered at the position its board-state implies.
        // Utils.boardToScreenCoords converts board (x, y) → container-relative screen coords,
        // correctly accounting for the CSS rotation transform.
        // A mismatch means the shape is visually at the wrong place even if the data is correct.
        const maxRenderError = 5; // pixels
        const renderErrorX = Math.abs(visualDuring.containerX - expectedDuring.containerX);
        const renderErrorY = Math.abs(visualDuring.containerY - expectedDuring.containerY);

        console.log(`\nRender position error DURING drag:`);
        console.log(`  Actual visual center:   (${visualDuring.containerX.toFixed(1)}, ${visualDuring.containerY.toFixed(1)})`);
        console.log(`  Expected visual center: (${expectedDuring.containerX.toFixed(1)}, ${expectedDuring.containerY.toFixed(1)})`);
        console.log(`  Error: (${renderErrorX.toFixed(1)}px, ${renderErrorY.toFixed(1)}px) - should be < ${maxRenderError}px`);
        console.log(`  ${renderErrorX < maxRenderError && renderErrorY < maxRenderError ? '✓ PASSED' : '❌ FAILED: Shape rendered at wrong position!'}`);

        expect(renderErrorX).toBeLessThan(maxRenderError);
        expect(renderErrorY).toBeLessThan(maxRenderError);

        // Finish drag
        await page.mouse.up();

        console.log('✓ Test complete');
    });
});
