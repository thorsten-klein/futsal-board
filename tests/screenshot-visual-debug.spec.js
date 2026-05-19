/**
 * Visual debugging test for screenshot positioning.
 * Saves the screenshot to a file for manual inspection.
 */
import { test } from './test-config.js';
import { goto } from './helpers.js';
import * as fs from 'fs';
import * as path from 'path';

test.use({
    launchOptions: { args: ['--allow-file-access-from-files'] },
});

test('save screenshot with player at known position for visual inspection', async ({ page }) => {
    await goto(page);

    // Add a player at the center
    await page.locator('.team-player-template').first().click();

    // Get the player's board coordinates
    const playerCoords = await page.evaluate(() => {
        const player = document.querySelector('[data-player-id]');
        if (!player) return null;

        const x = parseFloat(player.dataset.x);
        const y = parseFloat(player.dataset.y);
        return { x, y };
    });

    console.log('Player board coordinates:', playerCoords);

    // Capture screenshot
    const screenshotData = await page.evaluate(async () => {
        window.__screenshotDataUrl = null;
        const origCOU = URL.createObjectURL.bind(URL);
        URL.createObjectURL = function (blob) {
            const url = origCOU(blob);
            const fr = new FileReader();
            fr.onload = () => { window.__screenshotDataUrl = fr.result; };
            fr.readAsDataURL(blob);
            return url;
        };

        document.getElementById('btn-screenshot').click();
        await new Promise(r => setTimeout(r, 100));
        const menuItem = document.querySelector('#screenshot-menu .context-menu-item[data-action="screenshot"][data-width="4500"]');
        if (menuItem) menuItem.click();

        await new Promise(r => {
            const t = setInterval(() => {
                if (window.__screenshotDataUrl) { clearInterval(t); r(); }
            }, 100);
        });

        return window.__screenshotDataUrl;
    });

    // Save to file
    const base64Data = screenshotData.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const outputPath = path.join(process.cwd(), 'test-results', 'screenshot-debug.png');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);

    console.log(`Screenshot saved to: ${outputPath}`);
    console.log(`Player should be at board coordinates: ${playerCoords.x}, ${playerCoords.y}`);
});
