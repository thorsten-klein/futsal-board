/**
 * Tests for the board breadcrumb navigation bar.
 *
 * The breadcrumb bar sits between the header and the main content. It shows
 * the ancestry chain of the current board. When the user navigates up to a
 * parent, the previously-active child remains visible but grayed out (forward
 * trail). Clicking any item navigates to that board. A Settings toggle
 * enables/disables the bar; the setting persists in localStorage.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

const breadcrumb = (page) => page.locator('#board-breadcrumb');
const items = (page) => page.locator('#board-breadcrumb .breadcrumb-item');
const currentItem = (page) => page.locator('#board-breadcrumb .breadcrumb-item.current');
const grayedItems = (page) => page.locator('#board-breadcrumb .breadcrumb-item.grayed');

/** Create a child board, switch to it, and update the breadcrumb trail. */
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

/** Open the Settings sidebar tab so its checkboxes become visible. */
async function openSettingsTab(page) {
    await page.locator('.sidebar-tab[data-tab="settings"]').click();
    await page.waitForTimeout(100);
}

test.describe('Board breadcrumb navigation bar', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    // ── Visibility ──────────────────────────────────────────────────────────

    test('breadcrumb bar is visible by default', async ({ page }) => {
        await expect(breadcrumb(page)).toBeVisible();
    });

    test('Settings toggle hides and shows the breadcrumb bar', async ({ page }) => {
        await openSettingsTab(page);
        const toggle = page.locator('#show-board-breadcrumb');

        // Uncheck → bar disappears
        await toggle.uncheck();
        await expect(breadcrumb(page)).toBeHidden();

        // Re-check → bar reappears
        await toggle.check();
        await expect(breadcrumb(page)).toBeVisible();
    });

    // ── Content on root board ────────────────────────────────────────────────

    test('shows the root board name as the current item', async ({ page }) => {
        const rootName = await page.evaluate(() =>
            AppState.boards.find(b => b.id === AppState.currentBoardId)?.name || ''
        );
        await expect(currentItem(page)).toHaveText(rootName);
        await expect(items(page)).toHaveCount(1);
    });

    // ── Ancestry chain ──────────────────────────────────────────────────────

    test('shows parent and child board names after navigating to child', async ({ page }) => {
        const parentName = await page.evaluate(() =>
            AppState.boards.find(b => b.id === AppState.currentBoardId)?.name || ''
        );

        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        const childName = await page.evaluate(() =>
            AppState.boards.find(b => b.id === AppState.currentBoardId)?.name || ''
        );

        await expect(items(page)).toHaveCount(2);
        await expect(items(page).first()).toHaveText(parentName);
        await expect(currentItem(page)).toHaveText(childName);
    });

    test('shows three items for grandchild board', async ({ page }) => {
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(100);
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        await expect(items(page)).toHaveCount(3);
    });

    // ── Forward trail (navigate up) ─────────────────────────────────────────

    test('child item stays visible but grayed after navigating up to parent', async ({ page }) => {
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(100);

        const childName = await page.evaluate(() =>
            AppState.boards.find(b => b.id === AppState.currentBoardId)?.name || ''
        );

        // Navigate back to root
        await page.evaluate(() => Storage.switchBoard('board-1'));
        await page.waitForTimeout(200);

        // Two items: root (current) + child (grayed)
        await expect(items(page)).toHaveCount(2);
        await expect(grayedItems(page)).toHaveCount(1);
        await expect(grayedItems(page)).toHaveText(childName);
        await expect(currentItem(page)).not.toHaveText(childName);
    });

    test('grandchild items stay grayed after navigating up two levels', async ({ page }) => {
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(100);
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(100);

        // Navigate up to root
        await page.evaluate(() => Storage.switchBoard('board-1'));
        await page.waitForTimeout(200);

        // Root is current; child and grandchild are grayed
        await expect(items(page)).toHaveCount(3);
        await expect(grayedItems(page)).toHaveCount(2);
        await expect(currentItem(page)).toHaveCount(1);
    });

    test('forward trail resets when navigating to a different branch', async ({ page }) => {
        // Navigate into child-A
        const childAId = await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(100);

        // Go back to root
        await page.evaluate(() => Storage.switchBoard('board-1'));
        await page.waitForTimeout(100);

        // Create child-B from root (different branch)
        const childBId = await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Trail must have reset: only root + child-B (not child-A)
        await expect(items(page)).toHaveCount(2);
        const trailIds = await page.evaluate(() => AppState.breadcrumbTrail);
        expect(trailIds).not.toContain(childAId);
        expect(trailIds).toContain(childBId);
    });

    // ── Navigation by clicking ───────────────────────────────────────────────

    test('clicking a parent item in the breadcrumb navigates to that board', async ({ page }) => {
        const rootId = await page.evaluate(() => AppState.currentBoardId);
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Click the first breadcrumb item (parent/root)
        await items(page).first().click();
        await page.waitForTimeout(200);

        const currentId = await page.evaluate(() => AppState.currentBoardId);
        expect(currentId).toBe(rootId);
    });

    test('clicking a grayed child item navigates back to that board', async ({ page }) => {
        const childId = await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(100);

        // Navigate to root so child becomes grayed
        await page.evaluate(() => Storage.switchBoard('board-1'));
        await page.waitForTimeout(200);

        // Click the grayed child item
        await grayedItems(page).first().click();
        await page.waitForTimeout(200);

        const currentId = await page.evaluate(() => AppState.currentBoardId);
        expect(currentId).toBe(childId);
    });

    // ── Breadcrumb updates on board rename ───────────────────────────────────

    test('breadcrumb reflects renamed board immediately', async ({ page }) => {
        await page.evaluate(() => {
            AppState.renameBoard(AppState.currentBoardId, 'My Renamed Board');
            Breadcrumb.render();
        });
        await page.waitForTimeout(100);

        await expect(currentItem(page)).toHaveText('My Renamed Board');
    });

    // ── Setting persistence ──────────────────────────────────────────────────

    test('breadcrumb toggle state persists across page reload', async ({ page }) => {
        // Turn off the breadcrumb via the JS API (saves to localStorage)
        await page.evaluate(() => Breadcrumb.setVisible(false));
        await expect(breadcrumb(page)).toBeHidden();

        // Reload the page (localStorage is not cleared by goto, just by reload via test setup)
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);

        // Breadcrumb should still be hidden
        await expect(breadcrumb(page)).toBeHidden();
        await expect(page.locator('#show-board-breadcrumb')).not.toBeChecked();
    });

    test('breadcrumb remains visible after page reload when setting is on', async ({ page }) => {
        // It's already on by default — just reload
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);

        await expect(breadcrumb(page)).toBeVisible();
        await expect(page.locator('#show-board-breadcrumb')).toBeChecked();
    });
});
