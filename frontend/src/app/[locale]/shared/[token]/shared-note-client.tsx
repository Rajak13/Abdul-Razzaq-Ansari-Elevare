'use client';

import { useEffect, useState } from 'react';
import { noteShareService, type SharedNoteData } from '@/services/note-share-service';
import { MarkdownRenderer } from '@/components/notes/markdown-renderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Download,
  FileText,
  Hash,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { buildPdfHtml } from '@/components/notes/pdf-export-styles';
import { toast } from 'sonner';

interface Props {
  token: string;
}

export default function SharedNoteClient({ token }: Props) {
  const [note, setNote] = useState<SharedNoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    noteShareService
      .getSharedNote(token)
      .then(setNote)
      .catch(() => setError('This link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleExportPdf = async () => {
    if (!note) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export as PDF.');
      return;
    }

    const MarkdownIt = (await import('markdown-it')).default;
    const md = new MarkdownIt({ html: true, linkify: true, typographer: true, breaks: true });
    const renderedHtml = md.render(note.content);

    const fullHtml = buildPdfHtml(
      note.title,
      renderedHtml,
      note.summary,
      note.tags,
      note.folder_name,
      note.folder_color,
      new Date(note.updated_at)
    );

    printWindow.document.write(fullHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 600);

    toast.success('PDF export opened — save as PDF from the print dialog.');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading note…</p>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Link not found
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {error || 'This shared note could not be found.'}
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            Go to StudySync
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
              <FileText className="h-4 w-4 text-white dark:text-slate-900" />
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              StudySync
            </span>
            <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500">
              · Shared note
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="h-8 text-xs"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export PDF
            </Button>
            <a
              href="/login"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-slate-900 dark:bg-white px-3 text-xs font-medium text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
            >
              Sign in
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* Note header */}
        <div className="mb-8">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 dark:bg-white shadow-md">
              <FileText className="h-5 w-5 text-white dark:text-slate-900" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 break-words">
                {note.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Updated {format(new Date(note.updated_at), 'MMMM d, yyyy')}
                </span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span>Shared by {note.author_name}</span>
                {note.folder_name && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: note.folder_color || '#6b7280' }}
                      />
                      {note.folder_name}
                    </span>
                  </>
                )}
              </div>

              {/* Tags */}
              {note.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Hash className="mr-1 h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        {note.summary && (
          <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 border-l-4 border-l-slate-400 dark:border-l-slate-500 p-4">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Summary
            </p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {note.summary}
            </p>
          </div>
        )}

        {/* Main content */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="p-6 sm:p-8 lg:p-10">
            <MarkdownRenderer
              content={note.content}
              className="text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Footer CTA */}
        <div className="mt-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Want to create your own notes?
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            StudySync helps you write, organise, and share notes with AI-powered summaries.
          </p>
          <a
            href="/register"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            Get started free
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </main>
    </div>
  );
}
