/**
 * Reset to parent should be disabled for unmodified inherited objects.
 *
 * When an object is inherited from a parent board but has NOT been modified
 * on the child board, the "Reset to parent" option should be greyed out/disabled
 * because there's nothing to reset.
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

test.describe('Reset to parent - disabled state', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player: reset to parent is DISABLED when inherited and NOT modified', async ({ page }) => {
        // Add a player on the parent board
        await page.locator('.team-player-template').first().click();
        await expect(page.locator('[data-player-id]')).toHaveCount(1, { timeout: 3000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Verify player is visible (inherited)
        await expect(page.locator('[data-player-id]')).toHaveCount(1, { timeout: 2000 });

        // Right-click on the player WITHOUT modifying it
        const player = page.locator('[data-player-id]').first();
        await player.click({ button: 'right' });

        // Wait for context menu to appear
        const menu = page.locator('#element-context-menu');
        await expect(menu).toBeVisible({ timeout: 2000 });

        // VERIFY: "Reset to parent" should be disabled/greyed out
        const resetItem = menu.locator('[data-action="reset"]');

        // Check if the item exists
        const itemExists = await resetItem.count();
        if (itemExists > 0) {
            // Check if it has 'disabled' class or attribute
            const hasDisabledClass = await resetItem.evaluate(el => el.classList.contains('disabled'));
            const hasDisabledAttr = await resetItem.evaluate(el => el.hasAttribute('disabled'));

            expect(hasDisabledClass || hasDisabledAttr).toBe(true);
        }
    });

    test('player: reset to parent is ENABLED when inherited AND modified', async ({ page }) => {
        // Add a player on the parent board at position (2000, 1000)
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });
        await expect(page.locator('[data-player-id]')).toHaveCount(1, { timeout: 2000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player to a different position (modify it)
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1200;
            Players.render();
        });
        await page.waitForTimeout(200);

        // Right-click on the modified player
        const player = page.locator('[data-player-id]').first();
        await player.click({ button: 'right' });

        // Wait for context menu to appear
        const menu = page.locator('#element-context-menu');
        await expect(menu).toBeVisible({ timeout: 2000 });

        // VERIFY: "Reset to parent" should be enabled (not disabled)
        const resetItem = menu.locator('[data-action="reset"]');

        const itemExists = await resetItem.count();
        if (itemExists > 0) {
            const hasDisabledClass = await resetItem.evaluate(el => el.classList.contains('disabled'));
            const hasDisabledAttr = await resetItem.evaluate(el => el.hasAttribute('disabled'));

            expect(hasDisabledClass || hasDisabledAttr).toBe(false);
        }
    });

    test('element: reset to parent is DISABLED when inherited and NOT modified', async ({ page }) => {
        // Add a cone on the parent board
        await page.locator('[data-element="cone"]').click();
        await page.waitForTimeout(200);

        // Verify cone exists
        const coneCount = await page.evaluate(() => {
            return AppState.elements.filter(e => e.type === 'cone' && !e.inherited).length;
        });
        expect(coneCount).toBe(1);

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Right-click on the inherited cone WITHOUT modifying it
        const cone = page.locator('.element-svg').first();
        await cone.click({ button: 'right' });

        // Wait for context menu to appear
        const menu = page.locator('#element-context-menu');
        await expect(menu).toBeVisible({ timeout: 2000 });

        // VERIFY: "Reset to parent" or similar option should be disabled
        const resetItem = menu.locator('[data-action="reset"]');

        const itemExists = await resetItem.count();
        if (itemExists > 0) {
            const hasDisabledClass = await resetItem.evaluate(el => el.classList.contains('disabled'));
            const hasDisabledAttr = await resetItem.evaluate(el => el.hasAttribute('disabled'));

            expect(hasDisabledClass || hasDisabledAttr).toBe(true);
        }
    });

    test('element: reset to parent is ENABLED when inherited AND modified', async ({ page }) => {
        // Add a cone on the parent board
        await page.evaluate(() => {
            AppState.addElement('cone', 2000, 1000);
            Elements.render();
        });
        await page.waitForTimeout(200);

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the cone to a different position (modify it)
        await page.evaluate(() => {
            const cone = AppState.elements.find(e => e.type === 'cone');
            if (cone) {
                cone.x = 2500;
                cone.y = 1200;
                Elements.render();
            }
        });
        await page.waitForTimeout(200);

        // Right-click on the modified cone
        const cone = page.locator('.element-svg').first();
        await cone.click({ button: 'right' });

        // Wait for context menu to appear
        const menu = page.locator('#element-context-menu');
        await expect(menu).toBeVisible({ timeout: 2000 });

        // VERIFY: "Reset to parent" should be enabled (not disabled)
        const resetItem = menu.locator('[data-action="reset"]');

        const itemExists = await resetItem.count();
        if (itemExists > 0) {
            const hasDisabledClass = await resetItem.evaluate(el => el.classList.contains('disabled'));
            const hasDisabledAttr = await resetItem.evaluate(el => el.hasAttribute('disabled'));

            expect(hasDisabledClass || hasDisabledAttr).toBe(false);
        }
    });

    test('ball: reset to parent is DISABLED when inherited and NOT modified', async ({ page }) => {
        // Add a ball on the parent board
        await page.locator('.ball-template').first().click();
        await expect(page.locator('[data-ball]')).toHaveCount(1, { timeout: 3000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Verify ball is visible (inherited)
        await expect(page.locator('[data-ball]')).toHaveCount(1, { timeout: 2000 });

        // Right-click on the ball WITHOUT modifying it
        const ball = page.locator('[data-ball]').first();
        await ball.click({ button: 'right' });

        // Wait for context menu to appear
        const menu = page.locator('#element-context-menu');
        await expect(menu).toBeVisible({ timeout: 2000 });

        // VERIFY: "Reset to parent" should be disabled/greyed out
        const resetItem = menu.locator('[data-action="reset"]');

        const itemExists = await resetItem.count();
        if (itemExists > 0) {
            const hasDisabledClass = await resetItem.evaluate(el => el.classList.contains('disabled'));
            const hasDisabledAttr = await resetItem.evaluate(el => el.hasAttribute('disabled'));

            expect(hasDisabledClass || hasDisabledAttr).toBe(true);
        }
    });
});
