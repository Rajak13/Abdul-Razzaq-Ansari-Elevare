'use client'

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useNoteFolders } from '@/hooks/use-note-folders';
import { useAutoSaveNote, useCreateNote, useUpdateNote } from '@/hooks/use-notes';
import { useContentChangeDetection } from '@/hooks/use-content-change-detection';
import { useUpdateNoteSummary } from '@/hooks/use-summary';
import { generateContentHashSync } from '@/lib/content-hash';
import { getDefaultTemplate, getTemplateById } from './note-templates';
import { SummaryGenerator } from './summary-generator';
import { SummaryDisplay } from './summary-display';
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
  const [summary, setSummary] = useState(note?.summary || '');
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(
    note?.folder_id || folderId
  );
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const router = useRouter();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const updateSummary = useUpdateNoteSummary();
  const { autoSave, isAutoSaving } = useAutoSaveNote(note?.id || '');
  const { data: folders = [] } = useNoteFolders();

  // Content change detection for summary staleness
  const { isOutdated, shouldRegenerate, stalnessMessage } = useContentChangeDetection(note || null, content);

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

  // Initialize summary from note
  useEffect(() => {
    console.log('🔄 NoteEditor: Summary useEffect triggered');
    console.log('📝 NoteEditor: note?.summary:', note?.summary?.substring(0, 50) + '...');
    console.log('📝 NoteEditor: current summary state:', summary?.substring(0, 50) + '...');
    
    if (note?.summary) {
      console.log('✅ NoteEditor: Setting summary from note');
      setSummary(note.summary);
    } else {
      console.log('⚠️ NoteEditor: No summary in note, keeping current state');
    }
  }, [note?.summary]);

  // Auto-save functionality
  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);

      if (note?.id) {
        // For auto-save, only save content - don't clear summary fields
        // Summary clearing will happen on manual save if content hash changed
        autoSave({
          content: newContent,
          title,
        });
      }
    },
    [note?.id, autoSave, title]
  );

  // Handle manual save
  const handleSave = async () => {
    console.log('💾 NoteEditor: handleSave called');
    console.log('🔄 NoteEditor: createNote.isPending:', createNote.isPending);
    console.log('🔄 NoteEditor: updateNote.isPending:', updateNote.isPending);
    
    if (createNote.isPending || updateNote.isPending) {
      console.log('⏸️ NoteEditor: Save already in progress, preventing duplicate');
      return; // Prevent duplicate saves
    }

    try {
      const noteData = {
        title: title.trim() || 'Untitled Note',
        content: content, // Store as plain markdown string
        tags,
        folder_id: selectedFolderId,
        is_collaborative: false,
        summary: summary || undefined,
        summary_generated_at: summary ? new Date().toISOString() : undefined, // Set current time for new summaries
        summary_model: summary ? 'PEGASUS' : undefined,
        // Don't set content_hash here - let the backend generate it to ensure consistency
        content_hash: undefined,
      };

      console.log('📦 NoteEditor: noteData prepared:', {
        title: noteData.title,
        contentLength: noteData.content.length,
        hasSummary: !!noteData.summary,
        summaryLength: noteData.summary?.length || 0,
        summaryGeneratedAt: noteData.summary_generated_at,
        summaryModel: noteData.summary_model,
        hasContentHash: !!noteData.content_hash
      });

      if (note?.id) {
        console.log('🔄 NoteEditor: Updating existing note:', note.id);
        const updatedNote = await updateNote.mutateAsync({
          id: note.id,
          data: noteData,
        });
        console.log('✅ NoteEditor: Note updated successfully:', updatedNote.id);
        onSave?.(updatedNote);
        // Only show toast for manual saves, not auto-saves
        if (!isAutoSaving) {
          toast.success('Note saved successfully');
        }
      } else {
        console.log('➕ NoteEditor: Creating new note');
        console.log('📝 NoteEditor: Note data includes summary:', !!noteData.summary);
        console.log('📝 NoteEditor: Summary length:', noteData.summary?.length || 0);
        const createData: CreateNoteData = noteData;
        const newNote = await createNote.mutateAsync(createData);
        console.log('✅ NoteEditor: Note created successfully:', newNote.id);
        console.log('📝 NoteEditor: New note has summary:', !!newNote.summary);
        console.log('📝 NoteEditor: New note summary length:', newNote.summary?.length || 0);
        
        if (onSave) {
          console.log('🔄 NoteEditor: Calling onSave with new note');
          onSave(newNote);
        } else {
          console.log('🔄 NoteEditor: Navigating to new note page:', `/notes/${newNote.id}`);
          router.push(`/notes/${newNote.id}`);
        }
        toast.success('Note created successfully');
      }
    } catch (error) {
      console.error('❌ NoteEditor: Save error:', error);
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

  // Handle summary generation
  const handleSummaryGenerated = useCallback(async (generatedSummary: string) => {
    console.log('📥 NoteEditor: handleSummaryGenerated called');
    console.log('📝 NoteEditor: generatedSummary length:', generatedSummary.length);
    console.log('🆔 NoteEditor: note?.id:', note?.id);
    console.log('📄 NoteEditor: content length:', content.length);
    console.log('🔄 NoteEditor: current summary state:', summary?.substring(0, 50) + '...');
    
    // Check if this is the same summary to prevent duplicate saves
    if (summary === generatedSummary) {
      console.log('⚠️ NoteEditor: Same summary, skipping duplicate save');
      return;
    }
    
    console.log('🔄 NoteEditor: Setting summary state...');
    setSummary(generatedSummary);
    console.log('✅ NoteEditor: setSummary called with summary');
    
    // If we have an existing note, save the summary immediately using the dedicated hook
    if (note?.id) {
      console.log('💾 NoteEditor: Attempting to save summary to database');
      try {
        const result = await updateSummary.mutateAsync({
          noteId: note.id,
          summary: generatedSummary,
          content,
          model: 'PEGASUS'
        });
        console.log('✅ NoteEditor: Summary saved successfully:', result);
        
        // Force re-render by updating the note state if needed
        console.log('🔄 NoteEditor: Summary save completed, state should be updated');
        
        // Don't show toast here as it's already shown in the generator
        // toast.success('Summary generated and saved successfully');
      } catch (error) {
        console.error('❌ NoteEditor: Failed to save summary:', error);
        toast.error('Summary generated but failed to save. Please save the note manually.');
      }
    } else {
      console.log('⚠️ NoteEditor: No note.id, summary not saved to database');
    }
  }, [note?.id, content, updateSummary, summary]);

  // Handle summary changes (manual edits)
  const handleSummaryChanged = useCallback(async (newSummary: string) => {
    console.log('📝 NoteEditor: handleSummaryChanged called with summary length:', newSummary.length);
    setSummary(newSummary);
    
    // If we have an existing note, save the updated summary using the dedicated hook
    if (note?.id && note.id !== 'temp-note') {
      console.log('💾 NoteEditor: Saving edited summary to database');
      try {
        await updateSummary.mutateAsync({
          noteId: note.id,
          summary: newSummary,
          content,
          model: note.summary_model || 'PEGASUS'
        });
        console.log('✅ NoteEditor: Edited summary saved successfully');
      } catch (error) {
        console.error('❌ NoteEditor: Failed to save edited summary:', error);
        toast.error('Failed to save summary changes. Please try again.');
      }
    } else {
      console.log('⚠️ NoteEditor: Summary edited for unsaved note, will be saved when note is saved');
    }
  }, [note?.id, note?.summary_model, content, updateSummary]);

  // Handle summary regeneration
  const handleRegenerateSummary = useCallback(() => {
    setIsGeneratingSummary(true);
    // The SummaryGenerator component will handle the actual generation
    // and call handleSummaryGenerated when complete
  }, []);

  // Reset generating state when summary generation completes
  useEffect(() => {
    if (summary && isGeneratingSummary) {
      setIsGeneratingSummary(false);
    }
  }, [summary, isGeneratingSummary]);

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
            <div className="flex h-full">
              {/* Main content area */}
              <div className="flex-1 flex flex-col">
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
                  className="flex-1 resize-none border-none bg-transparent p-4 text-gray-900 placeholder:text-gray-500 focus-visible:ring-0 dark:text-white dark:placeholder:text-gray-400"
                />
              </div>

              {/* Summary sidebar */}
              <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col">
                <div className="p-4 flex-1 overflow-auto">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      AI Summary
                    </h3>
                    
                    {/* Summary Generator */}
                    <SummaryGenerator
                      noteContent={content}
                      noteId={note?.id}
                      onSummaryGenerated={handleSummaryGenerated}
                      disabled={!content.trim() || isLoading}
                    />

                    {/* Summary Display */}
                    {summary && (
                      <SummaryDisplay
                        key={`summary-${summary.length}`} // Stable key based on content
                        note={note || {
                          id: 'temp-note',
                          title: title || 'Untitled Note',
                          content,
                          summary,
                          summary_generated_at: new Date().toISOString(), // Use current time for unsaved notes
                          summary_model: 'PEGASUS',
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                          user_id: '',
                          tags: tags,
                          folder_id: selectedFolderId,
                          is_collaborative: false,
                          content_hash: undefined
                        }}
                        summary={summary}
                        currentContent={content}
                        onSummaryChanged={handleSummaryChanged}
                        onRegenerateClick={handleRegenerateSummary}
                        isRegenerating={isGeneratingSummary}
                      />
                    )}

                    {/* Helpful tips when no summary exists */}
                    {!summary && (
                      <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200 dark:border-blue-800">
                        <p className="font-medium mb-2">💡 AI Summary Tips:</p>
                        <ul className="space-y-1">
                          <li>• Write at least a few sentences</li>
                          <li>• Click "Generate Summary" to create an AI summary</li>
                          <li>• Summaries help you quickly review your notes</li>
                          <li>• You can edit generated summaries</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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