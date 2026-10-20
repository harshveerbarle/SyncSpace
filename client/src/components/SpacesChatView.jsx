import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Activity,
  Settings,
  Users,
  Video,
  Send,
  AtSign,
  Paperclip,
  Smile,
  BarChart2,
  Plus,
  ChevronDown,
  MessageCircle,
  CheckCircle,
  FileText
} from 'lucide-react';
import socket from '../services/socket';

export default function SpacesChatView({
  currentUser,
  onLaunchMeeting,
  onOpenDocument
}) {
  const [spaces, setSpaces] = useState([
    { id: 'design', name: 'Design', icon: '🎨', type: 'group', unread: 3, membersCount: 12, pinned: true, snippet: 'Uzoma: Iterating on new opt... · 10:45 am' },
    { id: 'content', name: 'Content', icon: '✏️', type: 'group', unread: 1, membersCount: 6, pinned: true, snippet: 'Magdalene: Added a task for... · 10:00 am' },
    { id: 'product-feedback', name: 'Product Suggestions & Feedback', icon: '💡', type: 'group', unread: 0, membersCount: 18, pinned: false, snippet: 'Ryan: Users love the new ric... · 10:43 am' },
    { id: 'priya', name: 'Priya', icon: '👩🏽', type: 'direct', unread: 2, status: 'online', pinned: true, snippet: 'Priya: The current ad looks... · 10:30 am', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces' },
    { id: 'jamie', name: 'Jamie', icon: '👩🏼', type: 'direct', unread: 0, status: 'away', pinned: true, snippet: 'Jamie: All good on my side! 🤘 · 10:25 am', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces' },
    { id: 'rock-support', name: 'SyncSpace Support', icon: '🛡️', type: 'group', unread: 0, membersCount: 4, pinned: false, snippet: 'Rock Support: Here is a vid... · Yesterday' }
  ]);

  const [activeSpaceId, setActiveSpaceId] = useState('content');
  const [activeTab, setActiveTab] = useState('Chat');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [expandedThreadId, setExpandedThreadId] = useState(null);

  const messagesEndRef = useRef(null);
  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  // Fetch initial messages & subscribe to socket
  useEffect(() => {
    fetch(`http://localhost:3001/api/messages/${activeSpaceId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          setMessages(data);
        }
      })
      .catch((err) => console.log('Using local message state', err));

    socket.emit('chat:join_space', activeSpaceId);

    const handleNewMessage = ({ spaceId, message }) => {
      if (spaceId === activeSpaceId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    const handleReactionUpdated = ({ spaceId, messageId, reactions }) => {
      if (spaceId === activeSpaceId) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
        );
      }
    };

    socket.on('chat:new_message', handleNewMessage);
    socket.on('chat:reaction_updated', handleReactionUpdated);

    return () => {
      socket.off('chat:new_message', handleNewMessage);
      socket.off('chat:reaction_updated', handleReactionUpdated);
    };
  }, [activeSpaceId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const payload = {
      spaceId: activeSpaceId,
      content: inputValue.trim(),
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar
      }
    };

    socket.emit('chat:send_message', payload);

    // Optimistic append
    const now = new Date();
    const localMsg = {
      id: `local-${Date.now()}`,
      sender: payload.sender,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: payload.content,
      reactions: {},
      replies: []
    };
    setMessages((prev) => [...prev, localMsg]);
    setInputValue('');
  };

  const handleToggleReaction = (messageId, emoji) => {
    socket.emit('chat:reaction', {
      spaceId: activeSpaceId,
      messageId,
      emoji,
      user: currentUser.name
    });
    // Optimistic reaction
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) {
          const currentCount = m.reactions?.[emoji] || 0;
          return {
            ...m,
            reactions: {
              ...m.reactions,
              [emoji]: currentCount + 1
            }
          };
        }
        return m;
      })
    );
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;
    const taskPayload = {
      title: newTaskTitle.trim(),
      space: activeSpaceId,
      status: 'Backlog',
      assignee: currentUser.name
    };
    socket.emit('task:create', taskPayload);

    // Post as rich message into chat
    const taskMsg = {
      spaceId: activeSpaceId,
      content: `Created new shared task: "${newTaskTitle.trim()}"`,
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar
      },
      taskRef: {
        id: `#${Math.floor(Math.random() * 20) + 12}`,
        title: newTaskTitle.trim(),
        status: 'Backlog',
        assignee: currentUser.name
      }
    };
    socket.emit('chat:send_message', taskMsg);

    setNewTaskTitle('');
    setShowTaskModal(false);
  };

  const commonEmojis = ['🚀', '👍', '❤️', '🙂', '🔥', '🎉'];

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* ----------------- Sub-Sidebar: Spaces (Image 2) ----------------- */}
      <div className="spaces-sidebar">
        <div className="spaces-header">
          <span className="spaces-header-title">Spaces</span>
          <button className="spaces-add-btn" title="Create Space or Direct Message">
            <Plus size={16} />
          </button>
        </div>

        {/* Pinned Spaces (Image 2 horizontal avatar row) */}
        <div className="spaces-section-label">
          <span>📌 Pinned</span>
          <ChevronDown size={14} />
        </div>
        <div className="pinned-spaces-row">
          <div
            className={`pinned-item ${activeSpaceId === 'priya' ? 'active' : ''}`}
            onClick={() => setActiveSpaceId('priya')}
          >
            <div className="pinned-avatar-wrap">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=faces"
                alt="Priya"
                className="pinned-avatar-img"
              />
            </div>
            <span className="pinned-name">Priya</span>
          </div>

          <div
            className={`pinned-item ${activeSpaceId === 'jamie' ? 'active' : ''}`}
            onClick={() => setActiveSpaceId('jamie')}
          >
            <div className="pinned-avatar-wrap">
              <img
                src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=faces"
                alt="Jamie"
                className="pinned-avatar-img"
              />
            </div>
            <span className="pinned-name">Jamie</span>
          </div>

          <div
            className={`pinned-item ${activeSpaceId === 'design' ? 'active' : ''}`}
            onClick={() => setActiveSpaceId('design')}
          >
            <div className="pinned-avatar-wrap">
              <div className="pinned-icon-placeholder">🎨</div>
            </div>
            <span className="pinned-name">Design</span>
          </div>

          <div
            className={`pinned-item ${activeSpaceId === 'content' ? 'active' : ''}`}
            onClick={() => setActiveSpaceId('content')}
          >
            <div className="pinned-avatar-wrap">
              <div className="pinned-icon-placeholder">✏️</div>
            </div>
            <span className="pinned-name">Content</span>
          </div>
        </div>

        {/* All Spaces (Image 2 list) */}
        <div className="spaces-section-label">
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="space-unread-badge" style={{ backgroundColor: '#4f46e5' }}>5</span>
            All spaces
          </span>
          <ChevronDown size={14} />
        </div>

        <div className="spaces-list">
          {spaces.map((space) => {
            const isActive = space.id === activeSpaceId;
            return (
              <div
                key={space.id}
                className={`space-row ${isActive ? 'active' : ''}`}
                onClick={() => setActiveSpaceId(space.id)}
              >
                <div className="space-icon-box">
                  {space.avatar ? (
                    <img src={space.avatar} alt={space.name} />
                  ) : (
                    <span>{space.icon}</span>
                  )}
                </div>
                <div className="space-info">
                  <div className="space-title-line">
                    <span className="space-name">{space.name}</span>
                    {space.unread > 0 && (
                      <span className="space-unread-badge">{space.unread}</span>
                    )}
                  </div>
                  <div className="space-snippet">{space.snippet}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ----------------- Main Chat View Area (Image 2) ----------------- */}
      <div className="main-view-container">
        {/* Space Top Bar */}
        <div className="space-top-bar">
          <div className="space-title-cluster">
            <span className="space-header-icon">{activeSpace.icon}</span>
            <h2 className="space-header-name">{activeSpace.name}</h2>

            <div className="space-header-tabs">
              {['Chat', 'Topics', 'Tasks', 'Notes', 'Files'].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    className={`space-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    <span>{tab}</span>
                    {tab === 'Chat' && <span className="space-tab-pill">1</span>}
                    {tab === 'Tasks' && <span className="space-tab-pill" style={{ backgroundColor: '#6366f1' }}>2</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-top-actions">
            <button className="header-action-icon-btn" title="Search messages">
              <Search size={16} />
            </button>
            <button className="header-action-icon-btn" title="Activity statistics">
              <Activity size={16} />
            </button>
            <button className="header-action-icon-btn" title="Channel settings">
              <Settings size={16} />
            </button>

            <div className="members-count-badge">
              <Users size={14} />
              <span>{activeSpace.membersCount || 6}</span>
            </div>

            {/* Quick Meet Launcher */}
            <button
              className="start-meet-pill-btn"
              onClick={onLaunchMeeting}
              title="Start or Join Team Video Call"
            >
              <Video size={15} />
              <span>Start Meet</span>
            </button>
          </div>
        </div>

        {/* Chat Messages Stream */}
        <div className="chat-scroll-stream">
          <div className="chat-date-divider">
            <span className="chat-date-pill">Monday, Apr 20</span>
          </div>

          {messages.map((msg) => (
            <div key={msg.id} className="chat-message-row">
              <img src={msg.sender?.avatar} alt={msg.sender?.name} className="chat-avatar" />
              <div className="chat-message-body">
                <div className="chat-meta">
                  <span className="chat-sender-name">{msg.sender?.name}</span>
                  <span className="chat-time">{msg.time}</span>
                </div>

                {/* Reply To snippet if present */}
                {msg.replyTo && (
                  <div className="chat-reply-quote">
                    reply to <span>@{msg.replyTo.user}:</span> {msg.replyTo.snippet}
                  </div>
                )}

                {/* Message Content */}
                <div className="chat-content-text">{msg.content}</div>

                {/* Embedded Task Card (Image 2 style) */}
                {msg.taskRef && (
                  <div
                    className="chat-task-card"
                    onClick={() => onOpenDocument && onOpenDocument()}
                    title="Click to view shared task & doc"
                  >
                    <span className="task-badge-tag">Task</span>
                    <span className="task-title-text">{msg.taskRef.id} {msg.taskRef.title}</span>
                    <span className="task-status-pill">{msg.taskRef.status}</span>
                  </div>
                )}

                {/* Thread Replies snippet (Image 2: "2 replies") */}
                {msg.replies && msg.replies.length > 0 && (
                  <div
                    className="chat-thread-trigger"
                    onClick={() => setExpandedThreadId(expandedThreadId === msg.id ? null : msg.id)}
                  >
                    <div className="chat-thread-avatars">
                      <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=faces" alt="Patryk" />
                      <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&crop=faces" alt="Maryna" />
                    </div>
                    <span>{msg.replies.length} replies</span>
                    <span style={{ color: '#88889c', fontSize: '11px' }}>· last on Apr 20, 09:21 am</span>
                  </div>
                )}

                {/* Expanded Thread Drawer */}
                {expandedThreadId === msg.id && msg.replies && (
                  <div
                    style={{
                      marginTop: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      borderLeft: '2px solid #7059ea',
                      padding: '8px 12px',
                      borderRadius: '0 8px 8px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    {msg.replies.map((reply, i) => (
                      <div key={i} style={{ fontSize: '12.5px', color: '#cbd5e1' }}>
                        <strong style={{ color: '#c4b5fd' }}>{reply.sender}:</strong> {reply.text}{' '}
                        <span style={{ fontSize: '10px', color: '#6b7280' }}>({reply.time})</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Emoji Reactions Row (Image 2: 🚀 2, 🙂 1) */}
                <div className="chat-reactions-row">
                  {msg.reactions &&
                    Object.entries(msg.reactions).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        className="reaction-pill"
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                      >
                        <span>{emoji}</span>
                        <span>{count}</span>
                      </button>
                    ))}
                  <button
                    className="reaction-add-btn"
                    onClick={() => handleToggleReaction(msg.id, '🚀')}
                    title="Quick React"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* ----------------- Message Composer Bar (Image 2) ----------------- */}
        <div className="chat-composer-wrap">
          <div className="chat-composer-box">
            <textarea
              className="chat-composer-textarea"
              placeholder="Write a message. Press Shift+Return to insert a new line."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={2}
            />

            <div className="chat-composer-bottom-bar">
              <div className="chat-composer-tools">
                <button className="composer-tool-btn" title="Mention team member">
                  <AtSign size={16} />
                </button>
                <button className="composer-tool-btn" title="Attach file or media">
                  <Paperclip size={16} />
                </button>
                <button
                  className="composer-tool-btn"
                  title="Emoji"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile size={16} />
                </button>
                <button
                  className="composer-tool-btn"
                  title="Quick Video Call"
                  onClick={onLaunchMeeting}
                >
                  <Video size={16} />
                </button>
                <button className="composer-tool-btn" title="Create Poll">
                  <BarChart2 size={16} />
                </button>

                {/* Quick Emoji Picker Drawer */}
                {showEmojiPicker && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '75px',
                      left: '80px',
                      backgroundColor: '#1e1e2b',
                      border: '1px solid #333345',
                      borderRadius: '8px',
                      padding: '8px',
                      display: 'flex',
                      gap: '8px',
                      zIndex: 30
                    }}
                  >
                    {commonEmojis.map((e) => (
                      <span
                        key={e}
                        style={{ cursor: 'pointer', fontSize: '18px' }}
                        onClick={() => {
                          setInputValue((prev) => prev + ' ' + e);
                          setShowEmojiPicker(false);
                        }}
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="chat-composer-actions">
                <button className="composer-pill-btn" onClick={() => setShowTaskModal(true)}>
                  <span>+ Task</span>
                </button>
                <button className="composer-pill-btn" onClick={onOpenDocument}>
                  <span>+ Note</span>
                </button>
                <button className="composer-pill-btn">
                  <span>+ Topic</span>
                </button>
                <button className="composer-send-btn" onClick={handleSendMessage} title="Send message">
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Collaborative Task</h3>
              <button className="dock-btn" onClick={() => setShowTaskModal(false)}>✕</button>
            </div>
            <input
              type="text"
              className="modal-input"
              placeholder="e.g. Design wireframes for mobile onboarding"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="composer-pill-btn" onClick={() => setShowTaskModal(false)}>Cancel</button>
              <button className="doc-share-btn" onClick={handleCreateTask}>Add to Space</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
