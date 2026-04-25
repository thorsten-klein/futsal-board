/**
 * Tests that breadcrumb items are navigable via touch (phone tap).
 *
 * The root cause of the bug: the global touchstart handler in app.js calls
 * e.preventDefault() for any element where isInteractiveUI() returns false.
 * When preventDefault() is called on touchstart the browser suppresses the
 * synthetic click event it would otherwise fire after touchend, so the
 * breadcrumb item's click listener never runs and navigation is silently skipped.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

// Run these tests with touch input enabled so page.touchscreen.tap() triggers
// real CDP-level touch events (the same path a phone uses).
test.use({ hasTouch: true });

const items = (page) => page.locator('#board-breadcrumb .breadcrumb-item');
const grayedItems = (page) => page.locator('#board-breadcrumb .breadcrumb-item.grayed');

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
            Breadcrumb.update();
        }
        return childId;
    });
}

test.describe('Breadcrumb touch navigation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('tapping a parent breadcrumb item navigates to that board', async ({ page }) => {
        const rootId = await page.evaluate(() => AppState.currentBoardId);

        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Breadcrumb now shows: [root] › [child(current)]
        await expect(items(page)).toHaveCount(2);

        // Tap the first item (root/parent)
        const bb = await items(page).first().boundingBox();
        await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
        await page.waitForTimeout(200);

        const currentId = await page.evaluate(() => AppState.currentBoardId);
        expect(currentId).toBe(rootId);
    });

    test('tapping a grayed child item navigates forward to that board', async ({ page }) => {
        const childId = await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(100);

        // Navigate back up to root so child becomes grayed
        await page.evaluate(() => Storage.switchBoard('board-1'));
        await page.waitForTimeout(200);

        // Breadcrumb: [root(current)] › [child(grayed)]
        await expect(grayedItems(page)).toHaveCount(1);

        // Tap the grayed child item
        const bb = await grayedItems(page).first().boundingBox();
        await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2);
        await page.waitForTimeout(200);

        const currentId = await page.evaluate(() => AppState.currentBoardId);
        expect(currentId).toBe(childId);
    });
});
