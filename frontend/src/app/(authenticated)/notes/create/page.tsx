'use client'

import { NoteEditor } from '@/components/notes/note-editor';
import { getTemplateById, getDefaultTemplate } from '@/components/notes/note-templates';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CreateNoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const folderId = searchParams.get('folder');

  const template = templateId ? getTemplateById(templateId) : getDefaultTemplate();

  const handleSave = (note: any) => {
    router.push(`/notes/${note.id}`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/notes">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Notes
            </Button>
          </Link>
          
          <div className="flex items-center gap-3">
            <div>
              <h1 className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-3xl font-bold text-transparent dark:from-white dark:to-slate-300">
                Create New Note
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {template ? `Using ${template.name} template` : 'Start writing your note'}
              </p>
            </div>
          </div>
        </div>

        {/* Note Editor */}
        <div className="mx-auto max-w-5xl">
          <NoteEditor
            template={templateId || undefined}
            folderId={folderId || undefined}
            onSave={handleSave}
            onCancel={handleCancel}
            className="h-[calc(100vh-200px)]"
          />
        </div>
      </div>
    </div>
  );
}

export default function CreateNotePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
          <div className="animate-pulse">
            <div className="mb-6 h-8 w-48 rounded bg-gray-200"></div>
            <div className="h-96 rounded bg-gray-200"></div>
          </div>
        </div>
      </div>
    }>
      <CreateNoteContent />
    </Suspense>
  );
}