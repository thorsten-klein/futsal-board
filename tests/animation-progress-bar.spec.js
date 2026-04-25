/**
 * Animation progress bar tests — verify that the scrubber bar shows
 * current playback progress and that clicking it seeks to the correct position.
 * Also verifies that clicking the board during animation returns to the last frame.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

/** Create a child board with a moved player, setting up a single-frame animation. */
async function setupAnimation(page) {
    await addPlayer(page);
    const playerId = await page.evaluate(() => AppState.players[0].id);

    // Record where the player starts (parent board position)
    const parentPos = await page.evaluate(({ playerId }) => {
        const p = AppState.players.find(p => p.id === playerId);
        return { x: p.x, y: p.y };
    }, { playerId });

    // Create child board and move player
    await page.evaluate(() => {
        AppState.saveCurrentBoard();
        const childId = AppState.createChildBoard(AppState.currentBoardId);
        if (childId) {
            AppState.loadBoard(childId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }
    });
    await page.waitForTimeout(300);

    const childPos = await page.evaluate(({ playerId }) => {
        const p = AppState.players.find(p => p.id === playerId);
        p.x = 2500;
        p.y = 1500;
        p._explicitlySet = true;
        AppState.saveCurrentBoard();
        Players.render();
        Animations.renderParentPaths();
        return { x: p.x, y: p.y };
    }, { playerId });

    await page.waitForTimeout(200);

    // Use a short animation duration so tests don't have to wait long
    await page.evaluate(() => { AppState.animationDuration = 4000; });

    return { playerId, parentPos, childPos };
}

test.describe('Animation Progress Bar', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('progress bar fill advances during playback', async ({ page }) => {
        await setupAnimation(page);

        const fill = page.locator('#animation-progress-fill');

        // Initially at 100% (child board with no descendants is at end of hierarchy)
        await expect(fill).toHaveCSS('width', '350px'); // 100% of 350px container

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(600);

        // Fill should now be > 0%
        const widthStr = await fill.evaluate(el => el.style.width);
        expect(parseFloat(widthStr)).toBeGreaterThan(0);

        // Pause to clean up
        await page.locator('#btn-play-pause').click();
    });

    test('clicking progress bar seeks animation to clicked position', async ({ page }) => {
        const { playerId, parentPos, childPos } = await setupAnimation(page);

        // Start, let it run a bit, then pause so we have a built chain
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(800);
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        // Click at ~10% along the progress bar
        const container = page.locator('#animation-progress-container');
        const box = await container.boundingBox();
        await page.mouse.click(box.x + box.width * 0.1, box.y + box.height / 2);
        await page.waitForTimeout(150);

        // pausedProgress should be close to 0.1
        const progress = await page.evaluate(() => Animations.pausedProgress);
        expect(progress).toBeGreaterThan(0.05);
        expect(progress).toBeLessThan(0.2);

        // Progress bar fill should reflect the seek position
        const fillWidth = await page.evaluate(() => {
            const fill = document.getElementById('animation-progress-fill');
            return parseFloat(fill.style.width);
        });
        expect(fillWidth).toBeGreaterThan(5);
        expect(fillWidth).toBeLessThan(20);

        // Player should be between parent and child positions (closer to parent)
        const playerPos = await page.evaluate(({ playerId }) => {
            const p = AppState.players.find(p => p.id === playerId);
            return { x: p.x, y: p.y };
        }, { playerId });

        // At 10% the player should be much closer to parent than child
        const distFromParent = Math.hypot(playerPos.x - parentPos.x, playerPos.y - parentPos.y);
        const distFromChild = Math.hypot(playerPos.x - childPos.x, playerPos.y - childPos.y);
        expect(distFromParent).toBeLessThan(distFromChild);
    });

    test('clicking progress bar before playing starts animation at that position', async ({ page }) => {
        await setupAnimation(page);

        // Click at 50% without ever having played
        const container = page.locator('#animation-progress-container');
        const box = await container.boundingBox();
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
        await page.waitForTimeout(150);

        // pausedProgress should be around 0.5
        const progress = await page.evaluate(() => Animations.pausedProgress);
        expect(progress).toBeGreaterThan(0.4);
        expect(progress).toBeLessThan(0.6);

        // Animation should NOT be playing (just seeked, not started)
        const isAnimating = await page.evaluate(() => AppState.isAnimating);
        expect(isAnimating).toBe(false);
    });

    test('progress bar resets to 0 when going to start', async ({ page }) => {
        await setupAnimation(page);

        // Start and let it run, then pause
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(600);
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        // Go to start
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(150);

        // Progress bar should be at 0%
        const fillWidth = await page.evaluate(() => {
            const fill = document.getElementById('animation-progress-fill');
            return parseFloat(fill.style.width || '0');
        });
        expect(fillWidth).toBe(0);
    });

    test('progress bar shows 100% at frame end', async ({ page }) => {
        await setupAnimation(page);

        // Click go-to-frame-end button
        await page.locator('#btn-stop').click();
        await page.waitForTimeout(200);

        const fillWidth = await page.evaluate(() => {
            const fill = document.getElementById('animation-progress-fill');
            return parseFloat(fill.style.width || '0');
        });
        expect(fillWidth).toBe(100);
    });

    test('dragging the dot seeks to the dragged position', async ({ page }) => {
        const { playerId, parentPos, childPos } = await setupAnimation(page);

        // Start, pause midway to build the animation chain
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(800);
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        const dot = page.locator('#animation-progress-dot');
        const container = page.locator('#animation-progress-container');
        const containerBox = await container.boundingBox();

        // Drag dot from current position to near the beginning (5%)
        const dotBox = await dot.boundingBox();
        const dotCenterX = dotBox.x + dotBox.width / 2;
        const dotCenterY = dotBox.y + dotBox.height / 2;
        const targetX = containerBox.x + containerBox.width * 0.05;

        await page.mouse.move(dotCenterX, dotCenterY);
        await page.mouse.down();
        await page.mouse.move(targetX, dotCenterY, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        // pausedProgress should be close to 0.05
        const progress = await page.evaluate(() => Animations.pausedProgress);
        expect(progress).toBeGreaterThan(0);
        expect(progress).toBeLessThan(0.2);

        // Dot should be near the left
        const dotStyle = await page.evaluate(() => {
            return document.getElementById('animation-progress-dot').style.left;
        });
        expect(parseFloat(dotStyle)).toBeLessThan(15);

        // Animation should remain paused after drag
        const isAnimating = await page.evaluate(() => AppState.isAnimating);
        expect(isAnimating).toBe(false);
    });

    test('dot position matches fill width', async ({ page }) => {
        await setupAnimation(page);

        // Start animation and let it run
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(600);
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        const [fillWidth, dotLeft] = await page.evaluate(() => {
            const fill = document.getElementById('animation-progress-fill');
            const dot = document.getElementById('animation-progress-dot');
            return [parseFloat(fill.style.width), parseFloat(dot.style.left)];
        });

        expect(fillWidth).toBeGreaterThan(0);
        expect(dotLeft).toBeCloseTo(fillWidth, 1);
    });

    test('clicking board during animation returns to last frame', async ({ page }) => {
        const { playerId, childPos } = await setupAnimation(page);

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(400);

        // Verify animation is running
        const isAnimating = await page.evaluate(() => AppState.isAnimating);
        expect(isAnimating).toBe(true);

        // Click the board area (avoiding the animation overlay at the top)
        const boardCanvas = page.locator('#board-canvas');
        const box = await boardCanvas.boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.8);
        await page.waitForTimeout(300);

        // Animation should be stopped
        const isStillAnimating = await page.evaluate(() => AppState.isAnimating);
        expect(isStillAnimating).toBe(false);

        // Player should be at the child board (last frame) position
        const playerPos = await page.evaluate(({ playerId }) => {
            const p = AppState.players.find(p => p.id === playerId);
            return { x: p.x, y: p.y };
        }, { playerId });

        expect(playerPos.x).toBeCloseTo(childPos.x, -1);
        expect(playerPos.y).toBeCloseTo(childPos.y, -1);
    });
});
