import * as fc from 'fast-check';
import * as searchService from '../searchService';
import { query } from '../../db/connection';

// Mock dependencies
jest.mock('../../db/connection');
jest.mock('../../utils/logger');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('SearchService - Universal Search', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 48: Universal search returns all matches
   * Validates: Requirements 11.1
   * 
   * For any search query, the system should search across tasks, notes, resources, files
   * and return unified results containing all matching content.
   */
  describe('Property 48: Universal search returns all matches', () => {
    test('should return all matching tasks and notes for any search query', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            searchQuery: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            tasks: fc.array(
              fc.record({
                id: fc.uuid(),
                user_id: fc.constant(testUserId),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                description: fc.option(fc.string({ minLength: 0, maxLength: 200 })),
                priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
                status: fc.constantFrom('pending', 'completed'),
                tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })),
                created_at: fc.date(),
                updated_at: fc.date(),
                category_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
              }),
              { minLength: 0, maxLength: 10 }
            ),
            notes: fc.array(
              fc.record({
                id: fc.uuid(),
                user_id: fc.constant(testUserId),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                content: fc.string({ minLength: 0, maxLength: 500 }),
                tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })),
                created_at: fc.date(),
                updated_at: fc.date(),
                folder_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
              }),
              { minLength: 0, maxLength: 10 }
            )
          }),
          async ({ searchQuery, tasks, notes }) => {
            // Filter tasks and notes that should match the search query
            const matchingTasks = tasks.filter(task => {
              const searchText = (task.title + ' ' + (task.description || '')).toLowerCase();
              return searchText.includes(searchQuery.toLowerCase());
            });

            const matchingNotes = notes.filter(note => {
              const searchText = (note.title + ' ' + note.content).toLowerCase();
              return searchText.includes(searchQuery.toLowerCase());
            });

            // Mock task search count query
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: matchingTasks.length.toString() }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Mock task search results query
            mockQuery.mockResolvedValueOnce({
              rows: matchingTasks.map(task => ({
                ...task,
                rank: 0.5 // Mock rank
              })),
              command: 'SELECT',
              rowCount: matchingTasks.length,
              oid: 0,
              fields: []
            });

            // Mock note search count query
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: matchingNotes.length.toString() }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Mock note search results query
            mockQuery.mockResolvedValueOnce({
              rows: matchingNotes.map(note => ({
                ...note,
                rank: 0.5 // Mock rank
              })),
              command: 'SELECT',
              rowCount: matchingNotes.length,
              oid: 0,
              fields: []
            });

            // Perform universal search
            const searchOptions = {
              query: searchQuery,
              filters: {
                content_type: ['task', 'note'] as ('task' | 'note')[]
              },
              page: 1,
              limit: 20
            };

            const result = await searchService.universalSearch(testUserId, searchOptions);

            // Verify search results
            expect(result).toBeDefined();
            expect(result.results).toBeDefined();
            expect(Array.isArray(result.results)).toBe(true);

            // Verify total count matches expected matches
            const expectedTotal = matchingTasks.length + matchingNotes.length;
            expect(result.total).toBe(expectedTotal);

            // Verify all matching tasks are in results
            const taskResults = result.results.filter(r => r.type === 'task');
            expect(taskResults).toHaveLength(matchingTasks.length);

            taskResults.forEach(taskResult => {
              const originalTask = matchingTasks.find(t => t.id === taskResult.id);
              expect(originalTask).toBeDefined();
              expect(taskResult.title).toBe(originalTask!.title);
              expect(taskResult.type).toBe('task');
              expect(taskResult.metadata?.priority).toBe(originalTask!.priority);
              expect(taskResult.metadata?.status).toBe(originalTask!.status);
            });

            // Verify all matching notes are in results
            const noteResults = result.results.filter(r => r.type === 'note');
            expect(noteResults).toHaveLength(matchingNotes.length);

            noteResults.forEach(noteResult => {
              const originalNote = matchingNotes.find(n => n.id === noteResult.id);
              expect(originalNote).toBeDefined();
              expect(noteResult.title).toBe(originalNote!.title);
              expect(noteResult.type).toBe('note');
              expect(noteResult.content).toBe(originalNote!.content);
            });

            // Verify pagination metadata
            expect(result.page).toBe(1);
            expect(result.limit).toBe(20);
            expect(result.totalPages).toBe(Math.ceil(expectedTotal / 20));

            // Verify each result has required fields
            result.results.forEach(searchResult => {
              expect(searchResult.id).toBeDefined();
              expect(searchResult.type).toMatch(/^(task|note)$/);
              expect(searchResult.title).toBeDefined();
              expect(searchResult.snippet).toBeDefined();
              expect(searchResult.highlighted_snippet).toBeDefined();
              expect(searchResult.created_at).toBeDefined();
              expect(searchResult.updated_at).toBeDefined();
              expect(searchResult.metadata).toBeDefined();

              // Verify snippet contains search query (case insensitive)
              if (searchResult.snippet) {
                expect(searchResult.snippet.toLowerCase()).toContain(searchQuery.toLowerCase());
              }

              // Verify highlighted snippet contains markup
              if (searchResult.highlighted_snippet && searchResult.snippet) {
                expect(searchResult.highlighted_snippet).toContain('<mark>');
                expect(searchResult.highlighted_snippet).toContain('</mark>');
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle empty search results correctly', async () => {
      const searchQuery = 'nonexistentquery12345';

      // Mock empty task search results
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      // Mock empty note search results
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await searchService.universalSearch(testUserId, {
        query: searchQuery,
        page: 1,
        limit: 20
      });

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    test('should respect content type filters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            searchQuery: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            contentType: fc.constantFrom('task', 'note'),
            tasks: fc.array(
              fc.record({
                id: fc.uuid(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                description: fc.option(fc.string({ minLength: 0, maxLength: 200 })),
                priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
                status: fc.constantFrom('pending', 'completed'),
                created_at: fc.date(),
                updated_at: fc.date()
              }),
              { minLength: 1, maxLength: 5 }
            ),
            notes: fc.array(
              fc.record({
                id: fc.uuid(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                content: fc.string({ minLength: 0, maxLength: 500 }),
                created_at: fc.date(),
                updated_at: fc.date()
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          async ({ searchQuery, contentType, tasks, notes }) => {
            if (contentType === 'task') {
              // Mock task search only
              mockQuery.mockResolvedValueOnce({
                rows: [{ count: tasks.length.toString() }],
                command: 'SELECT',
                rowCount: 1,
                oid: 0,
                fields: []
              });

              mockQuery.mockResolvedValueOnce({
                rows: tasks.map(task => ({ ...task, user_id: testUserId, rank: 0.5 })),
                command: 'SELECT',
                rowCount: tasks.length,
                oid: 0,
                fields: []
              });
            } else {
              // Mock note search only
              mockQuery.mockResolvedValueOnce({
                rows: [{ count: notes.length.toString() }],
                command: 'SELECT',
                rowCount: 1,
                oid: 0,
                fields: []
              });

              mockQuery.mockResolvedValueOnce({
                rows: notes.map(note => ({ ...note, user_id: testUserId, rank: 0.5 })),
                command: 'SELECT',
                rowCount: notes.length,
                oid: 0,
                fields: []
              });
            }

            const result = await searchService.universalSearch(testUserId, {
              query: searchQuery,
              filters: {
                content_type: [contentType as 'task' | 'note']
              },
              page: 1,
              limit: 20
            });

            // Verify only the specified content type is returned
            expect(result.results.every(r => r.type === contentType)).toBe(true);

            if (contentType === 'task') {
              expect(result.results).toHaveLength(tasks.length);
              expect(result.total).toBe(tasks.length);
            } else {
              expect(result.results).toHaveLength(notes.length);
              expect(result.total).toBe(notes.length);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle pagination correctly', async () => {
      const searchQuery = 'test';
      const totalResults = 25;
      const pageSize = 10;

      // Create mock results
      const mockTasks = Array.from({ length: totalResults }, (_, i) => ({
        id: `task-${i}`,
        user_id: testUserId,
        title: `Test Task ${i}`,
        description: `Description for test task ${i}`,
        priority: 'medium',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        rank: 0.5
      }));

      // Mock task search count
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: totalResults.toString() }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock task search results (all results, pagination handled by service)
      mockQuery.mockResolvedValueOnce({
        rows: mockTasks,
        command: 'SELECT',
        rowCount: totalResults,
        oid: 0,
        fields: []
      });

      // Mock empty note search
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      // Test first page
      const firstPage = await searchService.universalSearch(testUserId, {
        query: searchQuery,
        page: 1,
        limit: pageSize
      });

      expect(firstPage.results).toHaveLength(pageSize);
      expect(firstPage.total).toBe(totalResults);
      expect(firstPage.page).toBe(1);
      expect(firstPage.limit).toBe(pageSize);
      expect(firstPage.totalPages).toBe(Math.ceil(totalResults / pageSize));

      // Verify first page contains first 10 results (sorted by relevance/date)
      expect(firstPage.results[0].id).toBeDefined();
      expect(firstPage.results[9].id).toBeDefined();
    });

    test('should generate proper snippets and highlighting', async () => {
      const searchQuery = 'important';
      const mockTask = {
        id: 'task-1',
        user_id: testUserId,
        title: 'This is an important task',
        description: 'This task contains important information that needs attention',
        priority: 'high',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        rank: 0.8
      };

      // Mock task search
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [mockTask],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock empty note search
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await searchService.universalSearch(testUserId, {
        query: searchQuery,
        page: 1,
        limit: 20
      });

      expect(result.results).toHaveLength(1);
      const taskResult = result.results[0];

      // Verify snippet contains the search query
      expect(taskResult.snippet).toContain('important');

      // Verify highlighting markup
      expect(taskResult.highlighted_snippet).toContain('<mark>important</mark>');

      // Verify snippet is reasonably sized
      expect(taskResult.snippet!.length).toBeLessThanOrEqual(200);
    });
  });

  /**
   * Property 49: Filters restrict results correctly
   * Validates: Requirements 11.2
   * 
   * For any search with filters applied (content type, date range, tags),
   * the system should return only results that match all specified filter criteria.
   */
  describe('Property 49: Filters restrict results correctly', () => {
    test('should filter results by date range correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            searchQuery: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            dateFrom: fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
            dateTo: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
            tasks: fc.array(
              fc.record({
                id: fc.uuid(),
                user_id: fc.constant(testUserId),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                description: fc.option(fc.string({ minLength: 0, maxLength: 200 })),
                priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
                status: fc.constantFrom('pending', 'completed'),
                created_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }),
                updated_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })
              }),
              { minLength: 5, maxLength: 15 }
            )
          }),
          async ({ searchQuery, dateFrom, dateTo, tasks }) => {
            // Filter tasks that should match both search query and date range
            const matchingTasks = tasks.filter(task => {
              const searchText = (task.title + ' ' + (task.description || '')).toLowerCase();
              const matchesSearch = searchText.includes(searchQuery.toLowerCase());
              const taskDate = new Date(task.created_at);
              const matchesDateRange = taskDate >= dateFrom && taskDate <= dateTo;
              return matchesSearch && matchesDateRange;
            });

            // Mock task search with date filter
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: matchingTasks.length.toString() }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            mockQuery.mockResolvedValueOnce({
              rows: matchingTasks.map(task => ({ ...task, rank: 0.5 })),
              command: 'SELECT',
              rowCount: matchingTasks.length,
              oid: 0,
              fields: []
            });

            // Mock empty note search
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: '0' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            mockQuery.mockResolvedValueOnce({
              rows: [],
              command: 'SELECT',
              rowCount: 0,
              oid: 0,
              fields: []
            });

            const result = await searchService.universalSearch(testUserId, {
              query: searchQuery,
              filters: {
                content_type: ['task'],
                date_from: dateFrom.toISOString(),
                date_to: dateTo.toISOString()
              },
              page: 1,
              limit: 20
            });

            // Verify only matching tasks are returned
            expect(result.results).toHaveLength(matchingTasks.length);
            expect(result.total).toBe(matchingTasks.length);

            // Verify all results are within date range
            result.results.forEach(searchResult => {
              const resultDate = new Date(searchResult.created_at);
              expect(resultDate.getTime()).toBeGreaterThanOrEqual(dateFrom.getTime());
              expect(resultDate.getTime()).toBeLessThanOrEqual(dateTo.getTime());
            });

            // Verify all results match search query
            result.results.forEach(searchResult => {
              const searchText = (searchResult.title + ' ' + (searchResult.content || '')).toLowerCase();
              expect(searchText).toContain(searchQuery.toLowerCase());
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should filter results by tags correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            searchQuery: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            filterTags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
            tasks: fc.array(
              fc.record({
                id: fc.uuid(),
                user_id: fc.constant(testUserId),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                description: fc.option(fc.string({ minLength: 0, maxLength: 200 })),
                priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
                status: fc.constantFrom('pending', 'completed'),
                tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })),
                created_at: fc.date(),
                updated_at: fc.date()
              }),
              { minLength: 5, maxLength: 15 }
            )
          }),
          async ({ searchQuery, filterTags, tasks }) => {
            // Filter tasks that should match both search query and tags
            const matchingTasks = tasks.filter(task => {
              const searchText = (task.title + ' ' + (task.description || '')).toLowerCase();
              const matchesSearch = searchText.includes(searchQuery.toLowerCase());
              const taskTags = task.tags || [];
              const matchesTags = filterTags.every(filterTag => taskTags.includes(filterTag));
              return matchesSearch && matchesTags;
            });

            // Mock task search with tag filter
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: matchingTasks.length.toString() }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            mockQuery.mockResolvedValueOnce({
              rows: matchingTasks.map(task => ({ ...task, rank: 0.5 })),
              command: 'SELECT',
              rowCount: matchingTasks.length,
              oid: 0,
              fields: []
            });

            // Mock empty note search
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: '0' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            mockQuery.mockResolvedValueOnce({
              rows: [],
              command: 'SELECT',
              rowCount: 0,
              oid: 0,
              fields: []
            });

            const result = await searchService.universalSearch(testUserId, {
              query: searchQuery,
              filters: {
                content_type: ['task'],
                tags: filterTags
              },
              page: 1,
              limit: 20
            });

            // Verify only matching tasks are returned
            expect(result.results).toHaveLength(matchingTasks.length);
            expect(result.total).toBe(matchingTasks.length);

            // Verify all results contain the required tags
            result.results.forEach(searchResult => {
              const resultTags = searchResult.metadata?.tags || [];
              filterTags.forEach(filterTag => {
                expect(resultTags).toContain(filterTag);
              });
            });

            // Verify all results match search query
            result.results.forEach(searchResult => {
              const searchText = (searchResult.title + ' ' + (searchResult.content || '')).toLowerCase();
              expect(searchText).toContain(searchQuery.toLowerCase());
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should combine multiple filters correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            searchQuery: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            contentTypes: fc.array(fc.constantFrom('task', 'note'), { minLength: 1, maxLength: 2 }),
            dateFrom: fc.date({ min: new Date('2023-01-01'), max: new Date('2023-06-30') }),
            dateTo: fc.date({ min: new Date('2023-07-01'), max: new Date('2023-12-31') }),
            filterTags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 2 }),
            tasks: fc.array(
              fc.record({
                id: fc.uuid(),
                user_id: fc.constant(testUserId),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                description: fc.option(fc.string({ minLength: 0, maxLength: 200 })),
                priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
                status: fc.constantFrom('pending', 'completed'),
                tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })),
                created_at: fc.date({ min: new Date('2023-01-01'), max: new Date('2023-12-31') }),
                updated_at: fc.date({ min: new Date('2023-01-01'), max: new Date('2023-12-31') })
              }),
              { minLength: 5, maxLength: 15 }
            ),
            notes: fc.array(
              fc.record({
                id: fc.uuid(),
                user_id: fc.constant(testUserId),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                content: fc.string({ minLength: 0, maxLength: 500 }),
                tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })),
                created_at: fc.date({ min: new Date('2023-01-01'), max: new Date('2023-12-31') }),
                updated_at: fc.date({ min: new Date('2023-01-01'), max: new Date('2023-12-31') })
              }),
              { minLength: 5, maxLength: 15 }
            )
          }),
          async ({ searchQuery, contentTypes, dateFrom, dateTo, filterTags, tasks, notes }) => {
            let expectedResults = 0;

            // Mock task search if tasks are included
            if (contentTypes.includes('task')) {
              const matchingTasks = tasks.filter(task => {
                const searchText = (task.title + ' ' + (task.description || '')).toLowerCase();
                const matchesSearch = searchText.includes(searchQuery.toLowerCase());
                const taskDate = new Date(task.created_at);
                const matchesDateRange = taskDate >= dateFrom && taskDate <= dateTo;
                const taskTags = task.tags || [];
                const matchesTags = filterTags.every(filterTag => taskTags.includes(filterTag));
                return matchesSearch && matchesDateRange && matchesTags;
              });

              expectedResults += matchingTasks.length;

              mockQuery.mockResolvedValueOnce({
                rows: [{ count: matchingTasks.length.toString() }],
                command: 'SELECT',
                rowCount: 1,
                oid: 0,
                fields: []
              });

              mockQuery.mockResolvedValueOnce({
                rows: matchingTasks.map(task => ({ ...task, rank: 0.5 })),
                command: 'SELECT',
                rowCount: matchingTasks.length,
                oid: 0,
                fields: []
              });
            }

            // Mock note search if notes are included
            if (contentTypes.includes('note')) {
              const matchingNotes = notes.filter(note => {
                const searchText = (note.title + ' ' + note.content).toLowerCase();
                const matchesSearch = searchText.includes(searchQuery.toLowerCase());
                const noteDate = new Date(note.created_at);
                const matchesDateRange = noteDate >= dateFrom && noteDate <= dateTo;
                const noteTags = note.tags || [];
                const matchesTags = filterTags.every(filterTag => noteTags.includes(filterTag));
                return matchesSearch && matchesDateRange && matchesTags;
              });

              expectedResults += matchingNotes.length;

              mockQuery.mockResolvedValueOnce({
                rows: [{ count: matchingNotes.length.toString() }],
                command: 'SELECT',
                rowCount: 1,
                oid: 0,
                fields: []
              });

              mockQuery.mockResolvedValueOnce({
                rows: matchingNotes.map(note => ({ ...note, rank: 0.5 })),
                command: 'SELECT',
                rowCount: matchingNotes.length,
                oid: 0,
                fields: []
              });
            }

            const result = await searchService.universalSearch(testUserId, {
              query: searchQuery,
              filters: {
                content_type: contentTypes as ('task' | 'note')[],
                date_from: dateFrom.toISOString(),
                date_to: dateTo.toISOString(),
                tags: filterTags
              },
              page: 1,
              limit: 20
            });

            // Verify total matches expected results
            expect(result.total).toBe(expectedResults);

            // Verify all results match all filter criteria
            result.results.forEach(searchResult => {
              // Check content type filter
              expect(contentTypes).toContain(searchResult.type);

              // Check date range filter
              const resultDate = new Date(searchResult.created_at);
              expect(resultDate.getTime()).toBeGreaterThanOrEqual(dateFrom.getTime());
              expect(resultDate.getTime()).toBeLessThanOrEqual(dateTo.getTime());

              // Check tag filter
              const resultTags = searchResult.metadata?.tags || [];
              filterTags.forEach(filterTag => {
                expect(resultTags).toContain(filterTag);
              });

              // Check search query
              const searchText = (searchResult.title + ' ' + (searchResult.content || '')).toLowerCase();
              expect(searchText).toContain(searchQuery.toLowerCase());
            });
          }
        ),
        { numRuns: 30 } // Reduced runs due to complexity
      );
    });

    test('should handle empty filter results', async () => {
      const searchQuery = 'test';
      const impossibleTag = 'nonexistent-tag-12345';

      // Mock empty task search results
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      // Mock empty note search results
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await searchService.universalSearch(testUserId, {
        query: searchQuery,
        filters: {
          tags: [impossibleTag]
        },
        page: 1,
        limit: 20
      });

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    test('should handle invalid date ranges gracefully', async () => {
      const searchQuery = 'test';
      const futureDate = new Date('2030-01-01');
      const pastDate = new Date('2020-01-01');

      // Mock empty results for impossible date range
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      // Test with date_from > date_to (invalid range)
      const result = await searchService.universalSearch(testUserId, {
        query: searchQuery,
        filters: {
          date_from: futureDate.toISOString(),
          date_to: pastDate.toISOString()
        },
        page: 1,
        limit: 20
      });

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  /**
   * Property 50: Search results highlight keywords
   * Validates: Requirements 11.3
   * 
   * For any search query, matching keywords in results should be highlighted
   * and result snippets should be generated around the matching content.
   */
  describe('Property 50: Search results highlight keywords', () => {
    test('should highlight all keywords in search results', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            keywords: fc.array(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0 && !/[.*+?^${}()|[\]\\]/.test(s)),
              { minLength: 1, maxLength: 3 }
            ),
            tasks: fc.array(
              fc.record({
                id: fc.uuid(),
                user_id: fc.constant(testUserId),
                title: fc.string({ minLength: 10, maxLength: 100 }),
                description: fc.option(fc.string({ minLength: 10, maxLength: 200 })),
                priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
                status: fc.constantFrom('pending', 'completed'),
                created_at: fc.date(),
                updated_at: fc.date()
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          async ({ keywords, tasks }) => {
            const searchQuery = keywords.join(' ');
            
            // Ensure at least one task contains all keywords
            const enhancedTasks = tasks.map((task, index) => {
              if (index === 0) {
                // First task guaranteed to contain all keywords
                return {
                  ...task,
                  title: `${task.title} ${keywords.join(' ')} content`,
                  description: task.description ? `${task.description} ${keywords.join(' ')} more` : `Description with ${keywords.join(' ')} keywords`
                };
              }
              return task;
            });

            // Filter tasks that contain all keywords
            const matchingTasks = enhancedTasks.filter(task => {
              const searchText = (task.title + ' ' + (task.description || '')).toLowerCase();
              return keywords.every(keyword => searchText.includes(keyword.toLowerCase()));
            });

            // Mock task search
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: matchingTasks.length.toString() }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            mockQuery.mockResolvedValueOnce({
              rows: matchingTasks.map(task => ({ ...task, rank: 0.5 })),
              command: 'SELECT',
              rowCount: matchingTasks.length,
              oid: 0,
              fields: []
            });

            // Mock empty note search
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: '0' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            mockQuery.mockResolvedValueOnce({
              rows: [],
              command: 'SELECT',
              rowCount: 0,
              oid: 0,
              fields: []
            });

            const result = await searchService.universalSearch(testUserId, {
              query: searchQuery,
              filters: {
                content_type: ['task']
              },
              page: 1,
              limit: 20
            });

            // Verify we have results
            expect(result.results.length).toBeGreaterThan(0);

            // Verify each result has proper highlighting
            result.results.forEach(searchResult => {
              // Check that snippet exists and is reasonable length
              expect(searchResult.snippet).toBeDefined();
              expect(searchResult.snippet!.length).toBeLessThanOrEqual(200);

              // Check that highlighted snippet exists
              expect(searchResult.highlighted_snippet).toBeDefined();

              // Verify highlighting markup is present
              expect(searchResult.highlighted_snippet).toContain('<mark>');
              expect(searchResult.highlighted_snippet).toContain('</mark>');

              // Verify each keyword is highlighted (case insensitive)
              keywords.forEach(keyword => {
                const lowerSnippet = searchResult.snippet!.toLowerCase();
                const lowerKeyword = keyword.toLowerCase();
                
                if (lowerSnippet.includes(lowerKeyword)) {
                  // If keyword is in snippet, it should be highlighted
                  const highlightRegex = new RegExp(`<mark>[^<]*${keyword.toLowerCase()}[^<]*</mark>`, 'i');
                  expect(searchResult.highlighted_snippet).toMatch(highlightRegex);
                }
              });

              // Verify highlighted snippet contains the same text as snippet (minus markup)
              const strippedHighlighted = searchResult.highlighted_snippet!.replace(/<\/?mark>/g, '');
              expect(strippedHighlighted).toBe(searchResult.snippet);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should generate snippets around matching keywords', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            keyword: fc.string({ minLength: 3, maxLength: 15 }).filter(s => s.trim().length > 0 && !/[.*+?^${}()|[\]\\]/.test(s)),
            beforeText: fc.string({ minLength: 50, maxLength: 150 }),
            afterText: fc.string({ minLength: 50, maxLength: 150 })
          }),
          async ({ keyword, beforeText, afterText }) => {
            const taskTitle = `${beforeText} ${keyword} ${afterText}`;
            const task = {
              id: 'test-task-1',
              user_id: testUserId,
              title: taskTitle,
              description: null,
              priority: 'medium',
              status: 'pending',
              created_at: new Date(),
              updated_at: new Date(),
              rank: 0.8
            };

            // Mock task search
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: '1' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            mockQuery.mockResolvedValueOnce({
              rows: [task],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Mock empty note search
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: '0' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            mockQuery.mockResolvedValueOnce({
              rows: [],
              command: 'SELECT',
              rowCount: 0,
              oid: 0,
              fields: []
            });

            const result = await searchService.universalSearch(testUserId, {
              query: keyword,
              page: 1,
              limit: 20
            });

            expect(result.results).toHaveLength(1);
            const searchResult = result.results[0];

            // Verify snippet contains the keyword
            expect(searchResult.snippet).toContain(keyword);

            // Verify snippet is centered around the keyword when possible
            const snippetIndex = searchResult.snippet!.toLowerCase().indexOf(keyword.toLowerCase());
            expect(snippetIndex).toBeGreaterThanOrEqual(0);

            // Verify snippet length is reasonable
            expect(searchResult.snippet!.length).toBeLessThanOrEqual(200);

            // Verify keyword is highlighted in the snippet
            expect(searchResult.highlighted_snippet).toContain(`<mark>${keyword}</mark>`);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle special characters in search queries', async () => {
      const specialCases = [
        { query: 'test & query', expected: ['test', 'query'] },
        { query: 'hello "world"', expected: ['hello', 'world'] },
        { query: "it's working", expected: ["it's", 'working'] },
        { query: 'multi-word search', expected: ['multi-word', 'search'] }
      ];

      for (const testCase of specialCases) {
        const task = {
          id: 'special-task',
          user_id: testUserId,
          title: `This contains ${testCase.query} for testing`,
          description: `More content with ${testCase.query} here`,
          priority: 'medium',
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
          rank: 0.8
        };

        // Mock task search
        mockQuery.mockResolvedValueOnce({
          rows: [{ count: '1' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

        mockQuery.mockResolvedValueOnce({
          rows: [task],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

        // Mock empty note search
        mockQuery.mockResolvedValueOnce({
          rows: [{ count: '0' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

        mockQuery.mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: []
        });

        const result = await searchService.universalSearch(testUserId, {
          query: testCase.query,
          page: 1,
          limit: 20
        });

        expect(result.results).toHaveLength(1);
        const searchResult = result.results[0];

        // Verify snippet contains the query
        expect(searchResult.snippet).toContain(testCase.query);

        // Verify highlighting is present
        expect(searchResult.highlighted_snippet).toContain('<mark>');
        expect(searchResult.highlighted_snippet).toContain('</mark>');

        // Verify at least some keywords are highlighted
        const hasHighlighting = testCase.expected.some(keyword => 
          searchResult.highlighted_snippet!.includes(`<mark>${keyword}</mark>`)
        );
        expect(hasHighlighting).toBe(true);
      }
    });

    test('should handle empty or no matches gracefully', async () => {
      const task = {
        id: 'no-match-task',
        user_id: testUserId,
        title: 'This task has completely different content',
        description: 'Nothing matches the search query here',
        priority: 'low',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        rank: 0.1
      };

      // Mock task search with no matches
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [task],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock empty note search
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await searchService.universalSearch(testUserId, {
        query: 'nonexistentquery',
        page: 1,
        limit: 20
      });

      expect(result.results).toHaveLength(1);
      const searchResult = result.results[0];

      // Even without matches, snippet should be generated
      expect(searchResult.snippet).toBeDefined();
      expect(searchResult.highlighted_snippet).toBeDefined();

      // Should not contain highlighting markup if no matches
      if (!searchResult.snippet!.toLowerCase().includes('nonexistentquery')) {
        expect(searchResult.highlighted_snippet).toBe(searchResult.snippet);
      }
    });

    test('should handle very long content correctly', async () => {
      const longContent = 'A'.repeat(500) + ' important keyword ' + 'B'.repeat(500);
      const task = {
        id: 'long-task',
        user_id: testUserId,
        title: 'Short title',
        description: longContent,
        priority: 'high',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        rank: 0.9
      };

      // Mock task search
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [task],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock empty note search
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await searchService.universalSearch(testUserId, {
        query: 'important keyword',
        page: 1,
        limit: 20
      });

      expect(result.results).toHaveLength(1);
      const searchResult = result.results[0];

      // Verify snippet is truncated to reasonable length
      expect(searchResult.snippet!.length).toBeLessThanOrEqual(200);

      // Verify snippet contains the keyword (should be centered around it)
      expect(searchResult.snippet).toContain('important keyword');

      // Verify ellipsis are added for truncated content
      expect(searchResult.snippet).toMatch(/\.\.\./);

      // Verify highlighting works on truncated content
      expect(searchResult.highlighted_snippet).toContain('<mark>important</mark>');
      expect(searchResult.highlighted_snippet).toContain('<mark>keyword</mark>');
    });
  });

  /**
   * Property 51: Multi-keyword search uses AND logic
   * Validates: Requirements 11.4
   * 
   * For any multi-keyword search, the system should return only results that
   * contain ALL specified keywords (AND logic), not just any of them.
   */
  describe('Property 51: Multi-keyword search uses AND logic', () => {
    test('should return only results containing all keywords', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            keywords: fc.array(
              fc.string({ minLength: 2, maxLength: 15 }).filter(s => s.trim().length > 0 && !/[.*+?^${}()|[\]\\]/.test(s)),
              { minLength: 2, maxLength: 4 }
            ),
            tasks: fc.array(
              fc.record({
                id: fc.uuid(),
                user_id: fc.constant(testUserId),
                title: fc.string({ minLength: 10, maxLength: 100 }),
                description: fc.option(fc.string({ minLength: 10, maxLength: 200 })),
                priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
                status: fc.constantFrom('pending', 'completed'),
                created_at: fc.date(),
                updated_at: fc.date()
              }),
              { minLength: 5, maxLength: 15 }
            )
          }),
          async ({ keywords, tasks }) => {
            // Create tasks with different keyword combinations
            const enhancedTasks = tasks.map((task, index) => {
              if (index === 0) {
                // First task contains ALL keywords
                return {
                  ...task,
                  title: `${task.title} ${keywords.join(' ')} content`,
                  description: task.description ? `${task.description} ${keywords.join(' ')} more` : `Description with ${keywords.join(' ')} keywords`
                };
              } else if (index === 1 && keywords.length > 1) {
                // Second task contains only SOME keywords (should not match)
                return {
                  ...task,
                  title: `${task.title} ${keywords[0]} content`,
                  description: task.description ? `${task.description} ${keywords[0]} more` : `Description with ${keywords[0]} keyword`
                };
              }
              return task;
            });

            // Filter tasks that contain ALL keywords
            const expectedMatches = enhancedTasks.filter(task => {
              const searchText = (task.title + ' ' + (task.description || '')).toLowerCase();
              return keywords.every(keyword => searchText.includes(keyword.toLowerCase()));
            });

            // Mock the universal search call that multiKeywordSearch makes internally
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: enhancedTasks.length.toString() }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            mockQuery.mockResolvedValueOnce({
              rows: enhancedTasks.map(task => ({ ...task, rank: 0.5 })),
              command: 'SELECT',
              rowCount: enhancedTasks.length,
              oid: 0,
              fields: []
            });

            // Mock empty note search
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: '0' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            mockQuery.mockResolvedValueOnce({
              rows: [],
              command: 'SELECT',
              rowCount: 0,
              oid: 0,
              fields: []
            });

            const result = await searchService.multiKeywordSearch(
              testUserId,
              keywords,
              { content_type: ['task'] }
            );

            // Verify only tasks with ALL keywords are returned
            expect(result.results).toHaveLength(expectedMatches.length);
            expect(result.total).toBe(expectedMatches.length);

            // Verify each result contains ALL keywords
            result.results.forEach(searchResult => {
              const searchText = (searchResult.title + ' ' + (searchResult.content || '')).toLowerCase();
              keywords.forEach(keyword => {
                expect(searchText).toContain(keyword.toLowerCase());
              });
            });

            // If we have partial matches, verify they are NOT included
            if (expectedMatches.length < enhancedTasks.length) {
              const excludedTasks = enhancedTasks.filter(task => 
                !expectedMatches.some(match => match.id === task.id)
              );
              
              excludedTasks.forEach(excludedTask => {
                const resultIds = result.results.map(r => r.id);
                expect(resultIds).not.toContain(excludedTask.id);
              });
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle empty keyword array', async () => {
      const result = await searchService.multiKeywordSearch(testUserId, []);
      
      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    test('should handle single keyword (equivalent to regular search)', async () => {
      const keyword = 'unique';
      const task = {
        id: 'single-keyword-task',
        user_id: testUserId,
        title: `This contains the unique keyword`,
        description: 'More content here',
        priority: 'medium',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        rank: 0.8
      };

      // Mock universal search call
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [task],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock empty note search
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await searchService.multiKeywordSearch(
        testUserId,
        [keyword],
        { content_type: ['task'] }
      );

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.results[0].title).toContain(keyword);
    });

    test('should work with filters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            keywords: fc.array(
              fc.string({ minLength: 2, maxLength: 15 }).filter(s => s.trim().length > 0 && !/[.*+?^${}()|[\]\\]/.test(s)),
              { minLength: 2, maxLength: 3 }
            ),
            filterTags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 2 }),
            tasks: fc.array(
              fc.record({
                id: fc.uuid(),
                user_id: fc.constant(testUserId),
                title: fc.string({ minLength: 10, maxLength: 100 }),
                description: fc.option(fc.string({ minLength: 10, maxLength: 200 })),
                priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
                status: fc.constantFrom('pending', 'completed'),
                tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })),
                created_at: fc.date(),
                updated_at: fc.date()
              }),
              { minLength: 3, maxLength: 8 }
            )
          }),
          async ({ keywords, filterTags, tasks }) => {
            // Create tasks with different combinations
            const enhancedTasks = tasks.map((task, index) => {
              if (index === 0) {
                // First task contains ALL keywords and ALL filter tags
                return {
                  ...task,
                  title: `${task.title} ${keywords.join(' ')} content`,
                  description: task.description ? `${task.description} ${keywords.join(' ')} more` : `Description with ${keywords.join(' ')} keywords`,
                  tags: [...(task.tags || []), ...filterTags]
                };
              }
              return task;
            });

            // Filter tasks that match both keywords AND tags
            const expectedMatches = enhancedTasks.filter(task => {
              const searchText = (task.title + ' ' + (task.description || '')).toLowerCase();
              const hasAllKeywords = keywords.every(keyword => searchText.includes(keyword.toLowerCase()));
              const taskTags = task.tags || [];
              const hasAllTags = filterTags.every(filterTag => taskTags.includes(filterTag));
              return hasAllKeywords && hasAllTags;
            });

            // Mock universal search call
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: expectedMatches.length.toString() }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            mockQuery.mockResolvedValueOnce({
              rows: expectedMatches.map(task => ({ ...task, rank: 0.5 })),
              command: 'SELECT',
              rowCount: expectedMatches.length,
              oid: 0,
              fields: []
            });

            // Mock empty note search
            mockQuery.mockResolvedValueOnce({
              rows: [{ count: '0' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            mockQuery.mockResolvedValueOnce({
              rows: [],
              command: 'SELECT',
              rowCount: 0,
              oid: 0,
              fields: []
            });

            const result = await searchService.multiKeywordSearch(
              testUserId,
              keywords,
              {
                content_type: ['task'],
                tags: filterTags
              }
            );

            // Verify results match both keyword AND tag filters
            expect(result.results).toHaveLength(expectedMatches.length);
            expect(result.total).toBe(expectedMatches.length);

            result.results.forEach(searchResult => {
              // Verify all keywords are present
              const searchText = (searchResult.title + ' ' + (searchResult.content || '')).toLowerCase();
              keywords.forEach(keyword => {
                expect(searchText).toContain(keyword.toLowerCase());
              });

              // Verify all filter tags are present
              const resultTags = searchResult.metadata?.tags || [];
              filterTags.forEach(filterTag => {
                expect(resultTags).toContain(filterTag);
              });
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should handle case insensitive matching', async () => {
      const keywords = ['HELLO', 'world'];
      const task = {
        id: 'case-test-task',
        user_id: testUserId,
        title: 'hello there',
        description: 'This is a World of content',
        priority: 'medium',
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
        rank: 0.8
      };

      // Mock universal search call
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [task],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock empty note search
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await searchService.multiKeywordSearch(
        testUserId,
        keywords,
        { content_type: ['task'] }
      );

      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
      
      const searchResult = result.results[0];
      const searchText = (searchResult.title + ' ' + (searchResult.content || '')).toLowerCase();
      expect(searchText).toContain('hello');
      expect(searchText).toContain('world');
    });

    test('should exclude results missing any keyword', async () => {
      const keywords = ['first', 'second', 'third'];
      const tasks = [
        {
          id: 'all-keywords',
          user_id: testUserId,
          title: 'first second third all here',
          description: 'Complete match',
          priority: 'high',
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
          rank: 1.0
        },
        {
          id: 'missing-one',
          user_id: testUserId,
          title: 'first second only',
          description: 'Missing third keyword',
          priority: 'medium',
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
          rank: 0.8
        },
        {
          id: 'missing-two',
          user_id: testUserId,
          title: 'only first keyword',
          description: 'Missing second and third',
          priority: 'low',
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
          rank: 0.5
        }
      ];

      // Mock universal search call (returns all tasks)
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '3' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: tasks,
        command: 'SELECT',
        rowCount: 3,
        oid: 0,
        fields: []
      });

      // Mock empty note search
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await searchService.multiKeywordSearch(
        testUserId,
        keywords,
        { content_type: ['task'] }
      );

      // Only the task with ALL keywords should be returned
      expect(result.results).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.results[0].id).toBe('all-keywords');

      // Verify the result contains all keywords
      const searchText = (result.results[0].title + ' ' + (result.results[0].content || '')).toLowerCase();
      keywords.forEach(keyword => {
        expect(searchText).toContain(keyword);
      });
    });
  });
});