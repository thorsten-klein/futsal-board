/**
 * Test for element drag amplification bug at 90° rotation.
 * Compare with player drag to see if the bug is player-specific.
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

test.describe('Element drag amplification at 90°', () => {
    test('element drag amplification at 90° rotation', async ({ page }) => {
        await goto(page);

        // Rotate board 90°
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        const menu = page.locator('#board-canvas-context-menu');
        await menu.waitFor({ state: 'visible' });
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        // Add a goal element at (2000, 1000)
        const elementId = await page.evaluate(() => {
            const element = {
                id: `element-${AppState.nextElementId++}`,
                type: 'goal',
                x: 2000,
                y: 1000,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(element);
            Elements.render();
            return element.id;
        });

        await page.waitForTimeout(300);

        // Get initial position
        const initialBox = await page.locator(`#${elementId}`).boundingBox();
        const initialPos = { left: initialBox.x, top: initialBox.y };
        console.log('Initial element position:', initialPos);

        // Drag 1px from offset position (5px from center)
        const dragStartX = initialBox.x + initialBox.width / 2 + 5;
        const dragStartY = initialBox.y + initialBox.height / 2 + 5;

        // Use Playwright's mouse to drag
        await page.mouse.move(dragStartX, dragStartY);
        await page.mouse.down();
        await page.waitForTimeout(100);

        // Check drag offset
        const dragOffset = await page.evaluate(() => AppState.dragOffset);
        console.log('Element dragOffset:', dragOffset);

        // Drag 1px
        await page.mouse.move(dragStartX + 1, dragStartY + 1, { steps: 2 });
        await page.waitForTimeout(100);

        // Position after drag
        const dragBox = await page.locator(`#${elementId}`).boundingBox();
        const dragPos = { left: dragBox.x, top: dragBox.y };
        console.log('After 1px drag:', dragPos);

        // Release mouse
        await page.mouse.up();
        await page.waitForTimeout(300);

        // Calculate movement
        const movementX = Math.abs(dragPos.left - initialPos.left);
        const movementY = Math.abs(dragPos.top - initialPos.top);
        const totalMovement = Math.sqrt(movementX ** 2 + movementY ** 2);

        console.log('\n=== ELEMENT DRAG TEST ===');
        console.log(`Movement: X=${movementX.toFixed(2)}px, Y=${movementY.toFixed(2)}px`);
        console.log(`Total: ${totalMovement.toFixed(2)}px`);
        console.log(`Amplification: ${totalMovement.toFixed(1)}x`);

        if (totalMovement > 2) {
            console.log(`⚠️  BUG: Element drag also amplified by ${totalMovement.toFixed(1)}x!`);
        } else {
            console.log(`✓ Element drag is OK (no amplification)`);
        }

        // Expectation: 1px drag should move ~1-2px
        expect(totalMovement).toBeLessThan(2);
    });
});
