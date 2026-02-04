'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  X,
  FileText,
  Image,
  Video,
  File,
  Music,
  Archive,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useUploadFile, useFileFolders } from '@/hooks/use-files';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  defaultFolderId?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-8 w-8 text-green-500" />;
  if (mimeType.startsWith('video/')) return <Video className="h-8 w-8 text-purple-500" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-8 w-8 text-pink-500" />;
  if (mimeType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar'))
    return <Archive className="h-8 w-8 text-yellow-500" />;
  return <File className="h-8 w-8 text-blue-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function FileUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  defaultFolderId,
}: FileUploadModalProps) {
  const t = useTranslations('files');
  const tCommon = useTranslations('common');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [folderId, setFolderId] = useState<string | undefined>(defaultFolderId);
  const [dragActive, setDragActive] = useState(false);

  const { data: folders = [] } = useFileFolders();
  const uploadFile = useUploadFile();

  const handleFileSelect = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(t('upload.fileTooLarge', { size: '50MB' }));
        return;
      }

      setSelectedFile(file);
      setFileName(file.name.replace(/\.[^/.]+$/, ''));
    },
    [t]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t('upload.noFileSelected'));
      return;
    }

    try {
      await uploadFile.mutateAsync({
        file: selectedFile,
        name: fileName || selectedFile.name,
        folderId,
      });
      toast.success(t('upload.success'));
      onUploadSuccess();
      handleClose();
    } catch (error) {
      toast.error(t('upload.error'));
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setFileName('');
    setFolderId(defaultFolderId);
    onClose();
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileName('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('upload.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop Zone */}
          {!selectedFile && (
            <div
              className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={handleInputChange}
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {t('upload.dragDrop')}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {t('upload.maxSize', { size: '50MB' })}
              </p>
            </div>
          )}

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="rounded-lg border bg-gray-50 dark:bg-gray-800 p-4">
              <div className="flex items-center gap-4">
                {getFileIcon(selectedFile.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={removeFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* File Name */}
          {selectedFile && (
            <div className="space-y-2">
              <Label htmlFor="fileName">{t('upload.fileName')}</Label>
              <Input
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder={t('upload.fileNamePlaceholder')}
              />
            </div>
          )}

          {/* Folder Selection */}
          <div className="space-y-2">
            <Label>{t('upload.selectFolder')}</Label>
            <Select
              value={folderId || 'root'}
              onValueChange={(value) => setFolderId(value === 'root' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('upload.rootFolder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">{t('upload.rootFolder')}</SelectItem>
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

          {/* Upload Progress */}
          {uploadFile.isPending && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('upload.uploading')}
              </div>
              <Progress value={50} className="h-2" />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadFile.isPending}
            >
              {uploadFile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('upload.uploading')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('upload.uploadButton')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
