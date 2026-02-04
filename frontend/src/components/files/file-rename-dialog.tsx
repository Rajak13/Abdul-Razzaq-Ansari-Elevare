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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useUpdateFile } from '@/hooks/use-files';
import { UserFile } from '@/types/file';

interface FileRenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: UserFile | null;
}

export function FileRenameDialog({ open, onOpenChange, file }: FileRenameDialogProps) {
  const t = useTranslations('files');
  const tCommon = useTranslations('common');
  const [name, setName] = useState('');
  const updateFile = useUpdateFile();

  useEffect(() => {
    if (file) {
      setName(file.name);
    }
  }, [file]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !name.trim()) {
      toast.error(t('rename.nameRequired'));
      return;
    }

    try {
      await updateFile.mutateAsync({
        id: file.id,
        data: { name: name.trim() },
      });
      toast.success(t('rename.success'));
      onOpenChange(false);
    } catch (error) {
      toast.error(t('rename.error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('rename.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fileName">{t('rename.newName')}</Label>
            <Input
              id="fileName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('rename.placeholder')}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={updateFile.isPending}>
              {tCommon('rename')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
