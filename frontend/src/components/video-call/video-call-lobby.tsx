'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  VideoCameraIcon,
  MicrophoneIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import {
  VideoCameraSlashIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/solid';

interface VideoCallLobbyProps {
  groupName: string;
  memberCount: number;
  onJoinCall: (settings: CallSettings) => void;
  onCancel: () => void;
}

interface CallSettings {
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioDevice?: string;
  videoDevice?: string;
}

export function VideoCallLobby({ 
  groupName, 
  memberCount, 
  onJoinCall, 
  onCancel 
}: VideoCallLobbyProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize media devices and preview
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        // Get available devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const videoInputs = devices.filter(device => device.kind === 'videoinput');
        
        setAudioDevices(audioInputs);
        setVideoDevices(videoInputs);
        
        // Set default devices
        if (audioInputs.length > 0) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
        if (videoInputs.length > 0) {
          setSelectedVideoDevice(videoInputs[0].deviceId);
        }

        // Get user media for preview
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoInputs.length > 0 ? { deviceId: videoInputs[0].deviceId } : false,
          audio: audioInputs.length > 0 ? { deviceId: audioInputs[0].deviceId } : false
        });

        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        setError(null);
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Unable to access camera and microphone. Please check permissions.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update stream when devices change
  useEffect(() => {
    const updateStream = async () => {
      if (!localStream) return;

      try {
        // Stop current stream
        localStream.getTracks().forEach(track => track.stop());

        // Get new stream with selected devices
        const constraints: MediaStreamConstraints = {
          video: videoEnabled && selectedVideoDevice ? 
            { deviceId: { exact: selectedVideoDevice } } : false,
          audio: audioEnabled && selectedAudioDevice ? 
            { deviceId: { exact: selectedAudioDevice } } : false
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(newStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (err) {
        console.error('Error updating stream:', err);
      }
    };

    if (selectedAudioDevice || selectedVideoDevice) {
      updateStream();
    }
  }, [selectedAudioDevice, selectedVideoDevice, audioEnabled, videoEnabled]);

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
      }
    }
  };

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled);
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
      }
    }
  };

  const handleJoinCall = () => {
    const settings: CallSettings = {
      audioEnabled,
      videoEnabled,
      audioDevice: selectedAudioDevice,
      videoDevice: selectedVideoDevice
    };
    
    onJoinCall(settings);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Setting up your camera and microphone...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden border border-border">
          {/* Header */}
          <div className="bg-muted px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-foreground mb-1">Ready to join?</h1>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <UserGroupIcon className="w-4 h-4" />
                    <span>{groupName}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Settings"
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex">
            {/* Video preview */}
            <div className="flex-1 p-6">
              <div className="relative bg-muted rounded-xl overflow-hidden aspect-video">
                {videoEnabled && localStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                        <VideoCameraSlashIcon className="w-10 h-10" />
                      </div>
                      <p>Camera is off</p>
                    </div>
                  </div>
                )}

                {/* Controls overlay */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={toggleAudio}
                      className={`p-3 rounded-full transition-all ${
                        audioEnabled
                          ? 'bg-accent hover:bg-accent/80 text-foreground'
                          : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                      }`}
                      title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                    >
                      {audioEnabled ? (
                        <MicrophoneIcon className="w-5 h-5" />
                      ) : (
                        <SpeakerXMarkIcon className="w-5 h-5" />
                      )}
                    </button>

                    <button
                      onClick={toggleVideo}
                      className={`p-3 rounded-full transition-all ${
                        videoEnabled
                          ? 'bg-accent hover:bg-accent/80 text-foreground'
                          : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                      }`}
                      title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
                    >
                      {videoEnabled ? (
                        <VideoCameraIcon className="w-5 h-5" />
                      ) : (
                        <VideoCameraSlashIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Settings panel */}
            {showSettings && (
              <div className="w-80 bg-muted p-6 border-l border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Camera
                    </label>
                    <select
                      value={selectedVideoDevice}
                      onChange={(e) => setSelectedVideoDevice(e.target.value)}
                      className="w-full px-3 py-2 bg-background text-foreground rounded-lg border border-input focus:border-primary focus:outline-none"
                    >
                      {videoDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Microphone
                    </label>
                    <select
                      value={selectedAudioDevice}
                      onChange={(e) => setSelectedAudioDevice(e.target.value)}
                      className="w-full px-3 py-2 bg-background text-foreground rounded-lg border border-input focus:border-primary focus:outline-none"
                    >
                      {audioDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-muted px-6 py-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Make sure your camera and microphone are working properly
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinCall}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
                >
                  Join Call
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}