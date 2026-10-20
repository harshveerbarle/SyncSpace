import React, { useState } from 'react';
import {
  MessageSquare,
  FileText,
  Video,
  LogOut,
  HelpCircle,
  Camera,
  Sparkles,
  Link2
} from 'lucide-react';
import ProfileModal from './ProfileModal';

export default function PrimaryDock({
  currentView,
  setCurrentView,
  currentUser,
  setCurrentUser,
  onLogout,
  activeCall,
  onOpenJoinMeeting
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <>
      <aside className="primary-dock" aria-label="Main Navigation">
        <div className="dock-top-group">
          {/* Brand Logo */}
          <div className="dock-brand-logo" onClick={() => setCurrentView('chat')} title="SyncSpace">
            <Sparkles size={22} />
          </div>

          {/* User Profile Avatar */}
          <div
            className="dock-avatar-profile"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title={`Logged in as ${currentUser.name} (@${currentUser.username})`}
          >
            <img src={currentUser.avatar} alt={currentUser.name} className="dock-avatar-img" />
            <span className="dock-status-dot" />
          </div>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: '70px',
                left: '75px',
                backgroundColor: '#1c1c28',
                border: '1px solid #333346',
                borderRadius: '12px',
                padding: '12px',
                zIndex: 100,
                width: '230px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #28283a', paddingBottom: '8px' }}>
                <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{currentUser.name}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>@{currentUser.username}</div>
                </div>
              </div>

              {/* Settings & Profile Button */}
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  setShowEditProfileModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'rgba(112, 89, 234, 0.2)',
                  color: '#c4b5fd',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <Camera size={15} />
                <span>Settings & Profile</span>
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="dock-nav-items">
            {/* 1. Chats & Groups (WhatsApp style) */}
            <button
              className={`dock-btn ${currentView === 'chat' ? 'active' : ''}`}
              onClick={() => setCurrentView('chat')}
              title="Chats & Groups"
            >
              <MessageSquare size={20} />
            </button>

            {/* 2. Collaborative Work (Word, Excel, PPT) */}
            <button
              className={`dock-btn ${currentView === 'collab' ? 'active' : ''}`}
              onClick={() => setCurrentView('collab')}
              title="Word, Excel & PPT Collaborative Workspaces"
            >
              <FileText size={20} />
            </button>

            {/* 3. Video Meets (WebRTC Calls) */}
            <button
              className={`dock-btn ${currentView === 'meet' ? 'active' : ''}`}
              onClick={() => setCurrentView('meet')}
              title="Video Calls & Conferences"
            >
              <Video size={20} />
              {activeCall && <span className="dock-badge" style={{ backgroundColor: '#10b981' }} />}
            </button>

            {/* 4. Join Meeting via Link or Room Code */}
            <button
              className="dock-btn"
              onClick={onOpenJoinMeeting}
              title="Join Meeting via Link or Room Code"
              style={{ color: '#10b981' }}
            >
              <Link2 size={19} />
            </button>
          </div>
        </div>

        {/* Dock Bottom Group */}
        <div className="dock-bottom-group">
          <button className="dock-btn" title="Help & Information" onClick={() => setShowHelpModal(true)}>
            <HelpCircle size={19} />
          </button>

          <div className="dock-brand-text">Sync</div>
        </div>

        {/* Help Modal */}
        {showHelpModal && (
          <div className="modal-overlay" onClick={() => setShowHelpModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">SyncSpace Real-Time Platform</h3>
                <button className="composer-tool-btn" onClick={() => setShowHelpModal(false)}>✕</button>
              </div>
              <div style={{ color: '#d1d5db', fontSize: '13px', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p>
                  <strong>SyncSpace</strong> is connected to your MongoDB Atlas cloud database:
                </p>
                <div>
                  <strong>💬 Real Messaging:</strong> Direct WhatsApp-style 1-on-1 chats and group channels with live typing indicators and blue read ticks.
                </div>
                <div>
                  <strong>📹 Real Video Calling:</strong> Native WebRTC peer-to-peer audio & video streaming with incoming call ringing and screen sharing.
                </div>
                <div>
                  <strong>📊 Word, Excel & PPT Workspaces:</strong> Real-time multiplayer document synchronization, spreadsheet cell sync, and slide presentations.
                </div>
              </div>
              <div className="modal-actions">
                <button className="doc-share-btn" onClick={() => setShowHelpModal(false)}>Got It!</button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <ProfileModal
          currentUser={currentUser}
          onClose={() => setShowEditProfileModal(false)}
          onProfileUpdated={(updated) => {
            if (setCurrentUser) setCurrentUser(updated);
          }}
        />
      )}
    </>
  );
}
