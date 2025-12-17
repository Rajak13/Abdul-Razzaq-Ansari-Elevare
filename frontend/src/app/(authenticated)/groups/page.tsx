'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useStudyGroups } from '@/hooks/use-study-groups';
import { StudyGroupForm } from '@/components/study-groups/study-group-form';
import { StudyGroupCard } from '@/components/study-groups/study-group-card';
import { StudyGroupFilters } from '@/components/study-groups/study-group-filters';
import { StudyGroupQueryParams } from '@/types/study-group';
import { Plus, Search, Users, Lock, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudyGroupsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState<StudyGroupQueryParams>({});

  // Build query parameters based on active tab and filters
  const getQueryParams = (): StudyGroupQueryParams => {
    const params: StudyGroupQueryParams = {
      ...filters,
      search: searchQuery || undefined,
    };

    switch (activeTab) {
      case 'my-groups':
        params.member_of = true;
        break;
      case 'owned':
        params.owned_by_me = true;
        break;
      case 'public':
        params.is_private = false;
        break;
      case 'private':
        params.is_private = true;
        break;
      default:
        // 'all' - no additional filters
        break;
    }

    return params;
  };

  const { data: groupsData, isLoading, error } = useStudyGroups(getQueryParams());

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is automatically triggered by the query parameter change
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Study Groups</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Study Groups</h1>
          <p className="text-muted-foreground">
            Join study groups to collaborate with peers and enhance your learning experience
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Study Group</DialogTitle>
            </DialogHeader>
            <StudyGroupForm onSuccess={handleCreateSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search study groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>
        <StudyGroupFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Groups</TabsTrigger>
          <TabsTrigger value="my-groups">My Groups</TabsTrigger>
          <TabsTrigger value="owned">Owned</TabsTrigger>
          <TabsTrigger value="public">Public</TabsTrigger>
          <TabsTrigger value="private">Private</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <div className="flex gap-2 mt-4">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : groupsData?.groups && groupsData.groups.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupsData.groups.map((group) => (
                  <StudyGroupCard key={group.id} group={group} />
                ))}
              </div>
              
              {/* Pagination info */}
              <div className="mt-8 text-center text-sm text-muted-foreground">
                Showing {groupsData.groups.length} of {groupsData.total} groups
                {groupsData.total > groupsData.groups.length && (
                  <span> (Page {groupsData.page} of {Math.ceil(groupsData.total / groupsData.limit)})</span>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Study Groups Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? `No groups match your search "${searchQuery}"`
                  : activeTab === 'my-groups'
                  ? "You haven't joined any study groups yet"
                  : activeTab === 'owned'
                  ? "You haven't created any study groups yet"
                  : "No study groups available"}
              </p>
              {(activeTab === 'all' || activeTab === 'owned') && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Create Study Group</DialogTitle>
                    </DialogHeader>
                    <StudyGroupForm onSuccess={handleCreateSuccess} />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}