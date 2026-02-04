'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateFileFolder, useUpdateFileFolder, useFileFolders } from '@/hooks/use-files';
import { FileFolder } from '@/types/file';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface FileFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder?: FileFolder | null;
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

export function FileFolderDialog({
  open,
  onOpenChange,
  folder,
  parentId,
}: FileFolderDialogProps) {
  const t = useTranslations('files');
  const tCommon = useTranslations('common');
  const [name, setName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(parentId);
  const [color, setColor] = useState(folderColors[0]);

  const { data: folders = [] } = useFileFolders();
  const createFolder = useCreateFileFolder();
  const updateFolder = useUpdateFileFolder();

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
      toast.error(t('folders.nameRequired'));
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
        toast.success(t('folders.updateSuccess'));
      } else {
        await createFolder.mutateAsync({
          name: name.trim(),
          parent_id: selectedParentId || undefined,
          color,
        });
        toast.success(t('folders.createSuccess'));
      }

      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? t('folders.updateError') : t('folders.createError'));
    }
  };

  // Filter out the current folder and its descendants from parent options
  const availableParents = folders.filter((f) => {
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
            {isEditing ? t('folders.editFolder') : t('folders.newFolder')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('folders.folderName')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('folders.folderNamePlaceholder')}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent">{t('folders.parentFolder')}</Label>
            <Select
              value={selectedParentId || 'none'}
              onValueChange={(value) =>
                setSelectedParentId(value === 'none' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('folders.selectParent')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('folders.noParent')}</SelectItem>
                {availableParents.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: f.color || '#6b7280' }}
                      />
                      {f.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('folders.color')}</Label>
            <div className="flex gap-2">
              {folderColors.map((folderColor) => (
                <button
                  key={folderColor}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === folderColor ? 'border-gray-900 dark:border-white scale-110' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: folderColor }}
                  onClick={() => setColor(folderColor)}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createFolder.isPending || updateFolder.isPending}
            >
              {isEditing ? tCommon('update') : tCommon('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to check if a folder is a descendant of another
function isDescendant(
  folder: FileFolder,
  ancestorId: string,
  allFolders: FileFolder[]
): boolean {
  if (folder.parent_id === ancestorId) {
    return true;
  }

  if (folder.parent_id) {
    const parent = allFolders.find((f) => f.id === folder.parent_id);
    if (parent) {
      return isDescendant(parent, ancestorId, allFolders);
    }
  }

  return false;
}
