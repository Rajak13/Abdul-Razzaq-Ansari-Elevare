'use client'

import {
    CheckCircle2,
    HelpCircle,
    Tag,
    Trash2,
    X
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

import { useBulkDeleteTasks, useBulkUpdateTasks, useTaskCategories } from '@/hooks/use-tasks'
import type { Task } from '@/types/task'

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
type TaskStatus = 'pending' | 'completed'

interface TaskBulkOperationsProps {
  selectedTasks: Task[]
  onSelectionChange: (taskIds: string[]) => void
  onClearSelection: () => void
  onCreateTask?: () => void
  className?: string
}

interface BulkUpdateData {
  status?: TaskStatus
  priority?: TaskPriority
  category_id?: string
  due_date?: string
  tags?: string[]
}

const KEYBOARD_SHORTCUTS = [
  { key: 'Ctrl/Cmd + N', action: 'Create new task' },
  { key: 'Ctrl/Cmd + A', action: 'Select all tasks' },
  { key: 'Escape', action: 'Clear selection' },
  { key: 'Delete', action: 'Delete selected tasks' },
  { key: 'Ctrl/Cmd + Enter', action: 'Complete selected tasks' },
  { key: 'Ctrl/Cmd + U', action: 'Bulk update selected tasks' },
  { key: 'Ctrl/Cmd + ?', action: 'Show keyboard shortcuts' },
]

export function TaskBulkOperations({ 
  selectedTasks, 
  onClearSelection,
  onCreateTask,
  className 
}: TaskBulkOperationsProps) {
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [bulkUpdateData, setBulkUpdateData] = useState<BulkUpdateData>({})
  const [newTag, setNewTag] = useState('')
  
  const { toast } = useToast()
  const bulkUpdateTasks = useBulkUpdateTasks()
  const bulkDeleteTasks = useBulkDeleteTasks()
  const { data: categoriesResponse } = useTaskCategories()
  
  const categories = categoriesResponse || []
  const selectedCount = selectedTasks.length

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = event.ctrlKey || event.metaKey
      
      // Ignore if user is typing in an input field
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return
      }

      switch (true) {
        case isCtrlOrCmd && event.key === 'n':
          event.preventDefault()
          onCreateTask?.()
          break
          
        case isCtrlOrCmd && event.key === 'a':
          event.preventDefault()
          // This would need to be handled by parent component
          break
          
        case event.key === 'Escape':
          event.preventDefault()
          onClearSelection()
          break
          
        case event.key === 'Delete' && selectedCount > 0:
          event.preventDefault()
          setShowBulkDeleteDialog(true)
          break
          
        case isCtrlOrCmd && event.key === 'Enter' && selectedCount > 0:
          event.preventDefault()
          handleQuickComplete()
          break
          
        case isCtrlOrCmd && event.key === 'u' && selectedCount > 0:
          event.preventDefault()
          setShowBulkUpdateDialog(true)
          break
          
        case isCtrlOrCmd && event.key === '/':
          event.preventDefault()
          setShowKeyboardShortcuts(true)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedCount, onClearSelection, onCreateTask])

  const handleBulkUpdate = async () => {
    if (selectedCount === 0) return

    try {
      const updates: any = {
        ...bulkUpdateData,
        // If marking as completed, set completed_at
        ...(bulkUpdateData.status === 'completed' && {
          completed_at: new Date().toISOString()
        }),
        // If unmarking as completed, clear completed_at
        ...(bulkUpdateData.status && bulkUpdateData.status !== 'completed' && {
          completed_at: undefined
        })
      }

      await bulkUpdateTasks.mutateAsync({
        ids: selectedTasks.map(task => task.id),
        data: updates
      })
      
      setShowBulkUpdateDialog(false)
      setBulkUpdateData({})
      onClearSelection()
      
      toast({
        title: 'Success',
        description: `Updated ${selectedCount} task${selectedCount > 1 ? 's' : ''}`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tasks',
        variant: 'destructive',
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return

    try {
      await bulkDeleteTasks.mutateAsync(selectedTasks.map(task => task.id))
      
      setShowBulkDeleteDialog(false)
      onClearSelection()
      
      toast({
        title: 'Success',
        description: `Deleted ${selectedCount} task${selectedCount > 1 ? 's' : ''}`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete tasks',
        variant: 'destructive',
      })
    }
  }

  const handleQuickComplete = async () => {
    const incompleteTasks = selectedTasks.filter(task => task.status !== 'completed')
    
    if (incompleteTasks.length === 0) {
      toast({
        title: 'Info',
        description: 'All selected tasks are already completed',
      })
      return
    }

    try {
      await bulkUpdateTasks.mutateAsync({
        ids: incompleteTasks.map(task => task.id),
        data: {
          status: 'completed',
          completed_at: new Date().toISOString()
        }
      })
      
      onClearSelection()
      
      toast({
        title: 'Success',
        description: `Completed ${incompleteTasks.length} task${incompleteTasks.length > 1 ? 's' : ''}`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete tasks',
        variant: 'destructive',
      })
    }
  }

  const addTag = () => {
    if (!newTag.trim()) return
    
    const currentTags = bulkUpdateData.tags || []
    if (!currentTags.includes(newTag.trim())) {
      setBulkUpdateData({
        ...bulkUpdateData,
        tags: [...currentTags, newTag.trim()]
      })
    }
    setNewTag('')
  }

  const removeTag = (tagToRemove: string) => {
    const currentTags = bulkUpdateData.tags || []
    setBulkUpdateData({
      ...bulkUpdateData,
      tags: currentTags.filter(tag => tag !== tagToRemove)
    })
  }

  if (selectedCount === 0) {
    return (
      <>
        {/* Floating help button when no tasks selected */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowKeyboardShortcuts(true)}
          className="fixed bottom-4 right-4 z-40 bg-white/80 backdrop-blur-sm hover:bg-white"
        >
          <HelpCircle className="h-4 w-4 mr-1" />
          Shortcuts
        </Button>

        {/* Keyboard Shortcuts Dialog */}
        <Dialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Keyboard Shortcuts</DialogTitle>
              <DialogDescription>
                Use these shortcuts to work more efficiently with tasks.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-3">
              {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <span className="text-sm">{shortcut.action}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {shortcut.key}
                  </Badge>
                </div>
              ))}
            </div>
            
            <DialogFooter>
              <Button onClick={() => setShowKeyboardShortcuts(false)}>
                Got it
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <>
      <div className={cn(
        'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50',
        'bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700',
        'rounded-lg shadow-lg p-4 min-w-[320px]',
        className
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span className="font-medium">
              {selectedCount} task{selectedCount > 1 ? 's' : ''} selected
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowKeyboardShortcuts(true)}
              className="p-1 h-auto"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={handleQuickComplete}
            className="bg-green-600 hover:bg-green-700"
            disabled={bulkUpdateTasks.isPending}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Complete
            <Badge variant="secondary" className="ml-2 text-xs">
              Ctrl+↵
            </Badge>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkUpdateDialog(true)}
          >
            <Tag className="h-4 w-4 mr-1" />
            Update
            <Badge variant="secondary" className="ml-2 text-xs">
              Ctrl+U
            </Badge>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBulkDeleteDialog(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
            <Badge variant="secondary" className="ml-2 text-xs">
              Del
            </Badge>
          </Button>
        </div>
      </div>

      {/* Bulk Update Dialog */}
      <Dialog open={showBulkUpdateDialog} onOpenChange={setShowBulkUpdateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update {selectedCount} Task{selectedCount > 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Choose which properties to update for the selected tasks.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={bulkUpdateData.status || ''}
                onValueChange={(value) => 
                  setBulkUpdateData({ ...bulkUpdateData, status: value as TaskStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={bulkUpdateData.priority || ''}
                onValueChange={(value) => 
                  setBulkUpdateData({ ...bulkUpdateData, priority: value as TaskPriority })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={bulkUpdateData.category_id || ''}
                onValueChange={(value) => 
                  setBulkUpdateData({ ...bulkUpdateData, category_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Category</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="datetime-local"
                value={bulkUpdateData.due_date || ''}
                onChange={(e) => 
                  setBulkUpdateData({ ...bulkUpdateData, due_date: e.target.value })
                }
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Add Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                />
                <Button type="button" onClick={addTag} size="sm">
                  Add
                </Button>
              </div>
              
              {bulkUpdateData.tags && bulkUpdateData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {bulkUpdateData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkUpdateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpdate}
              disabled={bulkUpdateTasks.isPending}
            >
              Update Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedCount} Task{selectedCount > 1 ? 's' : ''}?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The selected tasks will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteTasks.isPending}
            >
              Delete Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={showKeyboardShortcuts} onOpenChange={setShowKeyboardShortcuts}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Use these shortcuts to work more efficiently with tasks.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <span className="text-sm">{shortcut.action}</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {shortcut.key}
                </Badge>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowKeyboardShortcuts(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}