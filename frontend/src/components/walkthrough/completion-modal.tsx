'use client';

import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface CompletionModalProps {
  open: boolean;
  onClose: () => void;
}

export function CompletionModal({ open, onClose }: CompletionModalProps) {
  const t = useTranslations('walkthrough.completion');
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (open) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg border-2">
        <DialogTitle className="sr-only">{t('title')}</DialogTitle>
        
        <div className="flex flex-col items-center text-center space-y-6 py-6">
          {/* Success Icon with Animation */}
          <div className="relative">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-14 h-14 text-green-600 dark:text-green-400 animate-in zoom-in duration-500" />
            </div>
            {showConfetti && (
              <>
                <Sparkles className="absolute -top-2 -left-2 w-6 h-6 text-yellow-500 animate-bounce" />
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-blue-500 animate-bounce delay-75" />
                <Sparkles className="absolute -bottom-2 left-4 w-6 h-6 text-pink-500 animate-bounce delay-150" />
              </>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {t('title')}
            </h2>
            <p className="text-muted-foreground max-w-md leading-relaxed">
              {t('description')}
            </p>
          </div>

          {/* Summary */}
          <div className="w-full bg-accent/50 rounded-lg p-4 text-left space-y-2">
            <p className="text-sm font-medium text-foreground">What you learned:</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('summary')}
            </p>
          </div>

          {/* Button */}
          <Button
            onClick={onClose}
            className="w-full gap-2"
            size="lg"
          >
            <Sparkles className="w-4 h-4" />
            {t('button')}
          </Button>

          <p className="text-xs text-muted-foreground">
            Need help? Check the help menu anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
