'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { socketService } from '@/services/socket-service';
import { CallControls } from './call-controls';
import { ParticipantGrid, ParticipantGridCompact } from './participant-grid';
import { ScreenShare } from './screen-share';
import { BreakoutRooms } from './breakout-rooms';
import { FloatingVideoWindow } from './floating-video-window';
import { toast } from 'sonner';

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

interface VideoCallProps {
  callId: string;
  groupId?: string;
  onLeave: () => void;
  isFloating?: boolean;
}

export function VideoCall({ callId, groupId, onLeave, isFloating }: VideoCallProps) {
  const { user, token } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [isInBreakoutRoom, setIsInBreakoutRoom] = useState(false);
  const [breakoutRoomName, setBreakoutRoomName] = useState<string>('');
  const [socketReady, setSocketReady] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const screenPeerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const hasJoinedCallRef = useRef(false);
  const makingOffer = useRef<Map<string, boolean>>(new Map());
  const ignoreOffer = useRef<Map<string, boolean>>(new Map());

  // Production WebRTC configuration with Metered TURN server
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      // STUN server for NAT discovery
      { urls: 'stun:stun.l.google.com:19302' },
      // Production Metered TURN server
      {
        urls: 'turn:elevarenp.metered.live:80',
        username: process.env.NEXT_PUBLIC_TURN_USERNAME || 'elevarenp',
        credential: process.env.NEXT_PUBLIC_TURN_PASSWORD || 'FSOofLCSpAluGfLhxOMjQlS42WtGMQMIKHjKKW1dbiuGQIAq'
      }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle', // Optimize for production
    rtcpMuxPolicy: 'require'
  };

  // Check socket connection status
  useEffect(() => {
    const checkSocket = () => {
      const socket = socketService.getSocket();
      const isConnected = socket && socket.connected;
      setSocketReady(!!isConnected);

      if (!isConnected) {
        hasJoinedCallRef.current = false;
        if (token) {
          socketService.connect(token);
        }
      }
    };

    checkSocket();
    const interval = setInterval(checkSocket, 1000);

    return () => clearInterval(interval);
  }, [token]);

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      console.log('🎥 Requesting media access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('✅ Media access granted');
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setConnectionStatus('connected');
      setError(null);
    } catch (err) {
      console.error('❌ Error accessing media devices:', err);
      let errorMessage = 'Failed to access camera and microphone.';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera and microphone access denied. Please allow permissions and refresh.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera or microphone found. Please connect devices and refresh.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera or microphone is already in use by another application.';
        }
      }

      setError(errorMessage);
      setConnectionStatus('disconnected');
    }
  }, []);

  // Create peer connection for a participant
  const createPeerConnection = useCallback((participantId: string, isScreenShare = false, customStream?: MediaStream) => {
    console.log(`🔗 Creating peer connection for ${participantId} (screenShare: ${isScreenShare})`);

    const pc = new RTCPeerConnection(rtcConfig);
    const connections = isScreenShare ? screenPeerConnections : peerConnections;

    // Add local stream tracks - use customStream if provided, otherwise get current stream
    const stream = customStream || (isScreenShare ? screenStream : localStream);
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log(`➕ Adding ${track.kind} track to peer connection`);
        pc.addTrack(track, stream);
      });
    } else {
      console.warn(`⚠️ No stream available for ${isScreenShare ? 'screen share' : 'video call'}`);
    }

    // Handle ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        const eventName = isScreenShare ? 'screen_share_ice_candidate' : 'webrtc_ice_candidate';
        socketService.getSocket()?.emit(eventName, {
          callId,
          targetUserId: participantId,
          candidate
        });
      }
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`📺 Received ${event.track.kind} track from ${participantId}`);
      let [remoteStream] = event.streams;

      // Some browsers don't provide the stream in the event, only the track
      if (!remoteStream) {
        console.log(`📡 Manually creating stream for ${participantId} track`);
        remoteStream = new MediaStream();
        remoteStream.addTrack(event.track);
      }

      if (isScreenShare) {
        setParticipants(prev => prev.map(p =>
          p.userId === participantId ? { ...p, screenStream: remoteStream, isScreenSharing: true } : p
        ));
      } else {
        setParticipants(prev => prev.map(p =>
          p.userId === participantId ? { ...p, stream: remoteStream } : p
        ));
      }
    };

    // Auto-negotiation logic
    pc.onnegotiationneeded = async () => {
      try {
        console.log(`🔄 Negotiation needed for ${participantId}`);
        makingOffer.current.set(participantId, true);
        await pc.setLocalDescription();

        socketService.getSocket()?.emit(isScreenShare ? 'screen_share_offer' : 'webrtc_offer', {
          callId,
          targetUserId: participantId,
          offer: pc.localDescription
        });
      } catch (err) {
        console.error(`❌ Negotiation error for ${participantId}:`, err);
      } finally {
        makingOffer.current.set(participantId, false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE state for ${participantId}:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
      }
    };

    connections.current.set(participantId, pc);
    return pc;
  }, [callId, screenStream, localStream]);

  // Handle WebRTC offer - NO SDP MUNGING
  const handleOffer = useCallback(async (data: any) => {
    const { fromUserId, offer, targetUserId } = data;
    console.log(`📨 Received offer from ${fromUserId} to ${targetUserId}`);

    if (!user?.id) return;

    let pc = peerConnections.current.get(fromUserId);
    const isPolite = user.id < fromUserId;

    // Perfect Negotiation handling
    const offerCollision = (makingOffer.current.get(fromUserId) || pc?.signalingState !== "stable");
    ignoreOffer.current.set(fromUserId, !isPolite && offerCollision);

    if (ignoreOffer.current.get(fromUserId)) {
      console.log(`⏭️ Ignoring glaresome offer from ${fromUserId} (Impolite)`);
      return;
    }

    if (!pc) {
      pc = createPeerConnection(fromUserId, false);
    }

    try {
      if (offerCollision) {
        if (isPolite && pc.signalingState !== 'stable') {
          console.log(`🔄 Rolling back local offer to accept ${fromUserId} (Polite)`);
          await Promise.all([
            pc.setLocalDescription({ type: "rollback" } as any),
            pc.setRemoteDescription(offer)
          ]);
        } else if (isPolite) {
          // Collision detected but we are stable, just set remote
          console.log(`🤝 Collision detected but state is stable. Setting remote description from ${fromUserId}`);
          await pc.setRemoteDescription(offer);
        }
      } else {
        await pc.setRemoteDescription(offer);
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketService.getSocket()?.emit('webrtc_answer', {
        callId,
        targetUserId: fromUserId,
        answer
      });
    } catch (err) {
      console.error(`❌ Error in handleOffer for ${fromUserId}:`, err);
    }
  }, [callId, createPeerConnection, user?.id, localStream]);

  // Handle WebRTC answer - NO SDP MUNGING
  const handleAnswer = useCallback(async (data: any) => {
    const { fromUserId, answer, targetUserId } = data;
    console.log(`📨 Received answer from ${fromUserId} to ${targetUserId}`);

    if (targetUserId && targetUserId !== user?.id) {
      return;
    }

    if (!user?.id) {
      return;
    }

    const pc = peerConnections.current.get(fromUserId);
    if (pc) {
      try {
        if (pc.signalingState === 'have-local-offer') {
          console.log(`🤝 Setting remote description from ${fromUserId}`);
          await pc.setRemoteDescription(answer);

          // Clear making offer flag since the exchange is complete
          makingOffer.current.set(fromUserId, false);

          // Process any pending ICE candidates
          const pending = pendingCandidates.current.get(fromUserId);
          if (pending && pending.length > 0) {
            console.log(`📦 Processing ${pending.length} pending candidates for ${fromUserId}`);
            for (const candidate of pending) {
              try {
                await pc.addIceCandidate(candidate);
              } catch (err) {
                console.warn(`⚠️ Failed to add pending candidate:`, err);
              }
            }
            pendingCandidates.current.delete(fromUserId);
          }
        }
      } catch (err) {
        console.error(`❌ Error handling answer from ${fromUserId}:`, err);
      }
    }
  }, [user?.id]);

  // Handle ICE candidate - with queue for early candidates
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const handleIceCandidate = useCallback(async (data: any) => {
    const { fromUserId, candidate, targetUserId } = data;

    if (targetUserId && targetUserId !== user?.id) {
      return;
    }

    if (!user?.id) {
      return;
    }

    const pc = peerConnections.current.get(fromUserId);
    if (pc) {
      try {
        // Check if remote description is set and connection is in valid state
        if (pc.remoteDescription && pc.signalingState !== 'closed') {
          await pc.addIceCandidate(candidate);
          console.log(`✅ Added ICE candidate from ${fromUserId}`);

          // Process any pending candidates
          const pending = pendingCandidates.current.get(fromUserId);
          if (pending && pending.length > 0) {
            console.log(`📦 Processing ${pending.length} pending candidates for ${fromUserId}`);
            for (const pendingCandidate of pending) {
              try {
                await pc.addIceCandidate(pendingCandidate);
              } catch (err) {
                console.warn(`⚠️ Failed to add pending candidate:`, err);
              }
            }
            pendingCandidates.current.delete(fromUserId);
          }
        } else {
          // Queue the candidate for later
          console.log(`📦 Queueing ICE candidate from ${fromUserId} (no remote description yet)`);
          const pending = pendingCandidates.current.get(fromUserId) || [];
          pending.push(candidate);
          pendingCandidates.current.set(fromUserId, pending);
        }
      } catch (err) {
        console.error(`❌ Error handling ICE candidate from ${fromUserId}:`, err);
      }
    }
  }, [user?.id]);

  // Create offer for new participant - NO SDP MUNGING
  const createOfferForParticipant = useCallback(async (participantId: string) => {
    console.log(`📤 Creating offer for participant: ${participantId}`);

    // Wait for local stream to be ready
    if (!localStream) {
      console.warn('⚠️ Local stream not ready yet, skipping offer creation');
      return;
    }

    const pc = createPeerConnection(participantId, false, localStream || undefined);

    try {
      makingOffer.current.set(participantId, true);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      // NO SDP MUNGING - use offer directly
      await pc.setLocalDescription(offer);

      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('webrtc_offer', {
          callId,
          targetUserId: participantId,
          offer: offer
        });
      }
      console.log(`✅ Sent offer to ${participantId}`);
    } catch (err) {
      console.error(`❌ Error creating offer for ${participantId}:`, err);
    } finally {
      makingOffer.current.set(participantId, false);
    }
  }, [callId, createPeerConnection, localStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);

        const socket = socketService.getSocket();
        if (socket) {
          socket.emit('audio_state_change', {
            callId,
            muted: !audioTrack.enabled
          });
        }
      }
    }
  }, [localStream, callId]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);

        const socket = socketService.getSocket();
        if (socket) {
          socket.emit('video_state_change', {
            callId,
            enabled: videoTrack.enabled
          });
        }
      }
    }
  }, [localStream, callId]);

  // Start screen sharing - NO SDP MUNGING
  const startScreenShare = useCallback(async () => {
    try {
      console.log('🖥️ Starting screen share...');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor'
        } as MediaTrackConstraints,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      console.log('✅ Screen share stream obtained');
      setScreenStream(stream);
      setIsScreenSharing(true);

      const socket = socketService.getSocket();
      if (socket && user?.id) {
        socket.emit('screen_share_started', {
          callId,
          userId: user.id,
          user: user
        });
      }

      // Create screen share peer connections with the actual stream
      // Only create connections if there are participants
      if (participants.length > 0) {
        participants.forEach(participant => {
          const pc = createPeerConnection(participant.userId, true, stream);

          pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          }).then(offer => {
            // NO SDP MUNGING - use offer directly
            return pc.setLocalDescription(offer);
          }).then(() => {
            if (socket) {
              socket.emit('screen_share_offer', {
                callId,
                targetUserId: participant.userId,
                offer: pc.localDescription
              });
            }
          }).catch(err => {
            console.error(`❌ Error creating screen share offer for ${participant.userId}:`, err);
            pc.close();
            screenPeerConnections.current.delete(participant.userId);
          });
        });
      } else {
        console.log('⚠️ No participants to share screen with yet');
      }

      stream.getVideoTracks()[0].onended = () => {
        console.log('🛑 Screen share ended by user');
        stopScreenShare();
      };

    } catch (err) {
      console.error('❌ Error starting screen share:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Screen sharing permission denied.');
        } else if (err.name === 'NotFoundError') {
          setError('No screen available to share.');
        } else {
          setError('Failed to start screen sharing. Please try again.');
        }
      } else {
        setError('Failed to start screen sharing. Please check permissions.');
      }
      setIsScreenSharing(false);
    }
  }, [participants, createPeerConnection, callId, user]);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    console.log('🛑 Stopping screen share...');

    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    setIsScreenSharing(false);

    screenPeerConnections.current.forEach((pc) => pc.close());
    screenPeerConnections.current.clear();

    const socket = socketService.getSocket();
    if (socket && user?.id) {
      socket.emit('screen_share_stopped', {
        callId,
        userId: user.id,
        user: user
      });
    }
  }, [screenStream, callId, user]);

  // Leave call
  const handleLeaveCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    peerConnections.current.forEach(pc => pc.close());
    screenPeerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    screenPeerConnections.current.clear();

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('leave_call', callId);
    }

    onLeave();
  }, [localStream, screenStream, callId, onLeave]);

  // Socket event handlers
  useEffect(() => {
    if (!socketReady) {
      return;
    }

    const socket = socketService.getSocket();

    if (!socket || !socket.connected) {
      setError('Connection to server failed. Please refresh the page.');
      return;
    }

    console.log('🔌 Setting up socket event handlers for call:', callId);

    if (!hasJoinedCallRef.current) {
      socket.emit('join_call', { callId, groupId });
      hasJoinedCallRef.current = true;
    }

    // Handle call events
    socket.on('call_joined', (data: any) => {
      console.log('✅ Call joined:', data);

      // Show success toast
      if (data.isStarter) {
        toast.success('Call started successfully!', {
          duration: 3000,
          icon: '🎉'
        });
      } else {
        toast.success('Joined the call successfully!', {
          duration: 3000,
          icon: '✅'
        });
      }

      const uniqueParticipants = data.participants.filter((p: any, index: number, arr: any[]) =>
        p.userId !== user?.id && arr.findIndex(participant => participant.userId === p.userId) === index
      );

      setParticipants(uniqueParticipants.map((p: any) => ({
        ...p,
        audioEnabled: true,
        videoEnabled: true
      })));

      uniqueParticipants.forEach((participant: any) => {
        createOfferForParticipant(participant.userId);
      });
    });

    socket.on('user_joined_call', (data: any) => {
      console.log('👋 User joined call:', data);
      if (data.userId !== user?.id) {
        // Show toast notification
        toast.success(`${data.user?.name || 'Someone'} joined the call`, {
          duration: 3000,
          icon: '👋'
        });

        // Destroy old connection if they rejoin to prevent 'Changing mid of m-sections' error
        const oldPc = peerConnections.current.get(data.userId);
        if (oldPc) {
          oldPc.close();
          peerConnections.current.delete(data.userId);
        }

        const oldScreenPc = screenPeerConnections.current.get(data.userId);
        if (oldScreenPc) {
          oldScreenPc.close();
          screenPeerConnections.current.delete(data.userId);
        }

        setParticipants(prev => {
          // Remove any existing entry for this user first
          const filtered = prev.filter(p => p.userId !== data.userId);

          // Add the new entry
          return [...filtered, {
            ...data,
            audioEnabled: true,
            videoEnabled: true
          }];
        });
      }
    });

    socket.on('user_left_call', (data: any) => {
      console.log('👋 User left call:', data);

      // Show toast notification
      toast.info(`${data.user?.name || 'Someone'} left the call`, {
        duration: 3000,
        icon: '👋'
      });

      setParticipants(prev => prev.filter(p => p.userId !== data.userId));

      const pc = peerConnections.current.get(data.userId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(data.userId);
      }

      const screenPc = screenPeerConnections.current.get(data.userId);
      if (screenPc) {
        screenPc.close();
        screenPeerConnections.current.delete(data.userId);
      }
    });

    // WebRTC signaling
    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);

    // Audio/Video state changes
    socket.on('participant_audio_change', (data: any) => {
      const userName = data.user?.name || 'Someone';
      const status = data.muted ? 'muted' : 'unmuted';

      // Show toast notification
      toast.info(`${userName} ${status} their microphone`, {
        duration: 2000,
        icon: data.muted ? '🔇' : '🎤'
      });

      setParticipants(prev => {
        // Deduplicate first
        const uniqueParticipants = prev.filter((p, index, self) =>
          index === self.findIndex((t) => t.userId === p.userId)
        );

        return uniqueParticipants.map(p =>
          p.userId === data.userId
            ? { ...p, audioEnabled: !data.muted }
            : p
        );
      });
    });

    socket.on('participant_video_change', (data: any) => {
      const userName = data.user?.name || 'Someone';
      const status = data.enabled ? 'turned on' : 'turned off';

      // Show toast notification
      toast.info(`${userName} ${status} their camera`, {
        duration: 2000,
        icon: data.enabled ? '📹' : '📷'
      });

      setParticipants(prev => {
        // Deduplicate first
        const uniqueParticipants = prev.filter((p, index, self) =>
          index === self.findIndex((t) => t.userId === p.userId)
        );

        return uniqueParticipants.map(p =>
          p.userId === data.userId
            ? { ...p, videoEnabled: data.enabled }
            : p
        );
      });
    });

    // Breakout rooms
    socket.on('moved_to_breakout', (data: any) => {
      setIsInBreakoutRoom(true);
      setBreakoutRoomName(data.roomName);
    });

    socket.on('returned_to_main', () => {
      setIsInBreakoutRoom(false);
      setBreakoutRoomName('');
    });

    // Screen sharing events - NO SDP MUNGING
    socket.on('screen_share_started', (data: any) => {
      console.log('📺 Screen share started by:', data.user?.name);

      // Show toast notification
      toast.info(`${data.user?.name || 'Someone'} started screen sharing`, {
        duration: 4000,
        icon: '📺'
      });

      setParticipants(prev => {
        // Deduplicate first
        const uniqueParticipants = prev.filter((p, index, self) =>
          index === self.findIndex((t) => t.userId === p.userId)
        );

        return uniqueParticipants.map(p =>
          p.userId === data.userId
            ? { ...p, isScreenSharing: true }
            : p
        );
      });
    });

    socket.on('screen_share_stopped', (data: any) => {
      console.log('📺 Screen share stopped by:', data.user?.name);

      // Show toast notification
      toast.info(`${data.user?.name || 'Someone'} stopped screen sharing`, {
        duration: 3000,
        icon: '📺'
      });

      setParticipants(prev => {
        // Deduplicate first
        const uniqueParticipants = prev.filter((p, index, self) =>
          index === self.findIndex((t) => t.userId === p.userId)
        );

        return uniqueParticipants.map(p =>
          p.userId === data.userId
            ? { ...p, isScreenSharing: false, screenStream: undefined }
            : p
        );
      });
    });

    socket.on('screen_share_offer', async (data: any) => {
      const { fromUserId, offer, targetUserId } = data;
      console.log(`📺 Received screen share offer from ${fromUserId}`);

      if (targetUserId && targetUserId !== user?.id) {
        return;
      }

      if (!user?.id) {
        return;
      }

      try {
        const pc = createPeerConnection(fromUserId, true);

        // NO SDP MUNGING - use offer directly
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();

        // NO SDP MUNGING - use answer directly
        await pc.setLocalDescription(answer);

        socket.emit('screen_share_answer', {
          callId,
          targetUserId: fromUserId,
          answer: answer
        });
      } catch (err) {
        console.error('❌ Error handling screen share offer:', err);
      }
    });

    socket.on('screen_share_answer', async (data: any) => {
      const { fromUserId, answer, targetUserId } = data;

      if (targetUserId && targetUserId !== user?.id) {
        return;
      }

      if (!user?.id) {
        return;
      }

      const pc = screenPeerConnections.current.get(fromUserId);
      if (pc && pc.signalingState === 'have-local-offer') {
        try {
          // NO SDP MUNGING - use answer directly
          await pc.setRemoteDescription(answer);
        } catch (err) {
          console.error('❌ Error handling screen share answer:', err);
        }
      }
    });

    socket.on('screen_share_ice_candidate', async (data: any) => {
      const { fromUserId, candidate, targetUserId } = data;

      if (targetUserId && targetUserId !== user?.id) {
        return;
      }

      if (!user?.id) {
        return;
      }

      const pc = screenPeerConnections.current.get(fromUserId);
      if (pc) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          console.error('❌ Error handling screen share ICE candidate:', err);
        }
      }
    });

    socket.on('error', (data: any) => {
      setError(data.message);
      setConnectionStatus('disconnected');
    });

    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('call_joined');
        socket.off('user_joined_call');
        socket.off('user_left_call');
        socket.off('webrtc_offer');
        socket.off('webrtc_answer');
        socket.off('webrtc_ice_candidate');
        socket.off('participant_audio_change');
        socket.off('participant_video_change');
        socket.off('screen_share_started');
        socket.off('screen_share_stopped');
        socket.off('screen_share_offer');
        socket.off('screen_share_answer');
        socket.off('screen_share_ice_candidate');
        socket.off('moved_to_breakout');
        socket.off('returned_to_main');
        socket.off('error');
      }
    };
  }, [socketReady, callId, groupId, handleOffer, handleAnswer, handleIceCandidate, createOfferForParticipant, user?.id, createPeerConnection]);

  // Initialize local stream on mount
  useEffect(() => {
    initializeLocalStream();

    return () => {
      // Properly cleanup media streams
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
          localStream.removeTrack(track);
        });
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => {
          track.stop();
          screenStream.removeTrack(track);
        });
      }

      setParticipants([]);

      // Close all peer connections
      peerConnections.current.forEach(pc => {
        pc.close();
      });
      screenPeerConnections.current.forEach(pc => {
        pc.close();
      });
      peerConnections.current.clear();
      screenPeerConnections.current.clear();

      // Leave call room
      const socket = socketService.getSocket();
      if (socket?.connected && user?.id) {
        socket.emit('leave_call', { callId, userId: user.id });
      }
    };
  }, [initializeLocalStream]);

  // Sync local tracks with all peers as stream becomes ready
  useEffect(() => {
    if (!localStream) return;

    const syncTracks = () => {
      peerConnections.current.forEach((pc, participantId) => {
        const senders = pc.getSenders();
        const hasTracks = senders.some(s => s.track);

        if (!hasTracks) {
          console.log(`➕ Adding missing tracks to ${participantId}`);
          localStream.getTracks().forEach(track => {
            pc.addTrack(track, localStream);
          });
        }
      });
    };

    syncTracks();
  }, [localStream]);

  // Initial connection trigger
  useEffect(() => {
    if (localStream && participants.length > 0) {
      participants.forEach(p => {
        if (!peerConnections.current.has(p.userId)) {
          console.log(`� Initiating call with participant: ${p.userId}`);
          createOfferForParticipant(p.userId);
        }
      });
    }
  }, [localStream, participants, createOfferForParticipant]);

  if (!socketReady) {
    return (
      <div className="flex items-center justify-center h-full bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Connecting to server...</h2>
          <p className="text-muted-foreground">Please wait while we establish connection</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-background text-foreground">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-foreground">Connection Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => {
                setError(null);
                initializeLocalStream();
              }}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleLeaveCall}
              className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors"
            >
              Leave Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isFloating) {
    return (
      <FloatingVideoWindow
        participants={participants}
        localStream={localStream}
        localVideoRef={localVideoRef}
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
      // Don't pass onClose so user navigates back via tabs
      />
    );
  }

  // Controls padding scales down slightly with more participants to give grid more room
  const totalParticipants = participants.length + 1;
  const controlsPadding = totalParticipants >= 6 ? 'py-2 px-4' : totalParticipants >= 4 ? 'py-3 px-4' : 'py-4 px-4';

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <h1 className="text-lg font-semibold text-foreground">
            {isInBreakoutRoom ? `Breakout Room: ${breakoutRoomName}` : 'Video Call'}
          </h1>
          <div className={`px-2 py-1 rounded-full text-xs ${connectionStatus === 'connected' && socketReady ? 'bg-primary text-primary-foreground' :
            connectionStatus === 'connecting' || !socketReady ? 'bg-yellow-600 text-white' : 'bg-destructive text-destructive-foreground'
            }`}>
            {socketReady ? connectionStatus : 'connecting to server'}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Main content — min-h-0 ensures it doesn't overflow past controls */}
      <div className="flex-1 flex min-h-0">
        {/* Video area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Screen share area */}
          {(isScreenSharing || participants.some(p => p.isScreenSharing)) && (
            <div className="flex-1 min-h-0">
              <ScreenShare
                screenStream={screenStream}
                participants={participants}
                isSharing={isScreenSharing}
              />
            </div>
          )}

          {/* Participant grid — fills remaining space, never overflows */}
          <div className={`min-h-0 ${isScreenSharing || participants.some(p => p.isScreenSharing) ? 'h-32 flex-shrink-0 border-t border-border' : 'flex-1'}`}>
            {(isScreenSharing || participants.some(p => p.isScreenSharing)) ? (
              <ParticipantGridCompact
                participants={participants}
                localStream={localStream}
                localVideoRef={localVideoRef}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
              />
            ) : (
              <ParticipantGrid
                participants={participants}
                localStream={localStream}
                localVideoRef={localVideoRef}
                isAudioEnabled={isAudioEnabled}
                isVideoEnabled={isVideoEnabled}
              />
            )}
          </div>
        </div>

        {/* Breakout rooms sidebar */}
        {!isInBreakoutRoom && (
          <div className="w-80 border-l border-border flex-shrink-0 hidden lg:block">
            <BreakoutRooms
              callId={callId}
              participants={[
                {
                  userId: user?.id || 'local',
                  user: {
                    id: user?.id || 'local',
                    name: user?.name || 'You',
                    email: user?.email || '',
                    avatar_url: user?.avatar_url
                  },
                  audioEnabled: isAudioEnabled,
                  videoEnabled: isVideoEnabled
                },
                ...participants
              ]}
              socket={socketService.getSocket()}
            />
          </div>
        )}
      </div>

      {/* Controls — always visible, spacing adapts to participant count */}
      <div className={`${controlsPadding} bg-card border-t border-border flex-shrink-0`}>
        <CallControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
          onLeaveCall={handleLeaveCall}
        />
      </div>
    </div>
  );
}