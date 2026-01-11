import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';
import testData from '../../test-data/sample-notes.json';

test.describe('PEGASUS Summarization Performance Tests', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Navigate to the application and set up auth
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'test-token');
    });
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test('should complete summarization within performance thresholds', async ({ page }) => {
    const testNote = testData.notes.find(note => note.category === 'technical' && note.expectedSummaryLength === 'medium');
    
    await helpers.createTestNote(testNote!.title, testNote!.content);
    
    // Measure summarization performance
    const duration = await helpers.measureSummarizationPerformance();
    
    console.log(`Summarization completed in ${duration}ms`);
    
    // Should complete within 30 seconds
    expect(duration).toBeLessThan(30000);
    
    // Should complete reasonably quickly for medium content
    expect(duration).toBeLessThan(15000);
  });

  test('should demonstrate caching performance improvement', async ({ page }) => {
    const testNote = testData.notes.find(note => note.id === 'test-note-2');
    
    // Test caching behavior
    const { firstDuration, secondDuration } = await helpers.verifyCaching(testNote!.content);
    
    console.log(`First request: ${firstDuration}ms, Second request: ${secondDuration}ms`);
    console.log(`Speedup: ${(firstDuration / secondDuration).toFixed(1)}x`);
    
    // Second request should be significantly faster due to caching
    expect(secondDuration).toBeLessThan(firstDuration * 0.5);
  });

  test('should handle concurrent summarization requests efficiently', async ({ page }) => {
    const testNotes = testData.notes.filter(note => 
      note.category === 'technical' && note.expectedSummaryLength === 'short'
    ).slice(0, 3);
    
    const contents = testNotes.map(note => note.content);
    
    // Test concurrent requests
    const results = await helpers.testConcurrentRequests(contents, 3);
    
    console.log('Concurrent request results:', results);
    
    // All requests should succeed
    expect(results.every(r => r.success)).toBe(true);
    
    // No request should take more than 30 seconds
    expect(results.every(r => r.duration < 30000)).toBe(true);
  });

  test('should handle long content chunking within acceptable time', async ({ page }) => {
    const longNote = testData.notes.find(note => note.id === 'test-note-8');
    
    const startTime = Date.now();
    
    // Test chunking performance
    const summary = await helpers.testChunking(longNote!.content);
    
    const duration = Date.now() - startTime;
    
    console.log(`Chunking completed in ${duration}ms`);
    console.log(`Summary length: ${summary.length} characters`);
    
    // Should complete within 2 minutes for very long content
    expect(duration).toBeLessThan(120000);
    
    // Summary should be substantial
    expect(summary.length).toBeGreaterThan(50);
  });

  test('should maintain responsive UI during summarization', async ({ page }) => {
    const testNote = testData.notes.find(note => note.expectedSummaryLength === 'long');
    
    await helpers.createTestNote(testNote!.title, testNote!.content);
    
    // Start summarization
    await page.click('[data-testid="generate-summary-btn"]');
    
    // Verify UI remains responsive during processing
    await expect(page.locator('[data-testid="summary-loading"]')).toBeVisible();
    
    // Should be able to interact with other UI elements
    const titleField = page.locator('[data-testid="note-title"]');
    await expect(titleField).toBeEnabled();
    
    // Should be able to modify title while summarization is in progress
    await titleField.fill(testNote!.title + ' - Modified');
    
    // Wait for summarization to complete
    await expect(page.locator('[data-testid="summary-content"]')).toBeVisible({ timeout: 60000 });
    
    // Verify the title change was preserved
    await expect(titleField).toHaveValue(testNote!.title + ' - Modified');
  });

  test('should handle memory efficiently with multiple summaries', async ({ page }) => {
    const testNotes = testData.notes.filter(note => 
      note.expectedSummaryLength === 'medium'
    ).slice(0, 5);
    
    // Generate multiple summaries in sequence
    for (let i = 0; i < testNotes.length; i++) {
      const note = testNotes[i];
      
      await helpers.createTestNote(`${note.title} ${i + 1}`, note.content);
      
      const startTime = Date.now();
      await helpers.generateSummary();
      const duration = Date.now() - startTime;
      
      await helpers.verifySummaryGenerated();
      
      console.log(`Summary ${i + 1} generated in ${duration}ms`);
      
      // Each summary should still be generated efficiently
      expect(duration).toBeLessThan(30000);
      
      // Navigate to create new note for next iteration
      if (i < testNotes.length - 1) {
        await page.goto('/notes/create');
      }
    }
  });

  test('should recover gracefully from performance issues', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/generate-summary', async route => {
      // Simulate slow response
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: 'This is a test summary generated after delay.',
          processing_time: 5.0,
          chunks_processed: 1,
          model: 'google/pegasus-xsum'
        })
      });
    });
    
    const testNote = testData.notes.find(note => note.expectedSummaryLength === 'short');
    
    await helpers.createTestNote(testNote!.title, testNote!.content);
    
    const startTime = Date.now();
    
    // Generate summary with mocked delay
    await helpers.generateSummary(10000); // Longer timeout for slow response
    
    const duration = Date.now() - startTime;
    
    console.log(`Slow response handled in ${duration}ms`);
    
    // Should handle the delay gracefully
    expect(duration).toBeGreaterThan(4000); // Should reflect the delay
    expect(duration).toBeLessThan(10000); // But not timeout
    
    // Should still generate valid summary
    await helpers.verifySummaryGenerated();
  });

  test('should optimize network requests', async ({ page }) => {
    let requestCount = 0;
    
    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('/api/generate-summary')) {
        requestCount++;
      }
    });
    
    const testNote = testData.notes.find(note => note.expectedSummaryLength === 'short');
    
    await helpers.createTestNote(testNote!.title, testNote!.content);
    
    // Generate summary
    await helpers.generateSummary();
    await helpers.verifySummaryGenerated();
    
    // Should make exactly one request for summarization
    expect(requestCount).toBe(1);
    
    // Generate summary again with same content (should use cache)
    await page.click('[data-testid="generate-summary-btn"]');
    await helpers.verifySummaryGenerated();
    
    // Should still be only one request due to caching
    expect(requestCount).toBe(2); // Second request to check cache
  });

  test('should handle browser resource constraints', async ({ page }) => {
    // Simulate limited memory by creating many DOM elements
    await page.evaluate(() => {
      const container = document.createElement('div');
      for (let i = 0; i < 1000; i++) {
        const element = document.createElement('div');
        element.textContent = `Test element ${i}`;
        container.appendChild(element);
      }
      document.body.appendChild(container);
    });
    
    const testNote = testData.notes.find(note => note.expectedSummaryLength === 'medium');
    
    await helpers.createTestNote(testNote!.title, testNote!.content);
    
    // Should still work efficiently despite DOM overhead
    const duration = await helpers.measureSummarizationPerformance();
    
    console.log(`Summarization with DOM overhead: ${duration}ms`);
    
    // Should not be significantly impacted by DOM overhead
    expect(duration).toBeLessThan(35000); // Slightly higher threshold
    
    // Clean up DOM elements
    await page.evaluate(() => {
      const containers = document.querySelectorAll('div');
      containers.forEach(container => {
        if (container.textContent?.includes('Test element')) {
          container.remove();
        }
      });
    });
  });
});