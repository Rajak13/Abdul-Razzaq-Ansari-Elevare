'use client'

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useNoteFolders } from '@/hooks/use-note-folders';
import { useAutoSaveNote, useCreateNote, useUpdateNote } from '@/hooks/use-notes';
import { getDefaultTemplate, getTemplateById } from './note-templates';
import { Note, CreateNoteData } from '@/types/note';
import { Eye, EyeOff, Folder, Hash, Maximize, Minimize, Plus, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface NoteEditorProps {
  note?: Note;
  template?: string;
  folderId?: string;
  onSave?: (note: Note) => void;
  onCancel?: () => void;
  className?: string;
}

export function NoteEditor({
  note,
  template,
  folderId,
  onSave,
  onCancel,
  className = '',
}: NoteEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(
    note?.folder_id || folderId
  );
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [tagInput, setTagInput] = useState('');

  const router = useRouter();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const { autoSave, isAutoSaving } = useAutoSaveNote(note?.id || '');
  const { data: folders = [] } = useNoteFolders();

  // Initialize content
  useEffect(() => {
    let initialContent = '';

    if (note?.content) {
      // If content is already a string (markdown), use it directly
      if (typeof note.content === 'string') {
        initialContent = note.content;
      } else {
        // Extract text from JSON content (legacy support)
        initialContent = extractTextFromContent(note.content);
      }
    } else if (template) {
      // Use the selected template content
      const selectedTemplate = getTemplateById(template);
      if (selectedTemplate) {
        initialContent = typeof selectedTemplate.content === 'string' 
          ? selectedTemplate.content 
          : extractTextFromContent(selectedTemplate.content);
      }
    }

    if (!initialContent) {
      // Fallback to default template
      const defaultTemplate = getDefaultTemplate();
      initialContent = typeof defaultTemplate.content === 'string' 
        ? defaultTemplate.content 
        : extractTextFromContent(defaultTemplate.content);
    }

    setContent(initialContent);
  }, [note, template]);

  // Auto-save functionality
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);

      if (note?.id) {
        autoSave({
          content: newContent, // Store as plain markdown string
          title,
        });
      }
    },
    [note?.id, autoSave, title]
  );

  // Handle manual save
  const handleSave = async () => {
    if (createNote.isPending || updateNote.isPending) {
      return; // Prevent duplicate saves
    }

    try {
      const noteData = {
        title: title.trim() || 'Untitled Note',
        content: content, // Store as plain markdown string
        tags,
        folder_id: selectedFolderId,
        is_collaborative: false,
      };

      if (note?.id) {
        const updatedNote = await updateNote.mutateAsync({
          id: note.id,
          data: noteData,
        });
        onSave?.(updatedNote);
        toast.success('Note saved successfully');
      } else {
        const createData: CreateNoteData = noteData;
        const newNote = await createNote.mutateAsync(createData);
        if (onSave) {
          onSave(newNote);
        } else {
          router.push(`/notes/${newNote.id}`);
        }
        toast.success('Note created successfully');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save note. Please try again.');
    }
  };

  // Handle tag addition
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Handle key press for tag input
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const isLoading = createNote.isPending || updateNote.isPending;

  return (
    <div
      className={`${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900' : ''}`}
    >
      <Card className="flex h-full flex-col border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <CardHeader className="flex-shrink-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="mr-4 flex-1">
              <Input
                placeholder="Note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-none bg-transparent p-0 text-lg font-semibold text-gray-900 placeholder:text-gray-500 focus-visible:ring-0 dark:text-white dark:placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-2">
              {isAutoSaving && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Saving...
                </span>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                title={isPreviewMode ? 'Edit mode' : 'Preview mode'}
              >
                {isPreviewMode ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>

              <Button onClick={handleSave} disabled={isLoading} size="sm">
                <Save className="mr-1 h-4 w-4" />
                {note?.id ? 'Save' : 'Create'}
              </Button>

              {onCancel && (
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Folder and Tags */}
          <div className="mt-2 space-y-2">
            {/* Folder Selection */}
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedFolderId || 'none'}
                onValueChange={(value) =>
                  setSelectedFolderId(value === 'none' ? undefined : value)
                }
              >
                <SelectTrigger className="h-7 w-48 text-xs text-gray-900 dark:text-white">
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <SelectItem
                    value="none"
                    className="text-gray-900 dark:text-white"
                  >
                    No folder
                  </SelectItem>
                  {folders.map((folder) => (
                    <SelectItem
                      key={folder.id}
                      value={folder.id}
                      className="text-gray-900 dark:text-white"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded"
                          style={{ backgroundColor: folder.color || '#6b7280' }}
                        />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRemoveTag(tag)}
                >
                  <Hash className="mr-1 h-3 w-3" />
                  {tag}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}

              <div className="flex items-center gap-1">
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyPress}
                  className="h-6 w-20 border-gray-300 bg-white text-xs text-gray-900 placeholder:text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-400"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddTag}
                  className="h-6 w-6 p-0 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden bg-white p-0 dark:bg-gray-800">
          {isPreviewMode ? (
            <div className="h-full overflow-auto p-4">
              <div className="prose prose-gray max-w-none dark:prose-invert">
                <div 
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: content
                      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                      .replace(/^\* (.*$)/gim, '<li>$1</li>')
                      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/\n/g, '<br>')
                  }}
                />
              </div>
            </div>
          ) : (
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start writing your note in markdown format...

# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*

* Bullet point
1. Numbered list

[Link text](https://example.com)"
              className="h-full resize-none border-none bg-transparent p-4 text-gray-900 placeholder:text-gray-500 focus-visible:ring-0 dark:text-white dark:placeholder:text-gray-400"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to extract text from content
function extractTextFromContent(content: any): string {
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
}