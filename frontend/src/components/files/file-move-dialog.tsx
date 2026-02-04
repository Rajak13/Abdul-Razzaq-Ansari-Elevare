'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useUpdateFile, useFileFolders } from '@/hooks/use-files';
import { UserFile } from '@/types/file';

interface FileMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: UserFile | null;
}

export function FileMoveDialog({ open, onOpenChange, file }: FileMoveDialogProps) {
  const t = useTranslations('files');
  const tCommon = useTranslations('common');
  const [folderId, setFolderId] = useState<string | undefined>();
  const { data: folders = [] } = useFileFolders();
  const updateFile = useUpdateFile();

  useEffect(() => {
    if (file) {
      setFolderId(file.folder_id);
    }
  }, [file]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) return;

    try {
      await updateFile.mutateAsync({
        id: file.id,
        data: { folder_id: folderId },
      });
      toast.success(t('move.success'));
      onOpenChange(false);
    } catch (error) {
      toast.error(t('move.error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('move.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('move.selectFolder')}</Label>
            <Select
              value={folderId || 'root'}
              onValueChange={(value) => setFolderId(value === 'root' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('move.rootFolder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">{t('move.rootFolder')}</SelectItem>
                {folders.map((folder) => (
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={updateFile.isPending}>
              {tCommon('move')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
