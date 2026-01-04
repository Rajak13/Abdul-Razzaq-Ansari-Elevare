import * as fc from 'fast-check';
import * as whiteboardService from '../whiteboardService';
import { query } from '../../db/connection';

// Mock dependencies
jest.mock('../../db/connection');
jest.mock('../../utils/logger');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('WhiteboardService - Element Persistence', () => {
  const testUserId = 'test-user-123';
  const testWhiteboardId = 'whiteboard-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 33: Whiteboard elements persist
   * Validates: Requirements 7.3
   * 
   * For any element added to the whiteboard (text, shape, drawing), the element
   * should be stored in the database and retrievable when the whiteboard is reopened.
   */
  describe('Property 33: Whiteboard elements persist', () => {
    test('should persist whiteboard elements correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.constantFrom('drawing', 'text', 'shape'),
              data: fc.record({
                content: fc.string({ minLength: 1, maxLength: 100 }),
                style: fc.record({
                  color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
                  size: fc.integer({ min: 1, max: 50 }),
                  fontFamily: fc.constantFrom('Arial', 'Helvetica', 'Times New Roman')
                })
              }),
              position: fc.record({
                x: fc.integer({ min: 0, max: 1920 }),
                y: fc.integer({ min: 0, max: 1080 })
              })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (elements) => {
            // Mock existing whiteboard
            const mockWhiteboard = {
              id: testWhiteboardId,
              user_id: testUserId,
              name: 'Test Whiteboard',
              canvas_data: JSON.stringify({
                elements: [],
                version: 1,
                background: '#ffffff'
              }),
              created_at: new Date(),
              updated_at: new Date()
            };

            // Mock getWhiteboardById call
            mockQuery.mockResolvedValueOnce({
              rows: [mockWhiteboard],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Mock the update query
            const updatedCanvasData = {
              elements: elements,
              version: 2,
              background: '#ffffff',
              lastModified: expect.any(String)
            };

            const updatedWhiteboard = {
              ...mockWhiteboard,
              canvas_data: JSON.stringify(updatedCanvasData),
              updated_at: new Date()
            };

            mockQuery.mockResolvedValueOnce({
              rows: [updatedWhiteboard],
              command: 'UPDATE',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Store elements
            const result = await whiteboardService.storeCanvasElements(
              testUserId,
              testWhiteboardId,
              elements
            );

            // Verify the result
            expect(result).toBeDefined();
            expect(result!.id).toBe(testWhiteboardId);

            // Parse the stored canvas data
            const storedCanvasData = JSON.parse(result!.canvas_data as any);
            
            // Verify all elements were stored
            expect(storedCanvasData.elements).toHaveLength(elements.length);
            
            // Verify each element was stored correctly
            elements.forEach((element, index) => {
              const storedElement = storedCanvasData.elements[index];
              expect(storedElement.id).toBe(element.id);
              expect(storedElement.type).toBe(element.type);
              expect(storedElement.data).toEqual(element.data);
              expect(storedElement.position).toEqual(element.position);
            });

            // Verify version was incremented
            expect(storedCanvasData.version).toBe(2);
            expect(storedCanvasData.lastModified).toBeDefined();

            // Verify the database was called correctly
            expect(mockQuery).toHaveBeenCalledTimes(2);
            
            // Check the update query
            const updateCall = mockQuery.mock.calls[1];
            expect(updateCall?.[0]).toContain('UPDATE whiteboards');
            expect(updateCall?.[0]).toContain('SET canvas_data = $1');
            expect(updateCall?.[1]?.[0]).toBe(JSON.stringify(updatedCanvasData));
            expect(updateCall?.[1]?.[1]).toBe(testWhiteboardId);
            expect(updateCall?.[1]?.[2]).toBe(testUserId);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should persist individual element additions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('drawing', 'text', 'shape'),
            data: fc.record({
              content: fc.string({ minLength: 1, maxLength: 100 }),
              style: fc.record({
                color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
                size: fc.integer({ min: 1, max: 50 })
              })
            }),
            position: fc.record({
              x: fc.integer({ min: 0, max: 1920 }),
              y: fc.integer({ min: 0, max: 1080 })
            })
          }),
          async (element) => {
            // Mock existing whiteboard with some elements
            const existingElements = [
              {
                id: 'existing-1',
                type: 'text',
                data: { content: 'Existing text' },
                position: { x: 100, y: 100 }
              }
            ];

            const mockWhiteboard = {
              id: testWhiteboardId,
              user_id: testUserId,
              name: 'Test Whiteboard',
              canvas_data: JSON.stringify({
                elements: existingElements,
                version: 1,
                background: '#ffffff'
              }),
              created_at: new Date(),
              updated_at: new Date()
            };

            // Mock getWhiteboardById call
            mockQuery.mockResolvedValueOnce({
              rows: [mockWhiteboard],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Mock the update query
            const expectedElements = [...existingElements, element];
            const updatedCanvasData = {
              elements: expectedElements,
              version: 2,
              background: '#ffffff',
              lastModified: expect.any(String)
            };

            const updatedWhiteboard = {
              ...mockWhiteboard,
              canvas_data: JSON.stringify(updatedCanvasData),
              updated_at: new Date()
            };

            mockQuery.mockResolvedValueOnce({
              rows: [updatedWhiteboard],
              command: 'UPDATE',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Add element
            const result = await whiteboardService.addCanvasElement(
              testUserId,
              testWhiteboardId,
              element
            );

            // Verify the result
            expect(result).toBeDefined();
            expect(result!.id).toBe(testWhiteboardId);

            // Parse the stored canvas data
            const storedCanvasData = JSON.parse(result!.canvas_data as any);
            
            // Verify element was added to existing elements
            expect(storedCanvasData.elements).toHaveLength(2);
            
            // Verify existing element is still there
            expect(storedCanvasData.elements[0]).toEqual(existingElements[0]);
            
            // Verify new element was added correctly
            const addedElement = storedCanvasData.elements[1];
            expect(addedElement.id).toBe(element.id);
            expect(addedElement.type).toBe(element.type);
            expect(addedElement.data).toEqual(element.data);
            expect(addedElement.position).toEqual(element.position);

            // Verify version was incremented
            expect(storedCanvasData.version).toBe(2);
            expect(storedCanvasData.lastModified).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should persist element updates correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            elementId: fc.uuid(),
            updates: fc.record({
              data: fc.record({
                content: fc.string({ minLength: 1, maxLength: 100 }),
                style: fc.record({
                  color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
                  size: fc.integer({ min: 1, max: 50 })
                })
              }),
              position: fc.record({
                x: fc.integer({ min: 0, max: 1920 }),
                y: fc.integer({ min: 0, max: 1080 })
              })
            })
          }),
          async ({ elementId, updates }) => {
            // Mock existing whiteboard with the element to update
            const existingElements = [
              {
                id: elementId,
                type: 'text',
                data: { content: 'Original text', style: { color: '#000000', size: 12 } },
                position: { x: 50, y: 50 }
              },
              {
                id: 'other-element',
                type: 'shape',
                data: { content: 'Other element' },
                position: { x: 200, y: 200 }
              }
            ];

            const mockWhiteboard = {
              id: testWhiteboardId,
              user_id: testUserId,
              name: 'Test Whiteboard',
              canvas_data: JSON.stringify({
                elements: existingElements,
                version: 1,
                background: '#ffffff'
              }),
              created_at: new Date(),
              updated_at: new Date()
            };

            // Mock getWhiteboardById call
            mockQuery.mockResolvedValueOnce({
              rows: [mockWhiteboard],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Mock the update query
            const expectedElements = [
              {
                ...existingElements[0],
                ...updates
              },
              existingElements[1] // Other element should remain unchanged
            ];

            const updatedCanvasData = {
              elements: expectedElements,
              version: 2,
              background: '#ffffff',
              lastModified: expect.any(String)
            };

            const updatedWhiteboard = {
              ...mockWhiteboard,
              canvas_data: JSON.stringify(updatedCanvasData),
              updated_at: new Date()
            };

            mockQuery.mockResolvedValueOnce({
              rows: [updatedWhiteboard],
              command: 'UPDATE',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Update element
            const result = await whiteboardService.updateCanvasElement(
              testUserId,
              testWhiteboardId,
              elementId,
              updates
            );

            // Verify the result
            expect(result).toBeDefined();
            expect(result!.id).toBe(testWhiteboardId);

            // Parse the stored canvas data
            const storedCanvasData = JSON.parse(result!.canvas_data as any);
            
            // Verify elements count is unchanged
            expect(storedCanvasData.elements).toHaveLength(2);
            
            // Verify the updated element
            const updatedElement = storedCanvasData.elements[0];
            expect(updatedElement.id).toBe(elementId);
            expect(updatedElement.data).toEqual(updates.data);
            expect(updatedElement.position).toEqual(updates.position);
            
            // Verify other element is unchanged
            expect(storedCanvasData.elements[1]).toEqual(existingElements[1]);

            // Verify version was incremented
            expect(storedCanvasData.version).toBe(2);
            expect(storedCanvasData.lastModified).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should persist element deletions correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (elementIdToDelete) => {
            // Mock existing whiteboard with multiple elements
            const existingElements = [
              {
                id: elementIdToDelete,
                type: 'text',
                data: { content: 'Element to delete' },
                position: { x: 50, y: 50 }
              },
              {
                id: 'keep-element-1',
                type: 'shape',
                data: { content: 'Keep this element' },
                position: { x: 100, y: 100 }
              },
              {
                id: 'keep-element-2',
                type: 'drawing',
                data: { content: 'Keep this too' },
                position: { x: 150, y: 150 }
              }
            ];

            const mockWhiteboard = {
              id: testWhiteboardId,
              user_id: testUserId,
              name: 'Test Whiteboard',
              canvas_data: JSON.stringify({
                elements: existingElements,
                version: 1,
                background: '#ffffff'
              }),
              created_at: new Date(),
              updated_at: new Date()
            };

            // Mock getWhiteboardById call
            mockQuery.mockResolvedValueOnce({
              rows: [mockWhiteboard],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Mock the update query
            const expectedElements = existingElements.filter(el => el.id !== elementIdToDelete);
            const updatedCanvasData = {
              elements: expectedElements,
              version: 2,
              background: '#ffffff',
              lastModified: expect.any(String)
            };

            const updatedWhiteboard = {
              ...mockWhiteboard,
              canvas_data: JSON.stringify(updatedCanvasData),
              updated_at: new Date()
            };

            mockQuery.mockResolvedValueOnce({
              rows: [updatedWhiteboard],
              command: 'UPDATE',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Delete element
            const result = await whiteboardService.deleteCanvasElement(
              testUserId,
              testWhiteboardId,
              elementIdToDelete
            );

            // Verify the result
            expect(result).toBeDefined();
            expect(result!.id).toBe(testWhiteboardId);

            // Parse the stored canvas data
            const storedCanvasData = JSON.parse(result!.canvas_data as any);
            
            // Verify element was removed
            expect(storedCanvasData.elements).toHaveLength(2);
            
            // Verify the deleted element is not present
            const deletedElement = storedCanvasData.elements.find((el: any) => el.id === elementIdToDelete);
            expect(deletedElement).toBeUndefined();
            
            // Verify remaining elements are still there
            const remainingIds = storedCanvasData.elements.map((el: any) => el.id);
            expect(remainingIds).toContain('keep-element-1');
            expect(remainingIds).toContain('keep-element-2');

            // Verify version was incremented
            expect(storedCanvasData.version).toBe(2);
            expect(storedCanvasData.lastModified).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle empty element arrays', async () => {
      // Mock existing whiteboard
      const mockWhiteboard = {
        id: testWhiteboardId,
        user_id: testUserId,
        name: 'Test Whiteboard',
        canvas_data: JSON.stringify({
          elements: [{ id: 'existing', type: 'text', data: {}, position: { x: 0, y: 0 } }],
          version: 1,
          background: '#ffffff'
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock getWhiteboardById call
      mockQuery.mockResolvedValueOnce({
        rows: [mockWhiteboard],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock the update query
      const updatedCanvasData = {
        elements: [],
        version: 2,
        background: '#ffffff',
        lastModified: expect.any(String)
      };

      const updatedWhiteboard = {
        ...mockWhiteboard,
        canvas_data: JSON.stringify(updatedCanvasData),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({
        rows: [updatedWhiteboard],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Store empty elements array
      const result = await whiteboardService.storeCanvasElements(
        testUserId,
        testWhiteboardId,
        []
      );

      // Verify the result
      expect(result).toBeDefined();
      expect(result!.id).toBe(testWhiteboardId);

      // Parse the stored canvas data
      const storedCanvasData = JSON.parse(result!.canvas_data as any);
      
      // Verify elements array is empty
      expect(storedCanvasData.elements).toHaveLength(0);
      expect(storedCanvasData.version).toBe(2);
      expect(storedCanvasData.lastModified).toBeDefined();
    });

    test('should return null for non-existent whiteboard', async () => {
      // Mock whiteboard not found
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const result = await whiteboardService.storeCanvasElements(
        testUserId,
        'non-existent-whiteboard',
        []
      );

      expect(result).toBeNull();
    });

    test('should handle complex element structures', async () => {
      const complexElement = {
        id: 'complex-element',
        type: 'shape',
        data: {
          shapeType: 'polygon',
          points: [
            { x: 10, y: 10 },
            { x: 50, y: 10 },
            { x: 30, y: 40 }
          ],
          style: {
            fillColor: '#ff0000',
            strokeColor: '#000000',
            strokeWidth: 2,
            opacity: 0.8
          },
          metadata: {
            createdBy: testUserId,
            createdAt: new Date().toISOString(),
            tags: ['important', 'geometry']
          }
        },
        position: { x: 100, y: 200 },
        rotation: 45,
        scale: { x: 1.5, y: 1.2 }
      };

      // Mock existing whiteboard
      const mockWhiteboard = {
        id: testWhiteboardId,
        user_id: testUserId,
        name: 'Test Whiteboard',
        canvas_data: JSON.stringify({
          elements: [],
          version: 1,
          background: '#ffffff'
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock getWhiteboardById call
      mockQuery.mockResolvedValueOnce({
        rows: [mockWhiteboard],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock the update query
      const updatedCanvasData = {
        elements: [complexElement],
        version: 2,
        background: '#ffffff',
        lastModified: expect.any(String)
      };

      const updatedWhiteboard = {
        ...mockWhiteboard,
        canvas_data: JSON.stringify(updatedCanvasData),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({
        rows: [updatedWhiteboard],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Add complex element
      const result = await whiteboardService.addCanvasElement(
        testUserId,
        testWhiteboardId,
        complexElement
      );

      // Verify the result
      expect(result).toBeDefined();
      expect(result!.id).toBe(testWhiteboardId);

      // Parse the stored canvas data
      const storedCanvasData = JSON.parse(result!.canvas_data as any);
      
      // Verify complex element was stored correctly
      expect(storedCanvasData.elements).toHaveLength(1);
      const storedElement = storedCanvasData.elements[0];
      
      expect(storedElement).toEqual(complexElement);
      expect(storedElement.data.shapeType).toBe('polygon');
      expect(storedElement.data.points).toHaveLength(3);
      expect(storedElement.data.style.fillColor).toBe('#ff0000');
      expect(storedElement.data.metadata.tags).toEqual(['important', 'geometry']);
      expect(storedElement.rotation).toBe(45);
      expect(storedElement.scale).toEqual({ x: 1.5, y: 1.2 });
    });
  });

  /**
   * Property 34: Whiteboard export contains all elements
   * Validates: Requirements 7.4
   * 
   * For any whiteboard exported to PNG or SVG, the exported file should contain
   * all visible elements from the whiteboard.
   */
  describe('Property 34: Whiteboard export contains all elements', () => {
    test('should export all whiteboard elements in SVG format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            elements: fc.array(
              fc.record({
                id: fc.uuid(),
                type: fc.constantFrom('drawing', 'text', 'shape'),
                data: fc.record({
                  content: fc.string({ minLength: 1, maxLength: 50 }),
                  style: fc.record({
                    color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
                    size: fc.integer({ min: 8, max: 72 })
                  }),
                  shapeType: fc.constantFrom('rectangle', 'circle', 'polygon'),
                  width: fc.integer({ min: 10, max: 200 }),
                  height: fc.integer({ min: 10, max: 200 })
                }),
                position: fc.record({
                  x: fc.integer({ min: 0, max: 1000 }),
                  y: fc.integer({ min: 0, max: 1000 })
                })
              }),
              { minLength: 1, maxLength: 10 }
            ),
            background: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
            width: fc.integer({ min: 800, max: 1920 }),
            height: fc.integer({ min: 600, max: 1080 })
          }),
          async ({ elements, background, width, height }) => {
            // Mock existing whiteboard with elements
            const mockWhiteboard = {
              id: testWhiteboardId,
              user_id: testUserId,
              name: 'Test Whiteboard',
              canvas_data: JSON.stringify({
                elements: elements,
                version: 1,
                background: background
              }),
              created_at: new Date(),
              updated_at: new Date()
            };

            // Mock getWhiteboardById call
            mockQuery.mockResolvedValueOnce({
              rows: [mockWhiteboard],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Export whiteboard as SVG
            const exportResult = await whiteboardService.exportWhiteboard(
              testUserId,
              testWhiteboardId,
              'svg',
              { width, height }
            );

            // Verify export result
            expect(exportResult).toBeDefined();
            expect(exportResult!.mimeType).toBe('image/svg+xml');
            expect(exportResult!.data).toBeDefined();

            const svgContent = exportResult!.data;

            // Verify SVG structure
            expect(svgContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            expect(svgContent).toContain('<svg');
            expect(svgContent).toContain(`width="${width}"`);
            expect(svgContent).toContain(`height="${height}"`);
            expect(svgContent).toContain('</svg>');

            // Verify background is included
            expect(svgContent).toContain(`fill="${background}"`);

            // Verify all elements are represented in the SVG
            elements.forEach(element => {
              const { type, data, position } = element;
              
              switch (type) {
                case 'text':
                  // Check for text element with position and content
                  expect(svgContent).toContain('<text');
                  expect(svgContent).toContain(`x="${position.x}"`);
                  expect(svgContent).toContain(`y="${position.y}"`);
                  if (data.content) {
                    // Content should be XML-escaped in SVG
                    const escapedContent = data.content
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;');
                    expect(svgContent).toContain(escapedContent);
                  }
                  break;
                  
                case 'shape':
                  if (data.shapeType === 'rectangle') {
                    expect(svgContent).toContain('<rect');
                    expect(svgContent).toContain(`x="${position.x}"`);
                    expect(svgContent).toContain(`y="${position.y}"`);
                  } else if (data.shapeType === 'circle') {
                    expect(svgContent).toContain('<circle');
                    expect(svgContent).toContain(`cx="${position.x}"`);
                    expect(svgContent).toContain(`cy="${position.y}"`);
                  }
                  break;
                  
                case 'drawing':
                  // For drawing elements, we would check for path data if it exists
                  // Since our test data generator doesn't include path, we'll skip this check
                  break;
              }

              // Verify style properties are included
              if (data.style) {
                if (data.style.color) {
                  expect(svgContent).toContain(data.style.color);
                }
              }
            });

            // Verify SVG is well-formed (basic check)
            const openTags = (svgContent.match(/<[^/][^>]*>/g) || []).length;
            const closeTags = (svgContent.match(/<\/[^>]*>/g) || []).length;
            
            // For well-formed XML: openTags should equal closeTags + selfClosingTags
            // (This is a simplified check, but good enough for our purposes)
            expect(openTags).toBeGreaterThanOrEqual(closeTags);
          }
        ),
        { numRuns: 50 } // Reduced runs for performance
      );
    });

    test('should export all whiteboard elements in PNG format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            elements: fc.array(
              fc.record({
                id: fc.uuid(),
                type: fc.constantFrom('drawing', 'text', 'shape'),
                data: fc.record({
                  content: fc.string({ minLength: 1, maxLength: 50 })
                }),
                position: fc.record({
                  x: fc.integer({ min: 0, max: 1000 }),
                  y: fc.integer({ min: 0, max: 1000 })
                })
              }),
              { minLength: 1, maxLength: 5 }
            ),
            width: fc.integer({ min: 800, max: 1920 }),
            height: fc.integer({ min: 600, max: 1080 })
          }),
          async ({ elements, width, height }) => {
            // Mock existing whiteboard with elements
            const mockWhiteboard = {
              id: testWhiteboardId,
              user_id: testUserId,
              name: 'Test Whiteboard',
              canvas_data: JSON.stringify({
                elements: elements,
                version: 1,
                background: '#ffffff'
              }),
              created_at: new Date(),
              updated_at: new Date()
            };

            // Mock getWhiteboardById call
            mockQuery.mockResolvedValueOnce({
              rows: [mockWhiteboard],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Export whiteboard as PNG
            const exportResult = await whiteboardService.exportWhiteboard(
              testUserId,
              testWhiteboardId,
              'png',
              { width, height }
            );

            // Verify export result
            expect(exportResult).toBeDefined();
            expect(exportResult!.mimeType).toBe('image/png');
            expect(exportResult!.data).toBeDefined();

            // For PNG (placeholder implementation), verify metadata
            const pngData = exportResult!.data;
            expect(pngData).toBeTruthy();
            expect(typeof pngData).toBe('string');

            // Decode the base64 placeholder to verify it contains element information
            const decodedData = JSON.parse(Buffer.from(pngData, 'base64').toString());
            expect(decodedData.width).toBe(width);
            expect(decodedData.height).toBe(height);
            expect(decodedData.elementCount).toBe(elements.length);
            expect(decodedData.timestamp).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should handle empty whiteboards', async () => {
      // Mock empty whiteboard
      const mockWhiteboard = {
        id: testWhiteboardId,
        user_id: testUserId,
        name: 'Empty Whiteboard',
        canvas_data: JSON.stringify({
          elements: [],
          version: 1,
          background: '#ffffff'
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock getWhiteboardById call
      mockQuery.mockResolvedValueOnce({
        rows: [mockWhiteboard],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Export empty whiteboard as SVG
      const exportResult = await whiteboardService.exportWhiteboard(
        testUserId,
        testWhiteboardId,
        'svg',
        { width: 800, height: 600 }
      );

      // Verify export result
      expect(exportResult).toBeDefined();
      expect(exportResult!.mimeType).toBe('image/svg+xml');
      
      const svgContent = exportResult!.data;
      expect(svgContent).toContain('<svg');
      expect(svgContent).toContain('width="800"');
      expect(svgContent).toContain('height="600"');
      expect(svgContent).toContain('fill="#ffffff"'); // Background
      expect(svgContent).toContain('</svg>');
      
      // Should not contain any element-specific tags
      expect(svgContent).not.toContain('<text');
      expect(svgContent).not.toContain('<rect');
      expect(svgContent).not.toContain('<circle');
      expect(svgContent).not.toContain('<path');
    });

    test('should return null for non-existent whiteboard', async () => {
      // Mock whiteboard not found
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const exportResult = await whiteboardService.exportWhiteboard(
        testUserId,
        'non-existent-whiteboard',
        'svg'
      );

      expect(exportResult).toBeNull();
    });

    test('should handle complex elements with special characters', async () => {
      const complexElements = [
        {
          id: 'text-element',
          type: 'text',
          data: {
            content: 'Hello & <World> "Test" \'Quote\'',
            style: { color: '#ff0000', size: 24 }
          },
          position: { x: 100, y: 100 }
        },
        {
          id: 'shape-element',
          type: 'shape',
          data: {
            shapeType: 'polygon',
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 0 },
              { x: 25, y: 50 }
            ],
            style: { fillColor: '#00ff00', strokeColor: '#0000ff' }
          },
          position: { x: 200, y: 200 }
        }
      ];

      // Mock whiteboard with complex elements
      const mockWhiteboard = {
        id: testWhiteboardId,
        user_id: testUserId,
        name: 'Complex Whiteboard',
        canvas_data: JSON.stringify({
          elements: complexElements,
          version: 1,
          background: '#f0f0f0'
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock getWhiteboardById call
      mockQuery.mockResolvedValueOnce({
        rows: [mockWhiteboard],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Export whiteboard as SVG
      const exportResult = await whiteboardService.exportWhiteboard(
        testUserId,
        testWhiteboardId,
        'svg'
      );

      // Verify export result
      expect(exportResult).toBeDefined();
      const svgContent = exportResult!.data;

      // Verify special characters are properly escaped
      expect(svgContent).toContain('Hello &amp; &lt;World&gt; &quot;Test&quot; &#39;Quote&#39;');
      
      // Verify polygon points are included
      expect(svgContent).toContain('<polygon');
      expect(svgContent).toContain('points="200,200 250,200 225,250"');
      
      // Verify colors are preserved
      expect(svgContent).toContain('#ff0000'); // Text color
      expect(svgContent).toContain('#00ff00'); // Fill color
      expect(svgContent).toContain('#0000ff'); // Stroke color
    });

    test('should use default dimensions when not specified', async () => {
      // Mock whiteboard
      const mockWhiteboard = {
        id: testWhiteboardId,
        user_id: testUserId,
        name: 'Test Whiteboard',
        canvas_data: JSON.stringify({
          elements: [],
          version: 1,
          background: '#ffffff'
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock getWhiteboardById call
      mockQuery.mockResolvedValueOnce({
        rows: [mockWhiteboard],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Export without specifying dimensions
      const exportResult = await whiteboardService.exportWhiteboard(
        testUserId,
        testWhiteboardId,
        'svg'
      );

      // Verify default dimensions are used
      expect(exportResult).toBeDefined();
      const svgContent = exportResult!.data;
      expect(svgContent).toContain('width="1920"'); // Default width
      expect(svgContent).toContain('height="1080"'); // Default height
    });
  });

  /**
   * Property 35: Version history enables restoration
   * Validates: Requirements 7.5
   * 
   * For any whiteboard with multiple versions, users should be able to view
   * previous versions and restore the whiteboard to any earlier state.
   */
  describe('Property 35: Version history enables restoration', () => {
    test('should create and restore whiteboard versions correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              elements: fc.array(
                fc.record({
                  id: fc.uuid(),
                  type: fc.constantFrom('drawing', 'text', 'shape'),
                  data: fc.record({
                    content: fc.string({ minLength: 1, maxLength: 50 })
                  }),
                  position: fc.record({
                    x: fc.integer({ min: 0, max: 1000 }),
                    y: fc.integer({ min: 0, max: 1000 })
                  })
                }),
                { minLength: 0, maxLength: 5 }
              ),
              version: fc.integer({ min: 1, max: 10 }),
              background: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`)
            }),
            { minLength: 2, maxLength: 5 } // At least 2 versions to test restoration
          ),
          async (versions) => {
            // Mock whiteboard exists
            const mockWhiteboard = {
              id: testWhiteboardId,
              user_id: testUserId,
              name: 'Test Whiteboard',
              canvas_data: JSON.stringify(versions[versions.length - 1]), // Latest version
              created_at: new Date(),
              updated_at: new Date()
            };

            // Mock getWhiteboardById calls (will be called multiple times)
            for (let i = 0; i < versions.length + 2; i++) {
              mockQuery.mockResolvedValueOnce({
                rows: [mockWhiteboard],
                command: 'SELECT',
                rowCount: 1,
                oid: 0,
                fields: []
              });
            }

            // Mock version creation queries
            versions.forEach((version, index) => {
              // Mock max version query
              mockQuery.mockResolvedValueOnce({
                rows: [{ max_version: index }],
                command: 'SELECT',
                rowCount: 1,
                oid: 0,
                fields: []
              });

              // Mock version insert
              mockQuery.mockResolvedValueOnce({
                rows: [{
                  id: `version-${index + 1}`,
                  whiteboard_id: testWhiteboardId,
                  version_number: index + 1,
                  canvas_data: JSON.stringify(version),
                  created_by: testUserId,
                  created_at: new Date()
                }],
                command: 'INSERT',
                rowCount: 1,
                oid: 0,
                fields: []
              });
            });

            // Create versions
            const createdVersions = [];
            for (let i = 0; i < versions.length; i++) {
              const version = await whiteboardService.createWhiteboardVersion(
                testUserId,
                testWhiteboardId,
                versions[i]
              );
              createdVersions.push(version);
            }

            // Verify all versions were created
            expect(createdVersions).toHaveLength(versions.length);
            createdVersions.forEach((version, index) => {
              expect(version.version_number).toBe(index + 1);
              expect(version.whiteboard_id).toBe(testWhiteboardId);
              expect(version.created_by).toBe(testUserId);
            });

            // Test restoration to a previous version
            const targetVersionNumber = Math.floor(versions.length / 2) + 1; // Middle version
            const targetVersion = versions[targetVersionNumber - 1];

            // Mock version retrieval for restoration
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: `version-${targetVersionNumber}`,
                whiteboard_id: testWhiteboardId,
                version_number: targetVersionNumber,
                canvas_data: JSON.stringify(targetVersion),
                created_by: testUserId,
                created_at: new Date()
              }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Mock creating backup version before restoration
            mockQuery.mockResolvedValueOnce({
              rows: [{ max_version: versions.length }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: `version-${versions.length + 1}`,
                whiteboard_id: testWhiteboardId,
                version_number: versions.length + 1,
                canvas_data: JSON.stringify(versions[versions.length - 1]),
                created_by: testUserId,
                created_at: new Date()
              }],
              command: 'INSERT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Mock whiteboard update
            const restoredCanvasData = {
              ...targetVersion,
              version: (versions[versions.length - 1].version || 1) + 1,
              lastModified: expect.any(String),
              restoredFrom: targetVersionNumber
            };

            const restoredWhiteboard = {
              ...mockWhiteboard,
              canvas_data: JSON.stringify(restoredCanvasData),
              updated_at: new Date()
            };

            mockQuery.mockResolvedValueOnce({
              rows: [restoredWhiteboard],
              command: 'UPDATE',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Restore to target version
            const restored = await whiteboardService.restoreWhiteboardVersion(
              testUserId,
              testWhiteboardId,
              targetVersionNumber
            );

            // Verify restoration
            expect(restored).toBeDefined();
            expect(restored!.id).toBe(testWhiteboardId);

            const restoredData = JSON.parse(restored!.canvas_data as any);
            expect(restoredData.elements).toEqual(targetVersion.elements);
            expect(restoredData.background).toBe(targetVersion.background);
            expect(restoredData.restoredFrom).toBe(targetVersionNumber);
            expect(restoredData.lastModified).toBeDefined();
          }
        ),
        { numRuns: 20 } // Reduced runs due to complexity
      );
    });

    test('should retrieve version history with pagination', async () => {
      const mockVersions = Array.from({ length: 15 }, (_, i) => ({
        id: `version-${i + 1}`,
        whiteboard_id: testWhiteboardId,
        version_number: i + 1,
        canvas_data: JSON.stringify({ elements: [], version: i + 1 }),
        created_by: testUserId,
        created_at: new Date(Date.now() - (15 - i) * 60000) // Spread over time
      }));

      // Mock whiteboard access check
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: testWhiteboardId,
          user_id: testUserId,
          name: 'Test Whiteboard',
          canvas_data: '{}',
          created_at: new Date(),
          updated_at: new Date()
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock count query
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '15' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock versions query (first page, 10 items)
      const firstPageVersions = mockVersions.slice(0, 10).reverse(); // DESC order
      mockQuery.mockResolvedValueOnce({
        rows: firstPageVersions,
        command: 'SELECT',
        rowCount: firstPageVersions.length,
        oid: 0,
        fields: []
      });

      // Get first page of history
      const history = await whiteboardService.getWhiteboardHistory(
        testUserId,
        testWhiteboardId,
        { page: 1, limit: 10 }
      );

      // Verify pagination results
      expect(history.versions).toHaveLength(10);
      expect(history.total).toBe(15);
      expect(history.page).toBe(1);
      expect(history.limit).toBe(10);

      // Verify versions are in descending order
      for (let i = 0; i < history.versions.length - 1; i++) {
        expect(history.versions[i].version_number).toBeGreaterThan(
          history.versions[i + 1].version_number
        );
      }

      // Verify latest version is first
      expect(history.versions[0].version_number).toBe(15);
    });

    test('should handle auto-save version creation', async () => {
      const mockWhiteboard = {
        id: testWhiteboardId,
        user_id: testUserId,
        name: 'Test Whiteboard',
        canvas_data: JSON.stringify({
          elements: [{ id: 'test', type: 'text', data: { content: 'test' } }],
          version: 1
        }),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock getWhiteboardById
      mockQuery.mockResolvedValueOnce({
        rows: [mockWhiteboard],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock last version query (no previous versions)
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      // Mock version creation
      mockQuery.mockResolvedValueOnce({
        rows: [{ max_version: 0 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'auto-version-1',
          whiteboard_id: testWhiteboardId,
          version_number: 1,
          canvas_data: mockWhiteboard.canvas_data,
          created_by: testUserId,
          created_at: new Date()
        }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Test auto-save
      const autoSavedVersion = await whiteboardService.autoSaveWhiteboardVersion(
        testUserId,
        testWhiteboardId
      );

      // Verify auto-save created a version
      expect(autoSavedVersion).toBeDefined();
      expect(autoSavedVersion.version_number).toBe(1);
      expect(autoSavedVersion.whiteboard_id).toBe(testWhiteboardId);
    });

    test('should not auto-save if recent version exists', async () => {
      const mockWhiteboard = {
        id: testWhiteboardId,
        user_id: testUserId,
        name: 'Test Whiteboard',
        canvas_data: JSON.stringify({ elements: [], version: 1 }),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock getWhiteboardById
      mockQuery.mockResolvedValueOnce({
        rows: [mockWhiteboard],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock recent version exists (created 1 minute ago)
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'recent-version',
          whiteboard_id: testWhiteboardId,
          version_number: 1,
          created_at: new Date(Date.now() - 60000) // 1 minute ago
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Test auto-save
      const autoSavedVersion = await whiteboardService.autoSaveWhiteboardVersion(
        testUserId,
        testWhiteboardId
      );

      // Verify no version was created
      expect(autoSavedVersion).toBeNull();
    });

    test('should return null for non-existent whiteboard in version operations', async () => {
      // Mock whiteboard not found
      mockQuery.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: []
      });

      const restored = await whiteboardService.restoreWhiteboardVersion(
        testUserId,
        'non-existent-whiteboard',
        1
      );

      expect(restored).toBeNull();
    });

    test('should handle version restoration with complex canvas data', async () => {
      const complexCanvasData = {
        elements: [
          {
            id: 'complex-element',
            type: 'shape',
            data: {
              shapeType: 'polygon',
              points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 100 }],
              style: { fillColor: '#ff0000', strokeColor: '#000000' }
            },
            position: { x: 200, y: 300 }
          }
        ],
        version: 5,
        background: '#f0f0f0',
        metadata: {
          author: testUserId,
          tags: ['important', 'geometry']
        }
      };

      const mockWhiteboard = {
        id: testWhiteboardId,
        user_id: testUserId,
        name: 'Complex Whiteboard',
        canvas_data: JSON.stringify({ elements: [], version: 6 }),
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock whiteboard access
      mockQuery.mockResolvedValueOnce({
        rows: [mockWhiteboard],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock version retrieval
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'complex-version',
          whiteboard_id: testWhiteboardId,
          version_number: 5,
          canvas_data: JSON.stringify(complexCanvasData),
          created_by: testUserId,
          created_at: new Date()
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock backup version creation
      mockQuery.mockResolvedValueOnce({
        rows: [{ max_version: 6 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'backup-version',
          whiteboard_id: testWhiteboardId,
          version_number: 7,
          canvas_data: mockWhiteboard.canvas_data,
          created_by: testUserId,
          created_at: new Date()
        }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Mock whiteboard update
      const expectedCanvasData = {
        ...complexCanvasData,
        version: 7,
        lastModified: expect.any(String),
        restoredFrom: 5
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{
          ...mockWhiteboard,
          canvas_data: JSON.stringify(expectedCanvasData),
          updated_at: new Date()
        }],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Restore complex version
      const restored = await whiteboardService.restoreWhiteboardVersion(
        testUserId,
        testWhiteboardId,
        5
      );

      // Verify complex data is preserved
      expect(restored).toBeDefined();
      const restoredData = JSON.parse(restored!.canvas_data as any);
      
      expect(restoredData.elements).toHaveLength(1);
      expect(restoredData.elements[0].data.shapeType).toBe('polygon');
      expect(restoredData.elements[0].data.points).toHaveLength(3);
      expect(restoredData.background).toBe('#f0f0f0');
      expect(restoredData.metadata.tags).toEqual(['important', 'geometry']);
      expect(restoredData.restoredFrom).toBe(5);
    });
  });
});