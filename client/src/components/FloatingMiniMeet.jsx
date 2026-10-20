import React from 'react';
import { Maximize2, Mic, MicOff, Video, PhoneOff, X } from 'lucide-react';

export default function FloatingMiniMeet({
  onExpand,
  onClose,
  isMuted,
  onToggleMute
}) {
  return (
    <div className="floating-mini-meet">
      <div className="mini-meet-header">
        <span className="mini-meet-title">
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          Meet · Silvia Pratt
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            className="composer-tool-btn"
            style={{ width: '24px', height: '24px' }}
            onClick={onExpand}
            title="Expand to Full Meeting"
          >
            <Maximize2 size={13} />
          </button>
          <button
            className="composer-tool-btn"
            style={{ width: '24px', height: '24px' }}
            onClick={onClose}
            title="Hide PiP Window"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="mini-meet-feed">
        <img
          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=400&fit=crop&crop=faces"
          alt="Silvia Pratt"
        />
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          Silvia Pratt
        </div>
      </div>

      <div className="mini-meet-controls">
        <button
          className="composer-pill-btn"
          onClick={onToggleMute}
          style={{ fontSize: '11px', padding: '3px 8px' }}
        >
          {isMuted ? <MicOff size={13} color="#ef4444" /> : <Mic size={13} color="#10b981" />}
          <span>{isMuted ? 'Muted' : 'Mute'}</span>
        </button>

        <button
          className="composer-pill-btn"
          onClick={onExpand}
          style={{ fontSize: '11px', padding: '3px 8px', color: '#818cf8' }}
        >
          Full Meet
        </button>

        <button
          className="composer-tool-btn"
          style={{ width: '28px', height: '28px', backgroundColor: '#ef4444', color: '#fff' }}
          onClick={onClose}
          title="Hang up"
        >
          <PhoneOff size={13} />
        </button>
      </div>
    </div>
  );
}
