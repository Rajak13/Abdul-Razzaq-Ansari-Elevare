'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VideoCallInterface } from '@/components/video-call/video-call-interface';
import { VideoCallLobby } from '@/components/video-call/video-call-lobby';
import { useAuth } from '@/contexts/auth-context';
import { useSocket } from '@/hooks/use-socket';
import { 
  ArrowLeftIcon,
  UserGroupIcon,
  ClockIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  member_count: number;
  is_member: boolean;
}

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
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inLobby, setInLobby] = useState(true);
  const [callSettings, setCallSettings] = useState<CallSettings | null>(null);

  const groupId = params.id as string;
  const callId = `group-${groupId}-call`; // Fixed call ID for the group

  // Fetch group details
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const response = await fetch(`/api/groups/${groupId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch group details');
        }

        const groupData = await response.json();
        
        if (!groupData.is_member) {
          setError('You must be a member of this group to join video calls');
          return;
        }

        setGroup(groupData);
      } catch (err) {
        console.error('Error fetching group:', err);
        setError('Failed to load group details');
      } finally {
        setLoading(false);
      }
    };

    if (user && groupId) {
      fetchGroup();
    }
  }, [user, groupId]);

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
      <VideoCallInterface
        callId={callId}
        groupId={groupId}
        groupName={group.name}
        onLeave={handleLeaveCall}
      />
    </div>
  );
}