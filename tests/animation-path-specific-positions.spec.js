/**
 * Test with exact positions provided by user
 *
 * Root: 1000, 500
 * Child: 1000, 1000
 * Grandchild: 1000, 1500
 *
 * Bug: After "go to start" on child, navigating to grandchild shows
 * path starting from 1000,500 (root) instead of 1000,1000 (child)
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Animation Path Bug - Specific Positions', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('path origin with positions 1000,500 -> 1000,1000 -> 1000,1500', async ({ page }) => {
        // Add player to root board
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Set player to position 1000, 500 on ROOT
        const rootPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 1000;
            player.y = 500;
            AppState.saveCurrentBoard();
            return { x: player.x, y: player.y };
        }, { playerId });

        expect(rootPos.x).toBe(1000);
        expect(rootPos.y).toBe(500);

        // Create Child board
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            Players.render();
        });

        // Move player to 1000, 1000 on CHILD
        const childPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 1000;
            player.y = 1000;
            player._explicitlySet = true;
            AppState.saveCurrentBoard();
            Players.render();
            return { x: player.x, y: player.y };
        }, { playerId });

        expect(childPos.x).toBe(1000);
        expect(childPos.y).toBe(1000);

        const childBoardId = await page.evaluate(() => AppState.currentBoardId);

        // Create Grandchild board
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const grandchildId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(grandchildId);
            Players.render();
        });

        // Move player to 1000, 1500 on GRANDCHILD
        const grandchildPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 1000;
            player.y = 1500;
            player._explicitlySet = true;
            AppState.saveCurrentBoard();
            Players.render();
            if (typeof Animations !== 'undefined') {
                Animations.renderParentPaths();
            }
            return { x: player.x, y: player.y };
        }, { playerId });

        expect(grandchildPos.x).toBe(1000);
        expect(grandchildPos.y).toBe(1500);

        await page.waitForTimeout(200);

        // Navigate to CHILD using breadcrumb (using Storage.switchBoard like the real UI)

        // Use Storage.switchBoard() like the real breadcrumb click does
        await page.evaluate(({ childBoardId }) => {
            Storage.switchBoard(childBoardId);
        }, { childBoardId });

        await page.waitForTimeout(300);

        const onChildBefore = await page.evaluate(({ playerId }) => ({
            playerPos: AppState.players.find(p => p.id === playerId),
            parentPos: AppState.parentPlayerPositions?.[playerId]
        }), { playerId });


        expect(onChildBefore.playerPos.x).toBe(1000);
        expect(onChildBefore.playerPos.y).toBe(1000);

        // Click "Go to start frame"
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const afterGoToStart = await page.evaluate(({ playerId }) => ({
            playerPos: AppState.players.find(p => p.id === playerId),
            parentPos: AppState.parentPlayerPositions?.[playerId]
        }), { playerId });


        // Player should be at ROOT position (1000, 500)
        expect(afterGoToStart.playerPos.x).toBe(1000);
        expect(afterGoToStart.playerPos.y).toBe(500);

        // Navigate to GRANDCHILD using breadcrumb (using Storage.switchBoard like the real UI)

        const grandchildBoardId = await page.evaluate(({ childBoardId }) => {
            return AppState.boards.find(b => b.parentId === childBoardId)?.id;
        }, { childBoardId });

        // Use Storage.switchBoard() like the real breadcrumb click does
        await page.evaluate(({ grandchildBoardId }) => {
            Storage.switchBoard(grandchildBoardId);
        }, { grandchildBoardId });

        await page.waitForTimeout(300);

        // Check the path on GRANDCHILD
        const onGrandchild = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            const parentPos = AppState.parentPlayerPositions?.[playerId];

            const canvas = AppState.canvas;
            const scaleX = canvas.width / AppState.boardWidth;
            const scaleY = canvas.height / AppState.boardHeight;

            const pathLine = document.querySelector('.path-line');
            const pathD = pathLine?.getAttribute('d');

            let pathStartX, pathStartY, pathEndX, pathEndY;
            if (pathD) {
                const match = pathD.match(/M\s*([\d.]+)\s+([\d.]+).*L\s*([\d.]+)\s+([\d.]+)/);
                if (match) {
                    pathStartX = parseFloat(match[1]);
                    pathStartY = parseFloat(match[2]);
                    pathEndX = parseFloat(match[3]);
                    pathEndY = parseFloat(match[4]);
                }
            }

            // Expected positions scaled to canvas
            const rootScaled = { x: 1000 * scaleX, y: 500 * scaleY };
            const childScaled = { x: 1000 * scaleX, y: 1000 * scaleY };
            const grandchildScaled = { x: 1000 * scaleX, y: 1500 * scaleY };

            // Unscale the path start to compare with original coordinates
            const pathStartUnscaled = {
                x: pathStartX / scaleX,
                y: pathStartY / scaleY
            };

            return {
                playerPos: { x: player.x, y: player.y },
                parentPos,
                pathStart: { x: pathStartX, y: pathStartY },
                pathStartUnscaled,
                pathEnd: { x: pathEndX, y: pathEndY },
                rootScaled,
                childScaled,
                grandchildScaled,
                hasPath: !!pathLine,
                pathD,
                scaleX,
                scaleY
            };
        }, { playerId });


        // Check if path starts from Root (BUG) or Child (CORRECT)
        const startsFromRoot = Math.abs(onGrandchild.pathStartUnscaled.y - 500) < 10;
        const startsFromChild = Math.abs(onGrandchild.pathStartUnscaled.y - 1000) < 10;


        if (startsFromRoot) {
        } else if (startsFromChild) {
        } else {
        }

        // Assertions
        expect(onGrandchild.hasPath).toBe(true);

        // Player should be at Grandchild position
        expect(onGrandchild.playerPos.x).toBe(1000);
        expect(onGrandchild.playerPos.y).toBe(1500);

        // Parent position should be CHILD (1000, 1000)
        expect(onGrandchild.parentPos.x).toBe(1000);
        expect(onGrandchild.parentPos.y).toBe(1000);

        // Path should start from CHILD position (1000, 1000)
        // NOT from ROOT position (1000, 500)
        expect(onGrandchild.pathStartUnscaled.x).toBeCloseTo(1000, 0);
        expect(onGrandchild.pathStartUnscaled.y).toBeCloseTo(1000, 0);

        // Specifically NOT from root Y=500
        expect(Math.abs(onGrandchild.pathStartUnscaled.y - 500)).toBeGreaterThan(50);
    });
});
