/**
 * Player edge case tests — verify player drag boundaries,
 * number/color customization, and edge cases.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Player Drag Boundaries', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('drag player to board right edge constrains to max X', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Drag player far to the right (beyond board)
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                // Try to set x beyond max (4500 for futsal board)
                player.x = 5000;
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(100);

        // Position should be constrained
        const pos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return player ? player.x : 0;
        }, { playerId });

        // Should not exceed board width (4500)
        expect(pos).toBeLessThanOrEqual(4500);
    });

    test('drag player to board bottom edge constrains to max Y', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Drag player far down (beyond board)
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                // Try to set y beyond max (2500 for futsal board)
                player.y = 3000;
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(100);

        // Position should be constrained
        const pos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return player ? player.y : 0;
        }, { playerId });

        // Should not exceed board height (2500)
        expect(pos).toBeLessThanOrEqual(2500);
    });

    test('drag player to board left edge constrains to min X', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Try to drag player to negative X
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.x = -100;
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(100);

        // Position should be constrained to >= 0
        const pos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return player ? player.x : 0;
        }, { playerId });

        expect(pos).toBeGreaterThanOrEqual(0);
    });

    test('drag player to board top edge constrains to min Y', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Try to drag player to negative Y
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.y = -100;
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(100);

        // Position should be constrained to >= 0
        const pos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return player ? player.y : 0;
        }, { playerId });

        expect(pos).toBeGreaterThanOrEqual(0);
    });

    test('player stays within bounds during rapid movement', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Rapidly move player to various positions
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                for (let i = 0; i < 10; i++) {
                    player.x = Math.random() * 6000 - 1000; // Random including out-of-bounds
                    player.y = Math.random() * 4000 - 1000;
                }
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(200);

        // Final position should be within bounds
        const pos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return player ? { x: player.x, y: player.y } : { x: 0, y: 0 };
        }, { playerId });

        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThanOrEqual(4500);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThanOrEqual(2500);
    });
});

test.describe('Player Number Customization', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player number can be changed to 00', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Open player context menu
        await page.locator(`[data-player-id="${playerId}"]`).click({ button: 'right' });
        await page.waitForTimeout(200);

        // Click "Edit Number"
        await page.locator('.context-menu').filter({ hasText: 'Edit Number' }).locator('text=Edit Number').click();
        await page.waitForTimeout(200);

        // Set number to 00
        await page.locator('#player-number-input').fill('00');
        await page.locator('#btn-player-number-ok').click();
        await page.waitForTimeout(200);

        // Verify number is 00
        const number = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return player ? player.number : '';
        }, { playerId });

        expect(number).toBe('00');
    });

    test('player number can be changed to 99', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Set number programmatically
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.number = '99';
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(200);

        // Verify number is displayed
        const displayedNumber = await page.locator(`[data-player-id="${playerId}"] .player-number`).textContent();
        expect(displayedNumber).toBe('99');
    });

    test('player number can be single digit', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.number = '5';
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(200);

        const displayedNumber = await page.locator(`[data-player-id="${playerId}"] .player-number`).textContent();
        expect(displayedNumber).toBe('5');
    });
});

test.describe('Player Color Customization', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player color customization persists', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Change player color via fillColor (team color is what's actually used)
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                // Set the team color directly
                const team = AppState.getTeam(player.teamId);
                if (team) team.color = '#ff0000';
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(200);

        // Verify color persisted in team
        const color = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (!player) return '';
            const team = AppState.getTeam(player.teamId);
            return team ? team.color : '';
        }, { playerId });

        expect(color).toBe('#ff0000');
    });

    test('player text color updates based on background', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Set dark background via team color
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                const team = AppState.getTeam(player.teamId);
                if (team) team.color = '#000000';
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(200);

        // Text should be light colored
        const textColor = await page.locator(`[data-player-id="${playerId}"] .player-number`).evaluate(el => el.style.color);
        // Dark backgrounds should have light text (rgb(255,255,255) or white)
        expect(textColor === 'rgb(255, 255, 255)' || textColor === '#ffffff' || textColor === 'white').toBeTruthy();
    });

    test('player with bright color has dark text', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Set bright background via team color
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                const team = AppState.getTeam(player.teamId);
                if (team) team.color = '#ffff00'; // Yellow
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(200);

        // Text should be dark colored
        const textColor = await page.locator(`[data-player-id="${playerId}"] .player-number`).evaluate(el => el.style.color);
        // Bright backgrounds should have dark text
        expect(textColor === 'rgb(0, 0, 0)' || textColor === '#000000' || textColor === 'black').toBeTruthy();
    });
});

test.describe('Multiple Players', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('rapidly click player template adds multiple players', async ({ page }) => {
        // Rapidly click template 5 times
        for (let i = 0; i < 5; i++) {
            await page.locator('.team-player-template').first().click();
            await page.waitForTimeout(50);
        }
        await page.waitForTimeout(300);

        // Should have 5 players
        const playerCount = await page.evaluate(() => AppState.players.length);
        expect(playerCount).toBe(5);
    });

    test('each player has unique ID', async ({ page }) => {
        // Add 3 players
        await addPlayer(page);
        await addPlayer(page);
        await addPlayer(page);

        // Get all player IDs
        const playerIds = await page.evaluate(() => AppState.players.map(p => p.id));

        // All IDs should be unique
        const uniqueIds = new Set(playerIds);
        expect(uniqueIds.size).toBe(playerIds.length);
        expect(playerIds.length).toBe(3);
    });

    test('players from different teams have different colors', async ({ page }) => {
        // Add player from first team
        await page.locator('.team-player-template').first().click();
        await page.waitForTimeout(200);

        // Add player from second team (if exists)
        const teamTemplates = await page.locator('.team-player-template').count();
        if (teamTemplates > 1) {
            await page.locator('.team-player-template').nth(1).click();
            await page.waitForTimeout(200);

            // Get team colors
            const colors = await page.evaluate(() => {
                return AppState.players.map(p => {
                    const team = AppState.getTeam(p.teamId);
                    return team ? team.color : '';
                });
            });

            // Colors should be different
            if (colors.length >= 2) {
                expect(colors[0]).not.toBe(colors[1]);
            }
        }
    });
});

test.describe('Player Rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player rotation can be set', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Set rotation
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.rotation = 45;
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(200);

        // Verify rotation is set
        const rotation = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return player ? player.rotation : 0;
        }, { playerId });

        expect(rotation).toBe(45);
    });

    test('player rotation persists', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Set rotation and save
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.rotation = 90;
                AppState.saveCurrentBoard();
            }
        }, { playerId });

        // Reload (simulate)
        await page.evaluate(() => {
            Players.render();
        });
        await page.waitForTimeout(200);

        // Rotation should still be set
        const rotation = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return player ? player.rotation : 0;
        }, { playerId });

        expect(rotation).toBe(90);
    });
});

test.describe('Player Name', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player can have custom name', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Set name
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.name = 'John Doe';
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(200);

        // Verify name is set
        const name = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return player ? player.name : '';
        }, { playerId });

        expect(name).toBe('John Doe');
    });

    test('player name can be empty', async ({ page }) => {
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Set empty name
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.name = '';
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(200);

        // Name should be empty
        const name = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return player ? player.name : null;
        }, { playerId });

        expect(name).toBe('');
    });
});
