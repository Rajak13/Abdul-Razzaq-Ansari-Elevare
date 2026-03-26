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
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import { UserFile, FileFolder } from '@/types/file';
import { useDownloadFolder } from '@/hooks/use-files';
import { toast } from 'sonner';

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

// File type → color + icon mapping (Finder-inspired)
function getFileTypeInfo(mimeType: string): { icon: React.ReactNode; color: string; bg: string } {
  if (mimeType.startsWith('image/'))
    return { icon: <Image className="h-7 w-7" />, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
  if (mimeType.startsWith('video/'))
    return { icon: <Video className="h-7 w-7" />, color: 'text-violet-500', bg: 'bg-violet-500/10' };
  if (mimeType.startsWith('audio/'))
    return { icon: <Music className="h-7 w-7" />, color: 'text-pink-500', bg: 'bg-pink-500/10' };
  if (mimeType.includes('pdf'))
    return { icon: <FileText className="h-7 w-7" />, color: 'text-red-500', bg: 'bg-red-500/10' };
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('7z'))
    return { icon: <Archive className="h-7 w-7" />, color: 'text-amber-500', bg: 'bg-amber-500/10' };
  return { icon: <File className="h-7 w-7" />, color: 'text-primary', bg: 'bg-primary/10' };
}

function getFileIconSmall(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-4 w-4 text-emerald-500" />;
  if (mimeType.startsWith('video/')) return <Video className="h-4 w-4 text-violet-500" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4 text-pink-500" />;
  if (mimeType.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar'))
    return <Archive className="h-4 w-4 text-amber-500" />;
  return <File className="h-4 w-4 text-primary" />;
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
  const downloadFolder = useDownloadFolder();

  const getFolderName = (folderId?: string) => {
    if (!folderId) return t('folders.rootFolder');
    return folders.find((f) => f.id === folderId)?.name || t('folders.unknown');
  };

  const allSelected = files.length > 0 && selectedFiles.size === files.length;
  const someSelected = selectedFiles.size > 0 && selectedFiles.size < files.length;

  const currentSubfolders = useMemo(
    () => folders.filter((f) => f.parent_id === (currentFolderId || undefined)),
    [folders, currentFolderId]
  );

  const handleFolderDownload = async (folder: FileFolder) => {
    try {
      await downloadFolder.mutateAsync({ id: folder.id });
      toast.success(`Downloaded "${folder.name}.zip"`);
    } catch {
      toast.error('Failed to download folder');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3' : 'space-y-2'}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-32 rounded-2xl' : 'h-12 rounded-xl'} />
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
            className="pl-9 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue placeholder={tCommon('sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">{t('sort.dateCreated')}</SelectItem>
              <SelectItem value="updated_at">{t('sort.dateModified')}</SelectItem>
              <SelectItem value="name">{t('sort.name')}</SelectItem>
              <SelectItem value="size">{t('sort.size')}</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center p-1 bg-muted rounded-xl border border-border">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className={cn('h-8 w-8 rounded-lg', viewMode === 'list' && 'bg-card shadow-sm')}
              onClick={() => onViewModeChange('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className={cn('h-8 w-8 rounded-lg', viewMode === 'grid' && 'bg-card shadow-sm')}
              onClick={() => onViewModeChange('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Selection header */}
      {files.length > 0 && viewMode === 'list' && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground px-1">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => onSelectAll(!!checked)}
            {...(someSelected ? { 'data-state': 'indeterminate' } : {})}
          />
          <span>
            {selectedFiles.size > 0
              ? t('selection.selected', { count: selectedFiles.size })
              : t('selection.selectAll')}
          </span>
        </div>
      )}

      {/* Empty state */}
      {files.length === 0 && currentSubfolders.length === 0 ? (
        <div className="py-20 text-center bg-muted/50 rounded-3xl border border-dashed border-border">
          <File className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-sm font-bold text-muted-foreground">{t('empty.title')}</h3>
        </div>
      ) : viewMode === 'grid' ? (
        // ── GRID / CARD VIEW (Apple Finder style) ──────────────────────────
        <div className="space-y-6">
          {currentSubfolders.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Folders</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {currentSubfolders.map((folder) => (
                  <FinderFolderCard
                    key={folder.id}
                    folder={folder}
                    onSelect={onFolderSelect}
                    onDownload={handleFolderDownload}
                    isDownloading={downloadFolder.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">Files</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {files.map((file) => (
                  <FinderFileCard
                    key={file.id}
                    file={file}
                    selected={selectedFiles.has(file.id)}
                    onSelect={onFileSelect}
                    onDownload={onFileDownload}
                    onDelete={onFileDelete}
                    onRename={onFileRename}
                    onMove={onFileMove}
                    onSelectionChange={onSelectionChange}
                    tCommon={tCommon}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // ── LIST VIEW ──────────────────────────────────────────────────────
        <div className="space-y-1">
          {currentSubfolders.map((folder) => (
            <div
              key={folder.id}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:bg-secondary cursor-pointer"
              onClick={() => onFolderSelect(folder.id)}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: folder.color || 'hsl(217,91%,60%)' }}
              >
                <Folder className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{folder.name}</p>
                <p className="text-xs text-muted-foreground">Folder</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleFolderDownload(folder); }} className="text-xs">
                    <Download className="mr-2 h-3.5 w-3.5" />Download as ZIP
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                'group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:bg-secondary cursor-pointer',
                selectedFiles.has(file.id) && 'ring-2 ring-primary bg-primary/5'
              )}
              onClick={() => onFileSelect(file)}
            >
              <Checkbox
                checked={selectedFiles.has(file.id)}
                onCheckedChange={(checked) => onSelectionChange(file.id, !!checked)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                {getFileIconSmall(file.mime_type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {getFolderName(file.folder_id)} · {formatFileSize(file.size)} ·{' '}
                  {formatDistanceToNow(new Date(file.updated_at), { addSuffix: true })}
                </p>
              </div>
              {file.is_shared && <Share2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onFileDownload(file)}>
                    <Download className="mr-2 h-4 w-4" />{tCommon('download')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileRename(file)}>
                    <Edit className="mr-2 h-4 w-4" />{tCommon('rename')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFileMove(file)}>
                    <FolderInput className="mr-2 h-4 w-4" />{tCommon('move')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onFileDelete(file)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />{tCommon('delete')}
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

// ── Apple Finder-style folder card ──────────────────────────────────────────
function FinderFolderCard({
  folder,
  onSelect,
  onDownload,
  isDownloading,
}: {
  folder: FileFolder;
  onSelect: (id: string) => void;
  onDownload: (folder: FileFolder) => void;
  isDownloading: boolean;
}) {
  const color = folder.color || 'hsl(217,91%,60%)';

  return (
    <div
      onClick={() => onSelect(folder.id)}
      className="group relative cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {/* Folder icon area */}
      <div className="mb-3 flex items-center justify-center">
        <div className="relative">
          {/* Folder tab */}
          <div
            className="absolute -top-2 left-1 h-2 w-10 rounded-t-md"
            style={{ backgroundColor: color }}
          />
          {/* Folder body */}
          <div
            className="w-16 h-12 rounded-b-xl rounded-tr-xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: color }}
          >
            <Folder className="w-6 h-6 text-white/90" />
          </div>
        </div>
      </div>

      <p className="text-xs font-semibold text-foreground truncate text-center leading-tight">{folder.name}</p>

      {/* Context menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDownload(folder); }}
            disabled={isDownloading}
            className="text-xs"
          >
            <Download className="mr-2 h-3.5 w-3.5" />Download as ZIP
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ── Apple Finder-style file card ─────────────────────────────────────────────
function FinderFileCard({
  file,
  selected,
  onSelect,
  onDownload,
  onDelete,
  onRename,
  onMove,
  onSelectionChange,
  tCommon,
}: {
  file: UserFile;
  selected: boolean;
  onSelect: (f: UserFile) => void;
  onDownload: (f: UserFile) => void;
  onDelete: (f: UserFile) => void;
  onRename: (f: UserFile) => void;
  onMove: (f: UserFile) => void;
  onSelectionChange: (id: string, selected: boolean) => void;
  tCommon: (key: string) => string;
}) {
  const { icon, color, bg } = getFileTypeInfo(file.mime_type);

  return (
    <div
      onClick={() => onSelect(file)}
      className={cn(
        'group relative cursor-pointer rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98]',
        selected && 'ring-2 ring-primary border-primary/50 bg-primary/5'
      )}
    >
      {/* Checkbox */}
      <div
        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelectionChange(file.id, !!checked)}
          className="h-4 w-4 bg-background/80 backdrop-blur-sm"
        />
      </div>

      {/* File icon */}
      <div className="mb-3 flex items-center justify-center">
        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', bg)}>
          <span className={color}>{icon}</span>
        </div>
      </div>

      <p className="text-xs font-semibold text-foreground truncate text-center leading-tight">{file.name}</p>
      <p className="text-[10px] text-muted-foreground text-center mt-0.5">{formatFileSize(file.size)}</p>

      {/* Context menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onDownload(file)} className="text-xs">
            <Download className="mr-2 h-3.5 w-3.5" />{tCommon('download')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRename(file)} className="text-xs">
            <Edit className="mr-2 h-3.5 w-3.5" />{tCommon('rename')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMove(file)} className="text-xs">
            <FolderInput className="mr-2 h-3.5 w-3.5" />{tCommon('move')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onDelete(file)} className="text-destructive text-xs">
            <Trash2 className="mr-2 h-3.5 w-3.5" />{tCommon('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
