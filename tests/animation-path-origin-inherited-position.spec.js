/**
 * Test path origin when grandchild inherits position from child (not explicitly set)
 * This might be the actual bug scenario
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Animation Path Origin with Inherited Position', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('path when grandchild inherits position from child, then go to start on child and navigate to grandchild', async ({ page }) => {
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Record root position
        const rootPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            AppState.saveCurrentBoard();
            return { x: player.x, y: player.y };
        }, { playerId });


        // Create Child
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            Players.render();
        });

        const childPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 2000;
            player.y = 1000;
            player._explicitlySet = true;
            AppState.saveCurrentBoard();
            Players.render();
            return { x: player.x, y: player.y };
        }, { playerId });

        const childBoardId = await page.evaluate(() => AppState.currentBoardId);


        // Create Grandchild - DON'T move player, let it inherit from Child
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const grandchildId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(grandchildId);
            Players.render();
            // Player inherits position from Child, don't move it
            AppState.saveCurrentBoard(); // Save without moving player
            if (typeof Animations !== 'undefined') {
                Animations.renderParentPaths();
            }
        });

        const grandchildBoardId = await page.evaluate(() => AppState.currentBoardId);

        const grandchildPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y };
        }, { playerId });


        // Should be same as child
        expect(grandchildPos.x).toBe(childPos.x);
        expect(grandchildPos.y).toBe(childPos.y);

        // Navigate to Child board
        await page.evaluate(({ childBoardId }) => {
            AppState.loadBoard(childBoardId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }, { childBoardId });

        await page.waitForTimeout(300);

        // Click "go to start" on Child board
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const afterGoToStart = await page.evaluate(({ playerId }) => ({
            playerPos: AppState.players.find(p => p.id === playerId),
        }), { playerId });


        // Player should be at root position
        expect(afterGoToStart.playerPos.x).toBe(rootPos.x);
        expect(afterGoToStart.playerPos.y).toBe(rootPos.y);

        // Navigate to Grandchild board
        await page.evaluate(({ grandchildBoardId }) => {
            AppState.loadBoard(grandchildBoardId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }, { grandchildBoardId });

        await page.waitForTimeout(300);

        const onGrandchild = await page.evaluate(({ playerId, childPos, rootPos }) => {
            const player = AppState.players.find(p => p.id === playerId);
            const canvas = AppState.canvas;
            const scaleX = canvas.width / AppState.boardWidth;
            const scaleY = canvas.height / AppState.boardHeight;

            const pathLine = document.querySelector('.path-line');
            const pathD = pathLine?.getAttribute('d');

            let pathStartX, pathStartY;
            if (pathD) {
                const match = pathD.match(/M\s*([\d.]+)\s+([\d.]+)/);
                if (match) {
                    pathStartX = parseFloat(match[1]);
                    pathStartY = parseFloat(match[2]);
                }
            }

            const expectedChildScaled = {
                x: childPos.x * scaleX,
                y: childPos.y * scaleY
            };
            const expectedRootScaled = {
                x: rootPos.x * scaleX,
                y: rootPos.y * scaleY
            };

            return {
                playerPos: { x: player.x, y: player.y },
                parentPlayerPos: AppState.parentPlayerPositions?.[playerId],
                pathStart: { x: pathStartX, y: pathStartY },
                expectedChildScaled,
                expectedRootScaled,
                hasPath: !!pathLine,
                pathD
            };
        }, { playerId, childPos, rootPos });


        const pathStartsFromChild =
            Math.abs(onGrandchild.pathStart.x - onGrandchild.expectedChildScaled.x) < 5 &&
            Math.abs(onGrandchild.pathStart.y - onGrandchild.expectedChildScaled.y) < 5;

        const pathStartsFromRoot =
            Math.abs(onGrandchild.pathStart.x - onGrandchild.expectedRootScaled.x) < 5 &&
            Math.abs(onGrandchild.pathStart.y - onGrandchild.expectedRootScaled.y) < 5;

        if (pathStartsFromRoot) {
        } else if (pathStartsFromChild) {
        }

        // When grandchild inherits child's position (no movement), no path should be shown
        // This is correct behavior
        expect(onGrandchild.hasPath).toBe(false);
    });
});
