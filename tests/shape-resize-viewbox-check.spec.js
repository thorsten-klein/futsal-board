/**
 * Check SVG viewBox during resize to detect visual glitches
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Shape Resize ViewBox Check', () => {
    test('very long rectangle: check SVG viewBox during vertical resize', async ({ page }) => {
        await goto(page);

        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Add very long rectangle
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        await page.evaluate(() => {
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 2000;
            shape.height = 200;
            shape.x = 2500;
            shape.y = 1500;
            shape.rotation = 0;
            Shapes.render();
        });

        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);
        await page.locator(`.touch-overlay[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(200);

        // Get initial SVG state
        const initialSvg = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const svg = document.getElementById(shape.id);
            const viewBox = svg.getAttribute('viewBox');
            const width = svg.getAttribute('width');
            const height = svg.getAttribute('height');
            const rect = svg.querySelector('rect');

            return {
                shapeWidth: shape.width,
                shapeHeight: shape.height,
                svgViewBox: viewBox,
                svgWidth: width,
                svgHeight: height,
                rectX: rect.getAttribute('x'),
                rectY: rect.getAttribute('y'),
                rectWidth: rect.getAttribute('width'),
                rectHeight: rect.getAttribute('height')
            };
        });


        // Find bottom handle
        const handles = page.locator('.resize-handle');
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

        let bottomHandle = null;
        for (let i = 0; i < await handles.count(); i++) {
            const box = await handles.nth(i).boundingBox();
            const handleY = box.y + box.height / 2;
            const handleX = box.x + box.width / 2;

            if (Math.abs(handleX - shapeCenter.x) < 10 && handleY > shapeCenter.y) {
                bottomHandle = handles.nth(i);
                break;
            }
        }

        expect(bottomHandle).not.toBeNull();

        // Start drag
        const box = await bottomHandle.boundingBox();
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();

        // Drag in steps and check SVG state
        const log = [];
        for (let i = 1; i <= 5; i++) {
            await page.mouse.move(startX, startY + i * 30);
            await page.waitForTimeout(30);

            const svgState = await page.evaluate(() => {
                const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
                const svg = document.getElementById(shape.id);
                const viewBox = svg.getAttribute('viewBox');
                const rect = svg.querySelector('rect');

                return {
                    shapeWidth: shape.width,
                    shapeHeight: shape.height,
                    svgViewBox: viewBox,
                    svgWidth: parseFloat(svg.getAttribute('width')),
                    svgHeight: parseFloat(svg.getAttribute('height')),
                    rectWidth: parseFloat(rect.getAttribute('width')),
                    rectHeight: parseFloat(rect.getAttribute('height'))
                };
            });

            log.push({ step: i, ...svgState });
        }

        await page.mouse.up();
        await page.waitForTimeout(100);

        // Final state
        const finalSvg = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const svg = document.getElementById(shape.id);
            const viewBox = svg.getAttribute('viewBox');
            const rect = svg.querySelector('rect');

            return {
                shapeWidth: shape.width,
                shapeHeight: shape.height,
                svgViewBox: viewBox,
                svgWidth: parseFloat(svg.getAttribute('width')),
                svgHeight: parseFloat(svg.getAttribute('height')),
                rectWidth: parseFloat(rect.getAttribute('width')),
                rectHeight: parseFloat(rect.getAttribute('height'))
            };
        });


        for (const entry of log) {
        }


        // Check that shape width never changed
        expect(finalSvg.shapeWidth).toBe(initialSvg.shapeWidth);

        // Check that shape height did change
        expect(finalSvg.shapeHeight).not.toBe(initialSvg.shapeHeight);

        // Parse viewBox to check if viewBoxWidth stayed constant
        const initialVB = initialSvg.svgViewBox.split(' ').map(parseFloat);
        const finalVB = finalSvg.svgViewBox.split(' ').map(parseFloat);


        // For vertical resize, viewBox width should stay constant (at 100)
        expect(finalVB[2]).toBe(initialVB[2]);
    });
});
