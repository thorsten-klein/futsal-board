/**
 * Test to reveal the yellow border (drop-shadow) positioning bug at 0° rotation.
 * Yellow borders for elements and shapes are WRONG at 0°.
 * This test shows they don't match the expected canvas position.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Yellow border bug at 0° rotation', () => {
    test('element and shape SVGs are positioned at WRONG screen coordinates at 0°', async ({ page }) => {
        // Capture console logs
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        await goto(page);

        // Add element and shape at board center
        await page.evaluate(() => {
            const boardX = 2000; // center of board (board is 4000x2000)
            const boardY = 1000;

            // Add element
            AppState.elements.push({
                id: 'bug-test-element',
                type: 'cone',
                x: boardX,
                y: boardY,
                rotation: 0,
                visible: true
            });

            // Add shape
            AppState.shapes.push({
                id: 'bug-test-shape',
                type: 'circle',
                x: boardX,
                y: boardY,
                width: 200,
                height: 200,
                color: '#000000',
                fillColor: 'rgba(0, 0, 0, 0.15)',
                strokeWidth: 3,
                rotation: 0,
                visible: true
            });

            Elements.render();
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Select the element to make yellow border appear
        await page.evaluate(() => {
            const element = AppState.elements.find(e => e.id === 'bug-test-element');
            AppState.selectedElement = element;
            Elements.render();
        });

        await page.waitForTimeout(300);

        // Select the shape to make yellow border appear
        await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'bug-test-shape');
            AppState.selectedShape = shape;
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get positions and check if they match expected canvas coordinates
        const result = await page.evaluate(() => {
            const elements = document.querySelectorAll('.element-svg');
            const element = Array.from(elements).find(el => el.id === 'bug-test-element') || elements[elements.length - 1];
            const shape = document.querySelector('.shape-svg');

            console.log('Found elements:', elements.length, 'element IDs:', Array.from(elements).map(e => e.id));
            console.log('Selected element:', element ? element.id : 'none');
            console.log('Element style.left:', element ? element.style.left : 'N/A');
            console.log('Element has selected class:', element ? element.classList.contains('element-selected') : false);
            console.log('Shape has selected class:', shape ? shape.classList.contains('shape-selected') : false);
            console.log('Element filter:', element ? window.getComputedStyle(element).filter : 'N/A');
            console.log('Shape filter:', shape ? window.getComputedStyle(shape).filter : 'N/A');

            if (!element || !shape) {
                return {
                    error: 'Elements not found',
                    element: !!element,
                    shape: !!shape
                };
            }

            const canvas = document.getElementById('board-canvas');
            const canvasRect = canvas.getBoundingClientRect();
            const boardArea = document.getElementById('board-area').getBoundingClientRect();
            const drawingLayer = document.getElementById('drawing-layer').getBoundingClientRect();

            const elementRect = element.getBoundingClientRect();
            const shapeRect = shape.getBoundingClientRect();

            // Check if board-area is offset from canvas
            const boardAreaOffsetX = boardArea.x - canvasRect.x;
            const boardAreaOffsetY = boardArea.y - canvasRect.y;
            console.log('Board-area offset from canvas:', boardAreaOffsetX, boardAreaOffsetY);

            // For elements, calculate where the ANCHOR point is (not geometric center)
            const elementWidth = parseFloat(element.getAttribute('width'));
            const elementHeight = parseFloat(element.getAttribute('height'));
            const anchor = { x: 0.5, y: 0.9 }; // cone anchor
            // Anchor is at (anchor.x * width, anchor.y * height) within the SVG
            // After transform, it should be at the element's board position
            const elementAnchorX = elementRect.x + (anchor.x * elementWidth);
            const elementAnchorY = elementRect.y + (anchor.y * elementHeight);

            // Expected position calculation (what Board.boardToScreen does)
            // Board dimensions from AppState
            const boardWidth = AppState.boardWidth;  // 4500
            const boardHeight = AppState.boardHeight; // 2000

            const expectedX = 2000 * (canvas.width / boardWidth);
            const expectedY = 1000 * (canvas.height / boardHeight);

            // In screen coordinates (absolute)
            const expectedAbsoluteX = canvasRect.x + expectedX;
            const expectedAbsoluteY = canvasRect.y + expectedY;

            return {
                canvas: {
                    x: canvasRect.x,
                    y: canvasRect.y,
                    width: canvasRect.width,
                    height: canvasRect.height,
                    attrWidth: canvas.width,
                    attrHeight: canvas.height
                },
                boardArea: { x: boardArea.x, y: boardArea.y },
                drawingLayer: { x: drawingLayer.x, y: drawingLayer.y },
                expected: {
                    boardToScreenX: expectedX,
                    boardToScreenY: expectedY,
                    absoluteX: expectedAbsoluteX,
                    absoluteY: expectedAbsoluteY
                },
                element: {
                    rect: {
                        x: elementRect.x,
                        y: elementRect.y,
                        width: elementRect.width,
                        height: elementRect.height
                    },
                    centerX: elementRect.x + elementRect.width / 2,
                    centerY: elementRect.y + elementRect.height / 2,
                    anchorX: elementAnchorX,
                    anchorY: elementAnchorY,
                    svgWidth: elementWidth,
                    svgHeight: elementHeight,
                    styleLeft: element.style.left,
                    styleTop: element.style.top,
                    transform: element.style.transform
                },
                shape: {
                    rect: {
                        x: shapeRect.x,
                        y: shapeRect.y,
                        width: shapeRect.width,
                        height: shapeRect.height
                    },
                    centerX: shapeRect.x + shapeRect.width / 2,
                    centerY: shapeRect.y + shapeRect.height / 2,
                    styleLeft: shape.style.left,
                    styleTop: shape.style.top
                }
            };
        });

        if (result.error) {
            throw new Error(result.error);
        }

        console.log('\n=== YELLOW BORDER BUG TEST (0° rotation) ===\n');
        console.log('Canvas:', result.canvas);
        console.log('Board-area:', result.boardArea);
        console.log('Drawing-layer:', result.drawingLayer);
        console.log('\nExpected position (from Board.boardToScreen(2000, 1000)):');
        console.log('  Relative to canvas:', result.expected.boardToScreenX, result.expected.boardToScreenY);
        console.log('  Absolute:', result.expected.absoluteX, result.expected.absoluteY);

        // Add visual markers at expected position for manual inspection
        await page.evaluate(({ expectedX, expectedY }) => {
            const canvasRect = document.getElementById('board-canvas').getBoundingClientRect();
            const marker = document.createElement('div');
            marker.style.position = 'absolute';
            marker.style.left = (canvasRect.x + expectedX) + 'px';
            marker.style.top = (canvasRect.y + expectedY) + 'px';
            marker.style.width = '20px';
            marker.style.height = '20px';
            marker.style.backgroundColor = 'red';
            marker.style.border = '2px solid white';
            marker.style.borderRadius = '50%';
            marker.style.zIndex = '10000';
            marker.style.pointerEvents = 'none';
            marker.id = 'expected-position-marker';
            document.body.appendChild(marker);
            console.log('Red marker added at expected position:', canvasRect.x + expectedX, canvasRect.y + expectedY);
        }, { expectedX: result.expected.boardToScreenX, expectedY: result.expected.boardToScreenY });

        // Take screenshot for manual inspection
        await page.screenshot({ path: 'test_results/yellow-border-bug-0deg.png', fullPage: false });

        console.log('\n--- Element SVG ---');
        console.log('Rect:', result.element.rect);
        console.log('SVG width/height:', result.element.svgWidth, result.element.svgHeight);
        console.log('Transform:', result.element.transform);
        console.log('Center:', result.element.centerX, result.element.centerY);
        console.log('Anchor (0.5, 0.9):', result.element.anchorX, result.element.anchorY);
        console.log('Style left/top:', result.element.styleLeft, result.element.styleTop);
        console.log('Anchor difference from expected:', {
            x: result.element.anchorX - result.expected.absoluteX,
            y: result.element.anchorY - result.expected.absoluteY
        });

        console.log('\n--- Shape SVG ---');
        console.log('Rect:', result.shape.rect);
        console.log('Center:', result.shape.centerX, result.shape.centerY);
        console.log('Style left/top:', result.shape.styleLeft, result.shape.styleTop);
        console.log('Difference from expected:', {
            x: result.shape.centerX - result.expected.absoluteX,
            y: result.shape.centerY - result.expected.absoluteY
        });

        // BUG CHECK: Element ANCHOR should be at expected coordinates (not geometric center)
        const elementDiffX = Math.abs(result.element.anchorX - result.expected.absoluteX);
        const elementDiffY = Math.abs(result.element.anchorY - result.expected.absoluteY);
        // Shapes use geometric center (no anchor)
        const shapeDiffX = Math.abs(result.shape.centerX - result.expected.absoluteX);
        const shapeDiffY = Math.abs(result.shape.centerY - result.expected.absoluteY);

        console.log('\n=== BUG CHECK ===');
        if (elementDiffX > 5 || elementDiffY > 5) {
            console.log('❌ BUG FOUND: Element anchor is offset by:', {
                x: elementDiffX.toFixed(2),
                y: elementDiffY.toFixed(2)
            });
        } else {
            console.log('✓ Element anchor is correctly positioned');
        }

        if (shapeDiffX > 5 || shapeDiffY > 5) {
            console.log('❌ BUG FOUND: Shape is offset by:', {
                x: shapeDiffX.toFixed(2),
                y: shapeDiffY.toFixed(2)
            });
        } else {
            console.log('✓ Shape is correctly positioned');
        }

        // Element anchor should be at expected position
        expect(elementDiffX).toBeLessThan(5);
        expect(elementDiffY).toBeLessThan(5);
        // Shape center should be at expected position
        expect(shapeDiffX).toBeLessThan(5);
        expect(shapeDiffY).toBeLessThan(5);
    });

    test('yellow borders at 90° rotation', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        await goto(page);

        // Add element and shape at board center
        const { elementId, shapeId } = await page.evaluate(() => {
            const boardX = 2000;
            const boardY = 1000;

            const element = {
                id: 'bug-test-element-90',
                type: 'cone',
                x: boardX,
                y: boardY,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(element);

            const shape = {
                id: 'bug-test-shape-90',
                type: 'circle',
                x: boardX,
                y: boardY,
                width: 200,
                height: 200,
                color: '#000000',
                fillColor: 'rgba(0, 0, 0, 0.15)',
                strokeWidth: 3,
                rotation: 0,
                visible: true
            };
            AppState.shapes.push(shape);

            Elements.render();
            Shapes.render();

            return { elementId: element.id, shapeId: shape.id };
        });

        await page.waitForTimeout(300);

        // Rotate board 90° using context menu
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        const menu = page.locator('#board-canvas-context-menu');
        await menu.waitFor({ state: 'visible', timeout: 3000 });
        await menu.locator('[data-action="rotate-right"]').click();

        await page.waitForTimeout(500);

        // Select elements
        await page.evaluate(({ elementId, shapeId }) => {
            const element = AppState.elements.find(e => e.id === elementId);
            AppState.selectedElement = element;
            Elements.render();
        }, { elementId, shapeId });

        await page.waitForTimeout(300);

        // Get positions at 90°
        const result = await page.evaluate(({ elementId }) => {
            const element = document.getElementById(elementId);
            const shape = document.querySelector('.shape-svg');

            if (!element || !shape) {
                return { error: 'Elements not found', element: !!element, shape: !!shape };
            }

            const canvas = document.getElementById('board-canvas');
            const canvasRect = canvas.getBoundingClientRect();
            const boardArea = document.getElementById('board-area').getBoundingClientRect();
            const playersLayer = document.getElementById('players-layer').getBoundingClientRect();

            const elementRect = element.getBoundingClientRect();
            const shapeRect = shape.getBoundingClientRect();

            // Board coordinates after rotation
            const boardX = 2000;
            const boardY = 1000;

            // Use Utils.boardToScreenCoords which correctly handles CSS transform at any rotation
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();
            const screenPos = Utils.boardToScreenCoords(boardX, boardY);
            const expectedX = screenPos.x;
            const expectedY = screenPos.y;
            const expectedAbsoluteX = containerRect.x + expectedX;
            const expectedAbsoluteY = containerRect.y + expectedY;

            // Element anchor
            // Use rendered bounding-box dimensions so the anchor calculation
            // works in screen-space at any board rotation/scale.
            const anchor = { x: 0.5, y: 0.9 };
            const elementAnchorX = elementRect.x + (anchor.x * elementRect.width);
            const elementAnchorY = elementRect.y + (anchor.y * elementRect.height);

            // Get transforms
            const boardAreaTransform = window.getComputedStyle(document.getElementById('board-area')).transform;
            const playersLayerTransform = window.getComputedStyle(document.getElementById('players-layer')).transform;
            const drawingLayerTransform = window.getComputedStyle(document.getElementById('drawing-layer')).transform;

            return {
                rotation: AppState.boardRotation,
                scaleFactor: AppState.boardRotationScaleFactor,
                canvas: { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height, attrWidth: canvas.width, attrHeight: canvas.height },
                boardArea: { x: boardArea.x, y: boardArea.y, offsetFromCanvas: { x: boardArea.x - canvasRect.x, y: boardArea.y - canvasRect.y } },
                playersLayer: { x: playersLayer.x, y: playersLayer.y, offsetFromCanvas: { x: playersLayer.x - canvasRect.x, y: playersLayer.y - canvasRect.y } },
                expected: { boardToScreenX: expectedX, boardToScreenY: expectedY, absoluteX: expectedAbsoluteX, absoluteY: expectedAbsoluteY },
                element: {
                    rect: elementRect,
                    anchorX: elementAnchorX,
                    anchorY: elementAnchorY,
                    styleLeft: element.style.left,
                    styleTop: element.style.top,
                    transform: element.style.transform
                },
                shape: {
                    rect: shapeRect,
                    centerX: shapeRect.x + shapeRect.width / 2,
                    centerY: shapeRect.y + shapeRect.height / 2,
                    styleLeft: shape.style.left,
                    styleTop: shape.style.top
                },
                transforms: {
                    boardArea: boardAreaTransform,
                    playersLayer: playersLayerTransform,
                    drawingLayer: drawingLayerTransform
                }
            };
        }, { elementId });

        if (result.error) {
            throw new Error(result.error);
        }

        console.log('\n=== AT 90° ROTATION ===');
        console.log('Rotation:', result.rotation);
        console.log('Scale factor:', result.scaleFactor);
        console.log('Canvas:', result.canvas);
        console.log('Board-area offset from canvas:', result.boardArea.offsetFromCanvas);
        console.log('Players-layer offset from canvas:', result.playersLayer.offsetFromCanvas);
        console.log('\nTransforms:');
        console.log('  board-area:', result.transforms.boardArea);
        console.log('  players-layer:', result.transforms.playersLayer);
        console.log('  drawing-layer:', result.transforms.drawingLayer);
        console.log('\nExpected position:', result.expected);
        console.log('\nElement anchor:', result.element.anchorX, result.element.anchorY);
        console.log('Element style:', result.element.styleLeft, result.element.styleTop);
        console.log('Element transform:', result.element.transform);
        console.log('\nShape center:', result.shape.centerX, result.shape.centerY);
        console.log('Shape style:', result.shape.styleLeft, result.shape.styleTop);

        // Add visual marker
        await page.evaluate(({ expectedX, expectedY }) => {
            const canvasRect = document.getElementById('board-canvas').getBoundingClientRect();
            const marker = document.createElement('div');
            marker.style.position = 'absolute';
            marker.style.left = (canvasRect.x + expectedX) + 'px';
            marker.style.top = (canvasRect.y + expectedY) + 'px';
            marker.style.width = '20px';
            marker.style.height = '20px';
            marker.style.backgroundColor = 'lime';
            marker.style.border = '2px solid black';
            marker.style.borderRadius = '50%';
            marker.style.zIndex = '10000';
            marker.style.pointerEvents = 'none';
            document.body.appendChild(marker);
        }, { expectedX: result.expected.boardToScreenX, expectedY: result.expected.boardToScreenY });

        await page.screenshot({ path: 'test_results/yellow-border-bug-90deg.png', fullPage: false });

        // Check positioning
        const elementDiffX = Math.abs(result.element.anchorX - result.expected.absoluteX);
        const elementDiffY = Math.abs(result.element.anchorY - result.expected.absoluteY);
        const shapeDiffX = Math.abs(result.shape.centerX - result.expected.absoluteX);
        const shapeDiffY = Math.abs(result.shape.centerY - result.expected.absoluteY);

        console.log('\n=== POSITIONING CHECK AT 90° ===');
        console.log('Element anchor offset:', { x: elementDiffX.toFixed(2), y: elementDiffY.toFixed(2) });
        console.log('Shape center offset:', { x: shapeDiffX.toFixed(2), y: shapeDiffY.toFixed(2) });

        expect(elementDiffX).toBeLessThan(5);
        expect(elementDiffY).toBeLessThan(5);
        expect(shapeDiffX).toBeLessThan(5);
        expect(shapeDiffY).toBeLessThan(5);
    });
});
