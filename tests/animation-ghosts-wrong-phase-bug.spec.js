/**
 * Test for bug where grandchild's intermediate ghosts appear during parent phase animation.
 *
 * Exact reproduction:
 * 1. Create board (root) with player
 * 2. Create child (no movement)
 * 3. Create grandchild and move player with 2 ghosts
 * 4. Play animation - grandchild's ghosts appear during root->child phase (wrong!)
 *
 * Expected: Grandchild's 2 ghosts should ONLY appear during child->grandchild phase
 * Actual (bug): Grandchild's 2 ghosts appear during root->child phase
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

test.describe('Grandchild ghosts appearing in wrong phase', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('grandchild ghosts should only appear during grandchild phase, not during child phase', async ({ page }) => {
        // Step 1: Create root board with player
        await addPlayer(page);
        const playerId = await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 1000;
            player.y = 1000;
            AppState.saveCurrentBoard();
            Players.render();
            return player.id;
        });

        // Step 2: Create child board (no movement)
        await createAndSwitchToChildBoard(page);

        // Step 3: Create grandchild and move player with 2 intermediate ghosts
        await createAndSwitchToChildBoard(page);
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 3000;
            player.y = 1000;
            player._explicitlySet = true;

            // Add 2 intermediate ghost positions
            const key = `player-${playerId}`;
            AppState.pathIntermediates[key] = [
                { x: 1666, y: 1000, rotation: 0 },  // Ghost 1
                { x: 2333, y: 1000, rotation: 0 }   // Ghost 2
            ];
            AppState.saveCurrentBoard();
            Players.render();
        }, { playerId });

        // Step 4: Verify setup - DON'T enable "show all ghosts", use default
        await page.evaluate(() => {
            AppState.animationShowAllGhosts = false; // Default - show only current board ghosts
            AppState.animationShowGhostsAnimation = true; // Show ghosts during animation
            AppState.animationShowGhostsBoard = true; // Show ghosts on board
            AppState.animationRepeat = false;
            AppState.animationDuration = 6000; // Make animation longer for easier sampling
            document.getElementById('animation-show-ghosts-animation').checked = true;
            document.getElementById('animation-show-ghosts-board').checked = true;
        });

        // Verify we have the right board structure
        const setup = await page.evaluate(() => ({
            boardCount: AppState.boards.length,
            currentBoardId: AppState.currentBoardId,
            pathIntermediates: Object.keys(AppState.pathIntermediates),
            intermediateCount: AppState.pathIntermediates[Object.keys(AppState.pathIntermediates)[0]]?.length || 0
        }));

        expect(setup.boardCount).toBe(3);
        expect(setup.intermediateCount).toBe(2);

        // Step 5: Start animation
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(50);

        // Step 6: Check ghosts VERY EARLY in animation (should be phase 0: root->child)
        const phase0Check = await page.evaluate(() => {
            const ghosts = document.querySelectorAll('.ghost-player');
            const currentProgress = Animations.getCurrentProgress();
            const phaseCount = Animations.animationPhaseCount;
            const currentPhase = currentProgress !== null
                ? Math.floor(currentProgress * phaseCount)
                : null;

            // Get info about board chain
            const boardChain = AppState.getBoardAncestryChain();
            const currentBoardIndex = boardChain.findIndex(b => b.id === AppState.currentBoardId);

            return {
                isAnimating: AppState.isAnimating,
                currentProgress,
                currentPhase,
                phaseCount,
                ghostKeys: Array.from(ghosts).map(g => g.dataset.ghostKey),
                showAllGhosts: AppState.animationShowAllGhosts,
                showGhostsAnimation: AppState.animationShowGhostsAnimation,
                boardChainLength: boardChain.length,
                currentBoardIndex,
                pathIntermediatesKeys: Object.keys(AppState.pathIntermediates)
            };
        });

        // During phase 0 (root->child), we should NOT see ANY intermediate ghosts
        // because those ghosts belong to phase 1 (child->grandchild)
        if (phase0Check.currentPhase === 0) {
            const intermediateGhosts = phase0Check.ghostKeys.filter(key =>
                key && (key.includes('-0') || key.includes('-1'))  // -0 and -1 are the two intermediate ghosts
            );

            // THIS IS THE BUG: If we see intermediate ghosts during phase 0, that's wrong!
            expect(intermediateGhosts.length).toBe(0);
        }

        // Wait until we're well into phase 1 (past the first ghost threshold of 1/3)
        // Duration is 6000ms, phase 1 starts at 3000ms
        // First ghost appears at 3000 + (3000 * 0.35) = 4050ms
        await page.waitForTimeout(4100);

        const phase1Check = await page.evaluate(() => {
            if (!AppState.isAnimating) return null;

            const ghosts = document.querySelectorAll('.ghost-player');
            const currentProgress = Animations.getCurrentProgress();
            const phaseCount = Animations.animationPhaseCount;
            const currentPhase = currentProgress !== null
                ? Math.floor(currentProgress * phaseCount)
                : null;

            return {
                currentProgress,
                currentPhase,
                phaseCount,
                ghostKeys: Array.from(ghosts).map(g => g.dataset.ghostKey)
            };
        });

        if (phase1Check) {
            if (phase1Check.currentPhase === 1) {
                // During phase 1, we SHOULD see intermediate ghosts
                const intermediateGhosts = phase1Check.ghostKeys.filter(key =>
                    key && (key.includes('-0') || key.includes('-1'))
                );

                // Debug the exact values being used
                const debugInfo = await page.evaluate(() => {
                    const boardChain = AppState.getBoardAncestryChain();
                    const currentBoardIndex = boardChain.findIndex(b => b.id === AppState.currentBoardId);
                    const phaseForTheseIntermediates = currentBoardIndex - 1;

                    const currentProgress = Animations.getCurrentProgress();
                    const phaseCount = Animations.animationPhaseCount;
                    const phaseProgress = currentProgress * phaseCount;
                    const currentPhase = Math.floor(phaseProgress);
                    const progressInPhase = phaseProgress - currentPhase;

                    const intermediates = AppState.pathIntermediates[Object.keys(AppState.pathIntermediates)[0]];

                    return {
                        currentBoardIndex,
                        phaseForTheseIntermediates,
                        currentProgress,
                        phaseCount,
                        phaseProgress,
                        currentPhase,
                        progressInPhase,
                        intermediatesCount: intermediates?.length,
                        threshold0: intermediates ? (0 + 1) / (intermediates.length + 1) : null,
                        threshold1: intermediates ? (1 + 1) / (intermediates.length + 1) : null
                    };
                });
            }
        }

        // Stop
        await page.locator('#btn-stop').click();
    });
});
