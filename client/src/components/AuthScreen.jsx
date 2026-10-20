import React, { useState } from 'react';
import { Sparkles, Lock, Mail, User, ArrowRight, ShieldCheck, Video, FileText, MessageSquare } from 'lucide-react';
import { authService } from '../services/auth';

export default function AuthScreen({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedColor, setSelectedColor] = useState('#7059ea');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const colors = ['#7059ea', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#3b82f6'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name || !username || !email || !password) {
          throw new Error('Please fill in all required fields');
        }
        const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=${selectedColor.replace('#', '')}`;
        const res = await authService.register({
          name,
          username,
          email,
          password,
          avatar
        });
        onAuthSuccess(res.user);
      } else {
        if (!username || !password) {
          throw new Error('Please enter your username/email and password');
        }
        const res = await authService.login({
          identifier: username,
          password
        });
        onAuthSuccess(res.user);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#0c0d12',
        color: '#f3f4f6',
        fontFamily: 'var(--font-sans)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#15151e',
          border: '1px solid #282838',
          borderRadius: '20px',
          padding: '36px 32px',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #7059ea, #ec4899)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(112, 89, 234, 0.45)'
            }}
          >
            <Sparkles size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px', marginTop: '6px' }}>
            SyncSpace
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '13.5px' }}>
            {isSignUp ? 'Create your account to start real collaboration' : 'Sign in to your real SyncSpace account'}
          </p>
        </div>

        {/* Feature Pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', backgroundColor: '#20202e', padding: '4px 10px', borderRadius: '999px', color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MessageSquare size={12} /> Real Chat
          </span>
          <span style={{ fontSize: '11px', backgroundColor: '#20202e', padding: '4px 10px', borderRadius: '999px', color: '#6ee7b7', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Video size={12} /> WebRTC Meets
          </span>
          <span style={{ fontSize: '11px', backgroundColor: '#20202e', padding: '4px 10px', borderRadius: '999px', color: '#fbcfe8', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileText size={12} /> Word · Excel · PPT
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#fca5a5',
              fontSize: '13px'
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isSignUp && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#d1d5db', marginBottom: '6px', display: 'block' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="text"
                  placeholder="e.g. Sarah Connor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1b1b26',
                    border: '1px solid #2d2d40',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#d1d5db', marginBottom: '6px', display: 'block' }}>
              Username {isSignUp ? '(unique handler)' : 'or Email'}
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                placeholder={isSignUp ? "e.g. sarah_c" : "Your username or email"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#1b1b26',
                  border: '1px solid #2d2d40',
                  borderRadius: '10px',
                  padding: '10px 12px 10px 38px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
                required
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#d1d5db', marginBottom: '6px', display: 'block' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  type="email"
                  placeholder="e.g. sarah@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#1b1b26',
                    border: '1px solid #2d2d40',
                    borderRadius: '10px',
                    padding: '10px 12px 10px 38px',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#d1d5db', marginBottom: '6px', display: 'block' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#1b1b26',
                  border: '1px solid #2d2d40',
                  borderRadius: '10px',
                  padding: '10px 12px 10px 38px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none'
                }}
                required
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#d1d5db', marginBottom: '8px', display: 'block' }}>
                Avatar Color Theme
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: selectedColor === c ? '3px solid #ffffff' : '2px solid transparent',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: '#7059ea',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(112, 89, 234, 0.4)',
              marginTop: '4px',
              transition: 'background-color 0.2s'
            }}
          >
            <span>{loading ? 'Please wait...' : isSignUp ? 'Create My Account' : 'Sign In'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Toggle between Login and Signup */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#a78bfa',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>

        {/* Multiplayer Testing Tip */}
        <div style={{ backgroundColor: '#1c1c28', padding: '12px', borderRadius: '10px', fontSize: '12px', color: '#9ca3af', lineHeight: 1.5 }}>
          💡 <strong>Multiplayer Testing Tip:</strong> Create your primary account here, then open an <strong>Incognito window</strong> or another browser to register a second account. You can then chat, video call, and edit Excel/Word/PPT simultaneously!
        </div>
      </div>
    </div>
  );
}
