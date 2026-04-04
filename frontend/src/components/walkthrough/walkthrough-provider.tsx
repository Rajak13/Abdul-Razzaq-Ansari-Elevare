'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import apiClient from '@/lib/api-client';
import { useWalkthroughStore } from '@/stores/walkthrough-store';
import { WelcomeModal } from './welcome-modal';
import { CompletionModal } from './completion-modal';
import { GuidedTour } from './guided-tour';
import { toast } from 'sonner';

interface WalkthroughProviderProps {
  children: React.ReactNode;
}

// Define tour steps with navigation
const getTourSteps = (t: any) => [
  {
    id: 'welcome',
    path: '/dashboard',
    title: t('steps.dashboard.title'),
    description: t('steps.dashboard.description'),
    position: 'bottom' as const,
  },
  {
    id: 'dashboard_customize',
    path: '/dashboard',
    element: '#tour-dashboard-customize',
    title: 'Customize Dashboard',
    description: 'You can reorganize, add, or remove widgets to make the dashboard your own.',
    position: 'bottom' as const,
    allowInteraction: true,
    actionText: 'Click here to enter Edit Mode, then you can drag widgets around.',
  },
  {
    id: 'dashboard_add',
    path: '/dashboard',
    element: '#tour-dashboard-add-widget',
    title: 'Add Widgets',
    description: 'Missing something? Click here to add more widgets.',
    position: 'bottom' as const,
    allowInteraction: true,
  },
  {
    id: 'dashboard_drag',
    path: '/dashboard',
    element: '#tour-dashboard-grid',
    title: 'Drag and Drop',
    description: 'While in Edit Mode, grab any widget to drag and drop it around!',
    position: 'top' as const,
    allowInteraction: true,
  },
  {
    id: 'tasks',
    path: '/tasks',
    element: '[href$="/tasks"]',
    title: t('steps.tasks.title'),
    description: t('steps.tasks.description'),
    position: 'right' as const,
    allowInteraction: true,
  },
  {
    id: 'tasks_new',
    path: '/tasks',
    element: '#tour-tasks-new',
    title: 'Create a Task',
    description: 'Click here to add a new task to your list. You can set priorities, due dates, and categories.',
    position: 'bottom' as const,
    allowInteraction: true,
  },
  {
    id: 'tasks_select',
    path: '/tasks',
    element: '#tour-tasks-select',
    title: 'Bulk Operations',
    description: 'Use the Select button to bulk-complete or bulk-delete multiple tasks at once.',
    position: 'bottom' as const,
    allowInteraction: true,
  },
  {
    id: 'notes',
    path: '/notes',
    element: '[href$="/notes"]',
    title: t('steps.notes.title'),
    description: t('steps.notes.description'),
    position: 'right' as const,
    allowInteraction: true,
  },
  {
    id: 'notes_create',
    path: '/notes',
    element: '#tour-notes-create',
    title: 'Write a Note',
    description: 'Create a rich-text note. You can use templates, AI summaries, and organize them into folders.',
    position: 'bottom' as const,
    allowInteraction: true,
  },
  {
    id: 'notes_folder',
    path: '/notes',
    element: '#tour-notes-folder',
    title: 'Organize with Folders',
    description: 'Keep your study materials structured. Create folders to stay organized.',
    position: 'bottom' as const,
    allowInteraction: true,
  },
  {
    id: 'groups',
    path: '/groups',
    element: '[href$="/groups"]',
    title: t('steps.groups.title'),
    description: t('steps.groups.description'),
    position: 'right' as const,
    allowInteraction: true,
  },
  {
    id: 'groups_tabs',
    path: '/groups',
    element: '#tour-groups-tabs',
    title: 'Group Filters',
    description: 'Easily switch between all study groups, your groups, and pending requests.',
    position: 'bottom' as const,
    allowInteraction: true,
  },
  {
    id: 'groups_create',
    path: '/groups',
    element: '#tour-groups-create',
    title: 'Create a Study Group',
    description: 'Start a new study group to collaborate, share resources, and study together with your peers.',
    position: 'bottom' as const,
    allowInteraction: true,
  },
  {
    id: 'resources',
    path: '/resources',
    element: '[href$="/resources"]',
    title: t('steps.resources.title'),
    description: t('steps.resources.description'),
    position: 'right' as const,
    allowInteraction: true,
  },
  {
    id: 'resources_tabs',
    path: '/resources',
    element: '#tour-resources-tabs',
    title: 'Resource Types',
    description: 'Explore trending resources from the community, or browse all uploads.',
    position: 'bottom' as const,
    allowInteraction: true,
  },
  {
    id: 'resources_upload',
    path: '/resources',
    element: '#tour-resources-upload',
    title: 'Share Resources',
    description: 'Upload your own study materials, documents, and helpful links to help others.',
    position: 'bottom' as const,
    allowInteraction: true,
  },
  {
    id: 'files',
    path: '/files',
    element: '[href$="/files"]',
    title: 'Personal Files',
    description: 'Access your private cloud storage to keep all your study documents organized in one place.',
    position: 'right' as const,
    allowInteraction: true,
  },
  {
    id: 'files_new_folder',
    path: '/files',
    element: '#tour-files-new-folder',
    title: 'File Organization',
    description: 'Create folders to neatly structure your documents, assignments, and study materials.',
    position: 'bottom' as const,
    allowInteraction: true,
  },
  {
    id: 'search',
    path: '/search',
    element: '[href$="/search"]',
    title: 'Global Search',
    description: 'Quickly find anything across the entire platform, including resources, tasks, notes, and study groups.',
    position: 'right' as const,
    allowInteraction: true,
  },
  {
    id: 'search_filters',
    path: '/search',
    element: '#tour-search-filter',
    title: 'Advanced Filtering',
    description: 'Narrow down your search results by selecting specific content types like Tasks or Resources.',
    position: 'bottom' as const,
    allowInteraction: true,
  },
  {
    id: 'notifications',
    path: '/dashboard',
    element: '#notifications-button',
    title: t('steps.notifications.title'),
    description: t('steps.notifications.description'),
    position: 'bottom' as const,
    allowInteraction: true,
  },
  {
    id: 'profile',
    path: '/dashboard',
    element: '#profile-menu',
    title: t('steps.profile.title'),
    description: t('steps.profile.description'),
    position: 'bottom' as const,
    allowInteraction: true,
    actionText: 'Manage your settings from this menu.',
  },
];

export function WalkthroughProvider({ children }: WalkthroughProviderProps) {
  const t = useTranslations('walkthrough');
  const { user } = useAuth();
  const {
    isActive,
    currentStep,
    hasCompleted,
    hasSeenWelcome,
    startTour,
    skipTour,
    nextStep,
    previousStep,
    completeTour,
    setHasSeenWelcome,
  } = useWalkthroughStore();

  const [showWelcome, setShowWelcome] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  // Memoize tour steps to prevent unnecessary re-renders of GuidedTour
  const tourSteps = useMemo(() => getTourSteps(t), [t]);

  // Check if user should see walkthrough.
  // Only show when walkthrough_completed is explicitly false (not null/undefined,
  // which indicates a pre-migration user who should be treated as already done).
  useEffect(() => {
    if (
      user &&
      user.walkthrough_completed === false &&
      !hasCompleted &&
      !hasSeenWelcome &&
      !showWelcome
    ) {
      const timer = setTimeout(() => {
        if (!hasSeenWelcome && !showWelcome) {
          setHasSeenWelcome(true);
          setShowWelcome(true);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user?.walkthrough_completed, hasCompleted, hasSeenWelcome, showWelcome, setHasSeenWelcome]);

  // Mark walkthrough as completed in backend with retry
  const markCompleted = useCallback(async () => {
    const MAX_RETRIES = 3;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await apiClient.patch('/auth/walkthrough');
        return; // success
      } catch (error) {
        console.error(`Error marking walkthrough as completed (attempt ${attempt}):`, error);
        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }
    // All retries failed — surface a non-intrusive warning so the user knows
    toast.warning('Could not save your tour progress. It may reappear on your next login.');
  }, []);

  // Handle tour start, avoiding Radix UI pointer-events lock
  const handleStartTour = useCallback(() => {
    setShowWelcome(false);
    setTimeout(() => {
      startTour();
    }, 150);
  }, [startTour]);

  // Handle tour skip
  const handleSkipTour = useCallback(async () => {
    setShowWelcome(false);
    skipTour();
    await markCompleted();
    toast.info(t('controls.tourSkipped'));
  }, [skipTour, markCompleted, t]);

  // Handle tour completion
  const handleTourComplete = useCallback(async () => {
    // Prevent redundant calls
    if (!useWalkthroughStore.getState().isActive) return;

    completeTour();
    await markCompleted();
    setShowCompletion(true);
  }, [completeTour, markCompleted]);

  return (
    <>
      {children}
      
      <WelcomeModal
        open={showWelcome}
        onStartTour={handleStartTour}
        onSkipTour={handleSkipTour}
      />

      {isActive && (
        <GuidedTour
          steps={tourSteps}
          currentStep={currentStep}
          onNext={nextStep}
          onPrevious={previousStep}
          onSkip={handleSkipTour}
          onComplete={handleTourComplete}
        />
      )}

      <CompletionModal
        open={showCompletion}
        onClose={() => setShowCompletion(false)}
      />
    </>
  );
}
