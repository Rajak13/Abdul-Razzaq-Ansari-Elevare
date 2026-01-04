'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { 
  Upload,
  Download,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  File,
  Plus,
  Search,
  Calendar,
  User,
  Eye,
  Star,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface GroupResource {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size: number;
  tags: string[];
  download_count: number;
  average_rating?: number;
  created_at: string;
  user_id: string;
  user_name: string;
  group_id: string;
}

interface GroupResourcesProps {
  groupId: string;
  canUpload?: boolean;
  className?: string;
}

export function GroupResources({ 
  groupId, 
  canUpload = true, 
  className = '' 
}: GroupResourcesProps) {
  const { user } = useAuth();
  const [resources, setResources] = useState<GroupResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    tags: '',
    file: null as File | null
  });

  // Fetch resources
  React.useEffect(() => {
    const fetchResources = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/study-groups/${groupId}/resources`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setResources(data.resources || []);
        }
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      fetchResources();
    }
  }, [groupId]);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5 text-purple-500" />;
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5 text-green-500" />;
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="w-5 h-5 text-orange-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        title: prev.title || file.name.replace(/\.[^/.]+$/, '') // Remove extension for title
      }));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadForm.file || !uploadForm.title.trim()) {
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title.trim());
      formData.append('description', uploadForm.description.trim());
      formData.append('tags', uploadForm.tags);
      formData.append('group_id', groupId);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/study-groups/${groupId}/resources`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const newResource = await response.json();
        setResources(prev => [newResource, ...prev]);
        setUploadDialogOpen(false);
        setUploadForm({
          title: '',
          description: '',
          tags: '',
          file: null
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading resource:', error);
      alert('Failed to upload resource. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (resource: GroupResource) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/resources/${resource.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resource.title;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Update download count
        setResources(prev => 
          prev.map(r => 
            r.id === resource.id 
              ? { ...r, download_count: r.download_count + 1 }
              : r
          )
        );
      }
    } catch (error) {
      console.error('Error downloading resource:', error);
      alert('Failed to download resource. Please try again.');
    }
  };

  const filteredResources = resources.filter(resource =>
    resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Group Resources</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
              <Skeleton className="w-10 h-10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="w-20 h-8" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Group Resources</span>
            <Badge variant="secondary" className="ml-2">
              {resources.length}
            </Badge>
          </CardTitle>
          
          {canUpload && (
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Resource</DialogTitle>
                  <DialogDescription>
                    Share a file with your study group members
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="file">File</Label>
                    <Input
                      id="file"
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      required
                      className="mt-1"
                    />
                    {uploadForm.file && (
                      <p className="text-sm text-gray-500 mt-1">
                        {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter resource title"
                      required
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe this resource"
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tags">Tags (optional)</Label>
                    <Input
                      id="tags"
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="Enter tags separated by commas"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setUploadDialogOpen(false)}
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={uploading || !uploadForm.file || !uploadForm.title.trim()}>
                      {uploading ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredResources.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No resources found' : 'No resources yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? `No resources match "${searchTerm}"`
                : 'Start by uploading your first resource to share with the group'
              }
            </p>
            {!searchTerm && canUpload && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Upload First Resource
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResources.map((resource, index) => (
              <div key={resource.id}>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {getFileIcon(resource.file_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {resource.title}
                        </h4>
                        {resource.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {resource.description}
                          </p>
                        )}
                        
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{resource.user_name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDistanceToNow(new Date(resource.created_at), { addSuffix: true })}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Download className="w-3 h-3" />
                            <span>{resource.download_count} downloads</span>
                          </div>
                          <span>{formatFileSize(resource.file_size)}</span>
                        </div>
                        
                        {resource.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {resource.tags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {resource.average_rating && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span>{Number(resource.average_rating).toFixed(1)}</span>
                          </div>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(resource)}
                          className="flex-shrink-0"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {index < filteredResources.length - 1 && <Separator className="my-2" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}