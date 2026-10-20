import React, { useState } from 'react';
import { Video, Phone, Link2, Clipboard, Sparkles, X, ArrowRight, AlertCircle, Check } from 'lucide-react';
import { parseMeetingRoomId } from '../utils/meetingUtils';

export default function JoinMeetingModal({ isOpen, onClose, onJoinMeeting }) {
  const [inputVal, setInputVal] = useState('');
  const [callType, setCallType] = useState('video'); // 'video' | 'audio'
  const [error, setError] = useState('');
  const [pastedNotice, setPastedNotice] = useState(false);

  if (!isOpen) return null;

  const parsedRoom = parseMeetingRoomId(inputVal);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputVal(text.trim());
          setError('');
          setPastedNotice(true);
          setTimeout(() => setPastedNotice(false), 2000);
        }
      } else {
        setError('Clipboard access not permitted. Please paste manually into the input box.');
      }
    } catch (e) {
      setError('Could not access clipboard automatically. Please press Ctrl+V to paste.');
    }
  };

  const handleJoin = (e) => {
    e?.preventDefault();
    if (!inputVal.trim()) {
      setError('Please paste a meeting link or enter a room code');
      return;
    }

    const roomId = parseMeetingRoomId(inputVal);
    if (!roomId) {
      setError('Invalid meeting link or room code. Please check and try again.');
      return;
    }

    setError('');
    onJoinMeeting(roomId, callType);
    onClose();
  };

  const handleStartInstant = () => {
    const instantRoomId = `meet_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    onJoinMeeting(instantRoomId, callType);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '92%',
          background: 'linear-gradient(145deg, #181824 0%, #111118 100%)',
          border: '1px solid #2e2e42',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
          borderRadius: '16px',
          padding: '24px'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7059ea 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(112, 89, 234, 0.4)'
              }}
            >
              <Video size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f3f4f6', margin: 0 }}>
                Join Video Meeting
              </h3>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0 0' }}>
                Paste a meeting link or enter room code
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="composer-tool-btn"
            style={{ width: '32px', height: '32px', borderRadius: '50%', color: '#9ca3af' }}
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '10px 14px',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Input Box with Paste Button */}
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#d1d5db',
                marginBottom: '6px'
              }}
            >
              Meeting Link or Room Code
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Link2
                size={16}
                color="#7059ea"
                style={{ position: 'absolute', left: '12px', pointerEvents: 'none' }}
              />
              <input
                type="text"
                autoFocus
                placeholder="Paste link (http://localhost:5173/?meet=...) or enter room code"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  setError('');
                }}
                className="modal-input"
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  paddingRight: '100px',
                  height: '44px',
                  fontSize: '13px',
                  backgroundColor: '#14141e',
                  border: '1px solid #333348',
                  borderRadius: '10px'
                }}
              />
              <button
                type="button"
                onClick={handlePasteClipboard}
                title="Paste from Clipboard"
                style={{
                  position: 'absolute',
                  right: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  backgroundColor: pastedNotice ? '#10b981' : '#232332',
                  color: '#fff',
                  border: '1px solid #3d3d52',
                  borderRadius: '7px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {pastedNotice ? <Check size={12} /> : <Clipboard size={12} />}
                <span>{pastedNotice ? 'Pasted!' : 'Paste'}</span>
              </button>
            </div>

            {/* Parsed Code Preview Tag */}
            {parsedRoom && parsedRoom !== inputVal && (
              <div
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#10b981'
                }}
              >
                <Check size={13} />
                <span>
                  Extracted Room Code: <strong>{parsedRoom}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Call Mode Toggle (Video / Audio) */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#d1d5db',
                marginBottom: '6px'
              }}
            >
              Call Preferences
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCallType('video')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: '10px',
                  border: callType === 'video' ? '2px solid #7059ea' : '1px solid #2a2a3c',
                  backgroundColor: callType === 'video' ? 'rgba(112, 89, 234, 0.2)' : '#161622',
                  color: callType === 'video' ? '#c4b5fd' : '#9ca3af',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Video size={16} color={callType === 'video' ? '#818cf8' : '#9ca3af'} />
                <span>Video Meeting</span>
              </button>

              <button
                type="button"
                onClick={() => setCallType('audio')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: '10px',
                  border: callType === 'audio' ? '2px solid #06b6d4' : '1px solid #2a2a3c',
                  backgroundColor: callType === 'audio' ? 'rgba(6, 182, 212, 0.2)' : '#161622',
                  color: callType === 'audio' ? '#67e8f9' : '#9ca3af',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Phone size={15} color={callType === 'audio' ? '#22d3ee' : '#9ca3af'} />
                <span>Audio Only</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
              }}
            >
              <span>Join Meeting Now</span>
              <ArrowRight size={16} />
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                margin: '4px 0',
                color: '#6b7280',
                fontSize: '11.5px'
              }}
            >
              <div style={{ flex: 1, height: '1px', backgroundColor: '#28283a' }} />
              <span>OR</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#28283a' }} />
            </div>

            <button
              type="button"
              onClick={handleStartInstant}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '10px',
                border: '1px solid #3b3b52',
                backgroundColor: '#1c1c2b',
                color: '#e2e8f0',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Sparkles size={15} color="#c084fc" />
              <span>Start New Instant Meeting</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
