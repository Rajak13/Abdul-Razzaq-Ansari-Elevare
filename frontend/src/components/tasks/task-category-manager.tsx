'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Edit, Plus, Trash2 } from 'lucide-react'
import { 
  useTaskCategories, 
  useCreateTaskCategory, 
  useUpdateTaskCategory, 
  useDeleteTaskCategory 
} from '@/hooks/use-tasks'
import type { TaskCategory, CreateCategoryData, UpdateCategoryData } from '@/types/task'

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
]

export function TaskCategoryManager() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null)

  const { data: categories, isLoading, error } = useTaskCategories()
  
  // Ensure categories is always an array
  const categoriesArray = Array.isArray(categories) ? categories : []
  const createMutation = useCreateTaskCategory()
  const updateMutation = useUpdateTaskCategory()
  const deleteMutation = useDeleteTaskCategory()

  const handleCreate = async (data: CreateCategoryData) => {
    try {
      await createMutation.mutateAsync(data)
      setShowCreateDialog(false)
    } catch (error) {
      console.error('Failed to create category:', error)
    }
  }

  const handleUpdate = async (data: UpdateCategoryData) => {
    if (!selectedCategory) return
    
    try {
      await updateMutation.mutateAsync({ id: selectedCategory.id, data })
      setShowEditDialog(false)
      setSelectedCategory(null)
    } catch (error) {
      console.error('Failed to update category:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? Tasks using this category will be uncategorized.')) {
      return
    }
    
    try {
      await deleteMutation.mutateAsync(id)
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const handleEdit = (category: TaskCategory) => {
    setSelectedCategory(category)
    setShowEditDialog(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Failed to load categories</p>
        <p className="text-sm text-muted-foreground">
          Make sure the backend server is running
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Task Categories</h3>
          <p className="text-sm text-muted-foreground">
            Organize your tasks with custom categories
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categoriesArray.map((category) => (
          <Card key={category.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color || '#6b7280' }}
                  />
                  <span className="font-medium">{category.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categoriesArray.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No categories yet</p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first category
          </Button>
        </div>
      )}

      {/* Create Category Dialog */}
      <CategoryDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
        title="Create Category"
      />

      {/* Edit Category Dialog */}
      <CategoryDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
        title="Edit Category"
        category={selectedCategory}
      />
    </div>
  )
}

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateCategoryData) => void
  isLoading: boolean
  title: string
  category?: TaskCategory | null
}

function CategoryDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  title,
  category,
}: CategoryDialogProps) {
  const [name, setName] = useState(category?.name || '')
  const [color, setColor] = useState(category?.color || DEFAULT_COLORS[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    onSubmit({ name: name.trim(), color })
  }

  const handleClose = () => {
    setName(category?.name || '')
    setColor(category?.color || DEFAULT_COLORS[0])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter category name"
              required
            />
          </div>

          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DEFAULT_COLORS.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === colorOption ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? 'Saving...' : category ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}