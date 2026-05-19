/**
 * Test that object stays aligned with cursor during drag at 90° rotation.
 * The object should stay under the same point on the cursor throughout the drag.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Cursor alignment during drag at 90°', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('ball stays under cursor point during drag at 90°', async ({ page }) => {
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

        // Get ball element bounding box
        const ballElement = page.locator(`[data-ball="${ballId}"].ball-svg`);
        const initialBox = await ballElement.boundingBox();

        // Click off-center (70% to the right and down)
        const clickOffsetX = initialBox.width * 0.2; // 20% from left edge
        const clickOffsetY = initialBox.height * 0.2; // 20% from top edge
        const clickX = initialBox.x + clickOffsetX;
        const clickY = initialBox.y + clickOffsetY;

        console.log('Clicking at offset (20%, 20%) from ball top-left');

        // Click to select
        await ballElement.click();
        await page.waitForTimeout(100);

        // Start drag
        await page.mouse.move(clickX, clickY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Drag to a new position (move 100px right and 50px down)
        const newMouseX = clickX + 100;
        const newMouseY = clickY + 50;

        await page.mouse.move(newMouseX, newMouseY, { steps: 10 });
        await page.waitForTimeout(100);

        // Get ball's new bounding box
        const newBox = await ballElement.boundingBox();

        // The ball should still be at the same OFFSET from the cursor
        // i.e., the point we clicked should still be at the same relative position
        const newClickPointX = newBox.x + clickOffsetX;
        const newClickPointY = newBox.y + clickOffsetY;

        console.log('Original click point:', { x: clickX, y: clickY });
        console.log('New cursor position:', { x: newMouseX, y: newMouseY });
        console.log('New ball offset point:', { x: newClickPointX, y: newClickPointY });
        console.log('Difference:', {
            dx: newClickPointX - newMouseX,
            dy: newClickPointY - newMouseY
        });

        await page.mouse.up();

        // The ball should have moved so that the click point stays under the cursor
        // Allow 5px tolerance for rounding errors
        expect(Math.abs(newClickPointX - newMouseX)).toBeLessThan(5);
        expect(Math.abs(newClickPointY - newMouseY)).toBeLessThan(5);
    });
});
