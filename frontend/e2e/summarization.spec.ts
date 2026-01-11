import { test, expect } from '@playwright/test';
import testData from '../../test-data/sample-notes.json';

test.describe('PEGASUS Summarization Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Mock authentication if needed
    // This would depend on your auth implementation
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'test-token');
    });
  });

  test('should generate summary for medium-length note', async ({ page }) => {
    const testNote = testData.notes.find(note => note.id === 'test-note-2');
    
    // Navigate to notes page
    await page.goto('/notes/create');
    
    // Fill in note content
    await page.fill('[data-testid="note-title"]', testNote!.title);
    await page.fill('[data-testid="note-content"]', testNote!.content);
    
    // Click generate summary button
    await page.click('[data-testid="generate-summary-btn"]');
    
    // Verify loading state
    await expect(page.locator('[data-testid="summary-loading"]')).toBeVisible();
    
    // Wait for summary to be generated
    await expect(page.locator('[data-testid="summary-content"]')).toBeVisible({ timeout: 30000 });
    
    // Verify summary is not empty
    const summaryText = await page.textContent('[data-testid="summary-content"]');
    expect(summaryText).toBeTruthy();
    expect(summaryText!.length).toBeGreaterThan(10);
  });

  test('should handle empty content gracefully', async ({ page }) => {
    const testNote = testData.notes.find(note => note.id === 'test-note-4');
    
    await page.goto('/notes/create');
    
    // Fill in empty content
    await page.fill('[data-testid="note-title"]', testNote!.title);
    await page.fill('[data-testid="note-content"]', testNote!.content);
    
    // Click generate summary button
    await page.click('[data-testid="generate-summary-btn"]');
    
    // Verify error message is shown
    await expect(page.locator('[data-testid="summary-error"]')).toBeVisible();
    
    // Verify error message content
    const errorText = await page.textContent('[data-testid="summary-error"]');
    expect(errorText).toContain('empty');
  });

  test('should detect content changes and show staleness indicator', async ({ page }) => {
    const testNote = testData.notes.find(note => note.id === 'test-note-1');
    
    await page.goto('/notes/create');
    
    // Create note with initial content
    await page.fill('[data-testid="note-title"]', testNote!.title);
    await page.fill('[data-testid="note-content"]', testNote!.content);
    
    // Generate initial summary
    await page.click('[data-testid="generate-summary-btn"]');
    await expect(page.locator('[data-testid="summary-content"]')).toBeVisible({ timeout: 30000 });
    
    // Modify the content
    await page.fill('[data-testid="note-content"]', testNote!.content + ' Additional content added.');
    
    // Verify staleness indicator appears
    await expect(page.locator('[data-testid="summary-stale-indicator"]')).toBeVisible();
  });

  test('should handle long content with chunking', async ({ page }) => {
    const testNote = testData.notes.find(note => note.id === 'test-note-8');
    
    await page.goto('/notes/create');
    
    // Fill in long content
    await page.fill('[data-testid="note-title"]', testNote!.title);
    await page.fill('[data-testid="note-content"]', testNote!.content);
    
    // Click generate summary button
    await page.click('[data-testid="generate-summary-btn"]');
    
    // Verify progress indicator for chunking
    await expect(page.locator('[data-testid="chunking-progress"]')).toBeVisible();
    
    // Wait for summary to be generated (longer timeout for chunking)
    await expect(page.locator('[data-testid="summary-content"]')).toBeVisible({ timeout: 60000 });
    
    // Verify summary is coherent and not empty
    const summaryText = await page.textContent('[data-testid="summary-content"]');
    expect(summaryText).toBeTruthy();
    expect(summaryText!.length).toBeGreaterThan(50);
  });

  test('should allow editing generated summary', async ({ page }) => {
    const testNote = testData.notes.find(note => note.id === 'test-note-1');
    
    await page.goto('/notes/create');
    
    // Create note and generate summary
    await page.fill('[data-testid="note-title"]', testNote!.title);
    await page.fill('[data-testid="note-content"]', testNote!.content);
    await page.click('[data-testid="generate-summary-btn"]');
    await expect(page.locator('[data-testid="summary-content"]')).toBeVisible({ timeout: 30000 });
    
    // Click edit summary button
    await page.click('[data-testid="edit-summary-btn"]');
    
    // Verify summary is editable
    await expect(page.locator('[data-testid="summary-editor"]')).toBeVisible();
    
    // Edit the summary
    const editedSummary = 'This is an edited summary.';
    await page.fill('[data-testid="summary-editor"]', editedSummary);
    
    // Save the edited summary
    await page.click('[data-testid="save-summary-btn"]');
    
    // Verify the edited summary is displayed
    const summaryText = await page.textContent('[data-testid="summary-content"]');
    expect(summaryText).toBe(editedSummary);
  });

  test('should handle service unavailable error', async ({ page }) => {
    // Mock service unavailable response
    await page.route('**/api/generate-summary', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service unavailable' })
      });
    });
    
    const testNote = testData.notes.find(note => note.id === 'test-note-1');
    
    await page.goto('/notes/create');
    
    await page.fill('[data-testid="note-title"]', testNote!.title);
    await page.fill('[data-testid="note-content"]', testNote!.content);
    
    // Click generate summary button
    await page.click('[data-testid="generate-summary-btn"]');
    
    // Verify error message is shown
    await expect(page.locator('[data-testid="summary-error"]')).toBeVisible();
    
    // Verify retry button is available
    await expect(page.locator('[data-testid="retry-summary-btn"]')).toBeVisible();
  });
});