import * as fc from 'fast-check';
import * as dashboardService from '../dashboardService';
import { query } from '../../db/connection';

// Mock dependencies
jest.mock('../../db/connection');
jest.mock('../../utils/logger');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('DashboardService', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 39: Dashboard displays current data
   * Validates: Requirements 9.1
   * 
   * For any user accessing the dashboard, the displayed data (tasks, notes, notifications)
   * should reflect the current state of the user's content.
   */
  describe('Property 39: Dashboard displays current data', () => {
    test('should return current dashboard data for any user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            upcomingTasks: fc.array(
              fc.record({
                id: fc.uuid(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                due_date: fc.date({ min: new Date(), max: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }), // Next 7 days
                priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
                status: fc.constant('pending')
              }),
              { minLength: 0, maxLength: 5 }
            ),
            recentNotes: fc.array(
              fc.record({
                id: fc.uuid(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
                updated_at: fc.date({ min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), max: new Date() }), // Last 30 days
                folder_id: fc.option(fc.uuid())
              }),
              { minLength: 0, maxLength: 5 }
            ),
            groupNotifications: fc.array(
              fc.record({
                id: fc.uuid(),
                group_id: fc.uuid(),
                group_name: fc.string({ minLength: 1, maxLength: 50 }),
                type: fc.constantFrom('join_request', 'message', 'member_added', 'resource_shared'),
                message: fc.string({ minLength: 1, maxLength: 200 }),
                created_at: fc.date({ min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), max: new Date() }) // Last 7 days
              }),
              { minLength: 0, maxLength: 10 }
            ),
            stats: fc.record({
              totalTasks: fc.integer({ min: 0, max: 1000 }),
              completedTasks: fc.integer({ min: 0, max: 1000 }),
              totalNotes: fc.integer({ min: 0, max: 1000 }),
              totalGroups: fc.integer({ min: 0, max: 100 })
            }).map(stats => ({
              ...stats,
              completedTasks: Math.min(stats.completedTasks, stats.totalTasks) // Ensure completed <= total
            }))
          }),
          async ({ upcomingTasks, recentNotes, groupNotifications, stats }) => {
            // Mock upcoming tasks query
            mockQuery.mockResolvedValueOnce({
              rows: upcomingTasks,
              command: 'SELECT',
              rowCount: upcomingTasks.length,
              oid: 0,
              fields: []
            });

            // Mock recent notes query
            mockQuery.mockResolvedValueOnce({
              rows: recentNotes,
              command: 'SELECT',
              rowCount: recentNotes.length,
              oid: 0,
              fields: []
            });

            // Mock group notifications query
            mockQuery.mockResolvedValueOnce({
              rows: groupNotifications,
              command: 'SELECT',
              rowCount: groupNotifications.length,
              oid: 0,
              fields: []
            });

            // Mock stats query
            mockQuery.mockResolvedValueOnce({
              rows: [{
                total_tasks: stats.totalTasks.toString(),
                completed_tasks: stats.completedTasks.toString(),
                total_notes: stats.totalNotes.toString(),
                total_groups: stats.totalGroups.toString()
              }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            const result = await dashboardService.getDashboardData(testUserId);

            // Verify dashboard data structure
            expect(result).toBeDefined();
            expect(result.upcomingTasks).toBeDefined();
            expect(result.recentNotes).toBeDefined();
            expect(result.groupNotifications).toBeDefined();
            expect(result.stats).toBeDefined();

            // Verify upcoming tasks data matches current state
            expect(result.upcomingTasks).toHaveLength(upcomingTasks.length);
            result.upcomingTasks.forEach((task, index) => {
              expect(task.id).toBe(upcomingTasks[index].id);
              expect(task.title).toBe(upcomingTasks[index].title);
              expect(task.priority).toBe(upcomingTasks[index].priority);
              expect(task.status).toBe('pending');
              
              // Verify due date is within next 7 days (with small tolerance for test timing)
              const dueDate = new Date(task.due_date);
              const now = new Date(Date.now() - 1000); // Subtract 1 second tolerance
              const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 1000); // Add 1 second tolerance
              expect(dueDate.getTime()).toBeGreaterThanOrEqual(now.getTime());
              expect(dueDate.getTime()).toBeLessThanOrEqual(sevenDaysFromNow.getTime());
            });

            // Verify recent notes data matches current state
            expect(result.recentNotes).toHaveLength(recentNotes.length);
            result.recentNotes.forEach((note, index) => {
              expect(note.id).toBe(recentNotes[index].id);
              expect(note.title).toBe(recentNotes[index].title);
              expect(note.folder_id).toBe(recentNotes[index].folder_id);
              
              // Verify updated_at is recent (with small tolerance for test timing)
              const updatedAt = new Date(note.updated_at);
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 - 1000); // Add 1 second tolerance
              expect(updatedAt.getTime()).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime());
            });

            // Verify group notifications data matches current state
            expect(result.groupNotifications).toHaveLength(groupNotifications.length);
            result.groupNotifications.forEach((notification, index) => {
              expect(notification.id).toBe(groupNotifications[index].id);
              expect(notification.group_id).toBe(groupNotifications[index].group_id);
              expect(notification.group_name).toBe(groupNotifications[index].group_name);
              expect(notification.type).toBe(groupNotifications[index].type);
              expect(notification.message).toBe(groupNotifications[index].message);
              
              // Verify created_at is within last 7 days (with small tolerance for test timing)
              const createdAt = new Date(notification.created_at);
              const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1000); // Add 1 second tolerance
              expect(createdAt.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime());
            });

            // Verify stats data matches current state
            expect(result.stats.totalTasks).toBe(stats.totalTasks);
            expect(result.stats.completedTasks).toBe(stats.completedTasks);
            expect(result.stats.totalNotes).toBe(stats.totalNotes);
            expect(result.stats.totalGroups).toBe(stats.totalGroups);

            // Verify completed tasks doesn't exceed total tasks
            expect(result.stats.completedTasks).toBeLessThanOrEqual(result.stats.totalTasks);

            // Verify all data is current (no stale data)
            expect(result.upcomingTasks.every(task => task.status === 'pending')).toBe(true);
            expect(result.recentNotes.every(note => new Date(note.updated_at) <= new Date())).toBe(true);
            expect(result.groupNotifications.every(notif => new Date(notif.created_at) <= new Date())).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle empty dashboard data correctly', async () => {
      // Mock empty results for all queries
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
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
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          total_tasks: '0',
          completed_tasks: '0',
          total_notes: '0',
          total_groups: '0'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await dashboardService.getDashboardData(testUserId);

      expect(result.upcomingTasks).toHaveLength(0);
      expect(result.recentNotes).toHaveLength(0);
      expect(result.groupNotifications).toHaveLength(0);
      expect(result.stats.totalTasks).toBe(0);
      expect(result.stats.completedTasks).toBe(0);
      expect(result.stats.totalNotes).toBe(0);
      expect(result.stats.totalGroups).toBe(0);
    });

    test('should limit results to expected maximums', async () => {
      // Create more data than the limits
      const manyTasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        due_date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'medium',
        status: 'pending'
      }));

      const manyNotes = Array.from({ length: 10 }, (_, i) => ({
        id: `note-${i}`,
        title: `Note ${i}`,
        updated_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
        folder_id: null
      }));

      const manyNotifications = Array.from({ length: 15 }, (_, i) => ({
        id: `notif-${i}`,
        group_id: `group-${i}`,
        group_name: `Group ${i}`,
        type: 'message',
        message: `Message ${i}`,
        created_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString()
      }));

      // Mock queries with limited results (simulate LIMIT clause)
      mockQuery.mockResolvedValueOnce({
        rows: manyTasks.slice(0, 5), // Simulate LIMIT 5
        command: 'SELECT',
        rowCount: 5,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: manyNotes.slice(0, 5), // Simulate LIMIT 5
        command: 'SELECT',
        rowCount: 5,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: manyNotifications.slice(0, 10), // Simulate LIMIT 10
        command: 'SELECT',
        rowCount: 10,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          total_tasks: '100',
          completed_tasks: '50',
          total_notes: '75',
          total_groups: '10'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await dashboardService.getDashboardData(testUserId);

      // Verify limits are respected (based on LIMIT clauses in queries)
      expect(result.upcomingTasks.length).toBeLessThanOrEqual(5); // LIMIT 5 in query
      expect(result.recentNotes.length).toBeLessThanOrEqual(5); // LIMIT 5 in query
      expect(result.groupNotifications.length).toBeLessThanOrEqual(10); // LIMIT 10 in query

      // Verify data is properly ordered (most relevant first)
      if (result.upcomingTasks.length > 1) {
        for (let i = 1; i < result.upcomingTasks.length; i++) {
          const prevDate = new Date(result.upcomingTasks[i - 1].due_date);
          const currDate = new Date(result.upcomingTasks[i].due_date);
          expect(prevDate.getTime()).toBeLessThanOrEqual(currDate.getTime()); // Ordered by due_date ASC
        }
      }

      if (result.recentNotes.length > 1) {
        for (let i = 1; i < result.recentNotes.length; i++) {
          const prevDate = new Date(result.recentNotes[i - 1].updated_at);
          const currDate = new Date(result.recentNotes[i].updated_at);
          expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime()); // Ordered by updated_at DESC
        }
      }

      if (result.groupNotifications.length > 1) {
        for (let i = 1; i < result.groupNotifications.length; i++) {
          const prevDate = new Date(result.groupNotifications[i - 1].created_at);
          const currDate = new Date(result.groupNotifications[i].created_at);
          expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime()); // Ordered by created_at DESC
        }
      }
    });

    test('should only return user-specific data', async () => {
      const userTasks = [
        { id: 'task-1', title: 'User Task', due_date: new Date().toISOString(), priority: 'high', status: 'pending' }
      ];

      const userNotes = [
        { id: 'note-1', title: 'User Note', updated_at: new Date().toISOString(), folder_id: null }
      ];

      const userNotifications = [
        { 
          id: 'notif-1', 
          group_id: 'group-1', 
          group_name: 'User Group', 
          type: 'message', 
          message: 'Test message',
          created_at: new Date().toISOString()
        }
      ];

      // Mock user-specific queries
      mockQuery.mockResolvedValueOnce({
        rows: userTasks,
        command: 'SELECT',
        rowCount: userTasks.length,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: userNotes,
        command: 'SELECT',
        rowCount: userNotes.length,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: userNotifications,
        command: 'SELECT',
        rowCount: userNotifications.length,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          total_tasks: '5',
          completed_tasks: '2',
          total_notes: '3',
          total_groups: '1'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const result = await dashboardService.getDashboardData(testUserId);

      // Verify all queries were called with the correct user ID
      expect(mockQuery).toHaveBeenCalledTimes(4);
      
      // Check that all query calls include the user ID parameter
      mockQuery.mock.calls.forEach(call => {
        const [, params] = call;
        expect(params).toContain(testUserId);
      });

      // Verify returned data matches user-specific data
      expect(result.upcomingTasks).toEqual(userTasks);
      expect(result.recentNotes).toEqual(userNotes);
      expect(result.groupNotifications).toEqual(userNotifications);
      expect(result.stats.totalTasks).toBe(5);
      expect(result.stats.completedTasks).toBe(2);
      expect(result.stats.totalNotes).toBe(3);
      expect(result.stats.totalGroups).toBe(1);
    });
  });

  /**
   * Property 40: Dashboard preferences round-trip
   * Validates: Requirements 9.2
   * 
   * For any dashboard widget customization, when saved and the page is reloaded,
   * the customization should be restored exactly as configured.
   */
  describe('Property 40: Dashboard preferences round-trip', () => {
    test('should save and restore dashboard preferences correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            widgetLayout: fc.record({
              widgets: fc.array(
                fc.record({
                  id: fc.string({ minLength: 1, maxLength: 50 }),
                  type: fc.constantFrom('tasks', 'notes', 'notifications', 'analytics', 'groups'),
                  position: fc.record({
                    x: fc.integer({ min: 0, max: 12 }),
                    y: fc.integer({ min: 0, max: 20 }),
                    width: fc.integer({ min: 1, max: 12 }),
                    height: fc.integer({ min: 1, max: 10 })
                  }),
                  visible: fc.boolean(),
                  settings: fc.record({
                    showHeader: fc.boolean(),
                    refreshInterval: fc.integer({ min: 30, max: 3600 }),
                    maxItems: fc.integer({ min: 1, max: 50 })
                  })
                }),
                { minLength: 1, maxLength: 10 }
              ),
              theme: fc.constantFrom('light', 'dark', 'auto'),
              compactMode: fc.boolean(),
              showWelcome: fc.boolean()
            })
          }),
          async ({ widgetLayout }) => {
            // Mock update preferences (create new or update existing)
            const mockPreferences = {
              id: 'pref-123',
              user_id: testUserId,
              widget_layout: widgetLayout,
              created_at: new Date(),
              updated_at: new Date()
            };

            // First mock: try to update existing preferences (returns empty if none exist)
            mockQuery.mockResolvedValueOnce({
              rows: [], // No existing preferences
              command: 'UPDATE',
              rowCount: 0,
              oid: 0,
              fields: []
            });

            // Second mock: create new preferences
            mockQuery.mockResolvedValueOnce({
              rows: [mockPreferences],
              command: 'INSERT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Save preferences
            const savedPreferences = await dashboardService.updateDashboardPreferences(testUserId, widgetLayout);

            // Verify preferences were saved correctly
            expect(savedPreferences).toBeDefined();
            expect(savedPreferences.user_id).toBe(testUserId);
            expect(savedPreferences.widget_layout).toEqual(widgetLayout);

            // Mock get preferences to simulate reload
            mockQuery.mockResolvedValueOnce({
              rows: [mockPreferences],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Retrieve preferences (simulating page reload)
            const retrievedPreferences = await dashboardService.getDashboardPreferences(testUserId);

            // Verify round-trip: saved preferences match retrieved preferences
            expect(retrievedPreferences).toBeDefined();
            expect(retrievedPreferences!.user_id).toBe(testUserId);
            expect(retrievedPreferences!.widget_layout).toEqual(widgetLayout);

            // Verify deep equality of widget layout
            expect(retrievedPreferences!.widget_layout.widgets).toHaveLength(widgetLayout.widgets.length);
            
            widgetLayout.widgets.forEach((originalWidget, index) => {
              const retrievedWidget = retrievedPreferences!.widget_layout.widgets[index];
              
              expect(retrievedWidget.id).toBe(originalWidget.id);
              expect(retrievedWidget.type).toBe(originalWidget.type);
              expect(retrievedWidget.visible).toBe(originalWidget.visible);
              
              // Verify position round-trip
              expect(retrievedWidget.position.x).toBe(originalWidget.position.x);
              expect(retrievedWidget.position.y).toBe(originalWidget.position.y);
              expect(retrievedWidget.position.width).toBe(originalWidget.position.width);
              expect(retrievedWidget.position.height).toBe(originalWidget.position.height);
              
              // Verify settings round-trip
              expect(retrievedWidget.settings.showHeader).toBe(originalWidget.settings.showHeader);
              expect(retrievedWidget.settings.refreshInterval).toBe(originalWidget.settings.refreshInterval);
              expect(retrievedWidget.settings.maxItems).toBe(originalWidget.settings.maxItems);
            });

            // Verify theme and global settings round-trip
            expect(retrievedPreferences!.widget_layout.theme).toBe(widgetLayout.theme);
            expect(retrievedPreferences!.widget_layout.compactMode).toBe(widgetLayout.compactMode);
            expect(retrievedPreferences!.widget_layout.showWelcome).toBe(widgetLayout.showWelcome);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should update existing preferences correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            initialLayout: fc.record({
              widgets: fc.array(
                fc.record({
                  id: fc.string({ minLength: 1, maxLength: 20 }),
                  type: fc.constantFrom('tasks', 'notes'),
                  position: fc.record({
                    x: fc.integer({ min: 0, max: 6 }),
                    y: fc.integer({ min: 0, max: 10 }),
                    width: fc.integer({ min: 1, max: 6 }),
                    height: fc.integer({ min: 1, max: 5 })
                  }),
                  visible: fc.boolean(),
                  settings: fc.record({
                    showHeader: fc.boolean(),
                    refreshInterval: fc.integer({ min: 60, max: 1800 }),
                    maxItems: fc.integer({ min: 5, max: 25 })
                  })
                }),
                { minLength: 1, maxLength: 5 }
              ),
              theme: fc.constantFrom('light', 'dark'),
              compactMode: fc.boolean(),
              showWelcome: fc.boolean()
            }),
            updatedLayout: fc.record({
              widgets: fc.array(
                fc.record({
                  id: fc.string({ minLength: 1, maxLength: 20 }),
                  type: fc.constantFrom('notifications', 'analytics'),
                  position: fc.record({
                    x: fc.integer({ min: 6, max: 12 }),
                    y: fc.integer({ min: 10, max: 20 }),
                    width: fc.integer({ min: 1, max: 6 }),
                    height: fc.integer({ min: 1, max: 5 })
                  }),
                  visible: fc.boolean(),
                  settings: fc.record({
                    showHeader: fc.boolean(),
                    refreshInterval: fc.integer({ min: 1800, max: 3600 }),
                    maxItems: fc.integer({ min: 25, max: 50 })
                  })
                }),
                { minLength: 1, maxLength: 5 }
              ),
              theme: fc.constantFrom('auto'),
              compactMode: fc.boolean(),
              showWelcome: fc.boolean()
            })
          }),
          async ({ initialLayout, updatedLayout }) => {
            const initialPreferences = {
              id: 'pref-123',
              user_id: testUserId,
              widget_layout: initialLayout,
              created_at: new Date(),
              updated_at: new Date()
            };

            const updatedPreferences = {
              ...initialPreferences,
              widget_layout: updatedLayout,
              updated_at: new Date()
            };

            // Mock successful update of existing preferences
            mockQuery.mockResolvedValueOnce({
              rows: [updatedPreferences],
              command: 'UPDATE',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Update preferences
            const result = await dashboardService.updateDashboardPreferences(testUserId, updatedLayout);

            // Verify update was successful
            expect(result).toBeDefined();
            expect(result.user_id).toBe(testUserId);
            expect(result.widget_layout).toEqual(updatedLayout);
            expect(result.widget_layout).not.toEqual(initialLayout);

            // Verify the updated layout is different from initial (if they're actually different)
            const layoutsAreDifferent = JSON.stringify(initialLayout) !== JSON.stringify(updatedLayout);
            if (layoutsAreDifferent) {
              expect(result.widget_layout).not.toEqual(initialLayout);
            }

            // Mock retrieval of updated preferences
            mockQuery.mockResolvedValueOnce({
              rows: [updatedPreferences],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Retrieve updated preferences
            const retrieved = await dashboardService.getDashboardPreferences(testUserId);

            // Verify round-trip with updated preferences
            expect(retrieved).toBeDefined();
            expect(retrieved!.widget_layout).toEqual(updatedLayout);
            expect(retrieved!.widget_layout).toEqual(result.widget_layout);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle non-existent preferences correctly', async () => {
      const newLayout = {
        widgets: [
          {
            id: 'widget-1',
            type: 'tasks' as const,
            position: { x: 0, y: 0, width: 6, height: 4 },
            visible: true,
            settings: { showHeader: true, refreshInterval: 300, maxItems: 10 }
          }
        ],
        theme: 'light' as const,
        compactMode: false,
        showWelcome: true
      };

      // Mock get preferences - no existing preferences
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await dashboardService.getDashboardPreferences(testUserId);
      expect(result).toBeNull();

      // Mock create new preferences
      const newPreferences = {
        id: 'pref-new',
        user_id: testUserId,
        widget_layout: newLayout,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock update attempt (no existing record)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      // Mock create new preferences
      mockQuery.mockResolvedValueOnce({
        rows: [newPreferences],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const created = await dashboardService.updateDashboardPreferences(testUserId, newLayout);
      
      expect(created).toBeDefined();
      expect(created.user_id).toBe(testUserId);
      expect(created.widget_layout).toEqual(newLayout);
    });

    test('should preserve complex nested widget configurations', async () => {
      const complexLayout = {
        widgets: [
          {
            id: 'complex-widget',
            type: 'analytics' as const,
            position: { x: 0, y: 0, width: 12, height: 8 },
            visible: true,
            settings: {
              showHeader: true,
              refreshInterval: 1800,
              maxItems: 50,
              // Additional complex settings
              chartType: 'line',
              timeRange: '30d',
              metrics: ['completion_rate', 'study_time', 'productivity'],
              colors: {
                primary: '#3b82f6',
                secondary: '#10b981',
                accent: '#f59e0b'
              },
              filters: {
                categories: ['work', 'study', 'personal'],
                priorities: ['high', 'medium'],
                dateRange: {
                  start: '2024-01-01',
                  end: '2024-12-31'
                }
              }
            }
          }
        ],
        theme: 'dark' as const,
        compactMode: true,
        showWelcome: false,
        // Additional global settings
        autoRefresh: true,
        notifications: {
          enabled: true,
          sound: false,
          desktop: true,
          email: false
        },
        layout: {
          sidebar: 'left',
          density: 'comfortable',
          animations: true
        }
      };

      const mockPreferences = {
        id: 'pref-complex',
        user_id: testUserId,
        widget_layout: complexLayout,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock update (create new)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [mockPreferences],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      await dashboardService.updateDashboardPreferences(testUserId, complexLayout);

      // Mock retrieval
      mockQuery.mockResolvedValueOnce({
        rows: [mockPreferences],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const retrieved = await dashboardService.getDashboardPreferences(testUserId);

      // Verify complex nested structure is preserved
      expect(retrieved).toBeDefined();
      expect(retrieved!.widget_layout).toEqual(complexLayout);
      
      // Verify deep nested properties
      const widget = retrieved!.widget_layout.widgets[0];
      expect(widget.settings.chartType).toBe('line');
      expect(widget.settings.colors.primary).toBe('#3b82f6');
      expect(widget.settings.filters.categories).toEqual(['work', 'study', 'personal']);
      expect(widget.settings.filters.dateRange.start).toBe('2024-01-01');
      
      // Verify global settings
      expect(retrieved!.widget_layout.notifications.enabled).toBe(true);
      expect(retrieved!.widget_layout.layout.sidebar).toBe('left');
    });
  });

  /**
   * Property 41: Analytics reflect actual data
   * Validates: Requirements 9.3
   * 
   * For any productivity analytics displayed, the metrics should accurately reflect
   * the user's task completion rates and study patterns from the database.
   */
  describe('Property 41: Analytics reflect actual data', () => {
    test('should calculate task completion rates accurately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            taskData: fc.array(
              fc.record({
                date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
                total: fc.integer({ min: 1, max: 20 }),
                completed: fc.integer({ min: 0, max: 20 })
              }).map(data => ({
                ...data,
                completed: Math.min(data.completed, data.total) // Ensure completed <= total
              })),
              { minLength: 1, maxLength: 30 }
            ),
            studyTimeData: fc.record({
              recentCompleted: fc.integer({ min: 0, max: 100 }),
              previousCompleted: fc.integer({ min: 0, max: 100 })
            }),
            categoryData: fc.array(
              fc.record({
                category: fc.string({ minLength: 1, maxLength: 30 }),
                count: fc.integer({ min: 1, max: 50 })
              }),
              { minLength: 1, maxLength: 10 }
            )
          }),
          async ({ taskData, studyTimeData, categoryData }) => {
            // Mock task completion rate query
            mockQuery.mockResolvedValueOnce({
              rows: taskData.map(data => ({
                date: data.date.toISOString().split('T')[0],
                total: data.total.toString(),
                completed: data.completed.toString()
              })),
              command: 'SELECT',
              rowCount: taskData.length,
              oid: 0,
              fields: []
            });

            // Mock study time stats query
            mockQuery.mockResolvedValueOnce({
              rows: [{
                recent_completed: studyTimeData.recentCompleted.toString(),
                previous_completed: studyTimeData.previousCompleted.toString()
              }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Mock category breakdown query
            const totalTasks = categoryData.reduce((sum, cat) => sum + cat.count, 0);
            mockQuery.mockResolvedValueOnce({
              rows: categoryData.map(cat => ({
                category: cat.category,
                count: cat.count.toString()
              })),
              command: 'SELECT',
              rowCount: categoryData.length,
              oid: 0,
              fields: []
            });

            const analytics = await dashboardService.getProductivityAnalytics(testUserId);

            // Verify analytics structure
            expect(analytics).toBeDefined();
            expect(analytics.taskCompletionRate).toBeDefined();
            expect(analytics.studyTimeStats).toBeDefined();
            expect(analytics.categoryBreakdown).toBeDefined();

            // Verify task completion rate calculations
            expect(analytics.taskCompletionRate).toHaveLength(taskData.length);
            
            analytics.taskCompletionRate.forEach((rate, index) => {
              const originalData = taskData[index];
              
              expect(rate.period).toBe(originalData.date.toISOString().split('T')[0]);
              expect(rate.total).toBe(originalData.total);
              expect(rate.completed).toBe(originalData.completed);
              
              // Verify rate calculation accuracy
              const expectedRate = originalData.total > 0 
                ? Math.round((originalData.completed / originalData.total) * 100)
                : 0;
              expect(rate.rate).toBe(expectedRate);
              
              // Verify rate is within valid range
              expect(rate.rate).toBeGreaterThanOrEqual(0);
              expect(rate.rate).toBeLessThanOrEqual(100);
            });

            // Verify study time stats calculations
            expect(analytics.studyTimeStats.totalHours).toBe(studyTimeData.recentCompleted * 2);
            expect(analytics.studyTimeStats.averagePerDay).toBe(
              Math.round((studyTimeData.recentCompleted * 2) / 30 * 10) / 10
            );

            // Verify trend calculation
            let expectedTrend: 'up' | 'down' | 'stable' = 'stable';
            if (studyTimeData.recentCompleted > studyTimeData.previousCompleted) {
              expectedTrend = 'up';
            } else if (studyTimeData.recentCompleted < studyTimeData.previousCompleted) {
              expectedTrend = 'down';
            }
            expect(analytics.studyTimeStats.trend).toBe(expectedTrend);

            // Verify category breakdown calculations
            expect(analytics.categoryBreakdown).toHaveLength(categoryData.length);
            
            analytics.categoryBreakdown.forEach((breakdown, index) => {
              const originalCategory = categoryData[index];
              
              expect(breakdown.category).toBe(originalCategory.category);
              expect(breakdown.count).toBe(originalCategory.count);
              
              // Verify percentage calculation accuracy
              const expectedPercentage = totalTasks > 0 
                ? Math.round((originalCategory.count / totalTasks) * 100)
                : 0;
              expect(breakdown.percentage).toBe(expectedPercentage);
              
              // Verify percentage is within valid range
              expect(breakdown.percentage).toBeGreaterThanOrEqual(0);
              expect(breakdown.percentage).toBeLessThanOrEqual(100);
            });

            // Verify total percentages add up to 100% (or close due to rounding)
            const totalPercentage = analytics.categoryBreakdown.reduce((sum, cat) => sum + cat.percentage, 0);
            expect(totalPercentage).toBeGreaterThanOrEqual(95); // Allow for rounding errors
            expect(totalPercentage).toBeLessThanOrEqual(105);

            // Verify all data reflects actual database values (no fabricated data)
            const totalAnalyticsCount = analytics.categoryBreakdown.reduce((sum, cat) => sum + cat.count, 0);
            expect(totalAnalyticsCount).toBe(totalTasks);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle zero task scenarios correctly', async () => {
      // Mock empty task completion data
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      // Mock zero study time data
      mockQuery.mockResolvedValueOnce({
        rows: [{
          recent_completed: '0',
          previous_completed: '0'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock empty category data
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const analytics = await dashboardService.getProductivityAnalytics(testUserId);

      expect(analytics.taskCompletionRate).toHaveLength(0);
      expect(analytics.studyTimeStats.totalHours).toBe(0);
      expect(analytics.studyTimeStats.averagePerDay).toBe(0);
      expect(analytics.studyTimeStats.trend).toBe('stable');
      expect(analytics.categoryBreakdown).toHaveLength(0);
    });

    test('should calculate percentages correctly for single category', async () => {
      const singleCategory = {
        category: 'Work',
        count: 42
      };

      // Mock empty task completion data
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      // Mock study time data
      mockQuery.mockResolvedValueOnce({
        rows: [{
          recent_completed: '10',
          previous_completed: '5'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock single category data
      mockQuery.mockResolvedValueOnce({
        rows: [{
          category: singleCategory.category,
          count: singleCategory.count.toString()
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const analytics = await dashboardService.getProductivityAnalytics(testUserId);

      expect(analytics.categoryBreakdown).toHaveLength(1);
      expect(analytics.categoryBreakdown[0].category).toBe(singleCategory.category);
      expect(analytics.categoryBreakdown[0].count).toBe(singleCategory.count);
      expect(analytics.categoryBreakdown[0].percentage).toBe(100); // Single category should be 100%
    });

    test('should maintain data consistency across multiple calls', async () => {
      const consistentData = {
        taskData: [
          { date: '2024-01-01', total: '10', completed: '8' },
          { date: '2024-01-02', total: '5', completed: '5' }
        ],
        studyData: { recent_completed: '15', previous_completed: '10' },
        categoryData: [
          { category: 'Work', count: '8' },
          { category: 'Personal', count: '7' }
        ]
      };

      // First call
      mockQuery.mockResolvedValueOnce({
        rows: consistentData.taskData,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [consistentData.studyData],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: consistentData.categoryData,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      });

      const firstCall = await dashboardService.getProductivityAnalytics(testUserId);

      // Second call with same data
      mockQuery.mockResolvedValueOnce({
        rows: consistentData.taskData,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [consistentData.studyData],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: consistentData.categoryData,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      });

      const secondCall = await dashboardService.getProductivityAnalytics(testUserId);

      // Verify both calls return identical results
      expect(firstCall).toEqual(secondCall);
      
      // Verify specific calculations are consistent
      expect(firstCall.taskCompletionRate[0].rate).toBe(secondCall.taskCompletionRate[0].rate);
      expect(firstCall.studyTimeStats.trend).toBe(secondCall.studyTimeStats.trend);
      expect(firstCall.categoryBreakdown[0].percentage).toBe(secondCall.categoryBreakdown[0].percentage);
    });

    test('should handle edge cases in completion rate calculations', async () => {
      const edgeCaseData = [
        { date: '2024-01-01', total: '0', completed: '0' }, // Division by zero case
        { date: '2024-01-02', total: '1', completed: '1' }, // 100% completion
        { date: '2024-01-03', total: '100', completed: '33' }, // Rounding case
        { date: '2024-01-04', total: '3', completed: '1' } // 33.33% case
      ];

      mockQuery.mockResolvedValueOnce({
        rows: edgeCaseData,
        command: 'SELECT',
        rowCount: 4,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ recent_completed: '0', previous_completed: '0' }],
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

      const analytics = await dashboardService.getProductivityAnalytics(testUserId);

      // Verify edge case handling
      expect(analytics.taskCompletionRate[0].rate).toBe(0); // 0/0 should be 0, not NaN
      expect(analytics.taskCompletionRate[1].rate).toBe(100); // 1/1 should be 100
      expect(analytics.taskCompletionRate[2].rate).toBe(33); // 33/100 should round to 33
      expect(analytics.taskCompletionRate[3].rate).toBe(33); // 1/3 should round to 33

      // Verify all rates are valid numbers
      analytics.taskCompletionRate.forEach(rate => {
        expect(typeof rate.rate).toBe('number');
        expect(isNaN(rate.rate)).toBe(false);
        expect(isFinite(rate.rate)).toBe(true);
      });
    });
  });
});