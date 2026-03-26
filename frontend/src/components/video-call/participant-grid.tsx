'use client';

import React, { useEffect, useRef } from 'react';
import {
  MicrophoneIcon,
  VideoCameraIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import {
  SpeakerXMarkIcon,
  VideoCameraSlashIcon
} from '@heroicons/react/24/solid';

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

interface ParticipantGridProps {
  participants: Participant[];
  localStream: MediaStream | null;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
}

export function ParticipantGrid({
  participants,
  localStream,
  localVideoRef,
  isAudioEnabled,
  isVideoEnabled
}: ParticipantGridProps) {
  // Remove duplicates based on userId
  const uniqueParticipants = participants.filter((participant, index, self) =>
    index === self.findIndex((p) => p.userId === participant.userId)
  );

  // Check if anyone is screen sharing
  const screenSharingParticipant = uniqueParticipants.find(p => p.isScreenSharing && p.screenStream);

  // If someone is screen sharing, show their screen prominently with sidebar participants
  if (screenSharingParticipant) {
    return (
      <div className="flex h-full gap-2 p-2 md:p-4">
        {/* Screen share — takes ~75% of width */}
        <div className="flex-1 min-w-0 bg-black rounded-lg overflow-hidden border-2 border-green-500">
          <ScreenShareVideo
            participant={screenSharingParticipant}
            stream={screenSharingParticipant.screenStream}
          />
        </div>

        {/* Participant sidebar — fixed width, scrollable */}
        <div className="w-44 md:w-52 flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
          {/* Local user */}
          <div className="w-full aspect-video flex-shrink-0">
            <ParticipantVideo
              isLocal={true}
              participant={{
                userId: 'local',
                user: { id: 'local', name: 'You', email: '' },
                audioEnabled: isAudioEnabled,
                videoEnabled: isVideoEnabled
              }}
              stream={localStream}
              videoRef={localVideoRef}
            />
          </div>

          {/* Remote participants */}
          {uniqueParticipants.slice(0, 10).map((participant) => (
            <div key={`thumb-${participant.userId}`} className="w-full aspect-video flex-shrink-0">
              <ParticipantVideo
                isLocal={false}
                participant={participant}
                stream={participant.stream}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Normal grid layout when no screen sharing
  const totalParticipants = uniqueParticipants.length + 1; // +1 for local user
  const getGridLayout = (count: number) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    if (count <= 9) return 'grid-cols-3 grid-rows-3';
    return 'grid-cols-4 grid-rows-3'; // Max 12 participants visible
  };

  const gridLayout = getGridLayout(totalParticipants);

  return (
    <div className={`grid ${gridLayout} gap-1 md:gap-2 p-2 md:p-4 h-full`}>
      {/* Local user video */}
      <ParticipantVideo
        isLocal={true}
        participant={{
          userId: 'local',
          user: { id: 'local', name: 'You', email: '' },
          audioEnabled: isAudioEnabled,
          videoEnabled: isVideoEnabled
        }}
        stream={localStream}
        videoRef={localVideoRef}
      />

      {/* Remote participants */}
      {uniqueParticipants.slice(0, 11).map((participant) => ( // Limit to 11 remote + 1 local = 12 total
        <ParticipantVideo
          key={participant.userId}
          isLocal={false}
          participant={participant}
          stream={participant.stream}
        />
      ))}

      {/* Show overflow indicator if more than 12 participants */}
      {uniqueParticipants.length > 11 && (
        <div className="bg-gray-800 rounded-lg flex items-center justify-center border-2 border-gray-600">
          <div className="text-center text-gray-300">
            <UserIcon className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-1 md:mb-2" />
            <p className="text-xs md:text-sm">+{uniqueParticipants.length - 11} more</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface ParticipantVideoProps {
  isLocal: boolean;
  participant: Participant;
  stream?: MediaStream | null;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

function ParticipantVideo({ isLocal, participant, stream, videoRef }: ParticipantVideoProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const activeVideoRef = videoRef || internalVideoRef;

  // Set up video stream
  useEffect(() => {
    if (stream && activeVideoRef.current) {
      activeVideoRef.current.srcObject = stream;
      activeVideoRef.current.play().catch(e => {
        console.warn('Auto-play failed, user interaction may be required:', e);
      });
    }
  }, [stream, activeVideoRef]);

  const hasVideo = participant.videoEnabled && stream;
  const hasAudio = participant.audioEnabled;

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden border border-gray-600 md:border-2 aspect-video">
      {/* Video element */}
      {hasVideo ? (
        <video
          ref={activeVideoRef}
          autoPlay
          playsInline
          muted={isLocal} // Mute local video to prevent feedback
          className={`w-full h-full object-cover ${isLocal ? '-scale-x-100' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-700">
          {/* Avatar or placeholder */}
          {participant.user.avatar_url ? (
            <img
              src={participant.user.avatar_url}
              alt={participant.user.name}
              className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-600 flex items-center justify-center">
              <UserIcon className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
            </div>
          )}
        </div>
      )}

      {/* Overlay with participant info and status */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none">
        {/* Top-right status indicators */}
        <div className="absolute top-1 right-1 md:top-2 md:right-2 flex space-x-1">
          {/* Audio status */}
          <div className={`p-0.5 md:p-1 rounded-full ${hasAudio ? 'bg-green-600' : 'bg-red-600'}`}>
            {hasAudio ? (
              <MicrophoneIcon className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
            ) : (
              <SpeakerXMarkIcon className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
            )}
          </div>

          {/* Video status */}
          <div className={`p-0.5 md:p-1 rounded-full ${hasVideo ? 'bg-green-600' : 'bg-red-600'}`}>
            {hasVideo ? (
              <VideoCameraIcon className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
            ) : (
              <VideoCameraSlashIcon className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
            )}
          </div>
        </div>

        {/* Bottom participant name */}
        <div className="absolute bottom-1 left-1 right-1 md:bottom-2 md:left-2 md:right-2">
          <div className="bg-black/70 rounded px-1.5 py-0.5 md:px-2 md:py-1">
            <p className="text-white text-xs md:text-sm font-medium truncate">
              {isLocal ? 'You' : participant.user.name}
            </p>
            {participant.user.email && !isLocal && (
              <p className="hidden md:block text-gray-300 text-xs truncate">
                {participant.user.email}
              </p>
            )}
          </div>
        </div>

        {/* Connection quality indicator (placeholder) */}
        <div className="absolute top-1 left-1 md:top-2 md:left-2">
          <div className="flex space-x-0.5 md:space-x-1">
            <div className="w-0.5 h-2 md:w-1 md:h-3 bg-green-500 rounded-full"></div>
            <div className="w-0.5 h-2 md:w-1 md:h-3 bg-green-500 rounded-full"></div>
            <div className="w-0.5 h-2 md:w-1 md:h-3 bg-green-500 rounded-full"></div>
            <div className="w-0.5 h-2 md:w-1 md:h-3 bg-gray-500 rounded-full"></div>
          </div>
        </div>

        {/* Speaking indicator */}
        {hasAudio && (
          <div className="absolute inset-0 border-2 border-green-400 rounded-lg animate-pulse opacity-0 speaking-animation"></div>
        )}
      </div>

      {/* Screen sharing indicator */}
      {participant.isScreenSharing && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="bg-green-600 text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium">
            Sharing Screen
          </div>
        </div>
      )}
    </div>
  );
}

// Screen share video component
interface ScreenShareVideoProps {
  participant: Participant;
  stream?: MediaStream | null;
}

function ScreenShareVideo({ participant, stream }: ScreenShareVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => {
        console.warn('Auto-play failed for screen share:', e);
      });
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-black">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p className="text-lg">Loading screen share...</p>
          </div>
        </div>
      )}

      {/* Screen share info overlay */}
      <div className="absolute top-4 left-4 bg-black/70 rounded-lg px-4 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <p className="text-white font-medium">{participant.user.name}'s Screen</p>
        </div>
      </div>
    </div>
  );
}

// Grid layout variants for different participant counts
export function ParticipantGridCompact({
  participants,
  localStream,
  localVideoRef,
  isAudioEnabled,
  isVideoEnabled
}: ParticipantGridProps) {
  // Remove duplicates based on userId
  const uniqueParticipants = participants.filter((participant, index, self) =>
    index === self.findIndex((p) => p.userId === participant.userId)
  );

  return (
    <div className="flex gap-2 p-2 h-full overflow-x-auto">
      {/* Local user - smaller in compact mode */}
      <div className="w-24 h-20 flex-shrink-0">
        <ParticipantVideo
          isLocal={true}
          participant={{
            userId: 'local',
            user: { id: 'local', name: 'You', email: '' },
            audioEnabled: isAudioEnabled,
            videoEnabled: isVideoEnabled
          }}
          stream={localStream}
          videoRef={localVideoRef}
        />
      </div>

      {/* Remote participants */}
      {uniqueParticipants.map((participant) => (
        <div key={participant.userId} className="w-24 h-20 flex-shrink-0">
          <ParticipantVideo
            isLocal={false}
            participant={participant}
            stream={participant.stream}
          />
        </div>
      ))}
    </div>
  );
}

// Spotlight mode - one main participant, others in sidebar
interface SpotlightGridProps extends ParticipantGridProps {
  spotlightParticipantId?: string;
  onSpotlightChange: (participantId: string) => void;
}

export function ParticipantGridSpotlight({
  participants,
  localStream,
  localVideoRef,
  isAudioEnabled,
  isVideoEnabled,
  spotlightParticipantId,
  onSpotlightChange
}: SpotlightGridProps) {
  const spotlightParticipant = participants.find(p => p.userId === spotlightParticipantId) || participants[0];
  const sidebarParticipants = participants.filter(p => p.userId !== spotlightParticipant?.userId);

  return (
    <div className="flex h-full">
      {/* Main spotlight area */}
      <div className="flex-1 p-4">
        {spotlightParticipant ? (
          <ParticipantVideo
            isLocal={false}
            participant={spotlightParticipant}
            stream={spotlightParticipant.stream}
          />
        ) : (
          <ParticipantVideo
            isLocal={true}
            participant={{
              userId: 'local',
              user: { id: 'local', name: 'You', email: '' },
              audioEnabled: isAudioEnabled,
              videoEnabled: isVideoEnabled
            }}
            stream={localStream}
            videoRef={localVideoRef}
          />
        )}
      </div>

      {/* Sidebar with other participants */}
      <div className="w-48 bg-gray-800 p-2 space-y-2 overflow-auto">
        {/* Local user in sidebar if not spotlighted */}
        {spotlightParticipant && (
          <div
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onSpotlightChange('local')}
          >
            <ParticipantVideo
              isLocal={true}
              participant={{
                userId: 'local',
                user: { id: 'local', name: 'You', email: '' },
                audioEnabled: isAudioEnabled,
                videoEnabled: isVideoEnabled
              }}
              stream={localStream}
              videoRef={localVideoRef}
            />
          </div>
        )}

        {/* Other participants */}
        {sidebarParticipants.map((participant) => (
          <div
            key={participant.userId}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onSpotlightChange(participant.userId)}
          >
            <ParticipantVideo
              isLocal={false}
              participant={participant}
              stream={participant.stream}
            />
          </div>
        ))}
      </div>
    </div>
  );
}