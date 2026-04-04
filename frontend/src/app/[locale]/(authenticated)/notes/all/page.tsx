'use client'

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'


import { NoteList } from '@/components/notes/note-list';
import { TemplateSelector } from '@/components/notes/template-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNotes, useDeleteNote } from '@/hooks/use-notes';
import { NoteTemplate } from '@/types/note';
import { ArrowLeft, FileText, Plus } from 'lucide-react';
import { Link, useRouter } from '@/navigation';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

export default function AllNotesPage() {
  const t = useTranslations('notes');
  const tCommon = useTranslations('common');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [noteToDelete, setNoteToDelete] = useState<any>(null);
  
  const router = useRouter();
  const { data: notesResponse = [], isLoading } = useNotes();
  const deleteNote = useDeleteNote();

  // Extract notes array from response
  const notes = Array.isArray(notesResponse) ? notesResponse : notesResponse?.notes || [];

  // Paginate notes
  const paginatedNotes = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return notes.slice(startIndex, startIndex + pageSize);
  }, [notes, currentPage, pageSize]);

  const totalPages = Math.ceil(notes.length / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleTemplateSelect = (template: NoteTemplate) => {
    router.push(`/notes/create?template=${template.id}`);
    setShowTemplateSelector(false);
  };

  const handleNoteSelect = (note: any) => {
    router.push(`/notes/${note.id}`);
  };

  const handleNoteEdit = (note: any) => {
    router.push(`/notes/${note.id}/edit`);
  };

  const handleNoteDelete = (note: any) => {
    setNoteToDelete(note);
  };

  const confirmNoteDelete = async () => {
    if (!noteToDelete) return;
    try {
      await deleteNote.mutateAsync(noteToDelete.id);
      toast.success(t('messages.deleteSuccess'));
    } catch {
      toast.error(t('messages.deleteError'));
    } finally {
      setNoteToDelete(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <Link href="/notes">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {tCommon('back')}
              </Button>
            </Link>
          </div>
          
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2 text-white shadow-lg">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-3xl font-bold text-transparent dark:from-white dark:to-slate-300">
                {t('allNotes')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {t('noNotesDescription')} ({notes.length} {tCommon('of').toLowerCase()} {notes.length})
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex gap-3">
            <Button onClick={() => setShowTemplateSelector(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              {t('createNote')}
            </Button>
          </div>
        </div>

        {/* Notes List */}
        <Card className="border-white/20 bg-white/50 shadow-xl backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('allNotes')} ({notes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NoteList
              notes={paginatedNotes}
              onNoteSelect={handleNoteSelect}
              onNoteEdit={handleNoteEdit}
              onNoteDelete={handleNoteDelete}
              onCreateNew={() => setShowTemplateSelector(true)}
              isLoading={isLoading}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 pt-4 border-t">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={notes.length}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Template Selector Dialog */}
        <TemplateSelector
          open={showTemplateSelector}
          onOpenChange={setShowTemplateSelector}
          onTemplateSelect={handleTemplateSelect}
        />

        <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('actions.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmNoteDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {tCommon('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}