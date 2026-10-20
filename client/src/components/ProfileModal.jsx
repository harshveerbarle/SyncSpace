import React, { useState } from 'react';
import { Camera, Upload, Check, X, Sparkles, User, Mail, AtSign, Palette, FileText } from 'lucide-react';
import { api } from '../services/api';
import { authService } from '../services/auth';

export default function ProfileModal({ currentUser, onClose, onProfileUpdated }) {
  const [name, setName] = useState(currentUser.name || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [bio, setBio] = useState(currentUser.bio || 'Hey there! I am using SyncSpace.');
  const [avatarPreview, setAvatarPreview] = useState(
    currentUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name || 'User')}&backgroundColor=7059ea`
  );
  const [color, setColor] = useState(currentUser.color || '#7059ea');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Preset avatar styles
  const avatarColors = [
    { name: 'Indigo', hex: '7059ea' },
    { name: 'Pink', hex: 'ec4899' },
    { name: 'Cyan', hex: '06b6d4' },
    { name: 'Emerald', hex: '10b981' },
    { name: 'Amber', hex: 'f59e0b' },
    { name: 'Blue', hex: '3b82f6' },
    { name: 'Purple', hex: '8b5cf6' },
    { name: 'Rose', hex: 'f43f5e' }
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP, GIF)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be under 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (hex) => {
    setColor(`#${hex}`);
    const newAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || currentUser.name)}&backgroundColor=${hex}`;
    setAvatarPreview(newAvatar);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Display name is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: name.trim(),
        username: (username || currentUser.username).trim(),
        email: (email || currentUser.email).trim(),
        avatar: avatarPreview,
        bio: bio.trim(),
        color
      };

      const res = await api.updateProfile(payload);

      const updatedUser = {
        ...currentUser,
        ...(res.user || payload)
      };

      authService.setSession(authService.getToken(), updatedUser);
      if (onProfileUpdated) onProfileUpdated(updatedUser);
      setSuccess('Profile & settings updated successfully!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 170 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#161622',
          border: '1px solid #2d2d42',
          borderRadius: '18px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.8)'
        }}
      >
        <div className="modal-header" style={{ paddingBottom: '14px', borderBottom: '1px solid #242436' }}>
          <div>
            <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 700 }}>
              Profile & Settings
            </h3>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
              Update your photo, bio, and personal details
            </div>
          </div>
          <button className="composer-tool-btn" onClick={onClose} title="Close">
            <X size={17} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: '8px', color: '#fca5a5', fontSize: '13px', marginTop: '12px' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px 14px', borderRadius: '8px', color: '#6ee7b7', fontSize: '13px', marginTop: '12px' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          {/* Avatar Picture Section */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              backgroundColor: '#1b1b2a',
              borderRadius: '14px',
              border: '1px solid #29293e'
            }}
          >
            <div style={{ position: 'relative', width: '96px', height: '96px' }}>
              <img
                src={avatarPreview}
                alt={name}
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #7059ea',
                  boxShadow: '0 6px 20px rgba(112, 89, 234, 0.35)'
                }}
              />
              <label
                htmlFor="avatar-file-input"
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  backgroundColor: '#7059ea',
                  color: '#ffffff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px solid #161622',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  transition: 'transform 0.15s'
                }}
                title="Upload Profile Picture"
              >
                <Camera size={15} />
              </label>
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Profile Picture</div>
              <div style={{ fontSize: '11.5px', color: '#9ca3af', marginTop: '2px' }}>
                Click the camera icon to upload from your gallery or choose a color:
              </div>
            </div>

            {/* Color Theme Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {avatarColors.map((col) => (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => handleSelectPreset(col.hex)}
                  title={col.name}
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: `#${col.hex}`,
                    border: color === `#${col.hex}` ? '2px solid #ffffff' : '2px solid transparent',
                    boxShadow: color === `#${col.hex}` ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.15s'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label style={{ fontSize: '12.5px', color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <User size={14} color="#818cf8" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              className="modal-input"
              style={{ width: '100%', fontSize: '13.5px' }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>

          {/* Username */}
          <div>
            <label style={{ fontSize: '12.5px', color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <AtSign size={14} color="#818cf8" />
              <span>Username</span>
            </label>
            <input
              type="text"
              className="modal-input"
              style={{ width: '100%', fontSize: '13.5px' }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username (e.g. harsh)"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize: '12.5px', color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Mail size={14} color="#818cf8" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              className="modal-input"
              style={{ width: '100%', fontSize: '13.5px' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          {/* Bio / About */}
          <div>
            <label style={{ fontSize: '12.5px', color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <FileText size={14} color="#818cf8" />
              <span>Bio & Status</span>
            </label>
            <textarea
              className="modal-input"
              style={{ width: '100%', minHeight: '65px', fontSize: '13px', lineHeight: 1.5, resize: 'vertical' }}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a short bio or status message (e.g. Building SyncSpace 🚀 Available for video calls)..."
              rows={3}
            />
          </div>

          {/* Modal Actions */}
          <div className="modal-actions" style={{ marginTop: '8px', borderTop: '1px solid #242436', paddingTop: '14px' }}>
            <button type="button" className="composer-pill-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="doc-share-btn"
              disabled={loading}
              style={{
                backgroundColor: '#7059ea',
                color: '#fff',
                padding: '9px 20px',
                borderRadius: '8px',
                fontWeight: 600
              }}
            >
              {loading ? 'Saving Changes...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
