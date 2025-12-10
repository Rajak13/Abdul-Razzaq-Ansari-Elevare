'use client'

import { NoteList } from '@/components/notes/note-list';
import { TemplateSelector } from '@/components/notes/template-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotes, useDeleteNote } from '@/hooks/use-notes';
import { NoteTemplate } from '@/types/note';
import { ArrowLeft, FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AllNotesPage() {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  const router = useRouter();
  const { data: notes = [], isLoading } = useNotes();
  const deleteNote = useDeleteNote();

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

  const handleNoteDelete = async (note: any) => {
    if (confirm(`Are you sure you want to delete "${note.title}"?`)) {
      try {
        await deleteNote.mutateAsync(note.id);
        toast.success('Note deleted successfully');
      } catch {
        toast.error('Failed to delete note. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <Link href="/notes">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Notes
              </Button>
            </Link>
          </div>
          
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2 text-white shadow-lg">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-3xl font-bold text-transparent dark:from-white dark:to-slate-300">
                All Notes
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Browse and manage all your notes ({notes.length} total)
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex gap-3">
            <Button onClick={() => setShowTemplateSelector(true)} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Note
            </Button>
          </div>
        </div>

        {/* Notes List */}
        <Card className="border-white/20 bg-white/50 shadow-xl backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              All Notes ({notes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NoteList
              notes={notes}
              onNoteSelect={handleNoteSelect}
              onNoteEdit={handleNoteEdit}
              onNoteDelete={handleNoteDelete}
              onCreateNew={() => setShowTemplateSelector(true)}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {/* Template Selector Dialog */}
        <TemplateSelector
          open={showTemplateSelector}
          onOpenChange={setShowTemplateSelector}
          onTemplateSelect={handleTemplateSelect}
        />
      </div>
    </div>
  );
}