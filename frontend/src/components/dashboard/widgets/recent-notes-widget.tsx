'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Plus } from 'lucide-react'
import { useNotes } from '@/hooks/use-notes'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { toast } from 'sonner'

interface RecentNotesWidgetProps {
  className?: string
}

export function RecentNotesWidget({ className }: RecentNotesWidgetProps) {
  const { data: notesResponse, isLoading, error } = useNotes({
    limit: 5,
    sort_by: 'updated_at',
    order: 'desc'
  })

  // Ensure notes is always an array
  const notes = Array.isArray(notesResponse) ? notesResponse : []

  // Show error toast if there's an error
  if (error) {
    toast.error('Failed to load recent notes')
  }

  // Helper function to extract preview text from content
  const getPreview = (content: any): string => {
    if (typeof content === 'string') {
      // Remove markdown formatting and get first 100 characters
      return content
        .replace(/[#*`_\[\]()]/g, '')
        .replace(/\n/g, ' ')
        .trim()
        .substring(0, 100) + (content.length > 100 ? '...' : '')
    }
    return 'No preview available'
  }

  return (
    <Card className={`${className} h-full`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">Recent Notes</CardTitle>
        <Link href="/notes/create">
          <Button size="sm" variant="outline" className="h-8">
            <Plus className="mr-1 h-3 w-3" />
            New Note
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-3">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start space-x-3 rounded-lg p-2">
                  <div className="h-4 w-4 bg-muted rounded animate-pulse mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : notes.length > 0 ? (
            <>
              {notes.map((note) => (
                <Link key={note.id} href={`/notes/${note.id}`}>
                  <div className="flex items-start space-x-3 rounded-lg p-2 hover:bg-muted/50 cursor-pointer transition-colors">
                    <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{note.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {getPreview(note.content)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              
              <Link href="/notes/all">
                <Button variant="ghost" size="sm" className="w-full text-xs">
                  View All Notes
                </Button>
              </Link>
            </>
          ) : (
            <div className="text-center py-6">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">No notes yet</p>
              <Link href="/notes/create">
                <Button size="sm" variant="outline">
                  <Plus className="mr-1 h-3 w-3" />
                  Create your first note
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}