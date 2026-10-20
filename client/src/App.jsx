import React, { useState, useEffect } from 'react';
import { authService } from './services/auth';
import socket from './services/socket';
import AuthScreen from './components/AuthScreen';
import PrimaryDock from './components/PrimaryDock';
import RealChatView from './components/RealChatView';
import CollabWorkView from './components/CollabWorkView';
import RealWebRTCCallView from './components/RealWebRTCCallView';
import IncomingCallModal from './components/IncomingCallModal';
import JoinMeetingModal from './components/JoinMeetingModal';
import { parseMeetingRoomId } from './utils/meetingUtils';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentView, setCurrentView] = useState('chat'); // 'chat' | 'collab' | 'meet'
  const [showGlobalJoinModal, setShowGlobalJoinModal] = useState(false);

  // Call States
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null); // { roomId, callPartner, callType }

  // Check existing session
  useEffect(() => {
    authService.getMe()
      .then((user) => {
        if (user) {
          setCurrentUser(user);
        }
      })
      .catch((err) => console.log('No active session:', err))
      .finally(() => setLoadingAuth(false));
  }, []);

  // Connect user to socket when authenticated
  useEffect(() => {
    if (!currentUser) return;

    const token = authService.getToken();
    socket.emit('auth:connect', token);

    // Listen for incoming call notifications
    const handleIncomingCall = (callData) => {
      console.log('📞 Incoming call:', callData);
      setIncomingCall(callData);
    };

    const handleCallAccepted = ({ roomId, responder }) => {
      setActiveCall({ roomId, callPartner: responder, callType: 'video' });
      setCurrentView('meet');
    };

    const handleCallRejected = () => {
      alert('The call was declined by user.');
      setActiveCall(null);
    };

    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:rejected', handleCallRejected);

    return () => {
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:rejected', handleCallRejected);
    };
  }, [currentUser]);

  // Check URL query parameters for ?meet=... to auto-join meeting via link
  useEffect(() => {
    if (!currentUser) return;
    const urlParams = new URLSearchParams(window.location.search);
    const meetParam = urlParams.get('meet') || urlParams.get('room');
    if (meetParam) {
      const cleanRoom = parseMeetingRoomId(meetParam);
      if (cleanRoom) {
        setActiveCall({
          roomId: cleanRoom,
          callPartner: null,
          callType: 'video'
        });
        setCurrentView('meet');
      }
    }
  }, [currentUser]);

  // Auth Success
  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    const token = authService.getToken();
    socket.emit('auth:connect', token);
  };

  // Logout
  const handleLogout = () => {
    authService.clearSession();
    setCurrentUser(null);
    setActiveCall(null);
    setIncomingCall(null);
  };

  const [selectedCollabChat, setSelectedCollabChat] = useState(null);

  // Direct Join Meeting handler for pasted links or room codes
  const handleJoinMeeting = (linkOrCode, callType = 'video') => {
    const roomId = parseMeetingRoomId(linkOrCode);
    if (!roomId) return;

    setActiveCall({
      roomId,
      callPartner: null,
      callType
    });
    setCurrentView('meet');
  };

  // Start outgoing call or join active meeting
  const handleStartCall = (chat, callType = 'video', existingRoomId = null) => {
    const roomId =
      existingRoomId ||
      (chat?.activeMeeting ? chat.activeMeeting.roomId : `room_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);
    const targetUserId = chat?.type === 'direct' ? chat.partnerId : null;

    if (!existingRoomId && !chat?.activeMeeting && chat?.id) {
      socket.emit('call:initiate', {
        chatId: chat.id,
        targetUserId,
        callType,
        roomId
      });
    }

    setActiveCall({
      roomId,
      chatId: chat?.id || null,
      callPartner:
        chat?.type === 'direct'
          ? (chat.partner || { name: chat.name, avatar: chat.avatar })
          : { name: chat?.name || 'Meeting', icon: chat?.icon || '📹' },
      callType
    });
    setCurrentView('meet');
  };

  // Accept incoming call
  const handleAcceptCall = () => {
    if (!incomingCall) return;
    socket.emit('call:accept', {
      roomId: incomingCall.roomId,
      callerId: incomingCall.caller.id,
      chatId: incomingCall.chatId
    });
    setActiveCall({
      roomId: incomingCall.roomId,
      chatId: incomingCall.chatId,
      callPartner: incomingCall.caller,
      callType: incomingCall.callType
    });
    setIncomingCall(null);
    setCurrentView('meet');
  };

  // Decline incoming call
  const handleRejectCall = () => {
    if (!incomingCall) return;
    socket.emit('call:reject', {
      callerId: incomingCall.caller.id,
      chatId: incomingCall.chatId,
      callType: incomingCall.callType
    });
    setIncomingCall(null);
  };

  // End active call
  const handleEndCall = () => {
    setActiveCall(null);
    setCurrentView('chat');
  };

  if (loadingAuth) {
    return (
      <div style={{ height: '100vh', width: '100vw', backgroundColor: '#0e0e12', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontFamily: 'var(--font-sans)' }}>
        Loading SyncSpace...
      </div>
    );
  }

  // If not logged in, show Auth Screen
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="syncspace-root">
      {/* Primary Left Navigation Dock */}
      <PrimaryDock
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        onLogout={handleLogout}
        activeCall={activeCall}
        onOpenJoinMeeting={() => setShowGlobalJoinModal(true)}
      />

      {/* Main Selected View */}
      {currentView === 'chat' && (
        <RealChatView
          currentUser={currentUser}
          onStartCall={handleStartCall}
          onOpenCollabWork={(chat) => {
            setSelectedCollabChat(chat);
            setCurrentView('collab');
          }}
          onProfileUpdated={(updated) => setCurrentUser(updated)}
          onJoinMeeting={handleJoinMeeting}
        />
      )}

      {currentView === 'collab' && (
        <CollabWorkView
          currentUser={currentUser}
          activeChat={selectedCollabChat}
          onSwitchChat={(chat) => setSelectedCollabChat(chat)}
          onLaunchMeeting={() => {
            if (selectedCollabChat) {
              handleStartCall(selectedCollabChat, 'video');
            } else {
              const roomId = `collab_${Date.now()}`;
              setActiveCall({ roomId, callPartner: null, callType: 'video' });
              setCurrentView('meet');
            }
          }}
        />
      )}

      {currentView === 'meet' && (
        <RealWebRTCCallView
          currentUser={currentUser}
          roomId={activeCall?.roomId || 'syncspace-general-room'}
          callPartner={activeCall?.callPartner}
          callType={activeCall?.callType || 'video'}
          chatId={activeCall?.chatId}
          onEndCall={handleEndCall}
          onOpenCollabWork={() => setCurrentView('collab')}
          onJoinMeeting={handleJoinMeeting}
        />
      )}

      {/* Incoming Call Ringing Modal */}
      {incomingCall && (
        <IncomingCallModal
          callData={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Global Join Meeting Modal */}
      <JoinMeetingModal
        isOpen={showGlobalJoinModal}
        onClose={() => setShowGlobalJoinModal(false)}
        onJoinMeeting={handleJoinMeeting}
      />
    </div>
  );
}
