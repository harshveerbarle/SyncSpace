import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';

export default function IncomingCallModal({ callData, onAccept, onReject }) {
  if (!callData) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 200 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '380px',
          textAlign: 'center',
          alignItems: 'center',
          padding: '32px 24px',
          animation: 'pulse-speaker 1.5s infinite'
        }}
      >
        <img
          src={callData.caller?.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=Caller'}
          alt={callData.caller?.name}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: '3px solid #10b981',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)',
            marginBottom: '8px'
          }}
        />

        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', fontWeight: 700, color: '#fff' }}>
          {callData.caller?.name || 'Incoming Call'}
        </h3>
        <p style={{ color: '#10b981', fontSize: '13px', fontWeight: 600 }}>
          Incoming {callData.callType === 'audio' ? 'Audio' : 'Video'} Call...
        </p>

        <div style={{ display: 'flex', gap: '24px', marginTop: '20px' }}>
          <button
            onClick={onReject}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)'
            }}
            title="Decline"
          >
            <PhoneOff size={24} />
          </button>

          <button
            onClick={onAccept}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.5)'
            }}
            title="Accept"
          >
            {callData.callType === 'audio' ? <Phone size={24} /> : <Video size={24} />}
          </button>
        </div>
      </div>
    </div>
  );
}
