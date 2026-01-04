'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Filter, 
  Grid, 
  List, 
  TrendingUp,
  FileText,
  Download,
  Eye,
  ThumbsUp,
  Calendar,
  User,
  BookmarkCheck,
  ExternalLink,
  Star,
  MessageCircle
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { ResourceUploadModal } from '@/components/resources/resource-upload-modal';
import { useToast } from '@/components/ui/use-toast';

interface Resource {
  id: string;
  title: string;
  description: string;
  file_type: string;
  file_url?: string;
  external_url?: string;
  file_size?: number;
  file_name: string;
  tags: string[];
  download_count: number;
  average_rating?: number;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_avatar?: string;
  user_id: string;
}

interface ResourceFilters {
  search?: string;
  file_type?: string;
  sortBy: 'created_at' | 'download_count' | 'average_rating';
  sortOrder: 'asc' | 'desc';
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'trending'>('all');
  const [filters, setFilters] = useState<ResourceFilters>({
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const { toast } = useToast();

  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder
      });

      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }

      if (filters.file_type && filters.file_type !== 'all') {
        params.append('file_type', filters.file_type);
      }

      const endpoint = searchQuery.trim() || filters.file_type 
        ? `/api/resources/search?${params}`
        : `/api/resources?${params}`;

      const response = await fetch(endpoint, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch resources');
      }

      const data = await response.json();
      setResources(data.resources || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast({
        title: 'Error loading resources',
        description: 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, searchQuery, toast]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleFilterChange = useCallback((
    key: keyof ResourceFilters,
    value: string
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ sortBy: 'created_at', sortOrder: 'desc' });
    setSearchQuery('');
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleResourceView = useCallback((resource: Resource) => {
    if (resource.external_url) {
      window.open(resource.external_url, '_blank');
    } else if (resource.file_url) {
      // Use frontend proxy for file access
      window.open(resource.file_url, '_blank');
    }
  }, []);

  const handleResourceDownload = useCallback(async (resource: Resource) => {
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`/api/resources/${resource.id}/download`, {
        credentials: 'include',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resource.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Refresh resources to update download count
      fetchResources();
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: 'Please try again later',
        variant: 'destructive'
      });
    }
  }, [fetchResources, toast]);

  const getTypeIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (type.includes('word') || type.includes('document')) return <FileText className="h-4 w-4" />;
    if (type.includes('presentation') || type.includes('powerpoint')) return <FileText className="h-4 w-4" />;
    if (type.includes('image')) return <FileText className="h-4 w-4" />;
    if (type.includes('video')) return <FileText className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'DOC';
    if (type.includes('presentation') || type.includes('powerpoint')) return 'PPT';
    if (type.includes('image')) return 'IMG';
    if (type.includes('video')) return 'VID';
    return 'FILE';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const currentResources = activeTab === 'trending' 
    ? resources.filter(r => r.download_count > 0 || (r.average_rating && r.average_rating > 3)).slice(0, 10)
    : resources;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resource Library</h1>
          <p className="text-muted-foreground">
            Discover and share study materials with the Elevare community
          </p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Resource
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs and Controls */}
      <div className="flex items-center justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'all' | 'trending')}
        >
          <TabsList>
            <TabsTrigger value="all">All Resources</TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trending
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && activeTab === 'all' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Sort By</label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) => handleFilterChange('sortBy', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Most Recent</SelectItem>
                    <SelectItem value="download_count">Most Downloaded</SelectItem>
                    <SelectItem value="average_rating">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Order</label>
                <Select
                  value={filters.sortOrder}
                  onValueChange={(value) => handleFilterChange('sortOrder', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">File Type</label>
                <Select
                  value={filters.file_type || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange('file_type', value === 'all' ? '' : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="File type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="pdf">PDF Documents</SelectItem>
                    <SelectItem value="word">Word Documents</SelectItem>
                    <SelectItem value="presentation">Presentations</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Active Filters */}
            {(searchQuery || filters.file_type) && (
              <div className="flex flex-wrap gap-2">
                {searchQuery && (
                  <Badge variant="secondary">
                    Search: {searchQuery}
                  </Badge>
                )}
                {filters.file_type && (
                  <Badge variant="secondary">
                    Type: {filters.file_type}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <div className="space-y-4">
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading resources...</p>
          </div>
        )}

        {!isLoading && currentResources.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {activeTab === 'trending' ? 'No Trending Resources' : 'No Resources Found'}
              </h3>
              <p className="text-muted-foreground">
                {activeTab === 'trending' 
                  ? 'No resources are trending right now. Check back later!'
                  : searchQuery
                  ? 'No resources match your search criteria. Try adjusting your filters.'
                  : 'No resources have been uploaded yet. Be the first to share a resource!'
                }
              </p>
              {!searchQuery && activeTab === 'all' && (
                <Button className="mt-4" onClick={() => setShowUploadModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Upload First Resource
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!isLoading && currentResources.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {currentResources.length} of {pagination.total} resources
              </p>
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'
                : 'space-y-4'
            }>
              {currentResources.map((resource) => (
                <Card
                  key={resource.id}
                  className="hover:shadow-md transition-all"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(resource.file_type)}
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(resource.file_type)}
                        </Badge>
                      </div>
                      {resource.average_rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-muted-foreground">
                            {Number(resource.average_rating).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-lg text-foreground line-clamp-2">
                      {resource.title}
                    </CardTitle>
                    {resource.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {resource.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {resource.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {resource.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{resource.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {resource.download_count}
                        </div>
                      </div>
                      {resource.file_size && (
                        <span>{formatFileSize(resource.file_size)}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-xs text-primary-foreground font-medium">
                            {resource.user_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{resource.user_name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(resource.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => window.location.href = `/resources/${resource.id}`}
                        className="flex-1"
                      >
                        <Eye className="mr-2 h-3 w-3" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResourceDownload(resource)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Upload Modal */}
      <ResourceUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={fetchResources}
      />
    </div>
  );
}