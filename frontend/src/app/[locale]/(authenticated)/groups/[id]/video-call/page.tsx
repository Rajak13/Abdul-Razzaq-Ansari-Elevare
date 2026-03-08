'use client';

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'


import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/navigation';
import { VideoCallInterface } from '@/components/video-call/video-call-interface';
import { EnhancedCallLayout } from '@/components/video-call/enhanced-call-layout';
import { VideoCallLobby } from '@/components/video-call/video-call-lobby';
import { useAuth } from '@/contexts/auth-context';
import { useSocket } from '@/hooks/use-socket';
import {
  useStudyGroup
} from '@/hooks/use-study-groups';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  ClockIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

interface CallSettings {
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioDevice?: string;
  videoDevice?: string;
}

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const socket = useSocket();
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [inLobby, setInLobby] = useState(true);
  const [callSettings, setCallSettings] = useState<CallSettings | null>(null);
  const [useEnhancedLayout, setUseEnhancedLayout] = useState(true); // Toggle for testing

  const groupId = params.id as string;
  const callId = `group-${groupId}-call`; // Fixed call ID for the group

  // Use the cached study group hook instead of raw fetch to prevent loops
  const { data: groupData, isLoading: loading, error: queryError } = useStudyGroup(groupId);
  const group = groupData?.group;

  // Check group membership once data is loaded
  useEffect(() => {
    if (group && !group.is_member) {
      setMembershipError('You must be a member of this group to join video calls');
    } else {
      setMembershipError(null);
    }
  }, [group]);

  const error = queryError ? 'Failed to load group details' : membershipError;

  const handleJoinCall = (settings: CallSettings) => {
    setCallSettings(settings);
    setInLobby(false);
  };

  const handleLeaveCall = () => {
    router.push(`/groups/${groupId}`);
  };

  const handleLobbyCancel = () => {
    router.push(`/groups/${groupId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Loading video call...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded mb-4">
            {error || 'Group not found'}
          </div>
          <button
            onClick={() => router.push('/groups')}
            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  if (inLobby) {
    return (
      <VideoCallLobby
        groupName={group.name}
        memberCount={group.member_count}
        onJoinCall={handleJoinCall}
        onCancel={handleLobbyCancel}
      />
    );
  }

  return (
    <div className="h-screen bg-background">
      {useEnhancedLayout ? (
        <EnhancedCallLayout
          callId={callId}
          groupId={groupId}
          groupName={group.name}
          onLeave={handleLeaveCall}
        />
      ) : (
        <VideoCallInterface
          callId={callId}
          groupId={groupId}
          groupName={group.name}
          onLeave={handleLeaveCall}
        />
      )}
    </div>
  );
}