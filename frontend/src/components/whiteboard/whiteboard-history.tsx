'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  History, 
  RotateCcw, 
  Eye, 
  Calendar,
  User,
  FileText,
  Loader2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import apiClient from '@/lib/api-client';

interface WhiteboardVersion {
  id: string;
  version_number: number;
  canvas_data: any;
  created_at: string;
  created_by: string;
  creator_name?: string;
  description?: string;
  element_count?: number;
  changes_summary?: string;
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

interface WhiteboardHistoryProps {
  whiteboardId: string;
  currentElements: DrawingElement[];
  onRestore: (elements: DrawingElement[]) => void;
  canEdit: boolean;
  className?: string;
}

export function WhiteboardHistory({
  whiteboardId,
  currentElements,
  onRestore,
  canEdit,
  className = ''
}: WhiteboardHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<WhiteboardVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<WhiteboardVersion | null>(null);
  const [previewElements, setPreviewElements] = useState<DrawingElement[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Fetch version history
  const fetchVersions = useCallback(async () => {
    if (!whiteboardId) return;

    setIsLoading(true);
    try {
      const response = await apiClient.get(`/whiteboards/${whiteboardId}/history`);
      const versionsData = response.data.versions || [];
      
      // Process versions and add metadata
      const processedVersions = versionsData.map((version: any) => {
        const canvasData = typeof version.canvas_data === 'string' 
          ? JSON.parse(version.canvas_data) 
          : version.canvas_data;
        
        const elements = canvasData?.elements || [];
        
        return {
          ...version,
          element_count: elements.length,
          changes_summary: generateChangesSummary(elements)
        };
      });

      setVersions(processedVersions);
    } catch (error) {
      console.error('Error fetching whiteboard history:', error);
      toast.error('Failed to load whiteboard history');
    } finally {
      setIsLoading(false);
    }
  }, [whiteboardId]);

  // Generate a summary of changes in a version
  const generateChangesSummary = useCallback((elements: DrawingElement[]): string => {
    if (elements.length === 0) return 'Empty whiteboard';

    const typeCounts = elements.reduce((acc, element) => {
      acc[element.type] = (acc[element.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const summaryParts: string[] = [];
    
    if (typeCounts.pen) summaryParts.push(`${typeCounts.pen} drawing${typeCounts.pen > 1 ? 's' : ''}`);
    if (typeCounts.text) summaryParts.push(`${typeCounts.text} text${typeCounts.text > 1 ? 's' : ''}`);
    if (typeCounts.rectangle) summaryParts.push(`${typeCounts.rectangle} rectangle${typeCounts.rectangle > 1 ? 's' : ''}`);
    if (typeCounts.circle) summaryParts.push(`${typeCounts.circle} circle${typeCounts.circle > 1 ? 's' : ''}`);

    return summaryParts.join(', ') || `${elements.length} elements`;
  }, []);

  // Preview a version
  const previewVersion = useCallback(async (version: WhiteboardVersion) => {
    setSelectedVersion(version);
    
    try {
      const canvasData = typeof version.canvas_data === 'string' 
        ? JSON.parse(version.canvas_data) 
        : version.canvas_data;
      
      const elements = canvasData?.elements || [];
      setPreviewElements(elements);
      setIsPreviewMode(true);
    } catch (error) {
      console.error('Error previewing version:', error);
      toast.error('Failed to preview version');
    }
  }, []);

  // Restore a version
  const restoreVersion = useCallback(async (version: WhiteboardVersion) => {
    if (!canEdit) {
      toast.error('You do not have permission to restore versions');
      return;
    }

    const confirmRestore = confirm(
      `Are you sure you want to restore to version ${version.version_number}? ` +
      'This will replace the current whiteboard content and cannot be undone.'
    );

    if (!confirmRestore) return;

    setIsRestoring(true);
    try {
      await apiClient.post(`/whiteboards/${whiteboardId}/restore`, {
        version_number: version.version_number
      });

      const canvasData = typeof version.canvas_data === 'string' 
        ? JSON.parse(version.canvas_data) 
        : version.canvas_data;
      
      const elements = canvasData?.elements || [];
      onRestore(elements);
      
      toast.success(`Restored to version ${version.version_number}`);
      setIsOpen(false);
      setIsPreviewMode(false);
      
      // Refresh versions to show the new current state
      fetchVersions();
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Failed to restore version');
    } finally {
      setIsRestoring(false);
    }
  }, [whiteboardId, canEdit, onRestore, fetchVersions]);

  // Create a manual version snapshot
  const createSnapshot = useCallback(async () => {
    if (!canEdit) {
      toast.error('You do not have permission to create snapshots');
      return;
    }

    try {
      const canvasData = {
        elements: currentElements,
        version: Date.now(),
        background: '#ffffff'
      };

      await apiClient.post(`/whiteboards/${whiteboardId}/versions`, {
        canvas_data: canvasData,
        description: 'Manual snapshot'
      });

      toast.success('Snapshot created successfully');
      fetchVersions();
    } catch (error) {
      console.error('Error creating snapshot:', error);
      toast.error('Failed to create snapshot');
    }
  }, [whiteboardId, currentElements, canEdit, fetchVersions]);

  // Format date for display
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }, []);

  // Load versions when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, fetchVersions]);

  // Exit preview mode
  const exitPreview = useCallback(() => {
    setIsPreviewMode(false);
    setSelectedVersion(null);
    setPreviewElements([]);
  }, []);

  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" title="View History">
            <History className="h-4 w-4 mr-2" />
            History
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Whiteboard History
              {versions.length > 0 && (
                <Badge variant="secondary">{versions.length} versions</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {isPreviewMode && selectedVersion ? (
            // Preview Mode
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Previewing Version {selectedVersion.version_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(selectedVersion.created_at)} • {selectedVersion.changes_summary}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {canEdit && (
                    <Button
                      onClick={() => restoreVersion(selectedVersion)}
                      disabled={isRestoring}
                      size="sm"
                    >
                      {isRestoring ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restore
                        </>
                      )}
                    </Button>
                  )}
                  <Button variant="outline" onClick={exitPreview} size="sm">
                    Back to List
                  </Button>
                </div>
              </div>

              {/* Preview Canvas */}
              <Card>
                <CardContent className="p-4">
                  <div className="border rounded-lg bg-white overflow-hidden">
                    <canvas
                      width={800}
                      height={400}
                      className="block w-full"
                      ref={(canvas) => {
                        if (canvas && previewElements.length > 0) {
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            // Clear canvas
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            
                            // Draw elements
                            previewElements.forEach(element => {
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
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground text-center">
                    Preview of version {selectedVersion.version_number} • {previewElements.length} elements
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Version List Mode
            <div className="space-y-4">
              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {versions.length > 0 ? `${versions.length} versions available` : 'No versions found'}
                </div>
                {canEdit && (
                  <Button onClick={createSnapshot} size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Create Snapshot
                  </Button>
                )}
              </div>

              {/* Version List */}
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading history...
                  </div>
                ) : versions.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <div className="text-muted-foreground mb-2">No version history available</div>
                      <div className="text-sm text-muted-foreground">
                        Versions are automatically created when significant changes are made
                      </div>
                      {canEdit && (
                        <Button onClick={createSnapshot} className="mt-4" size="sm">
                          Create First Snapshot
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {versions.map((version, index) => (
                      <Card 
                        key={version.id}
                        className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                          index === 0 ? 'border-blue-200 bg-blue-50' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={index === 0 ? 'default' : 'secondary'}>
                                  Version {version.version_number}
                                </Badge>
                                {index === 0 && (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(version.created_at)}
                                  </div>
                                  {version.creator_name && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {version.creator_name}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    {version.element_count} elements
                                  </div>
                                </div>
                                
                                {version.changes_summary && (
                                  <div className="text-sm">
                                    {version.changes_summary}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => previewVersion(version)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              
                              {canEdit && index !== 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => restoreVersion(version)}
                                  disabled={isRestoring}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  Restore
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {!canEdit && versions.length > 0 && (
                <div className="text-center text-sm text-muted-foreground p-3 bg-gray-50 rounded-lg">
                  You have view-only access. Contact the whiteboard owner to restore versions.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}