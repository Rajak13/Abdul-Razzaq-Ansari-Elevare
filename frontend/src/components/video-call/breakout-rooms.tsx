'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserGroupIcon,
  PlusIcon,
  UserIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Socket } from 'socket.io-client';

interface Participant {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  audioEnabled: boolean;
  videoEnabled: boolean;
}

interface BreakoutRoom {
  id: string;
  name: string;
  participants: Participant[];
  maxParticipants?: number;
}

interface BreakoutRoomsProps {
  callId: string;
  participants: Participant[];
  socket: Socket | null;
}

export function BreakoutRooms({ callId, participants, socket }: BreakoutRoomsProps) {
  const [breakoutRooms, setBreakoutRooms] = useState<BreakoutRoom[]>([]);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isManaging, setIsManaging] = useState(false);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on('breakout_room_created', (data: any) => {
      const newRoom: BreakoutRoom = {
        id: data.breakoutRoomId,
        name: data.roomName,
        participants: data.participants.map((pId: string) => 
          participants.find(p => p.userId === pId)
        ).filter(Boolean)
      };
      setBreakoutRooms(prev => [...prev, newRoom]);
    });

    socket.on('participant_moved_to_breakout', (data: any) => {
      setBreakoutRooms(prev => prev.map(room => 
        room.id === data.breakoutRoomId
          ? { ...room, participants: [...room.participants, data.participant] }
          : room
      ));
    });

    socket.on('participant_returned_from_breakout', (data: any) => {
      setBreakoutRooms(prev => prev.map(room => ({
        ...room,
        participants: room.participants.filter(p => p.userId !== data.userId)
      })));
    });

    socket.on('breakout_room_closed', (data: any) => {
      setBreakoutRooms(prev => prev.filter(room => room.id !== data.breakoutRoomId));
    });

    return () => {
      socket.off('breakout_room_created');
      socket.off('participant_moved_to_breakout');
      socket.off('participant_returned_from_breakout');
      socket.off('breakout_room_closed');
    };
  }, [socket, participants]);

  const createBreakoutRoom = () => {
    if (!socket || !newRoomName.trim() || selectedParticipants.length === 0) return;

    socket.emit('create_breakout_room', {
      callId,
      roomName: newRoomName.trim(),
      participants: selectedParticipants
    });

    setNewRoomName('');
    setSelectedParticipants([]);
    setIsCreatingRoom(false);
  };

  const moveParticipantToRoom = (participantId: string, roomId: string) => {
    if (!socket) return;

    socket.emit('move_to_breakout_room', {
      callId,
      participantId,
      breakoutRoomId: roomId
    });
  };

  const returnParticipantToMain = (participantId: string) => {
    if (!socket) return;

    socket.emit('return_to_main_room', {
      callId,
      participantId
    });
  };

  const closeBreakoutRoom = (roomId: string) => {
    if (!socket) return;

    socket.emit('close_breakout_room', {
      callId,
      breakoutRoomId: roomId
    });
  };

  const autoAssignParticipants = (roomCount: number) => {
    const availableParticipants = participants.filter(p => 
      !breakoutRooms.some(room => room.participants.some(rp => rp.userId === p.userId))
    );

    const participantsPerRoom = Math.ceil(availableParticipants.length / roomCount);
    
    for (let i = 0; i < roomCount; i++) {
      const roomParticipants = availableParticipants.slice(
        i * participantsPerRoom, 
        (i + 1) * participantsPerRoom
      );

      if (roomParticipants.length > 0 && socket) {
        socket.emit('create_breakout_room', {
          callId,
          roomName: `Room ${i + 1}`,
          participants: roomParticipants.map(p => p.userId)
        });
      }
    }
  };

  const unassignedParticipants = participants.filter(p => 
    !breakoutRooms.some(room => room.participants.some(rp => rp.userId === p.userId))
  );

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserGroupIcon className="w-5 h-5 text-foreground" />
            <h2 className="text-foreground font-semibold">Breakout Rooms</h2>
          </div>
          <button
            onClick={() => setIsManaging(!isManaging)}
            className="p-1 rounded hover:bg-accent transition-colors"
            title="Manage rooms"
          >
            <Cog6ToothIcon className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Main room */}
        <div className="bg-muted rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-foreground font-medium">Main Room</h3>
            <span className="text-muted-foreground text-sm">
              {unassignedParticipants.length + 1} participant{unassignedParticipants.length + 1 !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-1">
            {unassignedParticipants.map(participant => (
              <ParticipantItem
                key={participant.userId}
                participant={participant}
                isManaging={isManaging}
                onMoveToRoom={(roomId) => moveParticipantToRoom(participant.userId, roomId)}
                availableRooms={breakoutRooms}
              />
            ))}
          </div>
        </div>

        {/* Breakout rooms */}
        {breakoutRooms.map(room => (
          <BreakoutRoomItem
            key={room.id}
            room={room}
            isManaging={isManaging}
            onReturnToMain={returnParticipantToMain}
            onCloseRoom={() => closeBreakoutRoom(room.id)}
            onMoveParticipant={moveParticipantToRoom}
            availableRooms={breakoutRooms}
          />
        ))}

        {/* Create room button */}
        {!isCreatingRoom && (
          <button
            onClick={() => setIsCreatingRoom(true)}
            className="w-full p-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-foreground transition-colors flex items-center justify-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create Breakout Room</span>
          </button>
        )}

        {/* Create room form */}
        {isCreatingRoom && (
          <div className="bg-muted rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground font-medium">Create Breakout Room</h3>
              <button
                onClick={() => {
                  setIsCreatingRoom(false);
                  setNewRoomName('');
                  setSelectedParticipants([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Room name"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full px-3 py-2 bg-background text-foreground rounded border border-input focus:border-primary focus:outline-none"
            />

            <div>
              <label className="text-foreground text-sm mb-2 block">Select participants:</label>
              <div className="space-y-1 max-h-32 overflow-auto">
                {unassignedParticipants.map(participant => (
                  <label key={participant.userId} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(participant.userId)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedParticipants(prev => [...prev, participant.userId]);
                        } else {
                          setSelectedParticipants(prev => prev.filter(id => id !== participant.userId));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-foreground text-sm">{participant.user.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={createBreakoutRoom}
                disabled={!newRoomName.trim() || selectedParticipants.length === 0}
                className="flex-1 px-3 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground rounded transition-colors"
              >
                Create Room
              </button>
            </div>
          </div>
        )}

        {/* Quick actions */}
        {unassignedParticipants.length > 0 && (
          <div className="bg-muted rounded-lg p-3">
            <h3 className="text-foreground font-medium mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => autoAssignParticipants(2)}
                className="w-full px-3 py-2 bg-accent hover:bg-accent/80 text-foreground rounded text-sm transition-colors"
              >
                Create 2 rooms (auto-assign)
              </button>
              <button
                onClick={() => autoAssignParticipants(3)}
                className="w-full px-3 py-2 bg-accent hover:bg-accent/80 text-foreground rounded text-sm transition-colors"
              >
                Create 3 rooms (auto-assign)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ParticipantItemProps {
  participant: Participant;
  isManaging: boolean;
  onMoveToRoom: (roomId: string) => void;
  availableRooms: BreakoutRoom[];
}

function ParticipantItem({ participant, isManaging, onMoveToRoom, availableRooms }: ParticipantItemProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  return (
    <div className="flex items-center justify-between p-2 bg-accent rounded">
      <div className="flex items-center space-x-2">
        {participant.user.avatar_url ? (
          <img
            src={participant.user.avatar_url}
            alt={participant.user.name}
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <span className="text-foreground text-sm">{participant.user.name}</span>
      </div>

      {isManaging && availableRooms.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            className="p-1 rounded hover:bg-muted transition-colors"
            title="Move to room"
          >
            <ArrowRightIcon className="w-4 h-4 text-muted-foreground" />
          </button>

          {showMoveMenu && (
            <div className="absolute right-0 top-8 bg-card border border-border rounded shadow-lg z-10 min-w-32">
              {availableRooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => {
                    onMoveToRoom(room.id);
                    setShowMoveMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-foreground hover:bg-accent transition-colors text-sm"
                >
                  {room.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface BreakoutRoomItemProps {
  room: BreakoutRoom;
  isManaging: boolean;
  onReturnToMain: (participantId: string) => void;
  onCloseRoom: () => void;
  onMoveParticipant: (participantId: string, roomId: string) => void;
  availableRooms: BreakoutRoom[];
}

function BreakoutRoomItem({ 
  room, 
  isManaging, 
  onReturnToMain, 
  onCloseRoom,
  onMoveParticipant,
  availableRooms
}: BreakoutRoomItemProps) {
  return (
    <div className="bg-card rounded-lg p-3 border border-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-foreground font-medium">{room.name}</h3>
        <div className="flex items-center space-x-2">
          <span className="text-muted-foreground text-sm">
            {room.participants.length} participant{room.participants.length !== 1 ? 's' : ''}
          </span>
          {isManaging && (
            <button
              onClick={onCloseRoom}
              className="p-1 rounded hover:bg-accent transition-colors text-destructive hover:text-destructive/80"
              title="Close room"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {room.participants.map(participant => (
          <div key={participant.userId} className="flex items-center justify-between p-2 bg-accent rounded">
            <div className="flex items-center space-x-2">
              {participant.user.avatar_url ? (
                <img
                  src={participant.user.avatar_url}
                  alt={participant.user.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <span className="text-foreground text-sm">{participant.user.name}</span>
            </div>

            {isManaging && (
              <button
                onClick={() => onReturnToMain(participant.userId)}
                className="p-1 rounded hover:bg-muted transition-colors"
                title="Return to main room"
              >
                <ArrowLeftIcon className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        ))}
      </div>

      {room.participants.length === 0 && (
        <div className="text-center text-muted-foreground text-sm py-4">
          No participants in this room
        </div>
      )}
    </div>
  );
}