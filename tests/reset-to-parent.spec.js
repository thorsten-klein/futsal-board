/**
 * Test "Reset to Parent" context menu functionality.
 * This option should ONLY appear for inherited objects that can be modified (players, balls).
 * It should be disabled when the object hasn't been modified from its parent position.
 * It should be enabled when the object has been modified.
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
            Animations.renderParentPaths();
        }
        return childId;
    });
}

test.describe('Reset to Parent context menu', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    // ── Players ────────────────────────────────────────────────────────────

    test('reset to parent does NOT appear for players on parent board', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });
        await page.waitForTimeout(200);

        // Right-click the player
        const player = page.locator('[data-player-id]').first();
        await player.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Reset option should NOT be present on parent board
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        const resetItem = menu.locator('[data-action="reset"]');
        await expect(resetItem).toHaveCount(0);
    });

    test('reset to parent appears for inherited players on child board', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Right-click the inherited player
        const player = page.locator('[data-player-id]').first();
        await player.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Reset option should be present on child board
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        const resetItem = menu.locator('[data-action="reset"]');
        await expect(resetItem).toHaveCount(1);
        await expect(resetItem).toBeVisible();
    });

    test('reset to parent is DISABLED for unmodified inherited player', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Don't move the player - it should still be at parent position
        const player = page.locator('[data-player-id]').first();
        await player.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Reset option should be disabled (player hasn't been modified)
        const menu = page.locator('.context-menu:not(.hidden)').first();
        const resetItem = menu.locator('[data-action="reset"]');
        await expect(resetItem).toHaveClass(/disabled/);
    });

    test('reset to parent is ENABLED for modified inherited player', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player to a different position
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1500;
            Players.render();
        });
        await page.waitForTimeout(200);

        // Right-click the modified player
        const player = page.locator('[data-player-id]').first();
        await player.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Reset option should be enabled (player has been modified)
        const menu = page.locator('.context-menu:not(.hidden)').first();
        const resetItem = menu.locator('[data-action="reset"]');
        await expect(resetItem).not.toHaveClass(/disabled/);
    });

    test('reset to parent is ENABLED when only player rotation is changed', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Change only the rotation, not position
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.rotation = 45;
            Players.render();
        });
        await page.waitForTimeout(200);

        // Right-click the rotated player
        const player = page.locator('[data-player-id]').first();
        await player.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Reset option should be enabled (rotation changed)
        const menu = page.locator('.context-menu:not(.hidden)').first();
        const resetItem = menu.locator('[data-action="reset"]');
        await expect(resetItem).not.toHaveClass(/disabled/);
    });

    test('reset to parent does NOT appear for players added only on child board', async ({ page }) => {
        // Create child board WITHOUT adding a player first
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Add a player ONLY on the child board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });
        await page.waitForTimeout(200);

        // Right-click the child-only player
        const player = page.locator('[data-player-id]').first();
        await player.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Reset option should NOT be present (player not inherited)
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        const resetItem = menu.locator('[data-action="reset"]');
        await expect(resetItem).toHaveCount(0);
    });

    // ── Balls ──────────────────────────────────────────────────────────────

    test('reset to parent does NOT appear for balls on parent board', async ({ page }) => {
        // Add a ball on the parent board
        await page.evaluate(() => {
            AppState.addBall(null, 2000, 1000);
            Balls.render();
        });
        await page.waitForTimeout(200);

        // Right-click the ball
        const ball = page.locator('[data-ball]').first();
        await ball.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Reset option should NOT be present on parent board
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        const resetItem = menu.locator('[data-action="reset"]');
        await expect(resetItem).toHaveCount(0);
    });

    test('reset to parent appears for inherited balls on child board', async ({ page }) => {
        // Add a ball on the parent board
        await page.evaluate(() => {
            AppState.addBall(null, 2000, 1000);
            Balls.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Right-click the inherited ball
        const ball = page.locator('[data-ball]').first();
        await ball.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Reset option should be present on child board
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        const resetItem = menu.locator('[data-action="reset"]');
        await expect(resetItem).toHaveCount(1);
        await expect(resetItem).toBeVisible();
    });

    test('reset to parent is DISABLED for unmodified inherited ball', async ({ page }) => {
        // Add a ball on the parent board
        await page.evaluate(() => {
            AppState.addBall(null, 2000, 1000);
            Balls.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Don't move the ball - it should still be at parent position
        const ball = page.locator('[data-ball]').first();
        await ball.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Reset option should be disabled (ball hasn't been modified)
        const menu = page.locator('.context-menu:not(.hidden)').first();
        const resetItem = menu.locator('[data-action="reset"]');
        await expect(resetItem).toHaveClass(/disabled/);
    });

    test('reset to parent is ENABLED for modified inherited ball', async ({ page }) => {
        // Add a ball on the parent board
        await page.evaluate(() => {
            AppState.addBall(null, 2000, 1000);
            Balls.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the ball to a different position
        await page.evaluate(() => {
            const ball = AppState.balls[0];
            ball.x = 2500;
            ball.y = 1500;
            Balls.render();
        });
        await page.waitForTimeout(200);

        // Right-click the modified ball
        const ball = page.locator('[data-ball]').first();
        await ball.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Reset option should be enabled (ball has been modified)
        const menu = page.locator('.context-menu:not(.hidden)').first();
        const resetItem = menu.locator('[data-action="reset"]');
        await expect(resetItem).not.toHaveClass(/disabled/);
    });

    test('reset to parent does NOT appear for balls added only on child board', async ({ page }) => {
        // Create child board WITHOUT adding a ball first
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Add a ball ONLY on the child board
        await page.evaluate(() => {
            AppState.addBall(null, 2000, 1000);
            Balls.render();
        });
        await page.waitForTimeout(200);

        // Right-click the child-only ball
        const ball = page.locator('[data-ball]').first();
        await ball.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Reset option should NOT be present (ball not inherited)
        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible();
        const resetItem = menu.locator('[data-action="reset"]');
        await expect(resetItem).toHaveCount(0);
    });

    // ── Other object types (should NOT have reset to parent) ──────────────

    test('reset to parent does NOT appear for elements (cones)', async ({ page }) => {
        // Add an element (cone) on the parent board
        await page.evaluate(() => {
            AppState.addElement('cone', 2000, 1000);
            Elements.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Elements should be inherited, but reset should NOT be available
        const element = page.locator('[data-element]').first();
        if (await element.count() > 0) {
            await element.click({ button: 'right' });
            await page.waitForTimeout(200);

            // VERIFY: Reset option should NOT be present for elements
            const menu = page.locator('.context-menu:not(.hidden)').first();
            if (await menu.count() > 0) {
                const resetItem = menu.locator('[data-action="reset"]');
                await expect(resetItem).toHaveCount(0);
            }
        }
    });

    test('reset to parent does NOT appear for plates', async ({ page }) => {
        // Add a plate on the parent board
        await page.evaluate(() => {
            AppState.addPlate(2000, 1000, 1, 4);
            Plates.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Plates should be inherited, but reset should NOT be available
        const plate = page.locator('[data-plate]').first();
        if (await plate.count() > 0) {
            await plate.click({ button: 'right' });
            await page.waitForTimeout(200);

            // VERIFY: Reset option should NOT be present for plates
            const menu = page.locator('.context-menu:not(.hidden)').first();
            if (await menu.count() > 0) {
                const resetItem = menu.locator('[data-action="reset"]');
                await expect(resetItem).toHaveCount(0);
            }
        }
    });

    // ── Functional tests (clicking reset actually works) ──────────────────

    test('clicking reset to parent restores player to parent position', async ({ page }) => {
        // Add a player on the parent board
        const originalPos = await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
            return { x: 2000, y: 1000 };
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 3000;
            player.y = 2000;
            player.rotation = 90;
            Players.render();
        });
        await page.waitForTimeout(200);

        // Verify player was moved
        const movedPos = await page.evaluate(() => {
            const player = AppState.players[0];
            return { x: player.x, y: player.y, rotation: player.rotation };
        });
        expect(movedPos.x).toBe(3000);
        expect(movedPos.y).toBe(2000);
        expect(movedPos.rotation).toBe(90);

        // Right-click and reset to parent
        const player = page.locator('[data-player-id]').first();
        await player.click({ button: 'right' });
        await page.waitForTimeout(200);

        const menu = page.locator('.context-menu:not(.hidden)').first();
        const resetItem = menu.locator('[data-action="reset"]');
        await resetItem.click();
        await page.waitForTimeout(200);

        // VERIFY: Player should be back at parent position
        const resetPos = await page.evaluate(() => {
            const player = AppState.players[0];
            return { x: player.x, y: player.y, rotation: player.rotation || 0 };
        });
        expect(resetPos.x).toBe(originalPos.x);
        expect(resetPos.y).toBe(originalPos.y);
        expect(resetPos.rotation).toBe(0);
    });

    test('clicking reset to parent restores ball to parent position', async ({ page }) => {
        // Add a ball on the parent board
        const originalPos = await page.evaluate(() => {
            AppState.addBall(null, 2000, 1000);
            Balls.render();
            return { x: 2000, y: 1000 };
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the ball
        await page.evaluate(() => {
            const ball = AppState.balls[0];
            ball.x = 3000;
            ball.y = 2000;
            Balls.render();
        });
        await page.waitForTimeout(200);

        // Verify ball was moved
        const movedPos = await page.evaluate(() => {
            const ball = AppState.balls[0];
            return { x: ball.x, y: ball.y };
        });
        expect(movedPos.x).toBe(3000);
        expect(movedPos.y).toBe(2000);

        // Right-click and reset to parent
        const ball = page.locator('[data-ball]').first();
        await ball.click({ button: 'right' });
        await page.waitForTimeout(200);

        const menu = page.locator('.context-menu:not(.hidden)').first();
        const resetItem = menu.locator('[data-action="reset"]');
        await resetItem.click();
        await page.waitForTimeout(200);

        // VERIFY: Ball should be back at parent position
        const resetPos = await page.evaluate(() => {
            const ball = AppState.balls[0];
            return { x: ball.x, y: ball.y };
        });
        expect(resetPos.x).toBe(originalPos.x);
        expect(resetPos.y).toBe(originalPos.y);
    });
});
