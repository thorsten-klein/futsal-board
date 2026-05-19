/**
 * Test to verify SVG elements (elements, shapes) are positioned consistently
 * with players and plates, using board-canvas coordinates not board-container.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Right-click on board to open context menu. */
async function rightClickBoard(page) {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
}

/** Get board canvas context menu. */
async function getBoardCanvasMenu(page) {
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    return menu;
}

test.describe('SVG position consistency', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('element SVG uses canvas.width not getBoundingClientRect().width for positioning', async ({ page }) => {
        // Add a cone element at a known board position
        await page.evaluate(() => {
            AppState.addElement('cone', 2000, 1000); // Center of board
            Elements.render();
        });

        await page.waitForTimeout(200);

        // Get the SVG element
        const elementSvg = page.locator('.element-svg').first();
        await elementSvg.waitFor();

        // Get its position
        const svgBox0 = await elementSvg.boundingBox();
        console.log('Element SVG at 0°:', svgBox0);

        // Get canvas dimensions (attribute)
        const canvasDims0 = await page.evaluate(() => ({
            attrWidth: AppState.canvas.width,
            attrHeight: AppState.canvas.height,
            rectWidth: AppState.canvas.getBoundingClientRect().width,
            rectHeight: AppState.canvas.getBoundingClientRect().height
        }));
        console.log('Canvas at 0°:', canvasDims0);

        // At 0°, attribute and rect should match
        expect(Math.abs(canvasDims0.attrWidth - canvasDims0.rectWidth)).toBeLessThan(1);
        expect(Math.abs(canvasDims0.attrHeight - canvasDims0.rectHeight)).toBeLessThan(1);

        // Rotate 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        // Get SVG position after rotation
        const svgBox90 = await elementSvg.boundingBox();
        console.log('Element SVG at 90°:', svgBox90);

        // Get canvas dimensions after rotation
        const canvasDims90 = await page.evaluate(() => ({
            attrWidth: AppState.canvas.width,
            attrHeight: AppState.canvas.height,
            rectWidth: AppState.canvas.getBoundingClientRect().width,
            rectHeight: AppState.canvas.getBoundingClientRect().height,
            boardRotationScaleFactor: AppState.boardRotationScaleFactor,
            referenceScale: AppState.referenceScale
        }));
        console.log('Canvas at 90°:', canvasDims90);

        // After rotation, rect dimensions change due to transform, but attribute stays same
        expect(canvasDims90.attrWidth).toBe(canvasDims0.attrWidth);
        expect(canvasDims90.attrHeight).toBe(canvasDims0.attrHeight);

        // Element position should be calculated using canvas.width (attribute), not getBoundingClientRect()
        // Get the element's board coordinates
        const elementData = await page.evaluate(() => {
            const el = AppState.elements[0];
            return { x: el.x, y: el.y, type: el.type };
        });
        console.log('Element data:', elementData);

        // Compare in canvas-local pixel space to avoid rotation-dependent bounding-box math.
        // The element SVG has CSS transform: translate(-width*anchor.x, -height*anchor.y) rotate(...)
        // which offsets the SVG so its anchor aligns with (style.left, style.top) in canvas space.
        // Therefore: canvas_anchor = (style.left, style.top) = el.x * posScaleX, el.y * posScaleY.
        const anchorData = await page.evaluate(({ el }) => {
            const canvas = AppState.canvas;
            const boardWidth = AppState.boardWidth || 4000;
            const boardHeight = AppState.boardHeight || 2000;
            const posScaleX = canvas.width / boardWidth;
            const posScaleY = canvas.height / boardHeight;

            const expectedCanvasX = el.x * posScaleX;
            const expectedCanvasY = el.y * posScaleY;

            const domEl = document.querySelector('.element-svg');
            if (!domEl) return { error: 'element-svg not found', expectedCanvasX, expectedCanvasY };

            // The CSS transform moves the SVG so its anchor aligns with style.left/top.
            const styleL = parseFloat(domEl.style.left);
            const styleT = parseFloat(domEl.style.top);

            return { expectedCanvasX, expectedCanvasY,
                     actualCanvasX: styleL, actualCanvasY: styleT,
                     posScaleX, posScaleY, canvasW: canvas.width, canvasH: canvas.height };
        }, { el: elementData });

        console.log('Canvas-space anchor comparison:', anchorData);
        if (anchorData.error) throw new Error(anchorData.error);

        expect(Math.abs(anchorData.actualCanvasX - anchorData.expectedCanvasX)).toBeLessThan(5);
        expect(Math.abs(anchorData.actualCanvasY - anchorData.expectedCanvasY)).toBeLessThan(5);
    });

    test('shape SVG positioning at rotation', async ({ page }) => {
        // Capture browser console
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        // Add a shape at center
        await page.evaluate(() => {
            Shapes.addShapeAtPosition('rectangle', 2000, 1000);
        });

        await page.waitForTimeout(200);

        const shapeSvg = page.locator('.shape-svg').first();
        await shapeSvg.waitFor();

        const svgBox0 = await shapeSvg.boundingBox();
        console.log('Shape SVG at 0°:', svgBox0);

        // Rotate 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        const svgBox90 = await shapeSvg.boundingBox();
        console.log('Shape SVG at 90°:', svgBox90);

        // Get drawing layer position (shapes are in drawing-layer)
        const drawingLayer = await page.locator('#drawing-layer').boundingBox();
        console.log('Drawing layer at 90°:', drawingLayer);

        // Shape should be positioned relative to drawing-layer using canvas.width
        const shapeData = await page.evaluate(() => {
            const shape = AppState.shapes[0];
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();
            const screenPos = Utils.boardToScreenCoords(shape.x, shape.y);
            return {
                x: shape.x,
                y: shape.y,
                expectedAbsoluteX: containerRect.x + screenPos.x,
                expectedAbsoluteY: containerRect.y + screenPos.y,
                scaleFactor: AppState.boardRotationScaleFactor || 1,
                referenceScale: AppState.referenceScale
            };
        });

        console.log('Shape data:', shapeData);

        const expectedAbsoluteX = shapeData.expectedAbsoluteX;
        const expectedAbsoluteY = shapeData.expectedAbsoluteY;

        console.log('Expected absolute position:', { x: expectedAbsoluteX, y: expectedAbsoluteY });

        // Get actual SVG left/top styles
        const svgStyles = await shapeSvg.evaluate(el => ({
            left: el.style.left,
            top: el.style.top
        }));
        console.log('SVG left/top styles:', svgStyles);

        // SVG center should be at expected position
        const svgCenterX = svgBox90.x + svgBox90.width / 2;
        const svgCenterY = svgBox90.y + svgBox90.height / 2;

        console.log('Actual SVG center:', { x: svgCenterX, y: svgCenterY });

        expect(Math.abs(svgCenterX - expectedAbsoluteX)).toBeLessThan(5);
        expect(Math.abs(svgCenterY - expectedAbsoluteY)).toBeLessThan(5);
    });
});
