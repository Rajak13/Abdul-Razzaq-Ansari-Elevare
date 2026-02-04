'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { buildFileFolderTree, useFileFolders } from '@/hooks/use-files';
import { FileFolder } from '@/types/file';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  MoreVertical,
  Plus,
  Search,
  HardDrive,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface FileFolderTreeProps {
  selectedFolderId?: string | null;
  onFolderSelect?: (folderId: string | null) => void;
  onFolderCreate?: (parentId?: string) => void;
  onFolderEdit?: (folder: FileFolder) => void;
  onFolderDelete?: (folder: FileFolder) => void;
  onFolderMove?: (folderId: string, newParentId: string | null) => void;
  className?: string;
}

interface FolderNodeProps {
  folder: FileFolder & { children: FileFolder[] };
  level: number;
  selectedFolderId?: string | null;
  expandedFolders: Set<string>;
  onToggleExpand: (folderId: string) => void;
  onFolderSelect?: (folderId: string | null) => void;
  onFolderCreate?: (parentId?: string) => void;
  onFolderEdit?: (folder: FileFolder) => void;
  onFolderDelete?: (folder: FileFolder) => void;
  onFolderMove?: (folderId: string, newParentId: string | null) => void;
}

function FolderNode({
  folder,
  level,
  selectedFolderId,
  expandedFolders,
  onToggleExpand,
  onFolderSelect,
  onFolderCreate,
  onFolderEdit,
  onFolderDelete,
  onFolderMove,
}: FolderNodeProps) {
  const t = useTranslations('files');
  const [isDragOver, setIsDragOver] = useState(false);
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children.length > 0;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('folder-id', folder.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const draggedFolderId = e.dataTransfer.getData('folder-id');
    if (draggedFolderId && draggedFolderId !== folder.id) {
      onFolderMove?.(draggedFolderId, folder.id);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
          isSelected ? 'bg-primary/10 text-primary' : ''
        } ${isDragOver ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0"
          onClick={() => hasChildren && onToggleExpand(folder.id)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <div className="h-3 w-3" />
          )}
        </Button>

        <div
          className="flex flex-1 cursor-pointer items-center gap-2"
          onClick={() => onFolderSelect?.(folder.id)}
        >
          {isExpanded ? (
            <FolderOpen className="h-4 w-4" style={{ color: folder.color || '#6b7280' }} />
          ) : (
            <Folder className="h-4 w-4" style={{ color: folder.color || '#6b7280' }} />
          )}
          <span className="truncate">{folder.name}</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onFolderCreate?.(folder.id)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('folders.createSubfolder')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFolderEdit?.(folder)}>
              {t('folders.editFolder')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onFolderDelete?.(folder)}
              className="text-destructive"
            >
              {t('folders.deleteFolder')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {folder.children?.map((child) => (
            <FolderNode
              key={child.id}
              folder={{ ...child, children: (child as any).children || [] }}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              onFolderSelect={onFolderSelect}
              onFolderCreate={onFolderCreate}
              onFolderEdit={onFolderEdit}
              onFolderDelete={onFolderDelete}
              onFolderMove={onFolderMove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileFolderTree({
  selectedFolderId,
  onFolderSelect,
  onFolderCreate,
  onFolderEdit,
  onFolderDelete,
  onFolderMove,
  className = '',
}: FileFolderTreeProps) {
  const t = useTranslations('files');
  const { data: folders = [], isLoading } = useFileFolders();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const folderTree = buildFileFolderTree(folders);

  const handleToggleExpand = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedFolderId = e.dataTransfer.getData('folder-id');
    if (draggedFolderId) {
      onFolderMove?.(draggedFolderId, null);
    }
  };

  const filteredTree = searchQuery
    ? folderTree.filter((folder) =>
        folder.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : folderTree;

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('folders.searchFolders')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => onFolderCreate?.()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div
        className="space-y-0.5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleRootDrop}
      >
        {/* All Files option */}
        <div
          className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
            selectedFolderId === null ? 'bg-primary/10 text-primary font-medium' : ''
          }`}
          onClick={() => onFolderSelect?.(null)}
        >
          <HardDrive className="h-4 w-4" />
          <span>{t('folders.allFiles')}</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {folders.length}
          </Badge>
        </div>

        {filteredTree.length === 0 && searchQuery ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            {t('folders.noFoldersFound')}
          </div>
        ) : (
          filteredTree.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={{ ...folder, children: folder.children || [] }}
              level={0}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onToggleExpand={handleToggleExpand}
              onFolderSelect={onFolderSelect}
              onFolderCreate={onFolderCreate}
              onFolderEdit={onFolderEdit}
              onFolderDelete={onFolderDelete}
              onFolderMove={onFolderMove}
            />
          ))
        )}
      </div>
    </div>
  );
}
