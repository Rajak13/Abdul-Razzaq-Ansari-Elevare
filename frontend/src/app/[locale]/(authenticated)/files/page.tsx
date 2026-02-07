'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import {
  FileFolderTree,
  FileFolderDialog,
  FileUploadModal,
  FileList,
  FileMoveDialog,
  FileRenameDialog,
} from '@/components/files';
import {
  useFiles,
  useFileFolders,
  useDeleteFile,
  useDeleteFileFolder,
  useMoveFileFolder,
  useDownloadFile,
} from '@/hooks/use-files';
import { FileFolder, UserFile } from '@/types/file';
import { File, FolderPlus, Upload, ChevronRight, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { usePageMetadata } from '@/hooks/use-page-metadata';

export default function FilesPage() {
  const t = useTranslations('files');
  usePageMetadata('files');

  // State
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FileFolder | null>(null);
  const [parentFolderId, setParentFolderId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [fileToRename, setFileToRename] = useState<UserFile | null>(null);
  const [fileToMove, setFileToMove] = useState<UserFile | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Data fetching
  const { data: filesData, isLoading: filesLoading, refetch: refetchFiles } = useFiles(
    selectedFolderId || undefined,
    currentPage,
    pageSize,
    sortBy,
    'desc'
  );
  const { data: folders = [] } = useFileFolders();
  const deleteFile = useDeleteFile();
  const deleteFolder = useDeleteFileFolder();
  const moveFolder = useMoveFileFolder();
  const downloadFile = useDownloadFile();

  const pagination = filesData?.pagination;



  // Filter files by search query
  const filteredFiles = useMemo(() => {
    const fileList = filesData?.files || [];
    if (!searchQuery) return fileList;
    return fileList.filter((file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [filesData?.files, searchQuery]);

  // Build breadcrumb path
  const breadcrumbPath = useMemo(() => {
    if (!selectedFolderId) return [];
    const path: FileFolder[] = [];
    let currentId: string | undefined = selectedFolderId;

    while (currentId) {
      const folder = folders.find((f) => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parent_id;
      } else {
        break;
      }
    }

    return path;
  }, [selectedFolderId, folders]);

  // Handlers
  const handleFolderCreate = (parentId?: string) => {
    setParentFolderId(parentId);
    setEditingFolder(null);
    setShowFolderDialog(true);
  };

  const handleFolderEdit = (folder: FileFolder) => {
    setEditingFolder(folder);
    setParentFolderId(undefined);
    setShowFolderDialog(true);
  };

  const handleFolderDelete = async (folder: FileFolder) => {
    if (confirm(t('folders.confirmDelete'))) {
      try {
        await deleteFolder.mutateAsync(folder.id);
        toast.success(t('folders.deleteSuccess'));
        if (selectedFolderId === folder.id) {
          setSelectedFolderId(null);
        }
      } catch {
        toast.error(t('folders.deleteError'));
      }
    }
  };

  const handleFolderMove = async (folderId: string, newParentId: string | null) => {
    try {
      await moveFolder.mutateAsync({ id: folderId, parentId: newParentId });
      toast.success(t('folders.moveSuccess'));
    } catch {
      toast.error(t('folders.moveError'));
    }
  };

  const handleFileSelect = (file: UserFile) => {
    // Could open a preview or details panel
    console.log('Selected file:', file);
  };

  const handleFileDownload = async (file: UserFile) => {
    try {
      await downloadFile.mutateAsync({ id: file.id, filename: file.name });
      toast.success(t('download.success'));
    } catch {
      toast.error(t('download.error'));
    }
  };

  const handleFileDelete = async (file: UserFile) => {
    if (confirm(t('delete.confirm'))) {
      try {
        await deleteFile.mutateAsync(file.id);
        toast.success(t('delete.success'));
        setSelectedFiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(file.id);
          return newSet;
        });
      } catch {
        toast.error(t('delete.error'));
      }
    }
  };

  const handleFileRename = (file: UserFile) => {
    setFileToRename(file);
  };

  const handleFileMove = (file: UserFile) => {
    setFileToMove(file);
  };

  const handleSelectionChange = (fileId: string, selected: boolean) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedFiles(new Set(filteredFiles.map((f) => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleUploadSuccess = () => {
    refetchFiles();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedFiles(new Set());
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    setSelectedFiles(new Set());
  };

  return (
    <div className="p-6 space-y-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-primary p-2 text-primary-foreground shadow-lg">
              <File className="h-6 w-6" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-3xl font-bold text-transparent dark:from-white dark:to-slate-300">
                {t('title')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('description')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={() => setShowUploadModal(true)} size="lg">
              <Upload className="mr-2 h-5 w-5" />
              {t('upload.button')}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleFolderCreate()}
              size="lg"
            >
              <FolderPlus className="mr-2 h-5 w-5" />
              {t('folders.newFolder')}
            </Button>
          </div>
        </div>

        {/* Breadcrumb */}
        {breadcrumbPath.length > 0 && (
          <div className="mb-4 flex items-center gap-1 text-sm">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setSelectedFolderId(null)}
            >
              <Home className="h-4 w-4" />
            </Button>
            {breadcrumbPath.map((folder) => (
              <div key={folder.id} className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  {folder.name}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Folders Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-white/20 bg-white/50 shadow-xl backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/50 sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FolderPlus className="h-5 w-5" />
                  {t('folders.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileFolderTree
                  selectedFolderId={selectedFolderId}
                  onFolderSelect={setSelectedFolderId}
                  onFolderCreate={handleFolderCreate}
                  onFolderEdit={handleFolderEdit}
                  onFolderDelete={handleFolderDelete}
                  onFolderMove={handleFolderMove}
                />
              </CardContent>
            </Card>
          </div>

          {/* Files Section */}
          <div className="lg:col-span-3">
            <Card className="border-white/20 bg-white/50 shadow-xl backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <File className="h-5 w-5" />
                    {selectedFolderId
                      ? folders.find((f) => f.id === selectedFolderId)?.name || t('files')
                      : t('allFiles')}
                  </div>
                  {selectedFolderId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFolderId(null)}
                    >
                      {t('viewAll')}
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FileList
                  files={filteredFiles}
                  folders={folders}
                  isLoading={filesLoading}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  onFileSelect={handleFileSelect}
                  onFileDownload={handleFileDownload}
                  onFileDelete={handleFileDelete}
                  onFileRename={handleFileRename}
                  onFileMove={handleFileMove}
                  selectedFiles={selectedFiles}
                  onSelectionChange={handleSelectionChange}
                  onSelectAll={handleSelectAll}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                />

                {/* Pagination */}
                {pagination && pagination.totalPages > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={pagination.totalPages}
                      totalItems={pagination.total}
                      pageSize={pageSize}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialogs */}
        <FileFolderDialog
          open={showFolderDialog}
          onOpenChange={setShowFolderDialog}
          folder={editingFolder}
          parentId={parentFolderId}
        />

        <FileUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={handleUploadSuccess}
          defaultFolderId={selectedFolderId || undefined}
        />

        <FileRenameDialog
          open={!!fileToRename}
          onOpenChange={(open) => !open && setFileToRename(null)}
          file={fileToRename}
        />

        <FileMoveDialog
          open={!!fileToMove}
          onOpenChange={(open) => !open && setFileToMove(null)}
          file={fileToMove}
        />
      </div>
    </div>
  );
}
