import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Video,
  Phone,
  Send,
  AtSign,
  Paperclip,
  Smile,
  FileText,
  Users,
  Check,
  CheckCheck,
  ArrowLeft,
  ArrowRight,
  Download,
  Image as ImageIcon,
  X,
  Settings,
  Info,
  Trash2,
  Link2,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import socket from '../services/socket';
import NewChatModal from './NewChatModal';
import EmojiGifPicker from './EmojiGifPicker';
import ContactProfileModal from './ContactProfileModal';
import ProfileModal from './ProfileModal';
import JoinMeetingModal from './JoinMeetingModal';
import { parseMeetingRoomId } from '../utils/meetingUtils';

export default function RealChatView({
  currentUser,
  onStartCall,
  onOpenCollabWork,
  onProfileUpdated,
  onJoinMeeting
}) {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showJoinMeetingModal, setShowJoinMeetingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingPartner, setTypingPartner] = useState(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  // New Features States
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [viewingProfileUser, setViewingProfileUser] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Responsive mobile watcher
  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = () => {
    api.getChats()
      .then((data) => {
        setChats(data || []);
        if (data && data.length > 0 && !activeChatId && !isMobileView) {
          setActiveChatId(data[0].id);
        }
      })
      .catch((err) => console.error('Failed to load chats:', err));
  };

  // Handle active chat selection & message loading
  useEffect(() => {
    if (!activeChatId) return;

    // Reset unread count for the opened chat
    setChats((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, unreadCount: 0 } : c))
    );

    api.getMessages(activeChatId)
      .then((msgs) => {
        setMessages(msgs || []);
        // Mark all existing messages as read
        socket.emit('chat:mark_read', { chatId: activeChatId });
      })
      .catch((err) => console.error('Failed to load messages:', err));

    socket.emit('chat:join', activeChatId);

    // Incoming new message handler
    const handleNewMessage = (newMsg) => {
      if (newMsg.chatId === activeChatId) {
        setMessages((prev) => {
          // 1. Check direct ID match
          if (prev.some((m) => m.id === newMsg.id)) return prev;

          // 2. If message is from ourselves, check if we have matching temp optimistic message
          if (newMsg.senderId === currentUser.id) {
            const hasMatchingTemp = prev.some(
              (m) =>
                (m.id === newMsg.tempId ||
                  m.tempId === newMsg.tempId ||
                  (typeof m.id === 'string' && (m.id.startsWith('temp_') || m.id.startsWith('local_')))) &&
                m.content === newMsg.content
            );
            if (hasMatchingTemp) {
              return prev.map((m) =>
                (m.id === newMsg.tempId ||
                  m.tempId === newMsg.tempId ||
                  (typeof m.id === 'string' && (m.id.startsWith('temp_') || m.id.startsWith('local_')))) &&
                m.content === newMsg.content
                  ? newMsg
                  : m
              );
            }
          }

          // 3. Otherwise append new message
          return [...prev, newMsg];
        });

        // If message is from another user and we are actively viewing this chat, mark as read immediately!
        if (newMsg.senderId !== currentUser.id) {
          socket.emit('chat:mark_read', { chatId: activeChatId });
        }
      }

      // Update sidebar snippet & unread count
      setChats((prev) => {
        const exists = prev.some((c) => c.id === newMsg.chatId);
        if (!exists) {
          loadChats();
          return prev;
        }
        return prev.map((c) => {
          if (c.id === newMsg.chatId) {
            if (c.lastProcessedMsgId === newMsg.id) return c;
            const isCurrentChatOpen = newMsg.chatId === activeChatId;
            const isFromOtherUser = newMsg.senderId !== currentUser.id;
            const newUnread = isCurrentChatOpen
              ? 0
              : isFromOtherUser
              ? (c.unreadCount || 0) + 1
              : c.unreadCount || 0;

            return {
              ...c,
              lastProcessedMsgId: newMsg.id,
              unreadCount: newUnread,
              lastMessage: {
                text: newMsg.content || (newMsg.attachment ? `📎 ${newMsg.attachment.name || 'File'}` : ''),
                createdAt: newMsg.createdAt
              },
              updatedAt: newMsg.createdAt
            };
          }
          return c;
        });
      });
    };

    // Acknowledgment from server for message we sent
    const handleMessageSent = ({ tempId, message }) => {
      if (!message) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (
            m.id === tempId ||
            m.tempId === tempId ||
            (m.senderId === currentUser.id &&
              m.content === message.content &&
              typeof m.id === 'string' &&
              (m.id.startsWith('temp_') || m.id.startsWith('local_')))
          ) {
            return message;
          }
          return m;
        })
      );
    };

    // Sidebar update event
    const handleChatUpdated = ({ chatId, lastMessage }) => {
      if (!lastMessage) return;
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === chatId) {
            if (c.lastProcessedMsgId === lastMessage.id) return c;
            const isCurrentChatOpen = chatId === activeChatId;
            const isFromOtherUser = lastMessage.senderId !== currentUser.id;
            const newUnread = isCurrentChatOpen
              ? 0
              : isFromOtherUser
              ? (c.unreadCount || 0) + 1
              : c.unreadCount || 0;

            return {
              ...c,
              lastProcessedMsgId: lastMessage.id,
              unreadCount: newUnread,
              lastMessage: {
                text: lastMessage.content || (lastMessage.attachment ? `📎 ${lastMessage.attachment.name || 'File'}` : ''),
                createdAt: lastMessage.createdAt
              },
              updatedAt: lastMessage.createdAt
            };
          }
          return c;
        })
      );
    };

    // Chat created handler
    const handleChatCreated = (newChat) => {
      setChats((prev) => {
        if (prev.some((c) => c.id === newChat.id)) return prev;
        return [newChat, ...prev];
      });
      loadChats();
    };

    // Messages Read handler (Double Blue Ticks!)
    const handleMessagesRead = ({ chatId, readerId }) => {
      if (chatId === activeChatId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.senderId === currentUser.id) {
              const currentReadBy = m.readBy || [];
              if (!currentReadBy.includes(readerId)) {
                return { ...m, readBy: [...currentReadBy, readerId], status: 'read' };
              }
            }
            return m;
          })
        );
      }
    };

    // Typing status handler
    const handleUserTyping = ({ chatId, userName, userId, isTyping: typingStatus }) => {
      if (chatId === activeChatId && userId !== currentUser.id) {
        setTypingPartner(typingStatus ? userName : null);
      }
    };

    const handleReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    };

    const handleGroupMeetingStarted = ({ chatId, meeting }) => {
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, activeMeeting: meeting } : c))
      );
    };

    const handleGroupMeetingEnded = ({ chatId }) => {
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, activeMeeting: null } : c))
      );
    };

    const handleMessageDeleted = ({ chatId, messageId, lastMessage }) => {
      if (chatId === activeChatId) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId && m._id !== messageId));
      }
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === chatId) {
            return {
              ...c,
              lastMessage: lastMessage !== undefined ? lastMessage : c.lastMessage
            };
          }
          return c;
        })
      );
    };

    socket.on('chat:new_message', handleNewMessage);
    socket.on('chat:message_sent', handleMessageSent);
    socket.on('chat:updated', handleChatUpdated);
    socket.on('chat:created', handleChatCreated);
    socket.on('chat:messages_read', handleMessagesRead);
    socket.on('chat:user_typing', handleUserTyping);
    socket.on('chat:reaction_updated', handleReactionUpdated);
    socket.on('chat:message_deleted', handleMessageDeleted);
    socket.on('call:group_meeting_started', handleGroupMeetingStarted);
    socket.on('call:group_meeting_ended', handleGroupMeetingEnded);

    return () => {
      socket.off('chat:new_message', handleNewMessage);
      socket.off('chat:message_sent', handleMessageSent);
      socket.off('chat:updated', handleChatUpdated);
      socket.off('chat:created', handleChatCreated);
      socket.off('chat:messages_read', handleMessagesRead);
      socket.off('chat:user_typing', handleUserTyping);
      socket.off('chat:reaction_updated', handleReactionUpdated);
      socket.off('chat:message_deleted', handleMessageDeleted);
      socket.off('call:group_meeting_started', handleGroupMeetingStarted);
      socket.off('call:group_meeting_ended', handleGroupMeetingEnded);
    };
  }, [activeChatId, currentUser.id]);

  // Handle Deleting Message
  const handleDeleteMessage = async (messageId) => {
    if (!activeChatId || !messageId) return;
    try {
      setDeletingMessageId(messageId);
      // Optimistic delete from current view
      setMessages((prev) => prev.filter((m) => m.id !== messageId && m._id !== messageId));
      setConfirmDeleteId(null);

      // Call API
      await api.deleteMessage(activeChatId, messageId);

      // Notify other clients via socket
      socket.emit('chat:delete_message', {
        chatId: activeChatId,
        messageId
      });
    } catch (err) {
      console.error('Failed to delete message:', err);
      // Reload messages if failed
      api.getMessages(activeChatId).then(setMessages).catch(() => {});
      alert(err.message || 'Failed to delete message');
    } finally {
      setDeletingMessageId(null);
    }
  };

  // Scroll to bottom on new message or typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingPartner]);

  const activeChat = chats.find((c) => c.id === activeChatId);

  // Handle Typing Change with 1.5s Debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);

    if (!activeChatId) return;

    if (val.trim()) {
      socket.emit('chat:typing', { chatId: activeChatId, isTyping: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('chat:typing', { chatId: activeChatId, isTyping: false });
      }, 1500);
    } else {
      socket.emit('chat:typing', { chatId: activeChatId, isTyping: false });
    }
  };

  // File Picker Handler
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPendingAttachment({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        data: reader.result,
        isImage: file.type?.startsWith('image/')
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!inputValue.trim() && !pendingAttachment) || !activeChatId) return;

    const messageText = inputValue.trim();
    const currentAttachment = pendingAttachment;

    // Clear inputs immediately
    setInputValue('');
    setPendingAttachment(null);
    setShowEmojiPicker(false);

    // Clear typing status immediately on send
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('chat:typing', { chatId: activeChatId, isTyping: false });

    // Generate unique tempId for optimistic message tracking
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Handle File Upload if attachment is pending
    let uploadedAttachment = null;
    if (currentAttachment) {
      try {
        setIsUploading(true);
        const res = await api.uploadFile({
          name: currentAttachment.name,
          type: currentAttachment.type,
          data: currentAttachment.data
        });
        uploadedAttachment = {
          url: res.url,
          name: res.name,
          size: res.size,
          type: res.type
        };
      } catch (err) {
        console.error('File upload failed, falling back to data URL:', err);
        uploadedAttachment = {
          url: currentAttachment.data,
          name: currentAttachment.name,
          size: currentAttachment.size,
          type: currentAttachment.type
        };
      } finally {
        setIsUploading(false);
      }
    }

    // Optimistic message append
    const localMsg = {
      id: tempId,
      tempId,
      chatId: activeChatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: messageText,
      attachment: uploadedAttachment,
      reactions: {},
      readBy: [currentUser.id],
      status: 'sent',
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, localMsg]);

    // Update sender's sidebar preview immediately
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              lastMessage: {
                text: messageText || (uploadedAttachment ? `📎 ${uploadedAttachment.name}` : ''),
                createdAt: localMsg.createdAt
              },
              updatedAt: localMsg.createdAt
            }
          : c
      )
    );

    // Emit to server with tempId and attachment
    socket.emit('chat:send_message', {
      chatId: activeChatId,
      content: messageText,
      attachment: uploadedAttachment,
      tempId
    });
  };

  // Send Animated GIF directly
  const handleSendGif = (gifUrl, gifTitle) => {
    if (!activeChatId) return;
    setShowEmojiPicker(false);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const gifAttachment = {
      url: gifUrl,
      name: gifTitle || 'GIF',
      type: 'image/gif',
      size: 0
    };

    const localMsg = {
      id: tempId,
      tempId,
      chatId: activeChatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      content: '',
      attachment: gifAttachment,
      reactions: {},
      readBy: [currentUser.id],
      status: 'sent',
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, localMsg]);

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              lastMessage: { text: '🎬 GIF', createdAt: localMsg.createdAt },
              updatedAt: localMsg.createdAt
            }
          : c
      )
    );

    socket.emit('chat:send_message', {
      chatId: activeChatId,
      content: '',
      attachment: gifAttachment,
      tempId
    });
  };

  const handleToggleReaction = (messageId, emoji) => {
    socket.emit('chat:reaction', {
      messageId,
      emoji,
      chatId: activeChatId
    });
  };

  const filteredChats = chats.filter((c) =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* ----------------- Chats List Sidebar ----------------- */}
      {(!isMobileView || !activeChatId) && (
        <div
          className="spaces-sidebar"
          style={{
            width: isMobileView ? '100%' : '300px',
            borderRight: '1px solid #232332'
          }}
        >
          {/* Header with User Profile / Settings Quick Click */}
          <div className="spaces-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              onClick={() => setShowSettingsModal(true)}
              title="Click to view & edit your profile, picture & bio"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #7059ea'
                }}
              />
              <span className="spaces-header-title">Chats & Groups</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                className="spaces-add-btn"
                onClick={() => setShowSettingsModal(true)}
                title="Profile & Settings"
                style={{ marginRight: '2px' }}
              >
                <Settings size={15} />
              </button>

              <button
                className="spaces-add-btn"
                onClick={() => setShowJoinMeetingModal(true)}
                title="Paste Meeting Link to Join Call"
                style={{ color: '#10b981', marginRight: '2px' }}
              >
                <Link2 size={15} />
              </button>

              <button
                className="spaces-add-btn"
                onClick={() => setShowNewChatModal(true)}
                title="Start New Chat or Create Group"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: '0 12px 6px 12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#6b7280" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                placeholder="Search chats or messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="modal-input"
                style={{ width: '100%', padding: '6px 10px 6px 30px', fontSize: '12.5px' }}
              />
            </div>
          </div>

          {/* Quick Join Meeting with Link Action Bar */}
          <div style={{ padding: '0 12px 10px 12px' }}>
            <button
              onClick={() => setShowJoinMeetingModal(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '7px 12px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px dashed rgba(16, 185, 129, 0.4)',
                borderRadius: '8px',
                color: '#6ee7b7',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Video size={14} color="#10b981" />
              <span>Join Meeting with Link</span>
            </button>
          </div>

          {/* Chats List */}
          <div className="spaces-list">
            {filteredChats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#6b7280', fontSize: '13px', lineHeight: 1.6 }}>
                No chats yet.<br />
                Click <strong>+</strong> above to start messaging someone!
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.id === activeChatId;
                return (
                  <div
                    key={chat.id}
                    className={`space-row ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setChats((prev) =>
                        prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c))
                      );
                    }}
                  >
                    <div className="space-icon-box">
                      {chat.type === 'direct' && chat.avatar ? (
                        <img src={chat.avatar} alt={chat.name} />
                      ) : (
                        <span style={{ fontSize: '18px' }}>{chat.icon || '👥'}</span>
                      )}
                    </div>
                    <div className="space-info">
                      <div className="space-title-line">
                        <span className="space-name" style={{ fontWeight: chat.unreadCount > 0 ? 700 : 600 }}>
                          {chat.name}
                        </span>
                        {chat.activeMeeting ? (
                          <span
                            style={{
                              fontSize: '10px',
                              color: '#10b981',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              padding: '2px 6px',
                              borderRadius: '8px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                            Live Meet
                          </span>
                        ) : chat.updatedAt ? (
                          <span
                            className="space-time"
                            style={{
                              color: chat.unreadCount > 0 ? '#10b981' : '#9ca3af',
                              fontWeight: chat.unreadCount > 0 ? 600 : 400
                            }}
                          >
                            {new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : null}
                      </div>
                      <div
                        className="space-snippet"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px'
                        }}
                      >
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                            fontWeight: chat.unreadCount > 0 ? 600 : 400,
                            color: chat.unreadCount > 0 ? '#f3f4f6' : '#9ca3af'
                          }}
                        >
                          {chat.activeMeeting
                            ? `🟢 Live ${chat.activeMeeting.callType || 'Video'} Call in progress`
                            : (chat.lastMessage?.text || 'No messages yet')}
                        </span>

                        {chat.unreadCount > 0 && (
                          <span
                            className="unread-badge"
                            style={{
                              backgroundColor: '#10b981',
                              color: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 700,
                              minWidth: '20px',
                              height: '20px',
                              borderRadius: '10px',
                              padding: '0 6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)'
                            }}
                          >
                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ----------------- Active Chat Stream ----------------- */}
      {(!isMobileView || activeChatId) && (
        <div className="main-view-container" style={{ width: isMobileView ? '100%' : 'auto' }}>
          {activeChat ? (
            <>
              {/* Top Bar with Clickable Profile Details */}
              <div className="space-top-bar">
                <div
                  className="space-title-cluster"
                  onClick={() => {
                    if (activeChat.type === 'direct') {
                      setViewingProfileUser(
                        activeChat.partner || {
                          id: activeChat.partnerId,
                          name: activeChat.name,
                          avatar: activeChat.avatar,
                          status: activeChat.status
                        }
                      );
                    }
                  }}
                  style={{ cursor: activeChat.type === 'direct' ? 'pointer' : 'default' }}
                  title={activeChat.type === 'direct' ? `View ${activeChat.name}'s Profile, Username & Bio` : ''}
                >
                  {/* Mobile Back Arrow */}
                  {isMobileView && (
                    <button
                      className="composer-tool-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveChatId(null);
                      }}
                      style={{ marginRight: '6px' }}
                      title="Back to Chats"
                    >
                      <ArrowLeft size={18} />
                    </button>
                  )}

                  <div style={{ position: 'relative' }}>
                    {activeChat.avatar ? (
                      <img
                        src={activeChat.avatar}
                        alt={activeChat.name}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #2a2a3c'
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '24px' }}>{activeChat.icon || '👥'}</span>
                    )}
                    {activeChat.type === 'direct' && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: '11px',
                          height: '11px',
                          borderRadius: '50%',
                          backgroundColor: activeChat.status === 'online' ? '#10b981' : '#6b7280',
                          border: '2px solid #131318'
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h2 className="space-header-name">{activeChat.name}</h2>
                      {activeChat.type === 'direct' && (
                        <Info size={13} color="#818cf8" title="Click to view details" />
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: typingPartner ? '#10b981' : '#9ca3af', fontWeight: typingPartner ? 600 : 400 }}>
                      {typingPartner ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="speaking-indicator-wave" style={{ width: '6px', height: '6px' }} />
                          {typingPartner} is typing...
                        </span>
                      ) : activeChat.type === 'group' ? (
                        `${activeChat.members?.length || 0} members`
                      ) : activeChat.status === 'online' ? (
                        'Online'
                      ) : (
                        'Offline'
                      )}
                    </div>
                  </div>
                </div>

                {/* Call & Work Action Buttons */}
                <div className="space-top-actions">
                  <button
                    className="header-action-icon-btn"
                    onClick={() => onStartCall(activeChat, 'video')}
                    title="Start Real Video Call"
                    style={{ color: '#10b981' }}
                  >
                    <Video size={18} />
                  </button>

                  <button
                    className="header-action-icon-btn"
                    onClick={() => onStartCall(activeChat, 'audio')}
                    title="Start Real Audio Call"
                    style={{ color: '#06b6d4' }}
                  >
                    <Phone size={17} />
                  </button>

                  <button
                    className="header-action-icon-btn"
                    onClick={() => setShowJoinMeetingModal(true)}
                    title="Paste Meeting Link to Join"
                    style={{ color: '#a78bfa' }}
                  >
                    <Link2 size={17} />
                  </button>

                  {!isMobileView && (
                    <button
                      className="start-meet-pill-btn"
                      onClick={() => onOpenCollabWork(activeChat)}
                      title="Open Collaborative Word, Excel, or PPT"
                    >
                      <FileText size={14} />
                      <span>Word / Excel / PPT</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Live Group Meeting Banner */}
              {activeChat.activeMeeting && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.16) 0%, rgba(99, 102, 241, 0.16) 100%)',
                    borderBottom: '1px solid rgba(16, 185, 129, 0.35)',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        boxShadow: '0 0 10px #10b981'
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#f9fafb' }}>
                        Live {activeChat.activeMeeting.callType === 'audio' ? 'Audio' : 'Video'} Meeting in Progress
                      </div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                        Started by {activeChat.activeMeeting.startedBy || 'a member'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      onStartCall(
                        activeChat,
                        activeChat.activeMeeting.callType || 'video',
                        activeChat.activeMeeting.roomId
                      )
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      borderRadius: '20px',
                      fontWeight: 600,
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(16, 185, 129, 0.4)'
                    }}
                  >
                    <Video size={14} />
                    <span>Join Call</span>
                  </button>
                </div>
              )}

              {/* Messages Scroll Area */}
              <div className="chat-scroll-stream">
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280', fontSize: '13.5px' }}>
                    👋 Say hello! Send the first message in <strong>{activeChat.name}</strong>.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === currentUser.id;
                    const isRead = msg.readBy && msg.readBy.some((id) => id !== currentUser.id);
                    const canDelete = isMine || activeChat?.adminId === currentUser.id;
                    const meetingRoomInContent = parseMeetingRoomId(msg.content);
                    const hasMeetLink = msg.content && (
                      msg.content.includes('?meet=') ||
                      msg.content.includes('#meet=') ||
                      msg.content.includes('/meet/') ||
                      /\broom_[a-zA-Z0-9_-]+\b/.test(msg.content) ||
                      /\bmeet_[a-zA-Z0-9_-]+\b/.test(msg.content)
                    );

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMine ? 'flex-end' : 'flex-start',
                          marginBottom: '8px'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            flexDirection: isMine ? 'row-reverse' : 'row',
                            maxWidth: isMobileView ? '88%' : '75%'
                          }}
                        >
                          {!isMine && (
                            <img
                              src={msg.senderAvatar || 'https://api.dicebear.com/7.x/initials/svg?seed=U'}
                              alt={msg.senderName}
                              onClick={() => setViewingProfileUser({ id: msg.senderId, name: msg.senderName, avatar: msg.senderAvatar })}
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                marginTop: '2px',
                                cursor: 'pointer',
                                border: '1.5px solid #2a2a3c'
                              }}
                              title={`View ${msg.senderName}'s Profile & Bio`}
                            />
                          )}

                          {msg.type === 'call' ? (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '14px',
                                backgroundColor:
                                  msg.callData?.status === 'missed' || msg.callData?.status === 'declined'
                                    ? 'rgba(239, 68, 68, 0.12)'
                                    : 'rgba(16, 185, 129, 0.12)',
                                border:
                                  msg.callData?.status === 'missed' || msg.callData?.status === 'declined'
                                    ? '1px solid rgba(239, 68, 68, 0.3)'
                                    : '1px solid rgba(16, 185, 129, 0.3)',
                                borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                padding: '10px 14px',
                                minWidth: '220px',
                                boxShadow: 'var(--shadow-sm)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    backgroundColor:
                                      msg.callData?.status === 'missed' || msg.callData?.status === 'declined'
                                        ? 'rgba(239, 68, 68, 0.2)'
                                        : 'rgba(16, 185, 129, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color:
                                      msg.callData?.status === 'missed' || msg.callData?.status === 'declined'
                                        ? '#ef4444'
                                        : '#10b981'
                                  }}
                                >
                                  {msg.callData?.callType === 'audio' ? <Phone size={18} /> : <Video size={18} />}
                                </div>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#f3f4f6' }}>
                                    {msg.callData?.callType === 'audio' ? 'Audio Call' : 'Video Call'}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color:
                                        msg.callData?.status === 'missed' || msg.callData?.status === 'declined'
                                          ? '#f87171'
                                          : '#10b981'
                                    }}
                                  >
                                    {msg.callData?.status === 'missed'
                                      ? 'Missed Call'
                                      : msg.callData?.status === 'declined'
                                      ? 'Declined Call'
                                      : `Completed • ${msg.callData?.duration || 'Call'}`}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => onStartCall(activeChat, msg.callData?.callType || 'video')}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 12px',
                                  backgroundColor: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                                title="Call Back"
                              >
                                {msg.callData?.callType === 'audio' ? <Phone size={13} /> : <Video size={13} />}
                                <span>Call</span>
                              </button>
                            </div>
                          ) : (
                            <div
                              style={{
                                backgroundColor: isMine ? '#7059ea' : '#1e1e2b',
                                color: '#ffffff',
                                borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                padding: '10px 14px',
                                border: isMine ? 'none' : '1px solid #28283a',
                                boxShadow: 'var(--shadow-sm)'
                              }}
                            >
                              {!isMine && activeChat.type === 'group' && (
                                <div
                                  style={{ fontSize: '11px', fontWeight: 700, color: '#c4b5fd', marginBottom: '2px', cursor: 'pointer' }}
                                  onClick={() => setViewingProfileUser({ id: msg.senderId, name: msg.senderName, avatar: msg.senderAvatar })}
                                >
                                  {msg.senderName}
                                </div>
                              )}

                              {/* Message Text Content */}
                              {msg.content && (
                                <div style={{ fontSize: '13.5px', lineHeight: 1.5, wordBreak: 'break-word', userSelect: 'text' }}>
                                  {msg.content}
                                </div>
                              )}

                              {/* Interactive Meeting Join Card if link detected */}
                              {hasMeetLink && meetingRoomInContent && (
                                <div
                                  style={{
                                    marginTop: '8px',
                                    paddingTop: '8px',
                                    borderTop: '1px solid rgba(255,255,255,0.18)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    flexWrap: 'wrap'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Video size={14} color="#10b981" />
                                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#f3f4f6' }}>
                                      Meeting Room: {meetingRoomInContent}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => onStartCall(activeChat, 'video', meetingRoomInContent)}
                                    style={{
                                      padding: '4px 10px',
                                      backgroundColor: '#10b981',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '11.5px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)'
                                    }}
                                  >
                                    <span>Join Meeting</span>
                                    <ArrowRight size={12} />
                                  </button>
                                </div>
                              )}

                              {/* File / Image / GIF Attachment */}
                              {msg.attachment && (
                                <div style={{ marginTop: msg.content ? '8px' : '0' }}>
                                  {msg.attachment.type?.startsWith('image/') ||
                                  /\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i.test(msg.attachment.url) ? (
                                    <div
                                      style={{
                                        borderRadius: '10px',
                                        overflow: 'hidden',
                                        maxWidth: '290px',
                                        backgroundColor: '#12121a',
                                        border: '1px solid rgba(255,255,255,0.08)'
                                      }}
                                    >
                                      <img
                                        src={msg.attachment.url}
                                        alt={msg.attachment.name || 'Attachment'}
                                        style={{
                                          width: '100%',
                                          maxHeight: '260px',
                                          objectFit: 'cover',
                                          display: 'block',
                                          cursor: 'pointer'
                                        }}
                                        onClick={() => window.open(msg.attachment.url, '_blank')}
                                      />
                                    </div>
                                  ) : (
                                    <a
                                      href={msg.attachment.url}
                                      download={msg.attachment.name}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 12px',
                                        backgroundColor: isMine ? 'rgba(0,0,0,0.25)' : '#161622',
                                        borderRadius: '10px',
                                        textDecoration: 'none',
                                        color: '#ffffff',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        maxWidth: '280px'
                                      }}
                                    >
                                      <FileText size={22} color="#818cf8" style={{ flexShrink: 0 }} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                          style={{
                                            fontSize: '12.5px',
                                            fontWeight: 600,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                          }}
                                        >
                                          {msg.attachment.name}
                                        </div>
                                        {msg.attachment.size > 0 && (
                                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                            {(msg.attachment.size / 1024).toFixed(1)} KB
                                          </div>
                                        )}
                                      </div>
                                      <Download size={15} color="#818cf8" style={{ flexShrink: 0 }} />
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Message Timestamp & Status Ticks */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: '4px',
                                  fontSize: '10px',
                                  color: isMine ? '#e0e7ff' : '#9ca3af',
                                  marginTop: '4px'
                                }}
                              >
                                <span>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>

                                {/* Double Blue Ticks */}
                                {isMine && (
                                  <span title={isRead ? 'Read (Double Blue Ticks)' : 'Delivered'}>
                                    {isRead ? (
                                      <CheckCheck size={14} color="#38bdf8" />
                                    ) : msg.status === 'delivered' ? (
                                      <CheckCheck size={14} color="#9ca3af" />
                                    ) : (
                                      <Check size={14} color="#9ca3af" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Message Actions Toolbar (Reactions & Delete Message) */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '3px',
                            marginLeft: isMine ? '0' : '40px',
                            marginRight: isMine ? '4px' : '0'
                          }}
                        >
                          {/* Reactions badges display */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {Object.entries(msg.reactions).map(([emoji, userIds]) => (
                                <span
                                  key={emoji}
                                  onClick={() => handleToggleReaction(msg.id, emoji)}
                                  style={{
                                    fontSize: '11px',
                                    backgroundColor: '#212130',
                                    border: '1px solid #333346',
                                    borderRadius: '12px',
                                    padding: '1px 6px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {emoji} {userIds.length}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Quick Message Actions (React & Delete) */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              backgroundColor: '#191924',
                              border: '1px solid #28283a',
                              borderRadius: '12px',
                              padding: '1px 5px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                            }}
                          >
                            <span
                              onClick={() => handleToggleReaction(msg.id, '👍')}
                              title="React 👍"
                              style={{ cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}
                            >
                              👍
                            </span>
                            <span
                              onClick={() => handleToggleReaction(msg.id, '❤️')}
                              title="React ❤️"
                              style={{ cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}
                            >
                              ❤️
                            </span>

                            {canDelete && (
                              <>
                                <span style={{ width: '1px', height: '10px', backgroundColor: '#333348', margin: '0 2px' }} />
                                {confirmDeleteId === msg.id ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 2px' }}>
                                    <span style={{ fontSize: '10.5px', color: '#fca5a5', fontWeight: 600 }}>Delete?</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      disabled={deletingMessageId === msg.id}
                                      style={{
                                        backgroundColor: '#ef4444',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '3px',
                                        padding: '1px 6px',
                                        fontSize: '10.5px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      {deletingMessageId === msg.id ? '...' : 'Yes'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      style={{
                                        backgroundColor: '#28283a',
                                        color: '#9ca3af',
                                        border: 'none',
                                        borderRadius: '3px',
                                        padding: '1px 5px',
                                        fontSize: '10.5px',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(msg.id)}
                                    title="Delete Message"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#9ca3af',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '1px 2px',
                                      borderRadius: '3px',
                                      transition: 'color 0.15s'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Animated Typing Indicator */}
                {typingPartner && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 10px 0' }}>
                    <div
                      style={{
                        backgroundColor: '#1c1c28',
                        border: '1px solid #28283a',
                        borderRadius: '14px',
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#9ca3af',
                        fontSize: '12px'
                      }}
                    >
                      <span>{typingPartner} is typing</span>
                      <span className="speaking-indicator-wave" style={{ width: '6px', height: '6px' }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Wrap */}
              <div className="chat-composer-wrap" style={{ position: 'relative' }}>
                {/* Popover Emoji & Animated GIF Picker */}
                {showEmojiPicker && (
                  <EmojiGifPicker
                    onSelectEmoji={(emoji) => setInputValue((prev) => prev + emoji)}
                    onSelectGif={(gifUrl, gifTitle) => handleSendGif(gifUrl, gifTitle)}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}

                {/* Hidden File Input for Real File Upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                <form onSubmit={handleSendMessage} className="chat-composer-box">
                  {/* Pending Attachment Preview Bar */}
                  {pendingAttachment && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#1b1b28',
                        borderBottom: '1px solid #28283c',
                        borderRadius: '12px 12px 0 0'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        {pendingAttachment.isImage ? (
                          <img
                            src={pendingAttachment.data}
                            alt="preview"
                            style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '6px',
                              backgroundColor: '#272738',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <FileText size={18} color="#818cf8" />
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {pendingAttachment.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                            {(pendingAttachment.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPendingAttachment(null)}
                        style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
                        title="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  <textarea
                    className="chat-composer-textarea"
                    placeholder={`Message ${activeChat.name}... (Press Enter to send)`}
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={() => socket.emit('chat:typing', { chatId: activeChatId, isTyping: false })}
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
                      {/* Attach File Button */}
                      <button
                        type="button"
                        className="composer-tool-btn"
                        title="Upload File or Photo"
                        onClick={() => fileInputRef.current?.click()}
                        style={{ color: pendingAttachment ? '#7059ea' : '#9ca3af' }}
                      >
                        <Paperclip size={17} />
                      </button>

                      {/* Emojis & GIFs Button */}
                      <button
                        type="button"
                        className="composer-tool-btn"
                        title="Emojis & Animated GIFs"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        style={{ color: showEmojiPicker ? '#7059ea' : '#9ca3af' }}
                      >
                        <Smile size={17} />
                      </button>
                    </div>

                    <div className="chat-composer-actions">
                      <button
                        type="submit"
                        className="composer-send-btn"
                        title="Send message"
                        disabled={isUploading}
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '14px' }}>
              Select a chat from the sidebar or click + to start messaging.
            </div>
          )}
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onChatCreated={(newChat) => {
            loadChats();
            setActiveChatId(newChat.id);
          }}
        />
      )}

      {/* Contact Profile Viewer Modal (Shows username, profile pic & bio) */}
      {viewingProfileUser && (
        <ContactProfileModal
          user={viewingProfileUser}
          userId={viewingProfileUser.id || viewingProfileUser._id}
          onClose={() => setViewingProfileUser(null)}
          onStartCall={onStartCall}
        />
      )}

      {/* User Profile & Settings Modal */}
      {showSettingsModal && (
        <ProfileModal
          currentUser={currentUser}
          onClose={() => setShowSettingsModal(false)}
          onProfileUpdated={(updated) => {
            if (onProfileUpdated) onProfileUpdated(updated);
          }}
        />
      )}

      {/* Join Meeting via Link Modal */}
      <JoinMeetingModal
        isOpen={showJoinMeetingModal}
        onClose={() => setShowJoinMeetingModal(false)}
        onJoinMeeting={(roomId, callType) => {
          if (onJoinMeeting) {
            onJoinMeeting(roomId, callType);
          } else if (activeChat) {
            onStartCall(activeChat, callType, roomId);
          } else {
            onStartCall({ id: null, name: 'Meeting', type: 'meeting' }, callType, roomId);
          }
        }}
      />
    </div>
  );
}
