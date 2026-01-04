'use client'

import { Filter, Search, Tag, X, Calendar, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { useTaskCategories } from '@/hooks/use-tasks'
import type { TaskFilters as TaskFiltersData } from '@/types/task'

interface TaskFiltersProps {
  filters: Partial<TaskFiltersData>
  onFiltersChange: (filters: Partial<TaskFiltersData>) => void
  className?: string
}

const priorityOptions: { value: string; label: string; emoji: string }[] = [
  { value: 'low', label: 'Low', emoji: '🟢' },
  { value: 'medium', label: 'Medium', emoji: '🟡' },
  { value: 'high', label: 'High', emoji: '🟠' },
  { value: 'urgent', label: 'Urgent', emoji: '🔴' },
]

const statusOptions: { value: string; label: string; emoji: string }[] = [
  { value: 'pending', label: 'Pending', emoji: '⏳' },
  { value: 'completed', label: 'Completed', emoji: '✅' },
]

const sortOptions = [
  { value: 'sort_order|asc', label: 'Custom Order', icon: '🔄' },
  { value: 'created_at|desc', label: 'Newest First', icon: '📅' },
  { value: 'created_at|asc', label: 'Oldest First', icon: '📅' },
  { value: 'due_date|asc', label: 'Due Date (Soon)', icon: '⏰' },
  { value: 'due_date|desc', label: 'Due Date (Later)', icon: '⏰' },
  { value: 'priority|desc', label: 'Priority (High)', icon: '🔴' },
  { value: 'priority|asc', label: 'Priority (Low)', icon: '🟢' },
  { value: 'title|asc', label: 'Title (A-Z)', icon: '🔤' },
  { value: 'title|desc', label: 'Title (Z-A)', icon: '🔤' },
]

export function TaskFilters({ filters, onFiltersChange, className }: TaskFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [searchValue, setSearchValue] = useState(filters.search || '')
  
  const { data: categories } = useTaskCategories()
  const categoriesArray = Array.isArray(categories) ? categories : []

  // Debounce search input
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: value || undefined })
    }, 300)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const updateFilter = (key: keyof TaskFiltersData, value: unknown) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const addTag = () => {
    if (tagInput.trim() && !filters.tags?.includes(tagInput.trim())) {
      const newTags = [...(filters.tags || []), tagInput.trim()]
      updateFilter('tags', newTags)
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    const newTags = filters.tags?.filter(tag => tag !== tagToRemove) || []
    updateFilter('tags', newTags.length > 0 ? newTags : undefined)
  }

  const clearFilters = () => {
    setSearchValue('')
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    onFiltersChange({
      search: undefined,
      status: undefined,
      priority: undefined,
      category_id: undefined,
      tags: undefined,
      due_date_from: undefined,
      due_date_to: undefined,
      sort_by: 'sort_order',
      sort_order: 'asc',
    })
  }

  const hasActiveFilters = filters.status || filters.priority || filters.category_id || 
                          (filters.tags && filters.tags.length > 0) || 
                          filters.due_date_from || filters.due_date_to || filters.search

  const activeFilterCount = [
    filters.status,
    filters.priority, 
    filters.category_id,
    filters.tags && filters.tags.length > 0 ? filters.tags : null,
    filters.due_date_from,
    filters.due_date_to,
    filters.search
  ].filter(Boolean).length

  return (
    <Card className={cn("border-0 shadow-none bg-transparent", className)}>
      <CardContent className="p-0 space-y-4">
        {/* Search and Sort - Mobile Responsive */}
        <div className="space-y-3">
          {/* Search Bar - Full width on mobile */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks by title, description, or tags..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary transition-all duration-200"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => {
                  setSearchValue('')
                  handleSearchChange('')
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* Sort Controls and Filters - Responsive layout */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex gap-2 flex-1">
              <Select
                value={`${filters.sort_by || 'sort_order'}|${filters.sort_order || 'asc'}`}
                onValueChange={(value) => {
                  const [sort_by, sort_order] = value.split('|')
                  onFiltersChange({ ...filters, sort_by, sort_order: sort_order as 'asc' | 'desc' })
                }}
              >
                <SelectTrigger className="flex-1 sm:w-auto sm:min-w-[180px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <span>{option.icon}</span>
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={cn(
                "flex items-center justify-center gap-2 w-full sm:w-auto sm:min-w-[120px] transition-all duration-200",
                "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
                showAdvanced && "bg-primary/5 border-primary/20"
              )}
            >
              <Filter className="h-4 w-4" />
              <span className="sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", showAdvanced && "rotate-180")} />
            </Button>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {filters.search && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Search className="h-3 w-3" />
                Search: {filters.search}
                <button onClick={() => handleSearchChange('')} className="ml-1 hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.status && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>⏳</span>
                Status: {filters.status}
                <button onClick={() => updateFilter('status', undefined)} className="ml-1 hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.priority && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{priorityOptions.find(p => p.value === filters.priority)?.emoji}</span>
                Priority: {filters.priority}
                <button onClick={() => updateFilter('priority', undefined)} className="ml-1 hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.category_id && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: categoriesArray.find(c => c.id === filters.category_id)?.color || '#6b7280' }}
                />
                Category: {categoriesArray.find(c => c.id === filters.category_id)?.name}
                <button onClick={() => updateFilter('category_id', undefined)} className="ml-1 hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.tags && filters.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {tag}
                <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
              Clear all
            </Button>
          </div>
        )}

        {/* Advanced Filters */}
        {showAdvanced && (
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Advanced Filters
                </h4>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${option.value}`}
                        checked={filters.status === option.value}
                        onCheckedChange={(checked) => {
                          updateFilter('status', checked ? option.value : undefined)
                        }}
                      />
                      <Label htmlFor={`status-${option.value}`} className="text-sm flex items-center gap-1 cursor-pointer">
                        <span>{option.emoji}</span>
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Priority</Label>
                <div className="flex flex-wrap gap-2">
                  {priorityOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`priority-${option.value}`}
                        checked={filters.priority === option.value}
                        onCheckedChange={(checked) => {
                          updateFilter('priority', checked ? option.value : undefined)
                        }}
                      />
                      <Label htmlFor={`priority-${option.value}`} className="text-sm flex items-center gap-1 cursor-pointer">
                        <span>{option.emoji}</span>
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <Select
                  value={filters.category_id || 'all'}
                  onValueChange={(value) => updateFilter('category_id', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <span>📂</span>
                        All categories
                      </div>
                    </SelectItem>
                    {categoriesArray.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color || '#6b7280' }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tags</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Add tag filter..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="flex-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addTag} 
                    className="w-full sm:w-auto"
                    disabled={!tagInput.trim() || (filters.tags?.includes(tagInput.trim()) ?? false)}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                
                {filters.tags && filters.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg">
                    {filters.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs">
                        <Tag className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{tag}</span>
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600 flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due Date Range
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input
                      type="date"
                      value={filters.due_date_from?.split('T')[0] || ''}
                      onChange={(e) => updateFilter('due_date_from', e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined)}
                      className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input
                      type="date"
                      value={filters.due_date_to?.split('T')[0] || ''}
                      onChange={(e) => updateFilter('due_date_to', e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined)}
                      className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}