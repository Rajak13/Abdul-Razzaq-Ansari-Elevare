'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  MinusIcon
} from '@heroicons/react/24/outline';

interface Participant {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  stream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface FloatingVideoWindowProps {
  participants: Participant[];
  localStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onClose?: () => void;
  initialState?: 'minimized' | 'compact' | 'expanded';
}

type VideoState = 'minimized' | 'compact' | 'expanded' | 'fullscreen';

export function FloatingVideoWindow({
  participants,
  localStream,
  localVideoRef,
  isAudioEnabled,
  isVideoEnabled,
  onClose,
  initialState = 'compact'
}: FloatingVideoWindowProps) {
  const [videoState, setVideoState] = useState<VideoState>(initialState);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('floating-video-position');
    if (saved) {
      try {
        const savedPosition = JSON.parse(saved);
        setPosition(savedPosition);
      } catch (e) {
        // Use default position
        setPosition({ x: window.innerWidth - 420, y: window.innerHeight - 340 });
      }
    } else {
      // Default to bottom-right corner
      setPosition({ x: window.innerWidth - 420, y: window.innerHeight - 340 });
    }
  }, []);

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('floating-video-position', JSON.stringify(position));
  }, [position]);

  // Handle dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep window within viewport
      const maxX = window.innerWidth - (windowRef.current?.offsetWidth || 400);
      const maxY = window.innerHeight - (windowRef.current?.offsetHeight || 300);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Get dimensions based on state
  const getDimensions = () => {
    switch (videoState) {
      case 'minimized':
        return { width: 240, height: 180 };
      case 'compact':
        return { width: 400, height: 300 };
      case 'expanded':
        return { width: 640, height: 480 };
      case 'fullscreen':
        return { width: window.innerWidth, height: window.innerHeight };
      default:
        return { width: 400, height: 300 };
    }
  };

  const dimensions = getDimensions();

  const toggleState = () => {
    if (videoState === 'minimized') {
      setVideoState('compact');
    } else if (videoState === 'compact') {
      setVideoState('expanded');
    } else if (videoState === 'expanded') {
      setVideoState('compact');
    }
  };

  const minimize = () => {
    setVideoState('minimized');
    // Move to bottom-right corner
    setPosition({
      x: window.innerWidth - 260,
      y: window.innerHeight - 200
    });
  };

  if (videoState === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        {/* Fullscreen video content */}
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 bg-card border-b">
            <h3 className="text-lg font-semibold">Video Call</h3>
            <button
              onClick={() => setVideoState('compact')}
              className="p-2 rounded-lg hover:bg-accent"
            >
              <ArrowsPointingInIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1">
            {/* Participant grid */}
            <ParticipantGrid
              participants={participants}
              localStream={localStream}
              localVideoRef={localVideoRef}
              isAudioEnabled={isAudioEnabled}
              isVideoEnabled={isVideoEnabled}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={windowRef}
      className={`fixed z-40 bg-card border-2 border-border rounded-lg shadow-2xl overflow-hidden transition-all ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">
            {participants.length + 1} participant{participants.length + 1 !== 1 ? 's' : ''}
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
            onClick={toggleState}
            className="p-1 rounded hover:bg-accent transition-colors"
            title={videoState === 'expanded' ? 'Compact' : 'Expand'}
          >
            {videoState === 'expanded' ? (
              <ArrowsPointingInIcon className="w-4 h-4" />
            ) : (
              <ArrowsPointingOutIcon className="w-4 h-4" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
              title="Close"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Video content */}
      <div className="relative h-[calc(100%-40px)] bg-muted">
        {videoState === 'minimized' ? (
          <CompactParticipantGrid
            participants={participants}
            localStream={localStream}
            localVideoRef={localVideoRef}
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
          />
        ) : (
          <ParticipantGrid
            participants={participants}
            localStream={localStream}
            localVideoRef={localVideoRef}
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
          />
        )}
      </div>

      {/* Sync local video stream */}
      <LocalVideoSync
        stream={localStream}
        videoRef={localVideoRef}
        isVideoEnabled={isVideoEnabled}
        videoState={videoState}
      />
    </div>
  );
}

// Helper component to sync local video stream
function LocalVideoSync({
  stream,
  videoRef,
  isVideoEnabled,
  videoState
}: {
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isVideoEnabled: boolean;
  videoState: string;
}) {
  useEffect(() => {
    if (stream && videoRef.current && isVideoEnabled) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.warn("Local video play failed:", err));
    }
  }, [stream, videoRef, isVideoEnabled, videoState]);

  return null;
}

// Compact grid for minimized state
function CompactParticipantGrid({
  participants,
  localStream,
  localVideoRef,
  isAudioEnabled,
  isVideoEnabled
}: {
  participants: Participant[];
  localStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}) {
  const allParticipants: Array<Participant | { isLocal: true; stream: MediaStream | null; audioEnabled: boolean; videoEnabled: boolean }> = [
    { isLocal: true, stream: localStream, audioEnabled: isAudioEnabled, videoEnabled: isVideoEnabled },
    ...participants.slice(0, 3) // Show max 4 in minimized
  ];

  return (
    <div className="grid grid-cols-2 gap-1 p-1 h-full">
      {allParticipants.map((participant, index) => (
        <div key={index} className="relative bg-background rounded overflow-hidden">
          {'isLocal' in participant && participant.isLocal ? (
            participant.videoEnabled && participant.stream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="text-center">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-1">
                    <span className="text-xs font-semibold text-primary">You</span>
                  </div>
                </div>
              </div>
            )
          ) : (
            <VideoParticipant participant={participant as Participant} />
          )}
          {'isLocal' in participant && (
            <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/70 rounded text-[10px] text-white">
              You
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Regular grid for compact/expanded state
function ParticipantGrid({
  participants,
  localStream,
  localVideoRef,
  isAudioEnabled,
  isVideoEnabled
}: {
  participants: Participant[];
  localStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}) {
  const totalParticipants = participants.length + 1;
  const gridCols = totalParticipants <= 2 ? 1 : totalParticipants <= 4 ? 2 : 3;

  return (
    <div
      className={`grid gap-2 p-2 h-full`}
      style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
    >
      {/* Local video */}
      <div className="relative bg-background rounded-lg overflow-hidden">
        {isVideoEnabled && localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-xl font-semibold text-primary">You</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium">Camera Off</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
          You {!isVideoEnabled && '(Camera off)'}
        </div>
      </div>

      {/* Remote participants */}
      {participants.map((participant) => (
        <VideoParticipant key={participant.userId} participant={participant} />
      ))}
    </div>
  );
}

function VideoParticipant({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div className="relative bg-background rounded-lg overflow-hidden">
      {participant.stream && participant.videoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-lg font-semibold text-primary-foreground">
                {participant.user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{participant.user.name}</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white">
        {participant.user.name} {!participant.videoEnabled && '(Camera off)'}
      </div>
    </div>
  );
}
