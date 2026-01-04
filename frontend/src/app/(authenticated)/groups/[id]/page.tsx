'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useStudyGroup,
  useGroupMembers,
  useJoinRequests,
  useJoinGroup,
  useDeleteStudyGroup,
} from '@/hooks/use-study-groups';
import { StudyGroupForm } from '@/components/study-groups/study-group-form';
import { GroupMembersList } from '@/components/study-groups/group-members-list';
import { JoinRequestManagement } from '@/components/study-groups/join-request-management';
import { GroupChat } from '@/components/study-groups/group-chat';
import { WhiteboardManager } from '@/components/whiteboard/whiteboard-manager';
import {
  Users,
  Lock,
  Globe,
  Calendar,
  Settings,
  UserPlus,
  Trash2,
  Edit,
  ArrowLeft,
  MessageCircle,
  UserCheck,
  Palette,
  Video,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { ClientOnly } from '@/components/ui/client-only';
import { AuthGuard } from '@/components/ui/auth-guard';

export default function StudyGroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: groupData, isLoading: groupLoading, error: groupError } = useStudyGroup(groupId);
  const { data: membersData, isLoading: membersLoading } = useGroupMembers(groupId);
  const { data: joinRequestsData, isLoading: joinRequestsLoading } = useJoinRequests(groupId);

  const joinMutation = useJoinGroup();
  const deleteMutation = useDeleteStudyGroup();

  const group = groupData?.group;
  const members = membersData?.members || [];
  const joinRequests = joinRequestsData?.requests || [];

  const isOwner = group?.user_role === 'owner';
  const isAdmin = group?.user_role === 'admin' || isOwner;
  const isMember = group?.is_member || false;
  const canJoin = !isMember && (!group?.max_members || group.member_count < group.max_members);

  const handleJoinGroup = async () => {
    try {
      await joinMutation.mutateAsync(groupId);
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteMutation.mutateAsync(groupId);
      router.push('/groups');
      toast.success('Study group deleted successfully');
    } catch (error) {
      // Error handling is done in the mutation hook
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
  };

  if (groupError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Study Group</h2>
          <p className="text-muted-foreground mb-4">
            {groupError instanceof Error ? groupError.message : 'Something went wrong'}
          </p>
          <Button onClick={() => router.push('/groups')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  if (groupLoading || !group) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/groups')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {group.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{group.name}</h1>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {group.is_private ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                <span>{group.is_private ? 'Private' : 'Public'} Group</span>
                {isMember && (
                  <>
                    <span>•</span>
                    <Badge variant="secondary" className="text-xs">
                      {group.user_role === 'owner' ? 'Owner' : 
                       group.user_role === 'admin' ? 'Admin' : 'Member'}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {canJoin && (
            <Button onClick={handleJoinGroup} disabled={joinMutation.isPending}>
              <UserPlus className="h-4 w-4 mr-2" />
              {group.is_private ? 'Request to Join' : 'Join Group'}
            </Button>
          )}
          
          {isOwner && (
            <ClientOnly>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Edit Study Group</DialogTitle>
                  </DialogHeader>
                  <StudyGroupForm group={group} onSuccess={handleEditSuccess} />
                </DialogContent>
              </Dialog>

              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Study Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p>Are you sure you want to delete this study group? This action cannot be undone.</p>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteGroup}
                        disabled={deleteMutation.isPending}
                      >
                        Delete Group
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </ClientOnly>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2">
          <ClientOnly fallback={<div className="h-10 bg-muted rounded animate-pulse mb-6" />}>
            <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {isMember && (
                <>
                  <TabsTrigger value="chat">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="video-call">
                    <Video className="h-4 w-4 mr-2" />
                    Video Call
                  </TabsTrigger>
                  <TabsTrigger value="whiteboard">
                    <Palette className="h-4 w-4 mr-2" />
                    Whiteboard
                  </TabsTrigger>
                </>
              )}
              {isAdmin && (
                <TabsTrigger value="requests">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Requests
                  {joinRequests.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {joinRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>About This Group</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.description ? (
                    <p className="text-muted-foreground">{group.description}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No description provided.</p>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                        {group.max_members && ` / ${group.max_members}`}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Created {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {isMember && (
              <>
                <TabsContent value="chat">
                  <GroupChat groupId={groupId} />
                </TabsContent>
                
                <TabsContent value="video-call">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Video className="h-5 w-5" />
                        <span>Video Call</span>
                      </CardTitle>
                      <CardDescription>
                        Start a video call with group members
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={() => router.push(`/groups/${groupId}/video-call`)}
                        className="w-full"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Start Video Call
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="whiteboard">
                  <WhiteboardManager 
                    groupId={groupId} 
                    userRole={group.user_role || 'member'} 
                  />
                </TabsContent>
              </>
            )}

            {isAdmin && (
              <TabsContent value="requests">
                <JoinRequestManagement
                  groupId={groupId}
                  userRole="admin"
                />
              </TabsContent>
            )}
          </Tabs>
          </ClientOnly>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          <GroupMembersList
            groupId={groupId}
            members={members}
            isLoading={membersLoading}
            currentUserRole={group.user_role}
            isCurrentUserMember={isMember}
          />
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}