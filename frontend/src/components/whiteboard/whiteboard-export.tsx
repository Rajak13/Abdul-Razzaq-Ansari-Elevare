'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import apiClient from '@/lib/api-client';

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

interface WhiteboardExportProps {
  whiteboardId: string;
  whiteboardName: string;
  elements: DrawingElement[];
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  className?: string;
}

interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'json';
  quality: 'low' | 'medium' | 'high';
  width: number;
  height: number;
  includeBackground: boolean;
  backgroundColor: string;
  includeMetadata: boolean;
  filename: string;
}

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'png',
  quality: 'high',
  width: 1920,
  height: 1080,
  includeBackground: true,
  backgroundColor: '#ffffff',
  includeMetadata: false,
  filename: 'whiteboard-export'
};

const EXPORT_FORMATS = [
  { value: 'png', label: 'PNG Image', icon: FileImage, description: 'Raster image format, good for sharing' },
  { value: 'svg', label: 'SVG Vector', icon: FileText, description: 'Vector format, scalable and editable' },
  { value: 'pdf', label: 'PDF Document', icon: FileText, description: 'Document format, good for printing' },
  { value: 'json', label: 'JSON Data', icon: FileText, description: 'Raw data format for backup/import' }
];

const QUALITY_OPTIONS = [
  { value: 'low', label: 'Low (72 DPI)', multiplier: 1 },
  { value: 'medium', label: 'Medium (150 DPI)', multiplier: 2 },
  { value: 'high', label: 'High (300 DPI)', multiplier: 4 }
];

const PRESET_SIZES = [
  { label: 'Canvas Size', width: 800, height: 600 },
  { label: 'HD (1280x720)', width: 1280, height: 720 },
  { label: 'Full HD (1920x1080)', width: 1920, height: 1080 },
  { label: 'A4 Portrait', width: 2480, height: 3508 },
  { label: 'A4 Landscape', width: 3508, height: 2480 },
  { label: 'Square (1080x1080)', width: 1080, height: 1080 }
];

export function WhiteboardExport({
  whiteboardId,
  whiteboardName,
  elements,
  canvasRef,
  className = ''
}: WhiteboardExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    ...DEFAULT_EXPORT_OPTIONS,
    filename: whiteboardName.toLowerCase().replace(/\s+/g, '-') || 'whiteboard-export'
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Update export options
  const updateOptions = useCallback((updates: Partial<ExportOptions>) => {
    setExportOptions(prev => ({ ...prev, ...updates }));
  }, []);

  // Generate preview
  const generatePreview = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const previewCanvas = document.createElement('canvas');
      const ctx = previewCanvas.getContext('2d');
      
      if (!ctx) return;

      // Set preview size (smaller for performance)
      const previewWidth = 400;
      const previewHeight = 300;
      previewCanvas.width = previewWidth;
      previewCanvas.height = previewHeight;

      // Draw background
      if (exportOptions.includeBackground) {
        ctx.fillStyle = exportOptions.backgroundColor;
        ctx.fillRect(0, 0, previewWidth, previewHeight);
      }

      // Scale and draw the original canvas
      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, previewWidth, previewHeight);

      // Generate preview URL
      const url = previewCanvas.toDataURL('image/png', 0.8);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Error generating preview:', error);
    }
  }, [canvasRef, exportOptions.includeBackground, exportOptions.backgroundColor]);

  // Generate preview when options change
  React.useEffect(() => {
    if (isOpen) {
      generatePreview();
    }
  }, [isOpen, generatePreview]);

  // Export to PNG
  const exportToPNG = useCallback(async (): Promise<Blob> => {
    if (!canvasRef.current) throw new Error('Canvas not available');

    const canvas = canvasRef.current;
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    
    if (!ctx) throw new Error('Canvas context not available');

    // Set export size with quality multiplier
    const qualityMultiplier = QUALITY_OPTIONS.find(q => q.value === exportOptions.quality)?.multiplier || 1;
    exportCanvas.width = exportOptions.width * qualityMultiplier;
    exportCanvas.height = exportOptions.height * qualityMultiplier;

    // Draw background
    if (exportOptions.includeBackground) {
      ctx.fillStyle = exportOptions.backgroundColor;
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    // Scale and draw the original canvas
    ctx.drawImage(
      canvas, 
      0, 0, canvas.width, canvas.height,
      0, 0, exportCanvas.width, exportCanvas.height
    );

    return new Promise((resolve) => {
      exportCanvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          throw new Error('Failed to generate PNG blob');
        }
      }, 'image/png', 1.0);
    });
  }, [canvasRef, exportOptions]);

  // Export to SVG
  const exportToSVG = useCallback(async (): Promise<Blob> => {
    const { width, height } = exportOptions;
    
    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

    // Add background
    if (exportOptions.includeBackground) {
      svgContent += `\n  <rect width="100%" height="100%" fill="${exportOptions.backgroundColor}"/>`;
    }

    // Convert elements to SVG
    elements.forEach(element => {
      switch (element.type) {
        case 'pen':
        case 'eraser':
          if (element.points && element.points.length > 1) {
            const pathData = element.points.reduce((path, point, index) => {
              return path + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
            }, '');
            svgContent += `\n  <path d="${pathData}" fill="none" stroke="${element.color}" stroke-width="${element.size}" stroke-linecap="round" stroke-linejoin="round"/>`;
          }
          break;

        case 'rectangle':
          if (element.x !== undefined && element.y !== undefined && element.width && element.height) {
            svgContent += `\n  <rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" fill="none" stroke="${element.color}" stroke-width="${element.size}"/>`;
          }
          break;

        case 'circle':
          if (element.x !== undefined && element.y !== undefined && element.width) {
            const cx = element.x + element.width / 2;
            const cy = element.y + element.width / 2;
            const r = Math.abs(element.width) / 2;
            svgContent += `\n  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${element.color}" stroke-width="${element.size}"/>`;
          }
          break;

        case 'text':
          if (element.x !== undefined && element.y !== undefined && element.text) {
            const escapedText = element.text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
            svgContent += `\n  <text x="${element.x}" y="${element.y}" fill="${element.color}" font-size="${element.size}" font-family="Arial">${escapedText}</text>`;
          }
          break;
      }
    });

    svgContent += '\n</svg>';

    return new Blob([svgContent], { type: 'image/svg+xml' });
  }, [elements, exportOptions]);

  // Export to JSON
  const exportToJSON = useCallback(async (): Promise<Blob> => {
    const data = {
      whiteboardId,
      name: whiteboardName,
      elements,
      metadata: exportOptions.includeMetadata ? {
        exportedAt: new Date().toISOString(),
        elementCount: elements.length,
        canvasSize: { width: 800, height: 600 },
        exportOptions
      } : undefined,
      version: '1.0'
    };

    const jsonString = JSON.stringify(data, null, 2);
    return new Blob([jsonString], { type: 'application/json' });
  }, [whiteboardId, whiteboardName, elements, exportOptions]);

  // Export to PDF (using backend API)
  const exportToPDF = useCallback(async (): Promise<Blob> => {
    try {
      const response = await apiClient.post(`/whiteboards/${whiteboardId}/export`, {
        format: 'pdf',
        options: exportOptions
      }, {
        responseType: 'blob'
      });

      return response.data;
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw new Error('Failed to export to PDF');
    }
  }, [whiteboardId, exportOptions]);

  // Main export function
  const handleExport = useCallback(async () => {
    if (!canvasRef.current) {
      toast.error('Canvas not available for export');
      return;
    }

    setIsExporting(true);

    try {
      let blob: Blob;

      switch (exportOptions.format) {
        case 'png':
          blob = await exportToPNG();
          break;
        case 'svg':
          blob = await exportToSVG();
          break;
        case 'pdf':
          blob = await exportToPDF();
          break;
        case 'json':
          blob = await exportToJSON();
          break;
        default:
          throw new Error('Unsupported export format');
      }

      // Download the file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${exportOptions.filename}.${exportOptions.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Whiteboard exported as ${exportOptions.format.toUpperCase()}`);
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export whiteboard');
    } finally {
      setIsExporting(false);
    }
  }, [canvasRef, exportOptions, exportToPNG, exportToSVG, exportToPDF, exportToJSON]);

  // Quick export (PNG with default settings)
  const handleQuickExport = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${whiteboardName || 'whiteboard'}.png`;
      link.click();
      
      toast.success('Whiteboard exported as PNG');
    } catch (error) {
      console.error('Quick export error:', error);
      toast.error('Failed to export whiteboard');
    }
  }, [canvasRef, whiteboardName]);

  return (
    <div className={className}>
      {/* Quick Export Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleQuickExport}
        className="mr-2"
        title="Quick Export as PNG"
      >
        <Download className="h-4 w-4" />
      </Button>

      {/* Advanced Export Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" title="Advanced Export Options">
            <FileImage className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Whiteboard</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Export Options */}
            <div className="space-y-6">
              {/* Format Selection */}
              <div>
                <Label className="text-base font-medium">Export Format</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {EXPORT_FORMATS.map(format => {
                    const Icon = format.icon;
                    return (
                      <Card 
                        key={format.value}
                        className={`cursor-pointer transition-colors ${
                          exportOptions.format === format.value 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => updateOptions({ format: format.value as any })}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <div>
                              <div className="font-medium text-sm">{format.label}</div>
                              <div className="text-xs text-muted-foreground">{format.description}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Size and Quality */}
              {(exportOptions.format === 'png' || exportOptions.format === 'svg' || exportOptions.format === 'pdf') && (
                <div className="space-y-4">
                  <div>
                    <Label>Size Preset</Label>
                    <Select onValueChange={(value) => {
                      const preset = PRESET_SIZES.find(p => p.label === value);
                      if (preset) {
                        updateOptions({ width: preset.width, height: preset.height });
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESET_SIZES.map(preset => (
                          <SelectItem key={preset.label} value={preset.label}>
                            {preset.label} ({preset.width}×{preset.height})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Width (px)</Label>
                      <Input
                        type="number"
                        value={exportOptions.width}
                        onChange={(e) => updateOptions({ width: parseInt(e.target.value) || 800 })}
                        min="100"
                        max="10000"
                      />
                    </div>
                    <div>
                      <Label>Height (px)</Label>
                      <Input
                        type="number"
                        value={exportOptions.height}
                        onChange={(e) => updateOptions({ height: parseInt(e.target.value) || 600 })}
                        min="100"
                        max="10000"
                      />
                    </div>
                  </div>

                  {exportOptions.format === 'png' && (
                    <div>
                      <Label>Quality</Label>
                      <Select value={exportOptions.quality} onValueChange={(value: any) => updateOptions({ quality: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUALITY_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Background Options */}
              {exportOptions.format !== 'json' && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeBackground"
                      checked={exportOptions.includeBackground}
                      onCheckedChange={(checked) => updateOptions({ includeBackground: !!checked })}
                    />
                    <Label htmlFor="includeBackground">Include background</Label>
                  </div>
                  
                  {exportOptions.includeBackground && (
                    <div>
                      <Label>Background Color</Label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="color"
                          value={exportOptions.backgroundColor}
                          onChange={(e) => updateOptions({ backgroundColor: e.target.value })}
                          className="w-12 h-8 rounded border cursor-pointer"
                        />
                        <Input
                          value={exportOptions.backgroundColor}
                          onChange={(e) => updateOptions({ backgroundColor: e.target.value })}
                          placeholder="#ffffff"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Filename */}
              <div>
                <Label>Filename</Label>
                <Input
                  value={exportOptions.filename}
                  onChange={(e) => updateOptions({ filename: e.target.value })}
                  placeholder="whiteboard-export"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  File will be saved as: {exportOptions.filename}.{exportOptions.format}
                </div>
              </div>

              {/* Metadata for JSON */}
              {exportOptions.format === 'json' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeMetadata"
                    checked={exportOptions.includeMetadata}
                    onCheckedChange={(checked) => updateOptions({ includeMetadata: !!checked })}
                  />
                  <Label htmlFor="includeMetadata">Include metadata</Label>
                </div>
              )}
            </div>

            {/* Preview */}
            <div>
              <Label className="text-base font-medium">Preview</Label>
              <Card className="mt-2">
                <CardContent className="p-4">
                  {previewUrl ? (
                    <div className="space-y-3">
                      <img 
                        src={previewUrl} 
                        alt="Export preview" 
                        className="w-full border rounded"
                        style={{ aspectRatio: `${exportOptions.width}/${exportOptions.height}` }}
                      />
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Format: <Badge variant="secondary">{exportOptions.format.toUpperCase()}</Badge></div>
                        <div>Size: {exportOptions.width} × {exportOptions.height}px</div>
                        {exportOptions.format === 'png' && (
                          <div>Quality: {QUALITY_OPTIONS.find(q => q.value === exportOptions.quality)?.label}</div>
                        )}
                        <div>Elements: {elements.length}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Generating preview...
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {exportOptions.format.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}