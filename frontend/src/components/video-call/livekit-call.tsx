'use client';

import '@livekit/components-styles';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
} from '@livekit/components-react';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';

interface LiveKitCallProps {
  callId: string;
  groupId: string;
  groupName: string;
  onLeave: () => void;
}

export function LiveKitCall({ callId, groupId, groupName, onLeave }: LiveKitCallProps) {
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Room name is derived from the call ID — same for all participants in the group
  const roomName = `group-${groupId}`;

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await apiClient.get(`/livekit/token?roomName=${encodeURIComponent(roomName)}`);
        setToken(res.data.token);
        setLivekitUrl(res.data.url);
      } catch (err) {
        setError('Failed to connect to video call. Please try again.');
      }
    };
    fetchToken();
  }, [roomName]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button onClick={onLeave} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
            Leave Call
          </button>
        </div>
      </div>
    );
  }

  if (!token || !livekitUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Connecting to {groupName}...</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={livekitUrl}
      connect={true}
      video={true}
      audio={true}
      onDisconnected={onLeave}
      className="h-full"
      style={{ height: '100%' }}
    >
      <VideoConference />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
