import { test, expect } from '@playwright/test';
import { ElectronApplication, Page, _electron as electron } from 'playwright';
import path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  // Use the test-specific main file that always loads built files
  const testMainPath = path.join(__dirname, '../dist/main/test-index.js');
  console.log('Using test main file:', testMainPath);
  
  // In CI, we need to specify the app directory explicitly
  const appDir = path.join(__dirname, '..');
  
  electronApp = await electron.launch({
    args: [testMainPath],
    cwd: appDir,
  });
  
  // Wait for the first BrowserWindow to open
  page = await electronApp.firstWindow();
  
  // Wait for the page to be fully loaded
  await page.waitForLoadState('domcontentloaded');
}, 45000);

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});

test.describe('VibeTree Desktop App', () => {
  test('should launch and display project selector', async () => {
    // Verify the main heading is present
    await expect(page.locator('h2', { hasText: 'Select a Project' })).toBeVisible();
    
    // Verify the description text is present
    await expect(page.locator('text=Choose a git repository to start collaborating')).toBeVisible();
    
    // Verify the "Open Project Folder" button is present and enabled
    const openButton = page.locator('button', { hasText: 'Open Project Folder' });
    await expect(openButton).toBeVisible();
    await expect(openButton).toBeEnabled();
    
    // Verify the folder icon is present in the button
    await expect(page.locator('button:has-text("Open Project Folder") svg')).toBeVisible();
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-success-screenshot.png', fullPage: true });
  });

  test('should trigger file dialog when clicking open project folder', async () => {
    const openButton = page.locator('button', { hasText: 'Open Project Folder' });
    await expect(openButton).toBeVisible();
    
    // Set up a listener for dialog events (this would normally open a native dialog)
    // In a real implementation, you'd mock the IPC response
    // For this test, we just verify the button can be clicked
    
    // Click the button (this will attempt to trigger the dialog)
    // Note: In CI/headless mode, the native dialog won't appear but the click will register
    await openButton.click();
    
    // Since we can't easily mock the IPC dialog response in this simple test,
    // we just verify that the button click was registered successfully
    // In a real test suite, you would mock window.electronAPI.dialog.selectDirectory
    
    // Verify the button is still visible after clicking (app shouldn't crash)
    await expect(openButton).toBeVisible();
    
    console.log('✓ Open Project Folder button click registered successfully');
  });
});