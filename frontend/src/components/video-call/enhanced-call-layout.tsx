'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeftIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  VideoCameraIcon,
  EyeSlashIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { VideoCall } from './video-call';
import { LiveKitCall } from './livekit-call';
import { GroupChat } from '@/components/study-groups/group-chat';
import { NoteEditor } from '@/components/notes/note-editor';
import WhiteboardCanvas from '@/components/whiteboard/whiteboard-canvas';
import { socketService } from '@/services/socket-service';

interface EnhancedCallLayoutProps {
  callId: string;
  groupId: string;
  groupName: string;
  onLeave: () => void;
}

type ViewType = 'video' | 'notes' | 'whiteboard' | 'chat';

export function EnhancedCallLayout({
  callId,
  groupId,
  groupName,
  onLeave
}: EnhancedCallLayoutProps) {
  const [activeView, setActiveView] = useState<ViewType>('video');
  const [callDuration, setCallDuration] = useState(0);
  const [activeNote, setActiveNote] = useState<any>(null); // track note created in-call

  // Activity indicators
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [whiteboardActivity, setWhiteboardActivity] = useState(false);

  // Listen for activity updates
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Chat activity
    const handleNewMessage = () => {
      if (activeView !== 'chat') {
        setUnreadChatCount(prev => prev + 1);
      }
    };

    // Whiteboard activity
    const handleWhiteboardUpdate = () => {
      if (activeView !== 'whiteboard') {
        setWhiteboardActivity(true);
        setTimeout(() => setWhiteboardActivity(false), 3000);
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('whiteboard_update', handleWhiteboardUpdate);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('whiteboard_update', handleWhiteboardUpdate);
    };
  }, [activeView]);

  // Update call duration
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle view change
  const handleViewChange = (view: ViewType) => {
    setActiveView(view);

    // Clear activity indicators
    if (view === 'chat') {
      setUnreadChatCount(0);
    }
    if (view === 'whiteboard') {
      setWhiteboardActivity(false);
    }
  };

  // Use LiveKit SFU in production, WebRTC mesh on localhost
  const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-card border-b border-border">
        <div className="flex items-center space-x-4">
          <button
            onClick={onLeave}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary rounded-lg">
              <VideoCameraIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{groupName}</h1>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <ClockIcon className="w-4 h-4" />
                <span>{formatDuration(callDuration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center space-x-1 px-6 py-2 bg-muted border-b border-border overflow-x-auto">
        <ViewTab
          icon={<VideoCameraIcon className="w-5 h-5" />}
          label="Video"
          active={activeView === 'video'}
          onClick={() => handleViewChange('video')}
        />
        <ViewTab
          icon={<DocumentTextIcon className="w-5 h-5" />}
          label="Notes"
          active={activeView === 'notes'}
          onClick={() => handleViewChange('notes')}
        />
        <ViewTab
          icon={<PencilSquareIcon className="w-5 h-5" />}
          label="Whiteboard"
          active={activeView === 'whiteboard'}
          onClick={() => handleViewChange('whiteboard')}
          badge={whiteboardActivity ? '•' : undefined}
          badgeColor="bg-blue-500"
        />

        <ViewTab
          icon={<ChatBubbleLeftIcon className="w-5 h-5" />}
          label="Chat"
          active={activeView === 'chat'}
          onClick={() => handleViewChange('chat')}
          badge={unreadChatCount > 0 ? (unreadChatCount > 9 ? '9+' : unreadChatCount.toString()) : undefined}
          badgeColor="bg-red-500"
        />

      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Video Call - LiveKit in production, WebRTC mesh on localhost */}
        <div className={activeView === 'video' ? 'h-full' : ''}>
          {isProduction ? (
            <LiveKitCall
              callId={callId}
              groupId={groupId}
              groupName={groupName}
              onLeave={onLeave}
            />
          ) : (
            <VideoCall
              callId={callId}
              groupId={groupId}
              onLeave={onLeave}
              isFloating={activeView !== 'video'}
            />
          )}
        </div>

        <div className={activeView === 'notes' ? "h-full p-6 overflow-auto" : "hidden"}>
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-1">Collaborative Notes</h2>
            <p className="text-muted-foreground text-sm">
              Take notes during your call. Notes are saved to your account.
            </p>
          </div>
          <NoteEditor
            note={activeNote || undefined}
            onSave={(savedNote) => {
              // Switch to editing the saved note — prevents router.push navigating away
              setActiveNote(savedNote);
            }}
          />
        </div>

        <div className={activeView === 'whiteboard' ? "h-full bg-background" : "hidden"}>
          <WhiteboardCanvas
            whiteboardId={`group-${groupId}-shared`}
            groupId={groupId}
            canEdit={true}
            className="h-full flex flex-col"
          />
        </div>

        <div className={activeView === 'chat' ? "h-full" : "hidden"}>
          <GroupChat groupId={groupId} />
        </div>


      </div>
    </div>
  );
}

// View Tab Component
function ViewTab({
  icon,
  label,
  active,
  onClick,
  badge,
  badgeColor = 'bg-red-500'
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${active
        ? 'bg-primary text-primary-foreground'
        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
        }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {badge && (
        <span className={`absolute -top-1 -right-1 ${badgeColor} text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5`}>
          {badge}
        </span>
      )}
    </button>
  );
}


