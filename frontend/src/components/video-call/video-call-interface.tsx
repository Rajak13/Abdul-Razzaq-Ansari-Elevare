'use client';

import React, { useState, useEffect } from 'react';
import { VideoCall } from './video-call';
import { WhiteboardCanvas } from '@/components/whiteboard/whiteboard-canvas';
import { 
  ArrowLeft,
  Users,
  Clock,
  Video,
  MessageCircle,
  FileText,
  PenTool,
  Settings
} from 'lucide-react';

interface VideoCallInterfaceProps {
  callId: string;
  groupId: string;
  groupName: string;
  onLeave: () => void;
}

export function VideoCallInterface({ 
  callId, 
  groupId, 
  groupName, 
  onLeave 
}: VideoCallInterfaceProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'chat' | 'notes' | 'whiteboard' | 'settings'>('chat');
  const [isRecording, setIsRecording] = useState(false);

  // Update call duration every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleSidebar = (tab: typeof sidebarTab) => {
    if (showSidebar && sidebarTab === tab) {
      setShowSidebar(false);
    } else {
      setSidebarTab(tab);
      setShowSidebar(true);
    }
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Main video call area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onLeave}
                className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Leave call"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary rounded-lg">
                  <Video className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">{groupName}</h1>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(callDuration)}</span>
                    </div>
                    {isRecording && (
                      <div className="flex items-center space-x-1 text-destructive">
                        <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
                        <span>Recording</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleSidebar('chat')}
                className={`p-2 rounded-lg transition-colors ${
                  showSidebar && sidebarTab === 'chat'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
                title="Chat"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => toggleSidebar('notes')}
                className={`p-2 rounded-lg transition-colors ${
                  showSidebar && sidebarTab === 'notes'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
                title="Notes"
              >
                <FileText className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => toggleSidebar('whiteboard')}
                className={`p-2 rounded-lg transition-colors ${
                  showSidebar && sidebarTab === 'whiteboard'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
                title="Whiteboard"
              >
                <PenTool className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => toggleSidebar('settings')}
                className={`p-2 rounded-lg transition-colors ${
                  showSidebar && sidebarTab === 'settings'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                }`}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Video call component */}
        <div className="flex-1">
          <VideoCall
            callId={callId}
            groupId={groupId}
            onLeave={onLeave}
          />
        </div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-card border-l border-border flex flex-col">
          <SidebarContent 
            tab={sidebarTab} 
            groupId={groupId}
            onClose={() => setShowSidebar(false)}
          />
        </div>
      )}
    </div>
  );
}

interface SidebarContentProps {
  tab: 'chat' | 'notes' | 'whiteboard' | 'settings';
  groupId: string;
  onClose: () => void;
}

function SidebarContent({ tab, groupId, onClose }: SidebarContentProps) {
  const renderContent = () => {
    switch (tab) {
      case 'chat':
        return <ChatPanel groupId={groupId} />;
      case 'notes':
        return <NotesPanel groupId={groupId} />;
      case 'whiteboard':
        return <WhiteboardPanel groupId={groupId} />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (tab) {
      case 'chat':
        return 'Group Chat';
      case 'notes':
        return 'Shared Notes';
      case 'whiteboard':
        return 'Whiteboard';
      case 'settings':
        return 'Call Settings';
      default:
        return '';
    }
  };

  return (
    <>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{getTitle()}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            ×
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </>
  );
}

function ChatPanel({ groupId }: { groupId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    // Add message logic here
    const message = {
      id: Date.now(),
      content: newMessage,
      user_name: 'You',
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="bg-accent rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{message.user_name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-foreground text-sm">{message.content}</p>
            </div>
          ))
        )}
      </div>
      
      <div className="p-4 border-t border-border">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-background text-foreground rounded-lg border border-input focus:border-primary focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function NotesPanel({ groupId }: { groupId: string }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const saveNotes = async () => {
    setSaving(true);
    // Add save logic here
    setTimeout(() => setSaving(false), 1000);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-foreground">Collaborative Notes</h3>
          <button
            onClick={saveNotes}
            disabled={saving}
            className="px-3 py-1 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground text-sm rounded transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Notes are automatically synced with all participants
        </p>
      </div>
      
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Start taking notes..."
        className="flex-1 p-3 bg-background text-foreground rounded-lg border border-input focus:border-primary focus:outline-none resize-none"
      />
    </div>
  );
}

function WhiteboardPanel({ groupId }: { groupId: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium text-foreground mb-2">Collaborative Whiteboard</h3>
        <p className="text-xs text-muted-foreground">
          Draw and collaborate in real-time with all participants
        </p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {/* Import and use the actual WhiteboardCanvas component */}
        <WhiteboardCanvas
          whiteboardId={`call-${groupId}-whiteboard`}
          groupId={groupId}
          canEdit={true}
          className="h-full"
        />
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [audioDevice, setAudioDevice] = useState('default');
  const [videoDevice, setVideoDevice] = useState('default');
  const [audioQuality, setAudioQuality] = useState('high');
  const [videoQuality, setVideoQuality] = useState('hd');

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Audio Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Microphone</label>
            <select
              value={audioDevice}
              onChange={(e) => setAudioDevice(e.target.value)}
              className="w-full px-3 py-2 bg-background text-foreground rounded border border-input focus:border-primary focus:outline-none text-sm"
            >
              <option value="default">Default Microphone</option>
              <option value="built-in">Built-in Microphone</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Audio Quality</label>
            <select
              value={audioQuality}
              onChange={(e) => setAudioQuality(e.target.value)}
              className="w-full px-3 py-2 bg-background text-foreground rounded border border-input focus:border-primary focus:outline-none text-sm"
            >
              <option value="low">Low (32 kbps)</option>
              <option value="medium">Medium (64 kbps)</option>
              <option value="high">High (128 kbps)</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Video Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Camera</label>
            <select
              value={videoDevice}
              onChange={(e) => setVideoDevice(e.target.value)}
              className="w-full px-3 py-2 bg-background text-foreground rounded border border-input focus:border-primary focus:outline-none text-sm"
            >
              <option value="default">Default Camera</option>
              <option value="built-in">Built-in Camera</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Video Quality</label>
            <select
              value={videoQuality}
              onChange={(e) => setVideoQuality(e.target.value)}
              className="w-full px-3 py-2 bg-background text-foreground rounded border border-input focus:border-primary focus:outline-none text-sm"
            >
              <option value="low">Low (480p)</option>
              <option value="medium">Medium (720p)</option>
              <option value="hd">HD (1080p)</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Call Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm text-foreground">Enable noise cancellation</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm text-foreground">Auto-adjust volume</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm text-foreground">Show connection quality</span>
          </label>
        </div>
      </div>
    </div>
  );
}