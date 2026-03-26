'use client';

import '@livekit/components-styles';
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
  useTracks,
  VideoTrack,
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
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  MinusIcon,
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
      <div className="h-full flex items-center justify-center bg-background text-foreground">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={props.onLeave}
            className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors"
          >
            Leave Call
          </button>
        </div>
      </div>
    );
  }

  if (!token || !livekitUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connecting to server...</h2>
          <p className="text-muted-foreground">Connecting to {props.groupName}...</p>
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

  // ── Socket notifications (mirrors WebRTC) ─────────────────────────────────
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
        duration: 3000, icon: '👋',
      });
      socket?.emit('user_joined_call', {
        callId,
        userId: participant.identity,
        user: { name: participant.name || participant.identity },
      });
    };

    const handleParticipantDisconnected = (participant: Participant) => {
      toast.info(`${participant.name || participant.identity} left the call`, {
        duration: 3000, icon: '👋',
      });
      socket?.emit('user_left_call', {
        callId,
        userId: participant.identity,
        user: { name: participant.name || participant.identity },
      });
    };

    const handleTrackMuted = (pub: TrackPublication, participant: Participant) => {
      if (participant.isLocal) return;
      if (pub.kind === Track.Kind.Audio) {
        toast.info(`${participant.name || 'Someone'} muted their microphone`, { duration: 2000, icon: '🔇' });
      } else if (pub.kind === Track.Kind.Video) {
        toast.info(`${participant.name || 'Someone'} turned off their camera`, { duration: 2000, icon: '📷' });
      }
    };

    const handleTrackUnmuted = (pub: TrackPublication, participant: Participant) => {
      if (participant.isLocal) return;
      if (pub.kind === Track.Kind.Audio) {
        toast.info(`${participant.name || 'Someone'} unmuted their microphone`, { duration: 2000, icon: '🎤' });
      } else if (pub.kind === Track.Kind.Video) {
        toast.info(`${participant.name || 'Someone'} turned on their camera`, { duration: 2000, icon: '📹' });
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
    socketService.getSocket()?.emit('audio_state_change', { callId, muted: isAudioEnabled });
  }, [localParticipant, isAudioEnabled, callId]);

  const toggleVideo = useCallback(async () => {
    await localParticipant.setCameraEnabled(!isVideoEnabled);
    setIsVideoEnabled((v) => !v);
    socketService.getSocket()?.emit('video_state_change', { callId, enabled: !isVideoEnabled });
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
    socketService.getSocket()?.emit('leave_call', callId);
    room.disconnect();
    onLeave();
  }, [room, callId, onLeave]);

  const totalParticipants = remoteParticipants.length + 1;
  const controlsPadding =
    totalParticipants >= 6 ? 'py-2 px-4' :
    totalParticipants >= 4 ? 'py-3 px-4' : 'py-4 px-4';

  // ── Floating mode — mirrors FloatingVideoWindow from WebRTC ───────────────
  if (isFloating) {
    return (
      <LiveKitFloatingWindow
        remoteParticipants={remoteParticipants}
        localParticipant={localParticipant}
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
      />
    );
  }

  // ── Check if anyone is screen sharing ─────────────────────────────────────
  const screenSharer = remoteParticipants.find((p) =>
    p.getTrackPublication(Track.Source.ScreenShare)?.isSubscribed
  );
  const localScreenSharing = isScreenSharing;

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Header — identical to WebRTC */}
      <div className="flex items-center justify-between p-4 bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-semibold text-foreground">Video Call</h1>
          <div className="px-2 py-1 rounded-full text-xs bg-primary text-primary-foreground">
            connected
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Screen share area */}
          {(localScreenSharing || screenSharer) && (
            <div className="flex-1 min-h-0">
              <LiveKitScreenShareArea
                screenSharer={screenSharer}
                localParticipant={localParticipant}
                isLocalSharing={localScreenSharing}
              />
            </div>
          )}

          {/* Participant grid */}
          <div className={`min-h-0 ${(localScreenSharing || screenSharer) ? 'h-32 flex-shrink-0 border-t border-border' : 'flex-1'}`}>
            {(localScreenSharing || screenSharer) ? (
              <LiveKitParticipantGridCompact
                remoteParticipants={remoteParticipants}
                localParticipant={localParticipant}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
              />
            ) : (
              <LiveKitParticipantGrid
                remoteParticipants={remoteParticipants}
                localParticipant={localParticipant}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
              />
            )}
          </div>
        </div>
      </div>

      {/* Controls bar — identical style to WebRTC CallControls */}
      <div className={`${controlsPadding} bg-card border-t border-border flex-shrink-0`}>
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full transition-all duration-200 ${
              isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isAudioEnabled ? 'Mute audio' : 'Unmute audio'}
          >
            {isAudioEnabled ? <MicrophoneIcon className="w-6 h-6" /> : <SpeakerXMarkIcon className="w-6 h-6" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-all duration-200 ${
              isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <VideoCameraIcon className="w-6 h-6" /> : <VideoCameraSlashIcon className="w-6 h-6" />}
          </button>

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

          <button
            onClick={handleLeave}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200 ml-8"
            title="Leave call"
          >
            <PhoneXMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Participant grid — full layout, mirrors ParticipantGrid from WebRTC ──────
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

  return (
    <div className={`grid ${gridClass} gap-1 md:gap-2 p-2 md:p-4 h-full`}>
      <LiveKitParticipantTile
        participant={localParticipant}
        isLocal
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
      />
      {remoteParticipants.slice(0, 11).map((p) => (
        <LiveKitParticipantTile key={p.identity} participant={p} isLocal={false} />
      ))}
      {remoteParticipants.length > 11 && (
        <div className="bg-gray-800 rounded-lg flex items-center justify-center border border-gray-600 md:border-2 aspect-video">
          <div className="text-center text-gray-300">
            <UserIcon className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 md:mb-2" />
            <p className="text-xs md:text-sm">+{remoteParticipants.length - 11} more</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Compact grid for screen-share mode — mirrors ParticipantGridCompact ──────
function LiveKitParticipantGridCompact({
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
  return (
    <div className="flex gap-2 p-2 h-full overflow-x-auto">
      <div className="w-24 h-20 flex-shrink-0">
        <LiveKitParticipantTile
          participant={localParticipant}
          isLocal
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
        />
      </div>
      {remoteParticipants.map((p) => (
        <div key={p.identity} className="w-24 h-20 flex-shrink-0">
          <LiveKitParticipantTile participant={p} isLocal={false} />
        </div>
      ))}
    </div>
  );
}

// ── Single participant tile — mirrors ParticipantVideo from WebRTC ────────────
function LiveKitParticipantTile({
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

      {/* Overlay — identical to WebRTC ParticipantVideo */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
        {/* Top-right status indicators */}
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

// ── Screen share area — mirrors ScreenShare from WebRTC ───────────────────────
function LiveKitScreenShareArea({
  screenSharer,
  localParticipant,
  isLocalSharing,
}: {
  screenSharer?: Participant;
  localParticipant: LocalParticipant;
  isLocalSharing: boolean;
}) {
  const presenter = screenSharer || (isLocalSharing ? localParticipant : null);
  const tracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]).filter(
    (t) => presenter && t.participant.identity === presenter.identity
  );
  const screenTrack = tracks[0];

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border-2 border-green-500">
      {screenTrack?.publication?.track ? (
        <VideoTrack trackRef={screenTrack as any} className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          <p className="text-lg">Loading screen share...</p>
        </div>
      )}
      <div className="absolute top-4 left-4 bg-black/70 rounded-lg px-4 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <p className="text-white font-medium">
            {isLocalSharing ? "Your Screen" : `${presenter?.name || presenter?.identity}'s Screen`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Floating window — exact replica of FloatingVideoWindow from WebRTC ────────
// Uses the same bg-card, border-border, bg-muted theme tokens so it looks
// identical in both dev (WebRTC) and prod (LiveKit).
type FloatingState = 'minimized' | 'compact' | 'expanded';

function LiveKitFloatingWindow({
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
  const [floatState, setFloatState] = useState<FloatingState>('compact');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Load / save position — same as FloatingVideoWindow
  useEffect(() => {
    const saved = localStorage.getItem('floating-video-position');
    if (saved) {
      try { setPosition(JSON.parse(saved)); } catch {
        setPosition({ x: window.innerWidth - 420, y: window.innerHeight - 340 });
      }
    } else {
      setPosition({ x: window.innerWidth - 420, y: window.innerHeight - 340 });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('floating-video-position', JSON.stringify(position));
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const maxX = window.innerWidth - (windowRef.current?.offsetWidth || 400);
      const maxY = window.innerHeight - (windowRef.current?.offsetHeight || 300);
      setPosition({
        x: Math.max(0, Math.min(e.clientX - dragOffset.x, maxX)),
        y: Math.max(0, Math.min(e.clientY - dragOffset.y, maxY)),
      });
    };
    const onUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, dragOffset]);

  const getDimensions = () => {
    switch (floatState) {
      case 'minimized': return { width: 240, height: 180 };
      case 'compact':   return { width: 400, height: 300 };
      case 'expanded':  return { width: 640, height: 480 };
    }
  };

  const { width, height } = getDimensions();

  const minimize = () => {
    setFloatState('minimized');
    setPosition({ x: window.innerWidth - 260, y: window.innerHeight - 200 });
  };

  const toggleExpand = () => {
    setFloatState(floatState === 'expanded' ? 'compact' : 'expanded');
  };

  const totalCount = remoteParticipants.length + 1;

  return (
    <div
      ref={windowRef}
      className={`fixed z-40 bg-card border-2 border-border rounded-lg shadow-2xl overflow-hidden transition-all ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{ left: `${position.x}px`, top: `${position.y}px`, width: `${width}px`, height: `${height}px` }}
      onMouseDown={handleMouseDown}
    >
      {/* Header — identical to FloatingVideoWindow */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">
            {totalCount} participant{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center space-x-1 no-drag">
          <button
            onClick={minimize}
            className="p-1 rounded hover:bg-accent transition-colors"
            title="Minimize"
          >
            <MinusIcon className="w-4 h-4" />
          </button>
          <button
            onClick={toggleExpand}
            className="p-1 rounded hover:bg-accent transition-colors"
            title={floatState === 'expanded' ? 'Compact' : 'Expand'}
          >
            {floatState === 'expanded' ? (
              <ArrowsPointingInIcon className="w-4 h-4" />
            ) : (
              <ArrowsPointingOutIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Video content */}
      <div className="relative h-[calc(100%-40px)] bg-muted">
        {floatState === 'minimized' ? (
          <LiveKitFloatingCompactGrid
            remoteParticipants={remoteParticipants}
            localParticipant={localParticipant}
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
          />
        ) : (
          <LiveKitFloatingGrid
            remoteParticipants={remoteParticipants}
            localParticipant={localParticipant}
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
          />
        )}
      </div>
    </div>
  );
}

// Compact 2x2 grid for minimized floating state — mirrors CompactParticipantGrid
function LiveKitFloatingCompactGrid({
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
  const shown = remoteParticipants.slice(0, 3);

  return (
    <div className="grid grid-cols-2 gap-1 p-1 h-full">
      {/* Local */}
      <div className="relative bg-background rounded overflow-hidden">
        <LiveKitParticipantTile
          participant={localParticipant}
          isLocal
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
        />
      </div>
      {shown.map((p) => (
        <div key={p.identity} className="relative bg-background rounded overflow-hidden">
          <LiveKitParticipantTile participant={p} isLocal={false} />
        </div>
      ))}
    </div>
  );
}

// Regular grid for compact/expanded floating state — mirrors ParticipantGrid in FloatingVideoWindow
function LiveKitFloatingGrid({
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
  const cols = total <= 2 ? 1 : total <= 4 ? 2 : 3;

  return (
    <div
      className="grid gap-2 p-2 h-full"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      <LiveKitParticipantTile
        participant={localParticipant}
        isLocal
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
      />
      {remoteParticipants.map((p) => (
        <LiveKitParticipantTile key={p.identity} participant={p} isLocal={false} />
      ))}
    </div>
  );
}
