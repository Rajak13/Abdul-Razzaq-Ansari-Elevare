'use client'

import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTaskCategories } from '@/hooks/use-tasks'
import { useState, useEffect, useRef } from 'react'

interface TaskFiltersData {
  status?: string
  priority?: string
  category_id?: string
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

interface TaskFiltersProps {
  filters: Partial<TaskFiltersData>
  onFiltersChange: (filters: Partial<TaskFiltersData>) => void
}

export function TaskFilters({ filters, onFiltersChange }: TaskFiltersProps) {
  const { data: categories } = useTaskCategories()
  const categoriesArray = Array.isArray(categories) ? categories : []
  
  const [searchValue, setSearchValue] = useState(filters.search || '')

  // Debounce search input with useRef to avoid dependency issues
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  
  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ search: value || undefined })
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

  const handleClearFilters = () => {
    setSearchValue('')
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    onFiltersChange({
      status: undefined,
      priority: undefined,
      category_id: undefined,
      search: undefined,
      sort_by: 'sort_order',
      sort_order: 'asc',
    })
  }

  const hasActiveFilters = filters.status || filters.priority || filters.category_id || filters.search

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onFiltersChange({ status: value === 'all' ? undefined : value })}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select
          value={filters.priority || 'all'}
          onValueChange={(value) => onFiltersChange({ priority: value === 'all' ? undefined : value })}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select
          value={filters.category_id || 'all'}
          onValueChange={(value) => onFiltersChange({ category_id: value === 'all' ? undefined : value })}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoriesArray.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color || '#6b7280' }}
                  />
                  <span>{category.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={`${filters.sort_by || 'sort_order'}|${filters.sort_order || 'asc'}`}
          onValueChange={(value) => {
            const [sort_by, sort_order] = value.split('|')
            onFiltersChange({ sort_by, sort_order: sort_order as 'asc' | 'desc' })
          }}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sort_order|asc">Custom Order</SelectItem>
            <SelectItem value="created_at|desc">Newest First</SelectItem>
            <SelectItem value="created_at|asc">Oldest First</SelectItem>
            <SelectItem value="due_date|asc">Due Date (Soon)</SelectItem>
            <SelectItem value="due_date|desc">Due Date (Later)</SelectItem>
            <SelectItem value="priority|desc">Priority (High)</SelectItem>
            <SelectItem value="priority|asc">Priority (Low)</SelectItem>
            <SelectItem value="title|asc">Title (A-Z)</SelectItem>
            <SelectItem value="title|desc">Title (Z-A)</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="whitespace-nowrap"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}