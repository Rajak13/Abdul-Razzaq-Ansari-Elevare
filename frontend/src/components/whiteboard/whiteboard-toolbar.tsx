'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { WhiteboardExport } from './whiteboard-export';
import { WhiteboardHistory } from './whiteboard-history';
import { 
  Pencil, 
  Eraser, 
  Square, 
  Circle, 
  Type, 
  Trash2,
  Undo,
  Redo,
  Users,
  Palette,
  Minus,
  Plus
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DrawingTool {
  type: 'pen' | 'eraser' | 'rectangle' | 'circle' | 'text';
  color: string;
  size: number;
}

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
}

interface WhiteboardToolbarProps {
  whiteboardId: string;
  whiteboardName: string;
  elements: DrawingElement[];
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentTool: DrawingTool;
  onToolChange: (tool: Partial<DrawingTool>) => void;
  onClearCanvas: () => void;
  onDownload: () => void;
  onRestore: (elements: DrawingElement[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canEdit: boolean;
  connectedUsers: string[];
  isConnected: boolean;
  className?: string;
}

const COLORS = [
  { value: '#000000', name: 'Black' },
  { value: '#FF0000', name: 'Red' },
  { value: '#00FF00', name: 'Green' },
  { value: '#0000FF', name: 'Blue' },
  { value: '#FFFF00', name: 'Yellow' },
  { value: '#FF00FF', name: 'Magenta' },
  { value: '#00FFFF', name: 'Cyan' },
  { value: '#FFA500', name: 'Orange' },
  { value: '#800080', name: 'Purple' },
  { value: '#008000', name: 'Dark Green' },
  { value: '#800000', name: 'Maroon' },
  { value: '#808080', name: 'Gray' },
  { value: '#FFB6C1', name: 'Light Pink' },
  { value: '#87CEEB', name: 'Sky Blue' },
  { value: '#DDA0DD', name: 'Plum' },
  { value: '#98FB98', name: 'Pale Green' }
];

const SIZES = [
  { value: 2, name: 'Extra Small' },
  { value: 4, name: 'Small' },
  { value: 6, name: 'Medium' },
  { value: 8, name: 'Large' },
  { value: 12, name: 'Extra Large' },
  { value: 16, name: 'XXL' },
  { value: 20, name: 'XXXL' },
  { value: 24, name: 'Huge' }
];

export function WhiteboardToolbar({
  whiteboardId,
  whiteboardName,
  elements,
  canvasRef,
  currentTool,
  onToolChange,
  onClearCanvas,
  onDownload,
  onRestore,
  onUndo,
  onRedo,
  canEdit,
  connectedUsers,
  isConnected,
  className = ''
}: WhiteboardToolbarProps) {
  const handleToolSelect = (type: DrawingTool['type']) => {
    onToolChange({ type });
  };

  const handleColorSelect = (color: string) => {
    onToolChange({ color });
  };

  const handleSizeSelect = (size: number) => {
    onToolChange({ size });
  };

  const adjustSize = (delta: number) => {
    const newSize = Math.max(1, Math.min(50, currentTool.size + delta));
    onToolChange({ size: newSize });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 p-4 bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Drawing Tools */}
      <div className="flex items-center gap-1">
        <Button
          variant={currentTool.type === 'pen' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToolSelect('pen')}
          disabled={!canEdit}
          title="Pen Tool"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant={currentTool.type === 'eraser' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToolSelect('eraser')}
          disabled={!canEdit}
          title="Eraser Tool"
        >
          <Eraser className="h-4 w-4" />
        </Button>
        <Button
          variant={currentTool.type === 'rectangle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToolSelect('rectangle')}
          disabled={!canEdit}
          title="Rectangle Tool"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant={currentTool.type === 'circle' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToolSelect('circle')}
          disabled={!canEdit}
          title="Circle Tool"
        >
          <Circle className="h-4 w-4" />
        </Button>
        <Button
          variant={currentTool.type === 'text' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToolSelect('text')}
          disabled={!canEdit}
          title="Text Tool"
        >
          <Type className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Color Picker */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit}
              className="flex items-center gap-2"
              title="Select Color"
            >
              <Palette className="h-4 w-4" />
              <div 
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: currentTool.color }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map(color => (
                <button
                  key={color.value}
                  className={`w-12 h-12 rounded border-2 hover:scale-110 transition-transform ${
                    currentTool.color === color.value ? 'border-gray-800 ring-2 ring-blue-500' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => handleColorSelect(color.value)}
                  title={color.name}
                />
              ))}
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="text-sm font-medium mb-2">Custom Color</div>
              <input
                type="color"
                value={currentTool.color}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="w-full h-8 rounded border cursor-pointer"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Stroke Width */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Size:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => adjustSize(-2)}
          disabled={!canEdit || currentTool.size <= 2}
          title="Decrease Size"
        >
          <Minus className="h-3 w-3" />
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={!canEdit}
              className="min-w-[60px]"
              title="Select Size"
            >
              {currentTool.size}px
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-2">
              {SIZES.map(size => (
                <button
                  key={size.value}
                  className={`w-full flex items-center justify-between p-2 rounded hover:bg-gray-100 ${
                    currentTool.size === size.value ? 'bg-blue-100 text-blue-700' : ''
                  }`}
                  onClick={() => handleSizeSelect(size.value)}
                >
                  <span>{size.name}</span>
                  <span className="text-sm text-muted-foreground">{size.value}px</span>
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="text-sm font-medium mb-2">Custom Size</div>
              <input
                type="range"
                min="1"
                max="50"
                value={currentTool.size}
                onChange={(e) => handleSizeSelect(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-sm text-muted-foreground mt-1">
                {currentTool.size}px
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="sm"
          onClick={() => adjustSize(2)}
          disabled={!canEdit || currentTool.size >= 50}
          title="Increase Size"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {onUndo && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canEdit}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
        )}
        {onRedo && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRedo}
            disabled={!canEdit}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onClearCanvas}
          disabled={!canEdit}
          title="Clear Canvas"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        
        <WhiteboardExport
          whiteboardId={whiteboardId}
          whiteboardName={whiteboardName}
          elements={elements}
          canvasRef={canvasRef}
        />
        
        <WhiteboardHistory
          whiteboardId={whiteboardId}
          currentElements={elements}
          onRestore={onRestore}
          canEdit={canEdit}
        />
      </div>

      {/* Connection Status and Users */}
      <div className="ml-auto flex items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-orange-500'
          }`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
        
        {/* Connected Users */}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Badge variant="secondary">
            {Math.max(1, connectedUsers.length)} connected
          </Badge>
          
          {/* Show connected users list */}
          {(connectedUsers.length > 0 || isConnected) && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs">
                  View Users
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  <div className="font-medium text-sm">Connected Users</div>
                  {connectedUsers.length > 0 ? (
                    connectedUsers.map((user, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded bg-gray-50">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm">{user}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded bg-gray-50">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm">You</span>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Edit Permission Status */}
      {!canEdit && (
        <div className="ml-2">
          <Badge variant="outline" className="text-orange-600 border-orange-600">
            View Only
          </Badge>
        </div>
      )}
    </div>
  );
}