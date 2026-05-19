/**
 * Test to verify touch borders (red lines) match element positions at 90° rotation.
 * Tests the touch overlays for balls and plates.
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

test.describe('Touch borders at 90° rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);

        // Enable touch mode and show touch borders
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
            document.body.classList.add('show-touch-borders');
        });
    });

    test('ball touch overlay matches ball SVG position at 90°', async ({ page }) => {
        // Create a ball
        const ballId = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2250,
                y: 1250,
                color: '#ffffff',
                visible: true
            };
            AppState.balls.push(ball);
            Balls.render();
            return ball.id;
        });

        await page.waitForTimeout(200);

        // Rotate board to 90°
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(500);

        // Get ball SVG position
        const ballRect = await page.evaluate((id) => {
            const ballSvg = document.getElementById(id);
            return {
                left: parseFloat(ballSvg.style.left),
                top: parseFloat(ballSvg.style.top)
            };
        }, ballId);

        // Get touch overlay position
        const overlayRect = await page.evaluate((id) => {
            const overlay = document.querySelector(`.touch-overlay[data-ball="${id}"]`);
            if (!overlay) return null;
            return {
                left: parseFloat(overlay.style.left),
                top: parseFloat(overlay.style.top)
            };
        }, ballId);

        console.log('Ball SVG position:', ballRect);
        console.log('Touch overlay position:', overlayRect);

        expect(overlayRect).not.toBeNull();

        // Touch overlay should match ball SVG position exactly
        expect(overlayRect.left).toBeCloseTo(ballRect.left, 1);
        expect(overlayRect.top).toBeCloseTo(ballRect.top, 1);
    });

    test('plate touch overlay matches plate SVG position at 90°', async ({ page }) => {
        // Create a plate
        const plateId = await page.evaluate(() => {
            const plate = {
                id: `plate-${AppState.nextPlateId++}`,
                x: 2250,
                y: 1250,
                color: '#FFD700',
                visible: true
            };
            AppState.plates.push(plate);
            Plates.render();
            return plate.id;
        });

        await page.waitForTimeout(200);

        // Rotate board to 90°
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(500);

        // Get plate SVG position
        const plateRect = await page.evaluate((id) => {
            const plateSvg = document.getElementById(id);
            return {
                left: parseFloat(plateSvg.style.left),
                top: parseFloat(plateSvg.style.top)
            };
        }, plateId);

        // Get touch overlay position
        const overlayRect = await page.evaluate((id) => {
            const overlay = document.querySelector(`.touch-overlay[data-plate="${id}"]`);
            if (!overlay) return null;
            return {
                left: parseFloat(overlay.style.left),
                top: parseFloat(overlay.style.top)
            };
        }, plateId);

        console.log('Plate SVG position:', plateRect);
        console.log('Touch overlay position:', overlayRect);

        expect(overlayRect).not.toBeNull();

        // Touch overlay should match plate SVG position exactly
        expect(overlayRect.left).toBeCloseTo(plateRect.left, 1);
        expect(overlayRect.top).toBeCloseTo(plateRect.top, 1);
    });

    test('ball touch overlay matches after drag at 90°', async ({ page }) => {
        // Create a ball
        const ballId = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2250,
                y: 1250,
                color: '#ffffff',
                visible: true
            };
            AppState.balls.push(ball);
            Balls.render();
            return ball.id;
        });

        await page.waitForTimeout(200);

        // Rotate board to 90°
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(500);

        // In touch mode, click the overlay not the SVG
        const overlayElement = page.locator(`.touch-overlay[data-ball="${ballId}"]`);
        await overlayElement.click();
        await page.waitForTimeout(50);

        const box = await overlayElement.boundingBox();
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;

        await overlayElement.hover();
        await page.mouse.down();
        await page.mouse.move(startX + 100, startY + 100, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Get positions after drag
        const positions = await page.evaluate((id) => {
            const ballSvg = document.getElementById(id);
            const overlay = document.querySelector(`.touch-overlay[data-ball="${id}"]`);

            return {
                ball: {
                    left: parseFloat(ballSvg.style.left),
                    top: parseFloat(ballSvg.style.top)
                },
                overlay: overlay ? {
                    left: parseFloat(overlay.style.left),
                    top: parseFloat(overlay.style.top)
                } : null
            };
        }, ballId);

        console.log('After drag - Ball:', positions.ball);
        console.log('After drag - Overlay:', positions.overlay);

        expect(positions.overlay).not.toBeNull();

        // Touch overlay should still match ball position after drag
        expect(positions.overlay.left).toBeCloseTo(positions.ball.left, 1);
        expect(positions.overlay.top).toBeCloseTo(positions.ball.top, 1);
    });
});
