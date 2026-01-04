'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import { 
  useApproveJoinRequest, 
  useRejectJoinRequest 
} from '@/hooks/use-study-groups';
import { 
  Check, 
  X, 
  Clock, 
  User, 
  Mail, 
  UserCheck, 
  UserX,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface JoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
}

interface JoinRequestManagementProps {
  groupId: string;
  userRole: 'owner' | 'admin' | 'member' | null;
  className?: string;
  showForRequesters?: boolean; // Show status for users who made requests
}

export function JoinRequestManagement({ 
  groupId, 
  userRole, 
  className = '',
  showForRequesters = false
}: JoinRequestManagementProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  
  const approveRequestMutation = useApproveJoinRequest();
  const rejectRequestMutation = useRejectJoinRequest();

  const canManageRequests = userRole === 'owner' || userRole === 'admin';

  // Fetch join requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const endpoint = showForRequesters 
          ? `/api/study-groups/${groupId}/my-requests`
          : `/api/study-groups/${groupId}/requests`;
          
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setRequests(data.requests || []);
        } else {
          throw new Error('Failed to fetch requests');
        }
      } catch (err) {
        console.error('Error fetching join requests:', err);
        setError('Failed to load join requests');
      } finally {
        setLoading(false);
      }
    };

    if (groupId && user) {
      fetchRequests();
    }
  }, [groupId, user, showForRequesters]);

  const handleApprove = async (requestId: string) => {
    try {
      await approveRequestMutation.mutateAsync({ 
        groupId, 
        userId: requests.find(r => r.id === requestId)?.user_id || '' 
      });
      
      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 'approved' as const, updated_at: new Date().toISOString() }
            : req
        )
      );
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectRequestMutation.mutateAsync({ 
        groupId, 
        userId: requests.find(r => r.id === requestId)?.user_id || '' 
      });
      
      // Update local state
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: 'rejected' as const, updated_at: new Date().toISOString() }
            : req
        )
      );
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const handleRefresh = () => {
    setError(null);
    setLoading(true);
    // Re-trigger the useEffect
    setRequests([]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="text-green-600 bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-red-600">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <UserCheck className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <UserX className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredRequests = requests.filter(req => req.status === activeTab);
  const pendingCount = requests.filter(req => req.status === 'pending').length;
  const approvedCount = requests.filter(req => req.status === 'approved').length;
  const rejectedCount = requests.filter(req => req.status === 'rejected').length;

  // If user can't manage requests and it's not for requesters, don't show anything
  if (!canManageRequests && !showForRequesters) {
    return null;
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-5 h-5 animate-spin" />
            <span>Loading Join Requests...</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
              <Skeleton className="w-10 h-10 rounded-full" />
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

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center space-x-2">
            <AlertCircle className="w-5 h-5" />
            <span>Error Loading Requests</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>
              {showForRequesters ? 'My Join Requests' : 'Join Requests'}
            </span>
          </div>
          <Button onClick={handleRefresh} variant="ghost" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {showForRequesters ? 'No requests made' : 'No join requests'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {showForRequesters 
                ? 'You haven\'t made any join requests for this group'
                : 'No one has requested to join this group yet'
              }
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Pending</span>
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4" />
                <span>Approved</span>
                {approvedCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {approvedCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rejected" className="flex items-center space-x-2">
                <UserX className="w-4 h-4" />
                <span>Rejected</span>
                {rejectedCount > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {rejectedCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-6">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((request, index) => (
                    <div key={request.id}>
                      <div className={cn(
                        "flex items-center justify-between p-4 rounded-lg border transition-all",
                        "hover:bg-muted/50"
                      )}>
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {request.user_name
                                ?.split(' ')
                                .map((n: string) => n.charAt(0))
                                .join('')
                                .toUpperCase()
                                .slice(0, 2) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-sm truncate">
                                {request.user_name || 'Unknown User'}
                              </p>
                              {getStatusBadge(request.status)}
                            </div>
                            
                            <div className="flex items-center space-x-2 mt-1">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground truncate">
                                {request.user_email}
                              </p>
                            </div>
                            
                            <p className="text-xs text-muted-foreground mt-1">
                              Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>

                        {canManageRequests && request.status === 'pending' && (
                          <div className="flex items-center space-x-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(request.id)}
                              disabled={rejectRequestMutation.isPending}
                              className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              size="sm"
                              onClick={() => handleApprove(request.id)}
                              disabled={approveRequestMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {index < filteredRequests.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-4">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-6">
                  <UserCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No approved requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((request, index) => (
                    <div key={request.id}>
                      <div className="flex items-center space-x-3 p-4 rounded-lg border bg-green-50 border-green-200">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-green-100 text-green-700 font-medium">
                            {request.user_name
                              ?.split(' ')
                              .map((n: string) => n.charAt(0))
                              .join('')
                              .toUpperCase()
                              .slice(0, 2) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm truncate text-green-900">
                              {request.user_name || 'Unknown User'}
                            </p>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          <p className="text-xs text-green-700 mt-1">
                            Approved {formatDistanceToNow(new Date(request.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        
                        <UserCheck className="w-5 h-5 text-green-600" />
                      </div>
                      
                      {index < filteredRequests.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected" className="mt-4">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-6">
                  <UserX className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No rejected requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((request, index) => (
                    <div key={request.id}>
                      <div className="flex items-center space-x-3 p-4 rounded-lg border bg-red-50 border-red-200">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-red-100 text-red-700 font-medium">
                            {request.user_name
                              ?.split(' ')
                              .map((n: string) => n.charAt(0))
                              .join('')
                              .toUpperCase()
                              .slice(0, 2) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm truncate text-red-900">
                              {request.user_name || 'Unknown User'}
                            </p>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          <p className="text-xs text-red-700 mt-1">
                            Rejected {formatDistanceToNow(new Date(request.updated_at), { addSuffix: true })}
                          </p>
                        </div>
                        
                        <UserX className="w-5 h-5 text-red-600" />
                      </div>
                      
                      {index < filteredRequests.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}