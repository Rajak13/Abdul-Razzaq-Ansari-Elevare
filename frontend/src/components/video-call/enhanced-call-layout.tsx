'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeftIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  VideoCameraIcon,
  ClockIcon,
  PhoneXMarkIcon,
  XMarkIcon
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
  const [activeNote, setActiveNote] = useState<any>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  // Activity indicators
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [whiteboardActivity, setWhiteboardActivity] = useState(false);

  // Emit leave_call and clean up, then call onLeave
  const leaveCall = useCallback(() => {
    const socket = socketService.getSocket();
    if (socket && socketService.isConnected()) {
      socket.emit('leave_call', callId);
    }
    onLeave();
  }, [callId, onLeave]);

  // Intercept browser back button / popstate
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Push a dummy state so we can intercept the back press
      window.history.pushState(null, '', window.location.href);
      setShowLeaveDialog(true);
    };

    // Push an extra history entry so the back button triggers popstate
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Intercept page unload (tab close, refresh, external navigation)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      // Best-effort: emit leave on unload
      const socket = socketService.getSocket();
      if (socket && socketService.isConnected()) {
        socket.emit('leave_call', callId);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [callId]);

  // Listen for activity updates
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = () => {
      if (activeView !== 'chat') setUnreadChatCount(prev => prev + 1);
    };
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

  // Call duration timer
  useEffect(() => {
    const interval = setInterval(() => setCallDuration(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleViewChange = (view: ViewType) => {
    setActiveView(view);
    if (view === 'chat') setUnreadChatCount(0);
    if (view === 'whiteboard') setWhiteboardActivity(false);
  };

  const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 bg-card border-b border-border">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => setShowLeaveDialog(true)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title="Leave call"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-primary rounded-lg">
              <VideoCameraIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm sm:text-lg font-semibold truncate max-w-[140px] sm:max-w-none">{groupName}</h1>
              <div className="flex items-center space-x-1 sm:space-x-2 text-xs text-muted-foreground">
                <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{formatDuration(callDuration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* End call button — always visible */}
        <button
          onClick={() => setShowLeaveDialog(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <PhoneXMarkIcon className="w-4 h-4" />
          <span className="hidden sm:inline">End Call</span>
        </button>
      </div>

      {/* View Tabs */}
      <div className="flex items-center space-x-1 px-3 sm:px-6 py-1.5 sm:py-2 bg-muted border-b border-border overflow-x-auto scrollbar-hide">
        <ViewTab icon={<VideoCameraIcon className="w-4 h-4 sm:w-5 sm:h-5" />} label="Video" active={activeView === 'video'} onClick={() => handleViewChange('video')} />
        <ViewTab icon={<DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5" />} label="Notes" active={activeView === 'notes'} onClick={() => handleViewChange('notes')} />
        <ViewTab icon={<PencilSquareIcon className="w-4 h-4 sm:w-5 sm:h-5" />} label="Whiteboard" active={activeView === 'whiteboard'} onClick={() => handleViewChange('whiteboard')} badge={whiteboardActivity ? '•' : undefined} badgeColor="bg-blue-500" />
        <ViewTab icon={<ChatBubbleLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />} label="Chat" active={activeView === 'chat'} onClick={() => handleViewChange('chat')} badge={unreadChatCount > 0 ? (unreadChatCount > 9 ? '9+' : String(unreadChatCount)) : undefined} badgeColor="bg-red-500" />
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        <div className={activeView === 'video' ? 'h-full' : ''}>
          {isProduction ? (
            <LiveKitCall callId={callId} groupId={groupId} groupName={groupName} onLeave={leaveCall} isFloating={activeView !== 'video'} />
          ) : (
            <VideoCall callId={callId} groupId={groupId} onLeave={leaveCall} isFloating={activeView !== 'video'} />
          )}
        </div>

        <div className={activeView === 'notes' ? 'h-full p-3 sm:p-6 overflow-auto' : 'hidden'}>
          <div className="mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-2xl font-bold mb-1">Collaborative Notes</h2>
            <p className="text-muted-foreground text-xs sm:text-sm">Take notes during your call. Notes are saved to your account.</p>
          </div>
          <NoteEditor note={activeNote || undefined} template={activeNote ? undefined : 'meeting'} onSave={setActiveNote} />
        </div>

        <div className={activeView === 'whiteboard' ? 'h-full bg-background' : 'hidden'}>
          <WhiteboardCanvas whiteboardId={`group-${groupId}-shared`} groupId={groupId} canEdit={true} className="h-full flex flex-col" />
        </div>

        <div className={activeView === 'chat' ? 'h-full' : 'hidden'}>
          <GroupChat groupId={groupId} />
        </div>
      </div>

      {/* Leave Call Confirmation Dialog */}
      {showLeaveDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center flex-shrink-0">
                <PhoneXMarkIcon className="w-6 h-6 text-red-600" />
              </div>
              <button onClick={() => setShowLeaveDialog(false)} className="p-1 rounded-lg hover:bg-accent transition-colors">
                <XMarkIcon className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <h2 className="text-lg font-bold text-foreground mb-1">Leave this call?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You will be disconnected from the call. Other participants will remain in the call.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background hover:bg-accent text-foreground font-medium text-sm transition-colors"
              >
                Stay in Call
              </button>
              <button
                onClick={() => { setShowLeaveDialog(false); leaveCall(); }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors"
              >
                Leave Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ViewTab({ icon, label, active, onClick, badge, badgeColor = 'bg-red-500' }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: string; badgeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center space-x-1 sm:space-x-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors flex-shrink-0 ${
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      <span className="font-medium text-xs sm:text-sm">{label}</span>
      {badge && (
        <span className={`absolute -top-1 -right-1 ${badgeColor} text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-5 flex items-center justify-center px-1`}>
          {badge}
        </span>
      )}
    </button>
  );
}



