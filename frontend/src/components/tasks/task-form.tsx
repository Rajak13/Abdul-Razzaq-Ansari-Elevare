'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { CalendarIcon, PlusIcon, TagIcon, X, AlertCircle, Pencil, Save } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { useTaskCategories } from '@/hooks/use-tasks'
import { taskSchema, type TaskFormData } from '@/lib/validations/tasks'
import type { Task, CreateTaskData, UpdateTaskData } from '@/types/task'

interface TaskFormProps {
  task?: Task
  onSubmit: (data: CreateTaskData | UpdateTaskData) => void
  onCancel?: () => void
  isLoading?: boolean
  className?: string
}

const priorityOptions: { value: 'low' | 'medium' | 'high' | 'urgent'; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800 border-red-200' },
]

const statusOptions: { value: 'pending' | 'completed'; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
]

export function TaskForm({ task, onSubmit, onCancel, isLoading, className }: TaskFormProps) {
  const [tagInput, setTagInput] = useState('')
  const [calendarOpen, setCalendarOpen] = useState(false)
  
  const { data: categoriesResponse } = useTaskCategories()
  const categories = Array.isArray(categoriesResponse) ? categoriesResponse : []

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      priority: task?.priority || 'medium',
      status: task?.status || 'pending',
      due_date: task?.due_date || undefined,
      tags: task?.tags || [],
      category_id: task?.category_id || undefined,
    },
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form
  const watchedTags = watch('tags')
  const watchedDueDate = watch('due_date')

  const handleAddTag = () => {
    if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
      const newTags = [...watchedTags, tagInput.trim()]
      setValue('tags', newTags)
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = watchedTags.filter(tag => tag !== tagToRemove)
    setValue('tags', newTags)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleFormSubmit = (data: TaskFormData) => {
    // Convert the form data to match the expected API format
    const submitData = {
      title: data.title,
      description: data.description || undefined,
      priority: data.priority,
      status: data.status,
      due_date: data.due_date || undefined,
      tags: data.tags.length > 0 ? data.tags : undefined,
      category_id: data.category_id || undefined,
    }
    onSubmit(submitData)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {task ? <Pencil className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
          {task ? 'Edit Task' : 'Create New Task'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Enter task title..."
              className={cn(
                "transition-all duration-200",
                errors.title ? 'border-red-500 focus:border-red-500' : 'focus:border-primary'
              )}
            />
            {errors.title && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter task description..."
              rows={3}
              className={cn(
                "transition-all duration-200 resize-none",
                errors.description ? 'border-red-500 focus:border-red-500' : 'focus:border-primary'
              )}
            />
            {errors.description && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <Select
                value={watch('priority')}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setValue('priority', value)}
              >
                <SelectTrigger className="transition-all duration-200 focus:border-primary">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs border', option.color)}>
                          {option.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(value: 'pending' | 'completed') => setValue('status', value)}
              >
                <SelectTrigger className="transition-all duration-200 focus:border-primary">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category and Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select
                value={watch('category_id') || 'none'}
                onValueChange={(value) => setValue('category_id', value === 'none' ? undefined : value)}
              >
                <SelectTrigger className="transition-all duration-200 focus:border-primary">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <span>📂</span>
                      No category
                    </div>
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: category.color || '#6b7280' }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Due Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal transition-all duration-200',
                      !watchedDueDate && 'text-muted-foreground',
                      'focus:border-primary hover:border-primary'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watchedDueDate ? (
                      format(new Date(watchedDueDate), 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watchedDueDate ? new Date(watchedDueDate) : undefined}
                    onSelect={(date) => {
                      setValue('due_date', date?.toISOString())
                      setCalendarOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a tag..."
                className="flex-1 transition-all duration-200 focus:border-primary"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || watchedTags.includes(tagInput.trim())}
                className="px-3 hover:bg-primary hover:text-primary-foreground transition-all duration-200"
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
            
            {watchedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 p-3 bg-muted/30 rounded-lg border">
                {watchedTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1 px-2 py-1 hover:bg-secondary/80 transition-colors">
                    <TagIcon className="h-3 w-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            {errors.tags && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.tags.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {task ? <Save className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                  {task ? 'Update Task' : 'Create Task'}
                </div>
              )}
            </Button>
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                className="hover:bg-muted transition-all duration-200"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}