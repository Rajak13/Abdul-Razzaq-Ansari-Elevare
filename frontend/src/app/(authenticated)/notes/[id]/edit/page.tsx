'use client'

import { NoteEditor } from '@/components/notes/note-editor';
import { Button } from '@/components/ui/button';
import { useNote } from '@/hooks/use-notes';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function EditNotePage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;
  
  const { data: note, isLoading } = useNote(noteId);

  const handleSave = (updatedNote: any) => {
    router.push(`/notes/${updatedNote.id}`);
  };

  const handleCancel = () => {
    router.push(`/notes/${noteId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
          <div className="animate-pulse">
            <div className="mb-6 h-8 w-48 rounded bg-gray-200"></div>
            <div className="h-96 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Note not found</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              The note you're trying to edit doesn't exist or has been deleted.
            </p>
            <Link href="/notes">
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Notes
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/notes/${noteId}`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Note
            </Button>
          </Link>
          
          <div className="flex items-center gap-3">
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-3xl font-bold text-transparent dark:from-white dark:to-slate-300">
                Edit Note
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Make changes to "{note.title}"
              </p>
            </div>
          </div>
        </div>

        {/* Note Editor */}
        <div className="mx-auto max-w-5xl">
          <NoteEditor
            note={note}
            onSave={handleSave}
            onCancel={handleCancel}
            className="h-[calc(100vh-200px)]"
          />
        </div>
      </div>
    </div>
  );
}