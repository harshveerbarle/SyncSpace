import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Share2,
  Disc,
  MoreHorizontal,
  PhoneOff,
  LayoutGrid,
  Square,
  MessageSquare,
  Users,
  Copy,
  Check,
  Maximize2,
  Volume2
} from 'lucide-react';
import socket from '../services/socket';

export default function VideoMeetView({
  currentUser,
  onLeaveMeeting,
  onOpenDoc
}) {
  const [viewMode, setViewMode] = useState('gallery'); // 'gallery' | 'speaker'
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoStopped, setIsVideoStopped] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showInCallChat, setShowInCallChat] = useState(false);
  const [callTimerSeconds, setCallTimerSeconds] = useState(120); // 02:00 start
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState('Silvia Pratt');
  const [inCallMessages, setInCallMessages] = useState([
    { sender: 'George White', text: 'Welcome everyone! Silvia, please go ahead with the walkthrough.', time: '01:10' },
    { sender: 'Silvia Pratt', text: 'Thanks George. Sharing the updated wireframes now.', time: '01:45' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Local webcam stream
  const localVideoRef = useRef(null);
  const screenShareVideoRef = useRef(null);
  const [hasRealCamera, setHasRealCamera] = useState(false);

  // Participants matching Image 3
  const [participants, setParticipants] = useState([
    {
      id: 'p-silvia',
      name: 'Silvia Pratt',
      role: 'Speaker',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=600&fit=crop&crop=faces',
      isSpeaking: true,
      isMuted: false,
      isVideoOn: true
    },
    {
      id: 'p-erica',
      name: 'Erica Badhoo',
      role: 'Participant',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&h=600&fit=crop&crop=faces',
      isSpeaking: false,
      isMuted: false,
      isVideoOn: true
    },
    {
      id: 'p-latisha',
      name: 'Latisha Bristoll',
      role: 'Participant',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=600&fit=crop&crop=faces',
      isSpeaking: false,
      isMuted: false,
      isVideoOn: true
    },
    {
      id: 'p-george',
      name: 'George White - Host',
      role: 'Host',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&crop=faces',
      isSpeaking: false,
      isMuted: false,
      isVideoOn: true
    },
    {
      id: 'p-dominic',
      name: 'Dominic Chain',
      role: 'Participant',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=600&fit=crop&crop=faces',
      isSpeaking: false,
      isMuted: false,
      isVideoOn: true
    }
  ]);

  // Meeting timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format MM:SS
  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Attempt real webcam if user enables camera
  useEffect(() => {
    let stream = null;
    if (!isVideoStopped) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((s) => {
          stream = s;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = s;
            setHasRealCamera(true);
          }
        })
        .catch(() => {
          // Camera access unavailable or denied; graceful fallback
          setHasRealCamera(false);
        });
    } else {
      if (localVideoRef.current?.srcObject) {
        localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        localVideoRef.current.srcObject = null;
      }
      setHasRealCamera(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isVideoStopped]);

  // Real Screen Share support
  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        if (screenShareVideoRef.current) {
          screenShareVideoRef.current.srcObject = displayStream;
        }
        setIsScreenSharing(true);
        displayStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } catch (err) {
        // User cancelled screen share or not supported
        setIsScreenSharing(false);
      }
    } else {
      if (screenShareVideoRef.current?.srcObject) {
        screenShareVideoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        screenShareVideoRef.current.srcObject = null;
      }
      setIsScreenSharing(false);
    }
  };

  const handleCopyMeetingCode = () => {
    navigator.clipboard?.writeText('2844 82 9242');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendInCallChat = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;
    const msg = {
      sender: currentUser.name,
      text: chatInput.trim(),
      time: formatTimer(callTimerSeconds)
    };
    setInCallMessages((prev) => [...prev, msg]);
    setChatInput('');
  };

  return (
    <div className="video-meet-view">
      {/* ----------------- Meet Top Navigation Bar (Image 3) ----------------- */}
      <div className="meet-top-bar">
        <div className="meet-top-left">
          <span className="meet-room-title">SyncSpace Strategy & Sprint</span>
          <div className="meet-participants-pill" title="Participants List">
            <Users size={14} />
            <span>Participants (6)</span>
          </div>
        </div>

        {/* View Switcher: Gallery View vs Speaker View */}
        <div className="meet-top-center">
          <button
            className={`meet-view-toggle-btn ${viewMode === 'gallery' ? 'active' : ''}`}
            onClick={() => setViewMode('gallery')}
          >
            <LayoutGrid size={15} />
            <span>Gallery View</span>
          </button>
          <button
            className={`meet-view-toggle-btn ${viewMode === 'speaker' ? 'active' : ''}`}
            onClick={() => setViewMode('speaker')}
          >
            <Square size={15} />
            <span>Speaker View</span>
          </button>
        </div>

        <div className="meet-top-right">
          <button
            className="meet-chat-toggle-btn"
            style={{ backgroundColor: '#2f2352', borderColor: '#7059ea', color: '#c4b5fd' }}
            onClick={onOpenDoc}
            title="Open Collaborative Document on Shared Screen"
          >
            📝 Shared Document
          </button>

          <button
            className="meet-chat-toggle-btn"
            onClick={() => setShowInCallChat(!showInCallChat)}
            title="Toggle in-call chat"
          >
            <MessageSquare size={14} />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* ----------------- Screen Share Banner / Stage if Active ----------------- */}
      {isScreenSharing && (
        <div style={{ padding: '8px 24px', backgroundColor: '#1a1a2b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2e2e42' }}>
          <span style={{ fontSize: '12.5px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            You are sharing your screen with all participants
          </span>
          <button className="composer-pill-btn" onClick={handleToggleScreenShare}>Stop Screen Share</button>
        </div>
      )}

      {/* ----------------- Video Grid Stage (Image 3) ----------------- */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className={`meet-grid-stage ${viewMode === 'gallery' ? 'gallery-mode' : ''}`}>
          {/* Tile 1: Silvia Pratt (Active Speaker highlighted with green ring!) */}
          <div className="video-tile-card active-speaker">
            <img
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=600&fit=crop&crop=faces"
              alt="Silvia Pratt"
              className="video-feed-img"
            />
            <div className="video-tile-overlay-bottom">
              <div className="video-user-name-tag">
                <span className="speaking-indicator-wave" />
                <span>Silvia Pratt</span>
              </div>
              <div className="video-tile-status-icons">
                <span className="video-tile-status-icon" title="Mic active">
                  <Mic size={12} color="#10b981" />
                </span>
              </div>
            </div>
          </div>

          {/* Tile 2: Erica Badhoo */}
          <div className="video-tile-card">
            <img
              src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&h=600&fit=crop&crop=faces"
              alt="Erica Badhoo"
              className="video-feed-img"
            />
            <div className="video-tile-overlay-bottom">
              <div className="video-user-name-tag">
                <span>Erica Badhoo</span>
              </div>
            </div>
          </div>

          {/* Tile 3: Latisha Bristoll */}
          <div className="video-tile-card">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=600&fit=crop&crop=faces"
              alt="Latisha Bristoll"
              className="video-feed-img"
            />
            <div className="video-tile-overlay-bottom">
              <div className="video-user-name-tag">
                <span>Latisha Bristoll</span>
              </div>
            </div>
          </div>

          {/* Tile 4: George White - Host */}
          <div className="video-tile-card">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&crop=faces"
              alt="George White"
              className="video-feed-img"
            />
            <div className="video-tile-overlay-bottom">
              <div className="video-user-name-tag">
                <span>George White · Host</span>
              </div>
            </div>
          </div>

          {/* Tile 5: Dominic Chain */}
          <div className="video-tile-card">
            <img
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=600&fit=crop&crop=faces"
              alt="Dominic Chain"
              className="video-feed-img"
            />
            <div className="video-tile-overlay-bottom">
              <div className="video-user-name-tag">
                <span>Dominic Chain</span>
              </div>
            </div>
          </div>

          {/* Tile 6: You (Current User with webcam or dynamic avatar) */}
          <div className="video-tile-card" style={{ backgroundColor: '#181822' }}>
            {hasRealCamera && !isVideoStopped ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="video-feed-element"
              />
            ) : !isVideoStopped ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="video-feed-img"
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid #4a4a60' }}
                />
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>Camera Off</span>
              </div>
            )}

            <div className="video-tile-overlay-bottom">
              <div className="video-user-name-tag">
                <span>{currentUser.name} (You)</span>
              </div>
              <div className="video-tile-status-icons">
                {isAudioMuted && (
                  <span className="video-tile-status-icon muted" title="Muted">
                    <MicOff size={12} />
                  </span>
                )}
                {isVideoStopped && (
                  <span className="video-tile-status-icon muted" title="Video stopped">
                    <VideoOff size={12} />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ----------------- In-Call Chat Drawer ----------------- */}
        {showInCallChat && (
          <div
            style={{
              width: '300px',
              backgroundColor: '#181824',
              borderLeft: '1px solid #28283a',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Meeting Chat</span>
              <button className="composer-tool-btn" onClick={() => setShowInCallChat(false)}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {inCallMessages.map((m, i) => (
                <div key={i} style={{ backgroundColor: '#212130', padding: '8px 10px', borderRadius: '8px', fontSize: '12.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a78bfa', fontWeight: 600, marginBottom: '2px' }}>
                    <span>{m.sender}</span>
                    <span style={{ color: '#6b7280', fontSize: '10px' }}>{m.time}</span>
                  </div>
                  <div style={{ color: '#e2e8f0' }}>{m.text}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                placeholder="Message meeting..."
                className="modal-input"
                style={{ flex: 1, fontSize: '12.5px', padding: '6px 10px' }}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendInCallChat();
                }}
              />
              <button className="doc-share-btn" style={{ padding: '6px 12px' }} onClick={handleSendInCallChat}>
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- Bottom Meeting Controls Bar (Image 3) ----------------- */}
      <footer className="meet-bottom-controls-bar">
        {/* Left Controls: Audio / Video */}
        <div className="meet-controls-left-cluster">
          <button
            className={`meet-action-pill-btn ${isAudioMuted ? 'danger-active' : ''}`}
            onClick={() => setIsAudioMuted(!isAudioMuted)}
          >
            {isAudioMuted ? <MicOff size={16} /> : <Mic size={16} />}
            <span>{isAudioMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            className={`meet-action-pill-btn ${isVideoStopped ? 'danger-active' : 'active-control'}`}
            onClick={() => setIsVideoStopped(!isVideoStopped)}
          >
            {isVideoStopped ? <VideoOff size={16} /> : <VideoIcon size={16} />}
            <span>{isVideoStopped ? 'Start Video' : 'Stop Video'}</span>
          </button>
        </div>

        {/* Center Controls: Share Screen, Record, More */}
        <div className="meet-controls-center-cluster">
          <button
            className={`meet-action-pill-btn ${isScreenSharing ? 'active-control' : ''}`}
            onClick={handleToggleScreenShare}
          >
            <Share2 size={16} />
            <span>{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
          </button>

          <button
            className={`meet-action-pill-btn ${isRecording ? 'danger-active' : ''}`}
            onClick={() => setIsRecording(!isRecording)}
          >
            <Disc size={16} />
            <span>{isRecording ? 'Recording' : 'Record'}</span>
          </button>

          <button className="header-action-icon-btn" title="More Meeting Options">
            <MoreHorizontal size={18} />
          </button>
        </div>

        {/* Right Controls: Timer, Meeting Code, Leave Call (Image 3) */}
        <div className="meet-controls-right-cluster">
          {/* Duration Timer (Image 3: 02:00) */}
          <div className="meet-call-timer-pill">
            <span className="meet-timer-dot" />
            <span>{formatTimer(callTimerSeconds)}</span>
          </div>

          {/* Meeting Code Pill (Image 3: "2844 82 9242") */}
          <button
            className="meet-code-pill"
            onClick={handleCopyMeetingCode}
            title="Click to copy meeting code"
          >
            <span>2844 82 9242</span>
            {copiedCode ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          </button>

          {/* Red End Call Button (Image 3) */}
          <button className="meet-leave-btn" onClick={onLeaveMeeting}>
            <PhoneOff size={16} />
            <span>Leave</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
