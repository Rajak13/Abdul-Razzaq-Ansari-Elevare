'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GroupMember, GroupRole } from '@/types/study-group';
import { useRemoveMember } from '@/hooks/use-study-groups';
import { MoreVertical, UserMinus, Crown, Shield, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LocalGroupMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user_name: string;
  user_email: string;
}

interface GroupMembersListProps {
  groupId: string;
  members: LocalGroupMember[];
  isLoading: boolean;
  currentUserRole?: GroupRole;
  isCurrentUserMember: boolean;
}

export function GroupMembersList({
  groupId,
  members,
  isLoading,
  currentUserRole,
  isCurrentUserMember,
}: GroupMembersListProps) {
  const removeMemberMutation = useRemoveMember();

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMemberMutation.mutateAsync({ groupId, userId });
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const getRoleIcon = (role: GroupRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-3 w-3 text-blue-500" />;
      default:
        return <User className="h-3 w-3 text-gray-500" />;
    }
  };

  const getRoleBadgeVariant = (role: GroupRole) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const canRemoveMember = (member: LocalGroupMember) => {
    if (!isCurrentUserMember || !currentUserRole) return false;
    if (member.role === 'owner') return false; // Cannot remove owner
    if (currentUserRole === 'owner') return true; // Owner can remove anyone
    if (currentUserRole === 'admin' && member.role === 'member') return true; // Admin can remove members
    return false;
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
          <CardTitle className="text-lg">Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-12" />
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
          <span>Members</span>
          <Badge variant="secondary" className="text-xs">
            {members.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No members found
          </p>
        ) : (
          members.map((member) => (
            <div key={member.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(member.user_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium truncate">
                      {member.user_name}
                    </p>
                    {getRoleIcon(member.role)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                  {member.role}
                </Badge>

                {canRemoveMember(member) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-red-600"
                        disabled={removeMemberMutation.isPending}
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Remove Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}