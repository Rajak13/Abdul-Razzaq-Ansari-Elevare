'use client'

import { FolderDialog } from '@/components/notes/folder-dialog';
import { FolderTree } from '@/components/notes/folder-tree';
import { NoteList } from '@/components/notes/note-list';
import { TemplateSelector } from '@/components/notes/template-selector';
import { getTemplateById } from '@/components/notes/note-templates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { useDeleteNoteFolder, useMoveNoteFolder, useNoteFolders } from '@/hooks/use-note-folders';
import { useNotes, useDeleteNote } from '@/hooks/use-notes';
import { NoteFolder, NoteTemplate } from '@/types/note';
import { formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  Eye,
  FileText,
  FolderPlus,
  Plus,
  LayoutGrid,
  List,
  MoreHorizontal,
  ChevronRight,
  Folder,
  ArrowLeft,
  MoreVertical,
  Search,
  Hash,
  Share2,
  Settings
} from 'lucide-react';
import { Link, useRouter } from '@/navigation';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { usePageMetadata } from '@/hooks/use-page-metadata';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'

export default function NotesPage() {
  const t = useTranslations('notes');
  const tCommon = useTranslations('common');
  usePageMetadata('notes');
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [parentFolderId, setParentFolderId] = useState<string | undefined>();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const router = useRouter();
  const { data: notesData, isLoading: notesLoading } = useNotes({
    folder_id: selectedFolderId || undefined,
    page: currentPage,
    limit: pageSize,
    sort_by: sortBy,
    order: sortOrder,
  });
  const { data: folders = [] } = useNoteFolders();
  const deleteFolder = useDeleteNoteFolder();
  const moveFolder = useMoveNoteFolder();
  const deleteNote = useDeleteNote();

  const notes = notesData?.notes || [];
  const pagination = notesData ? {
    total: notesData.total,
    page: notesData.page,
    limit: notesData.limit,
    totalPages: notesData.totalPages,
  } : null;

  // Filter notes based on selected folder - now handled by API
  const displayNotes = useMemo(() => {
    return [...notes].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [notes]);

  const currentFolder = useMemo(() =>
    folders.find(f => f.id === selectedFolderId),
    [folders, selectedFolderId]
  );

  // Subfolders for grid navigation
  const currentSubfolders = useMemo(() => {
    if (viewMode === 'list') return [];
    return folders.filter(f => f.parent_id === (selectedFolderId || undefined));
  }, [folders, selectedFolderId, viewMode]);

  const handleTemplateSelect = (template: NoteTemplate) => {
    // Navigate to create page with template
    router.push(`/notes/create?template=${template.id}`);
    setShowTemplateSelector(false);
  };

  const handleFolderCreate = (parentId?: string) => {
    setParentFolderId(parentId);
    setEditingFolder(null);
    setShowFolderDialog(true);
  };

  const handleFolderEdit = (folder: NoteFolder) => {
    setEditingFolder(folder);
    setParentFolderId(undefined);
    setShowFolderDialog(true);
  };

  const handleFolderDelete = async (folder: NoteFolder) => {
    if (confirm(t('folders.confirmDelete'))) {
      try {
        await deleteFolder.mutateAsync(folder.id);
        toast.success(t('folders.deleteSuccess'));
      } catch {
        toast.error(t('messages.deleteError'));
      }
    }
  };

  const handleFolderMove = async (folderId: string, newParentId: string | null) => {
    try {
      await moveFolder.mutateAsync({ id: folderId, parentId: newParentId });
      toast.success(t('folders.updateSuccess'));
    } catch {
      toast.error(t('messages.updateError'));
    }
  };

  const handleFolderSelect = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setCurrentPage(1); // Reset to first page when changing folders
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleNoteSelect = (note: any) => {
    router.push(`/notes/${note.id}`);
  };

  const handleNoteEdit = (note: any) => {
    router.push(`/notes/${note.id}/edit`);
  };

  const handleNoteDelete = async (note: any) => {
    if (confirm(t('actions.confirmDelete'))) {
      try {
        await deleteNote.mutateAsync(note.id);
        toast.success(t('messages.deleteSuccess'));
      } catch {
        toast.error(t('messages.deleteError'));
      }
    }
  };
  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-background min-h-screen">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{t('myNotes')}</h1>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground hidden sm:block">{t('noNotesDescription')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center p-1 bg-muted rounded-lg sm:rounded-xl border border-border shadow-sm">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn("h-7 sm:h-8 rounded-md sm:rounded-lg px-2 sm:px-4 font-bold text-xs transition-all", viewMode === 'grid' ? "bg-card shadow-sm" : "text-muted-foreground")}
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn("h-7 sm:h-8 rounded-md sm:rounded-lg px-2 sm:px-4 font-bold text-xs transition-all", viewMode === 'list' ? "bg-card shadow-sm" : "text-muted-foreground")}
              >
                <List className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">List</span>
              </Button>
            </div>

            <Button
              id="tour-notes-create"
              onClick={() => setShowTemplateSelector(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 sm:h-10 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('createNote')}</span>
            </Button>
          </div>
        </div>

        {/* View Layout */}
        <div className={cn("grid gap-4 sm:gap-6 lg:gap-8", viewMode === 'list' ? "grid-cols-1 lg:grid-cols-4" : "grid-cols-1")}>
          {/* Folders Sidebar - Only in List Mode */}
          {viewMode === 'list' && (
            <div className="lg:col-span-1">
              <Card className="border-none shadow-lg sm:shadow-xl shadow-black/5 dark:shadow-black/20 rounded-2xl sm:rounded-3xl overflow-hidden bg-card">
                <CardHeader className="p-4 sm:p-6 pb-0">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-widest text-muted-foreground">Folders</CardTitle>
                    <Button id="tour-notes-folder" variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg" onClick={() => handleFolderCreate()}>
                      <FolderPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    </Button>
                  </div>
                  <div className="relative mb-3 sm:mb-4">
                    <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search notes..."
                      className="w-full bg-muted border-none rounded-lg sm:rounded-xl py-1.5 sm:py-2 pl-8 sm:pl-10 pr-3 sm:pr-4 text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0">
                  <div
                    onClick={() => handleFolderSelect(null)}
                    className={cn(
                      "flex items-center justify-between p-2.5 sm:p-3 rounded-lg sm:rounded-xl cursor-pointer transition-all mb-1",
                      !selectedFolderId ? "bg-secondary text-primary font-bold" : "text-foreground font-medium hover:bg-secondary"
                    )}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Folder className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm">All Notes</span>
                    </div>
                    {notesData && <span className="text-[9px] sm:text-[10px] font-bold bg-card px-1.5 sm:px-2 py-0.5 rounded-full border border-border shadow-sm">{notesData.total}</span>}
                  </div>
                  <FolderTree
                    selectedFolderId={selectedFolderId}
                    onFolderSelect={handleFolderSelect}
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
            <Card className="border-none shadow-lg sm:shadow-xl shadow-black/5 dark:shadow-black/20 rounded-2xl sm:rounded-3xl overflow-hidden bg-card min-h-[400px] sm:min-h-[600px] flex flex-col">
              <CardHeader className="p-4 sm:p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {viewMode === 'grid' && selectedFolderId && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg mr-1 sm:mr-2" onClick={() => setSelectedFolderId(null)}>
                        <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                    )}
                    <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                      {selectedFolderId ? (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="text-muted-foreground font-medium text-sm sm:text-base">Folders</span>
                          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                          <span className="text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">{currentFolder?.name}</span>
                        </div>
                      ) : t('allNotes')}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 flex-grow">
                {notesLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-32 sm:h-40 bg-secondary rounded-xl sm:rounded-2xl animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Grid Mode Root View: SHOW FOLDERS AS CARDS FIRST */}
                    {viewMode === 'grid' && !selectedFolderId && (
                      <div className="space-y-6 sm:space-y-8">
                        <div>
                          <h3 className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 sm:mb-4 px-1">Collections</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                            {folders.filter(f => !f.parent_id).map((folder) => (
                              <FolderTabCard key={folder.id} folder={folder} onSelect={handleFolderSelect} />
                            ))}
                            {/* Detailed List Access */}
                            <div
                              onClick={() => { setViewMode('list'); setSelectedFolderId(null); }}
                              className="group relative cursor-pointer"
                            >
                              <div className="absolute -top-[8px] sm:-top-[10px] left-0 h-[16px] sm:h-[20px] w-20 sm:w-24 bg-muted group-hover:bg-secondary rounded-t-lg sm:rounded-t-xl border-l border-t border-r border-border transition-all z-0"></div>
                              <div className="relative bg-muted group-hover:bg-secondary p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-border shadow-sm transition-all group-hover:shadow-md z-10 border-dashed">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 bg-card shadow-inner">
                                  <List className="w-5 h-5 sm:w-6 sm:h-6 text-foreground" />
                                </div>
                                <h4 className="font-bold text-sm sm:text-base text-foreground truncate mb-1">Detailed List</h4>
                                <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Expanded View</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Uncategorized Notes */}
                        {displayNotes.filter(n => !n.folder_id).length > 0 && (
                          <div>
                            <h3 className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 sm:mb-4 px-1">Uncategorized Notes</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                              {displayNotes.filter(n => !n.folder_id).map((note) => (
                                <NoteCard key={note.id} note={note} onSelect={handleNoteSelect} folders={folders} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Grid Mode Folder View: SHOW NOTES */}
                    {viewMode === 'grid' && selectedFolderId && (
                      <div className="space-y-6 sm:space-y-8">
                        {currentSubfolders.length > 0 && (
                          <div>
                            <h3 className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 sm:mb-4 px-1">Sub-folders</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                              {currentSubfolders.map((folder) => (
                                <FolderTabCard key={folder.id} folder={folder} onSelect={handleFolderSelect} />
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h3 className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 sm:mb-4 px-1">Notes in this folder</h3>
                          {displayNotes.length === 0 ? (
                            <div className="py-12 sm:py-20 text-center bg-muted rounded-2xl sm:rounded-3xl border border-dashed border-border">
                              <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/30 mx-auto mb-3 sm:mb-4" />
                              <p className="text-xs sm:text-sm font-bold text-muted-foreground">This folder is empty</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                              {displayNotes.map((note) => (
                                <NoteCard key={note.id} note={note} onSelect={handleNoteSelect} folders={folders} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* List Mode View */}
                    {viewMode === 'list' && (
                      <>
                        {displayNotes.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full py-12 sm:py-20 grayscale opacity-50">
                            <FileText className="w-12 h-12 sm:w-16 sm:h-16 mb-3 sm:mb-4 text-muted-foreground/50" />
                            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1 sm:mb-2">{t('noNotes')}</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">{t('noNotesDescription')}</p>
                          </div>
                        ) : (
                          <div className="space-y-2 sm:space-y-4">
                            {displayNotes.map((note) => (
                              <div
                                key={note.id}
                                className="group flex items-center justify-between p-3 sm:p-4 bg-card border border-border rounded-xl sm:rounded-2xl transition-all hover:bg-secondary hover:shadow-sm cursor-pointer"
                                onClick={() => handleNoteSelect(note)}
                              >
                                <div className="flex items-center gap-2 sm:gap-4 flex-grow min-w-0">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-muted flex items-center justify-center text-primary border border-border flex-shrink-0">
                                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                                  </div>
                                  <div className="min-w-0 flex-grow">
                                    <h4 className="font-bold text-sm sm:text-base text-foreground truncate">{note.title}</h4>
                                    <div className="flex items-center gap-2 sm:gap-4 text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase py-0.5 sm:py-1">
                                      <span className="flex items-center gap-1 sm:gap-1.5"><Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> <span className="hidden sm:inline">{formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}</span><span className="sm:hidden">Recent</span></span>
                                      {note.folder_id && (
                                        <div className="flex items-center gap-1 sm:gap-1.5 truncate">
                                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" style={{ backgroundColor: folders.find(f => f.id === note.folder_id)?.color || '#gray' }}></div>
                                          <span className="truncate">{folders.find(f => f.id === note.folder_id)?.name}</span>
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 mt-0.5 hidden sm:block">{note.summary || t('summary.noSummary')}</p>
                                  </div>
                                </div>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 sm:gap-2 flex-shrink-0">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg hidden sm:flex">
                                    <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg hidden sm:flex">
                                    <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                                  </Button>
                                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground/50 sm:ml-2" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8">
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
          </div>
        </div>

        {/* Dialogs */}
        <TemplateSelector open={showTemplateSelector} onOpenChange={setShowTemplateSelector} onTemplateSelect={handleTemplateSelect} />
        <FolderDialog open={showFolderDialog} onOpenChange={setShowFolderDialog} folder={editingFolder} parentId={parentFolderId} />
      </div>
    </div>
  );
}

// Subordinate components for cleaner main render
function NoteCard({ note, onSelect, folders }: { note: any; onSelect: (n: any) => void; folders: NoteFolder[] }) {
  // Get folder color if note belongs to a folder
  const folderColor = note.folder_id 
    ? folders.find(f => f.id === note.folder_id)?.color || 'hsl(142,71%,45%)'
    : 'hsl(142,71%,45%)';

  return (
    <div onClick={() => onSelect(note)} className="relative group cursor-pointer">
      {/* Folder shape with colored outline */}
      <div className="relative">
        {/* Folder tab */}
        <svg viewBox="0 0 300 40" className="w-full h-6 sm:h-8" preserveAspectRatio="none">
          <path
            d="M 0 40 L 0 15 Q 0 10 5 10 L 60 10 L 72 0 L 140 0 Q 145 0 145 5 L 145 35 Q 145 40 150 40 L 300 40"
            style={{ fill: "hsl(var(--muted))" }}
            stroke="none"
          />
        </svg>
        
        {/* Main card body with folder-shaped outline */}
        <svg viewBox="0 0 300 160" className="w-full" preserveAspectRatio="none" style={{ marginTop: '-1px' }}>
          {/* Colored outline following folder shape */}
          <path
            d="M 0 0 L 0 150 Q 0 160 10 160 L 290 160 Q 300 160 300 150 L 300 10 Q 300 0 290 0 L 150 0 L 0 0 Z"
            style={{ fill: "hsl(var(--card))" }}
            stroke={folderColor}
            strokeWidth="2"
            opacity="0.3"
          />
          {/* Inner fill */}
          <path
            d="M 2 2 L 2 150 Q 2 158 10 158 L 290 158 Q 298 158 298 150 L 298 10 Q 298 2 290 2 L 150 2 L 2 2 Z"
            style={{ fill: "hsl(var(--muted))" }}
          />
        </svg>
        
        {/* Content overlay */}
        <div className="absolute inset-0 top-6 sm:top-8 p-3 sm:p-5 flex flex-col">
          {/* Icon and Title */}
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-8">
            <div 
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: folderColor }}
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <h4 className="text-base sm:text-lg font-normal text-foreground truncate">{note.title}</h4>
          </div>

          {/* Footer with date and menu */}
          <div className="flex items-center justify-between mt-auto">
            <span className="text-foreground/70 text-xs sm:text-sm font-normal truncate">
              {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem className="rounded-lg text-xs sm:text-sm">
                  <Share2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg text-xs sm:text-sm">
                  <Settings className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

function FolderTabCard({ folder, onSelect }: { folder: any; onSelect: (id: string) => void }) {
  const folderColor = folder.color || 'hsl(142,71%,45%)';
  return (
    <div onClick={() => onSelect(folder.id)} className="relative group cursor-pointer">
      {/* Folder shape with colored outline */}
      <div className="relative">
        {/* Folder tab */}
        <svg viewBox="0 0 300 40" className="w-full h-6 sm:h-8" preserveAspectRatio="none">
          <path
            d="M 0 40 L 0 15 Q 0 10 5 10 L 60 10 L 72 0 L 140 0 Q 145 0 145 5 L 145 35 Q 145 40 150 40 L 300 40"
            style={{ fill: "hsl(var(--muted))" }}
            stroke="none"
          />
        </svg>
        
        {/* Main card body with folder-shaped outline */}
        <svg viewBox="0 0 300 160" className="w-full" preserveAspectRatio="none" style={{ marginTop: '-1px' }}>
          {/* Colored outline following folder shape */}
          <path
            d="M 0 0 L 0 150 Q 0 160 10 160 L 290 160 Q 300 160 300 150 L 300 10 Q 300 0 290 0 L 150 0 L 0 0 Z"
            style={{ fill: "hsl(var(--card))" }}
            stroke={folderColor}
            strokeWidth="2"
            opacity="0.3"
          />
          {/* Inner fill */}
          <path
            d="M 2 2 L 2 150 Q 2 158 10 158 L 290 158 Q 298 158 298 150 L 298 10 Q 298 2 290 2 L 150 2 L 2 2 Z"
            style={{ fill: "hsl(var(--muted))" }}
          />
        </svg>
        
        {/* Content overlay */}
        <div className="absolute inset-0 top-6 sm:top-8 p-3 sm:p-5 flex flex-col">
          {/* Icon and Title */}
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-8">
            <div 
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: folderColor }}
            >
              <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <h4 className="text-base sm:text-lg font-normal text-foreground truncate">{folder.name}</h4>
          </div>

          {/* Footer with date and menu */}
          <div className="flex items-center justify-between mt-auto">
            <span className="text-foreground/70 text-xs sm:text-sm font-normal">Apr 2, 2023</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem className="rounded-lg text-xs sm:text-sm">
                  <Settings className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
