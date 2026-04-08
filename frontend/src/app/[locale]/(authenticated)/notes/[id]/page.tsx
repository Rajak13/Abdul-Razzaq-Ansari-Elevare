'use client'

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'


import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { SummaryDisplay } from '@/components/notes/summary-display';
import { MarkdownRenderer } from '@/components/notes/markdown-renderer';
import { useNote, useDeleteNote, useExportNote } from '@/hooks/use-notes';
import { useUpdateNoteSummary } from '@/hooks/use-summary';
import { useNoteFolders } from '@/hooks/use-note-folders';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Calendar, Download, Edit, FileText, Folder, Hash, MoreVertical, Trash2 } from 'lucide-react';
import { Link, useRouter } from '@/navigation';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;
  
  const { data: note, isLoading } = useNote(noteId);
  const { data: folders = [] } = useNoteFolders();
  const deleteNote = useDeleteNote();
  const exportNote = useExportNote();
  const updateSummary = useUpdateNoteSummary();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const folder = note?.folder_id ? folders.find(f => f.id === note.folder_id) : null;

  const handleEdit = () => {
    router.push(`/notes/${noteId}/edit`);
  };

  const handleRegenerateSummary = async () => {
    if (!note) return;
    
    try {
      // Generate new summary using the current content
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-note-id': noteId,
          'authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          text: typeof note.content === 'string' ? note.content : extractTextFromContent(note.content),
          maxLength: 150,
          minLength: 50
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      
      // Update the summary in the database
      await updateSummary.mutateAsync({
        noteId: noteId,
        summary: data.summary,
        content: typeof note.content === 'string' ? note.content : extractTextFromContent(note.content),
        model: data.model || 'PEGASUS'
      });
      
      toast.success('Summary regenerated successfully');
    } catch (error) {
      console.error('Failed to regenerate summary:', error);
      toast.error('Failed to regenerate summary. Please try again.');
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteNote.mutateAsync(noteId);
      toast.success('Note deleted successfully');
      router.push('/notes');
    } catch {
      toast.error('Failed to delete note. Please try again.');
    }
  };

  const buildStyledHtml = (renderedHtml: string) => {
    const tagsHtml = note?.tags.length
      ? note.tags.map(t => `<span class="tag">#${t}</span>`).join('')
      : '';
    const summaryHtml = note?.summary
      ? `<div class="summary"><div class="summary-label">Summary</div><p>${note.summary}</p></div>`
      : '';
    const folderHtml = folder
      ? `<span class="folder-badge"><span class="folder-dot" style="background:${folder.color || '#6b7280'}"></span>${folder.name}</span>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${note?.title || 'Note'}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.75;
      padding: 32px 20px;
    }
    .page {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
      overflow: hidden;
    }
    /* Matches the web view header area — white bg, slate text */
    .header {
      background: #ffffff;
      padding: 32px 40px 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    .title-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .icon {
      width: 40px; height: 40px;
      background: #0f172a;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .icon svg { width: 20px; height: 20px; stroke: white; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .header h1 {
      font-size: 1.875rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    .meta {
      font-size: 0.825rem;
      color: #64748b;
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .folder-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.825rem;
      color: #64748b;
    }
    .folder-dot {
      width: 10px; height: 10px;
      border-radius: 3px;
      display: inline-block;
    }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
    .tag {
      background: #f1f5f9;
      color: #475569;
      border-radius: 9999px;
      padding: 2px 10px;
      font-size: 0.775rem;
      font-weight: 500;
    }
    .body { padding: 32px 40px; }
    /* Matches the SummaryDisplay sidebar card style */
    .summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #64748b;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 28px;
    }
    .summary-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    .summary p { color: #374151; font-size: 0.9rem; line-height: 1.6; }
    /* Prose styles matching MarkdownRenderer's Tailwind prose classes */
    .content h1 { font-size: 1.75rem; font-weight: 700; margin: 1.4em 0 0.5em; color: #111827; }
    .content h2 { font-size: 1.4rem; font-weight: 600; margin: 1.3em 0 0.4em; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
    .content h3 { font-size: 1.15rem; font-weight: 600; margin: 1.1em 0 0.3em; color: #374151; }
    .content h4, .content h5, .content h6 { font-size: 1rem; font-weight: 600; margin: 1em 0 0.3em; color: #4b5563; }
    .content p { margin: 0.75em 0; color: #374151; line-height: 1.75; }
    .content a { color: #2563eb; text-decoration: none; }
    .content a:hover { text-decoration: underline; }
    .content ul { list-style: disc; padding-left: 1.5em; margin: 0.75em 0; }
    .content ol { list-style: decimal; padding-left: 1.5em; margin: 0.75em 0; }
    .content li { margin: 0.3em 0; color: #374151; margin-left: 1rem; }
    .content blockquote {
      border-left: 4px solid #d1d5db;
      padding: 8px 16px;
      margin: 1em 0;
      color: #6b7280;
      background: #f9fafb;
      border-radius: 0 6px 6px 0;
    }
    .content code {
      background: #1a1a1a;
      color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 5px;
      font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
      font-size: 0.85em;
    }
    .content pre {
      background: #1a1a1a;
      color: #f3f4f6;
      padding: 20px 24px;
      border-radius: 12px;
      overflow-x: auto;
      margin: 1em 0;
      font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
      font-size: 0.875rem;
      line-height: 1.6;
      border: 1px solid #1f2937;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .content pre code { background: none; padding: 0; color: inherit; font-size: inherit; }
    .content table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.9rem; }
    .content th {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      padding: 10px 14px;
      text-align: left;
      font-weight: 600;
      color: #374151;
    }
    .content td { border: 1px solid #e5e7eb; padding: 9px 14px; color: #4b5563; }
    .content tr:nth-child(even) td { background: #f9fafb; }
    .content hr { border: none; border-top: 1px solid #e5e7eb; margin: 2em 0; }
    .content img { max-width: 100%; border-radius: 8px; margin: 1em 0; }
    .footer {
      text-align: center;
      padding: 16px 40px;
      font-size: 0.75rem;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
    }
    @media print {
      @page { margin: 0.5cm; size: A4; }
      body { background: white !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { box-shadow: none !important; border: none !important; border-radius: 0 !important; max-width: 100% !important; }
      .content pre, .content code { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="title-row">
        <div class="icon">
          <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <h1>${note?.title || 'Untitled Note'}</h1>
      </div>
      <div class="meta">
        <span>Updated ${new Date(note?.updated_at || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        ${folderHtml}
      </div>
      ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ''}
    </div>
    <div class="body">
      ${summaryHtml}
      <div class="content">${renderedHtml}</div>
    </div>
    <div class="footer">Exported from StudySync</div>
  </div>
</body>
</html>`;
  };

  const handleExport = async (format: 'html' | 'markdown' | 'pdf') => {
    if (format === 'pdf') {
      handleExportPdf();
      return;
    }

    if (!note) return;

    try {
      if (format === 'html') {
        // Render markdown to HTML client-side and wrap in styled document
        const MarkdownIt = (await import('markdown-it')).default;
        const md = new MarkdownIt({ html: true, linkify: true, typographer: true, breaks: true });
        const noteContent = typeof note.content === 'string' ? note.content : extractTextFromContent(note.content);
        const renderedHtml = md.render(noteContent);
        const fullHtml = buildStyledHtml(renderedHtml);
        const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${note.title || 'note'}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Note exported as HTML');
      } else {
        // Markdown: download raw content
        const noteContent = typeof note.content === 'string' ? note.content : extractTextFromContent(note.content);
        const blob = new Blob([noteContent], { type: 'text/markdown;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${note.title || 'note'}.md`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Note exported as Markdown');
      }
    } catch {
      toast.error('Failed to export note. Please try again.');
    }
  };

  const handleExportPdf = async () => {
    if (!note) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export as PDF.');
      return;
    }

    const MarkdownIt = (await import('markdown-it')).default;
    const md = new MarkdownIt({ html: true, linkify: true, typographer: true, breaks: true });
    const noteContent = typeof note.content === 'string' ? note.content : extractTextFromContent(note.content);
    const renderedHtml = md.render(noteContent);
    const fullHtml = buildStyledHtml(renderedHtml);

    printWindow.document.write(fullHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 600);

    toast.success('PDF export opened — save as PDF from the print dialog.');
  };

  // Extract text content from note content
  const extractTextFromContent = (content: any): string => {
    if (typeof content === 'string') {
      return content;
    }

    if (content && typeof content === 'object') {
      if (content.type === 'text') {
        return content.text || '';
      }
      if (content.content && Array.isArray(content.content)) {
        return content.content.map(extractTextFromContent).join('\n');
      }
    }

    return '';
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-background min-h-screen">
        <div>
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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-background min-h-screen">
        <div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Note not found</h1>
            <p className="mt-2 text-muted-foreground">
              The note you're looking for doesn't exist or has been deleted.
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-background min-h-screen">
      <div>
        {/* Header */}
        <div className="mb-6">
          <Link href="/notes">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Notes
            </Button>
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary p-2 text-primary-foreground shadow-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-3xl font-bold text-transparent dark:from-white dark:to-slate-300">
                  {note.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Updated {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                  </span>
                  {folder && (
                    <span className="flex items-center gap-1">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: folder.color || '#6b7280' }}
                      />
                      {folder.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('html')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export as HTML
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('markdown')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Note Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="border-white/20 bg-white/50 shadow-xl backdrop-blur-sm dark:border-slate-700/30 dark:bg-slate-800/50">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                {/* Tags */}
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {note.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        <Hash className="mr-1 h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Folder */}
                {folder && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Folder className="h-4 w-4" />
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: folder.color || '#6b7280' }}
                      />
                      {folder.name}
                    </div>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="p-6 lg:p-8">
                <MarkdownRenderer 
                  content={typeof note.content === 'string' ? note.content : extractTextFromContent(note.content)}
                  className="text-gray-900 dark:text-gray-100"
                />
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          {note.summary && (
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <SummaryDisplay
                  note={note}
                  summary={note.summary}
                  isEditable={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{note.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}