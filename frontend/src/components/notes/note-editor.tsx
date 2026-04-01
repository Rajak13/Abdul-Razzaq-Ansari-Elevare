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
import { useNoteTemplates } from './note-templates';
import { SummaryGenerator } from './summary-generator';
import { SummaryDisplay } from './summary-display';
import { RichTextEditor } from './rich-text-editor';
import { Note, CreateNoteData } from '@/types/note';
import { Eye, EyeOff, Folder, Hash, Maximize, Minimize, Plus, Save, X } from 'lucide-react';
import { useRouter } from '@/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import '@/styles/rich-text-editor.css';

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
  const t = useTranslations('notes');
  const tCommon = useTranslations('common');
  const noteTemplatesRaw = useNoteTemplates();
  // Memoize templates to prevent unnecessary re-renders
  const noteTemplates = useMemo(() => noteTemplatesRaw, [JSON.stringify(noteTemplatesRaw)]);
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
  const { autoSave, clearAutoSave, isAutoSaving } = useAutoSaveNote(note?.id || '');
  const { data: folders = [] } = useNoteFolders();

  // Content change detection for summary staleness
  const { isOutdated, shouldRegenerate, stalnessMessage } = useContentChangeDetection(note || null, content);

  // Initialize content - only run once when component mounts or when switching to a different note
  // Use a ref to track if we've initialized to prevent double initialization
  const hasInitialized = useRef(false);
  const lastNoteId = useRef<string | undefined>(undefined);
  const lastTemplate = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Reset initialization flag when note ID OR template changes
    if (note?.id !== lastNoteId.current || template !== lastTemplate.current) {
      console.log('🔄 NoteEditor: Note ID or template changed, resetting initialization flag');
      hasInitialized.current = false;
      lastNoteId.current = note?.id;
      lastTemplate.current = template;
    }

    // Skip if already initialized for this note
    if (hasInitialized.current) {
      console.log('⏭️ NoteEditor: Content already initialized for this note, skipping');
      return;
    }

    // Check for localStorage draft first - crucial for keeping notes after language switch
    // BUT: if a template is explicitly selected for a new note, always use the template
    // (the draft key 'elevare_note_draft' is shared across all new notes, so it would
    // load the wrong template's content from a previous session)
    const storageKey = note?.id && note.id !== 'temp-note' ? `elevare_note_${note.id}` : 'elevare_note_draft';
    const savedDataStr = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;

    // Skip draft restore when a template is selected for a brand-new note
    const shouldSkipDraft = !note?.id && !!template;

    if (savedDataStr && !shouldSkipDraft) {
      try {
        const savedData = JSON.parse(savedDataStr);
        // For existing notes, check if the saved draft is newer than the note's updated_at
        const noteUpdatedAt = note?.updated_at ? new Date(note.updated_at).getTime() : 0;

        if (savedData.timestamp > noteUpdatedAt) {
          console.log('✅ NoteEditor: Using newer content from localStorage draft');
          if (savedData.content !== undefined) setContent(savedData.content);
          if (savedData.title !== undefined) setTitle(savedData.title);
          if (savedData.tags !== undefined) setTags(savedData.tags);
          if (savedData.folder_id !== undefined) setSelectedFolderId(savedData.folder_id);
          hasInitialized.current = true;
          return;
        }
      } catch (e) {
        console.error('Failed to parse localStorage data', e);
      }
    }

    // Wait for templates to load before initializing
    if (noteTemplates.length === 0) {
      console.log('⏳ NoteEditor: Waiting for templates to load...');
      return;
    }

    console.log('🔄 NoteEditor: Content initialization useEffect triggered');
    console.log('📝 NoteEditor: note?.content exists:', !!note?.content);
    console.log('📝 NoteEditor: template:', template);

    let initialContent = '';

    if (note?.content) {
      console.log('✅ NoteEditor: Using existing note content');
      // If content is already a string (markdown), use it directly
      if (typeof note.content === 'string') {
        initialContent = note.content;
      } else {
        // Extract text from JSON content (legacy support)
        initialContent = extractTextFromContent(note.content);
      }
    } else if (template) {
      console.log('✅ NoteEditor: Using template content');
      // Use the selected template content
      const selectedTemplate = noteTemplates.find(t => t.id === template);
      if (selectedTemplate) {
        initialContent = typeof selectedTemplate.content === 'string'
          ? selectedTemplate.content
          : extractTextFromContent(selectedTemplate.content);
      }
    }

    if (!initialContent) {
      console.log('✅ NoteEditor: Using default template');
      // Fallback to default template
      const defaultTemplate = noteTemplates[0];
      if (defaultTemplate) {
        initialContent = typeof defaultTemplate.content === 'string'
          ? defaultTemplate.content
          : extractTextFromContent(defaultTemplate.content);
      }
    }

    console.log('📝 NoteEditor: Setting initial content, length:', initialContent.length);
    setContent(initialContent);
    hasInitialized.current = true;
    // Clear any stale draft when loading a fresh template so the next
    // template selection also gets a clean slate
    if (!note?.id && template) {
      localStorage.removeItem('elevare_note_draft');
    }
  }, [note?.id, note?.content, template, noteTemplates.length]); // Dependencies that should trigger re-initialization

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

  // Auto-save triggers whenever title, content, folder or tags change
  useEffect(() => {
    if (hasInitialized.current) {
      autoSave({
        content,
        title,
        folder_id: selectedFolderId,
        tags,
      });
    }
  }, [content, title, selectedFolderId, tags, autoSave]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

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
        title: title.trim() || t('untitled'),
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
        clearAutoSave(); // Clear draft as it's now successfully saved
        onSave?.(updatedNote);
        // Only show toast for manual saves, not auto-saves
        if (!isAutoSaving) {
          toast.success(t('messages.updateSuccess'));
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
        clearAutoSave();

        if (onSave) {
          console.log('🔄 NoteEditor: Calling onSave with new note');
          onSave(newNote);
        } else {
          console.log('🔄 NoteEditor: Navigating to new note page:', `/notes/${newNote.id}`);
          router.push(`/notes/${newNote.id}`);
        }
        toast.success(t('messages.createSuccess'));
      }
    } catch (error) {
      console.error('❌ NoteEditor: Save error:', error);
      toast.error(t('messages.updateError'));
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
        toast.error(t('summary.error'));
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
        toast.error(t('summary.error'));
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
                id="tour-note-title"
                placeholder={t('editor.titlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border-none bg-transparent p-0 text-lg font-semibold text-gray-900 placeholder:text-gray-500 focus-visible:ring-0 dark:text-white dark:placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-2">
              {isAutoSaving && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t('editor.saving')}
                </span>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                title={isPreviewMode ? t('editor.title') : t('editor.content')}
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
                title={isFullscreen ? tCommon('cancel') : tCommon('save')}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>

              <Button onClick={handleSave} disabled={isLoading} size="sm">
                <Save className="mr-1 h-4 w-4" />
                {note?.id ? tCommon('save') : tCommon('create')}
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
                  <SelectValue placeholder={t('detail.folder')} />
                </SelectTrigger>
                <SelectContent className="border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <SelectItem
                    value="none"
                    className="text-gray-900 dark:text-white"
                  >
                    {t('folders.uncategorized')}
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
                  placeholder={t('detail.tags')}
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
            <div className="flex h-full flex-col lg:flex-row overflow-hidden">
              {/* Main content area */}
              <div className="flex-1 flex flex-col min-h-[300px] lg:min-h-0 overflow-hidden">
                <RichTextEditor
                  value={content}
                  onChange={handleContentChange}
                  placeholder={t('editor.contentPlaceholder')}
                  disabled={isLoading}
                  className="flex-1"
                />
              </div>

              {/* Summary sidebar - Fully responsive with proper scrolling */}
              <div className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col shrink-0">
                <div className="p-3 sm:p-4 lg:p-5 overflow-y-auto overflow-x-hidden h-full max-h-[60vh] lg:max-h-full">
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white sticky top-0 bg-gray-50 dark:bg-gray-900 pb-2 z-10">
                      {t('summary.title')}
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
                        key={`summary-${summary.length}`}
                        note={note || {
                          id: 'temp-note',
                          title: title || 'Untitled Note',
                          content,
                          summary,
                          summary_generated_at: new Date().toISOString(),
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
                      <div className="text-xs sm:text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
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