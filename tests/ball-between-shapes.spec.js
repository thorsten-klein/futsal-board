import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Ball Between Shapes Selection Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#board-area', { state: 'attached' });
        await page.waitForTimeout(300);

        // Enable select tool
        await page.evaluate(() => {
            AppState.currentTool = 'select';
        });
    });

    test('TOUCH MODE: ball between two ellipses should be selectable', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create two ellipses with a ball in between
        await page.evaluate(() => {
            // Left ellipse
            const ellipse1 = {
                id: 'ellipse-left',
                type: 'ellipse',
                x: 900,
                y: 1000,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };

            // Right ellipse
            const ellipse2 = {
                id: 'ellipse-right',
                type: 'ellipse',
                x: 1100,
                y: 1000,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#e74c3c',
                fillColor: 'rgba(231, 76, 60, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };

            AppState.shapes.push(ellipse1, ellipse2);
            AppState.saveToLocalStorage();
            Shapes.render();

            // Ball in the middle (use addBall to properly create it)
            AppState.addBall('#f39c12', 1000, 1000); // x, y exactly between the two ellipses
            Balls.render();
        });

        await page.waitForTimeout(300);

        // Get the ball ID (auto-generated)
        const ballId = await page.evaluate(() => AppState.balls[0]?.id);

        // Verify all elements are visible
        const ellipse1Svg = page.locator('svg[data-shape="ellipse-left"]');
        const ellipse2Svg = page.locator('svg[data-shape="ellipse-right"]');
        const ballSvg = page.locator(`svg[data-ball="${ballId}"]`);

        await expect(ellipse1Svg).toBeVisible();
        await expect(ellipse2Svg).toBeVisible();
        await expect(ballSvg).toBeVisible();

        // Get positions
        const box1 = await ellipse1Svg.boundingBox();
        const box2 = await ellipse2Svg.boundingBox();
        const ballBox = await ballSvg.boundingBox();


        // Click on the ball
        const ballCenterX = ballBox.x + ballBox.width / 2;
        const ballCenterY = ballBox.y + ballBox.height / 2;


        await page.mouse.click(ballCenterX, ballCenterY);
        await page.waitForTimeout(50);

        // Check what got selected
        const selectedBall = await page.evaluate(() => AppState.selectedBall);
        const selectedShape = await page.evaluate(() => AppState.selectedShape);


        // The ball should be selected, NOT a shape
        expect(selectedBall?.id).toBe(ballId);
        expect(selectedShape).toBeNull();

        // Verify ball can be dragged
        const initialBallBox = await ballSvg.boundingBox();

        await page.mouse.move(ballCenterX, ballCenterY);
        await page.mouse.down();
        await page.mouse.move(ballCenterX + 50, ballCenterY + 50, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        const finalBallBox = await ballSvg.boundingBox();
        const ballMovedX = finalBallBox.x - initialBallBox.x;
        const ballMovedY = finalBallBox.y - initialBallBox.y;


        // Ball should have moved
        expect(Math.abs(ballMovedX - 50)).toBeLessThan(10);
        expect(Math.abs(ballMovedY - 50)).toBeLessThan(10);
    });

    test('TOUCH MODE: ball very close to ellipse edge should still be selectable', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create one ellipse with ball right next to it
        await page.evaluate(() => {
            const ellipse = {
                id: 'ellipse-nearby',
                type: 'ellipse',
                x: 1000,
                y: 1000,
                width: 300,
                height: 200,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };

            AppState.shapes.push(ellipse);
            AppState.saveToLocalStorage();
            Shapes.render();

            // Ball positioned close to the right edge of the ellipse
            AppState.addBall('#f39c12', 1180, 1000); // 180cm from ellipse center
            Balls.render();
        });

        await page.waitForTimeout(300);

        const ballId = await page.evaluate(() => AppState.balls[0]?.id);

        const ballSvg = page.locator(`svg[data-ball="${ballId}"]`);
        await expect(ballSvg).toBeVisible();

        const ballBox = await ballSvg.boundingBox();
        const ballCenterX = ballBox.x + ballBox.width / 2;
        const ballCenterY = ballBox.y + ballBox.height / 2;


        await page.mouse.click(ballCenterX, ballCenterY);
        await page.waitForTimeout(50);

        const selectedBall = await page.evaluate(() => AppState.selectedBall);
        const selectedShape = await page.evaluate(() => AppState.selectedShape);


        // The ball should be selected, NOT the ellipse
        expect(selectedBall?.id).toBe(ballId);
        expect(selectedShape).toBeNull();
    });

    test('TOUCH MODE: clicking on touch overlay between ball and shape should select closest object', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create shape and ball very close together
        await page.evaluate(() => {
            const ellipse = {
                id: 'ellipse-close',
                type: 'ellipse',
                x: 1000,
                y: 1000,
                width: 150,
                height: 150,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };

            AppState.shapes.push(ellipse);
            AppState.saveToLocalStorage();
            Shapes.render();

            // Ball very close to ellipse (overlapping touch areas)
            AppState.addBall('#f39c12', 1100, 1000); // 100cm from ellipse center
            Balls.render();
        });

        await page.waitForTimeout(300);

        const ballId = await page.evaluate(() => AppState.balls[0]?.id);

        // Get the touch overlays
        const shapeOverlay = page.locator('.touch-overlay[data-shape="ellipse-close"]');
        const ballOverlay = page.locator(`.touch-overlay[data-ball="${ballId}"]`);

        await expect(shapeOverlay).toBeVisible();
        await expect(ballOverlay).toBeVisible();

        const shapeOverlayBox = await shapeOverlay.boundingBox();
        const ballOverlayBox = await ballOverlay.boundingBox();


        // Calculate a point between the overlays
        const betweenX = (shapeOverlayBox.x + shapeOverlayBox.width + ballOverlayBox.x) / 2;
        const betweenY = (shapeOverlayBox.y + shapeOverlayBox.height / 2 + ballOverlayBox.y + ballOverlayBox.height / 2) / 2;


        // Check what element is at that point
        const elementAtPoint = await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return {
                tagName: el?.tagName,
                className: el?.className,
                dataShape: el?.dataset?.shape,
                dataBall: el?.dataset?.ball
            };
        }, { x: betweenX, y: betweenY });


        await page.mouse.click(betweenX, betweenY);
        await page.waitForTimeout(50);

        const selectedBall = await page.evaluate(() => AppState.selectedBall);
        const selectedShape = await page.evaluate(() => AppState.selectedShape);


        // Exactly ONE object should be selected (the closest one)
        const selectionCount = (selectedBall ? 1 : 0) + (selectedShape ? 1 : 0);
        expect(selectionCount).toBe(1);
    });
});
