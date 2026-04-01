'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  MinusIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  PhoneXMarkIcon,
} from '@heroicons/react/24/outline';
import { SpeakerXMarkIcon, VideoCameraSlashIcon } from '@heroicons/react/24/solid';

interface Participant {
  userId: string;
  user: { id: string; name: string; email: string; avatar_url?: string };
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
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onLeave?: () => void;
  initialState?: 'minimized' | 'compact' | 'expanded';
}

type VideoState = 'minimized' | 'compact' | 'expanded';

// Snap to nearest corner/edge
function snapPosition(x: number, y: number, w: number, h: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 12;
  const snapX = x < vw / 2 ? margin : vw - w - margin;
  const snapY = Math.max(margin, Math.min(y, vh - h - margin));
  return { x: snapX, y: snapY };
}

export function FloatingVideoWindow({
  participants,
  localStream,
  localVideoRef,
  isAudioEnabled,
  isVideoEnabled,
  onClose,
  onToggleAudio,
  onToggleVideo,
  onLeave,
  initialState = 'compact',
}: FloatingVideoWindowProps) {
  const [videoState, setVideoState] = useState<VideoState>(initialState);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const hasDraggedRef = useRef(false);

  const getDimensions = useCallback(() => {
    const vw = window.innerWidth;
    switch (videoState) {
      case 'minimized': return { width: Math.min(160, vw - 24), height: 120 };
      case 'compact':   return { width: Math.min(320, vw - 24), height: 240 };
      case 'expanded':  return { width: Math.min(480, vw - 24), height: 360 };
    }
  }, [videoState]);

  // Init position bottom-right
  useEffect(() => {
    const saved = localStorage.getItem('floating-video-position');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        const { width, height } = getDimensions();
        setPosition(snapPosition(p.x, p.y, width, height));
        return;
      } catch { /* fall through */ }
    }
    const { width, height } = getDimensions();
    setPosition({ x: window.innerWidth - width - 12, y: window.innerHeight - height - 80 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-snap when size changes
  useEffect(() => {
    const { width, height } = getDimensions();
    setPosition(p => snapPosition(p.x, p.y, width, height));
  }, [videoState, getDimensions]);

  // Save position
  useEffect(() => {
    localStorage.setItem('floating-video-position', JSON.stringify(position));
  }, [position]);

  // ── Unified pointer drag (mouse + touch) ──────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    hasDraggedRef.current = false;
    dragOffsetRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    setIsDragging(true);
  }, [position]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    hasDraggedRef.current = true;
    const { width, height } = getDimensions();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const newX = Math.max(0, Math.min(e.clientX - dragOffsetRef.current.x, vw - width));
    const newY = Math.max(0, Math.min(e.clientY - dragOffsetRef.current.y, vh - height));
    setPosition({ x: newX, y: newY });
  }, [isDragging, getDimensions]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    // Snap to nearest edge after release
    const { width, height } = getDimensions();
    setPosition(p => snapPosition(p.x, p.y, width, height));
  }, [isDragging, getDimensions]);

  const minimize = () => {
    setVideoState('minimized');
  };

  const toggleExpand = () => {
    setVideoState(s => s === 'expanded' ? 'compact' : 'expanded');
  };

  const { width, height } = getDimensions();
  const totalParticipants = participants.length + 1;

  return (
    <div
      ref={windowRef}
      className={`fixed z-40 bg-card border-2 border-border rounded-2xl shadow-2xl overflow-hidden select-none transition-[width,height] duration-200 ${
        isDragging ? 'cursor-grabbing shadow-3xl' : 'cursor-grab'
      }`}
      style={{ left: position.x, top: position.y, width, height, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-muted border-b border-border flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium truncate">
            {totalParticipants} in call
          </span>
        </div>
        <div className="flex items-center gap-0.5 no-drag">
          <button onClick={minimize} className="p-1 rounded hover:bg-accent transition-colors" title="Minimize">
            <MinusIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={toggleExpand} className="p-1 rounded hover:bg-accent transition-colors" title={videoState === 'expanded' ? 'Compact' : 'Expand'}>
            {videoState === 'expanded'
              ? <ArrowsPointingInIcon className="w-3.5 h-3.5" />
              : <ArrowsPointingOutIcon className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors" title="Close">
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Video grid ── */}
      <div className="relative bg-zinc-900" style={{ height: `calc(100% - ${(onToggleAudio || onToggleVideo || onLeave) ? '72px' : '32px'})` }}>
        {videoState === 'minimized' ? (
          <MiniGrid
            participants={participants}
            localStream={localStream}
            localVideoRef={localVideoRef}
            isVideoEnabled={isVideoEnabled}
          />
        ) : (
          <FullGrid
            participants={participants}
            localStream={localStream}
            localVideoRef={localVideoRef}
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
          />
        )}
      </div>

      {/* ── Controls bar (only when handlers provided) ── */}
      {(onToggleAudio || onToggleVideo || onLeave) && (
        <div className="no-drag flex items-center justify-center gap-3 px-3 py-2 bg-zinc-900 border-t border-zinc-700 flex-shrink-0">
          {onToggleAudio && (
            <button
              onClick={onToggleAudio}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                isAudioEnabled ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {isAudioEnabled
                ? <MicrophoneIcon className="w-4 h-4" />
                : <SpeakerXMarkIcon className="w-4 h-4" />}
            </button>
          )}
          {onToggleVideo && (
            <button
              onClick={onToggleVideo}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                isVideoEnabled ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              title={isVideoEnabled ? 'Camera off' : 'Camera on'}
            >
              {isVideoEnabled
                ? <VideoCameraIcon className="w-4 h-4" />
                : <VideoCameraSlashIcon className="w-4 h-4" />}
            </button>
          )}
          {onLeave && (
            <button
              onClick={onLeave}
              className="w-9 h-9 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
              title="Leave call"
            >
              <PhoneXMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Sync local video */}
      <LocalVideoSync stream={localStream} videoRef={localVideoRef} isVideoEnabled={isVideoEnabled} />
    </div>
  );
}

// ── Mini 2×2 grid for minimized state ────────────────────────────────────────
function MiniGrid({ participants, localStream, localVideoRef, isVideoEnabled }: {
  participants: Participant[];
  localStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  isVideoEnabled: boolean;
}) {
  const shown = participants.slice(0, 3);
  return (
    <div className="grid grid-cols-2 gap-0.5 p-0.5 h-full">
      <div className="relative bg-zinc-800 rounded overflow-hidden">
        {isVideoEnabled && localStream
          ? <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
          : <Avatar label="You" />}
        <NameTag label="You" />
      </div>
      {shown.map(p => (
        <div key={p.userId} className="relative bg-zinc-800 rounded overflow-hidden">
          <RemoteVideo participant={p} />
          <NameTag label={p.user.name} />
        </div>
      ))}
    </div>
  );
}

// ── Full grid for compact/expanded state ─────────────────────────────────────
function FullGrid({ participants, localStream, localVideoRef, isAudioEnabled, isVideoEnabled }: {
  participants: Participant[];
  localStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}) {
  const total = participants.length + 1;
  const cols = total <= 1 ? 1 : total <= 4 ? 2 : 3;
  return (
    <div className="grid gap-1 p-1 h-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      <div className="relative bg-zinc-800 rounded-lg overflow-hidden">
        {isVideoEnabled && localStream
          ? <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
          : <Avatar label="You" />}
        <NameTag label={`You${!isAudioEnabled ? ' 🔇' : ''}`} />
      </div>
      {participants.map(p => (
        <div key={p.userId} className="relative bg-zinc-800 rounded-lg overflow-hidden">
          <RemoteVideo participant={p} />
          <NameTag label={`${p.user.name}${!p.audioEnabled ? ' 🔇' : ''}`} />
        </div>
      ))}
    </div>
  );
}

function RemoteVideo({ participant }: { participant: Participant }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && participant.stream) ref.current.srcObject = participant.stream;
  }, [participant.stream]);
  return participant.stream && participant.videoEnabled
    ? <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
    : <Avatar label={participant.user.name} />;
}

function Avatar({ label }: { label: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-700">
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
        <span className="text-sm font-bold text-primary-foreground">{label[0]?.toUpperCase()}</span>
      </div>
    </div>
  );
}

function NameTag({ label }: { label: string }) {
  return (
    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white truncate max-w-[90%]">
      {label}
    </div>
  );
}

function LocalVideoSync({ stream, videoRef, isVideoEnabled }: {
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isVideoEnabled: boolean;
}) {
  useEffect(() => {
    if (stream && videoRef.current && isVideoEnabled) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream, videoRef, isVideoEnabled]);
  return null;
}
