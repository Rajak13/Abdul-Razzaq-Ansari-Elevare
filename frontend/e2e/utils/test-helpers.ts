import { Page, expect } from '@playwright/test';
import testConfig from '../../../test-config/test-environment.json';

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for a service to be healthy
   */
  async waitForServiceHealth(serviceName: keyof typeof testConfig.environment.services, timeout = 60000) {
    const service = testConfig.environment.services[serviceName];
    const healthUrl = `http://${service.host}:${service.port}${service.healthEndpoint}`;
    
    await this.page.waitForFunction(
      async (url) => {
        try {
          const response = await fetch(url);
          return response.ok;
        } catch {
          return false;
        }
      },
      healthUrl,
      { timeout }
    );
  }

  /**
   * Create a test note with specified content
   */
  async createTestNote(title: string, content: string) {
    await this.page.goto('/notes/create');
    await this.page.fill('[data-testid="note-title"]', title);
    await this.page.fill('[data-testid="note-content"]', content);
  }

  /**
   * Generate summary and wait for completion
   */
  async generateSummary(timeout = 30000) {
    await this.page.click('[data-testid="generate-summary-btn"]');
    
    // Wait for loading state
    await expect(this.page.locator('[data-testid="summary-loading"]')).toBeVisible();
    
    // Wait for completion (either success or error)
    await Promise.race([
      expect(this.page.locator('[data-testid="summary-content"]')).toBeVisible({ timeout }),
      expect(this.page.locator('[data-testid="summary-error"]')).toBeVisible({ timeout })
    ]);
  }

  /**
   * Verify summary was generated successfully
   */
  async verifySummaryGenerated() {
    await expect(this.page.locator('[data-testid="summary-content"]')).toBeVisible();
    
    const summaryText = await this.page.textContent('[data-testid="summary-content"]');
    expect(summaryText).toBeTruthy();
    expect(summaryText!.trim().length).toBeGreaterThan(0);
    
    return summaryText!;
  }

  /**
   * Verify error is displayed with expected message
   */
  async verifyErrorDisplayed(expectedErrorType?: string) {
    await expect(this.page.locator('[data-testid="summary-error"]')).toBeVisible();
    
    if (expectedErrorType) {
      const errorText = await this.page.textContent('[data-testid="summary-error"]');
      expect(errorText?.toLowerCase()).toContain(expectedErrorType.toLowerCase());
    }
  }

  /**
   * Edit an existing summary
   */
  async editSummary(newSummaryText: string) {
    await this.page.click('[data-testid="edit-summary-btn"]');
    await expect(this.page.locator('[data-testid="summary-editor"]')).toBeVisible();
    
    await this.page.fill('[data-testid="summary-editor"]', newSummaryText);
    await this.page.click('[data-testid="save-summary-btn"]');
    
    // Verify the edit was saved
    const displayedText = await this.page.textContent('[data-testid="summary-content"]');
    expect(displayedText).toBe(newSummaryText);
  }

  /**
   * Verify staleness indicator appears when content changes
   */
  async verifyContentChangeDetection(originalContent: string, modifiedContent: string) {
    // Ensure we start with generated summary
    await this.generateSummary();
    await this.verifySummaryGenerated();
    
    // Modify content
    await this.page.fill('[data-testid="note-content"]', modifiedContent);
    
    // Verify staleness indicator appears
    await expect(this.page.locator('[data-testid="summary-stale-indicator"]')).toBeVisible();
  }

  /**
   * Mock API responses for testing error scenarios
   */
  async mockApiResponse(endpoint: string, status: number, body: any) {
    await this.page.route(`**${endpoint}`, route => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body)
      });
    });
  }

  /**
   * Measure performance of summarization
   */
  async measureSummarizationPerformance() {
    const startTime = Date.now();
    
    await this.generateSummary();
    await this.verifySummaryGenerated();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Verify performance is within acceptable limits
    expect(duration).toBeLessThan(testConfig.testConfiguration.performance.maxSummarizationTime);
    
    return duration;
  }

  /**
   * Test concurrent summarization requests
   */
  async testConcurrentRequests(noteContents: string[], maxConcurrent = 3) {
    const promises = noteContents.slice(0, maxConcurrent).map(async (content, index) => {
      const page = await this.page.context().newPage();
      const helper = new TestHelpers(page);
      
      try {
        await helper.createTestNote(`Concurrent Test ${index + 1}`, content);
        const duration = await helper.measureSummarizationPerformance();
        await page.close();
        return { success: true, duration, index };
      } catch (error) {
        await page.close();
        return { success: false, error: error.message, index };
      }
    });

    const results = await Promise.all(promises);
    
    // Verify all requests succeeded
    const failures = results.filter(r => !r.success);
    expect(failures.length).toBe(0);
    
    return results;
  }

  /**
   * Verify caching behavior
   */
  async verifyCaching(content: string) {
    // First request - should hit the API
    await this.createTestNote('Cache Test 1', content);
    const firstDuration = await this.measureSummarizationPerformance();
    
    // Second request with same content - should be faster due to caching
    await this.createTestNote('Cache Test 2', content);
    const secondDuration = await this.measureSummarizationPerformance();
    
    // Second request should be significantly faster (cached)
    expect(secondDuration).toBeLessThan(firstDuration * 0.5);
    
    return { firstDuration, secondDuration };
  }

  /**
   * Test chunking behavior with long content
   */
  async testChunking(longContent: string) {
    await this.createTestNote('Chunking Test', longContent);
    
    // Click generate summary
    await this.page.click('[data-testid="generate-summary-btn"]');
    
    // Verify chunking progress indicator appears
    await expect(this.page.locator('[data-testid="chunking-progress"]')).toBeVisible();
    
    // Wait for completion with longer timeout for chunking
    await this.verifySummaryGenerated();
    
    // Verify the summary is coherent and substantial
    const summaryText = await this.page.textContent('[data-testid="summary-content"]');
    expect(summaryText!.length).toBeGreaterThan(50); // Should be substantial
    
    return summaryText!;
  }

  /**
   * Clean up test data
   */
  async cleanup() {
    // Clear any stored data
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}