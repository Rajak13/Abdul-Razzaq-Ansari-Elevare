'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Check,
  Copy,
  Eye,
  Globe,
  Link2,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { noteShareService, type NoteShare } from '@/services/note-share-service';
import {
  useNoteShares,
  useCreateNoteShare,
  useDeactivateShare,
  useDeleteShare,
} from '@/hooks/use-note-shares';
import { formatDistanceToNow } from 'date-fns';

interface ShareNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  noteTitle: string;
}

export function ShareNoteDialog({
  open,
  onOpenChange,
  noteId,
  noteTitle,
}: ShareNoteDialogProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState<string>('never');

  const { data: shares = [], isLoading } = useNoteShares(noteId);
  const createShare = useCreateNoteShare(noteId);
  const deactivateShare = useDeactivateShare(noteId);
  const deleteShare = useDeleteShare(noteId);

  const activeShares = shares.filter(
    (s) => s.is_active && (!s.expires_at || new Date(s.expires_at) > new Date())
  );

  const handleCreateLink = async () => {
    const days = expiryDays === 'never' ? undefined : parseInt(expiryDays, 10);
    const share = await createShare.mutateAsync(days);
    const url = noteShareService.buildShareUrl(share.share_token);
    await copyToClipboard(url, share.id);
    toast.success('Share link created and copied to clipboard!');
  };

  const copyToClipboard = async (url: string, shareId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(shareId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const handleCopy = async (share: NoteShare) => {
    const url = noteShareService.buildShareUrl(share.share_token);
    await copyToClipboard(url, share.id);
    toast.success('Link copied to clipboard!');
  };

  const handleDeactivate = async (shareId: string) => {
    await deactivateShare.mutateAsync(shareId);
  };

  const handleDelete = async (shareId: string) => {
    await deleteShare.mutateAsync(shareId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Share Note
          </DialogTitle>
          <DialogDescription>
            Create a public link so anyone can view &quot;{noteTitle}&quot; without
            logging in.
          </DialogDescription>
        </DialogHeader>

        {/* Create new link */}
        <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">Create a new link</p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select value={expiryDays} onValueChange={setExpiryDays}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Link expiry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never expires</SelectItem>
                  <SelectItem value="1">Expires in 1 day</SelectItem>
                  <SelectItem value="7">Expires in 7 days</SelectItem>
                  <SelectItem value="30">Expires in 30 days</SelectItem>
                  <SelectItem value="90">Expires in 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              onClick={handleCreateLink}
              disabled={createShare.isPending}
              className="shrink-0"
            >
              {createShare.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              {activeShares.length > 0 ? 'New link' : 'Create link'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Anyone with the link can view this note — no account needed.
          </p>
        </div>

        {/* Existing links */}
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activeShares.length > 0 ? (
          <div className="space-y-2">
            <Separator />
            <p className="text-sm font-medium text-foreground">Active links</p>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {activeShares.map((share) => {
                const url = noteShareService.buildShareUrl(share.share_token);
                const isCopied = copiedId === share.id;

                return (
                  <div
                    key={share.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5"
                  >
                    {/* URL input */}
                    <Input
                      readOnly
                      value={url}
                      className="h-8 flex-1 border-0 bg-muted/50 text-xs font-mono focus-visible:ring-0"
                    />

                    {/* Stats */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Eye className="h-3 w-3" />
                      <span>{share.view_count}</span>
                    </div>

                    {/* Expiry badge */}
                    {share.expires_at && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {formatDistanceToNow(new Date(share.expires_at), {
                          addSuffix: true,
                        })}
                      </Badge>
                    )}

                    {/* Copy */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => handleCopy(share)}
                      title="Copy link"
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    {/* Deactivate */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeactivate(share.id)}
                      disabled={deactivateShare.isPending}
                      title="Deactivate link"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(share.id)}
                      disabled={deleteShare.isPending}
                      title="Delete link"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
