/**
 * Per-board frame speed tests.
 *
 * Bug: the animation loop applied AppState.playbackSpeed (the *current* board's
 * speed) uniformly to every phase, ignoring the speed setting of boards earlier
 * in the chain.  Each phase must run at the speed of the child board that
 * introduced that transition.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

/**
 * Build a 3-board chain:
 *   root (speed=1.0) → child1 (speed=slowSpeed) → child2 (speed=fastSpeed)
 *
 * Returns the player id and board ids.
 */
async function setupMultiSpeedAnimation(page, slowSpeed = 0.5, fastSpeed = 2.0) {
    await addPlayer(page);
    const playerId = await page.evaluate(() => AppState.players[0].id);

    // Save root and record player start position
    const rootPos = await page.evaluate(({ playerId }) => {
        AppState.saveCurrentBoard();
        const p = AppState.players.find(p => p.id === playerId);
        return { x: p.x, y: p.y };
    }, { playerId });

    // Create child1 with slowSpeed, move player to B
    const child1Id = await page.evaluate(({ playerId, slowSpeed }) => {
        const childId = AppState.createChildBoard(AppState.currentBoardId);
        AppState.loadBoard(childId);
        // Override the inherited speed
        AppState.playbackSpeed = slowSpeed;
        const p = AppState.players.find(p => p.id === playerId);
        p.x = 2000;
        p.y = 1000;
        p._explicitlySet = true;
        AppState.saveToLocalStorage(); // saves speed + player to child1
        Players.render();
        Animations.renderParentPaths();
        return childId;
    }, { playerId, slowSpeed });
    await page.waitForTimeout(200);

    // Create child2 with fastSpeed, move player to C
    const child2Id = await page.evaluate(({ playerId, fastSpeed }) => {
        const childId = AppState.createChildBoard(AppState.currentBoardId);
        AppState.loadBoard(childId);
        AppState.playbackSpeed = fastSpeed;
        const p = AppState.players.find(p => p.id === playerId);
        p.x = 3000;
        p.y = 1000;
        p._explicitlySet = true;
        AppState.saveToLocalStorage();
        Players.render();
        Animations.renderParentPaths();
        return childId;
    }, { playerId, fastSpeed });
    await page.waitForTimeout(200);

    return { playerId, child1Id, child2Id, rootPos };
}

test.describe('Per-board frame speed', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    // ── Regression test: fails before fix ────────────────────────────────────

    test('buildAnimationChain stores per-phase speeds from each child board', async ({ page }) => {
        await setupMultiSpeedAnimation(page, 0.5, 2.0);

        const phaseSpeeds = await page.evaluate(() => {
            const chain = AppState.getBoardAncestryChain();
            Animations.buildAnimationChain(chain);
            Animations.animationPhaseCount = chain.length - 1;
            return Animations.animationPhaseSpeeds;
        });

        // Phase 0 (root → child1) must use child1's speed (0.5)
        // Phase 1 (child1 → child2) must use child2's speed (2.0)
        expect(phaseSpeeds).toEqual([0.5, 2.0]);
    });

    test('total real animation duration sums per-phase durations', async ({ page }) => {
        await setupMultiSpeedAnimation(page, 0.5, 2.0);

        const result = await page.evaluate(() => {
            const chain = AppState.getBoardAncestryChain();
            Animations.buildAnimationChain(chain);
            Animations.animationPhaseCount = chain.length - 1;
            return {
                totalRealDuration: Animations.animationTotalRealDuration,
                animDuration: AppState.animationDuration,
            };
        });

        // Expected: animDuration/0.5 + animDuration/2.0 = 2D + 0.5D = 2.5D
        const expected = result.animDuration / 0.5 + result.animDuration / 2.0;
        expect(result.totalRealDuration).toBeCloseTo(expected, 0);
    });

    test('normalizedToRealMs maps phase boundary at 50% to slow-phase real duration', async ({ page }) => {
        await setupMultiSpeedAnimation(page, 0.5, 2.0);

        const result = await page.evaluate(() => {
            const chain = AppState.getBoardAncestryChain();
            Animations.buildAnimationChain(chain);
            Animations.animationPhaseCount = chain.length - 1;
            // At normalizedProgress=0.5 we should be at the end of phase 0
            const realMsAtHalf = Animations.normalizedToRealMs(0.5);
            // Phase 0 real duration = animDuration / 0.5 = 2 * animDuration
            const expectedPhase0Duration = AppState.animationDuration / 0.5;
            return { realMsAtHalf, expectedPhase0Duration };
        });

        expect(result.realMsAtHalf).toBeCloseTo(result.expectedPhase0Duration, 0);
    });

    test('realMsToNormalized and normalizedToRealMs are inverse operations', async ({ page }) => {
        await setupMultiSpeedAnimation(page, 0.5, 2.0);

        const { errors } = await page.evaluate(() => {
            const chain = AppState.getBoardAncestryChain();
            Animations.buildAnimationChain(chain);
            Animations.animationPhaseCount = chain.length - 1;

            const testPoints = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0];
            const errors = testPoints.map(p => {
                const realMs = Animations.normalizedToRealMs(p);
                const roundTrip = Animations.realMsToNormalized(realMs);
                return Math.abs(roundTrip - p);
            });
            return { errors };
        });

        errors.forEach(e => expect(e).toBeLessThan(0.001));
    });

    // ── Functional tests ─────────────────────────────────────────────────────

    test('frame speed dropdown setting is saved per board and not shared', async ({ page }) => {
        await setupMultiSpeedAnimation(page, 0.5, 2.0);

        // Verify child2 currently has speed 2.0 loaded
        const child2Speed = await page.evaluate(() => AppState.playbackSpeed);
        expect(child2Speed).toBe(2.0);

        // Navigate back to child1 and verify it has its own speed
        const child1Speed = await page.evaluate(() => {
            // chain = [root, child1, child2] — child1 is index 1
            const chain = AppState.getBoardAncestryChain();
            AppState.loadBoard(chain[1].id);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
            return AppState.playbackSpeed;
        });

        // child1 was set to 0.5 — must be separate from child2's 2.0
        expect(child1Speed).toBe(0.5);
    });

    test('seeking to phase boundary puts player at intermediate board position', async ({ page }) => {
        const { playerId } = await setupMultiSpeedAnimation(page, 0.5, 2.0);

        // Seek to exactly 50% (normalizedProgress = 0.5 = end of phase 0 / start of phase 1)
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(200);
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        // Click at 50% on the progress bar
        const container = page.locator('#animation-progress-container');
        const box = await container.boundingBox();
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
        await page.waitForTimeout(150);

        // Player should be close to child1 position (2000, 1000) — the phase boundary
        const playerPos = await page.evaluate(({ playerId }) => {
            const p = AppState.players.find(p => p.id === playerId);
            return { x: p.x, y: p.y };
        }, { playerId });

        expect(playerPos.x).toBeCloseTo(2000, -1); // within ~50px
        expect(playerPos.y).toBeCloseTo(1000, -1);
    });
});
