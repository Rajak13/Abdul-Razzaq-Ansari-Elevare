'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowLeft,
  Download,
  Eye,
  Calendar,
  User,
  FileText,
  ExternalLink,
  Share2,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ResourceRating } from '@/components/resources/resource-rating';
import { ResourceComments } from '@/components/resources/resource-comments';

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
  rating_count?: number;
  user_rating?: number;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_avatar?: string;
  user_id: string;
}

export default function ResourceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const resourceId = params?.id as string;
  const [resource, setResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchResource = async () => {
    if (!resourceId) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`/api/resources/${resourceId}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch resource');
      }

      const data = await response.json();
      setResource(data.resource);
    } catch (error) {
      console.error('Error fetching resource:', error);
      toast({
        title: 'Error loading resource',
        description: 'Please try again later',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!resource) return;

    try {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`/api/resources/${resource.id}/download`, {
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

      // Refresh resource to update download count
      fetchResource();
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: 'Please try again later',
        variant: 'destructive'
      });
    }
  };

  const handleView = () => {
    if (!resource) return;

    if (resource.external_url) {
      window.open(resource.external_url, '_blank');
    } else if (resource.file_url) {
      window.open(resource.file_url, '_blank');
    }
  };

  const handleShare = async () => {
    if (!resource) return;

    try {
      await navigator.share({
        title: resource.title,
        text: resource.description,
        url: window.location.href
      });
    } catch (error) {
      // Fallback to copying URL
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link copied',
        description: 'Resource link copied to clipboard'
      });
    }
  };

  const getTypeIcon = (type: string) => {
    return <FileText className="h-5 w-5" />;
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

  useEffect(() => {
    fetchResource();
  }, [resourceId]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Resource not found</h3>
            <p className="text-muted-foreground mb-4">
              The resource you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push('/resources')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Resources
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/resources')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Resources
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resource Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getTypeIcon(resource.file_type)}
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {getTypeLabel(resource.file_type)}
                    </Badge>
                    <CardTitle className="text-2xl">{resource.title}</CardTitle>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleView}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {resource.description && (
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {resource.description}
                  </p>
                </div>
              )}

              {resource.tags && resource.tags.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {resource.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating Section */}
              <div>
                <h4 className="font-medium mb-2">Rating</h4>
                <ResourceRating
                  resourceId={resource.id}
                  currentRating={resource.user_rating}
                  averageRating={resource.average_rating}
                  ratingCount={resource.rating_count}
                  onRatingChange={fetchResource}
                />
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <ResourceComments resourceId={resource.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Downloads</span>
                <span className="font-medium">{resource.download_count}</span>
              </div>
              {resource.average_rating && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Rating</span>
                  <span className="font-medium">{Number(resource.average_rating).toFixed(1)}/5</span>
                </div>
              )}
              {resource.file_size && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">File Size</span>
                  <span className="font-medium">{formatFileSize(resource.file_size)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Uploaded</span>
                <span className="font-medium">
                  {new Date(resource.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Author Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Uploaded by</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {resource.user_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{resource.user_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(resource.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}