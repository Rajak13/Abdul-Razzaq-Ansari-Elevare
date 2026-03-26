'use client'

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'


import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SummaryDisplay } from '@/components/notes/summary-display';
import { MarkdownRenderer } from '@/components/notes/markdown-renderer';
import { useNote, useDeleteNote, useExportNote } from '@/hooks/use-notes';
import { useUpdateNoteSummary } from '@/hooks/use-summary';
import { useNoteFolders } from '@/hooks/use-note-folders';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Calendar, Download, Edit, FileText, Folder, Hash, MoreVertical, Trash2 } from 'lucide-react';
import { Link, useRouter } from '@/navigation';
import { useParams } from 'next/navigation';
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

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${note?.title}"?`)) {
      try {
        await deleteNote.mutateAsync(noteId);
        toast.success('Note deleted successfully');
        router.push('/notes');
      } catch {
        toast.error('Failed to delete note. Please try again.');
      }
    }
  };

  const handleExport = async (format: 'html' | 'markdown' | 'pdf') => {
    if (format === 'pdf') {
      handleExportPdf();
      return;
    }

    try {
      const blob = await exportNote.mutateAsync({ 
        id: noteId, 
        format, 
        includeSummary: false 
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${note?.title || 'note'}.${format === 'html' ? 'html' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Note exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Failed to export note. Please try again.');
    }
  };

  const handleExportPdf = () => {
    if (!note) return;

    const noteContent = typeof note.content === 'string'
      ? note.content
      : extractTextFromContent(note.content);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export as PDF.');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${note.title}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #111; line-height: 1.7; }
    h1 { font-size: 2rem; margin-bottom: 4px; }
    .meta { color: #666; font-size: 0.85rem; margin-bottom: 24px; }
    .tags { margin-bottom: 16px; }
    .tag { display: inline-block; background: #f0f0f0; border-radius: 4px; padding: 2px 8px; margin-right: 6px; font-size: 0.8rem; }
    .summary { background: #f9f9f9; border-left: 4px solid #6366f1; padding: 12px 16px; margin-bottom: 24px; border-radius: 4px; }
    .summary h3 { margin: 0 0 8px; font-size: 0.9rem; color: #6366f1; }
    pre { background: #f4f4f4; padding: 12px; border-radius: 4px; overflow-x: auto; }
    code { font-family: monospace; font-size: 0.9em; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${note.title}</h1>
  <div class="meta">Last updated: ${new Date(note.updated_at).toLocaleDateString()}</div>
  ${note.tags.length > 0 ? `<div class="tags">${note.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}
  ${note.summary ? `<div class="summary"><h3>Summary</h3><p>${note.summary}</p></div>` : ''}
  <div class="content">${noteContent}</div>
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);

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
    </div>
  );
}