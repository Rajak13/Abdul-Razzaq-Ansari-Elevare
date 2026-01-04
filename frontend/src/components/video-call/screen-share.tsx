'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  ComputerDesktopIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  XMarkIcon,
  UserIcon
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
  screenStream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing?: boolean;
}

interface ScreenShareProps {
  screenStream: MediaStream | null;
  participants: Participant[];
  isSharing: boolean;
}

export function ScreenShare({ screenStream, participants, isSharing }: ScreenShareProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);

  // Find who is sharing screen
  const sharingParticipant = participants.find(p => p.isScreenSharing);
  const isLocalSharing = isSharing;
  
  // Prioritize remote screen streams, then local screen stream
  let activeStream: MediaStream | null = null;
  if (sharingParticipant?.screenStream) {
    activeStream = sharingParticipant.screenStream;
  } else if (isLocalSharing && screenStream) {
    activeStream = screenStream;
  }
  
  const sharerName = isLocalSharing ? 'You' : sharingParticipant?.user.name || 'Unknown';

  // Debug logging (reduced frequency)
  useEffect(() => {
    console.log('🔍 ScreenShare component state:', {
      isLocalSharing,
      sharingParticipant: sharingParticipant?.user.name,
      activeStream: !!activeStream,
      screenStream: !!screenStream,
      participantScreenStream: !!sharingParticipant?.screenStream,
      participantsSharing: participants.filter(p => p.isScreenSharing).map(p => ({ 
        name: p.user.name, 
        hasScreenStream: !!p.screenStream 
      }))
    });
  }, [isLocalSharing, sharingParticipant?.user.name, !!activeStream, !!sharingParticipant?.screenStream]);

  // Set up video stream
  useEffect(() => {
    if (activeStream && videoRef.current) {
      videoRef.current.srcObject = activeStream;
    }
  }, [activeStream]);

  // Auto-hide controls after inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      const timeout = setTimeout(() => {
        if (isFullscreen) {
          setShowControls(false);
        }
      }, 3000);
      setControlsTimeout(timeout);
    };

    if (isFullscreen) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        if (controlsTimeout) {
          clearTimeout(controlsTimeout);
        }
      };
    }
  }, [isFullscreen, controlsTimeout]);

  // Handle fullscreen toggle
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await videoRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setShowControls(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!activeStream) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-800 text-gray-400">
        <div className="text-center">
          <ComputerDesktopIcon className="w-16 h-16 mx-auto mb-4" />
          <p className="text-lg">No screen is being shared</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full w-full'}`}>
      {/* Screen share video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain bg-black"
      />

      {/* Controls overlay */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${
        showControls || !isFullscreen ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Top bar with sharer info */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <ComputerDesktopIcon className="w-5 h-5 text-white" />
                <span className="text-white font-medium">
                  {sharerName} is sharing their screen
                </span>
              </div>
              {/* Live indicator */}
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 text-sm font-medium">LIVE</span>
              </div>
            </div>

            {/* Top controls */}
            <div className="flex items-center space-x-2">
              {/* Fullscreen toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <ArrowsPointingInIcon className="w-5 h-5" />
                ) : (
                  <ArrowsPointingOutIcon className="w-5 h-5" />
                )}
              </button>

              {/* Close fullscreen */}
              {isFullscreen && (
                <button
                  onClick={() => document.exitFullscreen()}
                  className="p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
                  title="Exit fullscreen"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between">
            {/* Screen share quality info */}
            <div className="text-white text-sm">
              <div className="flex items-center space-x-4">
                <span>Quality: HD</span>
                <span>•</span>
                <span>Connection: Good</span>
              </div>
            </div>

            {/* Additional controls */}
            <div className="flex items-center space-x-2">
              {/* Zoom controls (placeholder) */}
              <div className="flex items-center space-x-1 bg-black/50 rounded-lg px-3 py-1">
                <button className="text-white hover:text-gray-300 text-sm">-</button>
                <span className="text-white text-sm px-2">100%</span>
                <button className="text-white hover:text-gray-300 text-sm">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection status indicator */}
      <div className="absolute top-4 right-4">
        <div className="bg-black/70 rounded-lg px-3 py-1">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-white text-sm">Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Screen share thumbnail for when screen sharing is active but not in focus
interface ScreenShareThumbnailProps {
  screenStream: MediaStream | null;
  sharerName: string;
  onClick: () => void;
}

export function ScreenShareThumbnail({ screenStream, sharerName, onClick }: ScreenShareThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (screenStream && videoRef.current) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  return (
    <div 
      className="relative bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
      onClick={onClick}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent">
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex items-center space-x-2">
            <ComputerDesktopIcon className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium truncate">
              {sharerName}'s screen
            </span>
          </div>
        </div>
        
        {/* Click to expand indicator */}
        <div className="absolute top-2 right-2">
          <ArrowsPointingOutIcon className="w-4 h-4 text-white" />
        </div>
      </div>
    </div>
  );
}

// Screen share selector for choosing what to share
interface ScreenShareSelectorProps {
  onSelectScreen: () => void;
  onSelectWindow: () => void;
  onSelectTab: () => void;
  onCancel: () => void;
}

export function ScreenShareSelector({ 
  onSelectScreen, 
  onSelectWindow, 
  onSelectTab, 
  onCancel 
}: ScreenShareSelectorProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Share your screen</h2>
        <p className="text-gray-600 mb-6">Choose what you'd like to share</p>
        
        <div className="space-y-3">
          <button
            onClick={onSelectScreen}
            className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ComputerDesktopIcon className="w-6 h-6 text-gray-600" />
            <div className="text-left">
              <div className="font-medium">Entire screen</div>
              <div className="text-sm text-gray-500">Share everything on your screen</div>
            </div>
          </button>
          
          <button
            onClick={onSelectWindow}
            className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-6 h-6 border-2 border-gray-600 rounded"></div>
            <div className="text-left">
              <div className="font-medium">Application window</div>
              <div className="text-sm text-gray-500">Share a specific application</div>
            </div>
          </button>
          
          <button
            onClick={onSelectTab}
            className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-6 h-6 border-2 border-gray-600 rounded-t"></div>
            <div className="text-left">
              <div className="font-medium">Browser tab</div>
              <div className="text-sm text-gray-500">Share a specific browser tab</div>
            </div>
          </button>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}