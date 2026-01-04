'use client';

import React from 'react';
import { 
  MicrophoneIcon, 
  VideoCameraIcon, 
  ComputerDesktopIcon,
  PhoneXMarkIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';
import {
  MicrophoneIcon as MicrophoneIconSolid,
  VideoCameraIcon as VideoCameraIconSolid,
  ComputerDesktopIcon as ComputerDesktopIconSolid,
  SpeakerXMarkIcon
} from '@heroicons/react/24/solid';

interface CallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  onLeaveCall: () => void;
}

export function CallControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onStartScreenShare,
  onStopScreenShare,
  onLeaveCall
}: CallControlsProps) {
  return (
    <div className="flex items-center justify-center space-x-4">
      {/* Audio Control */}
      <button
        onClick={onToggleAudio}
        className={`p-3 rounded-full transition-all duration-200 ${
          isAudioEnabled
            ? 'bg-gray-700 hover:bg-gray-600 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white'
        }`}
        title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {isAudioEnabled ? (
          <MicrophoneIcon className="w-6 h-6" />
        ) : (
          <SpeakerXMarkIcon className="w-6 h-6" />
        )}
      </button>

      {/* Video Control */}
      <button
        onClick={onToggleVideo}
        className={`p-3 rounded-full transition-all duration-200 ${
          isVideoEnabled
            ? 'bg-gray-700 hover:bg-gray-600 text-white'
            : 'bg-red-600 hover:bg-red-700 text-white'
        }`}
        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {isVideoEnabled ? (
          <VideoCameraIcon className="w-6 h-6" />
        ) : (
          <VideoCameraIconSolid className="w-6 h-6" />
        )}
      </button>

      {/* Screen Share Control */}
      <button
        onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
        className={`p-3 rounded-full transition-all duration-200 ${
          isScreenSharing
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
        title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
      >
        {isScreenSharing ? (
          <ComputerDesktopIconSolid className="w-6 h-6" />
        ) : (
          <ComputerDesktopIcon className="w-6 h-6" />
        )}
      </button>

      {/* Speaker Control (placeholder for future implementation) */}
      <button
        className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-all duration-200"
        title="Speaker settings"
        disabled
      >
        <SpeakerWaveIcon className="w-6 h-6" />
      </button>

      {/* Leave Call */}
      <button
        onClick={onLeaveCall}
        className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200 ml-8"
        title="Leave call"
      >
        <PhoneXMarkIcon className="w-6 h-6" />
      </button>
    </div>
  );
}

// Additional control components for advanced features

interface AudioControlsProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

export function AudioControls({ volume, isMuted, onVolumeChange, onToggleMute }: AudioControlsProps) {
  return (
    <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-2">
      <button
        onClick={onToggleMute}
        className="p-1 rounded hover:bg-gray-700 transition-colors"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? (
          <SpeakerXMarkIcon className="w-4 h-4 text-red-400" />
        ) : (
          <SpeakerWaveIcon className="w-4 h-4 text-white" />
        )}
      </button>
      <input
        type="range"
        min="0"
        max="100"
        value={volume}
        onChange={(e) => onVolumeChange(parseInt(e.target.value))}
        className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        title="Volume"
      />
      <span className="text-xs text-gray-400 w-8">{volume}%</span>
    </div>
  );
}

interface VideoControlsProps {
  brightness: number;
  contrast: number;
  onBrightnessChange: (brightness: number) => void;
  onContrastChange: (contrast: number) => void;
}

export function VideoControls({ 
  brightness, 
  contrast, 
  onBrightnessChange, 
  onContrastChange 
}: VideoControlsProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
      <div className="flex items-center space-x-2">
        <label className="text-xs text-gray-400 w-16">Brightness</label>
        <input
          type="range"
          min="0"
          max="200"
          value={brightness}
          onChange={(e) => onBrightnessChange(parseInt(e.target.value))}
          className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-xs text-gray-400 w-8">{brightness}%</span>
      </div>
      <div className="flex items-center space-x-2">
        <label className="text-xs text-gray-400 w-16">Contrast</label>
        <input
          type="range"
          min="0"
          max="200"
          value={contrast}
          onChange={(e) => onContrastChange(parseInt(e.target.value))}
          className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-xs text-gray-400 w-8">{contrast}%</span>
      </div>
    </div>
  );
}

interface ScreenShareControlsProps {
  isSharing: boolean;
  shareType: 'screen' | 'window' | 'tab';
  onShareTypeChange: (type: 'screen' | 'window' | 'tab') => void;
  onStartShare: () => void;
  onStopShare: () => void;
}

export function ScreenShareControls({
  isSharing,
  shareType,
  onShareTypeChange,
  onStartShare,
  onStopShare
}: ScreenShareControlsProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">Screen Share</h3>
        <button
          onClick={isSharing ? onStopShare : onStartShare}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            isSharing
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isSharing ? 'Stop' : 'Start'}
        </button>
      </div>
      
      {!isSharing && (
        <div className="space-y-2">
          <label className="text-xs text-gray-400">Share type:</label>
          <div className="flex space-x-2">
            {(['screen', 'window', 'tab'] as const).map((type) => (
              <button
                key={type}
                onClick={() => onShareTypeChange(type)}
                className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                  shareType === type
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}