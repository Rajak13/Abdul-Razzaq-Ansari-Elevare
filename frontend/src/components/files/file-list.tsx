'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  MoreVertical,
  Download,
  Trash2,
  Edit,
  FolderInput,
  Grid,
  List,
  Search,
  Share2,
  Folder,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import { UserFile, FileFolder } from '@/types/file';

interface FileListProps {
  files: UserFile[];
  folders: FileFolder[];
  currentFolderId: string | null;
  onFolderSelect: (id: string | null) => void;
  isLoading: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onFileSelect: (file: UserFile) => void;
  onFileDownload: (file: UserFile) => void;
  onFileDelete: (file: UserFile) => void;
  onFileRename: (file: UserFile) => void;
  onFileMove: (file: UserFile) => void;
  selectedFiles: Set<string>;
  onSelectionChange: (fileId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

function getFileIcon(mimeType: string, size: 'sm' | 'lg' = 'sm') {
  const sizeClass = size === 'lg' ? 'h-12 w-12' : 'h-5 w-5';
  if (mimeType.startsWith('image/')) return <Image className={`${sizeClass} text-green-500`} />;
  if (mimeType.startsWith('video/')) return <Video className={`${sizeClass} text-purple-500`} />;
  if (mimeType.startsWith('audio/')) return <Music className={`${sizeClass} text-pink-500`} />;
  if (mimeType.includes('pdf')) return <FileText className={`${sizeClass} text-red-500`} />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar'))
    return <Archive className={`${sizeClass} text-yellow-500`} />;
  return <File className={`${sizeClass} text-primary`} />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function FileList({
  files,
  folders,
  currentFolderId,
  onFolderSelect,
  isLoading,
  viewMode,
  onViewModeChange,
  onFileSelect,
  onFileDownload,
  onFileDelete,
  onFileRename,
  onFileMove,
  selectedFiles,
  onSelectionChange,
  onSelectAll,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
}: FileListProps) {
  const t = useTranslations('files');
  const tCommon = useTranslations('common');

  const getFolderName = (folderId?: string) => {
    if (!folderId) return t('folders.rootFolder');
    const folder = folders.find((f) => f.id === folderId);
    return folder?.name || t('folders.unknown');
  };

  const allSelected = files.length > 0 && selectedFiles.size === files.length;
  const someSelected = selectedFiles.size > 0 && selectedFiles.size < files.length;

  const currentSubfolders = useMemo(() => {
    return folders.filter((f) => f.parent_id === (currentFolderId || undefined));
  }, [folders, currentFolderId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className={viewMode === 'grid' ? 'flex flex-col gap-1.5' : 'space-y-2'}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={tCommon('sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">{t('sort.dateCreated')}</SelectItem>
              <SelectItem value="updated_at">{t('sort.dateModified')}</SelectItem>
              <SelectItem value="name">{t('sort.name')}</SelectItem>
              <SelectItem value="size">{t('sort.size')}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-r-none"
              onClick={() => onViewModeChange('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-l-none"
              onClick={() => onViewModeChange('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Selection Header */}
      {files.length > 0 && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => onSelectAll(!!checked)}
            className="data-[state=indeterminate]:bg-primary"
            {...(someSelected ? { 'data-state': 'indeterminate' } : {})}
          />
          <span>
            {selectedFiles.size > 0
              ? t('selection.selected', { count: selectedFiles.size })
              : t('selection.selectAll')}
          </span>
        </div>
      )}

      {/* File List/Grid */}
      {files.length === 0 && currentSubfolders.length === 0 ? (
        <div className="py-20 text-center bg-muted/50 rounded-3xl border border-dashed border-border">
          <File className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-sm font-bold text-muted-foreground">{t('empty.title')}</h3>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="space-y-6">
          {/* Folders Section */}
          {currentSubfolders.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Folders</h3>
              <div className="flex flex-col gap-1">
                {currentSubfolders.map((folder) => (
                  <FolderCard key={folder.id} folder={folder} onSelect={onFolderSelect} />
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {files.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 px-1">Files</h3>
              <div className="flex flex-col gap-1">
                {files.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => onFileSelect(file)}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors",
                      selectedFiles.has(file.id) && 'ring-2 ring-primary'
                    )}
                  >
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={(checked) => onSelectionChange(file.id, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {getFileIcon(file.mime_type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)} · {formatDistanceToNow(new Date(file.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    {file.is_shared && <Share2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onFileDownload(file)} className="text-xs">
                          <Download className="mr-2 h-3.5 w-3.5" />{tCommon('download')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onFileRename(file)} className="text-xs">
                          <Edit className="mr-2 h-3.5 w-3.5" />{tCommon('rename')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onFileMove(file)} className="text-xs">
                          <FolderInput className="mr-2 h-3.5 w-3.5" />{tCommon('move')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onFileDelete(file)} className="text-destructive text-xs">
                          <Trash2 className="mr-2 h-3.5 w-3.5" />{tCommon('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                "group flex items-center gap-4 rounded-lg border bg-card p-3 transition-all hover:shadow-sm cursor-pointer",
                selectedFiles.has(file.id) && 'ring-2 ring-primary'
              )}
              onClick={() => onFileSelect(file)}
            >
              <Checkbox
                checked={selectedFiles.has(file.id)}
                onCheckedChange={(checked) => onSelectionChange(file.id, !!checked)}
                onClick={(e) => e.stopPropagation()}
              />

              {getFileIcon(file.mime_type)}

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {getFolderName(file.folder_id)} • {formatFileSize(file.size)} •{' '}
                  {formatDistanceToNow(new Date(file.updated_at), { addSuffix: true })}
                </p>
              </div>

              {file.is_shared && <Share2 className="h-4 w-4 text-muted-foreground" />}

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onFileDownload(file)}>
                    <Download className="mr-2 h-4 w-4" />
                    {tCommon('download')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileRename(file)}>
                    <Edit className="mr-2 h-4 w-4" />
                    {tCommon('rename')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileMove(file)}>
                    <FolderInput className="mr-2 h-4 w-4" />
                    {tCommon('move')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onFileDelete(file)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {tCommon('delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FolderCard({ folder, onSelect }: { folder: FileFolder; onSelect: (id: string) => void }) {
  const folderColor = folder.color || 'hsl(217, 91%, 60%)';

  return (
    <div
      onClick={() => onSelect(folder.id)}
      className="group flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors"
    >
      <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: folderColor }}>
        <Folder className="w-4 h-4 text-white" />
      </div>
      <p className="flex-1 text-sm font-medium text-foreground truncate">{folder.name}</p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-xs">
            <Edit className="mr-2 h-3.5 w-3.5" />Edit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
