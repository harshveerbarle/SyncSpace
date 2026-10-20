import React, { useState, useEffect } from 'react';
import { X, Video, Phone, MessageSquare, Mail, AtSign, Info, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function ContactProfileModal({ user, userId, onClose, onStartCall }) {
  const [profile, setProfile] = useState(user || null);
  const [loading, setLoading] = useState(!user);

  useEffect(() => {
    const targetId = userId || user?.id || user?._id;
    if (targetId) {
      api.getUserProfile(targetId)
        .then((data) => {
          setProfile(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load profile:', err);
          setLoading(false);
        });
    }
  }, [userId, user]);

  const displayName = profile?.name || user?.name || 'User';
  const displayUsername = profile?.username || user?.username || 'user';
  const displayAvatar = profile?.avatar || user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
  const displayBio = profile?.bio || user?.bio || 'Hey there! I am using SyncSpace.';
  const displayEmail = profile?.email || user?.email || 'user@syncspace.app';
  const displayStatus = profile?.status || user?.status || 'offline';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 160 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '420px',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '18px',
          border: '1px solid #2d2d3f',
          backgroundColor: '#161622',
          boxShadow: '0 20px 40px rgba(0,0,0,0.7)'
        }}
      >
        {/* Banner with Top Actions */}
        <div
          style={{
            height: '110px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
            position: 'relative',
            padding: '12px'
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              backgroundColor: 'rgba(0,0,0,0.45)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)'
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Profile Card Body */}
        <div style={{ padding: '0 22px 22px 22px', position: 'relative' }}>
          {/* Avatar floating above banner */}
          <div style={{ position: 'relative', marginTop: '-55px', display: 'inline-block' }}>
            <img
              src={displayAvatar}
              alt={displayName}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid #161622',
                backgroundColor: '#1f1f2e',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: displayStatus === 'online' ? '#10b981' : '#6b7280',
                border: '3px solid #161622'
              }}
              title={displayStatus === 'online' ? 'Online Now' : 'Offline'}
            />
          </div>

          {/* Name & Username */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                {displayName}
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: displayStatus === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.2)',
                  color: displayStatus === 'online' ? '#34d399' : '#9ca3af',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  textTransform: 'capitalize'
                }}
              >
                {displayStatus}
              </span>
            </div>

            <div style={{ fontSize: '13px', color: '#818cf8', marginTop: '2px', fontWeight: 600 }}>
              @{displayUsername}
            </div>
          </div>

          {/* Bio Section */}
          <div
            style={{
              marginTop: '16px',
              backgroundColor: '#1f1f2e',
              border: '1px solid #2d2d42',
              borderRadius: '12px',
              padding: '14px 16px'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Info size={12} color="#a5b4fc" />
              <span>About & Status</span>
            </div>
            <div style={{ fontSize: '13.5px', color: '#e2e8f0', lineHeight: 1.5, wordBreak: 'break-word' }}>
              {displayBio}
            </div>
          </div>

          {/* Contact Details Card */}
          <div
            style={{
              marginTop: '12px',
              backgroundColor: '#1a1a27',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#cbd5e1' }}>
              <Mail size={15} color="#9ca3af" />
              <span>{displayEmail}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', color: '#cbd5e1' }}>
              <ShieldCheck size={15} color="#10b981" />
              <span>Verified SyncSpace Member</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '18px' }}>
            <button
              onClick={() => {
                onClose();
                if (onStartCall) onStartCall(profile || user, 'video');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Video size={16} />
              <span>Video Meet</span>
            </button>

            <button
              onClick={() => {
                onClose();
                if (onStartCall) onStartCall(profile || user, 'audio');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '10px',
                backgroundColor: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: '#22d3ee',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Phone size={15} />
              <span>Audio Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
