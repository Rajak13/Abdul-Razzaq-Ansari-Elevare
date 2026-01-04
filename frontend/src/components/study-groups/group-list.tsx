'use client';

import React, { useState } from 'react';
import { StudyGroupCard } from './study-group-card';
import { useStudyGroups } from '@/hooks/use-study-groups';
import { StudyGroupQueryParams } from '@/types/study-group';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface GroupListProps {
  onCreateGroup?: () => void;
  showCreateButton?: boolean;
  className?: string;
}

export function GroupList({ 
  onCreateGroup, 
  showCreateButton = true, 
  className = '' 
}: GroupListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'my-groups' | 'public'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const queryParams: StudyGroupQueryParams = {
    search: searchTerm || undefined,
    member_of: filter === 'my-groups' || undefined,
    is_private: filter === 'public' ? false : undefined,
    page: currentPage,
    limit: 12
  };

  const { 
    data: groupsData, 
    isLoading, 
    error 
  } = useStudyGroups(queryParams);

  const groups = groupsData?.groups || [];
  const totalPages = groupsData ? Math.ceil(groupsData.total / groupsData.limit) : 0;

  const filterOptions = [
    { 
      id: 'all', 
      label: 'All Groups', 
      count: groupsData?.total || 0 
    },
    { 
      id: 'my-groups', 
      label: 'My Groups', 
      count: groups.filter(g => g.is_member).length 
    },
    { 
      id: 'public', 
      label: 'Public Groups', 
      count: groups.filter(g => !g.is_private).length 
    }
  ];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleFilterChange = (newFilter: 'all' | 'my-groups' | 'public') => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-red-500 mb-2">⚠️</div>
            <p className="text-red-700 font-medium">Failed to load study groups</p>
            <p className="text-red-600 text-sm mt-1">Please try again later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search study groups..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <div className="flex space-x-2">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleFilterChange(option.id as any)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === option.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                  <Badge variant="secondary" className="ml-2">
                    {option.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Groups Grid */}
      {!isLoading && (
        <>
          {groups.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <StudyGroupCard key={group.id} group={group} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      const isCurrentPage = page === currentPage;
                      
                      return (
                        <Button
                          key={page}
                          variant={isCurrentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                    
                    {totalPages > 5 && (
                      <>
                        <span className="text-gray-500">...</span>
                        <Button
                          variant={currentPage === totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          className="w-8 h-8 p-0"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No groups found' : 'No study groups yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? `No groups match "${searchTerm}". Try a different search term.`
                  : 'Get started by creating your first study group or joining an existing one.'
                }
              </p>
              {!searchTerm && showCreateButton && onCreateGroup && (
                <Button onClick={onCreateGroup}>
                  Create Your First Group
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}