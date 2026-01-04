'use client';

import { useEffect, useCallback, useRef } from 'react';
import socketService from '@/services/socket-service';

interface DrawingElement {
  id: string;
  type: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  points?: { x: number; y: number }[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  size: number;
  timestamp: number;
  userId?: string;
  version?: number;
}

interface WhiteboardSyncProps {
  whiteboardId: string;
  elements: DrawingElement[];
  onElementsChange: (elements: DrawingElement[]) => void;
  onUserJoined: (user: string) => void;
  onUserLeft: (user: string) => void;
  onCursorMove: (userId: string, x: number, y: number, color: string) => void;
  onCursorLeave: (userId: string) => void;
  isConnected: boolean;
}

export function WhiteboardSync({
  whiteboardId,
  elements,
  onElementsChange,
  onUserJoined,
  onUserLeft,
  onCursorMove,
  onCursorLeave,
  isConnected
}: WhiteboardSyncProps) {
  const elementsRef = useRef(elements);
  const pendingOperations = useRef<Map<string, any>>(new Map());
  const operationQueue = useRef<any[]>([]);
  const isProcessingQueue = useRef(false);

  // Update elements ref when elements change
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  // Process operation queue
  const processOperationQueue = useCallback(async () => {
    if (isProcessingQueue.current || operationQueue.current.length === 0) {
      return;
    }

    isProcessingQueue.current = true;

    while (operationQueue.current.length > 0) {
      const operation = operationQueue.current.shift();
      
      try {
        switch (operation.type) {
          case 'add_element':
            handleRemoteAddElement(operation.data);
            break;
          case 'update_element':
            handleRemoteUpdateElement(operation.data);
            break;
          case 'delete_element':
            handleRemoteDeleteElement(operation.data);
            break;
          case 'clear_canvas':
            handleRemoteClearCanvas(operation.data);
            break;
        }
      } catch (error) {
        console.error('Error processing operation:', error);
      }

      // Small delay to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    isProcessingQueue.current = false;
  }, []);

  // Handle remote element addition
  const handleRemoteAddElement = useCallback((data: any) => {
    if (data.whiteboardId !== whiteboardId) return;

    const newElement = data.element;
    
    // Check if element already exists (prevent duplicates)
    const existingIndex = elementsRef.current.findIndex(el => el.id === newElement.id);
    if (existingIndex !== -1) {
      return;
    }

    // Add element with conflict resolution
    const updatedElements = [...elementsRef.current, newElement];
    onElementsChange(updatedElements);
  }, [whiteboardId, onElementsChange]);

  // Handle remote element update
  const handleRemoteUpdateElement = useCallback((data: any) => {
    if (data.whiteboardId !== whiteboardId) return;

    const { elementId, updates } = data;
    
    const updatedElements = elementsRef.current.map(element => {
      if (element.id === elementId) {
        // Merge updates with conflict resolution
        const updatedElement = { ...element, ...updates };
        
        // Handle concurrent drawing updates (merge points)
        if (updates.points && element.points) {
          // For drawing elements, append new points if they don't already exist
          const existingPoints = element.points;
          const newPoints = updates.points;
          
          if (newPoints.length > existingPoints.length) {
            updatedElement.points = newPoints;
          } else {
            // Merge points intelligently
            const mergedPoints = [...existingPoints];
            newPoints.forEach((point: any, index: number) => {
              if (index >= existingPoints.length) {
                mergedPoints.push(point);
              }
            });
            updatedElement.points = mergedPoints;
          }
        }
        
        return updatedElement;
      }
      return element;
    });

    onElementsChange(updatedElements);
  }, [whiteboardId, onElementsChange]);

  // Handle remote element deletion
  const handleRemoteDeleteElement = useCallback((data: any) => {
    if (data.whiteboardId !== whiteboardId) return;

    const { elementId } = data;
    const updatedElements = elementsRef.current.filter(element => element.id !== elementId);
    onElementsChange(updatedElements);
  }, [whiteboardId, onElementsChange]);

  // Handle remote canvas clear
  const handleRemoteClearCanvas = useCallback((data: any) => {
    if (data.whiteboardId !== whiteboardId) return;

    onElementsChange([]);
  }, [whiteboardId, onElementsChange]);

  // Handle user events
  const handleUserJoinedWhiteboard = useCallback((data: any) => {
    if (data.whiteboardId !== whiteboardId) return;
    
    const userName = data.userName || data.user?.name || 'Unknown User';
    onUserJoined(userName);
  }, [whiteboardId, onUserJoined]);

  const handleUserLeftWhiteboard = useCallback((data: any) => {
    if (data.whiteboardId !== whiteboardId) return;
    
    const userName = data.userName || data.user?.name || 'Unknown User';
    onUserLeft(userName);
  }, [whiteboardId, onUserLeft]);

  // Handle cursor events
  const handleUserCursorMove = useCallback((data: any) => {
    if (data.whiteboardId !== whiteboardId || data.userId === 'current-user') return;
    
    onCursorMove(data.userId, data.x, data.y, data.color || '#FF0000');
  }, [whiteboardId, onCursorMove]);

  const handleUserCursorLeave = useCallback((data: any) => {
    if (data.whiteboardId !== whiteboardId) return;
    
    onCursorLeave(data.userId);
  }, [whiteboardId, onCursorLeave]);

  // Queue operation for processing
  const queueOperation = useCallback((type: string, data: any) => {
    operationQueue.current.push({ type, data });
    processOperationQueue();
  }, [processOperationQueue]);

  // Set up event listeners
  useEffect(() => {
    if (!isConnected || !socketService.isConnected()) {
      return;
    }

    // Element events
    const handleAddElement = (data: any) => queueOperation('add_element', data);
    const handleUpdateElement = (data: any) => queueOperation('update_element', data);
    const handleDeleteElement = (data: any) => queueOperation('delete_element', data);
    const handleClearCanvas = (data: any) => queueOperation('clear_canvas', data);

    // Subscribe to events
    socketService.onAddElement(handleAddElement);
    socketService.onUpdateElement(handleUpdateElement);
    socketService.onDeleteElement(handleDeleteElement);
    socketService.onClearCanvas(handleClearCanvas);
    socketService.onUserJoinedWhiteboard(handleUserJoinedWhiteboard);
    socketService.onUserLeftWhiteboard(handleUserLeftWhiteboard);

    // Cursor events
    if (socketService.getSocket()) {
      socketService.getSocket()?.on('user_cursor_move', handleUserCursorMove);
      socketService.getSocket()?.on('user_cursor_leave', handleUserCursorLeave);
    }

    return () => {
      // Clean up event listeners
      socketService.offAddElement(handleAddElement);
      socketService.offUpdateElement(handleUpdateElement);
      socketService.offDeleteElement(handleDeleteElement);
      socketService.offClearCanvas(handleClearCanvas);

      if (socketService.getSocket()) {
        socketService.getSocket()?.off('user_cursor_move', handleUserCursorMove);
        socketService.getSocket()?.off('user_cursor_leave', handleUserCursorLeave);
      }
    };
  }, [
    isConnected,
    whiteboardId,
    queueOperation,
    handleUserJoinedWhiteboard,
    handleUserLeftWhiteboard,
    handleUserCursorMove,
    handleUserCursorLeave
  ]);

  // Sync API - methods to emit events
  const syncAPI = {
    addElement: (element: DrawingElement) => {
      if (isConnected && socketService.isConnected()) {
        socketService.emitAddElement(whiteboardId, element);
      }
    },

    updateElement: (elementId: string, updates: Partial<DrawingElement>) => {
      if (isConnected && socketService.isConnected()) {
        socketService.emitUpdateElement(whiteboardId, elementId, updates);
      }
    },

    deleteElement: (elementId: string) => {
      if (isConnected && socketService.isConnected()) {
        socketService.emitDeleteElement(whiteboardId, elementId);
      }
    },

    clearCanvas: () => {
      if (isConnected && socketService.isConnected()) {
        socketService.emitClearCanvas(whiteboardId);
      }
    },

    moveCursor: (x: number, y: number, color: string) => {
      if (isConnected && socketService.isConnected()) {
        socketService.getSocket()?.emit('cursor_move', {
          whiteboardId,
          x,
          y,
          userId: 'current-user',
          userName: 'You',
          color
        });
      }
    },

    leaveCursor: () => {
      if (isConnected && socketService.isConnected()) {
        socketService.getSocket()?.emit('cursor_leave', {
          whiteboardId,
          userId: 'current-user'
        });
      }
    }
  };

  return null; // This is a logic-only component
}

// Hook for using whiteboard sync
export function useWhiteboardSync(whiteboardId: string) {
  const elementsRef = useRef<DrawingElement[]>([]);
  const usersRef = useRef<string[]>([]);
  const cursorsRef = useRef<Map<string, any>>(new Map());

  const handleElementsChange = useCallback((elements: DrawingElement[]) => {
    elementsRef.current = elements;
  }, []);

  const handleUserJoined = useCallback((user: string) => {
    if (!usersRef.current.includes(user)) {
      usersRef.current = [...usersRef.current, user];
    }
  }, []);

  const handleUserLeft = useCallback((user: string) => {
    usersRef.current = usersRef.current.filter(u => u !== user);
    cursorsRef.current.delete(user);
  }, []);

  const handleCursorMove = useCallback((userId: string, x: number, y: number, color: string) => {
    cursorsRef.current.set(userId, { userId, x, y, color });
  }, []);

  const handleCursorLeave = useCallback((userId: string) => {
    cursorsRef.current.delete(userId);
  }, []);

  return {
    elements: elementsRef.current,
    users: usersRef.current,
    cursors: cursorsRef.current,
    handleElementsChange,
    handleUserJoined,
    handleUserLeft,
    handleCursorMove,
    handleCursorLeave
  };
}