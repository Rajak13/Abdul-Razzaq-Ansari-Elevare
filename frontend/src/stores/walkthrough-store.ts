import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalkthroughState {
  isActive: boolean;
  currentStep: number;
  hasCompleted: boolean;
  hasSeenWelcome: boolean;
  startTour: () => void;
  skipTour: () => void;
  skipStep: () => void;
  nextStep: () => void;
  previousStep: () => void;
  completeTour: () => void;
  resetTour: () => void;
  setHasSeenWelcome: (seen: boolean) => void;
}

export const useWalkthroughStore = create<WalkthroughState>()(
  persist(
    (set) => ({
      isActive: false,
      currentStep: 0,
      hasCompleted: false,
      hasSeenWelcome: false,

      startTour: () => set({ isActive: true, currentStep: 0 }),

      skipTour: () => set({ isActive: false, hasCompleted: true }),

      skipStep: () => set((state) => ({ 
        currentStep: state.currentStep + 1 
      })),

      nextStep: () => set((state) => ({ 
        currentStep: state.currentStep + 1 
      })),

      previousStep: () => set((state) => ({ 
        currentStep: Math.max(0, state.currentStep - 1) 
      })),

      completeTour: () => set({ 
        isActive: false, 
        hasCompleted: true,
        currentStep: 0
      }),

      resetTour: () => set({ 
        isActive: false,
        currentStep: 0,
        hasCompleted: false,
        hasSeenWelcome: false
      }),

      setHasSeenWelcome: (seen) => set({ hasSeenWelcome: seen }),
    }),
    {
      name: 'elevare-walkthrough',
    }
  )
);
