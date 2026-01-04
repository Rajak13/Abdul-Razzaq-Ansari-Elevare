'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Users, Eye, Lock } from 'lucide-react';
import { WhiteboardCanvas } from './whiteboard-canvas';
import apiClient from '@/lib/api-client';

interface Whiteboard {
  id: string;
  name: string;
  description?: string;
  group_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  permission: 'VIEW' | 'EDIT' | 'ADMIN';
  creator_name: string;
}

interface WhiteboardManagerProps {
  groupId: string;
  userRole: 'owner' | 'admin' | 'member';
  className?: string;
}

export function WhiteboardManager({ 
  groupId, 
  userRole, 
  className = '' 
}: WhiteboardManagerProps) {
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [selectedWhiteboard, setSelectedWhiteboard] = useState<Whiteboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWhiteboard, setEditingWhiteboard] = useState<Whiteboard | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const canCreateWhiteboard = userRole === 'owner' || userRole === 'admin';

  // Fetch whiteboards
  useEffect(() => {
    fetchWhiteboards();
  }, [groupId]);

  const fetchWhiteboards = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(`/whiteboards/group/${groupId}`);
      setWhiteboards(response.data.whiteboards || []);
    } catch (error) {
      console.error('Error fetching whiteboards:', error);
      toast.error('Failed to load whiteboards');
    } finally {
      setIsLoading(false);
    }
  };

  const createWhiteboard = async () => {
    if (!formData.name.trim()) {
      toast.error('Whiteboard name is required');
      return;
    }

    try {
      const response = await apiClient.post('/whiteboards', {
        name: formData.name,
        description: formData.description,
        group_id: groupId,
      });

      toast.success('Whiteboard created successfully');
      setFormData({ name: '', description: '' });
      setIsCreateDialogOpen(false);
      fetchWhiteboards();
    } catch (error) {
      console.error('Error creating whiteboard:', error);
      toast.error('Failed to create whiteboard');
    }
  };

  const updateWhiteboard = async () => {
    if (!editingWhiteboard || !formData.name.trim()) {
      return;
    }

    try {
      await apiClient.put(`/whiteboards/${editingWhiteboard.id}`, {
        name: formData.name,
        description: formData.description,
      });

      toast.success('Whiteboard updated successfully');
      setFormData({ name: '', description: '' });
      setIsEditDialogOpen(false);
      setEditingWhiteboard(null);
      fetchWhiteboards();
    } catch (error) {
      console.error('Error updating whiteboard:', error);
      toast.error('Failed to update whiteboard');
    }
  };

  const deleteWhiteboard = async (whiteboardId: string) => {
    if (!confirm('Are you sure you want to delete this whiteboard? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.delete(`/whiteboards/${whiteboardId}`);

      toast.success('Whiteboard deleted successfully');

      if (selectedWhiteboard?.id === whiteboardId) {
        setSelectedWhiteboard(null);
      }

      fetchWhiteboards();
    } catch (error) {
      console.error('Error deleting whiteboard:', error);
      toast.error('Failed to delete whiteboard');
    }
  };

  const openEditDialog = (whiteboard: Whiteboard) => {
    setEditingWhiteboard(whiteboard);
    setFormData({
      name: whiteboard.name,
      description: whiteboard.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'ADMIN':
        return <Lock className="h-4 w-4 text-red-500" />;
      case 'EDIT':
        return <Edit className="h-4 w-4 text-blue-500" />;
      case 'VIEW':
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getPermissionBadge = (permission: string) => {
    const variants = {
      ADMIN: 'destructive',
      EDIT: 'default',
      VIEW: 'secondary',
    } as const;

    return (
      <Badge variant={variants[permission as keyof typeof variants] || 'secondary'}>
        {permission}
      </Badge>
    );
  };

  if (selectedWhiteboard) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">{selectedWhiteboard.name}</h3>
            {selectedWhiteboard.description && (
              <p className="text-sm text-muted-foreground">{selectedWhiteboard.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getPermissionBadge(selectedWhiteboard.permission)}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedWhiteboard(null)}
            >
              Back to List
            </Button>
          </div>
        </div>

        <WhiteboardCanvas
          whiteboardId={selectedWhiteboard.id}
          groupId={groupId}
          canEdit={selectedWhiteboard.permission === 'EDIT' || selectedWhiteboard.permission === 'ADMIN'}
          className="w-full"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Whiteboards</h2>
          <p className="text-sm text-muted-foreground">
            Collaborative whiteboards for your study group
          </p>
        </div>

        {canCreateWhiteboard && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Whiteboard
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Whiteboard</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter whiteboard name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter whiteboard description"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setFormData({ name: '', description: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={createWhiteboard}>
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading whiteboards...</div>
        </div>
      ) : whiteboards.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              No whiteboards found for this group
            </div>
            {canCreateWhiteboard && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Whiteboard
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {whiteboards.map((whiteboard) => (
            <Card key={whiteboard.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{whiteboard.name}</CardTitle>
                    {whiteboard.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {whiteboard.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {getPermissionIcon(whiteboard.permission)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Created by {whiteboard.creator_name}
                  </div>
                  {getPermissionBadge(whiteboard.permission)}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => setSelectedWhiteboard(whiteboard)}
                    className="flex-1"
                  >
                    Open
                  </Button>
                  {(whiteboard.permission === 'ADMIN' || userRole === 'owner') && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(whiteboard)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteWhiteboard(whiteboard.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Whiteboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter whiteboard name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter whiteboard description"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingWhiteboard(null);
                  setFormData({ name: '', description: '' });
                }}
              >
                Cancel
              </Button>
              <Button onClick={updateWhiteboard}>
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}