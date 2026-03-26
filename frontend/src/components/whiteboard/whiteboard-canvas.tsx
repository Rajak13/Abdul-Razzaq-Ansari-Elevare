'use client';

import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { WhiteboardToolbar } from './whiteboard-toolbar';
import socketService from '@/services/socket-service';

interface WhiteboardCanvasProps {
  whiteboardId: string;
  groupId: string;
  canEdit: boolean;
  className?: string;
}

interface DrawingTool {
  type: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  color: string;
  size: number;
}

interface Point {
  x: number;
  y: number;
}

interface DrawingElement {
  id: string;
  type: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  points?: Point[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  size: number;
  timestamp: number;
  userId?: string;
}

interface UserCursor {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

const COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
  '#800080', '#008000', '#800000', '#808080'
];

const SIZES = [2, 4, 6, 8, 12, 16, 20];

const WhiteboardCanvas = memo(function WhiteboardCanvas({ 
  whiteboardId, 
  groupId, 
  canEdit, 
  className = '' 
}: WhiteboardCanvasProps) {
  // Remove excessive logging
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingTool>({
    type: 'pen',
    color: '#000000',
    size: 4
  });
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [userCursors, setUserCursors] = useState<Map<string, UserCursor>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isAddingText, setIsAddingText] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [startPoint, setStartPoint] = useState<Point | null>(null);

  // Initialize canvas and socket connection
  useEffect(() => {
    // Event handlers — defined here so they can be registered/unregistered cleanly
    const handleWhiteboardJoined = (data: any) => {
      if (data.whiteboardId === whiteboardId) {
        setElements(data.elements || []);
        const users = data.users?.length ? data.users : ['You'];
        setConnectedUsers(users);
        setIsConnected(true);
      }
    };

    const handleUserJoined = (data: any) => {
      if (data.whiteboardId === whiteboardId) {
        const userName = data.userName || data.user?.name || 'Unknown User';
        setConnectedUsers(prev => prev.includes(userName) ? prev : [...prev, userName]);
      }
    };

    const handleUserLeft = (data: any) => {
      if (data.whiteboardId === whiteboardId) {
        const userName = data.userName || data.user?.name || 'Unknown User';
        setConnectedUsers(prev => prev.filter(u => u !== userName));
      }
    };

    const handleAddElement = (data: any) => {
      if (data.whiteboardId === whiteboardId) {
        setElements(prev => [...prev, data.element]);
      }
    };

    const handleUpdateElement = (data: any) => {
      if (data.whiteboardId === whiteboardId) {
        setElements(prev =>
          prev.map(el => el.id === data.elementId ? { ...el, ...data.updates } : el)
        );
      }
    };

    const handleDeleteElement = (data: any) => {
      if (data.whiteboardId === whiteboardId) {
        setElements(prev => prev.filter(el => el.id !== data.elementId));
      }
    };

    const handleUserCursorMove = (data: any) => {
      if (data.whiteboardId === whiteboardId && data.userId !== 'current-user') {
        setUserCursors(prev => {
          const next = new Map(prev);
          next.set(data.userId, {
            userId: data.userId,
            userName: data.userName || 'Unknown User',
            x: data.x,
            y: data.y,
            color: data.color || '#FF0000'
          });
          return next;
        });
      }
    };

    const handleUserCursorLeave = (data: any) => {
      if (data.whiteboardId === whiteboardId) {
        setUserCursors(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }
    };

    const handleClearCanvas = (data: any) => {
      if (data.whiteboardId === whiteboardId) setElements([]);
    };

    // Register all event listeners immediately — they work regardless of join state
    socketService.onWhiteboardJoined(handleWhiteboardJoined);
    socketService.onUserJoinedWhiteboard(handleUserJoined);
    socketService.onUserLeftWhiteboard(handleUserLeft);
    socketService.onAddElement(handleAddElement);
    socketService.onUpdateElement(handleUpdateElement);
    socketService.onDeleteElement(handleDeleteElement);
    socketService.onClearCanvas(handleClearCanvas);
    socketService.getSocket()?.on('user_cursor_move', handleUserCursorMove);
    socketService.getSocket()?.on('user_cursor_leave', handleUserCursorLeave);

    // Always allow local drawing immediately
    setIsConnected(true);
    setConnectedUsers(['You']);

    // Join whiteboard room — poll until socket is connected
    const tryJoin = () => {
      if (socketService.isConnected()) {
        socketService.joinWhiteboard(whiteboardId);
        return true;
      }
      return false;
    };

    if (!tryJoin()) {
      // Socket not ready yet — retry every 500ms until connected (max 20s)
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (tryJoin() || attempts >= 40) {
          clearInterval(interval);
        }
      }, 500);
    }

    return () => {
      socketService.offAddElement(handleAddElement);
      socketService.offUpdateElement(handleUpdateElement);
      socketService.offDeleteElement(handleDeleteElement);
      socketService.offClearCanvas(handleClearCanvas);
      socketService.getSocket()?.off('user_cursor_move', handleUserCursorMove);
      socketService.getSocket()?.off('user_cursor_leave', handleUserCursorLeave);
      if (socketService.isConnected()) {
        socketService.emitCursorLeave(whiteboardId, 'current-user');
      }
      socketService.leaveWhiteboard(whiteboardId);
      setIsConnected(false);
    };
  }, [whiteboardId]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all elements
    elements.forEach(element => {
      ctx.strokeStyle = element.color;
      ctx.lineWidth = element.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (element.type) {
        case 'pen':
        case 'eraser':
          if (element.points && element.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(element.points[0].x, element.points[0].y);
            for (let i = 1; i < element.points.length; i++) {
              ctx.lineTo(element.points[i].x, element.points[i].y);
            }
            ctx.stroke();
          }
          break;

        case 'rectangle':
          if (element.x !== undefined && element.y !== undefined && element.width && element.height) {
            ctx.strokeRect(element.x, element.y, element.width, element.height);
          }
          break;

        case 'circle':
          if (element.x !== undefined && element.y !== undefined && element.width) {
            ctx.beginPath();
            ctx.arc(element.x + element.width / 2, element.y + element.width / 2, Math.abs(element.width) / 2, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;

        case 'text':
          if (element.x !== undefined && element.y !== undefined && element.text) {
            ctx.font = `${element.size}px Arial`;
            ctx.fillStyle = element.color;
            ctx.fillText(element.text, element.x, element.y);
          }
          break;
      }
    });

    // Draw user cursors
    userCursors.forEach((cursor) => {
      ctx.save();
      ctx.fillStyle = cursor.color;
      ctx.strokeStyle = cursor.color;
      ctx.lineWidth = 2;
      
      // Draw cursor pointer
      ctx.beginPath();
      ctx.moveTo(cursor.x, cursor.y);
      ctx.lineTo(cursor.x + 12, cursor.y + 4);
      ctx.lineTo(cursor.x + 8, cursor.y + 8);
      ctx.lineTo(cursor.x + 4, cursor.y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Draw user name
      ctx.font = '12px Arial';
      ctx.fillStyle = '#000000';
      ctx.fillRect(cursor.x + 15, cursor.y - 15, ctx.measureText(cursor.userName).width + 6, 16);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(cursor.userName, cursor.x + 18, cursor.y - 4);
      
      ctx.restore();
    });
  }, [elements, userCursors]);

  // Redraw canvas when elements change
  useEffect(() => {
    redrawCanvas();
  }, [elements]);

  // Resize canvas to fill its container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        redrawCanvas();
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [redrawCanvas]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canEdit) return;

    const pos = getMousePos(e);
    
    // Handle text tool
    if (currentTool.type === 'text') {
      setTextPosition(pos);
      setIsAddingText(true);
      return;
    }

    setIsDrawing(true);
    setStartPoint(pos);

    if (currentTool.type === 'pen' || currentTool.type === 'eraser') {
      const newElement: DrawingElement = {
        id: `${Date.now()}-${Math.random()}`,
        type: currentTool.type,
        points: [pos],
        color: currentTool.type === 'eraser' ? '#FFFFFF' : currentTool.color,
        size: currentTool.size,
        timestamp: Date.now()
      };

      setElements(prev => [...prev, newElement]);
      
      // Only emit to socket if connected
      if (isConnected && socketService.isConnected()) {
        socketService.emitAddElement(whiteboardId, newElement);
      }
    }
  }, [canEdit, currentTool, whiteboardId, getMousePos, isConnected]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    
    // Emit cursor position for other users (throttled)
    if (isConnected && socketService.isConnected()) {
      socketService.emitCursorMove(whiteboardId, pos.x, pos.y, 'current-user', 'You', currentTool.color);
    }

    if (!isDrawing || !canEdit) return;

    if (currentTool.type === 'pen' || currentTool.type === 'eraser') {
      setElements(prev => {
        const newElements = [...prev];
        const lastElement = newElements[newElements.length - 1];
        
        if (lastElement && lastElement.points) {
          lastElement.points.push(pos);
          
          // Only emit update if socket is connected (throttled for performance)
          if (isConnected && socketService.isConnected() && lastElement.points.length % 3 === 0) {
            socketService.emitUpdateElement(whiteboardId, lastElement.id, {
              points: lastElement.points
            });
          }
        }
        
        return newElements;
      });
    } else if ((currentTool.type === 'rectangle' || currentTool.type === 'circle') && startPoint) {
      // Preview shape while dragging
      const width = pos.x - startPoint.x;
      const height = pos.y - startPoint.y;
      
      // Update or create preview element
      setElements(prev => {
        const newElements = [...prev];
        const lastElement = newElements[newElements.length - 1];
        
        if (lastElement && (lastElement.type === 'rectangle' || lastElement.type === 'circle') && 
            lastElement.timestamp === startPoint.x + startPoint.y) {
          // Update existing preview
          lastElement.x = Math.min(startPoint.x, pos.x);
          lastElement.y = Math.min(startPoint.y, pos.y);
          lastElement.width = Math.abs(width);
          lastElement.height = currentTool.type === 'rectangle' ? Math.abs(height) : Math.abs(width);
        } else {
          // Create new preview element
          const newElement: DrawingElement = {
            id: `${Date.now()}-${Math.random()}`,
            type: currentTool.type,
            x: Math.min(startPoint.x, pos.x),
            y: Math.min(startPoint.y, pos.y),
            width: Math.abs(width),
            height: currentTool.type === 'rectangle' ? Math.abs(height) : Math.abs(width),
            color: currentTool.color,
            size: currentTool.size,
            timestamp: startPoint.x + startPoint.y // Use as temporary ID
          };
          newElements.push(newElement);
        }
        
        return newElements;
      });
    }
  }, [isDrawing, canEdit, currentTool, whiteboardId, getMousePos, isConnected, startPoint]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && (currentTool.type === 'rectangle' || currentTool.type === 'circle') && startPoint) {
      // Finalize shape element
      setElements(prev => {
        const newElements = [...prev];
        const lastElement = newElements[newElements.length - 1];
        
        if (lastElement && lastElement.timestamp === startPoint.x + startPoint.y) {
          // Update timestamp to make it permanent
          lastElement.timestamp = Date.now();
          
          // Emit to socket if connected
          if (isConnected && socketService.isConnected()) {
            socketService.emitAddElement(whiteboardId, lastElement);
          }
        }
        
        return newElements;
      });
    }
    
    setIsDrawing(false);
    setStartPoint(null);
  }, [isDrawing, currentTool.type, startPoint, isConnected, whiteboardId]);

  const clearCanvas = useCallback(() => {
    if (!canEdit) return;
    
    setElements([]);
    
    // Only emit to socket if connected
    if (isConnected && socketService.isConnected()) {
      socketService.emitClearCanvas(whiteboardId);
    }
  }, [canEdit, whiteboardId, isConnected]);

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim() || !textPosition) return;

    const newElement: DrawingElement = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'text',
      x: textPosition.x,
      y: textPosition.y,
      text: textInput,
      color: currentTool.color,
      size: currentTool.size,
      timestamp: Date.now()
    };

    setElements(prev => [...prev, newElement]);
    
    // Only emit to socket if connected
    if (isConnected && socketService.isConnected()) {
      socketService.emitAddElement(whiteboardId, newElement);
    }

    // Reset text input
    setTextInput('');
    setTextPosition(null);
    setIsAddingText(false);
  }, [textInput, textPosition, currentTool, whiteboardId, isConnected]);

  const handleTextCancel = useCallback(() => {
    setTextInput('');
    setTextPosition(null);
    setIsAddingText(false);
  }, []);

  const handleToolChange = useCallback((updates: Partial<DrawingTool>) => {
    setCurrentTool(prev => ({ ...prev, ...updates }));
  }, []);

  const handleRestore = useCallback((restoredElements: DrawingElement[]) => {
    setElements(restoredElements);
    // Optionally emit to socket for real-time sync
    if (isConnected && socketService.isConnected()) {
      // Clear canvas first, then add all elements
      socketService.emitClearCanvas(whiteboardId);
      restoredElements.forEach(element => {
        socketService.emitAddElement(whiteboardId, element);
      });
    }
  }, [whiteboardId, isConnected]);

  const downloadCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${whiteboardId}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }, [whiteboardId]);

  if (!isConnected) {
    return (
      <div className={`flex items-center justify-center p-6 ${className}`}>
        <div className="text-center text-muted-foreground">
          <div className="mb-2">Initializing whiteboard...</div>
          <div className="text-sm">
            {socketService.isConnected() ? 'Connecting to collaboration server...' : 'Starting in offline mode...'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <WhiteboardToolbar
        whiteboardId={whiteboardId}
        whiteboardName="Whiteboard" // You might want to pass this as a prop
        elements={elements}
        canvasRef={canvasRef}
        currentTool={currentTool}
        onToolChange={handleToolChange}
        onClearCanvas={clearCanvas}
        onDownload={downloadCanvas}
        onRestore={handleRestore}
        canEdit={canEdit}
        connectedUsers={connectedUsers}
        isConnected={socketService.isConnected()}
        className="mb-2 px-4 pt-4 flex-shrink-0"
      />

      {/* Canvas */}
      <div className="flex-1 border rounded-lg overflow-hidden bg-white relative min-h-0">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="block cursor-crosshair w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        
        {/* Text Input Dialog */}
        {isAddingText && textPosition && (
          <div 
            className="absolute bg-white border rounded-lg shadow-lg p-3 z-10"
            style={{ 
              left: textPosition.x + 10, 
              top: textPosition.y - 40,
              minWidth: '200px'
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTextSubmit();
                } else if (e.key === 'Escape') {
                  handleTextCancel();
                }
              }}
              placeholder="Enter text..."
              className="w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleTextSubmit}>
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={handleTextCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {canEdit ? (
        <div className="mt-2 text-sm text-center flex-shrink-0">
          <span className="text-green-600">✓ You can edit this whiteboard</span>
          {!socketService.isConnected() && (
            <span className="text-orange-500 ml-2">(Changes will sync when connection is restored)</span>
          )}
        </div>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground text-center flex-shrink-0">
          You have view-only access to this whiteboard
        </div>
      )}
    </div>
  );
});

WhiteboardCanvas.displayName = 'WhiteboardCanvas';

export default WhiteboardCanvas;