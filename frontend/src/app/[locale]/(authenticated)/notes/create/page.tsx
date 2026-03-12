'use client'

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'


import { NoteEditor } from '@/components/notes/note-editor';
import { getTemplateById, getDefaultTemplate, useNoteTemplates } from '@/components/notes/note-templates';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link, useRouter } from '@/navigation';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CreateNoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const folderId = searchParams.get('folder');

  const templates = useNoteTemplates();
  const template = templateId ? getTemplateById(templates, templateId) : getDefaultTemplate(templates);

  const handleSave = (note: any) => {
    router.push(`/notes/${note.id}`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="container mx-auto">
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
              <h1 className="text-3xl font-bold">
                Create New Note
              </h1>
              <p className="text-sm text-muted-foreground">
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
      <div className="p-6 space-y-6">
        <div className="container mx-auto">
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