'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface WelcomeModalProps {
  open: boolean;
  onStartTour: () => void;
  onSkipTour: () => void;
}

export function WelcomeModal({ open, onStartTour, onSkipTour }: WelcomeModalProps) {
  const t = useTranslations('walkthrough.welcome');
  const { user } = useAuth();

  const userName = user?.name || user?.email?.split('@')[0] || 'there';

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg [&>button]:hidden border-2" 
        onPointerDownOutside={(e) => e.preventDefault()} 
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{t('title', { name: userName })}</DialogTitle>
        
        <div className="flex flex-col items-center text-center space-y-6 py-6">
          {/* Icon */}
          <div className="relative">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xs text-primary-foreground font-bold">!</span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {t('title', { name: userName })}
            </h2>
            <p className="text-muted-foreground max-w-md leading-relaxed">
              {t('description')}
            </p>
          </div>

          {/* Features list */}
          <div className="w-full bg-accent/50 rounded-lg p-4 space-y-2 text-left">
            <p className="text-sm font-medium text-foreground">You'll learn about:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Dashboard & Task Management
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Smart Notes & Study Groups
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Resources & Notifications
              </li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
            <Button
              onClick={onStartTour}
              className="flex-1 gap-2"
              size="lg"
            >
              {t('startButton')}
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              onClick={onSkipTour}
              variant="outline"
              className="flex-1 gap-2"
              size="lg"
            >
              <X className="w-4 h-4" />
              {t('skipButton')}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Takes about 2 minutes • You can skip anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
