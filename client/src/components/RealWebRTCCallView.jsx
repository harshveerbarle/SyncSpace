import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Share2,
  PhoneOff,
  Users,
  Copy,
  Check,
  FileText,
  Volume2,
  VolumeX,
  AlertCircle,
  Link2,
  Plus,
  Clipboard
} from 'lucide-react';
import socket from '../services/socket';
import { parseMeetingRoomId, getMeetingShareUrl } from '../utils/meetingUtils';
import JoinMeetingModal from './JoinMeetingModal';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
};

export default function RealWebRTCCallView({
  currentUser,
  roomId,
  callPartner,
  callType = 'video',
  chatId,
  onEndCall,
  onOpenCollabWork,
  onJoinMeeting
}) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map()); // socketId -> MediaStream
  const [peersInfo, setPeersInfo] = useState(new Map()); // socketId -> userInfo
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inlineJoinInput, setInlineJoinInput] = useState('');
  const [inlineJoinError, setInlineJoinError] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [callStatusMessage, setCallStatusMessage] = useState('');
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnections = useRef(new Map()); // socketId -> RTCPeerConnection

  // Call timer
  useEffect(() => {
    const timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. Acquire Local Media (Mobile & Desktop compatible)
  useEffect(() => {
    let activeStream = null;

    const startLocalMedia = async () => {
      // Check if browser environment supports mediaDevices (requires secure context https or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('navigator.mediaDevices.getUserMedia is unavailable in this context (insecure origin or unsupported browser).');
        setIsVideoOff(true);
        setIsMuted(true);
        setCallStatusMessage('Note: On mobile Chrome, Camera & Mic require HTTPS. Connect via https:// or enable chrome://flags/#unsafely-treat-insecure-origin-as-secure');
        socket.emit('webrtc:join_room', { roomId });
        return;
      }

      try {
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video:
            callType === 'audio'
              ? false
              : {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  facingMode: 'user'
                }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        localStreamRef.current = stream;
        setLocalStream(stream);

        if (localVideoRef.current && callType !== 'audio') {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        // Add local tracks to any existing peer connections
        peerConnections.current.forEach((pc) => {
          stream.getTracks().forEach((track) => {
            if (!pc.getSenders().some((s) => s.track === track)) {
              pc.addTrack(track, stream);
            }
          });
        });

        // Join WebRTC room
        socket.emit('webrtc:join_room', { roomId });
      } catch (err) {
        console.warn('Primary camera/mic access error:', err);
        // Fallback: try audio only if mediaDevices is available
        if (navigator.mediaDevices?.getUserMedia) {
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            activeStream = audioStream;
            localStreamRef.current = audioStream;
            setLocalStream(audioStream);
            setIsVideoOff(true);
            socket.emit('webrtc:join_room', { roomId });
            return;
          } catch (audioErr) {
            console.warn('Audio access also unavailable:', audioErr);
          }
        }
        setIsVideoOff(true);
        setIsMuted(true);
        setCallStatusMessage('Microphone/Camera permission not granted or device in use');
        socket.emit('webrtc:join_room', { roomId });
      }
    };

    startLocalMedia();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      socket.emit('webrtc:leave_room', { roomId });
    };
  }, [roomId, callType]);

  // Keep local video element synced with localStream
  useEffect(() => {
    if (localVideoRef.current && localStream && !isVideoOff) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isVideoOff]);

  // 2. WebRTC Peer Connection Factory with ICE Candidate Queueing
  const getOrCreatePeerConnection = (targetSocketId, targetUser, isInitiator) => {
    if (peerConnections.current.has(targetSocketId)) {
      return peerConnections.current.get(targetSocketId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.pendingCandidates = []; // Queue to prevent dropped ICE candidates
    peerConnections.current.set(targetSocketId, pc);

    if (targetUser) {
      setPeersInfo((prev) => new Map(prev).set(targetSocketId, targetUser));
    }

    // Attach local tracks if ready
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:signal', {
          targetSocketId,
          signalData: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('📡 [WebRTC ontrack] Received remote track:', event.track.kind);
      const remoteMediaStream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams((prev) => new Map(prev).set(targetSocketId, remoteMediaStream));
    };

    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit('webrtc:signal', {
            targetSocketId,
            signalData: { type: 'offer', sdp: pc.localDescription }
          });
        })
        .catch((err) => console.error('Error creating offer:', err));
    }

    return pc;
  };

  // 3. WebRTC Room Signaling Handlers with Reliable Candidate Drainage
  useEffect(() => {
    const handlePeersInRoom = ({ peers }) => {
      peers.forEach(({ socketId, user }) => {
        getOrCreatePeerConnection(socketId, user, true);
      });
    };

    const handlePeerJoined = ({ socketId, user }) => {
      getOrCreatePeerConnection(socketId, user, false);
    };

    const handleSignal = async ({ senderSocketId, signalData }) => {
      let pc = peerConnections.current.get(senderSocketId);
      if (!pc) {
        pc = getOrCreatePeerConnection(senderSocketId, null, false);
      }

      try {
        if (signalData.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));

          // Drain queued ICE candidates
          if (pc.pendingCandidates && pc.pendingCandidates.length > 0) {
            for (const cand of pc.pendingCandidates) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
            pc.pendingCandidates = [];
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc:signal', {
            targetSocketId: senderSocketId,
            signalData: { type: 'answer', sdp: answer }
          });
        } else if (signalData.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));

          // Drain queued ICE candidates
          if (pc.pendingCandidates && pc.pendingCandidates.length > 0) {
            for (const cand of pc.pendingCandidates) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
            pc.pendingCandidates = [];
          }
        } else if (signalData.type === 'candidate' && signalData.candidate) {
          if (!pc.remoteDescription) {
            pc.pendingCandidates = pc.pendingCandidates || [];
            pc.pendingCandidates.push(signalData.candidate);
          } else {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate)).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Signaling processing error:', err);
      }
    };

    const handlePeerLeft = ({ socketId }) => {
      const pc = peerConnections.current.get(socketId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(socketId);
      }
      setRemoteStreams((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      setPeersInfo((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    };

    // When partner hangs up
    const handlePeerEnded = () => {
      setCallStatusMessage('Call ended by partner');
      setTimeout(() => {
        handleEndCall();
      }, 1200);
    };

    socket.on('webrtc:peers_in_room', handlePeersInRoom);
    socket.on('webrtc:peer_joined', handlePeerJoined);
    socket.on('webrtc:signal', handleSignal);
    socket.on('webrtc:peer_left', handlePeerLeft);
    socket.on('call:peer_ended', handlePeerEnded);

    return () => {
      socket.off('webrtc:peers_in_room', handlePeersInRoom);
      socket.off('webrtc:peer_joined', handlePeerJoined);
      socket.off('webrtc:signal', handleSignal);
      socket.off('webrtc:peer_left', handlePeerLeft);
      socket.off('call:peer_ended', handlePeerEnded);
    };
  }, []);

  // Control Handlers
  const handleToggleAudio = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach((track) => {
          track.enabled = !track.enabled;
        });
        setIsMuted((prev) => !prev);
      }
    }
  };

  const handleToggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach((track) => {
          track.enabled = !track.enabled;
        });
        setIsVideoOff((prev) => !prev);
      }
    }
  };

  const handleToggleScreenShare = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert('Screen sharing is not supported on this browser or mobile device.');
      return;
    }

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
          localVideoRef.current.play().catch(() => {});
        }

        setIsScreenSharing(true);

        screenTrack.onended = () => {
          handleStopScreenShare();
        };
      } catch (err) {
        console.warn('Screen share error or user cancel:', err);
      }
    } else {
      handleStopScreenShare();
    }
  };

  const handleStopScreenShare = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
    }
    setIsScreenSharing(false);
  };

  const handleEndCall = () => {
    // 1. Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    // 2. Close peer connections
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();

    // 3. Emit end call to server with duration to log into chat history
    socket.emit('call:end', {
      roomId,
      chatId: chatId || null,
      callType,
      durationSecs: callDuration
    });

    socket.emit('webrtc:leave_room', { roomId });
    onEndCall();
  };

  const handleCopyMeetingLink = () => {
    const fullUrl = getMeetingShareUrl(roomId);
    navigator.clipboard?.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMeetingCode = () => {
    navigator.clipboard?.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleInlineJoinRoom = (e) => {
    e?.preventDefault();
    if (!inlineJoinInput.trim()) {
      setInlineJoinError('Please enter a meeting link or code');
      return;
    }
    const targetRoomId = parseMeetingRoomId(inlineJoinInput);
    if (!targetRoomId) {
      setInlineJoinError('Invalid meeting link or code');
      return;
    }
    setInlineJoinError('');
    if (onJoinMeeting) {
      onJoinMeeting(targetRoomId, callType);
    } else {
      window.location.search = `?meet=${encodeURIComponent(targetRoomId)}`;
    }
  };

  // Browser Autoplay Policy Audio Unlock
  const handleUnlockAudio = () => {
    document.querySelectorAll('video').forEach((v) => {
      v.muted = false;
      v.play().catch(() => {});
    });
    setNeedsAudioUnlock(false);
  };

  const totalParticipants = 1 + remoteStreams.size;

  return (
    <div className="video-meet-view">
      {/* Top Header */}
      <div className="meet-top-bar">
        <div className="meet-top-left">
          <span className="meet-room-title">
            {callPartner ? `Call with ${callPartner.name}` : `Meet Room: ${roomId}`}
          </span>
          <div className="meet-participants-pill">
            <Users size={14} />
            <span>{totalParticipants} in call</span>
          </div>
        </div>

        <div className="meet-top-right">
          {/* Copy Shareable Meeting Link */}
          <button
            className="meet-participants-pill"
            onClick={handleCopyMeetingLink}
            title="Copy full shareable meeting link"
            style={{ backgroundColor: 'rgba(112, 89, 234, 0.18)', borderColor: '#7059ea', color: '#c4b5fd' }}
          >
            <Link2 size={13} color="#818cf8" />
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            {copiedLink && <Check size={13} color="#10b981" />}
          </button>

          {/* Paste Link / Join Another Meeting */}
          <button
            className="meet-participants-pill"
            onClick={() => setShowJoinModal(true)}
            title="Paste link or code to join another meeting"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.16)', borderColor: '#10b981', color: '#6ee7b7' }}
          >
            <Plus size={13} />
            <span>Paste Link / Join</span>
          </button>

          {/* Autoplay Audio Unlock Banner */}
          {needsAudioUnlock && (
            <button
              onClick={handleUnlockAudio}
              style={{
                backgroundColor: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Volume2 size={14} />
              <span>Click to Enable Sound</span>
            </button>
          )}

          <button
            className="meet-chat-toggle-btn"
            style={{ backgroundColor: '#2f2352', borderColor: '#7059ea', color: '#c4b5fd' }}
            onClick={onOpenCollabWork}
            title="Work simultaneously on Word, Excel, or PPT"
          >
            <FileText size={14} />
            <span>Word / Excel / PPT</span>
          </button>
        </div>
      </div>

      {/* Status Notice Banner (e.g. partner hung up or camera busy) */}
      {callStatusMessage && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '8px 16px',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={15} />
          <span>{callStatusMessage}</span>
        </div>
      )}

      {/* Video Grid Stage */}
      <div
        className="meet-grid-stage gallery-mode"
        style={{
          gridTemplateColumns:
            window.innerWidth < 768
              ? '1fr'
              : totalParticipants <= 1
              ? '1fr'
              : totalParticipants === 2
              ? '1fr 1fr'
              : 'repeat(3, 1fr)',
          gridTemplateRows: window.innerWidth < 768 && totalParticipants === 2 ? '1fr 1fr' : 'auto'
        }}
      >
        {/* Local Video Tile */}
        <div className="video-tile-card active-speaker" style={{ position: 'relative' }}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video-feed-element"
            style={{ display: isVideoOff ? 'none' : 'block' }}
          />

          {isVideoOff && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                style={{ width: '84px', height: '84px', borderRadius: '50%', border: '3px solid #7059ea' }}
              />
              <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 600 }}>Camera Off</span>
            </div>
          )}

          <div className="video-tile-overlay-bottom">
            <div className="video-user-name-tag">
              <span className="speaking-indicator-wave" />
              <span>{currentUser.name} (You)</span>
            </div>
            <div className="video-tile-status-icons">
              {isMuted && (
                <span className="video-tile-status-icon muted">
                  <MicOff size={12} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Remote Video Tiles */}
        {Array.from(remoteStreams.entries()).map(([peerSocketId, rStream]) => {
          const peerUser = peersInfo.get(peerSocketId) || callPartner || { name: 'Collaborator' };
          return (
            <RemoteVideoTile
              key={peerSocketId}
              stream={rStream}
              peerUser={peerUser}
              onAutoplayBlocked={() => setNeedsAudioUnlock(true)}
            />
          );
        })}

        {/* Waiting card if alone */}
        {remoteStreams.size === 0 && (
          <div
            className="video-tile-card"
            style={{
              backgroundColor: '#161622',
              border: '2px dashed #2b2b40',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '28px 20px',
              textAlign: 'center',
              gap: '12px'
            }}
          >
            <Users size={36} color="#7059ea" />
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f3f4f6' }}>
              Waiting for other participants...
            </div>
            <p style={{ fontSize: '12.5px', color: '#9ca3af', maxWidth: '320px', lineHeight: 1.5 }}>
              Share this meeting link or room code with team members so they can join!
            </p>

            {/* Share Meeting Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                className="meet-code-pill"
                onClick={handleCopyMeetingLink}
                style={{
                  backgroundColor: 'rgba(112, 89, 234, 0.25)',
                  borderColor: '#7059ea',
                  color: '#c4b5fd'
                }}
              >
                <Link2 size={13} />
                <span>{copiedLink ? 'Link Copied!' : 'Copy Meeting Link'}</span>
                {copiedLink && <Check size={13} color="#10b981" />}
              </button>

              <button className="meet-code-pill" onClick={handleCopyMeetingCode}>
                <span>Code: {roomId}</span>
                {copiedCode ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
              </button>
            </div>

            {/* Dedicated Input Box to Paste Video Meet Link & Join Directly */}
            <div
              style={{
                width: '100%',
                maxWidth: '360px',
                marginTop: '10px',
                borderTop: '1px solid #28283a',
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#d1d5db', textAlign: 'left' }}>
                Paste video meet link or room code to join:
              </div>
              <form onSubmit={handleInlineJoinRoom} style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Paste meet link (http://localhost:5173/?meet=...)"
                  value={inlineJoinInput}
                  onChange={(e) => {
                    setInlineJoinInput(e.target.value);
                    setInlineJoinError('');
                  }}
                  className="modal-input"
                  style={{
                    flex: 1,
                    height: '38px',
                    fontSize: '12px',
                    padding: '0 10px',
                    backgroundColor: '#12121a',
                    border: '1px solid #333348',
                    borderRadius: '8px'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '0 14px',
                    height: '38px',
                    backgroundColor: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Join Meeting
                </button>
              </form>
              {inlineJoinError && (
                <div style={{ color: '#f87171', fontSize: '11px', textAlign: 'left' }}>
                  {inlineJoinError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <footer className="meet-bottom-controls-bar">
        <div className="meet-controls-left-cluster">
          <button
            className={`meet-action-pill-btn ${isMuted ? 'danger-active' : ''}`}
            onClick={handleToggleAudio}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            className={`meet-action-pill-btn ${isVideoOff ? 'danger-active' : 'active-control'}`}
            onClick={handleToggleVideo}
            title={isVideoOff ? 'Start Camera' : 'Stop Camera'}
          >
            {isVideoOff ? <VideoOff size={16} /> : <VideoIcon size={16} />}
            <span>{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
          </button>
        </div>

        <div className="meet-controls-center-cluster">
          {window.innerWidth >= 768 && (
            <button
              className={`meet-action-pill-btn ${isScreenSharing ? 'active-control' : ''}`}
              onClick={handleToggleScreenShare}
              title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            >
              <Share2 size={16} />
              <span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
            </button>
          )}
        </div>

        <div className="meet-controls-right-cluster">
          <div className="meet-call-timer-pill">
            <span className="meet-timer-dot" />
            <span>{formatTimer(callDuration)}</span>
          </div>

          <button className="meet-leave-btn" onClick={handleEndCall} title="End Call">
            <PhoneOff size={16} />
            <span>End Call</span>
          </button>
        </div>
      </footer>

      {/* Join / Switch Meeting Modal */}
      <JoinMeetingModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoinMeeting={(targetRoom, targetCallType) => {
          if (onJoinMeeting) {
            onJoinMeeting(targetRoom, targetCallType);
          } else {
            window.location.search = `?meet=${encodeURIComponent(targetRoom)}`;
          }
        }}
      />
    </div>
  );
}

function RemoteVideoTile({ stream, peerUser, onAutoplayBlocked }) {
  const videoRef = useRef(null);
  const [hasVideoTrack, setHasVideoTrack] = useState(true);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const vTrack = stream.getVideoTracks()[0];
      setHasVideoTrack(!!(vTrack && vTrack.enabled));

      const checkTracks = () => {
        const vt = stream.getVideoTracks()[0];
        setHasVideoTrack(!!(vt && vt.enabled));
      };

      stream.getVideoTracks().forEach((t) => {
        t.onmute = checkTracks;
        t.onunmute = checkTracks;
        t.onended = checkTracks;
      });

      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay blocked by browser policy:', err);
          if (onAutoplayBlocked) onAutoplayBlocked();
        });
      }
    }
  }, [stream]);

  const avatar =
    peerUser?.avatar ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(peerUser?.name || 'User')}`;

  return (
    <div className="video-tile-card active-speaker" style={{ position: 'relative' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="video-feed-element"
        style={{ display: hasVideoTrack ? 'block' : 'none' }}
      />

      {!hasVideoTrack && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <img
            src={avatar}
            alt={peerUser?.name || 'User'}
            style={{ width: '84px', height: '84px', borderRadius: '50%', border: '3px solid #10b981', objectFit: 'cover' }}
          />
          <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 600 }}>Audio Connected</span>
        </div>
      )}

      <div className="video-tile-overlay-bottom">
        <div className="video-user-name-tag">
          <span className="speaking-indicator-wave" />
          <span>{peerUser?.name || 'Collaborator'}</span>
        </div>
      </div>
    </div>
  );
}
