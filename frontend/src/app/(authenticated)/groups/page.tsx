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
import { Plus, Search, Users, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientOnly } from '@/components/ui/client-only';
import { AuthGuard } from '@/components/ui/auth-guard';

export default function GroupsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('discover');
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
      case 'requests':
        // This would need to be handled differently - showing pending join requests
        break;
      default:
        // 'discover' - show all available groups
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
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Groups</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Groups</h1>
            <p className="text-sm text-muted-foreground">
              Collaborate with peers and join study communities
            </p>
          </div>
          
          <ClientOnly fallback={<Button disabled><Plus className="h-4 w-4 mr-2" />New Group</Button>}>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Group
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Study Group</DialogTitle>
                </DialogHeader>
                <StudyGroupForm onSuccess={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
          </ClientOnly>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </form>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <ClientOnly fallback={<div className="h-10 bg-muted rounded animate-pulse" />}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="discover">Discover</TabsTrigger>
              <TabsTrigger value="my-groups">My Groups</TabsTrigger>
              <TabsTrigger value="owned">Owned</TabsTrigger>
              <TabsTrigger value="requests">Join Requests</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                          <div className="flex gap-2 mt-4">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-24" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : groupsData?.groups && groupsData.groups.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupsData.groups.map((group) => (
                      <StudyGroupCard key={group.id} group={group} />
                    ))}
                  </div>
                  
                  {/* Pagination info */}
                  {groupsData.total > groupsData.groups.length && (
                    <div className="mt-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Showing {groupsData.groups.length} of {groupsData.total} groups
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {activeTab === 'discover' && 'No Groups Found'}
                      {activeTab === 'my-groups' && 'No Groups Joined'}
                      {activeTab === 'owned' && 'No Groups Created'}
                      {activeTab === 'requests' && 'No Pending Requests'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery
                        ? `No groups match your search "${searchQuery}"`
                        : activeTab === 'my-groups'
                        ? "You haven't joined any study groups yet"
                        : activeTab === 'owned'
                        ? "You haven't created any study groups yet"
                        : activeTab === 'requests'
                        ? "No pending join requests"
                        : "No study groups available"}
                    </p>
                    {(activeTab === 'discover' || activeTab === 'owned') && (
                      <ClientOnly fallback={<Button disabled><Plus className="h-4 w-4 mr-2" />Create Group</Button>}>
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
                      </ClientOnly>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </ClientOnly>
      </div>
    </AuthGuard>
  );
}