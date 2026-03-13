import { DriveStep } from 'driver.js';

export interface TourStep extends DriveStep {
  id: string;
}

export const getTourSteps = (t: any): TourStep[] => [
  {
    id: 'dashboard',
    element: '#dashboard-area',
    popover: {
      title: t('steps.dashboard.title'),
      description: t('steps.dashboard.description'),
      side: 'bottom',
      align: 'center',
    },
  },
  {
    id: 'tasks',
    element: '[href="/tasks"]',
    popover: {
      title: t('steps.tasks.title'),
      description: t('steps.tasks.description'),
      side: 'right',
      align: 'start',
    },
  },
  {
    id: 'notes',
    element: '[href="/notes"]',
    popover: {
      title: t('steps.notes.title'),
      description: t('steps.notes.description'),
      side: 'right',
      align: 'start',
    },
  },
  {
    id: 'groups',
    element: '[href="/groups"]',
    popover: {
      title: t('steps.groups.title'),
      description: t('steps.groups.description'),
      side: 'right',
      align: 'start',
    },
  },
  {
    id: 'resources',
    element: '[href="/resources"]',
    popover: {
      title: t('steps.resources.title'),
      description: t('steps.resources.description'),
      side: 'right',
      align: 'start',
    },
  },
  {
    id: 'notifications',
    element: '#notifications-button',
    popover: {
      title: t('steps.notifications.title'),
      description: t('steps.notifications.description'),
      side: 'bottom',
      align: 'end',
    },
  },
  {
    id: 'profile',
    element: '#profile-menu',
    popover: {
      title: t('steps.profile.title'),
      description: t('steps.profile.description'),
      side: 'bottom',
      align: 'end',
    },
  },
];
