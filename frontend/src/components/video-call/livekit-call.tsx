'use client';

import '@livekit/components-styles';
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
  useTracks,
  VideoTrack,
  AudioTrack,
  RoomAudioRenderer,
  useRoomContext,
} from '@livekit/components-react';
import {
  Track,
  RoomEvent,
  Participant,
  TrackPublication,
  LocalParticipant,
} from 'livekit-client';
import { useEffect, useState, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { socketService } from '@/services/socket-service';
import { toast } from 'sonner';
import {
  MicrophoneIcon,
  VideoCameraIcon,
  ComputerDesktopIcon,
  PhoneXMarkIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {
  SpeakerXMarkIcon,
  VideoCameraSlashIcon,
  ComputerDesktopIcon as ComputerDesktopIconSolid,
} from '@heroicons/react/24/solid';

interface LiveKitCallProps {
  callId: string;
  groupId: string;
  groupName: string;
  onLeave: () => void;
  isFloating?: boolean;
}

// ── Token fetcher wrapper ────────────────────────────────────────────────────
export function LiveKitCall(props: LiveKitCallProps) {
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roomName = `group-${props.groupId}`;

  useEffect(() => {
    apiClient
      .get(`/livekit/token?roomName=${encodeURIComponent(roomName)}`)
      .then((res) => {
        setToken(res.data.token);
        setLivekitUrl(res.data.url);
      })
      .catch(() => setError('Failed to connect to video call. Please try again.'));
  }, [roomName]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={props.onLeave}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Leave Call
          </button>
        </div>
      </div>
    );
  }

  if (!token || !livekitUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-400">Connecting to {props.groupName}...</p>
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
      onDisconnected={props.onLeave}
      className="h-full"
      style={{ height: '100%', background: 'transparent' }}
    >
      <RoomAudioRenderer />
      <LiveKitCallInner {...props} />
    </LiveKitRoom>
  );
}

// ── Inner component (has access to room context) ─────────────────────────────
function LiveKitCallInner({ callId, groupId, onLeave, isFloating }: LiveKitCallProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const remoteParticipants = participants.filter((p) => !p.isLocal);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const hasJoinedRef = useRef(false);

  // ── Socket notifications (same as WebRTC) ──────────────────────────────────
  useEffect(() => {
    if (!room || hasJoinedRef.current) return;
    hasJoinedRef.current = true;

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('join_call', { callId, groupId });
    }

    toast.success('Joined the call successfully!', { duration: 3000, icon: '✅' });

    const handleParticipantConnected = (participant: Participant) => {
      toast.success(`${participant.name || participant.identity} joined the call`, {
        duration: 3000,
        icon: '👋',
      });
      if (socket) {
        socket.emit('user_joined_call', {
          callId,
          userId: participant.identity,
          user: { name: participant.name || participant.identity },
        });
      }
    };

    const handleParticipantDisconnected = (participant: Participant) => {
      toast.info(`${participant.name || participant.identity} left the call`, {
        duration: 3000,
        icon: '👋',
      });
      if (socket) {
        socket.emit('user_left_call', {
          callId,
          userId: participant.identity,
          user: { name: participant.name || participant.identity },
        });
      }
    };

    const handleTrackMuted = (pub: TrackPublication, participant: Participant) => {
      if (participant.isLocal) return;
      if (pub.kind === Track.Kind.Audio) {
        toast.info(`${participant.name || 'Someone'} muted their microphone`, {
          duration: 2000,
          icon: '🔇',
        });
      } else if (pub.kind === Track.Kind.Video) {
        toast.info(`${participant.name || 'Someone'} turned off their camera`, {
          duration: 2000,
          icon: '📷',
        });
      }
    };

    const handleTrackUnmuted = (pub: TrackPublication, participant: Participant) => {
      if (participant.isLocal) return;
      if (pub.kind === Track.Kind.Audio) {
        toast.info(`${participant.name || 'Someone'} unmuted their microphone`, {
          duration: 2000,
          icon: '🎤',
        });
      } else if (pub.kind === Track.Kind.Video) {
        toast.info(`${participant.name || 'Someone'} turned on their camera`, {
          duration: 2000,
          icon: '📹',
        });
      }
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.TrackMuted, handleTrackMuted);
    room.on(RoomEvent.TrackUnmuted, handleTrackUnmuted);

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.TrackMuted, handleTrackMuted);
      room.off(RoomEvent.TrackUnmuted, handleTrackUnmuted);
    };
  }, [room, callId, groupId]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleAudio = useCallback(async () => {
    await localParticipant.setMicrophoneEnabled(!isAudioEnabled);
    setIsAudioEnabled((v) => !v);
    const socket = socketService.getSocket();
    socket?.emit('audio_state_change', { callId, muted: isAudioEnabled });
  }, [localParticipant, isAudioEnabled, callId]);

  const toggleVideo = useCallback(async () => {
    await localParticipant.setCameraEnabled(!isVideoEnabled);
    setIsVideoEnabled((v) => !v);
    const socket = socketService.getSocket();
    socket?.emit('video_state_change', { callId, enabled: !isVideoEnabled });
  }, [localParticipant, isVideoEnabled, callId]);

  const toggleScreenShare = useCallback(async () => {
    const socket = socketService.getSocket();
    if (isScreenSharing) {
      await localParticipant.setScreenShareEnabled(false);
      setIsScreenSharing(false);
      socket?.emit('screen_share_stopped', { callId, userId: localParticipant.identity });
      toast.info('Screen sharing stopped', { duration: 2000, icon: '📺' });
    } else {
      try {
        await localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
        socket?.emit('screen_share_started', { callId, userId: localParticipant.identity });
        toast.success('Screen sharing started', { duration: 2000, icon: '📺' });
      } catch {
        toast.error('Screen sharing permission denied.', { duration: 3000 });
      }
    }
  }, [localParticipant, isScreenSharing, callId]);

  const handleLeave = useCallback(() => {
    const socket = socketService.getSocket();
    socket?.emit('leave_call', callId);
    room.disconnect();
    onLeave();
  }, [room, callId, onLeave]);

  if (isFloating) {
    return <FloatingParticipants remoteParticipants={remoteParticipants} localParticipant={localParticipant} />;
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Participant grid */}
      <div className="flex-1 overflow-hidden">
        <LiveKitParticipantGrid
          remoteParticipants={remoteParticipants}
          localParticipant={localParticipant}
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
        />
      </div>

      {/* Controls bar — identical style to WebRTC CallControls */}
      <div className="flex items-center justify-center space-x-4 py-4 bg-gray-800 border-t border-gray-700">
        {/* Audio */}
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-all duration-200 ${
            isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isAudioEnabled ? 'Mute audio' : 'Unmute audio'}
        >
          {isAudioEnabled ? <MicrophoneIcon className="w-6 h-6" /> : <SpeakerXMarkIcon className="w-6 h-6" />}
        </button>

        {/* Video */}
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-all duration-200 ${
            isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? <VideoCameraIcon className="w-6 h-6" /> : <VideoCameraSlashIcon className="w-6 h-6" />}
        </button>

        {/* Screen share */}
        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-full transition-all duration-200 ${
            isScreenSharing ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? (
            <ComputerDesktopIconSolid className="w-6 h-6" />
          ) : (
            <ComputerDesktopIcon className="w-6 h-6" />
          )}
        </button>

        {/* Leave */}
        <button
          onClick={handleLeave}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200 ml-8"
          title="Leave call"
        >
          <PhoneXMarkIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

// ── Participant grid — mirrors ParticipantGrid from WebRTC ───────────────────
function LiveKitParticipantGrid({
  remoteParticipants,
  localParticipant,
  isAudioEnabled,
  isVideoEnabled,
}: {
  remoteParticipants: Participant[];
  localParticipant: LocalParticipant;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}) {
  const total = remoteParticipants.length + 1;

  const gridClass =
    total === 1 ? 'grid-cols-1' :
    total === 2 ? 'grid-cols-2' :
    total <= 4 ? 'grid-cols-2 grid-rows-2' :
    total <= 6 ? 'grid-cols-3 grid-rows-2' :
    total <= 9 ? 'grid-cols-3 grid-rows-3' :
    'grid-cols-4 grid-rows-3';

  // Check if anyone is screen sharing
  const screenSharer = remoteParticipants.find((p) =>
    p.getTrackPublication(Track.Source.ScreenShare)?.isSubscribed
  );

  if (screenSharer) {
    return (
      <div className="flex flex-col h-full gap-2 p-2 md:p-4">
        <div className="flex-1 bg-black rounded-lg overflow-hidden border-2 border-green-500">
          <ScreenShareTile participant={screenSharer} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <div className="w-32 h-24 flex-shrink-0">
            <ParticipantTile participant={localParticipant} isLocal isAudioEnabled={isAudioEnabled} isVideoEnabled={isVideoEnabled} />
          </div>
          {remoteParticipants.slice(0, 10).map((p) => (
            <div key={p.identity} className="w-32 h-24 flex-shrink-0">
              <ParticipantTile participant={p} isLocal={false} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`grid ${gridClass} gap-1 md:gap-2 p-2 md:p-4 h-full`}>
      <ParticipantTile
        participant={localParticipant}
        isLocal
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
      />
      {remoteParticipants.slice(0, 11).map((p) => (
        <ParticipantTile key={p.identity} participant={p} isLocal={false} />
      ))}
      {remoteParticipants.length > 11 && (
        <div className="bg-gray-800 rounded-lg flex items-center justify-center border-2 border-gray-600">
          <div className="text-center text-gray-300">
            <UserIcon className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">+{remoteParticipants.length - 11} more</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Single participant tile ───────────────────────────────────────────────────
function ParticipantTile({
  participant,
  isLocal,
  isAudioEnabled,
  isVideoEnabled,
}: {
  participant: Participant | LocalParticipant;
  isLocal: boolean;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
}) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  ).filter((t) => t.participant.identity === participant.identity);

  const cameraTrack = tracks.find((t) => t.source === Track.Source.Camera);
  const micTrack = tracks.find((t) => t.source === Track.Source.Microphone);

  const hasVideo = isLocal
    ? isVideoEnabled !== false && !!cameraTrack?.publication?.isEnabled
    : !!cameraTrack?.publication?.isEnabled;

  const hasAudio = isLocal
    ? isAudioEnabled !== false
    : !!micTrack?.publication?.isEnabled;

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden border border-gray-600 md:border-2 aspect-video">
      {hasVideo && cameraTrack?.publication?.track ? (
        <VideoTrack
          trackRef={cameraTrack as any}
          className={`w-full h-full object-cover ${isLocal ? '-scale-x-100' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-600 flex items-center justify-center">
            <UserIcon className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
          </div>
        </div>
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
        {/* Top-right status */}
        <div className="absolute top-1 right-1 md:top-2 md:right-2 flex space-x-1">
          <div className={`p-0.5 md:p-1 rounded-full ${hasAudio ? 'bg-green-600' : 'bg-red-600'}`}>
            {hasAudio ? (
              <MicrophoneIcon className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
            ) : (
              <SpeakerXMarkIcon className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
            )}
          </div>
          <div className={`p-0.5 md:p-1 rounded-full ${hasVideo ? 'bg-green-600' : 'bg-red-600'}`}>
            {hasVideo ? (
              <VideoCameraIcon className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
            ) : (
              <VideoCameraSlashIcon className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
            )}
          </div>
        </div>

        {/* Connection quality bars */}
        <div className="absolute top-1 left-1 md:top-2 md:left-2 flex space-x-0.5 md:space-x-1">
          <div className="w-0.5 h-2 md:w-1 md:h-3 bg-green-500 rounded-full" />
          <div className="w-0.5 h-2 md:w-1 md:h-3 bg-green-500 rounded-full" />
          <div className="w-0.5 h-2 md:w-1 md:h-3 bg-green-500 rounded-full" />
          <div className="w-0.5 h-2 md:w-1 md:h-3 bg-gray-500 rounded-full" />
        </div>

        {/* Name label */}
        <div className="absolute bottom-1 left-1 right-1 md:bottom-2 md:left-2 md:right-2">
          <div className="bg-black/70 rounded px-1.5 py-0.5 md:px-2 md:py-1">
            <p className="text-white text-xs md:text-sm font-medium truncate">
              {isLocal ? 'You' : participant.name || participant.identity}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Screen share tile ─────────────────────────────────────────────────────────
function ScreenShareTile({ participant }: { participant: Participant }) {
  const tracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]).filter(
    (t) => t.participant.identity === participant.identity
  );
  const screenTrack = tracks[0];

  return (
    <div className="relative w-full h-full bg-black">
      {screenTrack?.publication?.track ? (
        <VideoTrack trackRef={screenTrack as any} className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          Loading screen share...
        </div>
      )}
      <div className="absolute top-4 left-4 bg-black/70 rounded-lg px-4 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <p className="text-white font-medium">{participant.name || participant.identity}'s Screen</p>
        </div>
      </div>
    </div>
  );
}

// ── Floating compact view (when switching tabs) ───────────────────────────────
function FloatingParticipants({
  remoteParticipants,
  localParticipant,
}: {
  remoteParticipants: Participant[];
  localParticipant: LocalParticipant;
}) {
  return (
    <div className="flex gap-2 p-2 h-full overflow-x-auto bg-gray-900">
      <div className="w-24 h-20 flex-shrink-0">
        <ParticipantTile participant={localParticipant} isLocal />
      </div>
      {remoteParticipants.map((p) => (
        <div key={p.identity} className="w-24 h-20 flex-shrink-0">
          <ParticipantTile participant={p} isLocal={false} />
        </div>
      ))}
    </div>
  );
}
