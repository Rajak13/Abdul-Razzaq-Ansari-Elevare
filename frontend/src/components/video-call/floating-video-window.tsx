'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
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

// Safe margins that account for mobile nav bar (64px) + browser chrome + top bar (48px)
const SAFE_TOP = 56;       // below the call tab bar
const SAFE_BOTTOM = 140;   // above mobile nav + browser chrome
const SAFE_SIDE = 10;

function clampPosition(x: number, y: number, w: number, h: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: Math.max(SAFE_SIDE, Math.min(x, vw - w - SAFE_SIDE)),
    y: Math.max(SAFE_TOP, Math.min(y, vh - h - SAFE_BOTTOM)),
  };
}

// After drag release, snap to nearest left or right edge
function snapToEdge(x: number, y: number, w: number, h: number) {
  const vw = window.innerWidth;
  const snapX = x + w / 2 < vw / 2 ? SAFE_SIDE : vw - w - SAFE_SIDE;
  return clampPosition(snapX, y, w, h);
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
  const [position, setPosition] = useState({ x: -1, y: -1 }); // -1 = not yet placed
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const getDimensions = useCallback((): { width: number; height: number } => {
    const vw = window.innerWidth;
    const isMobile = vw < 640;
    switch (videoState) {
      case 'minimized': return { width: isMobile ? 140 : 180, height: isMobile ? 105 : 135 };
      case 'compact':   return { width: isMobile ? Math.min(200, vw - 20) : 300, height: isMobile ? 160 : 225 };
      case 'expanded':  return { width: isMobile ? Math.min(280, vw - 20) : 420, height: isMobile ? 220 : 315 };
    }
  }, [videoState]);

  // Place in top-right on first render (avoids bottom nav clash)
  useEffect(() => {
    const { width, height } = getDimensions();
    const vw = window.innerWidth;
    // Default: top-right corner, safely below the tab bar
    const defaultPos = { x: vw - width - SAFE_SIDE, y: SAFE_TOP + 4 };

    const saved = localStorage.getItem('floating-video-position-v2');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setPosition(clampPosition(p.x, p.y, width, height));
        return;
      } catch { /* fall through */ }
    }
    setPosition(defaultPos);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-clamp when size changes
  useEffect(() => {
    if (position.x < 0) return; // not placed yet
    const { width, height } = getDimensions();
    setPosition(p => clampPosition(p.x, p.y, width, height));
  }, [videoState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist position
  useEffect(() => {
    if (position.x >= 0) {
      localStorage.setItem('floating-video-position-v2', JSON.stringify(position));
    }
  }, [position]);

  // ── Pointer drag (works for mouse + touch) ────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragOffsetRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    setIsDragging(true);
  }, [position]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const { width, height } = getDimensions();
    const newX = e.clientX - dragOffsetRef.current.x;
    const newY = e.clientY - dragOffsetRef.current.y;
    setPosition(clampPosition(newX, newY, width, height));
  }, [isDragging, getDimensions]);

  const onPointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const { width, height } = getDimensions();
    setPosition(p => snapToEdge(p.x, p.y, width, height));
  }, [isDragging, getDimensions]);

  const { width, height } = getDimensions();
  const hasControls = !!(onToggleAudio || onToggleVideo || onLeave);
  const controlBarH = hasControls ? 48 : 0;
  const headerH = 32;
  const videoH = height - headerH - controlBarH;

  // Don't render until positioned
  if (position.x < 0) return null;

  return (
    <div
      ref={windowRef}
      className={`fixed z-50 rounded-2xl shadow-2xl overflow-hidden border-2 border-white/20 bg-zinc-900 transition-[width,height] duration-150 ${
        isDragging ? 'cursor-grabbing scale-[1.02]' : 'cursor-grab'
      }`}
      style={{ left: position.x, top: position.y, width, height, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-2 bg-zinc-800/90 border-b border-white/10 flex-shrink-0" style={{ height: headerH }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
          <span className="text-[10px] font-medium text-white/80 truncate">
            {participants.length + 1} in call
          </span>
        </div>
        <div className="flex items-center gap-0.5 no-drag flex-shrink-0">
          <button
            onClick={() => setVideoState('minimized')}
            className="p-1 rounded hover:bg-white/10 transition-colors text-white/70"
            title="Minimize"
          >
            <MinusIcon className="w-3 h-3" />
          </button>
          <button
            onClick={() => setVideoState(s => s === 'expanded' ? 'compact' : 'expanded')}
            className="p-1 rounded hover:bg-white/10 transition-colors text-white/70"
            title={videoState === 'expanded' ? 'Compact' : 'Expand'}
          >
            {videoState === 'expanded'
              ? <ArrowsPointingInIcon className="w-3 h-3" />
              : <ArrowsPointingOutIcon className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* ── Video area ── */}
      <div className="bg-zinc-900 overflow-hidden" style={{ height: videoH }}>
        {videoState === 'minimized'
          ? <MiniGrid participants={participants} localStream={localStream} localVideoRef={localVideoRef} isVideoEnabled={isVideoEnabled} />
          : <FullGrid participants={participants} localStream={localStream} localVideoRef={localVideoRef} isAudioEnabled={isAudioEnabled} isVideoEnabled={isVideoEnabled} />
        }
      </div>

      {/* ── Controls ── */}
      {hasControls && (
        <div
          className="no-drag flex items-center justify-center gap-2 bg-zinc-800/95 border-t border-white/10 flex-shrink-0"
          style={{ height: controlBarH }}
        >
          {onToggleAudio && (
            <button
              onClick={onToggleAudio}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isAudioEnabled ? 'bg-zinc-600 hover:bg-zinc-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              {isAudioEnabled ? <MicrophoneIcon className="w-3.5 h-3.5" /> : <SpeakerXMarkIcon className="w-3.5 h-3.5" />}
            </button>
          )}
          {onToggleVideo && (
            <button
              onClick={onToggleVideo}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isVideoEnabled ? 'bg-zinc-600 hover:bg-zinc-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
              title={isVideoEnabled ? 'Camera off' : 'Camera on'}
            >
              {isVideoEnabled ? <VideoCameraIcon className="w-3.5 h-3.5" /> : <VideoCameraSlashIcon className="w-3.5 h-3.5" />}
            </button>
          )}
          {onLeave && (
            <button
              onClick={onLeave}
              className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
              title="Leave call"
            >
              <PhoneXMarkIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <LocalVideoSync stream={localStream} videoRef={localVideoRef} isVideoEnabled={isVideoEnabled} />
    </div>
  );
}

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

function FullGrid({ participants, localStream, localVideoRef, isAudioEnabled, isVideoEnabled }: {
  participants: Participant[];
  localStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}) {
  const total = participants.length + 1;
  const cols = total <= 1 ? 1 : 2;
  return (
    <div className="grid gap-0.5 p-0.5 h-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
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
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
        <span className="text-xs font-bold text-primary-foreground">{label[0]?.toUpperCase()}</span>
      </div>
    </div>
  );
}

function NameTag({ label }: { label: string }) {
  return (
    <div className="absolute bottom-1 left-1 px-1 py-0.5 bg-black/70 rounded text-[9px] text-white truncate max-w-[85%]">
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
