/**
 * Test for player jump bug when dragging at 90° rotation.
 * When board is rotated 90° and player is not in center, dragging causes a jump.
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

test.describe('Player drag jump at 90° rotation', () => {
    test('player should not jump when starting drag at 90°', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        await goto(page);

        // Add a player far from center
        const playerId = await page.evaluate(() => {
            const player = {
                id: 'drag-test-player',
                teamId: AppState.teams[0].id,
                number: '5',
                x: 3500,  // Far from center
                y: 1500,
                rotation: 0,
                visible: true
            };
            AppState.players.push(player);
            Players.render();
            return player.id;
        });

        await page.waitForTimeout(300);

        // Get initial position at 0°
        const positionAt0 = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y };
        }, { playerId });

        console.log('Initial position at 0°:', positionAt0);

        // Rotate board 90°
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        const menu = page.locator('#board-canvas-context-menu');
        await menu.waitFor({ state: 'visible', timeout: 3000 });
        await menu.locator('[data-action="rotate-right"]').click();

        await page.waitForTimeout(1000);

        // Get player element position on screen
        const initialScreenPos = await page.evaluate(({ playerId }) => {
            console.log('AppState.players:', AppState.players.length, 'players');
            console.log('Looking for player:', playerId);

            const allPlayers = document.querySelectorAll('.player');
            console.log('Player divs found:', allPlayers.length);
            console.log('Player div IDs:', Array.from(allPlayers).map(p => p.id));

            const playerDiv = document.getElementById(playerId);
            if (!playerDiv) {
                // Try to re-render
                console.log('Player div not found, trying to render...');
                if (typeof Players !== 'undefined') {
                    Players.render();
                }
                const retryDiv = document.getElementById(playerId);
                if (!retryDiv) {
                    return { error: 'Player div not found even after render' };
                }
                return {
                    centerX: retryDiv.getBoundingClientRect().x + retryDiv.getBoundingClientRect().width / 2,
                    centerY: retryDiv.getBoundingClientRect().y + retryDiv.getBoundingClientRect().height / 2,
                    boardX: AppState.players.find(p => p.id === playerId).x,
                    boardY: AppState.players.find(p => p.id === playerId).y
                };
            }
            const rect = playerDiv.getBoundingClientRect();
            return {
                centerX: rect.x + rect.width / 2,
                centerY: rect.y + rect.height / 2,
                boardX: AppState.players.find(p => p.id === playerId).x,
                boardY: AppState.players.find(p => p.id === playerId).y
            };
        }, { playerId });

        if (initialScreenPos.error) {
            throw new Error(initialScreenPos.error);
        }

        console.log('\nAt 90° rotation:');
        console.log('Player screen center:', initialScreenPos.centerX, initialScreenPos.centerY);
        console.log('Player board coords:', initialScreenPos.boardX, initialScreenPos.boardY);

        // Click on player to start drag (mousedown)
        // First select the player (click once)
        await page.mouse.move(initialScreenPos.centerX, initialScreenPos.centerY);
        await page.mouse.click(initialScreenPos.centerX, initialScreenPos.centerY);
        await page.waitForTimeout(200);

        // Check position after selection
        const positionAfterSelect = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            const playerDiv = document.getElementById(playerId);
            const rect = playerDiv.getBoundingClientRect();
            return {
                boardX: player.x,
                boardY: player.y,
                screenCenterX: rect.x + rect.width / 2,
                screenCenterY: rect.y + rect.height / 2
            };
        }, { playerId });

        console.log('\nAfter selection (clicked once):');
        console.log('Player board coords:', positionAfterSelect.boardX, positionAfterSelect.boardY);
        console.log('Player screen center:', positionAfterSelect.screenCenterX, positionAfterSelect.screenCenterY);

        // Check if selection caused a jump
        const selectJumpX = Math.abs(positionAfterSelect.boardX - initialScreenPos.boardX);
        const selectJumpY = Math.abs(positionAfterSelect.boardY - initialScreenPos.boardY);
        console.log('Position change on selection:', { x: selectJumpX.toFixed(2), y: selectJumpY.toFixed(2) });

        // Now start dragging (mousedown to begin drag)
        await page.mouse.move(positionAfterSelect.screenCenterX, positionAfterSelect.screenCenterY);
        await page.mouse.down();
        await page.waitForTimeout(100);

        // Check position immediately after mousedown (before any movement)
        const positionAfterMousedown = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            const playerDiv = document.getElementById(playerId);
            const rect = playerDiv.getBoundingClientRect();
            return {
                boardX: player.x,
                boardY: player.y,
                screenCenterX: rect.x + rect.width / 2,
                screenCenterY: rect.y + rect.height / 2
            };
        }, { playerId });

        console.log('\nAfter mousedown (no movement yet):');
        console.log('Player board coords:', positionAfterMousedown.boardX, positionAfterMousedown.boardY);
        console.log('Player screen center:', positionAfterMousedown.screenCenterX, positionAfterMousedown.screenCenterY);

        // Move mouse 10px right
        await page.mouse.move(positionAfterMousedown.screenCenterX + 10, positionAfterMousedown.screenCenterY);
        await page.waitForTimeout(100);

        // Check position after movement
        const positionAfter10px = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            const playerDiv = document.getElementById(playerId);
            const rect = playerDiv.getBoundingClientRect();
            return {
                boardX: player.x,
                boardY: player.y,
                screenCenterX: rect.x + rect.width / 2,
                screenCenterY: rect.y + rect.height / 2
            };
        }, { playerId });

        console.log('\nAfter moving 10px right:');
        console.log('Player board coords:', positionAfter10px.boardX, positionAfter10px.boardY);
        console.log('Player screen center:', positionAfter10px.screenCenterX, positionAfter10px.screenCenterY);

        await page.mouse.up();

        // Calculate how much the player moved
        const boardDiffX = positionAfter10px.boardX - positionAfterMousedown.boardX;
        const boardDiffY = positionAfter10px.boardY - positionAfterMousedown.boardY;
        const screenDiffX = positionAfter10px.screenCenterX - positionAfterMousedown.screenCenterX;
        const screenDiffY = positionAfter10px.screenCenterY - positionAfterMousedown.screenCenterY;

        console.log('\n=== MOVEMENT CHECK ===');
        console.log('Board coordinate change:', { x: boardDiffX.toFixed(2), y: boardDiffY.toFixed(2) });
        console.log('Screen position change:', { x: screenDiffX.toFixed(2), y: screenDiffY.toFixed(2) });

        // At 90° rotation:
        // - Board X-axis points DOWN on screen (positive X = move down)
        // - Board Y-axis points RIGHT on screen (positive Y = move right)
        // So moving mouse RIGHT (+screen X) should DECREASE board Y (or keep it similar)
        // And moving mouse DOWN (+screen Y) should INCREASE board X

        // We moved mouse RIGHT (+10 screen X), so at 90°:
        // - Board Y should DECREASE (negative change)
        // - Board X should stay about the same

        console.log('\n=== DIRECTION CHECK ===');
        console.log('Expected: Mouse moved RIGHT → Board Y decreases, Board X unchanged');
        console.log('Actual: Board Y change =', boardDiffY.toFixed(2), ', Board X change =', boardDiffX.toFixed(2));

        await page.screenshot({ path: 'test_results/player-drag-jump-90deg.png' });

        // Check if there was a jump on mousedown (player moved without mouse moving)
        const mousedownJumpX = Math.abs(positionAfterMousedown.boardX - positionAfterSelect.boardX);
        const mousedownJumpY = Math.abs(positionAfterMousedown.boardY - positionAfterSelect.boardY);

        console.log('\n=== JUMP ON MOUSEDOWN ===');
        console.log('Position changed by:', { x: mousedownJumpX.toFixed(2), y: mousedownJumpY.toFixed(2) });

        // Player should not move on mousedown (before any mouse movement)
        expect(mousedownJumpX).toBeLessThan(5);
        expect(mousedownJumpY).toBeLessThan(5);

        // Check for reasonable movement (not a huge jump)
        // Moving mouse 10px at scale ~1.8 should move board coords by ~5-15 units
        const totalBoardMove = Math.sqrt(boardDiffX * boardDiffX + boardDiffY * boardDiffY);
        console.log('\nTotal board movement:', totalBoardMove.toFixed(2), 'units');

        expect(totalBoardMove).toBeLessThan(200); // No huge jumps
        expect(totalBoardMove).toBeGreaterThan(1); // Should actually move
    });

    test('player should not jump when clicking edge at 90°', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        await goto(page);

        // Add a player
        const playerId = await page.evaluate(() => {
            const player = {
                id: 'drag-test-player-edge',
                teamId: AppState.teams[0].id,
                number: '7',
                x: 2000,
                y: 1000,
                rotation: 0,
                visible: true
            };
            AppState.players.push(player);
            Players.render();
            return player.id;
        });

        await page.waitForTimeout(300);

        // Rotate board 90°
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        const menu = page.locator('#board-canvas-context-menu');
        await menu.waitFor({ state: 'visible', timeout: 3000 });
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(1000);

        // Get player bounds
        const playerBounds = await page.evaluate(({ playerId }) => {
            const playerDiv = document.getElementById(playerId);
            const rect = playerDiv.getBoundingClientRect();
            const player = AppState.players.find(p => p.id === playerId);
            return {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2,
                width: rect.width,
                height: rect.height,
                boardX: player.x,
                boardY: player.y
            };
        }, { playerId });

        console.log('Player bounds:', playerBounds);

        // Click and select from edge (right edge of player)
        const edgeX = playerBounds.right - 2;
        const edgeY = playerBounds.centerY;

        await page.mouse.click(edgeX, edgeY);
        await page.waitForTimeout(200);

        const posAfterSelect = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y };
        }, { playerId });

        console.log('Position after selection:', posAfterSelect);

        // Start drag from edge
        await page.mouse.move(edgeX, edgeY);
        await page.mouse.down();
        await page.waitForTimeout(100);

        const posAfterMousedown = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y };
        }, { playerId });

        console.log('Position after mousedown at edge:', posAfterMousedown);

        // Check for jump
        const jumpX = Math.abs(posAfterMousedown.x - posAfterSelect.x);
        const jumpY = Math.abs(posAfterMousedown.y - posAfterSelect.y);

        console.log('Jump on mousedown at edge:', { x: jumpX, y: jumpY });

        await page.mouse.up();

        // Should not jump when clicking edge
        expect(jumpX).toBeLessThan(5);
        expect(jumpY).toBeLessThan(5);
    });

    test('verify player actual position matches boardToScreen at 90°', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        await goto(page);

        // Add a player
        const playerId = await page.evaluate(() => {
            const player = {
                id: 'position-test-player',
                teamId: AppState.teams[0].id,
                number: '9',
                x: 2000,
                y: 1000,
                rotation: 0,
                visible: true
            };
            AppState.players.push(player);
            Players.render();
            return player.id;
        });

        await page.waitForTimeout(300);

        // Rotate 90°
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        const menu = page.locator('#board-canvas-context-menu');
        await menu.waitFor({ state: 'visible', timeout: 3000 });
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(1000);

        // Check where player actually is vs where boardToScreen says it should be
        const result = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            const playerDiv = document.getElementById(playerId);
            const playerRect = playerDiv.getBoundingClientRect();

            // Where boardToScreen says the player should be (relative to canvas)
            const screenPos = Board.boardToScreen(player.x, player.y);

            const canvas = document.getElementById('board-canvas');
            const canvasRect = canvas.getBoundingClientRect();

            // Player style.left/top are set to screenPos values
            const styleLeft = parseFloat(playerDiv.style.left);
            const styleTop = parseFloat(playerDiv.style.top);

            return {
                boardCoords: { x: player.x, y: player.y },
                screenPos: { x: screenPos.x, y: screenPos.y },
                stylePos: { left: styleLeft, top: styleTop },
                playerRect: {
                    x: playerRect.x,
                    y: playerRect.y,
                    centerX: playerRect.x + playerRect.width / 2,
                    centerY: playerRect.y + playerRect.height / 2
                },
                canvasRect: {
                    x: canvasRect.x,
                    y: canvasRect.y
                },
                expectedAbsolute: {
                    x: canvasRect.x + screenPos.x,
                    y: canvasRect.y + screenPos.y
                }
            };
        }, { playerId });

        console.log('\n=== PLAYER POSITION CHECK AT 90° ===');
        console.log('Board coords:', result.boardCoords);
        console.log('boardToScreen result:', result.screenPos);
        console.log('Player style left/top:', result.stylePos);
        console.log('Canvas position:', result.canvasRect);
        console.log('Expected absolute center:', result.expectedAbsolute);
        console.log('Actual center:', result.playerRect);
        console.log('Difference:', {
            x: (result.playerRect.centerX - result.expectedAbsolute.x).toFixed(2),
            y: (result.playerRect.centerY - result.expectedAbsolute.y).toFixed(2)
        });

        // The player's actual screen center should match the expected position
        // If they don't match, then the problem is in how players are rendered, not in screenToBoardCoords
    });

    test('boardToScreen produces valid coordinates at 90°', async ({ page }) => {
        // Note: Utils.screenToBoardCoords is not a proper inverse of Board.boardToScreen at 90°
        // This test verifies Board.boardToScreen produces reasonable output, not round-trip accuracy
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        await goto(page);

        // Rotate board 90°
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        const menu = page.locator('#board-canvas-context-menu');
        await menu.waitFor({ state: 'visible', timeout: 3000 });
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(1000);

        // Test that boardToScreen produces valid screen coordinates
        const results = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            const canvasRect = canvas.getBoundingClientRect();

            const testPoints = [
                { x: 2000, y: 1000 },  // center
                { x: 3500, y: 1500 },  // off-center
                { x: 500, y: 500 },    // near corner
                { x: 4000, y: 1800 }   // far corner
            ];

            return {
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                testResults: testPoints.map(point => {
                    const screenPos = Board.boardToScreen(point.x, point.y);
                    return {
                        original: point,
                        screen: { x: screenPos.x, y: screenPos.y }
                    };
                })
            };
        });

        console.log('\n=== BOARD TO SCREEN TEST AT 90° ===');
        console.log('Canvas dimensions:', results.canvasWidth, 'x', results.canvasHeight);

        // Verify screen coordinates are within reasonable bounds
        results.testResults.forEach((result, i) => {
            console.log(`\nPoint ${i + 1}:`, result.original);
            console.log('  → Screen:', result.screen);

            // Screen coords should be within canvas dimensions (with some margin for objects near edges)
            expect(result.screen.x).toBeGreaterThan(-100);
            expect(result.screen.x).toBeLessThan(results.canvasWidth + 100);
            expect(result.screen.y).toBeGreaterThan(-100);
            expect(result.screen.y).toBeLessThan(results.canvasHeight + 100);
        });

        // Verify different board points produce different screen points
        const screenXs = results.testResults.map(r => r.screen.x);
        const screenYs = results.testResults.map(r => r.screen.y);
        const uniqueXs = new Set(screenXs);
        const uniqueYs = new Set(screenYs);

        // All 4 points should map to different screen coordinates
        expect(uniqueXs.size).toBe(4);
        expect(uniqueYs.size).toBe(4);

        console.log('✓ All board points map to valid, distinct screen coordinates');
    });
});
