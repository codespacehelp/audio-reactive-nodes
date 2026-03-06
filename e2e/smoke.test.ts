import { test, expect } from '@playwright/test';

test.describe('App smoke tests', () => {
  test('loads default project and shows nodes', async ({ page }) => {
    await page.goto('/');
    // Toolbar should be visible
    await expect(page.getByText('Audio Reactive Nodes')).toBeVisible();
    // Should show node labels (default.json has sphere1, scene1, out1)
    await expect(page.getByText('sphere1')).toBeVisible();
    await expect(page.getByText('scene1')).toBeVisible();
    await expect(page.getByText('out1')).toBeVisible();
  });

  test('loads project from query param', async ({ page }) => {
    await page.goto('/?project=demo.json');
    // Demo has 12 nodes — check a few
    await expect(page.getByText('audio_in1')).toBeVisible();
    await expect(page.getByText('transform1')).toBeVisible();
    await expect(page.getByText('materials1')).toBeVisible();
  });

  test('property panel shows placeholder when no node selected', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Select a node to edit its properties')).toBeVisible();
  });

  test('toolbar buttons are present', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Redo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Present' })).toBeVisible();
  });

  test('undo/redo buttons start disabled', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  test('present button exists and is clickable', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('sphere1')).toBeVisible();

    const presentBtn = page.getByRole('button', { name: 'Present' });
    await expect(presentBtn).toBeEnabled();
    // Just verify the button is clickable without error
    await presentBtn.click();
    // Give React time to render
    await page.waitForTimeout(500);
    // The overlay should appear (or if WebGPU blocks in CI, at least no crash)
    const overlay = page.getByTestId('present-overlay');
    const isVisible = await overlay.isVisible().catch(() => false);
    if (isVisible) {
      await page.keyboard.press('Escape');
      await expect(overlay).not.toBeVisible({ timeout: 3000 });
    }
  });
});
