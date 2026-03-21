'use client'

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Note } from '@/types/note';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Edit, Eye, FileText, Hash, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface NoteListProps {
  notes: Note[];
  onNoteSelect?: (note: Note) => void;
  onNoteEdit?: (note: Note) => void;
  onNoteDelete?: (note: Note) => void;
  onCreateNew?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function NoteList({
  notes,
  onNoteSelect,
  onNoteEdit,
  onNoteDelete,
  onCreateNew,
  isLoading = false,
  className = '',
}: NoteListProps) {
  const t = useTranslations('notes');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Get all unique tags from notes
  const allTags = Array.from(new Set(notes.flatMap((note) => note.tags))).sort();

  // Filter notes based on search and tags
  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.summary?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => note.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const getContentPreview = (content: string): string => {
    try {
      // If content is JSON, try to parse it and extract text
      if (content.startsWith('{') || content.startsWith('[')) {
        const parsed = JSON.parse(content);
        const extractText = (node: any): string => {
          if (typeof node === 'string') return node;
          if (node.type === 'text') {
            return node.text || '';
          }
          if (node.content && Array.isArray(node.content)) {
            return node.content.map(extractText).join('');
          }
          return '';
        };
        const text = extractText(parsed);
        return text.slice(0, 150) + (text.length > 150 ? '...' : '');
      } else {
        // If content is plain text/markdown, use it directly
        const text = content.replace(/[#*_`~]/g, '').trim();
        return text.slice(0, 150) + (text.length > 150 ? '...' : '');
      }
    } catch {
      // Fallback to treating as plain text
      const text = content.replace(/[#*_`~]/g, '').trim();
      return text.slice(0, 150) + (text.length > 150 ? '...' : '') || 'No preview available';
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 w-3/4 rounded bg-gray-200"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 rounded bg-gray-200"></div>
                <div className="h-3 w-2/3 rounded bg-gray-200"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with search and create button */}
      <div className="flex items-center justify-between">
        <div className="max-w-md flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input
              placeholder={t('search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {onCreateNew && (
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            {t('newNote')}
          </Button>
        )}
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleTagToggle(tag)}
            >
              <Hash className="mr-1 h-3 w-3" />
              {tag}
            </Badge>
          ))}
          {selectedTags.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTags([])}
              className="h-6 text-xs"
            >
              {tCommon('filter')}
            </Button>
          )}
        </div>
      )}

      {/* Notes list */}
      {filteredNotes.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
            {searchQuery || selectedTags.length > 0 ? t('search.noResults') : t('noNotes')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery || selectedTags.length > 0
              ? t('search.noResults')
              : t('noNotesDescription')}
          </p>
          {onCreateNew && !searchQuery && selectedTags.length === 0 && (
            <Button className="mt-4" onClick={onCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              {t('createNote')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {filteredNotes.map((note) => {
            // Get folder color from note if available
            const folderColor = note.folder?.color || '#6b7280';
            
            return (
              <Card
                key={note.id}
                className="group relative cursor-pointer transition-all hover:shadow-lg overflow-hidden border-l-4"
                style={{ 
                  borderLeftColor: folderColor,
                  borderTopLeftRadius: '0.75rem',
                  borderBottomLeftRadius: '0.75rem'
                }}
                onClick={() => onNoteSelect?.(note)}
              >
                {/* Folder color accent bar */}
                <div 
                  className="absolute top-0 left-0 w-1 h-full opacity-20"
                  style={{ backgroundColor: folderColor }}
                />
                
                <CardHeader className="pb-2 pt-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {/* Folder color indicator dot */}
                      <div 
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: folderColor }}
                      />
                      <CardTitle className="line-clamp-1 text-base sm:text-lg font-semibold">
                        {note.title}
                      </CardTitle>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onNoteSelect?.(note);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t('viewNote')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onNoteEdit?.(note);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          {t('editNote')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onNoteDelete?.(note);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('deleteNote')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 pb-3 px-4">
                  <p className="mb-2 line-clamp-2 text-xs sm:text-sm text-muted-foreground pl-4">
                    {note.summary || getContentPreview(note.content)}
                  </p>

                  <div className="flex items-center justify-between gap-2 pl-4">
                    <div className="flex flex-wrap gap-1">
                      {note.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 h-5">
                          <Hash className="mr-0.5 h-2 w-2" />
                          {tag}
                        </Badge>
                      ))}
                      {note.tags.length > 2 && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 h-5">
                          +{note.tags.length - 2}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground shrink-0">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDistanceToNow(new Date(note.updated_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}