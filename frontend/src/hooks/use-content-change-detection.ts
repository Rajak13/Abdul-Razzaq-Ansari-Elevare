import { useState, useEffect, useCallback } from 'react';
import { Note } from '@/types/note';
import { 
  generateContentHashSync, 
  isSummaryOutdated, 
  shouldRegenerateSummary,
  getSummaryStalnessMessage 
} from '@/lib/content-hash';

interface ContentChangeDetectionState {
  isOutdated: boolean;
  shouldRegenerate: boolean;
  stalnessMessage: string | null;
  hasUnsavedChanges: boolean;
}

/**
 * Hook for detecting content changes and summary staleness
 */
export function useContentChangeDetection(note: Note | null, currentContent?: string) {
  const [state, setState] = useState<ContentChangeDetectionState>({
    isOutdated: false,
    shouldRegenerate: false,
    stalnessMessage: null,
    hasUnsavedChanges: false
  });

  const checkContentChanges = useCallback(() => {
    if (!note) {
      setState({
        isOutdated: false,
        shouldRegenerate: false,
        stalnessMessage: null,
        hasUnsavedChanges: false
      });
      return;
    }

    const contentToCheck = currentContent ?? note.content;
    const hasUnsavedChanges = currentContent !== undefined && currentContent !== note.content;
    
    // Create a temporary note object with current content for checking
    const noteWithCurrentContent = {
      ...note,
      content: contentToCheck,
    };

    const isOutdated = isSummaryOutdated(noteWithCurrentContent);
    const shouldRegenerate = shouldRegenerateSummary(noteWithCurrentContent);
    const stalnessMessage = getSummaryStalnessMessage(noteWithCurrentContent);

    setState({
      isOutdated,
      shouldRegenerate,
      stalnessMessage,
      hasUnsavedChanges
    });
  }, [note, currentContent]);

  // Check for changes whenever note or content changes
  useEffect(() => {
    checkContentChanges();
  }, [checkContentChanges]);

  return {
    ...state,
    checkContentChanges
  };
}

/**
 * Hook for tracking content hash changes during editing
 */
export function useContentHashTracking(initialContent: string) {
  const [initialHash] = useState(() => generateContentHashSync(initialContent));
  const [currentHash, setCurrentHash] = useState(initialHash);
  
  const updateContentHash = useCallback((newContent: string) => {
    const newHash = generateContentHashSync(newContent);
    setCurrentHash(newHash);
    return newHash;
  }, []);

  const hasContentChanged = currentHash !== initialHash;

  return {
    initialHash,
    currentHash,
    hasContentChanged,
    updateContentHash
  };
}

/**
 * Hook for managing summary regeneration prompts
 */
export function useSummaryRegenerationPrompt(note: Note | null, currentContent?: string) {
  const { isOutdated, shouldRegenerate, stalnessMessage } = useContentChangeDetection(note, currentContent);
  const [hasPromptedForRegeneration, setHasPromptedForRegeneration] = useState(false);
  const [userDismissedPrompt, setUserDismissedPrompt] = useState(false);

  // Reset prompt state when note changes
  useEffect(() => {
    setHasPromptedForRegeneration(false);
    setUserDismissedPrompt(false);
  }, [note?.id]);

  const shouldShowPrompt = shouldRegenerate && !hasPromptedForRegeneration && !userDismissedPrompt;

  const markPromptShown = useCallback(() => {
    setHasPromptedForRegeneration(true);
  }, []);

  const dismissPrompt = useCallback(() => {
    setUserDismissedPrompt(true);
  }, []);

  const resetPromptState = useCallback(() => {
    setHasPromptedForRegeneration(false);
    setUserDismissedPrompt(false);
  }, []);

  return {
    shouldShowPrompt,
    isOutdated,
    stalnessMessage,
    markPromptShown,
    dismissPrompt,
    resetPromptState
  };
}