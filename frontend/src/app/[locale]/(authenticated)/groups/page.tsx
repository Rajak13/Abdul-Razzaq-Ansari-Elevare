'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { useStudyGroups } from '@/hooks/use-study-groups';
import { StudyGroupForm } from '@/components/study-groups/study-group-form';
import { StudyGroupCard } from '@/components/study-groups/study-group-card';
import { StudyGroupQueryParams } from '@/types/study-group';
import { Plus, Search, Users, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ClientOnly } from '@/components/ui/client-only';
import { AuthGuard } from '@/components/ui/auth-guard';
import { useTranslations } from 'next-intl';
import { usePageMetadata } from '@/hooks/use-page-metadata';

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'

export default function GroupsPage() {
  const t = useTranslations('groups');
  usePageMetadata('groups');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('discover');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState<StudyGroupQueryParams>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Build query parameters based on active tab and filters
  const getQueryParams = (): StudyGroupQueryParams => {
    const params: StudyGroupQueryParams = {
      ...filters,
      search: searchQuery || undefined,
      page: currentPage,
      limit: pageSize,
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
    setCurrentPage(1);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">{t('messages.loadError')}</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : t('messages.loadError')}
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
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary p-2 text-primary-foreground shadow-lg">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('noGroupsDescription')}
              </p>
            </div>
          </div>
          
          <ClientOnly fallback={<Button disabled><Plus className="h-4 w-4 mr-2" />{t('newGroup')}</Button>}>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('newGroup')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{t('createGroup')}</DialogTitle>
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
                    placeholder={t('search.placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </form>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {t('search.filterBySubject')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <ClientOnly fallback={<div className="h-10 bg-muted rounded animate-pulse" />}>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="discover">{t('search.allSubjects')}</TabsTrigger>
              <TabsTrigger value="my-groups">{t('myGroups')}</TabsTrigger>
              <TabsTrigger value="owned">{t('actions.manageMembers')}</TabsTrigger>
              <TabsTrigger value="requests">{t('requests.title')}</TabsTrigger>
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
                  
                  {/* Pagination */}
                  {groupsData.total > pageSize && (
                    <div className="mt-6 pt-4 border-t">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(groupsData.total / pageSize)}
                        totalItems={groupsData.total}
                        pageSize={pageSize}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                        pageSizeOptions={[12, 24, 48]}
                      />
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {activeTab === 'discover' && t('search.noResults')}
                      {activeTab === 'my-groups' && t('noGroups')}
                      {activeTab === 'owned' && t('noGroups')}
                      {activeTab === 'requests' && t('requests.noPending')}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery
                        ? t('search.noResults')
                        : activeTab === 'my-groups'
                        ? t('noGroupsDescription')
                        : activeTab === 'owned'
                        ? t('noGroupsDescription')
                        : activeTab === 'requests'
                        ? t('requests.noPending')
                        : t('noGroupsDescription')}
                    </p>
                    {(activeTab === 'discover' || activeTab === 'owned') && (
                      <ClientOnly fallback={<Button disabled><Plus className="h-4 w-4 mr-2" />{t('createGroup')}</Button>}>
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                          <DialogTrigger asChild>
                            <Button>
                              <Plus className="h-4 w-4 mr-2" />
                              {t('createGroup')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>{t('createGroup')}</DialogTitle>
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