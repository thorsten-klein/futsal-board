/**
 * Test that inherited elements on child boards are shown with the same brightness
 * as on the parent board (bug: they appear dimmer/less bright).
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Create a child board and switch to it programmatically */
async function createAndSwitchToChildBoard(page) {
    return await page.evaluate(() => {
        AppState.saveCurrentBoard();
        const childId = AppState.createChildBoard(AppState.currentBoardId);
        if (childId) {
            AppState.loadBoard(childId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
        }
        return childId;
    });
}

test.describe('Inherited element brightness', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('inherited element has same opacity as on parent board', async ({ page }) => {
        // Add a cone on the parent board
        await page.locator('[data-element="cone"]').click();
        await page.waitForTimeout(200);

        // Verify cone exists
        const coneExists = await page.evaluate(() => {
            return AppState.elements.some(e => e.type === 'cone');
        });
        expect(coneExists).toBe(true);

        // Get the cone's opacity on parent board
        const parentOpacity = await page.evaluate(() => {
            const coneSvg = document.querySelector('.element-svg');
            return coneSvg ? window.getComputedStyle(coneSvg).opacity : null;
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Get the inherited cone's opacity on child board
        const childOpacity = await page.evaluate(() => {
            const coneSvg = document.querySelector('.element-svg.element-inherited');
            return coneSvg ? window.getComputedStyle(coneSvg).opacity : null;
        });

        // VERIFY: opacity should be the same (both should be fully opaque)
        expect(childOpacity).toBe(parentOpacity);
        expect(parseFloat(childOpacity)).toBe(1.0);
    });

    test('inherited ball has same opacity as on parent board', async ({ page }) => {
        // Add a ball on the parent board
        await page.locator('.ball-template').first().click();
        await expect(page.locator('[data-ball]')).toHaveCount(1, { timeout: 3000 });

        // Get the ball's opacity on parent board
        const parentOpacity = await page.evaluate(() => {
            const ball = document.querySelector('[data-ball]');
            return ball ? window.getComputedStyle(ball).opacity : null;
        });
        expect(parentOpacity).not.toBeNull();

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Get the inherited ball's opacity on child board
        const childOpacity = await page.evaluate(() => {
            const ball = document.querySelector('[data-ball]');
            return ball ? window.getComputedStyle(ball).opacity : null;
        });

        // VERIFY: opacity should be the same
        expect(childOpacity).toBe(parentOpacity);
        expect(parseFloat(childOpacity)).toBe(1.0);
    });

    test('inherited plate has same opacity as on parent board', async ({ page }) => {
        // Add a plate on the parent board
        await page.locator('.plate-template').first().click();
        await expect(page.locator('[data-plate]')).toHaveCount(1, { timeout: 3000 });

        // Get the plate's opacity on parent board
        const parentOpacity = await page.evaluate(() => {
            const plate = document.querySelector('[data-plate]');
            return plate ? window.getComputedStyle(plate).opacity : null;
        });
        expect(parentOpacity).not.toBeNull();

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Get the inherited plate's opacity on child board
        const childOpacity = await page.evaluate(() => {
            const plate = document.querySelector('[data-plate]');
            return plate ? window.getComputedStyle(plate).opacity : null;
        });

        // VERIFY: opacity should be the same
        expect(childOpacity).toBe(parentOpacity);
        expect(parseFloat(childOpacity)).toBe(1.0);
    });

    test('inherited shape has same opacity as on parent board', async ({ page }) => {
        // Add a rectangle on the parent board
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        // Get the rectangle's opacity on parent board
        const parentOpacity = await page.evaluate(() => {
            const shape = document.querySelector('[data-shape]');
            return shape ? window.getComputedStyle(shape).opacity : null;
        });
        expect(parentOpacity).not.toBeNull();

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Get the inherited shape's opacity on child board
        const childOpacity = await page.evaluate(() => {
            const shape = document.querySelector('[data-shape]');
            return shape ? window.getComputedStyle(shape).opacity : null;
        });

        // VERIFY: opacity should be the same
        expect(childOpacity).toBe(parentOpacity);
        expect(parseFloat(childOpacity)).toBe(1.0);
    });

    test('inherited player has same opacity as on parent board', async ({ page }) => {
        // Add a player on the parent board
        await page.locator('.team-player-template').first().click();
        await expect(page.locator('[data-player-id]')).toHaveCount(1, { timeout: 3000 });

        // Get the player's opacity on parent board
        const parentOpacity = await page.evaluate(() => {
            const player = document.querySelector('[data-player-id]');
            return player ? window.getComputedStyle(player).opacity : null;
        });
        expect(parentOpacity).not.toBeNull();

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Get the inherited player's opacity on child board
        const childOpacity = await page.evaluate(() => {
            const player = document.querySelector('[data-player-id]');
            return player ? window.getComputedStyle(player).opacity : null;
        });

        // VERIFY: opacity should be the same
        expect(childOpacity).toBe(parentOpacity);
        expect(parseFloat(childOpacity)).toBe(1.0);
    });
});
