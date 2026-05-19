/**
 * Test to verify debug borders (red lines) are correctly positioned at 90° rotation.
 * Tests balls and plates specifically.
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

test.describe('Debug borders at 90° rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);

        // Enable debug mode and touch borders
        await page.evaluate(() => {
            AppState.debugMode = true;
            document.body.classList.add('show-touch-borders');
        });
    });

    test('ball debug border matches ball position at 90°', async ({ page }) => {
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

        // Get ball element position
        const ballRect = await page.evaluate((id) => {
            const ballEl = document.getElementById(id);
            const rect = ballEl.getBoundingClientRect();
            const containerRect = document.querySelector('.board-container').getBoundingClientRect();
            return {
                left: rect.left - containerRect.left,
                top: rect.top - containerRect.top,
                width: rect.width,
                height: rect.height
            };
        }, ballId);

        // Get debug box position
        const debugRect = await page.evaluate((id) => {
            const debugBox = document.querySelector(`.debug-tolerance-box[data-debug-id="${id}"][data-debug-type="ball"]`);
            if (!debugBox) return null;
            const left = parseFloat(debugBox.style.left);
            const top = parseFloat(debugBox.style.top);
            const width = parseFloat(debugBox.style.width);
            const height = parseFloat(debugBox.style.height);
            return { left, top, width, height };
        }, ballId);

        console.log('Ball rect:', ballRect);
        console.log('Debug rect:', debugRect);

        expect(debugRect).not.toBeNull();

        // Debug box should match ball position (within 2px tolerance)
        expect(Math.abs(debugRect.left - ballRect.left)).toBeLessThan(2);
        expect(Math.abs(debugRect.top - ballRect.top)).toBeLessThan(2);
        expect(Math.abs(debugRect.width - ballRect.width)).toBeLessThan(2);
        expect(Math.abs(debugRect.height - ballRect.height)).toBeLessThan(2);
    });

    test('plate debug border matches plate position at 90°', async ({ page }) => {
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

        // Get plate element position
        const plateRect = await page.evaluate((id) => {
            const plateEl = document.getElementById(id);
            const rect = plateEl.getBoundingClientRect();
            const containerRect = document.querySelector('.board-container').getBoundingClientRect();
            return {
                left: rect.left - containerRect.left,
                top: rect.top - containerRect.top,
                width: rect.width,
                height: rect.height
            };
        }, plateId);

        // Get debug box position
        const debugRect = await page.evaluate((id) => {
            const debugBox = document.querySelector(`.debug-tolerance-box[data-debug-id="${id}"][data-debug-type="plate"]`);
            if (!debugBox) return null;
            const left = parseFloat(debugBox.style.left);
            const top = parseFloat(debugBox.style.top);
            const width = parseFloat(debugBox.style.width);
            const height = parseFloat(debugBox.style.height);
            return { left, top, width, height };
        }, plateId);

        console.log('Plate rect:', plateRect);
        console.log('Debug rect:', debugRect);

        expect(debugRect).not.toBeNull();

        // Debug box should match plate position (within 2px tolerance)
        expect(Math.abs(debugRect.left - plateRect.left)).toBeLessThan(2);
        expect(Math.abs(debugRect.top - plateRect.top)).toBeLessThan(2);
        expect(Math.abs(debugRect.width - plateRect.width)).toBeLessThan(2);
        expect(Math.abs(debugRect.height - plateRect.height)).toBeLessThan(2);
    });

    test('ball debug border updates correctly during drag at 90°', async ({ page }) => {
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

        // Get ball element
        const ballElement = page.locator(`[data-ball="${ballId}"].ball-svg`);

        // Click to select, then start dragging
        await ballElement.click();
        await page.waitForTimeout(50);

        const box = await ballElement.boundingBox();
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const endX = startX + 50;
        const endY = startY + 50;

        // Start drag
        await ballElement.hover();
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 5 });

        // Get positions mid-drag
        const positions = await page.evaluate((id) => {
            const ballEl = document.getElementById(id);
            const debugBox = document.querySelector(`.debug-tolerance-box[data-debug-id="${id}"][data-debug-type="ball"]`);
            const containerRect = document.querySelector('.board-container').getBoundingClientRect();

            const ballRect = ballEl.getBoundingClientRect();

            return {
                ball: {
                    left: ballRect.left - containerRect.left,
                    top: ballRect.top - containerRect.top,
                    width: ballRect.width,
                    height: ballRect.height
                },
                debug: debugBox ? {
                    left: parseFloat(debugBox.style.left),
                    top: parseFloat(debugBox.style.top),
                    width: parseFloat(debugBox.style.width),
                    height: parseFloat(debugBox.style.height)
                } : null
            };
        }, ballId);

        console.log('Mid-drag positions:', positions);

        await page.mouse.up();

        // Debug box should still match ball position during drag
        expect(positions.debug).not.toBeNull();
        expect(Math.abs(positions.debug.left - positions.ball.left)).toBeLessThan(2);
        expect(Math.abs(positions.debug.top - positions.ball.top)).toBeLessThan(2);
    });
});
