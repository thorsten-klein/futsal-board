/**
 * Grandchild board tests - verify that objects are displayed correctly
 * when navigating through multiple levels of child boards.
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

test.describe('Grandchild board object visibility', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('players should be visible in grandchild board', async ({ page }) => {
        // Add two players on the parent board (Board 1)
        await page.locator('.team-player-template').first().click();
        await expect(page.locator('[data-player-id]')).toHaveCount(1, { timeout: 3000 });
        await page.locator('.team-player-template').first().click();
        await expect(page.locator('[data-player-id]')).toHaveCount(2, { timeout: 3000 });

        // Create child board (Board 2) and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Verify both players are visible in child board (inherited)
        await expect(page.locator('[data-player-id]')).toHaveCount(2, { timeout: 2000 });

        // Create grandchild board (Board 3 - child of Board 2) and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // VERIFY: Both players should be visible in grandchild board
        // Player 1 & 2: inherited from Board 1 (grandparent) via Board 2 (parent)
        const playerCount = await page.locator('[data-player-id]').count();
        expect(playerCount).toBe(2);

        // Verify both players are actually rendered and visible
        const players = page.locator('[data-player-id]');
        for (let i = 0; i < playerCount; i++) {
            await expect(players.nth(i)).toBeVisible();
        }
    });

    test('balls should be visible in grandchild board', async ({ page }) => {
        // Add two balls on the parent board
        await page.locator('.ball-template').first().click();
        await expect(page.locator('[data-ball]')).toHaveCount(1, { timeout: 3000 });
        await page.locator('.ball-template').first().click();
        await expect(page.locator('[data-ball]')).toHaveCount(2, { timeout: 3000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Verify both balls are inherited
        await expect(page.locator('[data-ball]')).toHaveCount(2, { timeout: 2000 });

        // Create grandchild board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // VERIFY: Both balls should be visible
        const ballCount = await page.locator('[data-ball]').count();
        expect(ballCount).toBe(2);
    });

    test('elements should be visible in grandchild board', async ({ page }) => {
        // Count default goals first (there are 8 default goals on the board)
        const defaultGoalCount = await page.locator('[data-element]').count();

        // Add two cones on the parent board
        await page.locator('[data-element="cone"]').click();
        await expect(page.locator('[data-element]')).toHaveCount(defaultGoalCount + 1, { timeout: 3000 });
        await page.locator('[data-element="cone"]').click();
        await expect(page.locator('[data-element]')).toHaveCount(defaultGoalCount + 2, { timeout: 3000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Verify both cones are inherited (plus default goals)
        await expect(page.locator('[data-element]')).toHaveCount(defaultGoalCount + 2, { timeout: 2000 });

        // Create grandchild board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // VERIFY: Both cones should be visible (plus default goals)
        const elementCount = await page.locator('[data-element]').count();
        expect(elementCount).toBe(defaultGoalCount + 2);
    });

    test('elements from ancestor boards are marked inherited in grandchild board', async ({ page }) => {
        // Add a cone on parent board
        await page.locator('[data-element="cone"]').click();
        await page.waitForTimeout(200);

        // Create child board
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Create grandchild board
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // VERIFY: The cone from the ancestor should be marked as inherited
        // (protected: glows red when selected, Remove is disabled)
        const inheritedCount = await page.locator('.element-svg.element-inherited').count();
        expect(inheritedCount).toBeGreaterThan(0);

        const isInherited = await page.evaluate(() => {
            const element = AppState.elements.find(e => e.type === 'cone');
            return element && element.inherited === true;
        });
        expect(isInherited).toBe(true);
    });
});
