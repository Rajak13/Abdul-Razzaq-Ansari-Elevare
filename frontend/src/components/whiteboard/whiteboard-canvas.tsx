'use client';

import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { WhiteboardToolbar } from './whiteboard-toolbar';
import socketService from '@/services/socket-service';
import { Pencil, Eraser, Square, Circle, Type, Minus, Plus, Trash2, ZoomIn, ZoomOut } from 'lucide-react';

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
interface Point { x: number; y: number; }
interface DrawingElement {
  id: string;
  type: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  points?: Point[];
  x?: number; y?: number; width?: number; height?: number; text?: string;
  color: string; size: number; timestamp: number; userId?: string;
}
interface UserCursor { userId: string; userName: string; x: number; y: number; color: string; }

// Mobile floating toolbar tools
const MOBILE_TOOLS: { type: DrawingTool['type']; icon: React.ReactNode; label: string }[] = [
  { type: 'pen',       icon: <Pencil className="w-5 h-5" />,  label: 'Pen' },
  { type: 'eraser',    icon: <Eraser className="w-5 h-5" />,  label: 'Eraser' },
  { type: 'rectangle', icon: <Square className="w-5 h-5" />,  label: 'Rect' },
  { type: 'circle',    icon: <Circle className="w-5 h-5" />,  label: 'Circle' },
  { type: 'text',      icon: <Type className="w-5 h-5" />,    label: 'Text' },
];
const MOBILE_COLORS = ['#1a1a1a','#ef4444','#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ec4899','#ffffff'];

const WhiteboardCanvas = memo(function WhiteboardCanvas({
  whiteboardId, groupId, canEdit, className = ''
}: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<DrawingTool>({ type: 'pen', color: '#1a1a1a', size: 4 });
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [userCursors, setUserCursors] = useState<Map<string, UserCursor>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isAddingText, setIsAddingText] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  // Zoom / pan state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const lastPanPointRef = useRef<Point>({ x: 0, y: 0 });
  // Pinch-to-zoom
  const lastPinchDistRef = useRef<number | null>(null);
  // Active drawing element ref (avoids stale closure in touch handlers)
  const activeElementIdRef = useRef<string | null>(null);
  const startPointRef = useRef<Point | null>(null);

  // ─── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleJoined = (data: any) => {
      if (data.whiteboardId !== whiteboardId) return;
      setElements(data.elements || []);
      setConnectedUsers(data.users?.length ? data.users : ['You']);
      setIsConnected(true);
    };
    const handleUserJoined = (data: any) => {
      if (data.whiteboardId !== whiteboardId) return;
      const name = data.userName || data.user?.name || 'Unknown';
      setConnectedUsers(p => p.includes(name) ? p : [...p, name]);
    };
    const handleUserLeft = (data: any) => {
      if (data.whiteboardId !== whiteboardId) return;
      const name = data.userName || data.user?.name || 'Unknown';
      setConnectedUsers(p => p.filter(u => u !== name));
    };
    const handleAdd = (data: any) => {
      if (data.whiteboardId === whiteboardId) setElements(p => [...p, data.element]);
    };
    const handleUpdate = (data: any) => {
      if (data.whiteboardId !== whiteboardId) return;
      setElements(p => p.map(el => el.id === data.elementId ? { ...el, ...data.updates } : el));
    };
    const handleDelete = (data: any) => {
      if (data.whiteboardId === whiteboardId) setElements(p => p.filter(el => el.id !== data.elementId));
    };
    const handleClear = (data: any) => {
      if (data.whiteboardId === whiteboardId) setElements([]);
    };
    const handleCursor = (data: any) => {
      if (data.whiteboardId !== whiteboardId || data.userId === 'current-user') return;
      setUserCursors(p => { const n = new Map(p); n.set(data.userId, data); return n; });
    };
    const handleCursorLeave = (data: any) => {
      if (data.whiteboardId === whiteboardId)
        setUserCursors(p => { const n = new Map(p); n.delete(data.userId); return n; });
    };

    socketService.onWhiteboardJoined(handleJoined);
    socketService.onUserJoinedWhiteboard(handleUserJoined);
    socketService.onUserLeftWhiteboard(handleUserLeft);
    socketService.onAddElement(handleAdd);
    socketService.onUpdateElement(handleUpdate);
    socketService.onDeleteElement(handleDelete);
    socketService.onClearCanvas(handleClear);
    socketService.getSocket()?.on('user_cursor_move', handleCursor);
    socketService.getSocket()?.on('user_cursor_leave', handleCursorLeave);

    setIsConnected(true);
    setConnectedUsers(['You']);

    const tryJoin = () => {
      if (socketService.isConnected()) { socketService.joinWhiteboard(whiteboardId); return true; }
      return false;
    };
    if (!tryJoin()) {
      let attempts = 0;
      const iv = setInterval(() => { attempts++; if (tryJoin() || attempts >= 40) clearInterval(iv); }, 500);
    }

    return () => {
      socketService.offAddElement(handleAdd);
      socketService.offUpdateElement(handleUpdate);
      socketService.offDeleteElement(handleDelete);
      socketService.offClearCanvas(handleClear);
      socketService.getSocket()?.off('user_cursor_move', handleCursor);
      socketService.getSocket()?.off('user_cursor_leave', handleCursorLeave);
      if (socketService.isConnected()) socketService.emitCursorLeave(whiteboardId, 'current-user');
      socketService.leaveWhiteboard(whiteboardId);
      setIsConnected(false);
    };
  }, [whiteboardId]);

  // ─── Redraw ──────────────────────────────────────────────────────────────────
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Apply zoom + pan transform
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);

    elements.forEach(el => {
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.type === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      switch (el.type) {
        case 'pen':
        case 'eraser':
          if (el.points && el.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(el.points[0].x, el.points[0].y);
            for (let i = 1; i < el.points.length; i++) ctx.lineTo(el.points[i].x, el.points[i].y);
            ctx.stroke();
          }
          break;
        case 'rectangle':
          if (el.x !== undefined && el.y !== undefined && el.width && el.height)
            ctx.strokeRect(el.x, el.y, el.width, el.height);
          break;
        case 'circle':
          if (el.x !== undefined && el.y !== undefined && el.width) {
            ctx.beginPath();
            ctx.arc(el.x + el.width / 2, el.y + el.width / 2, Math.abs(el.width) / 2, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;
        case 'text':
          if (el.x !== undefined && el.y !== undefined && el.text) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.font = `${el.size * 3}px Arial`;
            ctx.fillStyle = el.color;
            ctx.fillText(el.text, el.x, el.y);
          }
          break;
      }
    });

    ctx.globalCompositeOperation = 'source-over';

    // Remote cursors
    userCursors.forEach(cursor => {
      ctx.save();
      ctx.fillStyle = cursor.color;
      ctx.beginPath();
      ctx.moveTo(cursor.x, cursor.y);
      ctx.lineTo(cursor.x + 12, cursor.y + 4);
      ctx.lineTo(cursor.x + 8, cursor.y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.font = '11px Arial';
      const w = ctx.measureText(cursor.userName).width + 6;
      ctx.fillStyle = cursor.color;
      ctx.fillRect(cursor.x + 14, cursor.y - 14, w, 16);
      ctx.fillStyle = '#fff';
      ctx.fillText(cursor.userName, cursor.x + 17, cursor.y - 3);
      ctx.restore();
    });

    ctx.restore();
  }, [elements, userCursors, scale, pan]);

  useEffect(() => { redrawCanvas(); }, [redrawCanvas]);

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width > 0 && height > 0) { canvas.width = width; canvas.height = height; redrawCanvas(); }
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(container);
    return () => obs.disconnect();
  }, [redrawCanvas]);

  // ─── Coordinate helpers ───────────────────────────────────────────────────────
  // Convert screen coords → canvas logical coords (accounting for zoom/pan)
  const toLogical = useCallback((screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (screenX - rect.left - pan.x) / scale,
      y: (screenY - rect.top  - pan.y) / scale,
    };
  }, [pan, scale]);

  const getPosFromMouse = useCallback((e: React.MouseEvent<HTMLCanvasElement>) =>
    toLogical(e.clientX, e.clientY), [toLogical]);

  const getPosFromTouch = useCallback((touch: React.Touch) =>
    toLogical(touch.clientX, touch.clientY), [toLogical]);

  // ─── Shared draw-start / draw-move / draw-end logic ──────────────────────────
  const onDrawStart = useCallback((pos: Point) => {
    if (!canEdit) return;
    if (currentTool.type === 'text') {
      setTextPosition(pos);
      setIsAddingText(true);
      return;
    }
    setIsDrawing(true);
    setStartPoint(pos);
    startPointRef.current = pos;

    if (currentTool.type === 'pen' || currentTool.type === 'eraser') {
      const el: DrawingElement = {
        id: `${Date.now()}-${Math.random()}`,
        type: currentTool.type,
        points: [pos],
        color: currentTool.color,
        size: currentTool.size,
        timestamp: Date.now(),
      };
      activeElementIdRef.current = el.id;
      setElements(p => [...p, el]);
      if (socketService.isConnected()) socketService.emitAddElement(whiteboardId, el);
    }
  }, [canEdit, currentTool, whiteboardId]);

  const onDrawMove = useCallback((pos: Point) => {
    if (!isDrawing || !canEdit) return;
    const sp = startPointRef.current;

    if (currentTool.type === 'pen' || currentTool.type === 'eraser') {
      setElements(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.points) {
          last.points.push(pos);
          if (socketService.isConnected() && last.points.length % 3 === 0)
            socketService.emitUpdateElement(whiteboardId, last.id, { points: last.points });
        }
        return next;
      });
    } else if ((currentTool.type === 'rectangle' || currentTool.type === 'circle') && sp) {
      const w = pos.x - sp.x;
      const h = pos.y - sp.y;
      setElements(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        const tempTs = sp.x + sp.y;
        if (last && (last.type === 'rectangle' || last.type === 'circle') && last.timestamp === tempTs) {
          last.x = Math.min(sp.x, pos.x);
          last.y = Math.min(sp.y, pos.y);
          last.width = Math.abs(w);
          last.height = currentTool.type === 'rectangle' ? Math.abs(h) : Math.abs(w);
        } else {
          next.push({
            id: `${Date.now()}-${Math.random()}`,
            type: currentTool.type,
            x: Math.min(sp.x, pos.x), y: Math.min(sp.y, pos.y),
            width: Math.abs(w), height: currentTool.type === 'rectangle' ? Math.abs(h) : Math.abs(w),
            color: currentTool.color, size: currentTool.size, timestamp: tempTs,
          });
        }
        return next;
      });
    }
  }, [isDrawing, canEdit, currentTool, whiteboardId]);

  const onDrawEnd = useCallback(() => {
    if (!isDrawing) return;
    const sp = startPointRef.current;
    if ((currentTool.type === 'rectangle' || currentTool.type === 'circle') && sp) {
      setElements(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last && last.timestamp === sp.x + sp.y) {
          last.timestamp = Date.now();
          if (socketService.isConnected()) socketService.emitAddElement(whiteboardId, last);
        }
        return next;
      });
    }
    setIsDrawing(false);
    setStartPoint(null);
    startPointRef.current = null;
    activeElementIdRef.current = null;
  }, [isDrawing, currentTool.type, whiteboardId]);

  // ─── Mouse handlers ───────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle-click or Alt+drag = pan
      isPanningRef.current = true;
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    onDrawStart(getPosFromMouse(e));
  }, [onDrawStart, getPosFromMouse]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastPanPointRef.current.x;
      const dy = e.clientY - lastPanPointRef.current.y;
      lastPanPointRef.current = { x: e.clientX, y: e.clientY };
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      return;
    }
    const pos = getPosFromMouse(e);
    if (socketService.isConnected())
      socketService.emitCursorMove(whiteboardId, pos.x, pos.y, 'current-user', 'You', currentTool.color);
    onDrawMove(pos);
  }, [getPosFromMouse, onDrawMove, whiteboardId, currentTool.color]);

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false;
    onDrawEnd();
  }, [onDrawEnd]);

  // Scroll-wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.min(5, Math.max(0.2, s * delta)));
  }, []);

  // ─── Touch handlers ───────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDistRef.current = Math.hypot(dx, dy);
      onDrawEnd(); // cancel any active stroke
      return;
    }
    if (e.touches.length === 1) {
      lastPinchDistRef.current = null;
      onDrawStart(getPosFromTouch(e.touches[0]));
    }
  }, [onDrawStart, onDrawEnd, getPosFromTouch]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      // Pinch-to-zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastPinchDistRef.current !== null) {
        const ratio = dist / lastPinchDistRef.current;
        setScale(s => Math.min(5, Math.max(0.2, s * ratio)));
      }
      lastPinchDistRef.current = dist;
      return;
    }
    if (e.touches.length === 1) {
      onDrawMove(getPosFromTouch(e.touches[0]));
    }
  }, [onDrawMove, getPosFromTouch]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    lastPinchDistRef.current = null;
    if (e.touches.length === 0) onDrawEnd();
  }, [onDrawEnd]);

  // ─── Other actions ────────────────────────────────────────────────────────────
  const clearCanvas = useCallback(() => {
    if (!canEdit) return;
    setElements([]);
    if (socketService.isConnected()) socketService.emitClearCanvas(whiteboardId);
  }, [canEdit, whiteboardId]);

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim() || !textPosition) return;
    const el: DrawingElement = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'text', x: textPosition.x, y: textPosition.y,
      text: textInput, color: currentTool.color, size: currentTool.size, timestamp: Date.now(),
    };
    setElements(p => [...p, el]);
    if (socketService.isConnected()) socketService.emitAddElement(whiteboardId, el);
    setTextInput(''); setTextPosition(null); setIsAddingText(false);
  }, [textInput, textPosition, currentTool, whiteboardId]);

  const handleRestore = useCallback((els: DrawingElement[]) => {
    setElements(els);
    if (socketService.isConnected()) {
      socketService.emitClearCanvas(whiteboardId);
      els.forEach(el => socketService.emitAddElement(whiteboardId, el));
    }
  }, [whiteboardId]);

  const downloadCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${whiteboardId}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }, [whiteboardId]);

  const handleToolChange = useCallback((updates: Partial<DrawingTool>) => {
    setCurrentTool(p => ({ ...p, ...updates }));
  }, []);

  const zoomIn  = () => setScale(s => Math.min(5, s * 1.2));
  const zoomOut = () => setScale(s => Math.max(0.2, s / 1.2));
  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col ${className}`}>
      {/* Desktop toolbar — hidden on mobile */}
      <div className="hidden sm:block flex-shrink-0">
        <WhiteboardToolbar
          whiteboardId={whiteboardId}
          whiteboardName="Whiteboard"
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
          className="mb-2 px-4 pt-4"
        />
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative min-h-0 overflow-hidden rounded-lg border border-border bg-white dark:bg-zinc-900">
        <canvas
          ref={canvasRef}
          className="block w-full h-full touch-none"
          style={{ cursor: currentTool.type === 'eraser' ? 'cell' : currentTool.type === 'text' ? 'text' : 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* Zoom controls — always visible, top-right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          <button onClick={zoomIn}  className="w-8 h-8 rounded-lg bg-card border border-border shadow flex items-center justify-center hover:bg-accent transition-colors" title="Zoom in"><ZoomIn  className="w-4 h-4" /></button>
          <button onClick={zoomOut} className="w-8 h-8 rounded-lg bg-card border border-border shadow flex items-center justify-center hover:bg-accent transition-colors" title="Zoom out"><ZoomOut className="w-4 h-4" /></button>
          <button onClick={resetView} className="w-8 h-8 rounded-lg bg-card border border-border shadow flex items-center justify-center hover:bg-accent transition-colors text-xs font-bold text-muted-foreground" title="Reset view">1:1</button>
        </div>

        {/* Zoom level badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-card/80 border border-border text-xs text-muted-foreground select-none">
          {Math.round(scale * 100)}%
        </div>

        {/* Text input overlay */}
        {isAddingText && textPosition && (
          <div
            className="absolute z-20 bg-card border border-border rounded-xl shadow-xl p-3"
            style={{ left: Math.min(textPosition.x * scale + pan.x + 10, window.innerWidth - 220), top: Math.max((textPosition.y * scale + pan.y) - 50, 8), minWidth: 200 }}
          >
            <input
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleTextSubmit(); else if (e.key === 'Escape') { setIsAddingText(false); setTextPosition(null); } }}
              placeholder="Type here…"
              className="w-full px-2 py-1.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleTextSubmit} className="flex-1">Add</Button>
              <Button size="sm" variant="outline" onClick={() => { setIsAddingText(false); setTextPosition(null); }} className="flex-1">Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile floating toolbar ── */}
      {canEdit && (
        <div className="sm:hidden flex-shrink-0 mt-2">
          {/* Tool row */}
          <div className="flex items-center justify-between gap-1 px-2 py-2 bg-card border border-border rounded-xl shadow">
            {MOBILE_TOOLS.map(tool => (
              <button
                key={tool.type}
                onClick={() => handleToolChange({ type: tool.type })}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                  currentTool.type === tool.type
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
                title={tool.label}
              >
                {tool.icon}
                <span className="text-[10px]">{tool.label}</span>
              </button>
            ))}
            {/* Clear */}
            <button
              onClick={clearCanvas}
              className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              title="Clear"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-[10px] font-medium">Clear</span>
            </button>
          </div>

          {/* Color + size row */}
          <div className="flex items-center gap-2 px-2 py-2 mt-1 bg-card border border-border rounded-xl shadow">
            <div className="flex gap-1.5 flex-1 flex-wrap">
              {MOBILE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => handleToolChange({ color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-90 ${
                    currentTool.color === c ? 'border-primary scale-110' : 'border-border'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            {/* Size */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => handleToolChange({ size: Math.max(1, currentTool.size - 2) })} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-accent"><Minus className="w-3 h-3" /></button>
              <span className="text-xs font-bold w-8 text-center">{currentTool.size}px</span>
              <button onClick={() => handleToolChange({ size: Math.min(40, currentTool.size + 2) })} className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-accent"><Plus className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="mt-1 text-xs text-center flex-shrink-0 text-muted-foreground hidden sm:block">
        {canEdit
          ? <span className="text-green-600 dark:text-green-400">✓ Editing · {connectedUsers.length} connected{!socketService.isConnected() ? ' · offline mode' : ''}</span>
          : 'View only'}
      </div>
    </div>
  );
});

WhiteboardCanvas.displayName = 'WhiteboardCanvas';
export default WhiteboardCanvas;
