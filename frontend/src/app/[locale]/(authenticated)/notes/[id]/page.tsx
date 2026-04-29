'use client'

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'


import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { ShareNoteDialog } from '@/components/notes/share-note-dialog';
import { useNote, useDeleteNote } from '@/hooks/use-notes';
import { useUpdateNoteSummary } from '@/hooks/use-summary';
import { useNoteFolders } from '@/hooks/use-note-folders';
import { buildPdfHtml } from '@/components/notes/pdf-export-styles';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Calendar, Download, Edit, FileText, Folder, Hash, MoreVertical, Share2, Trash2 } from 'lucide-react';
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
  const updateSummary = useUpdateNoteSummary();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

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
        const fullHtml = buildPdfHtml(
          note.title,
          renderedHtml,
          note.summary ?? null,
          note.tags,
          folder?.name ?? null,
          folder?.color ?? null,
          new Date(note.updated_at)
        );
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
    const fullHtml = buildPdfHtml(
      note.title,
      renderedHtml,
      note.summary ?? null,
      note.tags,
      folder?.name ?? null,
      folder?.color ?? null,
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

              <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
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

      <ShareNoteDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        noteId={noteId}
        noteTitle={note.title}
      />
    </div>
  );
}