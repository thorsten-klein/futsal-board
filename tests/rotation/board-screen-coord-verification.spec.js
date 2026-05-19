/**
 * Verify that boardToScreen coordinates match where players are actually rendered.
 * This helps diagnose whether the bug is in:
 * - boardToScreen (forward conversion - where players are positioned)
 * - screenToBoardCoords (inverse conversion - how mouse clicks are converted back)
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

test.describe('Board-screen coordinate verification', () => {
    test('verify player actual position matches boardToScreen at 90°', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        await page.setViewportSize({ width: 800, height: 1200 });
        await goto(page);

        // Add player at board center
        await page.evaluate(() => {
            const player = {
                id: 'verify-player',
                type: 'player',
                x: 2000,
                y: 1000,
                number: 10,
                team: 'team1',
                visible: true
            };
            AppState.players.push(player);
            Players.render();
        });

        await page.waitForTimeout(300);

        // Rotate board 90°
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        const menu = page.locator('#board-canvas-context-menu');
        await menu.waitFor({ state: 'visible', timeout: 3000 });
        await menu.locator('[data-action="rotate-right"]').click();

        await page.waitForTimeout(500);

        // Check if player is rendered at boardToScreen position
        const result = await page.evaluate(() => {
            const player = AppState.players.find(p => p.id === 'verify-player');
            const playerDiv = document.getElementById('verify-player');
            const canvas = document.getElementById('board-canvas');
            const playersLayer = document.getElementById('players-layer');
            const boardArea = document.getElementById('board-area');
            const boardContainer = document.querySelector('.board-container');

            if (!player || !playerDiv) {
                return { error: 'Player or div not found' };
            }

            // What boardToScreen says the position should be (canvas-relative)
            const screenPos = Board.boardToScreen(player.x, player.y);

            // Player div's style.left/top (should match screenPos)
            const styleLeft = parseFloat(playerDiv.style.left) || 0;
            const styleTop = parseFloat(playerDiv.style.top) || 0;

            // Player div's actual visual position
            const playerRect = playerDiv.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            const playersLayerRect = playersLayer.getBoundingClientRect();
            const boardAreaRect = boardArea.getBoundingClientRect();
            const containerRect = boardContainer.getBoundingClientRect();

            // Calculate what the visual center should be
            // playerDiv is centered at (styleLeft, styleTop) relative to board-area
            const boardAreaLeft = parseFloat(boardArea.style.left) || 0;
            const boardAreaTop = parseFloat(boardArea.style.top) || 0;
            const playersLayerLeft = parseFloat(playersLayer.style.left) || 0;
            const playersLayerTop = parseFloat(playersLayer.style.top) || 0;

            // Also calculate what canvasScale would be
            const canvasRectForScale = canvas.getBoundingClientRect();
            const scaleX_calc = canvasRectForScale.width / AppState.boardWidth;
            const scaleY_calc = canvasRectForScale.height / AppState.boardHeight;
            const canvasScale_calc = Math.min(scaleX_calc, scaleY_calc);

            return {
                boardCoords: { x: player.x, y: player.y },
                boardToScreenResult: screenPos,
                playerStyle: { left: styleLeft, top: styleTop },
                referenceScale: AppState.referenceScale,
                calculatedCanvasScale: canvasScale_calc,
                playerSizeCalc: 100 * (AppState.referenceScale || canvasScale_calc),
                // Calculate player center from style.left/top + halfSize
                playerCenterFromStyle: {
                    x: styleLeft + (100 * (AppState.referenceScale || canvasScale_calc)) / 2,
                    y: styleTop + (100 * (AppState.referenceScale || canvasScale_calc)) / 2
                },
                playerRect: {
                    left: playerRect.left,
                    top: playerRect.top,
                    width: playerRect.width,
                    height: playerRect.height,
                    centerX: playerRect.left + playerRect.width / 2,
                    centerY: playerRect.top + playerRect.height / 2
                },
                offsets: {
                    playersLayer: { left: playersLayerLeft, top: playersLayerTop },
                    boardArea: { left: boardAreaLeft, top: boardAreaTop }
                },
                canvas: {
                    attr: { width: canvas.width, height: canvas.height },
                    rect: {
                        left: canvasRect.left,
                        top: canvasRect.top,
                        width: canvasRect.width,
                        height: canvasRect.height
                    }
                },
                playersLayerRect: {
                    left: playersLayerRect.left,
                    top: playersLayerRect.top,
                    width: playersLayerRect.width,
                    height: playersLayerRect.height
                },
                containerRect: {
                    left: containerRect.left,
                    top: containerRect.top,
                    width: containerRect.width,
                    height: containerRect.height
                },
                rotation: AppState.boardRotation,
                scaleFactor: AppState.boardRotationScaleFactor,
                transforms: {
                    playersLayer: window.getComputedStyle(playersLayer).transform,
                    canvas: window.getComputedStyle(canvas).transform
                },
                // Check if player center matches boardToScreen
                // boardToScreen returns the center position
                // style.left/top is center - halfSize
                centerMatchesBoardToScreen: {
                    xDiff: Math.abs((styleLeft + (100 * (AppState.referenceScale || canvasScale_calc)) / 2) - screenPos.x),
                    yDiff: Math.abs((styleTop + (100 * (AppState.referenceScale || canvasScale_calc)) / 2) - screenPos.y)
                }
            };
        });

        if (result.error) {
            throw new Error(result.error);
        }

        console.log('\n=== BOARD-TO-SCREEN VERIFICATION AT 90° ===');
        console.log('Rotation:', result.rotation);
        console.log('Scale factor:', result.scaleFactor);
        console.log('\nAppState.referenceScale:', result.referenceScale);
        console.log('Calculated canvasScale:', result.calculatedCanvasScale);
        console.log('Player size (100 * scale):', result.playerSizeCalc);
        console.log('\nBoard coords:', result.boardCoords);
        console.log('boardToScreen result (center):', result.boardToScreenResult);
        console.log('Player style.left/top (top-left):', result.playerStyle);
        console.log('Player center from style:', result.playerCenterFromStyle);
        console.log('Center matches boardToScreen?', {
            xDiff: result.centerMatchesBoardToScreen.xDiff.toFixed(2),
            yDiff: result.centerMatchesBoardToScreen.yDiff.toFixed(2)
        });

        console.log('\nCanvas:');
        console.log('  Attribute:', result.canvas.attr);
        console.log('  Visual rect:', result.canvas.rect);
        console.log('  Transform:', result.transforms.canvas);

        console.log('\nPlayers layer:');
        console.log('  Visual rect:', result.playersLayerRect);
        console.log('  Transform:', result.transforms.playersLayer);
        console.log('  Style offset:', result.offsets.playersLayer);

        console.log('\nPlayer visual:');
        console.log('  Rect:', result.playerRect);
        console.log('  Center on screen:', { x: result.playerRect.centerX, y: result.playerRect.centerY });

        await page.screenshot({ path: 'test_results/board-screen-coord-verification-90deg.png' });

        // Verify that player center matches boardToScreen result
        // boardToScreen returns the center position, style.left/top is center - halfSize
        expect(result.centerMatchesBoardToScreen.xDiff).toBeLessThan(1);
        expect(result.centerMatchesBoardToScreen.yDiff).toBeLessThan(1);
    });
});
