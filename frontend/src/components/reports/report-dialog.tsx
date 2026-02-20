'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { submitReport } from '@/lib/api-client';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'resource' | 'group' | 'message' | 'comment';
  contentId: string;
}

export function ReportDialog({
  open,
  onOpenChange,
  contentType,
  contentId
}: ReportDialogProps) {
  const t = useTranslations('reports');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!reason) {
      toast.error(t('selectReason'));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await submitReport(contentType, contentId, reason, description);
      toast.success(t('success'));
      onOpenChange(false);
      setReason('');
      setDescription('');
    } catch (error: any) {
      if (error.response?.data?.error === 'DUPLICATE_REPORT') {
        toast.error(t('duplicate'));
      } else if (error.response?.data?.error === 'RATE_LIMIT_EXCEEDED') {
        toast.error(t('rateLimitExceeded'));
      } else if (error.response?.data?.error === 'CANNOT_REPORT_OWN_CONTENT') {
        toast.error(t('cannotReportOwn'));
      } else {
        toast.error(t('error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        // Reset form when closing
        setReason('');
        setDescription('');
      }
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('title', { contentType: t(`contentTypes.${contentType}`) })}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t('reason')}</Label>
            <Select value={reason} onValueChange={setReason} disabled={isSubmitting}>
              <SelectTrigger id="reason">
                <SelectValue placeholder={t('selectReason')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">{t('reasons.spam')}</SelectItem>
                <SelectItem value="harassment">{t('reasons.harassment')}</SelectItem>
                <SelectItem value="inappropriate_content">{t('reasons.inappropriate_content')}</SelectItem>
                <SelectItem value="copyright_violation">{t('reasons.copyright_violation')}</SelectItem>
                <SelectItem value="hate_speech">{t('reasons.hate_speech')}</SelectItem>
                <SelectItem value="violence">{t('reasons.violence')}</SelectItem>
                <SelectItem value="other">{t('reasons.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">{t('descriptionLabel')}</Label>
            <Textarea
              id="description"
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              disabled={isSubmitting}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/1000
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            type="button"
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
            type="button"
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
