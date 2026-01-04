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
import { Users, Lock, Globe, Calendar, UserPlus, Eye, MoreVertical, Trash2, Crown, Shield, User } from 'lucide-react';
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

  const getGroupInitials = (name: string | undefined) => {
    if (!name) return 'SG';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3" />;
      case 'admin':
        return <Shield className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const canJoin = !group.is_member && (!group.max_members || group.member_count < group.max_members);
  const isFull = group.max_members && group.member_count >= group.max_members;
  const isOwner = group.user_role === 'owner';

  return (
    <Card className="hover:shadow-sm transition-shadow duration-200 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {getGroupInitials(group.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm font-medium leading-tight truncate">{group.name}</CardTitle>
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
            <Badge 
              variant={isOwner ? 'default' : 'secondary'} 
              className="text-xs flex items-center gap-1 flex-shrink-0"
            >
              {getRoleIcon(group.user_role || 'member')}
              {group.user_role === 'owner' ? 'Owner' : 
               group.user_role === 'admin' ? 'Admin' : 'Member'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {group.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {group.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span>
              {group.member_count} member{group.member_count !== 1 ? 's' : ''}
              {group.max_members && ` / ${group.max_members}`}
            </span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {isFull && !group.is_member && (
          <Badge variant="destructive" className="w-full justify-center text-xs">
            Group Full
          </Badge>
        )}

        <div className="flex space-x-2 pt-1">
          <Link href={`/groups/${group.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-xs">
              <Eye className="h-3 w-3 mr-1" />
              {group.is_member ? 'View' : 'Details'}
            </Button>
          </Link>
          
          {group.is_member ? (
            // Member actions
            isOwner ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="px-2">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDeleteGroup}
                    className="text-destructive focus:text-destructive"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeaveGroup}
                disabled={leaveMutation.isPending}
                className="text-xs text-destructive hover:text-destructive"
              >
                Leave
              </Button>
            )
          ) : (
            // Non-member actions
            canJoin && !isFull && (
              <Button
                size="sm"
                onClick={handleJoinGroup}
                disabled={joinMutation.isPending}
                className="flex-1 text-xs"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                {group.is_private ? 'Request' : 'Join'}
              </Button>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}