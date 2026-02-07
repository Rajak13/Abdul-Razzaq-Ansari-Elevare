'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  BookmarkCheck, 
  FileText, 
  Calendar,
  Hash,
  Clock,
  Eye,
  CheckSquare,
  BookOpen,
  Users,
  Download,
  Star,
  Lock,
  Globe
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePageMetadata } from '@/hooks/use-page-metadata';

interface SearchResult {
  id: string;
  type: 'task' | 'note' | 'resource' | 'group';
  title: string;
  description?: string;
  content?: string;
  snippet?: string;
  highlighted_snippet?: string;
  created_at: string;
  updated_at: string;
  // Type-specific fields
  tags?: string[];
  status?: string;
  due_date?: string;
  priority?: string;
  metadata?: {
    priority?: string;
    status?: string;
    due_date?: string;
    tags?: string[];
    folder_name?: string;
    category_name?: string;
    file_type?: string;
    file_size?: number;
    download_count?: number;
    average_rating?: number;
    user_name?: string;
    member_count?: number;
    is_private?: boolean;
  };
}

interface SearchFilters {
  types: ('task' | 'note' | 'resource' | 'group')[];
  sort_by: 'relevance' | 'date' | 'popularity';
  tags?: string[];
  priority?: string[];
  status?: string[];
  subjects?: string[];
}

export default function SearchPage() {
  usePageMetadata('search');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams?.get('q') || '');
  const [filters, setFilters] = useState<SearchFilters>({
    types: ['resource', 'group', 'task', 'note'],
    sort_by: 'relevance'
  });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [totalResults, setTotalResults] = useState(0);
  const { toast } = useToast();

  const performSearch = useCallback(async () => {
    if (!query.trim()) {
      setSearchResults([]);
      setTotalResults(0);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: query.trim(),
        content_type: filters.types.join(','),
      });

      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`/api/search?${params}`, {
        credentials: 'include',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      // Backend returns data in data.data structure
      const searchData = data.data || data;
      setSearchResults(searchData.results || []);
      setTotalResults(searchData.total || 0);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [query, filters, toast]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [performSearch]);

  const handleResultClick = useCallback((result: SearchResult) => {
    // Navigate to the appropriate page based on result type
    switch (result.type) {
      case 'task':
        router.push(`/tasks?id=${result.id}` as any);
        break;
      case 'note':
        router.push(`/notes/${result.id}` as any);
        break;
      case 'resource':
        router.push(`/resources/${result.id}` as any);
        break;
      case 'group':
        router.push(`/groups/${result.id}` as any);
        break;
    }
  }, [router]);

  const toggleType = useCallback((type: 'task' | 'note' | 'resource' | 'group') => {
    setFilters(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckSquare className="h-4 w-4" />;
      case 'note':
        return <BookOpen className="h-4 w-4" />;
      case 'resource':
        return <FileText className="h-4 w-4" />;
      case 'group':
        return <Users className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'task':
        return 'Task';
      case 'note':
        return 'Note';
      case 'resource':
        return 'Resource';
      case 'group':
        return 'Study Group';
      default:
        return 'Item';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="rounded-xl bg-primary p-2 text-primary-foreground shadow-lg">
          <Search className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Search & Discovery</h1>
          <p className="text-sm text-muted-foreground">
            Discover resources, study groups, and content shared by the community
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Unified Search</CardTitle>
              <p className="text-sm text-muted-foreground">
                Search across resources, study groups, tasks, and notes
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search resources, groups, tasks, notes..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Content Types
                      {filters.types.length < 4 && (
                        <Badge variant="secondary" className="ml-2">
                          {filters.types.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Content Types</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={filters.types.includes('resource')}
                      onCheckedChange={() => toggleType('resource')}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Resources
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.types.includes('group')}
                      onCheckedChange={() => toggleType('group')}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Study Groups
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.types.includes('task')}
                      onCheckedChange={() => toggleType('task')}
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      My Tasks
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.types.includes('note')}
                      onCheckedChange={() => toggleType('note')}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      My Notes
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Sort by: {filters.sort_by}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuCheckboxItem
                      checked={filters.sort_by === 'relevance'}
                      onCheckedChange={() => setFilters(prev => ({ ...prev, sort_by: 'relevance' }))}
                    >
                      Relevance
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.sort_by === 'date'}
                      onCheckedChange={() => setFilters(prev => ({ ...prev, sort_by: 'date' }))}
                    >
                      Date
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={filters.sort_by === 'popularity'}
                      onCheckedChange={() => setFilters(prev => ({ ...prev, sort_by: 'popularity' }))}
                    >
                      Popularity
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Search Results */}
              <div className="space-y-4">
                {isLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Searching...</p>
                  </div>
                )}

                {!isLoading && searchResults.length === 0 && query && (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No results found for "{query}"</p>
                      <p className="mt-1 text-sm">
                        Try adjusting your search terms or filters
                      </p>
                    </CardContent>
                  </Card>
                )}

                {!isLoading && !query && (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">Start searching</p>
                      <p className="mt-1 text-sm">
                        Discover resources, study groups, and more shared by the community
                      </p>
                    </CardContent>
                  </Card>
                )}

                {!isLoading && searchResults.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Found {totalResults} results for "{query}"
                      </p>
                    </div>

                    <div className="space-y-3">
                      {searchResults.map((result) => (
                        <Card
                          key={`${result.type}-${result.id}`}
                          className="cursor-pointer transition-all hover:shadow-md"
                          onClick={() => handleResultClick(result)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    {getTypeIcon(result.type)}
                                    <span className="text-xs font-medium">
                                      {getTypeLabel(result.type)}
                                    </span>
                                  </div>
                                  {(result.priority || result.metadata?.priority) && (
                                    <Badge className={`text-xs ${getPriorityColor(result.priority || result.metadata?.priority || '')}`}>
                                      {result.priority || result.metadata?.priority} priority
                                    </Badge>
                                  )}
                                  {(result.status || result.metadata?.status) && (
                                    <Badge className={`text-xs ${getStatusColor(result.status || result.metadata?.status || '')}`}>
                                      {(result.status || result.metadata?.status || '').replace('_', ' ')}
                                    </Badge>
                                  )}
                                </div>

                                <div>
                                  <h3 className="line-clamp-1 font-medium text-foreground">{result.title}</h3>
                                  {(result.snippet || result.description || result.content) && (
                                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                      {result.snippet || result.description || result.content}
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                                  {/* Shared by (for resources and groups) */}
                                  {result.metadata?.user_name && (
                                    <span>By {result.metadata.user_name}</span>
                                  )}
                                  
                                  {/* Date */}
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(result.created_at).toLocaleDateString()}
                                  </div>
                                  
                                  {/* Due date for tasks */}
                                  {(result.due_date || result.metadata?.due_date) && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Due {new Date(result.due_date || result.metadata?.due_date!).toLocaleDateString()}
                                    </div>
                                  )}
                                  
                                  {/* Member count for groups */}
                                  {result.metadata?.member_count !== undefined && (
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {result.metadata.member_count} members
                                    </div>
                                  )}
                                  
                                  {/* Private/Public for groups */}
                                  {result.type === 'group' && result.metadata?.is_private !== undefined && (
                                    <div className="flex items-center gap-1">
                                      {result.metadata.is_private ? (
                                        <>
                                          <Lock className="h-3 w-3" />
                                          Private
                                        </>
                                      ) : (
                                        <>
                                          <Globe className="h-3 w-3" />
                                          Public
                                        </>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Download count for resources */}
                                  {result.metadata?.download_count !== undefined && (
                                    <div className="flex items-center gap-1">
                                      <Download className="h-3 w-3" />
                                      {result.metadata.download_count} downloads
                                    </div>
                                  )}
                                  
                                  {/* Rating for resources */}
                                  {result.metadata?.average_rating !== undefined && result.metadata.average_rating > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      {result.metadata.average_rating.toFixed(1)}
                                    </div>
                                  )}
                                  
                                  {/* File size for resources */}
                                  {result.metadata?.file_size && (
                                    <span>{formatFileSize(result.metadata.file_size)}</span>
                                  )}
                                  
                                  {/* Folder/Category for notes/tasks */}
                                  {result.metadata?.folder_name && (
                                    <span>Folder: {result.metadata.folder_name}</span>
                                  )}
                                  {result.metadata?.category_name && (
                                    <span>Category: {result.metadata.category_name}</span>
                                  )}
                                </div>

                                {((result.tags && result.tags.length > 0) || (result.metadata?.tags && result.metadata.tags.length > 0)) && (
                                  <div className="flex flex-wrap gap-1">
                                    {(result.tags || result.metadata?.tags || []).slice(0, 3).map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-xs">
                                        <Hash className="mr-1 h-2 w-2" />
                                        {tag}
                                      </Badge>
                                    ))}
                                    {(result.tags || result.metadata?.tags || []).length > 3 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{(result.tags || result.metadata?.tags || []).length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="ml-4">
                                <Button size="sm" variant="outline">
                                  <Eye className="mr-2 h-3 w-3" />
                                  View
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookmarks" className="space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <BookmarkCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Bookmarks Coming Soon</h3>
              <p className="text-muted-foreground">
                Bookmark your favorite content to access it quickly. This feature will be available soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}