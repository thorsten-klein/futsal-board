/**
 * Test that ghosts only appear in the correct phase by manually setting animation progress.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

async function createAndSwitchToChildBoard(page) {
    const childId = await page.evaluate(() => {
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
    await page.waitForTimeout(200);
    return childId;
}

test.describe('Ghost phase filtering', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('ghosts only appear in correct phase when manually setting progress', async ({ page }) => {
        // Create setup: root -> child -> grandchild
        await addPlayer(page);
        const playerId = await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 1000;
            player.y = 1000;
            AppState.saveCurrentBoard();
            Players.render();
            return player.id;
        });

        await createAndSwitchToChildBoard(page);
        await createAndSwitchToChildBoard(page);
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 3000;
            player.y = 1000;
            player._explicitlySet = true;
            AppState.pathIntermediates[`player-${playerId}`] = [
                { x: 1666, y: 1000, rotation: 0 },
                { x: 2333, y: 1000, rotation: 0 }
            ];
            AppState.saveCurrentBoard();
            Players.render();
        }, { playerId });

        // Enable ghost rendering
        await page.evaluate(() => {
            AppState.animationShowAllGhosts = false;
            AppState.animationShowGhostsAnimation = true;
        });

        // Prepare animation but don't play
        const setupInfo = await page.evaluate(() => {
            const boardChain = AppState.getBoardAncestryChain();
            Animations.buildAnimationChain(boardChain);
            const currentBoardIndex = boardChain.findIndex(b => b.id === AppState.currentBoardId);
            return {
                boardChainLength: boardChain.length,
                currentBoardIndex,
                animationPhaseCount: Animations.animationPhaseCount,
                phaseForIntermediates: currentBoardIndex - 1
            };
        });

        console.log('Setup info:', setupInfo);

        // Test 1: Render at phase 0 (10% overall progress)
        const phase0Result = await page.evaluate(() => {
            Animations.pausedProgress = 0.1;
            Animations.renderIntermediateGhosts(0.1);
            const ghosts = document.querySelectorAll('.ghost-player');
            return {
                progress: 0.1,
                ghostCount: ghosts.length,
                ghostKeys: Array.from(ghosts).map(g => g.dataset.ghostKey)
            };
        });

        console.log('Phase 0 (progress 0.1):', phase0Result);
        expect(phase0Result.ghostCount).toBe(0); // Too early - no ghosts yet (first appears at 33.3%)

        // Test 2: Render past first ghost threshold (40% progress, past 1/3)
        const firstGhostResult = await page.evaluate(() => {
            Animations.pausedProgress = 0.4;
            Animations.renderIntermediateGhosts(0.4);
            const ghosts = document.querySelectorAll('.ghost-player');
            return {
                progress: 0.4,
                ghostCount: ghosts.length,
                ghostKeys: Array.from(ghosts).map(g => g.dataset.ghostKey)
            };
        });

        console.log('First ghost (progress 0.4):', firstGhostResult);
        expect(firstGhostResult.ghostCount).toBe(1); // Should see first ghost

        // Test 3: Render past both ghost thresholds (70% progress, past 2/3)
        const bothGhostsResult = await page.evaluate(() => {
            Animations.pausedProgress = 0.7;
            Animations.renderIntermediateGhosts(0.7);
            const ghosts = document.querySelectorAll('.ghost-player');
            return {
                progress: 0.7,
                ghostCount: ghosts.length,
                ghostKeys: Array.from(ghosts).map(g => g.dataset.ghostKey)
            };
        });

        console.log('Both ghosts (progress 0.7):', bothGhostsResult);
        expect(bothGhostsResult.ghostCount).toBe(2); // Should see both ghosts
    });
});
