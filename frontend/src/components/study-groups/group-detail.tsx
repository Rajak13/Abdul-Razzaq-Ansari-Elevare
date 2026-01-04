'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { StartVideoCallButtonCompact, VideoCallCard } from '@/components/video-call/start-video-call-button';
import { VideoCallInterface } from '@/components/video-call/video-call-interface';
import { GroupChat } from './group-chat';
import { JoinRequestManagement } from './join-request-management';
import { WhiteboardCanvas } from '@/components/whiteboard/whiteboard-canvas';
import { GroupMembersList } from './group-members-list';
import { 
  Users,
  Clock,
  MessageCircle,
  FileText,
  Lock,
  Globe,
  Video,
  PenTool,
  UserPlus,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  is_private: boolean;
  max_members: number | null;
  member_count: number;
  is_member: boolean;
  user_role: 'owner' | 'admin' | 'member' | null;
  created_at: string;
  updated_at: string;
}

interface LocalGroupMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user_name: string;
  user_email: string;
}

interface GroupDetailProps {
  groupId: string;
  onBack?: () => void;
  showBackButton?: boolean;
  className?: string;
}

export function GroupDetail({ 
  groupId, 
  onBack, 
  showBackButton = true, 
  className = '' 
}: GroupDetailProps) {
  const { user } = useAuth();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<LocalGroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'chat' | 'video-call' | 'whiteboard' | 'requests'>('overview');

  // Fetch group details and members
  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const [groupResponse, membersResponse] = await Promise.all([
          fetch(`/api/study-groups/${groupId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }),
          fetch(`/api/study-groups/${groupId}/members`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
        ]);

        if (!groupResponse.ok) {
          throw new Error('Failed to fetch group details');
        }

        const groupData = await groupResponse.json();
        setGroup(groupData);

        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          setMembers(membersData);
        }
      } catch (err) {
        console.error('Error fetching group data:', err);
        setError('Failed to load group details');
      } finally {
        setLoading(false);
      }
    };

    if (user && groupId) {
      fetchGroupData();
    }
  }, [user, groupId]);

  const getGroupInitials = (name: string | undefined) => {
    if (!name) return 'SG';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const canManageRequests = group?.user_role === 'owner' || group?.user_role === 'admin';

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Header Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {showBackButton && (
                  <Skeleton className="h-8 w-16" />
                )}
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !group || !group.name) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-red-500 mb-2">⚠️</div>
            <p className="text-red-700 font-medium">
              {error || 'Group not found or invalid group data'}
            </p>
            {showBackButton && onBack && (
              <Button
                onClick={onBack}
                variant="outline"
                className="mt-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {showBackButton && onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {getGroupInitials(group.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      {group.is_private ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <Globe className="w-4 h-4" />
                      )}
                      <span>{group.is_private ? 'Private' : 'Public'} Group</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{group.member_count} members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Created {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {group.is_member && (
              <div className="flex items-center space-x-3">
                <Badge variant={getRoleBadgeVariant(group.user_role || 'member')}>
                  {group.user_role === 'owner' ? 'Owner' : 
                   group.user_role === 'admin' ? 'Admin' : 'Member'}
                </Badge>
                <StartVideoCallButtonCompact
                  groupId={group.id}
                  groupName={group.name}
                  memberCount={group.member_count}
                />
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Group Description */}
          <Card>
            <CardHeader>
              <CardTitle>About this group</CardTitle>
            </CardHeader>
            <CardContent>
              {group.description ? (
                <p className="text-gray-700">{group.description}</p>
              ) : (
                <p className="text-gray-500 italic">No description provided</p>
              )}
            </CardContent>
          </Card>

          {/* Main Tabs - Only show for members */}
          {group.is_member && (
            <Card>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview" className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Overview</span>
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="flex items-center space-x-2">
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Chat</span>
                  </TabsTrigger>
                  <TabsTrigger value="video-call" className="flex items-center space-x-2">
                    <Video className="w-4 h-4" />
                    <span className="hidden sm:inline">Video Call</span>
                  </TabsTrigger>
                  <TabsTrigger value="whiteboard" className="flex items-center space-x-2">
                    <PenTool className="w-4 h-4" />
                    <span className="hidden sm:inline">Whiteboard</span>
                  </TabsTrigger>
                  <TabsTrigger value="members" className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Members</span>
                  </TabsTrigger>
                  {canManageRequests && (
                    <TabsTrigger value="requests" className="flex items-center space-x-2">
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Requests</span>
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-4 bg-green-50 border-green-200">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Video className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-green-900">Video Calls</h4>
                            <p className="text-sm text-green-700">
                              Start video study sessions with screen sharing
                            </p>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-4 bg-emerald-50 border-emerald-200">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <MessageCircle className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-emerald-900">Group Chat</h4>
                            <p className="text-sm text-emerald-700">
                              Real-time messaging with group members
                            </p>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-4 bg-teal-50 border-teal-200">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-teal-100 rounded-lg">
                            <PenTool className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-teal-900">Whiteboard</h4>
                            <p className="text-sm text-teal-700">
                              Collaborative drawing and note-taking
                            </p>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-4 bg-lime-50 border-lime-200">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-lime-100 rounded-lg">
                            <Users className="w-5 h-5 text-lime-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-lime-900">Members</h4>
                            <p className="text-sm text-lime-700">
                              View and manage group members
                            </p>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="chat" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <MessageCircle className="w-5 h-5" />
                        <span>Group Chat</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <GroupChat groupId={group.id} />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="video-call" className="mt-6">
                  <div className="space-y-6">
                    <VideoCallCard
                      groupId={group.id}
                      groupName={group.name}
                      memberCount={group.member_count}
                    />
                    
                    {/* Video Call Interface - Embedded */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Video className="w-5 h-5" />
                          <span>Video Call Interface</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-100 rounded-lg p-4 text-center">
                          <p className="text-gray-600 mb-4">
                            Click "Start Call" or "Join Call" above to enter the video call interface
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span>HD Video</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span>Screen Share</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                              <span>Breakout Rooms</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                              <span>Recording</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="whiteboard" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <PenTool className="w-5 h-5" />
                        <span>Collaborative Whiteboard</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="bg-white rounded-lg border">
                        <WhiteboardCanvas 
                          whiteboardId={`group-${group.id}`}
                          groupId={group.id}
                          canEdit={true}
                          className="h-96"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="members" className="mt-6">
                  <GroupMembersList 
                    groupId={group.id}
                    members={members}
                    isLoading={false}
                    currentUserRole={group.user_role || undefined}
                    isCurrentUserMember={group.is_member}
                  />
                </TabsContent>

                {canManageRequests && (
                  <TabsContent value="requests" className="mt-6">
                    <JoinRequestManagement 
                      groupId={group.id}
                      userRole={group.user_role}
                    />
                  </TabsContent>
                )}
              </Tabs>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          {group.is_member && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('chat')}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Open Chat
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setActiveTab('whiteboard')}
                >
                  <PenTool className="w-4 h-4 mr-2" />
                  Open Whiteboard
                </Button>
                <StartVideoCallButtonCompact
                  groupId={group.id}
                  groupName={group.name}
                  memberCount={group.member_count}
                  className="w-full"
                />
              </CardContent>
            </Card>
          )}

          {/* Members Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Members ({members.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.slice(0, 5).map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {member.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.user_name}</p>
                        <p className="text-xs text-gray-500">{member.user_email}</p>
                      </div>
                    </div>
                    <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                      {member.role}
                    </Badge>
                  </div>
                ))}
                {members.length > 5 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setActiveTab('members')}
                  >
                    View all {members.length} members
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Group Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Group Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Members</span>
                <span className="text-sm font-medium">{group.member_count}</span>
              </div>
              {group.max_members && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Max Members</span>
                  <span className="text-sm font-medium">{group.max_members}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Created</span>
                <span className="text-sm font-medium">
                  {new Date(group.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Privacy</span>
                <span className="text-sm font-medium">
                  {group.is_private ? 'Private' : 'Public'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}