'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useGroupMessages, useSendMessage } from '@/hooks/use-study-groups';
import { useAuth } from '@/contexts/auth-context';
import socketService from '@/services/socket-service';
import { MessageCircle, Send, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface GroupChatProps {
  groupId: string;
}

export function GroupChat({ groupId }: GroupChatProps) {
  const [message, setMessage] = useState('');
  const [realtimeMessages, setRealtimeMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  const { data: messagesData, isLoading, refetch } = useGroupMessages(groupId);
  const sendMessageMutation = useSendMessage();

  const initialMessages = messagesData?.messages || [];
  const allMessages = [...initialMessages, ...realtimeMessages];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [allMessages.length]);

  // Socket event handlers
  useEffect(() => {
    // Always set up listeners, even if not connected yet
    // Join the group room
    socketService.joinGroup(groupId);

    // Listen for new messages
    const handleNewMessage = (newMessage: any) => {
      // Always add the message, but remove any optimistic message with temp ID first
      setRealtimeMessages(prev => {
        // Remove any optimistic messages (they have temp IDs)
        const withoutOptimistic = prev.filter(msg => !msg.id.startsWith('temp-'));
        
        // Check if this message already exists (avoid duplicates)
        const messageExists = withoutOptimistic.some(msg => msg.id === newMessage.id);
        
        if (messageExists) {
          return prev;
        }
        
        // Add the new message
        return [...withoutOptimistic, newMessage];
      });
    };

    // Listen for typing indicators
    const handleUserTyping = (data: any) => {
      if (data.userId !== user?.id) {
        setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
        
        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => prev.filter(id => id !== data.userId));
        }, 3000);
      }
    };

    const handleUserStoppedTyping = (data: any) => {
      setTypingUsers(prev => prev.filter(id => id !== data.userId));
    };

    socketService.onNewMessage(handleNewMessage);
    socketService.onUserTyping(handleUserTyping);
    socketService.onUserStoppedTyping(handleUserStoppedTyping);

    return () => {
      socketService.leaveGroup(groupId);
      socketService.offNewMessage(handleNewMessage);
      socketService.offUserTyping(handleUserTyping);
      socketService.offUserStoppedTyping(handleUserStoppedTyping);
    };
  }, [groupId, user?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;

    const messageContent = message.trim();
    setMessage('');

    // Stop typing indicator
    socketService.stopTyping(groupId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Optimistically add message to UI
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      user_id: user?.id,
      user_name: user?.name || 'You',
      created_at: new Date().toISOString(),
      group_id: groupId
    };
    setRealtimeMessages(prev => [...prev, optimisticMessage]);

    try {
      await sendMessageMutation.mutateAsync({
        groupId,
        data: { content: messageContent },
      });
      
      // Don't remove optimistic message here - let the socket handler replace it
    } catch (error) {
      // Remove optimistic message on error
      setRealtimeMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    
    // Send typing indicator
    socketService.startTyping(groupId);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(groupId);
    }, 2000);
  };

  const handleRefresh = () => {
    setRealtimeMessages([]);
    refetch();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isOwnMessage = (messageUserId: string) => {
    return user?.id === messageUserId;
  };

  if (isLoading) {
    return (
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Group Chat</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-4">
          <div className="flex-1 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Group Chat</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4 overflow-hidden">
          <div className="space-y-3 py-4 min-h-0">
            {allMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="text-4xl mb-2">💬</div>
                <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                <p className="text-muted-foreground">
                  Be the first to start the conversation!
                </p>
              </div>
            ) : (
              allMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-3 w-full min-w-0',
                    isOwnMessage(msg.user_id) && 'flex-row-reverse'
                  )}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(msg.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      'flex flex-col min-w-0 max-w-[calc(100%-4rem)]',
                      isOwnMessage(msg.user_id) && 'items-end'
                    )}
                  >
                    <div className={cn(
                      "mb-1 flex items-center gap-2 text-xs text-muted-foreground",
                      isOwnMessage(msg.user_id) && 'flex-row-reverse'
                    )}>
                      <span className="font-medium truncate">{msg.user_name}</span>
                      <span className="flex-shrink-0">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'rounded-lg px-3 py-2 max-w-full min-w-0 break-words overflow-hidden',
                        isOwnMessage(msg.user_id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-sm chat-message">{msg.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Typing indicators */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>
                  {typingUsers.length === 1 
                    ? 'Someone is typing...' 
                    : `${typingUsers.length} people are typing...`
                  }
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t p-4 flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={message}
              onChange={handleInputChange}
              disabled={sendMessageMutation.isPending}
              className="flex-1 min-w-0"
              maxLength={2000}
            />
            <Button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending}
              size="sm"
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}