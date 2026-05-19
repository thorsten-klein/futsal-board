/**
 * Test for bug: When board is rotated 90° and sidebar width is changed,
 * the board-canvas height changes incorrectly.
 *
 * Steps to reproduce:
 * 1. Rotate the board 90°
 * 2. Change the sidebar width
 * 3. Observe that the canvas height changes (it shouldn't)
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

/** Get canvas dimensions and container dimensions. */
async function getCanvasDimensions(page) {
    return await page.evaluate(() => {
        const canvas = document.getElementById('board-canvas');
        const container = document.querySelector('.board-container');
        const toolbar = document.querySelector('.toolbar');

        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        return {
            canvas: {
                width: canvas.width,
                height: canvas.height,
                styleWidth: parseFloat(canvas.style.width),
                styleHeight: parseFloat(canvas.style.height),
                rectWidth: canvasRect.width,
                rectHeight: canvasRect.height,
                left: parseFloat(canvas.style.left),
                top: parseFloat(canvas.style.top)
            },
            container: {
                width: containerRect.width,
                height: containerRect.height
            },
            toolbar: {
                width: toolbar.offsetWidth
            },
            boardRotation: AppState.boardRotation,
            scaleFactor: AppState.boardRotationScaleFactor
        };
    });
}

/** Resize the sidebar to a specific width. */
async function resizeSidebar(page, newWidth) {
    await page.evaluate((width) => {
        const toolbar = document.querySelector('.toolbar');
        toolbar.style.width = width + 'px';
        localStorage.setItem('sidebarWidth', width);

        // Trigger the same resize logic as in the app
        requestAnimationFrame(() => {
            Board.resize();
            Shapes.render();
            Plates.render();
            Elements.render();
            Balls.render();
            Players.render();
            Drawings.render();
        });
    }, newWidth);

    await page.waitForTimeout(100);
}

test.describe('Sidebar resize canvas height bug', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('canvas fills container visually when sidebar width changes after 90° rotation', async ({ page }) => {
        console.log('\n=== STEP 1: Initial state (0° rotation) ===');

        // Get initial dimensions at 0° rotation
        const initialDims = await getCanvasDimensions(page);

        console.log('Initial canvas dimensions:');
        console.log(`  width: ${initialDims.canvas.width}, height: ${initialDims.canvas.height}`);
        console.log(`  styleWidth: ${initialDims.canvas.styleWidth}px, styleHeight: ${initialDims.canvas.styleHeight}px`);
        console.log(`  left: ${initialDims.canvas.left}px, top: ${initialDims.canvas.top}px`);
        console.log(`Container: ${initialDims.container.width} x ${initialDims.container.height}`);
        console.log(`Toolbar width: ${initialDims.toolbar.width}px`);
        console.log(`Board rotation: ${initialDims.boardRotation}°`);

        console.log('\n=== STEP 2: Rotate board 90° ===');

        // Rotate the board 90°
        await rotateBoard90(page);

        // Get dimensions after rotation
        const afterRotationDims = await getCanvasDimensions(page);

        console.log('After 90° rotation:');
        console.log(`  width: ${afterRotationDims.canvas.width}, height: ${afterRotationDims.canvas.height}`);
        console.log(`Container: ${afterRotationDims.container.width} x ${afterRotationDims.container.height}`);
        console.log(`  scaleFactor: ${afterRotationDims.scaleFactor}`);

        // Verify board is rotated
        expect(afterRotationDims.boardRotation).toBe(90);

        // At 90°, the visual height (canvas.width * scaleFactor) should equal container height
        const visualHeightBefore = afterRotationDims.canvas.width * afterRotationDims.scaleFactor;
        console.log(`Visual height before sidebar resize: ${visualHeightBefore.toFixed(2)} (container: ${afterRotationDims.container.height.toFixed(2)})`);
        expect(Math.abs(visualHeightBefore - afterRotationDims.container.height)).toBeLessThan(5);

        console.log('\n=== STEP 3: Change sidebar width from 300px to 400px ===');

        // Change sidebar width
        const newSidebarWidth = 400;
        await resizeSidebar(page, newSidebarWidth);

        // Get dimensions after sidebar resize
        const afterSidebarResizeDims = await getCanvasDimensions(page);

        console.log('After sidebar resize to 400px:');
        console.log(`  width: ${afterSidebarResizeDims.canvas.width}, height: ${afterSidebarResizeDims.canvas.height}`);
        console.log(`Container: ${afterSidebarResizeDims.container.width} x ${afterSidebarResizeDims.container.height}`);
        console.log(`  scaleFactor: ${afterSidebarResizeDims.scaleFactor}`);

        // Container height must not change (only width changes with sidebar)
        expect(Math.abs(afterSidebarResizeDims.container.height - afterRotationDims.container.height)).toBeLessThan(2);

        // Canvas attribute width tracks the new container width
        expect(Math.abs(afterSidebarResizeDims.canvas.width - afterSidebarResizeDims.container.width)).toBeLessThan(5);

        // The key invariant: visual height (canvas.width * scaleFactor) must still equal container height.
        // With the CSS transform updated by Board.resize() via updateBoardVisualRotation(), this is guaranteed.
        const visualHeightAfter = afterSidebarResizeDims.canvas.width * afterSidebarResizeDims.scaleFactor;
        console.log(`Visual height after sidebar resize: ${visualHeightAfter.toFixed(2)} (container: ${afterSidebarResizeDims.container.height.toFixed(2)})`);
        expect(Math.abs(visualHeightAfter - afterSidebarResizeDims.container.height)).toBeLessThan(5);
    });

    test('canvas dimensions should maintain aspect ratio when sidebar width changes at 0° rotation', async ({ page }) => {
        console.log('\n=== CONTROL TEST: Sidebar resize at 0° rotation ===');

        // Get initial dimensions at 0° rotation
        const initialDims = await getCanvasDimensions(page);

        console.log('Initial (0° rotation):');
        console.log(`  canvas: ${initialDims.canvas.width} x ${initialDims.canvas.height}`);
        console.log(`  toolbar: ${initialDims.toolbar.width}px`);

        // Change sidebar width
        const newSidebarWidth = 400;
        await resizeSidebar(page, newSidebarWidth);

        // Get dimensions after sidebar resize
        const afterSidebarResizeDims = await getCanvasDimensions(page);

        console.log('After sidebar resize to 400px (still 0° rotation):');
        console.log(`  canvas: ${afterSidebarResizeDims.canvas.width} x ${afterSidebarResizeDims.canvas.height}`);
        console.log(`  toolbar: ${afterSidebarResizeDims.toolbar.width}px`);

        // Calculate aspect ratios
        const initialAspectRatio = initialDims.canvas.width / initialDims.canvas.height;
        const afterAspectRatio = afterSidebarResizeDims.canvas.width / afterSidebarResizeDims.canvas.height;

        console.log(`Initial aspect ratio: ${initialAspectRatio.toFixed(4)}`);
        console.log(`After aspect ratio: ${afterAspectRatio.toFixed(4)}`);
        console.log(`Aspect ratio difference: ${Math.abs(afterAspectRatio - initialAspectRatio).toFixed(6)}`);

        // At 0° rotation, aspect ratio should be maintained
        expect(Math.abs(afterAspectRatio - initialAspectRatio)).toBeLessThan(0.01);
    });

    test('canvas should maximize available space when rotated 90°', async ({ page }) => {
        console.log('\n=== TEST: Canvas maximizes space at 90° rotation ===');

        // Get dimensions at 0° rotation
        const at0Degrees = await getCanvasDimensions(page);
        console.log('At 0° rotation:');
        console.log(`  Container: ${at0Degrees.container.width} x ${at0Degrees.container.height}`);
        console.log(`  Canvas: ${at0Degrees.canvas.width} x ${at0Degrees.canvas.height}`);

        // The canvas should fill the container width (or height if constrained by aspect ratio)
        const fillRatioWidth0 = at0Degrees.canvas.width / at0Degrees.container.width;
        const fillRatioHeight0 = at0Degrees.canvas.height / at0Degrees.container.height;
        console.log(`  Fill ratio: width=${(fillRatioWidth0 * 100).toFixed(1)}%, height=${(fillRatioHeight0 * 100).toFixed(1)}%`);

        // Rotate board 90°
        await rotateBoard90(page);

        const at90Degrees = await getCanvasDimensions(page);
        console.log('\nAt 90° rotation:');
        console.log(`  Container: ${at90Degrees.container.width} x ${at90Degrees.container.height}`);
        console.log(`  Canvas (pre-transform): ${at90Degrees.canvas.width} x ${at90Degrees.canvas.height}`);
        console.log(`  Canvas (visual/getBoundingClientRect): ${at90Degrees.canvas.rectWidth.toFixed(1)} x ${at90Degrees.canvas.rectHeight.toFixed(1)}`);
        console.log(`  Scale factor: ${at90Degrees.scaleFactor}`);

        const fillRatioWidth90 = at90Degrees.canvas.rectWidth / at90Degrees.container.width;
        const fillRatioHeight90 = at90Degrees.canvas.rectHeight / at90Degrees.container.height;
        console.log(`  Visual fill ratio: width=${(fillRatioWidth90 * 100).toFixed(1)}%, height=${(fillRatioHeight90 * 100).toFixed(1)}%`);

        // After rotation, the canvas should still maximize the available space
        // At least one dimension should be close to filling the container (within a few pixels for rounding)
        const maxDimension = Math.max(fillRatioWidth90, fillRatioHeight90);
        console.log(`\nMax fill ratio at 90°: ${(maxDimension * 100).toFixed(1)}%`);

        // The canvas should fill at least 90% of one dimension (accounting for aspect ratio constraints)
        // Actually, it should fill close to 100% of one dimension
        expect(maxDimension).toBeGreaterThan(0.95);

        // At 0°, the canvas fills the container well
        const maxDimension0 = Math.max(fillRatioWidth0, fillRatioHeight0);
        console.log(`Max fill ratio at 0°: ${(maxDimension0 * 100).toFixed(1)}%`);

        // Both should be similar (canvas should maximize space in both orientations)
        const fillRatioDifference = Math.abs(maxDimension - maxDimension0);
        console.log(`Fill ratio difference: ${(fillRatioDifference * 100).toFixed(1)}%`);

        // The fill ratios should be similar (within 10% difference)
        expect(fillRatioDifference).toBeLessThan(0.1);
    });

    test('visual canvas height fills container when sidebar changes at 90° rotation', async ({ page }) => {
        console.log('\n=== DETAILED ANALYSIS: Canvas calculations at 90° ===');

        // Rotate the board 90°
        await rotateBoard90(page);

        // Get detailed state before sidebar resize
        const beforeState = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            return {
                boardWidth: AppState.boardWidth,
                boardHeight: AppState.boardHeight,
                boardRotation: AppState.boardRotation,
                containerWidth: containerRect.width,
                containerHeight: containerRect.height,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                referenceScale: AppState.referenceScale,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor
            };
        });

        console.log('Before sidebar resize:');
        console.log(`  Board dimensions: ${beforeState.boardWidth} x ${beforeState.boardHeight}`);
        console.log(`  Container dimensions: ${beforeState.containerWidth.toFixed(2)} x ${beforeState.containerHeight.toFixed(2)}`);
        console.log(`  Canvas dimensions: ${beforeState.canvasWidth} x ${beforeState.canvasHeight}`);
        console.log(`  Reference scale: ${beforeState.referenceScale}`);
        console.log(`  Rotation scale factor: ${beforeState.boardRotationScaleFactor}`);

        // Change sidebar width
        await resizeSidebar(page, 400);

        // Get detailed state after sidebar resize
        const afterState = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            return {
                boardWidth: AppState.boardWidth,
                boardHeight: AppState.boardHeight,
                boardRotation: AppState.boardRotation,
                containerWidth: containerRect.width,
                containerHeight: containerRect.height,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                referenceScale: AppState.referenceScale,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor
            };
        });

        console.log('\nAfter sidebar resize:');
        console.log(`  Board dimensions: ${afterState.boardWidth} x ${afterState.boardHeight}`);
        console.log(`  Container dimensions: ${afterState.containerWidth.toFixed(2)} x ${afterState.containerHeight.toFixed(2)}`);
        console.log(`  Canvas dimensions: ${afterState.canvasWidth} x ${afterState.canvasHeight}`);
        console.log(`  Reference scale: ${afterState.referenceScale}`);
        console.log(`  Rotation scale factor: ${afterState.boardRotationScaleFactor}`);

        // Container height must not change when sidebar changes width
        const containerHeightChanged = Math.abs(afterState.containerHeight - beforeState.containerHeight) > 1;
        expect(containerHeightChanged).toBe(false);

        // Canvas attribute width tracks the new container width
        expect(Math.abs(afterState.canvasWidth - afterState.containerWidth)).toBeLessThan(5);

        // The key invariant: visual height = canvas.width * scaleFactor must equal container height.
        // canvas.height (the attribute) changes proportionally with canvas.width — that is correct.
        // What matters is the VISUAL display: the board must still fill the container height.
        const visualHeightBefore = beforeState.canvasWidth * beforeState.boardRotationScaleFactor;
        const visualHeightAfter = afterState.canvasWidth * afterState.boardRotationScaleFactor;
        console.log(`\nVisual height before: ${visualHeightBefore.toFixed(2)} (container: ${beforeState.containerHeight.toFixed(2)})`);
        console.log(`Visual height after:  ${visualHeightAfter.toFixed(2)} (container: ${afterState.containerHeight.toFixed(2)})`);
        expect(Math.abs(visualHeightBefore - beforeState.containerHeight)).toBeLessThan(5);
        expect(Math.abs(visualHeightAfter - afterState.containerHeight)).toBeLessThan(5);

        // The effective on-screen pixels per board unit (referenceScale * scaleFactor) must stay constant
        // even though referenceScale and scaleFactor individually change with sidebar width.
        // This ensures player sizes on screen remain stable.
        const effectiveBefore = beforeState.referenceScale * beforeState.boardRotationScaleFactor;
        const effectiveAfter = afterState.referenceScale * afterState.boardRotationScaleFactor;
        console.log(`\nEffective scale before: ${effectiveBefore.toFixed(6)}`);
        console.log(`Effective scale after:  ${effectiveAfter.toFixed(6)}`);
        expect(Math.abs(effectiveAfter - effectiveBefore)).toBeLessThan(0.001);
    });
});
