'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StudyGroupWithMemberCount } from '@/types/study-group';
import { useJoinGroup, useLeaveGroup, useDeleteStudyGroupMutation } from '@/hooks/use-study-groups';
import { useAuth } from '@/contexts/auth-context';
import { Users, Lock, Globe, Calendar, UserPlus, Eye, MoreVertical, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StudyGroupCardProps {
  group: StudyGroupWithMemberCount;
}

export function StudyGroupCard({ group }: StudyGroupCardProps) {
  const { user } = useAuth();
  const joinMutation = useJoinGroup();
  const leaveMutation = useLeaveGroup();
  const deleteMutation = useDeleteStudyGroupMutation();

  const handleJoinGroup = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    
    try {
      await joinMutation.mutateAsync(group.id);
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const handleLeaveGroup = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user?.id) return;
    
    if (confirm(`Are you sure you want to leave "${group.name}"?`)) {
      try {
        await leaveMutation.mutateAsync({ groupId: group.id, userId: user.id });
      } catch (error) {
        // Error handling is done in the mutation hook
      }
    }
  };

  const handleDeleteGroup = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm(`Are you sure you want to permanently delete "${group.name}"? This action cannot be undone.`)) {
      try {
        await deleteMutation.mutateAsync(group.id);
      } catch (error) {
        // Error handling is done in the mutation hook
      }
    }
  };

  const getGroupInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const canJoin = !group.is_member && (!group.max_members || group.member_count < group.max_members);
  const isFull = group.max_members && group.member_count >= group.max_members;
  const isOwner = group.user_role === 'owner';

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getGroupInitials(group.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg leading-tight">{group.name}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                {group.is_private ? (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Globe className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {group.is_private ? 'Private' : 'Public'}
                </span>
              </div>
            </div>
          </div>
          
          {group.is_member && (
            <Badge variant={isOwner ? 'default' : 'secondary'} className="text-xs">
              {group.user_role === 'owner' ? 'Owner' : 
               group.user_role === 'admin' ? 'Admin' : 'Member'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {group.description && (
          <CardDescription className="line-clamp-2">
            {group.description}
          </CardDescription>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>
              {group.member_count} member{group.member_count !== 1 ? 's' : ''}
              {group.max_members && ` / ${group.max_members}`}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {isFull && !group.is_member && (
          <Badge variant="destructive" className="w-full justify-center">
            Group Full
          </Badge>
        )}

        <div className="flex space-x-2">
          <Link href={`/groups/${group.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              {group.is_member ? 'View Group' : 'View Details'}
            </Button>
          </Link>
          
          {group.is_member ? (
            // Member actions
            isOwner ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDeleteGroup}
                    className="text-destructive focus:text-destructive"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLeaveGroup}
                disabled={leaveMutation.isPending}
              >
                Leave
              </Button>
            )
          ) : (
            // Non-member actions
            canJoin && !isFull && (
              <Button
                onClick={handleJoinGroup}
                disabled={joinMutation.isPending}
                className="flex-1"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {group.is_private ? 'Request to Join' : 'Join Group'}
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}