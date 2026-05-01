import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Player on Ball Touch Mode Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);
    });

    test('TOUCH MODE: player overlapping a ball should be draggable', async ({ page }) => {
        // Enable TOUCH MODE
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Add a ball
        await page.locator('.ball-template').first().click();
        await page.waitForTimeout(300);

        // Get ball position
        const ballEl = page.locator('[data-ball]').first();
        await expect(ballEl).toBeVisible();
        const ballBox = await ballEl.boundingBox();
        const ballCenterX = ballBox.x + ballBox.width / 2;
        const ballCenterY = ballBox.y + ballBox.height / 2;


        // Add a player
        await page.locator('.team-player-template').first().click();
        await page.waitForTimeout(300);

        const playerEl = page.locator('[data-player-id]').first();
        await expect(playerEl).toBeVisible();

        // Move player to overlap the ball (same position)
        // First select the player
        const playerBox = await playerEl.boundingBox();
        await page.mouse.click(playerBox.x + playerBox.width / 2, playerBox.y + playerBox.height / 2);
        await page.waitForTimeout(200);

        // Drag player to ball's position
        await page.mouse.down();
        await page.mouse.move(ballCenterX, ballCenterY, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(300);

        // Verify player is now on top of the ball
        const playerBoxAfter = await playerEl.boundingBox();
        const playerCenterX = playerBoxAfter.x + playerBoxAfter.width / 2;
        const playerCenterY = playerBoxAfter.y + playerBoxAfter.height / 2;


        const distX = Math.abs(playerCenterX - ballCenterX);
        const distY = Math.abs(playerCenterY - ballCenterY);


        // They should be very close (overlapping)
        expect(distX).toBeLessThan(30);
        expect(distY).toBeLessThan(30);

        // Now try to drag the player again (this is where the bug occurs)

        const beforeDragPlayerBox = await playerEl.boundingBox();
        const beforeDragBallBox = await ballEl.boundingBox();

        // Click on the center where both player and ball are overlapping
        await page.mouse.move(playerCenterX, playerCenterY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Check what got selected/dragged
        const selectedInfo = await page.evaluate(() => {
            return {
                player: AppState.selectedPlayer ? AppState.selectedPlayer.id : null,
                ball: AppState.selectedBall ? AppState.selectedBall.id : null,
                draggedPlayer: AppState.draggedPlayer ? AppState.draggedPlayer.id : null,
                draggedBall: AppState.draggedBall ? AppState.draggedBall.id : null
            };
        });


        // Move 40px to the right
        await page.mouse.move(playerCenterX + 40, playerCenterY, { steps: 3 });
        await page.waitForTimeout(100);

        const afterDragPlayerBox = await playerEl.boundingBox();
        const afterDragBallBox = await ballEl.boundingBox();

        const playerMovedX = afterDragPlayerBox.x - beforeDragPlayerBox.x;
        const playerMovedY = afterDragPlayerBox.y - beforeDragPlayerBox.y;
        const ballMovedX = afterDragBallBox.x - beforeDragBallBox.x;
        const ballMovedY = afterDragBallBox.y - beforeDragBallBox.y;


        const playerMoved = Math.abs(playerMovedX) > 10;
        const ballMoved = Math.abs(ballMovedX) > 10;


        // THE BUG: Player should move, not the ball
        if (!playerMoved && ballMoved) {
        } else if (!playerMoved && !ballMoved) {
        }

        // Player should have moved, ball should not
        expect(playerMoved).toBe(true);
        expect(ballMoved).toBe(false);

        await page.mouse.up();
    });

    test('Check element stacking at point (player should be clickable when on ball)', async ({ page }) => {
        // Enable TOUCH MODE
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Add a ball
        await page.locator('.ball-template').first().click();
        await page.waitForTimeout(300);

        const ballEl = page.locator('[data-ball]').first();
        const ballBox = await ballEl.boundingBox();
        const ballCenterX = ballBox.x + ballBox.width / 2;
        const ballCenterY = ballBox.y + ballBox.height / 2;

        // Add a player
        await page.locator('.team-player-template').first().click();
        await page.waitForTimeout(300);

        const playerEl = page.locator('[data-player-id]').first();

        // Move player onto ball
        const playerBox = await playerEl.boundingBox();
        await page.mouse.click(playerBox.x + playerBox.width / 2, playerBox.y + playerBox.height / 2);
        await page.waitForTimeout(200);

        await page.mouse.down();
        await page.mouse.move(ballCenterX, ballCenterY, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(300);

        // Check which element is at the center point
        const topElement = await page.evaluate((pos) => {
            const el = document.elementFromPoint(pos.x, pos.y);
            return {
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                dataset: el.dataset || {}
            };
        }, { x: ballCenterX, y: ballCenterY });


        // In touch mode, there's a touch-overlay for players with data-player-id
        // Check if player or its overlay is on top
        const isPlayerOnTop = topElement.className.includes('player') ||
                             topElement.className.includes('touch-overlay') ||
                             topElement.dataset.playerId;


        if (!isPlayerOnTop) {
        }

        expect(isPlayerOnTop).toBe(true);
    });
});
