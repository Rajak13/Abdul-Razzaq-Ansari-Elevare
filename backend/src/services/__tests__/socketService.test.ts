import { Server as HTTPServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import * as fc from 'fast-check';
import jwt from 'jsonwebtoken';
import { SocketService, initializeSocketService } from '../socketService';
import config from '../../config';
import { query } from '../../db/connection';

// Mock dependencies
jest.mock('../../db/connection');
jest.mock('../../utils/logger');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('SocketService - Real-Time Messaging', () => {
  let httpServer: HTTPServer;
  let socketService: SocketService;
  let clientSocket: ClientSocket;
  let testUserId: string;
  let testToken: string;

  beforeAll((done) => {
    // Create HTTP server
    httpServer = require('http').createServer();
    
    // Initialize socket service
    socketService = initializeSocketService(httpServer);
    
    // Start server
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      
      // Create test user and token
      testUserId = 'test-user-123';
      testToken = jwt.sign({ userId: testUserId }, config.jwtSecret);
      
      // Mock database query for user authentication
      mockQuery.mockResolvedValue({
        rows: [{
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });
      
      // Connect client
      clientSocket = ioClient(`http://localhost:${port}`, {
        auth: { token: testToken },
        transports: ['websocket']
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll((done) => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (httpServer) {
      httpServer.close(done);
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 53: Real-time notifications are delivered
   * Validates: Requirements 12.2
   * 
   * For any notification sent to a user, the notification should be delivered
   * in real-time to all connected clients for that user.
   */
  describe('Property 53: Real-time notifications are delivered', () => {
    test('should deliver notifications to connected users in real-time', (done) => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('task_deadline', 'group_message', 'join_approved', 'mention'),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            message: fc.string({ minLength: 1, maxLength: 500 }),
            timestamp: fc.date().map(d => d.toISOString())
          }),
          async (notification) => {
            return new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Notification not received within timeout'));
              }, 1000);

              // Listen for notification
              clientSocket.once('notification', (receivedNotification: any) => {
                clearTimeout(timeout);
                
                try {
                  // Verify notification was delivered
                  expect(receivedNotification).toBeDefined();
                  expect(receivedNotification.id).toBe(notification.id);
                  expect(receivedNotification.type).toBe(notification.type);
                  expect(receivedNotification.title).toBe(notification.title);
                  expect(receivedNotification.message).toBe(notification.message);
                  
                  resolve();
                } catch (error) {
                  reject(error);
                }
              });

              // Send notification
              socketService.sendNotification(testUserId, notification);
            });
          }
        ),
        { numRuns: 100 }
      );
      
      done();
    }, 30000);

    test('should deliver notifications only to the intended user', async () => {
      const notification = {
        id: 'notif-123',
        type: 'task_deadline',
        title: 'Task Due Soon',
        message: 'Your task is due in 1 hour',
        timestamp: new Date().toISOString()
      };

      // Create a second user and client
      const otherUserId = 'other-user-456';
      const otherToken = jwt.sign({ userId: otherUserId }, config.jwtSecret);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: otherUserId,
          name: 'Other User',
          email: 'other@example.com'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const port = (httpServer.address() as any).port;
      const otherClient = ioClient(`http://localhost:${port}`, {
        auth: { token: otherToken },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        otherClient.on('connect', resolve);
      });

      // Set up listeners
      let testUserReceived = false;
      let otherUserReceived = false;

      clientSocket.once('notification', () => {
        testUserReceived = true;
      });

      otherClient.once('notification', () => {
        otherUserReceived = true;
      });

      // Send notification to test user only
      socketService.sendNotification(testUserId, notification);

      // Wait a bit to ensure delivery
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify only test user received the notification
      expect(testUserReceived).toBe(true);
      expect(otherUserReceived).toBe(false);

      otherClient.disconnect();
    });

    test('should handle multiple concurrent notifications', async () => {
      const notifications = Array.from({ length: 10 }, (_, i) => ({
        id: `notif-${i}`,
        type: 'task_deadline',
        title: `Notification ${i}`,
        message: `Message ${i}`,
        timestamp: new Date().toISOString()
      }));

      const receivedNotifications: any[] = [];

      // Listen for all notifications
      clientSocket.on('notification', (notification: any) => {
        receivedNotifications.push(notification);
      });

      // Send all notifications
      notifications.forEach(notification => {
        socketService.sendNotification(testUserId, notification);
      });

      // Wait for all notifications to be received
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify all notifications were received
      expect(receivedNotifications.length).toBe(notifications.length);
      
      // Verify each notification was received correctly
      notifications.forEach(notification => {
        const received = receivedNotifications.find(n => n.id === notification.id);
        expect(received).toBeDefined();
        expect(received.title).toBe(notification.title);
        expect(received.message).toBe(notification.message);
      });

      // Clean up listener
      clientSocket.off('notification');
    });
  });

  /**
   * Additional test: Verify message broadcasting to group members
   */
  describe('Message Broadcasting', () => {
    test('should broadcast messages to all group members', async () => {
      const groupId = 'group-123';
      const message = {
        id: 'msg-123',
        groupId,
        userId: testUserId,
        content: 'Hello group!',
        timestamp: new Date().toISOString()
      };

      // Mock group membership check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Join group
      await new Promise<void>((resolve) => {
        clientSocket.once('joined_group', () => resolve());
        clientSocket.emit('join_group', groupId);
      });

      // Listen for message
      const messagePromise = new Promise<void>((resolve) => {
        clientSocket.once('new_message', (receivedMessage: any) => {
          expect(receivedMessage.id).toBe(message.id);
          expect(receivedMessage.content).toBe(message.content);
          resolve();
        });
      });

      // Broadcast message
      socketService.broadcastMessage(groupId, message);

      await messagePromise;
    });
  });

  /**
   * Property 31: Drawing actions are broadcast
   * Validates: Requirements 7.1
   * 
   * For any drawing action on the whiteboard, the action should be broadcast
   * to all connected users within 100ms.
   */
  describe('Property 31: Drawing actions are broadcast', () => {
    test('should broadcast drawing actions to all whiteboard participants', (done) => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            whiteboardId: fc.uuid(),
            x: fc.integer({ min: 0, max: 1920 }),
            y: fc.integer({ min: 0, max: 1080 }),
            tool: fc.constantFrom('pen', 'brush', 'eraser', 'line', 'rectangle', 'circle'),
            color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
            size: fc.integer({ min: 1, max: 50 })
          }),
          async (drawingData) => {
            // Mock whiteboard access check
            mockQuery.mockResolvedValueOnce({
              rows: [{ id: drawingData.whiteboardId }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Join whiteboard
            await new Promise<void>((resolve) => {
              clientSocket.once('whiteboard_joined', () => resolve());
              clientSocket.emit('whiteboard_join', drawingData.whiteboardId);
            });

            return new Promise<void>((resolve, reject) => {
              const startTime = Date.now();
              const timeout = setTimeout(() => {
                reject(new Error('Drawing action not received within 100ms'));
              }, 100);

              // Listen for drawing action
              clientSocket.once('draw_start', (receivedData: any) => {
                const endTime = Date.now();
                const latency = endTime - startTime;
                
                clearTimeout(timeout);
                
                try {
                  // Verify drawing action was broadcast
                  expect(receivedData).toBeDefined();
                  expect(receivedData.whiteboardId).toBe(drawingData.whiteboardId);
                  expect(receivedData.x).toBe(drawingData.x);
                  expect(receivedData.y).toBe(drawingData.y);
                  expect(receivedData.tool).toBe(drawingData.tool);
                  expect(receivedData.color).toBe(drawingData.color);
                  expect(receivedData.size).toBe(drawingData.size);
                  expect(receivedData.userId).toBe(testUserId);
                  expect(receivedData.timestamp).toBeDefined();
                  
                  // Verify latency is under 100ms
                  expect(latency).toBeLessThan(100);
                  
                  resolve();
                } catch (error) {
                  reject(error);
                }
              });

              // Emit drawing action
              setTimeout(() => {
                socketService.broadcastDrawingAction(drawingData.whiteboardId, 'draw_start', {
                  ...drawingData,
                  userId: testUserId
                });
              }, 10);
            });
          }
        ),
        { numRuns: 100 }
      );
      
      done();
    }, 30000);

    test('should broadcast draw_move and draw_end events', async () => {
      const whiteboardId = 'whiteboard-456';
      
      // Mock whiteboard access
      mockQuery.mockResolvedValue({
        rows: [{ id: whiteboardId }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Join whiteboard
      await new Promise<void>((resolve) => {
        clientSocket.once('whiteboard_joined', () => resolve());
        clientSocket.emit('whiteboard_join', whiteboardId);
      });

      // Test draw_move event
      const movePromise = new Promise<void>((resolve) => {
        clientSocket.once('draw_move', (data: any) => {
          expect(data.whiteboardId).toBe(whiteboardId);
          expect(data.x).toBe(100);
          expect(data.y).toBe(200);
          expect(data.userId).toBe(testUserId);
          resolve();
        });
      });

      socketService.broadcastDrawingAction(whiteboardId, 'draw_move', {
        whiteboardId,
        x: 100,
        y: 200,
        userId: testUserId
      });

      await movePromise;

      // Test draw_end event
      const endPromise = new Promise<void>((resolve) => {
        clientSocket.once('draw_end', (data: any) => {
          expect(data.whiteboardId).toBe(whiteboardId);
          expect(data.userId).toBe(testUserId);
          resolve();
        });
      });

      socketService.broadcastDrawingAction(whiteboardId, 'draw_end', {
        whiteboardId,
        userId: testUserId
      });

      await endPromise;
    });

    test('should broadcast element manipulation events', async () => {
      const whiteboardId = 'whiteboard-789';
      
      // Mock whiteboard access
      mockQuery.mockResolvedValue({
        rows: [{ id: whiteboardId }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Join whiteboard
      await new Promise<void>((resolve) => {
        clientSocket.once('whiteboard_joined', () => resolve());
        clientSocket.emit('whiteboard_join', whiteboardId);
      });

      const element = {
        id: 'element-123',
        type: 'rectangle',
        x: 50,
        y: 75,
        width: 100,
        height: 50,
        color: '#ff0000'
      };

      // Test add_element event
      const addPromise = new Promise<void>((resolve) => {
        clientSocket.once('add_element', (data: any) => {
          expect(data.whiteboardId).toBe(whiteboardId);
          expect(data.element).toEqual(element);
          expect(data.userId).toBe(testUserId);
          resolve();
        });
      });

      socketService.broadcastElementUpdate(whiteboardId, 'add_element', {
        whiteboardId,
        element,
        userId: testUserId
      });

      await addPromise;

      // Test update_element event
      const updatePromise = new Promise<void>((resolve) => {
        clientSocket.once('update_element', (data: any) => {
          expect(data.whiteboardId).toBe(whiteboardId);
          expect(data.elementId).toBe(element.id);
          expect(data.updates.color).toBe('#00ff00');
          resolve();
        });
      });

      socketService.broadcastElementUpdate(whiteboardId, 'update_element', {
        whiteboardId,
        elementId: element.id,
        updates: { color: '#00ff00' },
        userId: testUserId
      });

      await updatePromise;

      // Test delete_element event
      const deletePromise = new Promise<void>((resolve) => {
        clientSocket.once('delete_element', (data: any) => {
          expect(data.whiteboardId).toBe(whiteboardId);
          expect(data.elementId).toBe(element.id);
          resolve();
        });
      });

      socketService.broadcastElementUpdate(whiteboardId, 'delete_element', {
        whiteboardId,
        elementId: element.id,
        userId: testUserId
      });

      await deletePromise;
    });
  });

  /**
   * Property 32: Concurrent operations are synchronized
   * Validates: Requirements 7.2
   * 
   * For any set of concurrent drawing operations from multiple users,
   * all operations should be applied in a consistent order across all clients.
   */
  describe('Property 32: Concurrent operations are synchronized', () => {
    test('should synchronize concurrent drawing operations', (done) => {
      fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              action: fc.constantFrom('draw_start', 'draw_move', 'draw_end', 'add_element'),
              whiteboardId: fc.constant('sync-test-whiteboard'),
              x: fc.integer({ min: 0, max: 1000 }),
              y: fc.integer({ min: 0, max: 1000 }),
              timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 })
            }),
            { minLength: 5, maxLength: 20 }
          ),
          async (operations) => {
            const whiteboardId = 'sync-test-whiteboard';
            
            // Mock whiteboard access
            mockQuery.mockResolvedValue({
              rows: [{ id: whiteboardId }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Join whiteboard
            await new Promise<void>((resolve) => {
              clientSocket.once('whiteboard_joined', () => resolve());
              clientSocket.emit('whiteboard_join', whiteboardId);
            });

            const receivedOperations: any[] = [];
            const expectedCount = operations.length;

            return new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error(`Only received ${receivedOperations.length}/${expectedCount} operations`));
              }, 2000);

              // Listen for all operation types
              const handleOperation = (data: any) => {
                receivedOperations.push({
                  ...data,
                  receivedAt: Date.now()
                });

                if (receivedOperations.length === expectedCount) {
                  clearTimeout(timeout);
                  
                  try {
                    // Verify all operations were received
                    expect(receivedOperations.length).toBe(expectedCount);
                    
                    // Verify operations maintain consistent ordering
                    // Operations should be received in the order they were sent
                    for (let i = 0; i < receivedOperations.length - 1; i++) {
                      expect(receivedOperations[i].receivedAt).toBeLessThanOrEqual(
                        receivedOperations[i + 1].receivedAt
                      );
                    }
                    
                    // Verify each operation has required fields
                    receivedOperations.forEach((op, index) => {
                      expect(op.whiteboardId).toBe(whiteboardId);
                      expect(op.userId).toBe(testUserId);
                      expect(op.timestamp).toBeDefined();
                      
                      // Verify operation data matches what was sent
                      const originalOp = operations[index];
                      expect(op.x).toBe(originalOp.x);
                      expect(op.y).toBe(originalOp.y);
                    });
                    
                    resolve();
                  } catch (error) {
                    reject(error);
                  }
                }
              };

              clientSocket.on('draw_start', handleOperation);
              clientSocket.on('draw_move', handleOperation);
              clientSocket.on('draw_end', handleOperation);
              clientSocket.on('add_element', handleOperation);

              // Send all operations with small delays to simulate concurrency
              operations.forEach((operation, index) => {
                setTimeout(() => {
                  socketService.broadcastDrawingAction(whiteboardId, operation.action, {
                    ...operation,
                    userId: testUserId
                  });
                }, index * 10); // 10ms between operations
              });
            });
          }
        ),
        { numRuns: 50 } // Reduced runs for performance
      );
      
      done();
    }, 60000);

    test('should handle multiple users drawing simultaneously', async () => {
      const whiteboardId = 'multi-user-whiteboard';
      
      // Mock whiteboard access
      mockQuery.mockResolvedValue({
        rows: [{ id: whiteboardId }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Create second user and client
      const user2Id = 'user-2';
      const user2Token = jwt.sign({ userId: user2Id }, config.jwtSecret);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: user2Id,
          name: 'User 2',
          email: 'user2@example.com'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const port = (httpServer.address() as any).port;
      const client2 = ioClient(`http://localhost:${port}`, {
        auth: { token: user2Token },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client2.on('connect', resolve);
      });

      // Both users join whiteboard
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket.once('whiteboard_joined', () => resolve());
          clientSocket.emit('whiteboard_join', whiteboardId);
        }),
        new Promise<void>((resolve) => {
          client2.once('whiteboard_joined', () => resolve());
          client2.emit('whiteboard_join', whiteboardId);
        })
      ]);

      const receivedByUser1: any[] = [];
      const receivedByUser2: any[] = [];

      // Set up listeners
      clientSocket.on('draw_start', (data: any) => receivedByUser1.push(data));
      client2.on('draw_start', (data: any) => receivedByUser2.push(data));

      // Simulate concurrent drawing from both users
      const operations = [
        { userId: testUserId, x: 100, y: 100 },
        { userId: user2Id, x: 200, y: 200 },
        { userId: testUserId, x: 150, y: 150 },
        { userId: user2Id, x: 250, y: 250 }
      ];

      // Send operations simultaneously
      operations.forEach((op, index) => {
        setTimeout(() => {
          socketService.broadcastDrawingAction(whiteboardId, 'draw_start', {
            whiteboardId,
            x: op.x,
            y: op.y,
            tool: 'pen',
            color: '#000000',
            size: 5,
            userId: op.userId
          });
        }, index * 5);
      });

      // Wait for all operations to be received
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify both users received operations from the other user
      const user1ReceivedFromUser2 = receivedByUser1.filter(op => op.userId === user2Id);
      const user2ReceivedFromUser1 = receivedByUser2.filter(op => op.userId === testUserId);

      expect(user1ReceivedFromUser2.length).toBe(2); // User 1 should receive User 2's operations
      expect(user2ReceivedFromUser1.length).toBe(2); // User 2 should receive User 1's operations

      // Verify operation data integrity
      user1ReceivedFromUser2.forEach(op => {
        expect(op.userId).toBe(user2Id);
        expect(op.whiteboardId).toBe(whiteboardId);
        expect(op.timestamp).toBeDefined();
      });

      user2ReceivedFromUser1.forEach(op => {
        expect(op.userId).toBe(testUserId);
        expect(op.whiteboardId).toBe(whiteboardId);
        expect(op.timestamp).toBeDefined();
      });

      client2.disconnect();
    });
  });

  /**
   * Property 30: Breakout rooms split participants correctly
   * Validates: Requirements 6.4
   * 
   * For any breakout room creation, participants should be assigned to rooms
   * according to the host's configuration and able to communicate only within their room.
   */
  describe('Property 30: Breakout rooms split participants correctly', () => {
    test('should split participants into breakout rooms correctly', (done) => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            callId: fc.uuid(),
            roomName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            participants: fc.array(fc.uuid(), { minLength: 1, maxLength: 3 })
          }),
          async (breakoutData) => {
            // Mock group membership check
            mockQuery.mockResolvedValue({
              rows: [{ id: 'membership-123' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Create second user to observe breakout room creation
            const user2Id = 'user-2-breakout-observer';
            const user2Token = jwt.sign({ userId: user2Id }, config.jwtSecret);
            
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: user2Id,
                name: 'User 2',
                email: 'user2@example.com'
              }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            const port = (httpServer.address() as any).port;
            const client2 = ioClient(`http://localhost:${port}`, {
              auth: { token: user2Token },
              transports: ['websocket']
            });

            await new Promise<void>((resolve) => {
              client2.on('connect', resolve);
            });

            return new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                client2.disconnect();
                reject(new Error('Breakout room creation not completed within timeout'));
              }, 2000);

              // Both users join the call
              Promise.all([
                new Promise<void>((resolveJoin) => {
                  clientSocket.once('call_joined', () => resolveJoin());
                  clientSocket.emit('join_call', { 
                    callId: breakoutData.callId, 
                    groupId: 'test-group' 
                  });
                }),
                new Promise<void>((resolveJoin) => {
                  client2.once('call_joined', () => resolveJoin());
                  client2.emit('join_call', { 
                    callId: breakoutData.callId, 
                    groupId: 'test-group' 
                  });
                })
              ]).then(() => {
                // Listen for breakout room creation notification on second client
                client2.once('breakout_room_created', (data: any) => {
                  clearTimeout(timeout);
                  
                  try {
                    expect(data.callId).toBe(breakoutData.callId);
                    expect(data.roomName).toBe(breakoutData.roomName);
                    expect(data.participants).toEqual(breakoutData.participants);
                    expect(data.createdBy).toBe(testUserId);
                    expect(data.breakoutRoomId).toBeDefined();
                    expect(data.breakoutRoomId).toContain(breakoutData.callId);
                    client2.disconnect();
                    resolve();
                  } catch (error) {
                    client2.disconnect();
                    reject(error);
                  }
                });

                // Create breakout room
                setTimeout(() => {
                  clientSocket.emit('create_breakout_room', {
                    callId: breakoutData.callId,
                    roomName: breakoutData.roomName,
                    participants: breakoutData.participants
                  });
                }, 10);
              }).catch((error) => {
                clearTimeout(timeout);
                client2.disconnect();
                reject(error);
              });
            });
          }
        ),
        { numRuns: 50 } // Reduced runs for performance
      );
      
      done();
    }, 30000);

    test('should move participants to breakout rooms and isolate communication', async () => {
      const callId = 'breakout-isolation-test';
      const roomName = 'Test Breakout Room';
      const participants = ['user-2-breakout', 'user-3-breakout'];

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Create multiple users and clients
      const clients: any[] = [];
      for (const userId of participants) {
        const token = jwt.sign({ userId }, config.jwtSecret);
        
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: userId,
            name: `User ${userId}`,
            email: `${userId}@example.com`
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

        const port = (httpServer.address() as any).port;
        const client = ioClient(`http://localhost:${port}`, {
          auth: { token },
          transports: ['websocket']
        });

        await new Promise<void>((resolve) => {
          client.on('connect', resolve);
        });

        clients.push({ client, userId });
      }

      // All users join main call
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket.once('call_joined', () => resolve());
          clientSocket.emit('join_call', { callId, groupId: 'test-group' });
        }),
        ...clients.map(({ client }) => 
          new Promise<void>((resolve) => {
            client.once('call_joined', () => resolve());
            client.emit('join_call', { callId, groupId: 'test-group' });
          })
        )
      ]);

      // Set up listeners for breakout room notifications
      const breakoutPromises = clients.map(({ client, userId }) => 
        new Promise<void>((resolve) => {
          client.once('moved_to_breakout', (data: any) => {
            expect(data.callId).toBe(callId);
            expect(data.roomName).toBe(roomName);
            expect(data.participants).toContain(userId);
            resolve();
          });
        })
      );

      // Create breakout room
      clientSocket.emit('create_breakout_room', {
        callId,
        roomName,
        participants
      });

      // Wait for all participants to be moved
      await Promise.all(breakoutPromises);

      // Clean up clients
      clients.forEach(({ client }) => client.disconnect());
    });

    test('should allow participants to return to main room', async () => {
      const callId = 'return-main-test';
      const participantId = 'user-return-test';

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Create participant client
      const participantToken = jwt.sign({ userId: participantId }, config.jwtSecret);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: participantId,
          name: 'Return Test User',
          email: 'return@example.com'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const port = (httpServer.address() as any).port;
      const participantClient = ioClient(`http://localhost:${port}`, {
        auth: { token: participantToken },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        participantClient.on('connect', resolve);
      });

      // Both users join main call
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket.once('call_joined', () => resolve());
          clientSocket.emit('join_call', { callId, groupId: 'test-group' });
        }),
        new Promise<void>((resolve) => {
          participantClient.once('call_joined', () => resolve());
          participantClient.emit('join_call', { callId, groupId: 'test-group' });
        })
      ]);

      // Create breakout room
      const breakoutRoomId = `${callId}_breakout_${Date.now()}`;
      
      // Set up listener for return notification on main room
      const returnPromise = new Promise<void>((resolve) => {
        clientSocket.once('participant_returned_from_breakout', (data: any) => {
          expect(data.userId).toBe(participantId);
          expect(data.breakoutRoomId).toBe(breakoutRoomId);
          resolve();
        });
      });

      // Simulate participant returning to main room
      participantClient.emit('return_to_main_room', {
        callId,
        breakoutRoomId
      });

      await returnPromise;

      participantClient.disconnect();
    });

    test('should handle multiple breakout rooms simultaneously', async () => {
      const callId = 'multi-breakout-test';
      const rooms = [
        { name: 'Room 1', participants: ['user-1-multi', 'user-2-multi'] },
        { name: 'Room 2', participants: ['user-3-multi', 'user-4-multi'] }
      ];

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Create all participant clients
      const allParticipants = rooms.flatMap(room => room.participants);
      const clients: any[] = [];

      for (const userId of allParticipants) {
        const token = jwt.sign({ userId }, config.jwtSecret);
        
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: userId,
            name: `User ${userId}`,
            email: `${userId}@example.com`
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

        const port = (httpServer.address() as any).port;
        const client = ioClient(`http://localhost:${port}`, {
          auth: { token },
          transports: ['websocket']
        });

        await new Promise<void>((resolve) => {
          client.on('connect', resolve);
        });

        clients.push({ client, userId });
      }

      // All users join main call
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket.once('call_joined', () => resolve());
          clientSocket.emit('join_call', { callId, groupId: 'test-group' });
        }),
        ...clients.map(({ client }) => 
          new Promise<void>((resolve) => {
            client.once('call_joined', () => resolve());
            client.emit('join_call', { callId, groupId: 'test-group' });
          })
        )
      ]);

      const breakoutCreatedPromises: Promise<void>[] = [];

      // Set up listeners for breakout room creation
      rooms.forEach((room) => {
        const promise = new Promise<void>((resolve) => {
          clientSocket.once('breakout_room_created', (data: any) => {
            if (data.roomName === room.name) {
              expect(data.callId).toBe(callId);
              expect(data.participants).toEqual(room.participants);
              resolve();
            }
          });
        });
        breakoutCreatedPromises.push(promise);
      });

      // Create all breakout rooms
      rooms.forEach((room, index) => {
        setTimeout(() => {
          clientSocket.emit('create_breakout_room', {
            callId,
            roomName: room.name,
            participants: room.participants
          });
        }, index * 100);
      });

      // Wait for all breakout rooms to be created
      await Promise.all(breakoutCreatedPromises);

      // Clean up clients
      clients.forEach(({ client }) => client.disconnect());
    });

    test('should notify breakout room participants when someone leaves', async () => {
      const callId = 'breakout-leave-test';
      const breakoutRoomId = `${callId}_breakout_${Date.now()}`;
      const participants = ['user-leave-1', 'user-leave-2'];

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Create participant clients
      const clients: any[] = [];
      for (const userId of participants) {
        const token = jwt.sign({ userId }, config.jwtSecret);
        
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: userId,
            name: `User ${userId}`,
            email: `${userId}@example.com`
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

        const port = (httpServer.address() as any).port;
        const client = ioClient(`http://localhost:${port}`, {
          auth: { token },
          transports: ['websocket']
        });

        await new Promise<void>((resolve) => {
          client.on('connect', resolve);
        });

        clients.push({ client, userId });
      }

      // Set up listener for participant leaving breakout room
      const leavePromise = new Promise<void>((resolve) => {
        clients[1].client.once('participant_returned_to_main', (data: any) => {
          expect(data.userId).toBe(participants[0]);
          resolve();
        });
      });

      // Simulate first participant returning to main room
      clients[0].client.emit('return_to_main_room', {
        callId,
        breakoutRoomId
      });

      await leavePromise;

      // Clean up clients
      clients.forEach(({ client }) => client.disconnect());
    });
  });

  /**
   * Property 29: Audio state changes are propagated
   * Validates: Requirements 6.3
   * 
   * For any audio mute/unmute action, the state change should be propagated
   * to all participants and reflected in their UI.
   */
  describe('Property 29: Audio state changes are propagated', () => {
    test('should propagate audio state changes to all call participants', (done) => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            callId: fc.uuid(),
            audioMuted: fc.boolean()
          }),
          async (stateData) => {
            // Mock group membership check
            mockQuery.mockResolvedValue({
              rows: [{ id: 'membership-123' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Create second user to observe audio state change
            const user2Id = 'user-2-audio-observer';
            const user2Token = jwt.sign({ userId: user2Id }, config.jwtSecret);
            
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: user2Id,
                name: 'User 2',
                email: 'user2@example.com'
              }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            const port = (httpServer.address() as any).port;
            const client2 = ioClient(`http://localhost:${port}`, {
              auth: { token: user2Token },
              transports: ['websocket']
            });

            await new Promise<void>((resolve) => {
              client2.on('connect', resolve);
            });

            return new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                client2.disconnect();
                reject(new Error('Audio state change not propagated within timeout'));
              }, 2000);

              // Both users join the call
              Promise.all([
                new Promise<void>((resolveJoin) => {
                  clientSocket.once('call_joined', () => resolveJoin());
                  clientSocket.emit('join_call', { 
                    callId: stateData.callId, 
                    groupId: 'test-group' 
                  });
                }),
                new Promise<void>((resolveJoin) => {
                  client2.once('call_joined', () => resolveJoin());
                  client2.emit('join_call', { 
                    callId: stateData.callId, 
                    groupId: 'test-group' 
                  });
                })
              ]).then(() => {
                // Listen for audio state change on second client
                client2.once('participant_audio_change', (data: any) => {
                  clearTimeout(timeout);
                  
                  try {
                    expect(data.callId).toBe(stateData.callId);
                    expect(data.userId).toBe(testUserId);
                    expect(data.user).toBeDefined();
                    expect(data.muted).toBe(stateData.audioMuted);
                    client2.disconnect();
                    resolve();
                  } catch (error) {
                    client2.disconnect();
                    reject(error);
                  }
                });

                // First user changes audio state
                setTimeout(() => {
                  clientSocket.emit('audio_state_change', {
                    callId: stateData.callId,
                    muted: stateData.audioMuted
                  });
                }, 10);
              }).catch((error) => {
                clearTimeout(timeout);
                client2.disconnect();
                reject(error);
              });
            });
          }
        ),
        { numRuns: 100 }
      );
      
      done();
    }, 30000);

    test('should propagate video state changes to all call participants', (done) => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            callId: fc.uuid(),
            videoEnabled: fc.boolean()
          }),
          async (stateData) => {
            // Mock group membership check
            mockQuery.mockResolvedValue({
              rows: [{ id: 'membership-123' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            // Create second user to observe video state change
            const user2Id = 'user-2-video-observer';
            const user2Token = jwt.sign({ userId: user2Id }, config.jwtSecret);
            
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: user2Id,
                name: 'User 2',
                email: 'user2@example.com'
              }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            const port = (httpServer.address() as any).port;
            const client2 = ioClient(`http://localhost:${port}`, {
              auth: { token: user2Token },
              transports: ['websocket']
            });

            await new Promise<void>((resolve) => {
              client2.on('connect', resolve);
            });

            return new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                client2.disconnect();
                reject(new Error('Video state change not propagated within timeout'));
              }, 2000);

              // Both users join the call
              Promise.all([
                new Promise<void>((resolveJoin) => {
                  clientSocket.once('call_joined', () => resolveJoin());
                  clientSocket.emit('join_call', { 
                    callId: stateData.callId, 
                    groupId: 'test-group' 
                  });
                }),
                new Promise<void>((resolveJoin) => {
                  client2.once('call_joined', () => resolveJoin());
                  client2.emit('join_call', { 
                    callId: stateData.callId, 
                    groupId: 'test-group' 
                  });
                })
              ]).then(() => {
                // Listen for video state change on second client
                client2.once('participant_video_change', (data: any) => {
                  clearTimeout(timeout);
                  
                  try {
                    expect(data.callId).toBe(stateData.callId);
                    expect(data.userId).toBe(testUserId);
                    expect(data.user).toBeDefined();
                    expect(data.enabled).toBe(stateData.videoEnabled);
                    client2.disconnect();
                    resolve();
                  } catch (error) {
                    client2.disconnect();
                    reject(error);
                  }
                });

                // First user changes video state
                setTimeout(() => {
                  clientSocket.emit('video_state_change', {
                    callId: stateData.callId,
                    enabled: stateData.videoEnabled
                  });
                }, 10);
              }).catch((error) => {
                clearTimeout(timeout);
                client2.disconnect();
                reject(error);
              });
            });
          }
        ),
        { numRuns: 100 }
      );
      
      done();
    }, 30000);

    test('should broadcast audio state changes to all participants except sender', async () => {
      const callId = 'audio-state-test';
      const muted = true;

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Create second user and client
      const user2Id = 'user-2-audio';
      const user2Token = jwt.sign({ userId: user2Id }, config.jwtSecret);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: user2Id,
          name: 'User 2',
          email: 'user2@example.com'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const port = (httpServer.address() as any).port;
      const client2 = ioClient(`http://localhost:${port}`, {
        auth: { token: user2Token },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client2.on('connect', resolve);
      });

      // Both users join call
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket.once('call_joined', () => resolve());
          clientSocket.emit('join_call', { callId, groupId: 'test-group' });
        }),
        new Promise<void>((resolve) => {
          client2.once('call_joined', () => resolve());
          client2.emit('join_call', { callId, groupId: 'test-group' });
        })
      ]);

      // Set up listener for audio state change on second client
      const audioChangePromise = new Promise<void>((resolve) => {
        client2.once('participant_audio_change', (data: any) => {
          expect(data.callId).toBe(callId);
          expect(data.userId).toBe(testUserId);
          expect(data.muted).toBe(muted);
          expect(data.user).toBeDefined();
          resolve();
        });
      });

      // First user changes audio state
      clientSocket.emit('audio_state_change', {
        callId,
        muted
      });

      await audioChangePromise;

      client2.disconnect();
    });

    test('should broadcast video state changes to all participants except sender', async () => {
      const callId = 'video-state-test';
      const enabled = false;

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Create second user and client
      const user2Id = 'user-2-video';
      const user2Token = jwt.sign({ userId: user2Id }, config.jwtSecret);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: user2Id,
          name: 'User 2',
          email: 'user2@example.com'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const port = (httpServer.address() as any).port;
      const client2 = ioClient(`http://localhost:${port}`, {
        auth: { token: user2Token },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client2.on('connect', resolve);
      });

      // Both users join call
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket.once('call_joined', () => resolve());
          clientSocket.emit('join_call', { callId, groupId: 'test-group' });
        }),
        new Promise<void>((resolve) => {
          client2.once('call_joined', () => resolve());
          client2.emit('join_call', { callId, groupId: 'test-group' });
        })
      ]);

      // Set up listener for video state change on second client
      const videoChangePromise = new Promise<void>((resolve) => {
        client2.once('participant_video_change', (data: any) => {
          expect(data.callId).toBe(callId);
          expect(data.userId).toBe(testUserId);
          expect(data.enabled).toBe(enabled);
          expect(data.user).toBeDefined();
          resolve();
        });
      });

      // First user changes video state
      clientSocket.emit('video_state_change', {
        callId,
        enabled
      });

      await videoChangePromise;

      client2.disconnect();
    });

    test('should handle multiple rapid state changes', async () => {
      const callId = 'rapid-state-test';
      const stateChanges = [
        { type: 'audio', muted: true },
        { type: 'video', enabled: false },
        { type: 'audio', muted: false },
        { type: 'video', enabled: true },
        { type: 'audio', muted: true }
      ];

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Create second user and client
      const user2Id = 'user-2-rapid';
      const user2Token = jwt.sign({ userId: user2Id }, config.jwtSecret);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: user2Id,
          name: 'User 2',
          email: 'user2@example.com'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const port = (httpServer.address() as any).port;
      const client2 = ioClient(`http://localhost:${port}`, {
        auth: { token: user2Token },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client2.on('connect', resolve);
      });

      // Both users join call
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket.once('call_joined', () => resolve());
          clientSocket.emit('join_call', { callId, groupId: 'test-group' });
        }),
        new Promise<void>((resolve) => {
          client2.once('call_joined', () => resolve());
          client2.emit('join_call', { callId, groupId: 'test-group' });
        })
      ]);

      const receivedChanges: any[] = [];

      // Set up listeners for all state changes
      client2.on('participant_audio_change', (data: any) => {
        receivedChanges.push({ type: 'audio', ...data });
      });

      client2.on('participant_video_change', (data: any) => {
        receivedChanges.push({ type: 'video', ...data });
      });

      // Send all state changes rapidly
      stateChanges.forEach((change, index) => {
        setTimeout(() => {
          if (change.type === 'audio') {
            clientSocket.emit('audio_state_change', {
              callId,
              muted: change.muted
            });
          } else {
            clientSocket.emit('video_state_change', {
              callId,
              enabled: change.enabled
            });
          }
        }, index * 10); // 10ms between changes
      });

      // Wait for all changes to be received
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify all changes were received
      expect(receivedChanges.length).toBe(stateChanges.length);
      
      // Verify change data integrity
      stateChanges.forEach((change, index) => {
        const received = receivedChanges[index];
        expect(received.type).toBe(change.type);
        expect(received.callId).toBe(callId);
        expect(received.userId).toBe(testUserId);
        
        if (change.type === 'audio') {
          expect(received.muted).toBe(change.muted);
        } else {
          expect(received.enabled).toBe(change.enabled);
        }
      });

      client2.disconnect();
    });

    test('should maintain state consistency across multiple participants', async () => {
      const callId = 'consistency-test';
      const participants = ['user-2-cons', 'user-3-cons', 'user-4-cons'];
      const clients: any[] = [];

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Create multiple participants
      for (const userId of participants) {
        const token = jwt.sign({ userId }, config.jwtSecret);
        
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: userId,
            name: `User ${userId}`,
            email: `${userId}@example.com`
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

        const port = (httpServer.address() as any).port;
        const client = ioClient(`http://localhost:${port}`, {
          auth: { token },
          transports: ['websocket']
        });

        await new Promise<void>((resolve) => {
          client.on('connect', resolve);
        });

        clients.push(client);
      }

      // All users join call
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket.once('call_joined', () => resolve());
          clientSocket.emit('join_call', { callId, groupId: 'test-group' });
        }),
        ...clients.map(client => 
          new Promise<void>((resolve) => {
            client.once('call_joined', () => resolve());
            client.emit('join_call', { callId, groupId: 'test-group' });
          })
        )
      ]);

      const receivedByAllClients: any[][] = clients.map(() => []);

      // Set up listeners on all clients
      clients.forEach((client, index) => {
        client.on('participant_audio_change', (data: any) => {
          receivedByAllClients[index].push({ type: 'audio', ...data });
        });
        client.on('participant_video_change', (data: any) => {
          receivedByAllClients[index].push({ type: 'video', ...data });
        });
      });

      // Send state changes
      const changes = [
        { type: 'audio', muted: true },
        { type: 'video', enabled: false }
      ];

      changes.forEach((change, index) => {
        setTimeout(() => {
          if (change.type === 'audio') {
            clientSocket.emit('audio_state_change', {
              callId,
              muted: change.muted
            });
          } else {
            clientSocket.emit('video_state_change', {
              callId,
              enabled: change.enabled
            });
          }
        }, index * 100);
      });

      // Wait for all changes to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify all clients received the same state changes
      receivedByAllClients.forEach((clientChanges) => {
        expect(clientChanges.length).toBe(changes.length);
        
        changes.forEach((change, changeIndex) => {
          const received = clientChanges[changeIndex];
          expect(received.type).toBe(change.type);
          expect(received.callId).toBe(callId);
          expect(received.userId).toBe(testUserId);
          
          if (change.type === 'audio') {
            expect(received.muted).toBe(change.muted);
          } else {
            expect(received.enabled).toBe(change.enabled);
          }
        });
      });

      // Clean up clients
      clients.forEach(client => client.disconnect());
    });
  });

  /**
   * Property 28: Screen sharing broadcasts to participants
   * Validates: Requirements 6.2
   * 
   * For any screen sharing session, the screen content should be broadcast
   * to all call participants.
   */
  describe('Property 28: Screen sharing broadcasts to participants', () => {
    test('should broadcast screen sharing offers to all call participants', (done) => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            callId: fc.uuid(),
            offer: fc.record({
              type: fc.constant('offer'),
              sdp: fc.string({ minLength: 100, maxLength: 1000 })
            }),
            answer: fc.record({
              type: fc.constant('answer'),
              sdp: fc.string({ minLength: 100, maxLength: 1000 })
            }),
            candidate: fc.record({
              candidate: fc.string({ minLength: 50, maxLength: 200 }),
              sdpMLineIndex: fc.integer({ min: 0, max: 10 }),
              sdpMid: fc.string({ minLength: 1, maxLength: 5 })
            })
          }),
          async (screenShareData) => {
            // Mock group membership check
            mockQuery.mockResolvedValue({
              rows: [{ id: 'membership-123' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            return new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Screen sharing signaling not completed within timeout'));
              }, 2000);

              let receivedOffer = false;
              let receivedAnswer = false;
              let receivedCandidate = false;
              let receivedStop = false;

              // Listen for screen share offer
              clientSocket.once('screen_share_offer', (data: any) => {
                try {
                  expect(data.callId).toBe(screenShareData.callId);
                  expect(data.fromUserId).toBe(testUserId);
                  expect(data.offer).toEqual(screenShareData.offer);
                  receivedOffer = true;
                  
                  if (receivedOffer && receivedAnswer && receivedCandidate && receivedStop) {
                    clearTimeout(timeout);
                    resolve();
                  }
                } catch (error) {
                  clearTimeout(timeout);
                  reject(error);
                }
              });

              // Listen for screen share answer
              clientSocket.once('screen_share_answer', (data: any) => {
                try {
                  expect(data.callId).toBe(screenShareData.callId);
                  expect(data.fromUserId).toBe(testUserId);
                  expect(data.answer).toEqual(screenShareData.answer);
                  expect(data.targetUserId).toBeDefined();
                  receivedAnswer = true;
                  
                  if (receivedOffer && receivedAnswer && receivedCandidate && receivedStop) {
                    clearTimeout(timeout);
                    resolve();
                  }
                } catch (error) {
                  clearTimeout(timeout);
                  reject(error);
                }
              });

              // Listen for screen share ICE candidate
              clientSocket.once('screen_share_ice_candidate', (data: any) => {
                try {
                  expect(data.callId).toBe(screenShareData.callId);
                  expect(data.fromUserId).toBe(testUserId);
                  expect(data.candidate).toEqual(screenShareData.candidate);
                  expect(data.targetUserId).toBeDefined();
                  receivedCandidate = true;
                  
                  if (receivedOffer && receivedAnswer && receivedCandidate && receivedStop) {
                    clearTimeout(timeout);
                    resolve();
                  }
                } catch (error) {
                  clearTimeout(timeout);
                  reject(error);
                }
              });

              // Listen for screen share stop
              clientSocket.once('screen_share_stopped', (data: any) => {
                try {
                  expect(data.callId).toBe(screenShareData.callId);
                  expect(data.fromUserId).toBe(testUserId);
                  receivedStop = true;
                  
                  if (receivedOffer && receivedAnswer && receivedCandidate && receivedStop) {
                    clearTimeout(timeout);
                    resolve();
                  }
                } catch (error) {
                  clearTimeout(timeout);
                  reject(error);
                }
              });

              // Simulate screen sharing sequence
              setTimeout(() => {
                // 1. Send screen share offer
                clientSocket.emit('screen_share_offer', {
                  callId: screenShareData.callId,
                  offer: screenShareData.offer
                });
              }, 10);

              setTimeout(() => {
                // 2. Send screen share answer
                clientSocket.emit('screen_share_answer', {
                  callId: screenShareData.callId,
                  targetUserId: 'target-user-123',
                  answer: screenShareData.answer
                });
              }, 50);

              setTimeout(() => {
                // 3. Send screen share ICE candidate
                clientSocket.emit('screen_share_ice_candidate', {
                  callId: screenShareData.callId,
                  targetUserId: 'target-user-123',
                  candidate: screenShareData.candidate
                });
              }, 100);

              setTimeout(() => {
                // 4. Stop screen sharing
                clientSocket.emit('stop_screen_share', screenShareData.callId);
              }, 150);
            });
          }
        ),
        { numRuns: 100 }
      );
      
      done();
    }, 30000);

    test('should broadcast screen share offer to all participants except sender', async () => {
      const callId = 'screen-share-broadcast-test';
      const offer = {
        type: 'offer' as const,
        sdp: 'v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n...'
      };

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Create second user and client
      const user2Id = 'user-2-screen';
      const user2Token = jwt.sign({ userId: user2Id }, config.jwtSecret);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: user2Id,
          name: 'User 2',
          email: 'user2@example.com'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const port = (httpServer.address() as any).port;
      const client2 = ioClient(`http://localhost:${port}`, {
        auth: { token: user2Token },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client2.on('connect', resolve);
      });

      // Both users join call
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket.once('call_joined', () => resolve());
          clientSocket.emit('join_call', { callId, groupId: 'test-group' });
        }),
        new Promise<void>((resolve) => {
          client2.once('call_joined', () => resolve());
          client2.emit('join_call', { callId, groupId: 'test-group' });
        })
      ]);

      // Set up listener for screen share offer on second client
      const offerPromise = new Promise<void>((resolve) => {
        client2.once('screen_share_offer', (data: any) => {
          expect(data.callId).toBe(callId);
          expect(data.fromUserId).toBe(testUserId);
          expect(data.offer).toEqual(offer);
          resolve();
        });
      });

      // First user starts screen sharing
      clientSocket.emit('screen_share_offer', {
        callId,
        offer
      });

      await offerPromise;

      client2.disconnect();
    });

    test('should handle screen share stop notification', async () => {
      const callId = 'screen-share-stop-test';

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Create second user and client
      const user2Id = 'user-2-stop';
      const user2Token = jwt.sign({ userId: user2Id }, config.jwtSecret);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: user2Id,
          name: 'User 2',
          email: 'user2@example.com'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const port = (httpServer.address() as any).port;
      const client2 = ioClient(`http://localhost:${port}`, {
        auth: { token: user2Token },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client2.on('connect', resolve);
      });

      // Both users join call
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket.once('call_joined', () => resolve());
          clientSocket.emit('join_call', { callId, groupId: 'test-group' });
        }),
        new Promise<void>((resolve) => {
          client2.once('call_joined', () => resolve());
          client2.emit('join_call', { callId, groupId: 'test-group' });
        })
      ]);

      // Set up listener for screen share stop on second client
      const stopPromise = new Promise<void>((resolve) => {
        client2.once('screen_share_stopped', (data: any) => {
          expect(data.callId).toBe(callId);
          expect(data.fromUserId).toBe(testUserId);
          expect(data.fromUser).toBeDefined();
          resolve();
        });
      });

      // First user stops screen sharing
      clientSocket.emit('stop_screen_share', callId);

      await stopPromise;

      client2.disconnect();
    });

    test('should handle multiple concurrent screen share sessions', async () => {
      const callId = 'multi-screen-share-test';
      const offers = [
        {
          type: 'offer' as const,
          sdp: 'v=0\r\no=- 111111111 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n...'
        },
        {
          type: 'offer' as const,
          sdp: 'v=0\r\no=- 222222222 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n...'
        }
      ];

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Create multiple users and clients
      const users = ['user-2-multi', 'user-3-multi'];
      const clients: any[] = [];

      for (const userId of users) {
        const token = jwt.sign({ userId }, config.jwtSecret);
        
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: userId,
            name: `User ${userId}`,
            email: `${userId}@example.com`
          }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: []
        });

        const port = (httpServer.address() as any).port;
        const client = ioClient(`http://localhost:${port}`, {
          auth: { token },
          transports: ['websocket']
        });

        await new Promise<void>((resolve) => {
          client.on('connect', resolve);
        });

        clients.push(client);
      }

      // All users join call
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket.once('call_joined', () => resolve());
          clientSocket.emit('join_call', { callId, groupId: 'test-group' });
        }),
        ...clients.map(client => 
          new Promise<void>((resolve) => {
            client.once('call_joined', () => resolve());
            client.emit('join_call', { callId, groupId: 'test-group' });
          })
        )
      ]);

      const receivedOffers: any[] = [];

      // Set up listeners on all clients
      clients.forEach(client => {
        client.on('screen_share_offer', (data: any) => {
          receivedOffers.push(data);
        });
      });

      // Send multiple screen share offers
      offers.forEach((offer, index) => {
        setTimeout(() => {
          clientSocket.emit('screen_share_offer', {
            callId,
            offer
          });
        }, index * 50);
      });

      // Wait for all offers to be received
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify all clients received all offers
      expect(receivedOffers.length).toBe(offers.length * clients.length);
      
      // Verify offer data integrity
      receivedOffers.forEach(receivedOffer => {
        expect(receivedOffer.callId).toBe(callId);
        expect(receivedOffer.fromUserId).toBe(testUserId);
        expect(offers.some(offer => 
          offer.type === receivedOffer.offer.type && 
          offer.sdp === receivedOffer.offer.sdp
        )).toBe(true);
      });

      // Clean up clients
      clients.forEach(client => client.disconnect());
    });
  });

  /**
   * Property 27: Video call initialization creates connections
   * Validates: Requirements 6.1
   * 
   * For any video call initiated in a study group, WebRTC peer connections
   * should be established for all participants.
   */
  describe('Property 27: Video call initialization creates connections', () => {
    test('should establish WebRTC connections for all call participants', (done) => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            callId: fc.uuid(),
            groupId: fc.uuid(),
            offer: fc.record({
              type: fc.constant('offer'),
              sdp: fc.string({ minLength: 100, maxLength: 1000 })
            }),
            answer: fc.record({
              type: fc.constant('answer'),
              sdp: fc.string({ minLength: 100, maxLength: 1000 })
            })
          }),
          async (callData) => {
            // Mock group membership check
            mockQuery.mockResolvedValue({
              rows: [{ id: 'membership-123' }],
              command: 'SELECT',
              rowCount: 1,
              oid: 0,
              fields: []
            });

            return new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Call initialization not completed within timeout'));
              }, 2000);

              let joinedCall = false;
              let receivedOffer = false;
              let receivedAnswer = false;

              // Listen for call joined confirmation
              clientSocket.once('call_joined', (data: any) => {
                try {
                  expect(data.callId).toBe(callData.callId);
                  expect(data.participants).toBeDefined();
                  expect(Array.isArray(data.participants)).toBe(true);
                  joinedCall = true;
                  
                  if (joinedCall && receivedOffer && receivedAnswer) {
                    clearTimeout(timeout);
                    resolve();
                  }
                } catch (error) {
                  clearTimeout(timeout);
                  reject(error);
                }
              });

              // Listen for WebRTC offer
              clientSocket.once('webrtc_offer', (data: any) => {
                try {
                  expect(data.callId).toBe(callData.callId);
                  expect(data.fromUserId).toBe(testUserId);
                  expect(data.offer).toEqual(callData.offer);
                  expect(data.targetUserId).toBeDefined();
                  receivedOffer = true;
                  
                  if (joinedCall && receivedOffer && receivedAnswer) {
                    clearTimeout(timeout);
                    resolve();
                  }
                } catch (error) {
                  clearTimeout(timeout);
                  reject(error);
                }
              });

              // Listen for WebRTC answer
              clientSocket.once('webrtc_answer', (data: any) => {
                try {
                  expect(data.callId).toBe(callData.callId);
                  expect(data.fromUserId).toBe(testUserId);
                  expect(data.answer).toEqual(callData.answer);
                  expect(data.targetUserId).toBeDefined();
                  receivedAnswer = true;
                  
                  if (joinedCall && receivedOffer && receivedAnswer) {
                    clearTimeout(timeout);
                    resolve();
                  }
                } catch (error) {
                  clearTimeout(timeout);
                  reject(error);
                }
              });

              // Simulate call initialization sequence
              setTimeout(() => {
                // 1. Join call
                clientSocket.emit('join_call', { 
                  callId: callData.callId, 
                  groupId: callData.groupId 
                });
              }, 10);

              setTimeout(() => {
                // 2. Send WebRTC offer
                clientSocket.emit('webrtc_offer', {
                  callId: callData.callId,
                  targetUserId: 'target-user-123',
                  offer: callData.offer
                });
              }, 50);

              setTimeout(() => {
                // 3. Send WebRTC answer
                clientSocket.emit('webrtc_answer', {
                  callId: callData.callId,
                  targetUserId: 'target-user-123',
                  answer: callData.answer
                });
              }, 100);
            });
          }
        ),
        { numRuns: 100 }
      );
      
      done();
    }, 30000);

    test('should handle ICE candidate exchange during call initialization', async () => {
      const callId = 'ice-test-call';
      const groupId = 'ice-test-group';
      const candidate = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0'
      };

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Join call
      await new Promise<void>((resolve) => {
        clientSocket.once('call_joined', () => resolve());
        clientSocket.emit('join_call', { callId, groupId });
      });

      // Test ICE candidate exchange
      const candidatePromise = new Promise<void>((resolve) => {
        clientSocket.once('webrtc_ice_candidate', (data: any) => {
          expect(data.callId).toBe(callId);
          expect(data.fromUserId).toBe(testUserId);
          expect(data.candidate).toEqual(candidate);
          expect(data.targetUserId).toBe('target-user-456');
          resolve();
        });
      });

      // Send ICE candidate
      clientSocket.emit('webrtc_ice_candidate', {
        callId,
        targetUserId: 'target-user-456',
        candidate
      });

      await candidatePromise;
    });

    test('should notify existing participants when new user joins call', async () => {
      const callId = 'notification-test-call';
      const groupId = 'notification-test-group';

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Create second user and client
      const user2Id = 'user-2-call';
      const user2Token = jwt.sign({ userId: user2Id }, config.jwtSecret);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: user2Id,
          name: 'User 2',
          email: 'user2@example.com'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const port = (httpServer.address() as any).port;
      const client2 = ioClient(`http://localhost:${port}`, {
        auth: { token: user2Token },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client2.on('connect', resolve);
      });

      // First user joins call
      await new Promise<void>((resolve) => {
        clientSocket.once('call_joined', () => resolve());
        clientSocket.emit('join_call', { callId, groupId });
      });

      // Set up listener for user joined notification
      const userJoinedPromise = new Promise<void>((resolve) => {
        clientSocket.once('user_joined_call', (data: any) => {
          expect(data.callId).toBe(callId);
          expect(data.userId).toBe(user2Id);
          expect(data.user).toBeDefined();
          expect(data.user.id).toBe(user2Id);
          resolve();
        });
      });

      // Second user joins call
      client2.emit('join_call', { callId, groupId });

      await userJoinedPromise;

      client2.disconnect();
    });

    test('should handle call leave events', async () => {
      const callId = 'leave-test-call';
      const groupId = 'leave-test-group';

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Join call
      await new Promise<void>((resolve) => {
        clientSocket.once('call_joined', () => resolve());
        clientSocket.emit('join_call', { callId, groupId });
      });

      // Create second user to observe leave event
      const user2Id = 'user-2-leave';
      const user2Token = jwt.sign({ userId: user2Id }, config.jwtSecret);
      
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: user2Id,
          name: 'User 2',
          email: 'user2@example.com'
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      const port = (httpServer.address() as any).port;
      const client2 = ioClient(`http://localhost:${port}`, {
        auth: { token: user2Token },
        transports: ['websocket']
      });

      await new Promise<void>((resolve) => {
        client2.on('connect', resolve);
      });

      // Second user joins call
      await new Promise<void>((resolve) => {
        client2.once('call_joined', () => resolve());
        client2.emit('join_call', { callId, groupId });
      });

      // Set up listener for user left notification
      const userLeftPromise = new Promise<void>((resolve) => {
        client2.once('user_left_call', (data: any) => {
          expect(data.callId).toBe(callId);
          expect(data.userId).toBe(testUserId);
          expect(data.user).toBeDefined();
          resolve();
        });
      });

      // First user leaves call
      clientSocket.emit('leave_call', callId);

      await userLeftPromise;

      client2.disconnect();
    });
  });

  /**
   * Property 42: Dashboard updates in real-time
   * Validates: Requirements 9.5
   * 
   * For any new group activity, the dashboard should update within 1 second
   * without requiring a page refresh.
   */
  describe('Property 42: Dashboard updates in real-time', () => {
    test('should update dashboard in real-time for group activities', (done) => {
      fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.constantFrom('new_message', 'member_joined', 'resource_shared', 'task_created'),
            groupId: fc.uuid(),
            groupName: fc.string({ minLength: 1, maxLength: 50 }),
            actorName: fc.string({ minLength: 1, maxLength: 30 }),
            description: fc.string({ minLength: 1, maxLength: 200 })
          }),
          async (activity) => {
            return new Promise<void>((resolve, reject) => {
              const startTime = Date.now();
              const timeout = setTimeout(() => {
                reject(new Error('Dashboard update not received within 1 second'));
              }, 1000);

              // Listen for dashboard update
              clientSocket.once('dashboard_update', (update: any) => {
                const endTime = Date.now();
                const latency = endTime - startTime;
                
                clearTimeout(timeout);
                
                try {
                  // Verify update was received within 1 second
                  expect(latency).toBeLessThan(1000);
                  
                  // Verify update contains expected data
                  expect(update).toBeDefined();
                  expect(update.type).toBe(activity.type);
                  expect(update.groupId).toBe(activity.groupId);
                  expect(update.groupName).toBe(activity.groupName);
                  expect(update.actorName).toBe(activity.actorName);
                  expect(update.description).toBe(activity.description);
                  expect(update.timestamp).toBeDefined();
                  
                  resolve();
                } catch (error) {
                  reject(error);
                }
              });

              // Send dashboard update
              socketService.broadcastDashboardUpdate(testUserId, activity);
            });
          }
        ),
        { numRuns: 100 }
      );
      
      done();
    }, 30000);

    test('should broadcast group activity updates to all group members', async () => {
      const groupId = 'activity-group-123';
      const activity = {
        type: 'new_message',
        groupId,
        groupName: 'Test Group',
        actorName: 'John Doe',
        description: 'Posted a new message in the group',
        messageId: 'msg-456'
      };

      // Mock group membership
      mockQuery.mockResolvedValue({
        rows: [{ id: 'membership-123' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      });

      // Join group
      await new Promise<void>((resolve) => {
        clientSocket.once('joined_group', () => resolve());
        clientSocket.emit('join_group', groupId);
      });

      // Listen for group activity update
      const activityPromise = new Promise<void>((resolve) => {
        clientSocket.once('group_activity_update', (receivedActivity: any) => {
          expect(receivedActivity.type).toBe(activity.type);
          expect(receivedActivity.groupId).toBe(activity.groupId);
          expect(receivedActivity.groupName).toBe(activity.groupName);
          expect(receivedActivity.actorName).toBe(activity.actorName);
          expect(receivedActivity.description).toBe(activity.description);
          expect(receivedActivity.timestamp).toBeDefined();
          resolve();
        });
      });

      // Broadcast group activity update
      socketService.broadcastGroupActivityUpdate(groupId, activity);

      await activityPromise;
    });

    test('should handle multiple concurrent dashboard updates', async () => {
      const updates = Array.from({ length: 5 }, (_, i) => ({
        type: 'task_created',
        taskId: `task-${i}`,
        taskTitle: `Task ${i}`,
        description: `Created task ${i}`
      }));

      const receivedUpdates: any[] = [];

      // Listen for all updates
      clientSocket.on('dashboard_update', (update: any) => {
        receivedUpdates.push(update);
      });

      // Send all updates
      updates.forEach(update => {
        socketService.broadcastDashboardUpdate(testUserId, update);
      });

      // Wait for all updates to be received
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify all updates were received
      expect(receivedUpdates.length).toBe(updates.length);
      
      // Verify each update was received correctly
      updates.forEach(update => {
        const received = receivedUpdates.find(u => u.taskId === update.taskId);
        expect(received).toBeDefined();
        expect(received.type).toBe(update.type);
        expect(received.taskTitle).toBe(update.taskTitle);
        expect(received.description).toBe(update.description);
      });

      // Clean up listener
      clientSocket.off('dashboard_update');
    });
  });
});
