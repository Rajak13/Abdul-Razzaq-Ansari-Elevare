'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { GroupJoinRequest } from '@/types/study-group';
import { useApproveJoinRequest, useRejectJoinRequest } from '@/hooks/use-study-groups';
import { Check, X, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JoinRequestsListProps {
  groupId: string;
  requests: GroupJoinRequest[];
  isLoading: boolean;
}

export function JoinRequestsList({ groupId, requests, isLoading }: JoinRequestsListProps) {
  const approveMutation = useApproveJoinRequest();
  const rejectMutation = useRejectJoinRequest();

  const handleApprove = async (userId: string) => {
    try {
      await approveMutation.mutateAsync({ groupId, userId });
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await rejectMutation.mutateAsync({ groupId, userId });
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <UserCheck className="h-5 w-5" />
            <span>Join Requests</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <UserCheck className="h-5 w-5" />
          <span>Join Requests</span>
          {requests.length > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs">
              {requests.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
            <p className="text-muted-foreground">
              There are no pending join requests for this group.
            </p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {getInitials(request.user_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{request.user_name}</p>
                  <p className="text-sm text-muted-foreground">{request.user_email}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(request.user_id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(request.user_id)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}