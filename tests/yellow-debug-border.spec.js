/**
 * Test the YELLOW DEBUG BORDER setting from board settings.
 * This is the border shown when "Show SVG borders" is enabled.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Yellow debug border positioning', () => {
    test('yellow debug borders match element positions at 0°', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        // Use a viewport where canvas doesn't fill container
        await page.setViewportSize({ width: 800, height: 1200 });
        await goto(page);

        // Enable debug mode (show yellow borders)
        await page.evaluate(() => {
            AppState.debugMode = true;
        });

        // Add element at board center
        await page.evaluate(() => {
            const element = {
                id: 'yellow-border-test',
                type: 'cone',
                x: 2000,
                y: 1000,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(element);
            Elements.render();
        });

        await page.waitForTimeout(500);

        // Check if yellow border matches element position
        const result = await page.evaluate(() => {
            const element = document.getElementById('yellow-border-test');
            const debugBox = document.querySelector('.debug-tolerance-box[data-debug-id="yellow-border-test"]');
            const canvas = document.getElementById('board-canvas');
            const container = document.querySelector('.board-container');
            const boardArea = document.getElementById('board-area');
            const playersLayer = document.getElementById('players-layer');

            if (!element || !debugBox) {
                return {
                    error: 'Element or debug box not found',
                    hasElement: !!element,
                    hasDebugBox: !!debugBox
                };
            }

            const elementRect = element.getBoundingClientRect();
            const debugRect = debugBox.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const boardAreaRect = boardArea.getBoundingClientRect();
            const playersLayerRect = playersLayer.getBoundingClientRect();

            return {
                canvas: {
                    rect: { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height },
                    attr: { width: canvas.width, height: canvas.height }
                },
                container: {
                    x: containerRect.x,
                    y: containerRect.y,
                    width: containerRect.width,
                    height: containerRect.height
                },
                boardArea: {
                    x: boardAreaRect.x,
                    y: boardAreaRect.y,
                    offsetFromContainer: { x: boardAreaRect.x - containerRect.x, y: boardAreaRect.y - containerRect.y },
                    styleLeft: boardArea.style.left,
                    styleTop: boardArea.style.top
                },
                playersLayer: {
                    x: playersLayerRect.x,
                    y: playersLayerRect.y,
                    offsetFromContainer: { x: playersLayerRect.x - containerRect.x, y: playersLayerRect.y - containerRect.y },
                    styleLeft: playersLayer.style.left,
                    styleTop: playersLayer.style.top
                },
                element: {
                    rect: { x: elementRect.x, y: elementRect.y, width: elementRect.width, height: elementRect.height },
                    styleLeft: element.style.left,
                    styleTop: element.style.top,
                    transform: element.style.transform
                },
                debugBox: {
                    rect: { x: debugRect.x, y: debugRect.y, width: debugRect.width, height: debugRect.height },
                    styleLeft: debugBox.style.left,
                    styleTop: debugBox.style.top,
                    transform: debugBox.style.transform
                },
                mismatch: {
                    x: Math.abs(elementRect.x - debugRect.x),
                    y: Math.abs(elementRect.y - debugRect.y),
                    width: Math.abs(elementRect.width - debugRect.width),
                    height: Math.abs(elementRect.height - debugRect.height)
                }
            };
        });

        if (result.error) {
            console.error('Error:', result);
            throw new Error(result.error);
        }

        console.log('\n=== YELLOW DEBUG BORDER TEST ===');
        console.log('Canvas rect:', result.canvas.rect);
        console.log('Canvas attr:', result.canvas.attr);
        console.log('Container:', result.container);
        console.log('Canvas != Container:', {
            width: Math.abs(result.canvas.rect.width - result.container.width),
            height: Math.abs(result.canvas.rect.height - result.container.height)
        });
        console.log('\nPlayers-layer offset from container:', result.playersLayer.offsetFromContainer);
        console.log('Players-layer style:', result.playersLayer.styleLeft, result.playersLayer.styleTop);
        console.log('Board-area offset from container:', result.boardArea.offsetFromContainer);
        console.log('Board-area style:', result.boardArea.styleLeft, result.boardArea.styleTop);
        console.log('\nElement rect:', result.element.rect);
        console.log('Element style:', result.element.styleLeft, result.element.styleTop);
        console.log('Element transform:', result.element.transform);
        console.log('\nDebug box rect:', result.debugBox.rect);
        console.log('Debug box style:', result.debugBox.styleLeft, result.debugBox.styleTop);
        console.log('Debug box transform:', result.debugBox.transform);
        console.log('\n=== MISMATCH ===');
        console.log('Position mismatch:', { x: result.mismatch.x.toFixed(2), y: result.mismatch.y.toFixed(2) });
        console.log('Size mismatch:', { width: result.mismatch.width.toFixed(2), height: result.mismatch.height.toFixed(2) });

        await page.screenshot({ path: 'test_results/yellow-debug-border.png' });

        // Yellow border should match element position
        expect(result.mismatch.x).toBeLessThan(2);
        expect(result.mismatch.y).toBeLessThan(2);
        expect(result.mismatch.width).toBeLessThan(2);
        expect(result.mismatch.height).toBeLessThan(2);
    });

    test('yellow debug borders at 90° rotation', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        await page.setViewportSize({ width: 800, height: 1200 });
        await goto(page);

        // Enable debug mode
        await page.evaluate(() => {
            AppState.debugMode = true;
        });

        // Add element at board center
        await page.evaluate(() => {
            const element = {
                id: 'yellow-border-test-90',
                type: 'cone',
                x: 2000,
                y: 1000,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(element);
            Elements.render();
        });

        await page.waitForTimeout(300);

        // Rotate board 90°
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        const menu = page.locator('#board-canvas-context-menu');
        await menu.waitFor({ state: 'visible', timeout: 3000 });
        await menu.locator('[data-action="rotate-right"]').click();

        await page.waitForTimeout(500);

        // Check yellow border position at 90°
        const result = await page.evaluate(() => {
            const element = document.getElementById('yellow-border-test-90');
            const debugBox = document.querySelector('.debug-tolerance-box[data-debug-id="yellow-border-test-90"]');

            if (!element || !debugBox) {
                return { error: 'Element or debug box not found' };
            }

            const elementRect = element.getBoundingClientRect();
            const debugRect = debugBox.getBoundingClientRect();
            const canvas = document.getElementById('board-canvas');
            const canvasRect = canvas.getBoundingClientRect();
            const playersLayer = document.getElementById('players-layer');
            const boardArea = document.getElementById('board-area');

            return {
                rotation: AppState.boardRotation,
                scaleFactor: AppState.boardRotationScaleFactor,
                canvas: {
                    rect: { x: canvasRect.x, y: canvasRect.y, width: canvasRect.width, height: canvasRect.height },
                    attr: { width: canvas.width, height: canvas.height }
                },
                element: {
                    rect: elementRect,
                    styleLeft: element.style.left,
                    styleTop: element.style.top,
                    transform: element.style.transform
                },
                debugBox: {
                    rect: debugRect,
                    styleLeft: debugBox.style.left,
                    styleTop: debugBox.style.top,
                    transform: debugBox.style.transform
                },
                playersLayer: {
                    transform: window.getComputedStyle(playersLayer).transform,
                    styleLeft: playersLayer.style.left,
                    styleTop: playersLayer.style.top
                },
                boardArea: {
                    transform: window.getComputedStyle(boardArea).transform,
                    styleLeft: boardArea.style.left,
                    styleTop: boardArea.style.top
                },
                mismatch: {
                    x: Math.abs(elementRect.x - debugRect.x),
                    y: Math.abs(elementRect.y - debugRect.y),
                    width: Math.abs(elementRect.width - debugRect.width),
                    height: Math.abs(elementRect.height - debugRect.height)
                }
            };
        });

        if (result.error) {
            throw new Error(result.error);
        }

        console.log('\n=== YELLOW DEBUG BORDER AT 90° ===');
        console.log('Rotation:', result.rotation);
        console.log('Scale factor:', result.scaleFactor);
        console.log('Canvas rect:', result.canvas.rect);
        console.log('Canvas attr:', result.canvas.attr);
        console.log('\nPlayers-layer:');
        console.log('  Transform:', result.playersLayer.transform);
        console.log('  Style:', result.playersLayer.styleLeft, result.playersLayer.styleTop);
        console.log('Board-area:');
        console.log('  Transform:', result.boardArea.transform);
        console.log('  Style:', result.boardArea.styleLeft, result.boardArea.styleTop);
        console.log('\nElement:');
        console.log('  Rect:', result.element.rect);
        console.log('  Style:', result.element.styleLeft, result.element.styleTop);
        console.log('  Transform:', result.element.transform);
        console.log('Debug box:');
        console.log('  Rect:', result.debugBox.rect);
        console.log('  Style:', result.debugBox.styleLeft, result.debugBox.styleTop);
        console.log('  Transform:', result.debugBox.transform);
        console.log('\nMismatch:', { x: result.mismatch.x.toFixed(2), y: result.mismatch.y.toFixed(2) });

        await page.screenshot({ path: 'test_results/yellow-debug-border-90deg.png' });

        expect(result.mismatch.x).toBeLessThan(2);
        expect(result.mismatch.y).toBeLessThan(2);
        expect(result.mismatch.width).toBeLessThan(2);
        expect(result.mismatch.height).toBeLessThan(2);
    });

    test('yellow debug borders at 180° rotation', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        await page.setViewportSize({ width: 800, height: 1200 });
        await goto(page);

        await page.evaluate(() => {
            AppState.debugMode = true;
        });

        await page.evaluate(() => {
            const element = {
                id: 'yellow-border-test-180',
                type: 'cone',
                x: 2000,
                y: 1000,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(element);
            Elements.render();
        });

        await page.waitForTimeout(300);

        // Rotate 180° (2 times right)
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        let menu = page.locator('#board-canvas-context-menu');
        await menu.waitFor({ state: 'visible', timeout: 3000 });
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(300);

        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        menu = page.locator('#board-canvas-context-menu');
        await menu.waitFor({ state: 'visible', timeout: 3000 });
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        const result = await page.evaluate(() => {
            const element = document.getElementById('yellow-border-test-180');
            const debugBox = document.querySelector('.debug-tolerance-box[data-debug-id="yellow-border-test-180"]');

            if (!element || !debugBox) {
                return { error: 'Element or debug box not found' };
            }

            const elementRect = element.getBoundingClientRect();
            const debugRect = debugBox.getBoundingClientRect();

            return {
                rotation: AppState.boardRotation,
                mismatch: {
                    x: Math.abs(elementRect.x - debugRect.x),
                    y: Math.abs(elementRect.y - debugRect.y),
                    width: Math.abs(elementRect.width - debugRect.width),
                    height: Math.abs(elementRect.height - debugRect.height)
                }
            };
        });

        if (result.error) {
            throw new Error(result.error);
        }

        console.log('\n=== YELLOW DEBUG BORDER AT 180° ===');
        console.log('Rotation:', result.rotation);
        console.log('Mismatch:', { x: result.mismatch.x.toFixed(2), y: result.mismatch.y.toFixed(2) });

        await page.screenshot({ path: 'test_results/yellow-debug-border-180deg.png' });

        expect(result.mismatch.x).toBeLessThan(2);
        expect(result.mismatch.y).toBeLessThan(2);
        expect(result.mismatch.width).toBeLessThan(2);
        expect(result.mismatch.height).toBeLessThan(2);
    });

    test('yellow debug borders at 270° rotation', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        await page.setViewportSize({ width: 800, height: 1200 });
        await goto(page);

        await page.evaluate(() => {
            AppState.debugMode = true;
        });

        await page.evaluate(() => {
            const element = {
                id: 'yellow-border-test-270',
                type: 'cone',
                x: 2000,
                y: 1000,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(element);
            Elements.render();
        });

        await page.waitForTimeout(300);

        // Rotate 270° (3 times right)
        const bb = await page.locator('#board-canvas').boundingBox();
        for (let i = 0; i < 3; i++) {
            await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
            const menu = page.locator('#board-canvas-context-menu');
            await menu.waitFor({ state: 'visible', timeout: 3000 });
            await menu.locator('[data-action="rotate-right"]').click();
            await page.waitForTimeout(300);
        }

        await page.waitForTimeout(500);

        const result = await page.evaluate(() => {
            const element = document.getElementById('yellow-border-test-270');
            const debugBox = document.querySelector('.debug-tolerance-box[data-debug-id="yellow-border-test-270"]');

            if (!element || !debugBox) {
                return { error: 'Element or debug box not found' };
            }

            const elementRect = element.getBoundingClientRect();
            const debugRect = debugBox.getBoundingClientRect();

            return {
                rotation: AppState.boardRotation,
                mismatch: {
                    x: Math.abs(elementRect.x - debugRect.x),
                    y: Math.abs(elementRect.y - debugRect.y),
                    width: Math.abs(elementRect.width - debugRect.width),
                    height: Math.abs(elementRect.height - debugRect.height)
                }
            };
        });

        if (result.error) {
            throw new Error(result.error);
        }

        console.log('\n=== YELLOW DEBUG BORDER AT 270° ===');
        console.log('Rotation:', result.rotation);
        console.log('Mismatch:', { x: result.mismatch.x.toFixed(2), y: result.mismatch.y.toFixed(2) });

        await page.screenshot({ path: 'test_results/yellow-debug-border-270deg.png' });

        expect(result.mismatch.x).toBeLessThan(2);
        expect(result.mismatch.y).toBeLessThan(2);
        expect(result.mismatch.width).toBeLessThan(2);
        expect(result.mismatch.height).toBeLessThan(2);
    });
});
