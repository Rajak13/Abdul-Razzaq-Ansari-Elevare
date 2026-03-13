'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from '@/navigation';
import { useTranslations } from 'next-intl';
import { X, ChevronRight, ChevronLeft, Check, Minimize2, Maximize2, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface TourStep {
  id: string;
  path: string;
  element?: string;
  title: string;
  description: string;
  action?: 'click' | 'navigate' | 'observe' | 'interact';
  actionText?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  allowInteraction?: boolean; // Allow clicking on the highlighted element
}

interface GuidedTourProps {
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export function GuidedTour({
  steps,
  currentStep,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
}: GuidedTourProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('walkthrough');
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [actualPosition, setActualPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  const [isMinimized, setIsMinimized] = useState(false);

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  // Navigate to the step's page if needed, but don't force loop back if user navigates freely
  // Only navigate when the step transitions (currentStep changes)
  useEffect(() => {
    if (step && pathname !== step.path && !pathname.includes(step.path)) {
      router.push(step.path);
    }
  }, [step?.path, router]); // Intentionally omitting pathname to avoid aggressive snapping

  // Highlight the target element
  useEffect(() => {
    if (!step?.element || isMinimized) {
      setHighlightedElement(null);
      return;
    }

    let attempts = 0;
    const maxAttempts = 20;

    const findElement = () => {
      const element = document.querySelector(step.element!) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        
        // Calculate popover position
        const rect = element.getBoundingClientRect();
        let position = step.position || 'bottom';
        
        // Window bounding handling to avoid cutting off popover (assuming max popover size of 400x250)
        const approxPopoverWidth = 400;
        
        if (position === 'right' && rect.right + approxPopoverWidth > window.innerWidth) {
          position = 'bottom';
        }
        if (position === 'left' && rect.left - approxPopoverWidth < 0) {
          position = 'bottom';
        }
        
        // Also keep checking if bottom pushes it off screen completely, if so adapt
        if (position === 'bottom' && rect.bottom + 250 > window.innerHeight) {
          position = 'top';
        }
        
        let top = 0;
        let left = 0;

        switch (position) {
          case 'top':
            top = Math.max(0, rect.top - 20);
            left = Math.min(Math.max(approxPopoverWidth / 2, rect.left + rect.width / 2), window.innerWidth - approxPopoverWidth / 2);
            break;
          case 'bottom':
            top = Math.min(window.innerHeight - 250, rect.bottom + 20);
            left = Math.min(Math.max(approxPopoverWidth / 2, rect.left + rect.width / 2), window.innerWidth - approxPopoverWidth / 2);
            break;
          case 'left':
            top = rect.top + rect.height / 2;
            left = rect.left - 20;
            break;
          case 'right':
            top = rect.top + rect.height / 2;
            left = rect.right + 20;
            break;
        }

        setActualPosition(position);
        setPopoverPosition({ top, left });
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(findElement, 100);
      }
    };

    const timer = setTimeout(findElement, 300);
    return () => {
      clearTimeout(timer);
    };
  }, [step, isMinimized, pathname]); // Re-run when pathname changes just in case DOM changes

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      onNext();
    }
  }, [isLastStep, onNext, onComplete]);

  if (!step) return null;

  return (
    <>
      {/* SVG Mask Overlay for precise cutoff */}
      {!isMinimized && (
        <svg 
          className="fixed inset-0 w-full h-full z-[9998] pointer-events-none" 
          style={{ pointerEvents: 'none' }}
        >
          <path
            d={
              highlightedElement
                ? `
                  M 0 0 H ${typeof window !== 'undefined' ? window.innerWidth : 2000} 
                  V ${typeof window !== 'undefined' ? window.innerHeight : 2000} 
                  H 0 Z 
                  M ${highlightedElement.getBoundingClientRect().left - 8} ${highlightedElement.getBoundingClientRect().top - 8} 
                  V ${highlightedElement.getBoundingClientRect().bottom + 8} 
                  H ${highlightedElement.getBoundingClientRect().right + 8} 
                  V ${highlightedElement.getBoundingClientRect().top - 8} 
                  Z
                `
                : `
                  M 0 0 H ${typeof window !== 'undefined' ? window.innerWidth : 2000} 
                  V ${typeof window !== 'undefined' ? window.innerHeight : 2000} 
                  H 0 Z
                `
            }
            fill="rgba(0,0,0,0.7)"
            fillRule="evenodd"
            pointerEvents="auto"
            // We do NOT want to skip the tour if the user miss-clicks the highlighted element.
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </svg>
      )}

      {/* Pulse ring animation around the hole */}
      {!isMinimized && highlightedElement && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg animate-pulse"
          style={{
            top: highlightedElement.getBoundingClientRect().top - 12,
            left: highlightedElement.getBoundingClientRect().left - 12,
            width: highlightedElement.getBoundingClientRect().width + 24,
            height: highlightedElement.getBoundingClientRect().height + 24,
            border: '2px solid hsl(var(--primary))',
          }}
        />
      )}

      {/* Tour Popover or Minimized Button */}
      <div
        className={`fixed z-[10000] transition-all duration-300 ${
          isMinimized ? 'bottom-6 right-6 w-14 h-14' : 'w-[400px] max-w-[90vw]'
        }`}
        style={isMinimized ? {} : {
          top: highlightedElement ? popoverPosition.top : '50%',
          left: highlightedElement ? popoverPosition.left : '50%',
          transform: highlightedElement 
            ? actualPosition === 'left' ? 'translate(-100%, -50%)'
              : actualPosition === 'right' ? 'translate(0, -50%)'
              : actualPosition === 'top' ? 'translate(-50%, -100%)'
              : 'translate(-50%, 0)'
            : 'translate(-50%, -50%)',
        }}
      >
        {isMinimized ? (
          /* Minimized state - positioned bottom right via CSS classes */
          <button
            onClick={() => setIsMinimized(false)}
            className="w-full h-full bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform ring-4 ring-primary/30"
            title="Resume tutorial"
          >
            <Maximize2 className="w-6 h-6 animate-pulse" />
          </button>
        ) : (
          /* Full popover */
          <div className="bg-background border-2 border-primary/20 rounded-lg shadow-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header with minimize and close */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1 rounded-md hover:bg-accent transition-colors"
                title="Minimize tour"
              >
                <Minimize2 className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={onSkip}
                className="p-1 rounded-md hover:bg-accent transition-colors"
                title="End tour"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Progress */}
            <div className="mb-4 pr-16">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <span className="text-xs font-medium text-primary">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* Content */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>

              {/* Interaction hint */}
              {step.allowInteraction && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-2 mt-4">
                  <Hand className="w-4 h-4 text-primary mt-0.5 flex-shrink-0 animate-bounce" />
                  <p className="text-xs text-primary font-medium">
                    {step.actionText || 'You can freely click and interact with this feature!'}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrevious}
                disabled={currentStep === 0}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <Button
                size="sm"
                onClick={handleNext}
                className="gap-1"
              >
                {isLastStep ? (
                  <>
                    <Check className="w-4 h-4" />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
