/**
 * Tests for actual visual position of elements after board rotation.
 * These tests check where elements appear on screen, not just their data coordinates.
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

test.describe('Visual position after rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('ball appears at correct visual position before and after 90° rotation', async ({ page }) => {
        // Create a ball at the center of the board
        const result = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: AppState.boardWidth / 2,  // Center: 2250
                y: AppState.boardHeight / 2, // Center: 1250
                color: '#ff0000',
                visible: true
            };
            AppState.balls.push(ball);
            Balls.render();

            // Verify ball was rendered
            const svg = document.querySelector(`[data-ball="${ball.id}"].ball-svg`);
            return {
                ballId: ball.id,
                rendered: !!svg,
                ballsInState: AppState.balls.length,
                svgsInDOM: document.querySelectorAll('.ball-svg').length,
                initialX: ball.x,
                initialY: ball.y,
                boardWidth: AppState.boardWidth,
                boardHeight: AppState.boardHeight
            };
        });

        const ballId = result.ballId;
        expect(result.rendered).toBe(true);
        console.log('Initial ball coords:', result.initialX, result.initialY);
        console.log('Board size:', result.boardWidth, 'x', result.boardHeight);

        // Get visual position before rotation
        const positionBefore = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-ball="${id}"].ball-svg`);
            const container = document.querySelector('.board-container');
            if (!svg || !container) {
                return {
                    error: `Missing elements - svg: ${!!svg}, container: ${!!container}`,
                    svgCount: document.querySelectorAll('.ball-svg').length,
                    ballsInState: AppState.balls.length
                };
            }
            const rect = svg.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            return {
                centerX: rect.left + rect.width / 2 - containerRect.left,
                centerY: rect.top + rect.height / 2 - containerRect.top,
                width: rect.width,
                height: rect.height,
                containerWidth: containerRect.width,
                containerHeight: containerRect.height
            };
        }, ballId);

        if (positionBefore.error) {
            throw new Error(`Position check failed: ${JSON.stringify(positionBefore)}`);
        }

        // Ball at board center should appear at container center
        const expectedCenterX = positionBefore.containerWidth / 2;
        const expectedCenterY = positionBefore.containerHeight / 2;

        expect(Math.abs(positionBefore.centerX - expectedCenterX)).toBeLessThan(5);
        expect(Math.abs(positionBefore.centerY - expectedCenterY)).toBeLessThan(5);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Get visual position after rotation
        const positionAfter = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-ball="${id}"].ball-svg`);
            if (!svg) {
                // Debug: check what happened to the ball
                const ball = AppState.balls.find(b => b.id === id);
                const allBalls = document.querySelectorAll('.ball-svg');
                throw new Error(`Ball SVG not found! Ball in state: ${!!ball}, visible: ${ball?.visible}, total ball SVGs: ${allBalls.length}`);
            }
            const rect = svg.getBoundingClientRect();
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            const ball = AppState.balls.find(b => b.id === id);
            const ballSvg = document.querySelector(`[data-ball="${id}"].ball-svg`);
            return {
                centerX: rect.left + rect.width / 2 - containerRect.left,
                centerY: rect.top + rect.height / 2 - containerRect.top,
                width: rect.width,
                height: rect.height,
                ballX: ball.x,
                ballY: ball.y,
                boardRotation: AppState.boardRotation,
                containerWidth: containerRect.width,
                containerHeight: containerRect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor,
                referenceScale: AppState.referenceScale,
                svgLeft: parseFloat(ballSvg.style.left),
                svgTop: parseFloat(ballSvg.style.top),
                canvasWidth: AppState.canvas.width,
                canvasHeight: AppState.canvas.height
            };
        }, ballId);

        console.log('After rotation - ball coords:', positionAfter.ballX, positionAfter.ballY);
        console.log('After rotation - board rotation:', positionAfter.boardRotation);
        console.log('After rotation - container size:', positionAfter.containerWidth, 'x', positionAfter.containerHeight);
        console.log('After rotation - canvas size:', positionAfter.canvasWidth, 'x', positionAfter.canvasHeight);
        console.log('After rotation - scale factor:', positionAfter.boardRotationScaleFactor);
        console.log('After rotation - reference scale:', positionAfter.referenceScale);
        console.log('After rotation - SVG position:', positionAfter.svgLeft, positionAfter.svgTop);
        console.log('After rotation - visual center:', positionAfter.centerX, positionAfter.centerY);
        console.log('Expected visual center (container/2):', expectedCenterX, expectedCenterY);
        console.log('Visual offset:', positionAfter.centerX - expectedCenterX, positionAfter.centerY - expectedCenterY);

        // Ball should still be at center after rotation
        expect(Math.abs(positionAfter.centerX - expectedCenterX)).toBeLessThan(5);
        expect(Math.abs(positionAfter.centerY - expectedCenterY)).toBeLessThan(5);

        // Size should scale proportionally with board layer (~0.556 at 90°)
        const sizeRatio = positionAfter.width / positionBefore.width;
        const expectedRatio = await page.evaluate(() => AppState.boardRotationScaleFactor || 1);
        expect(Math.abs(sizeRatio - expectedRatio)).toBeLessThan(0.05);
    });

    test('ball at top-left moves correctly after 90° rotation', async ({ page }) => {
        // Create a ball at top-left quadrant
        const ballId = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 500,   // Left side
                y: 300,   // Top
                color: '#00ff00',
                visible: true
            };
            AppState.balls.push(ball);
            Balls.render();
            return ball.id;
        });

        // Get visual position before rotation
        const before = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-ball="${id}"].ball-svg`);
            const rect = svg.getBoundingClientRect();
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            return {
                left: rect.left - containerRect.left,
                top: rect.top - containerRect.top,
                containerWidth: containerRect.width,
                containerHeight: containerRect.height
            };
        }, ballId);

        // Ball should be in top-left quadrant
        expect(before.left).toBeLessThan(before.containerWidth / 2);
        expect(before.top).toBeLessThan(before.containerHeight / 2);

        // Rotate board 90° right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // After 90° rotation right, a ball that was at top-left should move to top-right
        const after = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-ball="${id}"].ball-svg`);
            const rect = svg.getBoundingClientRect();
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            return {
                left: rect.left - containerRect.left,
                top: rect.top - containerRect.top,
                containerWidth: containerRect.width,
                containerHeight: containerRect.height
            };
        }, ballId);

        // After rotation, ball should be in top-right quadrant
        expect(after.left).toBeGreaterThan(after.containerWidth / 2);
        expect(after.top).toBeLessThan(after.containerHeight / 2);
    });

    test('element size stays consistent after rotation', async ({ page }) => {
        const coneId = await page.evaluate(() => {
            const cone = {
                id: `element-${AppState.nextElementId++}`,
                type: 'cone',
                x: 2250,
                y: 1250,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(cone);
            Elements.render();
            return cone.id;
        });

        const sizeBefore = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const rect = svg.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        }, coneId);

        // Rotate 90°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const sizeAfter = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const rect = svg.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        }, coneId);

        // Cone is non-rotatable but scales with board layer (~0.556 at 90°)
        // Dimensions don't swap (cone stays upright), but size scales down
        const boardScale = await page.evaluate(() => AppState.boardRotationScaleFactor || 1);
        expect(Math.abs(sizeAfter.width - sizeBefore.width * boardScale)).toBeLessThan(sizeBefore.width * 0.15);
        expect(Math.abs(sizeAfter.height - sizeBefore.height * boardScale)).toBeLessThan(sizeBefore.height * 0.15);
    });
});
