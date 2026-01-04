'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Palette, Pencil, Plus, Trash2, FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import {
    useCreateTaskCategory,
    useDeleteTaskCategory,
    useTaskCategories,
    useUpdateTaskCategory,
    useTasks
} from '@/hooks/use-tasks'
import { z } from 'zod'
import type { TaskCategory, CreateCategoryData, UpdateCategoryData } from '@/types/task'

const taskCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Category name must be less than 50 characters'),
  color: z.string().min(1, 'Color is required'),
})

type TaskCategoryFormData = z.infer<typeof taskCategorySchema>

const predefinedColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
  '#F43F5E', // Rose
]

interface CategoryFormProps {
  category?: TaskCategory
  onSuccess: () => void
}

function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const [selectedColor, setSelectedColor] = useState(category?.color || '#3B82F6')
  
  const createCategory = useCreateTaskCategory()
  const updateCategory = useUpdateTaskCategory()

  const form = useForm<TaskCategoryFormData>({
    resolver: zodResolver(taskCategorySchema),
    defaultValues: {
      name: category?.name || '',
      color: category?.color || '#3B82F6',
    },
  })

  const { register, handleSubmit, setValue, formState: { errors } } = form

  const onSubmit = async (data: TaskCategoryFormData) => {
    try {
      const categoryData = { ...data, color: selectedColor }
      
      if (category) {
        await updateCategory.mutateAsync({ id: category.id, data: categoryData })
      } else {
        await createCategory.mutateAsync(categoryData)
      }
      
      onSuccess()
    } catch (error) {
      console.error('Failed to save category:', error)
    }
  }

  const isLoading = createCategory.isPending || updateCategory.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">Category Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Enter category name..."
          className={cn(
            "transition-all duration-200",
            errors.name ? 'border-red-500 focus:border-red-500' : 'focus:border-primary'
          )}
        />
        {errors.name && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <span>⚠️</span>
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Color</Label>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-gray-300 shadow-sm"
            style={{ backgroundColor: selectedColor }}
          />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-2">Choose from presets:</p>
            <div className="flex flex-wrap gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "w-8 h-8 rounded-full border-2 hover:scale-110 transition-all duration-200",
                    selectedColor === color ? 'border-gray-900 ring-2 ring-gray-300' : 'border-gray-300'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setSelectedColor(color)
                    setValue('color', color)
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="custom-color" className="text-sm">Custom color:</Label>
          <Input
            id="custom-color"
            type="color"
            value={selectedColor}
            onChange={(e) => {
              setSelectedColor(e.target.value)
              setValue('color', e.target.value)
            }}
            className="w-16 h-10 p-1 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
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
              <span>{category ? '💾' : '➕'}</span>
              {category ? 'Update Category' : 'Create Category'}
            </div>
          )}
        </Button>
      </div>
    </form>
  )
}

interface TaskCategoryManagerProps {
  className?: string
}

export function TaskCategoryManager({ className }: TaskCategoryManagerProps) {
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const { data: categories, isLoading } = useTaskCategories()
  const { data: tasksResponse } = useTasks({})
  const deleteCategory = useDeleteTaskCategory()
  
  // Ensure categories is always an array
  const categoriesArray = Array.isArray(categories) ? categories : []
  const tasks = Array.isArray(tasksResponse?.data) ? tasksResponse.data : []

  // Calculate task counts per category
  const getCategoryTaskCount = (categoryId: string) => {
    return tasks.filter(task => task.category_id === categoryId).length
  }

  const handleEdit = (category: TaskCategory) => {
    setEditingCategory(category)
    setShowEditDialog(true)
  }

  const handleDelete = async (category: TaskCategory) => {
    const taskCount = getCategoryTaskCount(category.id)
    const confirmMessage = taskCount > 0 
      ? `Are you sure you want to delete the category "${category.name}"? This will uncategorize ${taskCount} task${taskCount > 1 ? 's' : ''}. This action cannot be undone.`
      : `Are you sure you want to delete the category "${category.name}"? This action cannot be undone.`
    
    if (confirm(confirmMessage)) {
      try {
        await deleteCategory.mutateAsync(category.id)
      } catch (error) {
        console.error('Failed to delete category:', error)
      }
    }
  }

  const handleCreateSuccess = () => {
    setShowCreateDialog(false)
  }

  const handleEditSuccess = () => {
    setShowEditDialog(false)
    setEditingCategory(null)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading categories...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Task Categories
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>➕</span>
                  Create New Category
                </DialogTitle>
              </DialogHeader>
              <CategoryForm onSuccess={handleCreateSuccess} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {categoriesArray.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center mb-4">
              <FolderOpen className="h-10 w-10 text-primary/60" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No categories yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first category to organize your tasks better.</p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
              <Plus className="h-4 w-4 mr-2" />
              Create Category
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {categoriesArray.map((category) => {
              const taskCount = getCategoryTaskCount(category.id)
              return (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                      style={{ backgroundColor: category.color || '#6b7280' }}
                    />
                    <div>
                      <span className="font-medium">{category.name}</span>
                      {taskCount > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {taskCount} task{taskCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category)}
                      className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                      disabled={deleteCategory.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>✏️</span>
                Edit Category
              </DialogTitle>
            </DialogHeader>
            {editingCategory && (
              <CategoryForm 
                category={editingCategory} 
                onSuccess={handleEditSuccess} 
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}