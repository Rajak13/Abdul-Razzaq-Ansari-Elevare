'use client'

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNote, useDeleteNote, useExportNote } from '@/hooks/use-notes';
import { useNoteFolders } from '@/hooks/use-note-folders';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Calendar, Download, Edit, FileText, Folder, Hash, MoreVertical, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;
  
  const { data: note, isLoading } = useNote(noteId);
  const { data: folders = [] } = useNoteFolders();
  const deleteNote = useDeleteNote();
  const exportNote = useExportNote();

  const folder = note?.folder_id ? folders.find(f => f.id === note.folder_id) : null;

  const handleEdit = () => {
    router.push(`/notes/${noteId}/edit`);
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
      a.download = `${note?.title || 'note'}.${format === 'html' ? 'html' : format === 'markdown' ? 'md' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Note exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Failed to export note. Please try again.');
    }
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
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2 text-white shadow-lg">
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
        <div className="mx-auto max-w-4xl">
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
            
            <CardContent className="p-6">
              <div className="prose prose-gray max-w-none dark:prose-invert">
                <div 
                  className="text-gray-900 dark:text-gray-100"
                  dangerouslySetInnerHTML={{ 
                    __html: (typeof note.content === 'string' ? note.content : extractTextFromContent(note.content))
                      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mb-4 text-gray-900 dark:text-white">$1</h1>')
                      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mb-3 text-gray-800 dark:text-gray-200">$1</h2>')
                      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-medium mb-2 text-gray-700 dark:text-gray-300">$1</h3>')
                      .replace(/^\* (.*$)/gim, '<li class="ml-4">$1</li>')
                      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
                      .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
                      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
                      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto"><code class="text-sm font-mono">$2</code></pre>')
                      .replace(/\n/g, '<br>')
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}