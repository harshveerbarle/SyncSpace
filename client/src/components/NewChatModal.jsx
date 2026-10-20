import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Search, Check, X } from 'lucide-react';
import { api } from '../services/api';

export default function NewChatModal({ onClose, onChatCreated }) {
  const [tab, setTab] = useState('direct'); // 'direct' | 'group'
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState('👥');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getUsers()
      .then((data) => {
        setUsers(data || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleStartDirectChat = async (targetUserId) => {
    try {
      const chat = await api.createDirectChat(targetUserId);
      onChatCreated(chat);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    try {
      const newGroup = await api.createGroupChat(groupName.trim(), selectedUserIds, groupIcon);
      onChatCreated(newGroup);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleSelectUser = (id) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter((x) => x !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const icons = ['👥', '🚀', '🎨', '💼', '💡', '🔥', '📊', '⚡'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className={`composer-pill-btn ${tab === 'direct' ? 'active-control' : ''}`}
              onClick={() => setTab('direct')}
              style={{
                backgroundColor: tab === 'direct' ? '#7059ea' : '#232332',
                color: '#fff',
                borderColor: tab === 'direct' ? '#7059ea' : '#333346'
              }}
            >
              <UserPlus size={14} />
              <span>Direct Chat</span>
            </button>
            <button
              className={`composer-pill-btn ${tab === 'group' ? 'active-control' : ''}`}
              onClick={() => setTab('group')}
              style={{
                backgroundColor: tab === 'group' ? '#7059ea' : '#232332',
                color: '#fff',
                borderColor: tab === 'group' ? '#7059ea' : '#333346'
              }}
            >
              <Users size={14} />
              <span>New Group</span>
            </button>
          </div>
          <button className="composer-tool-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '8px 12px', borderRadius: '6px', color: '#fca5a5', fontSize: '12.5px' }}>
            {error}
          </div>
        )}

        {/* Tab 1: Direct Chat */}
        {tab === 'direct' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} color="#6b7280" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                className="modal-input"
                style={{ width: '100%', paddingLeft: '32px' }}
                placeholder="Search registered users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ maxHeight: '260px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px', fontSize: '13px' }}>
                  Loading registered users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '20px', fontSize: '13px', lineHeight: 1.6 }}>
                  No other registered users found yet.<br />
                  <span style={{ color: '#c4b5fd' }}>
                    Open an <strong>Incognito window</strong> at <span style={{ textDecoration: 'underline' }}>http://localhost:5173</span> to register a 2nd user and chat in real-time!
                  </span>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleStartDirectChat(u.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#1b1b26',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: '1px solid #28283a',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#232332')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1b1b26')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={u.avatar} alt={u.name} style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff' }}>{u.name}</div>
                        <div style={{ fontSize: '11px', color: '#9ca3af' }}>@{u.username}</div>
                      </div>
                    </div>
                    <button className="doc-share-btn" style={{ padding: '4px 12px', fontSize: '12px' }}>
                      Message
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Create Group */}
        {tab === 'group' && (
          <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Group Name
              </label>
              <input
                type="text"
                className="modal-input"
                style={{ width: '100%' }}
                placeholder="e.g. Design & Engineering Team"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Group Icon
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {icons.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setGroupIcon(ic)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: groupIcon === ic ? '#7059ea' : '#222230',
                      border: '1px solid #333345',
                      fontSize: '16px',
                      cursor: 'pointer'
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Select Members ({selectedUserIds.length})
              </label>
              <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {users.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleSelectUser(u.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        backgroundColor: isSelected ? 'rgba(112, 89, 234, 0.2)' : '#1b1b26',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: isSelected ? '1px solid #7059ea' : '1px solid #28283a'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={u.avatar} alt={u.name} style={{ width: '26px', height: '26px', borderRadius: '50%' }} />
                        <span style={{ fontSize: '13px', color: '#fff' }}>{u.name}</span>
                      </div>
                      {isSelected && <Check size={14} color="#7059ea" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="composer-pill-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="doc-share-btn">
                Create Group
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
