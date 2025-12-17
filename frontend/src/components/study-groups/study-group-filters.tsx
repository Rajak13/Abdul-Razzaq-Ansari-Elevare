'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { StudyGroupQueryParams } from '@/types/study-group';
import { Filter, X } from 'lucide-react';

interface StudyGroupFiltersProps {
  filters: StudyGroupQueryParams;
  onFiltersChange: (filters: StudyGroupQueryParams) => void;
}

export function StudyGroupFilters({ filters, onFiltersChange }: StudyGroupFiltersProps) {
  const hasActiveFilters = Object.keys(filters).length > 0;

  const handleFilterChange = (key: keyof StudyGroupQueryParams, value: any) => {
    const newFilters = { ...filters };
    
    if (value === undefined || value === null) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">
                {Object.keys(filters).length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuCheckboxItem
            checked={filters.is_private === false}
            onCheckedChange={(checked) => 
              handleFilterChange('is_private', checked ? false : undefined)
            }
          >
            Public Groups Only
          </DropdownMenuCheckboxItem>
          
          <DropdownMenuCheckboxItem
            checked={filters.is_private === true}
            onCheckedChange={(checked) => 
              handleFilterChange('is_private', checked ? true : undefined)
            }
          >
            Private Groups Only
          </DropdownMenuCheckboxItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuCheckboxItem
            checked={filters.member_of === true}
            onCheckedChange={(checked) => 
              handleFilterChange('member_of', checked ? true : undefined)
            }
          >
            Groups I'm In
          </DropdownMenuCheckboxItem>
          
          <DropdownMenuCheckboxItem
            checked={filters.owned_by_me === true}
            onCheckedChange={(checked) => 
              handleFilterChange('owned_by_me', checked ? true : undefined)
            }
          >
            Groups I Own
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}