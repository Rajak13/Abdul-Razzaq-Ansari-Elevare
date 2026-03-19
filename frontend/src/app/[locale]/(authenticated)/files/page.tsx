'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
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
import { fileService } from '@/services/file-service';
import { FileFolder, UserFile } from '@/types/file';
import { File, FolderPlus, Upload, ChevronRight, Home, Grid, List } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { usePageMetadata } from '@/hooks/use-page-metadata';

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'

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

  const handleFileSelect = async (file: UserFile) => {
    try {
      const blob = await fileService.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      toast.error(t('view.error') || 'Error viewing file');
    }
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-background min-h-screen">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <File className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('title')}</h1>
              <p className="text-sm font-medium text-muted-foreground">{t('description')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
               id="tour-files-upload" 
               onClick={() => setShowUploadModal(true)}
               className="bg-muted hover:bg-card text-foreground border border-border font-bold h-10 px-6 rounded-xl shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
            >
              <Upload className="w-4 h-4 mr-2" />
              {t('upload.button')}
            </Button>
            <Button
              id="tour-files-new-folder"
              variant="outline"
              onClick={() => handleFolderCreate()}
              className="bg-card hover:bg-secondary text-foreground font-bold h-10 px-6 rounded-xl border-border shadow-sm transition-all hover:scale-[1.02]"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              {t('folders.newFolder')}
            </Button>
          </div>
        </div>

        <div className={cn("grid gap-8", viewMode === 'list' ? "grid-cols-1 lg:grid-cols-4" : "grid-cols-1")}>
          {/* Folders Sidebar - Only in List Mode */}
          {viewMode === 'list' && (
            <div className="lg:col-span-1">
              <Card className="border-none shadow-xl shadow-lg shadow-black/5 dark:shadow-black/20 rounded-3xl overflow-hidden bg-card">
                <CardHeader className="p-6 pb-0">
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t('folders.title')}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleFolderCreate()}>
                      <FolderPlus className="w-4 h-4 text-primary" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
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
          )}

          {/* Main Content Area */}
          <div className={cn(viewMode === 'list' ? "lg:col-span-3" : "")}>
            <Card className="border-none shadow-xl shadow-lg shadow-black/5 dark:shadow-black/20 rounded-3xl overflow-hidden bg-card min-h-[600px] flex flex-col">
              <CardHeader className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setSelectedFolderId(null)}
                      >
                        <Home className="h-4 w-4" />
                      </Button>
                      {breadcrumbPath.length > 0 && breadcrumbPath.map((folder) => (
                        <div key={folder.id} className="flex items-center">
                          <ChevronRight className="h-4 w-4 text-muted-foreground mr-1" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 font-bold text-foreground"
                            onClick={() => setSelectedFolderId(folder.id)}
                          >
                            {folder.name}
                          </Button>
                        </div>
                      ))}
                      {breadcrumbPath.length === 0 && (
                         <span className="font-bold text-foreground ml-2">{t('allFiles')}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center p-1 bg-muted rounded-xl border border-border shadow-sm">
                      <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className={cn("h-8 rounded-lg px-4 font-bold text-xs transition-all", viewMode === 'grid' ? "bg-card shadow-sm" : "text-muted-foreground")}
                      >
                        <Grid className="w-4 h-4 mr-2" />
                        Cards
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className={cn("h-8 rounded-lg px-4 font-bold text-xs transition-all", viewMode === 'list' ? "bg-card shadow-sm" : "text-muted-foreground")}
                      >
                        <List className="w-4 h-4 mr-2" />
                        List
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <FileList
                  files={filteredFiles}
                  folders={folders}
                  currentFolderId={selectedFolderId}
                  onFolderSelect={setSelectedFolderId}
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
