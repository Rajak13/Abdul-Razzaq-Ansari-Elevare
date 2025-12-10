'use client'

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateNoteFolder, useUpdateNoteFolder, useNoteFolders } from '@/hooks/use-note-folders';
import { NoteFolder } from '@/types/note';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: NoteFolder | null;
  parentId?: string;
}

const folderColors = [
  '#6b7280', // Gray
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
];

export function FolderDialog({
  open,
  onOpenChange,
  folder,
  parentId,
}: FolderDialogProps) {
  const [name, setName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(parentId);
  const [color, setColor] = useState(folderColors[0]);

  const { data: folders = [] } = useNoteFolders();
  const createFolder = useCreateNoteFolder();
  const updateFolder = useUpdateNoteFolder();

  const isEditing = !!folder;

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setSelectedParentId(folder.parent_id);
      setColor(folder.color || folderColors[0]);
    } else {
      setName('');
      setSelectedParentId(parentId);
      setColor(folderColors[0]);
    }
  }, [folder, parentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      if (isEditing && folder) {
        await updateFolder.mutateAsync({
          id: folder.id,
          data: {
            name: name.trim(),
            parent_id: selectedParentId || undefined,
            color,
          },
        });
        toast.success('Folder updated successfully');
      } else {
        await createFolder.mutateAsync({
          name: name.trim(),
          parent_id: selectedParentId || undefined,
          color,
        });
        toast.success('Folder created successfully');
      }
      
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Failed to update folder' : 'Failed to create folder');
    }
  };

  // Filter out the current folder and its descendants from parent options
  const availableParents = folders.filter(f => {
    if (isEditing && folder) {
      return f.id !== folder.id && !isDescendant(f, folder.id, folders);
    }
    return true;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Folder' : 'Create New Folder'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Folder Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent">Parent Folder (Optional)</Label>
            <Select value={selectedParentId || 'none'} onValueChange={(value) => 
              setSelectedParentId(value === 'none' ? undefined : value)
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select parent folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No parent (root level)</SelectItem>
                {availableParents.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: folder.color || '#6b7280' }}
                      />
                      {folder.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {folderColors.map((folderColor) => (
                <button
                  key={folderColor}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 ${
                    color === folderColor ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: folderColor }}
                  onClick={() => setColor(folderColor)}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createFolder.isPending || updateFolder.isPending}
            >
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to check if a folder is a descendant of another
function isDescendant(folder: NoteFolder, ancestorId: string, allFolders: NoteFolder[]): boolean {
  if (folder.parent_id === ancestorId) {
    return true;
  }
  
  if (folder.parent_id) {
    const parent = allFolders.find(f => f.id === folder.parent_id);
    if (parent) {
      return isDescendant(parent, ancestorId, allFolders);
    }
  }
  
  return false;
}