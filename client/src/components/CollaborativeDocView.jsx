import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Folder,
  Share2,
  MoreVertical,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Link2,
  Paperclip,
  ChevronUp,
  MessageSquare,
  Plus,
  Check,
  Copy
} from 'lucide-react';
import socket from '../services/socket';
import { INITIAL_COLLAB_CURSORS } from '../data/mockData';

export default function CollaborativeDocView({
  currentUser,
  onBack,
  onLaunchMeeting
}) {
  const [docTitle, setDocTitle] = useState('Seven fundamental design principles');
  const [lastSaved, setLastSaved] = useState('Updated 3 minutes ago');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Content blocks
  const [blocks, setBlocks] = useState([
    {
      id: 'h-1',
      type: 'heading',
      text: 'Discoverability'
    },
    {
      id: 'p-1',
      type: 'paragraph',
      text: 'Whenever we engage with an everyday thing such as a TV remote control, or a product like a website or an application, we figure out where and how to perform various functions. Through good discoverability, we can consider the different options and choose the one that should work to meet our goal. However, we cannot do this if the actions are not discoverable.'
    },
    {
      id: 'p-2',
      type: 'paragraph',
      text: 'Norman describes good discoverability as: "It is possible to determine what actions are possible and the current state of the device." Clear focal points (calls to action, images, and headers); visual hierarchy (content structured in order of priority); and transparent navigation systems all constitute good discoverability and understanding within a design.'
    },
    {
      id: 'p-3',
      type: 'paragraph',
      highlighted: 'when a design lacks discoverability, we must work harder to understand how something works.',
      prefix: 'However, ',
      suffix: ' Take a website hamburger menu, for example; it is a convenient place to store multiple items, but it obscures key offerings and essential information.'
    },
    {
      id: 'p-4',
      type: 'paragraph',
      text: "Other design principles, particularly signifiers, feedback, and constraints (we'll come across these soon), can also increase discoverability and reduce possible errors."
    },
    {
      id: 'h-2',
      type: 'heading',
      text: 'Feedback'
    },
    {
      id: 'p-5',
      type: 'paragraph',
      text: 'Whenever an action is taken, the system must produce an immediate, clear response to confirm that the command has been registered and is being processed.'
    }
  ]);

  // Live Multiplayer Cursors (Image 1: Guiseppi, Teddy, Antonio)
  const [collaboratorCursors, setCollaboratorCursors] = useState(INITIAL_COLLAB_CURSORS);
  const [remoteCursors, setRemoteCursors] = useState({});

  // Floating Comment Cards (Image 1)
  const [comments, setComments] = useState([
    {
      id: 'c-1',
      author: 'Marcus Solomon',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces',
      time: '1:42PM Today',
      text: 'This is a great point! What else can you teach me thats so neat?',
      replies: []
    },
    {
      id: 'c-2',
      author: 'Judy Babars',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=faces',
      time: '1:42PM Today',
      text: 'This is a great point! What else can you teach me thats so neat?',
      replies: []
    },
    {
      id: 'c-3',
      author: 'Amanda Tanner',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces',
      time: '1:42PM Today',
      text: 'This is a great point! What else can you teach me thats so neat?',
      replies: []
    }
  ]);

  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [newCommentInput, setNewCommentInput] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const canvasRef = useRef(null);

  // Fetch initial doc state & register socket listeners
  useEffect(() => {
    socket.emit('doc:join');

    const handleDocInit = (docData) => {
      if (docData?.title) setDocTitle(docData.title);
      if (docData?.comments) setComments(docData.comments);
    };

    const handleBlockUpdated = ({ sectionId, newText }) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === sectionId ? { ...b, text: newText } : b))
      );
      setLastSaved('Saved just now');
    };

    const handleRemoteCursor = (data) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [data.socketId]: data
      }));
    };

    const handleCommentAdded = (newComment) => {
      setComments((prev) => [...prev, newComment]);
    };

    const handleReplyAdded = ({ commentId, reply }) => {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, replies: [...(c.replies || []), reply] } : c
        )
      );
    };

    socket.on('doc:init', handleDocInit);
    socket.on('doc:block_updated', handleBlockUpdated);
    socket.on('doc:collaborator_cursor', handleRemoteCursor);
    socket.on('doc:comment_added', handleCommentAdded);
    socket.on('doc:reply_added', handleReplyAdded);

    return () => {
      socket.off('doc:init', handleDocInit);
      socket.off('doc:block_updated', handleBlockUpdated);
      socket.off('doc:collaborator_cursor', handleRemoteCursor);
      socket.off('doc:comment_added', handleCommentAdded);
      socket.off('doc:reply_added', handleReplyAdded);
    };
  }, []);

  // Subtle natural wandering simulation for teammates (Guiseppi, Teddy, Antonio)
  useEffect(() => {
    const interval = setInterval(() => {
      setCollaboratorCursors((prev) =>
        prev.map((c) => {
          const dx = (Math.random() - 0.5) * 16;
          const dy = (Math.random() - 0.5) * 12;
          return {
            ...c,
            x: Math.min(Math.max(c.x + dx, 80), 740),
            y: Math.min(Math.max(c.y + dy, 240), 720)
          };
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Broadcast local user mouse coordinates to socket
  const handleMouseMove = (e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    socket.emit('doc:cursor_move', {
      x,
      y,
      user: currentUser.name,
      color: currentUser.color || '#ec4899'
    });
  };

  const handleBlockChange = (blockId, newText) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, text: newText } : b))
    );
    socket.emit('doc:update_block', { sectionId: blockId, newText });
    setLastSaved('Saving changes...');
    setTimeout(() => setLastSaved('Saved'), 600);
  };

  const handleAddReply = (commentId) => {
    if (!replyText.trim()) return;
    const replyObj = {
      commentId,
      replyText: replyText.trim(),
      author: currentUser.name,
      avatar: currentUser.avatar
    };
    socket.emit('doc:reply_comment', replyObj);

    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: [
                ...(c.replies || []),
                {
                  id: `r-${Date.now()}`,
                  author: currentUser.name,
                  avatar: currentUser.avatar,
                  time: 'Just now',
                  text: replyText.trim()
                }
              ]
            }
          : c
      )
    );
    setReplyText('');
    setActiveReplyId(null);
  };

  const handleAddComment = () => {
    if (!newCommentInput.trim()) return;
    const commentObj = {
      author: currentUser.name,
      avatar: currentUser.avatar,
      text: newCommentInput.trim()
    };
    socket.emit('doc:add_comment', commentObj);

    const localComment = {
      id: `c-${Date.now()}`,
      author: currentUser.name,
      avatar: currentUser.avatar,
      time: 'Just now',
      text: newCommentInput.trim(),
      replies: []
    };
    setComments((prev) => [...prev, localComment]);
    setNewCommentInput('');
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="doc-editor-view">
      {/* ----------------- Top Navigation Header (Image 1) ----------------- */}
      <header className="doc-top-bar">
        <div className="doc-left-cluster">
          <button className="doc-back-btn" onClick={onBack} title="Back to Spaces">
            <ArrowLeft size={18} />
          </button>
          <div className="doc-folder-tag">
            <Folder size={16} />
            <span>Design Articles</span>
          </div>
        </div>

        <div className="doc-right-cluster">
          {/* Collaborator Avatars Stack (Dylan, Guiseppi, Teddy, Antonio + 2 more) */}
          <div className="collaborator-avatar-stack">
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=faces"
              alt="Dylan"
              className="collab-avatar"
              title="Dylan Batterbee (Editing)"
            />
            <img
              src="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=60&h=60&fit=crop&crop=faces"
              alt="Guiseppi"
              className="collab-avatar"
              title="Guiseppi (Online)"
            />
            <img
              src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=60&h=60&fit=crop&crop=faces"
              alt="Teddy"
              className="collab-avatar"
              title="Teddy (Online)"
            />
            <span className="collab-more-pill">+2 more</span>
          </div>

          {/* Share Pill Button (Image 1 purple accent) */}
          <button className="doc-share-btn" onClick={() => setShowShareModal(true)}>
            Share
          </button>

          <button className="doc-menu-btn" title="Options">
            <MoreVertical size={18} />
          </button>

          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #36364c' }}
          />
        </div>
      </header>

      {/* ----------------- Formatting Toolbar (Image 1) ----------------- */}
      <div className="doc-formatting-toolbar">
        <button className="toolbar-btn" title="Undo">
          <Undo2 size={16} />
        </button>
        <button className="toolbar-btn" title="Redo">
          <Redo2 size={16} />
        </button>

        <div className="toolbar-divider" />

        <div className="toolbar-dropdown">
          <span>Heading</span>
          <ChevronUp size={14} style={{ transform: 'rotate(180deg)' }} />
        </div>

        <div className="toolbar-divider" />

        <button className="toolbar-btn" title="Bold">
          <Bold size={15} />
        </button>
        <button className="toolbar-btn" title="Italic">
          <Italic size={15} />
        </button>
        <button className="toolbar-btn" title="Underline">
          <UnderlineIcon size={15} />
        </button>

        <div className="toolbar-divider" />

        <button className="toolbar-btn" title="Align Left">
          <AlignLeft size={16} />
        </button>
        <button className="toolbar-btn" title="Align Center">
          <AlignCenter size={16} />
        </button>
        <button className="toolbar-btn" title="Align Right">
          <AlignRight size={16} />
        </button>

        <div className="toolbar-divider" />

        <button className="toolbar-btn" title="Insert Image">
          <ImageIcon size={16} />
        </button>
        <button className="toolbar-btn" title="Insert Link">
          <Link2 size={16} />
        </button>
        <button className="toolbar-btn" title="Add Attachment">
          <Paperclip size={16} />
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="toolbar-btn"
            style={{ color: '#10b981' }}
            onClick={onLaunchMeeting}
            title="Discuss this Document on Video Meet"
          >
            Video
          </button>
          <button className="toolbar-btn" title="Collapse Toolbar">
            <ChevronUp size={16} />
          </button>
        </div>
      </div>

      {/* ----------------- Document Canvas & Multiplayer Stage ----------------- */}
      <div className="doc-canvas-scroll">
        <div
          ref={canvasRef}
          className="doc-canvas-inner"
          onMouseMove={handleMouseMove}
        >
          {/* Document Title (Image 1: "Seven fundamental design principles") */}
          <input
            className="doc-title-input"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
          />

          {/* Author Subtitle */}
          <div className="doc-meta-row">
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=faces"
              alt="Dylan"
              className="doc-author-avatar"
            />
            <span className="doc-author-name">Dylan Batterbee</span>
            <span className="doc-updated-time">{lastSaved}</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              Live Multiplayer Sync
            </span>
          </div>

          {/* Document Content Sections (Image 1) */}
          <div className="doc-content-blocks">
            {/* Discoverability Section */}
            <h2
              className="doc-heading-block"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleBlockChange('h-1', e.currentTarget.innerText)}
            >
              Discoverability
            </h2>

            <p
              className="doc-paragraph-block"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleBlockChange('p-1', e.currentTarget.innerText)}
            >
              Whenever we engage with an everyday thing such as a TV remote control, or a product like a website or an application, we figure out where and how to perform various functions. Through good discoverability, we can consider the different options and choose the one that should work to meet our goal. However, we cannot do this if the actions are not discoverable.
            </p>

            <p
              className="doc-paragraph-block"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleBlockChange('p-2', e.currentTarget.innerText)}
            >
              Norman describes good discoverability as: "It is possible to determine what actions are possible and the current state of the device." Clear focal points (calls to action, images, and headers); visual hierarchy (content structured in order of priority); and transparent navigation systems all constitute good discoverability and understanding within a design.
            </p>

            {/* Paragraph 3 with Magenta Highlighted Text (Image 1) */}
            <p className="doc-paragraph-block">
              However,{' '}
              <span className="highlighted-text-badge">
                when a design lacks discoverability, we must work harder to understand how something works.
              </span>{' '}
              Take a website hamburger menu, for example; it is a convenient place to store multiple items, but it obscures key offerings and essential information.
            </p>

            <p
              className="doc-paragraph-block"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleBlockChange('p-4', e.currentTarget.innerText)}
            >
              Other design principles, particularly signifiers, feedback, and constraints (we'll come across these soon), can also increase discoverability and reduce possible errors.
            </p>

            {/* Feedback Section */}
            <h2
              className="doc-heading-block"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleBlockChange('h-2', e.currentTarget.innerText)}
            >
              Feedback
            </h2>

            <p
              className="doc-paragraph-block"
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => handleBlockChange('p-5', e.currentTarget.innerText)}
            >
              Whenever an action is taken, the system must produce an immediate, clear response to confirm that the command has been registered and is being processed.
            </p>
          </div>

          {/* ----------------- Live Multiplayer Cursors (Image 1) ----------------- */}
          {/* Simulated Teammates Cursors: Guiseppi, Teddy, Antonio */}
          {collaboratorCursors.map((cursor) => (
            <div
              key={cursor.id}
              className="collab-cursor"
              style={{
                transform: `translate(${cursor.x}px, ${cursor.y}px)`,
                transition: 'transform 0.8s ease-out'
              }}
            >
              <svg
                className="cursor-svg"
                width="18"
                height="22"
                viewBox="0 0 18 22"
                fill="none"
              >
                <path
                  d="M0 0L17 8.5L8.5 11L5 19.5L0 0Z"
                  fill={
                    cursor.color === 'cyan'
                      ? '#06b6d4'
                      : cursor.color === 'pink'
                      ? '#ec4899'
                      : '#3b82f6'
                  }
                />
              </svg>
              <span className={`cursor-tag ${cursor.color}`}>
                {cursor.name}
              </span>
            </div>
          ))}

          {/* Real Remote Connected Sockets Cursors */}
          {Object.entries(remoteCursors).map(([sockId, rCursor]) => (
            <div
              key={sockId}
              className="collab-cursor"
              style={{
                transform: `translate(${rCursor.x}px, ${rCursor.y}px)`
              }}
            >
              <svg className="cursor-svg" width="18" height="22" viewBox="0 0 18 22" fill="none">
                <path d="M0 0L17 8.5L8.5 11L5 19.5L0 0Z" fill={rCursor.color || '#ec4899'} />
              </svg>
              <span className="cursor-tag pink">
                {rCursor.user}
              </span>
            </div>
          ))}

          {/* ----------------- Floating Real-Time Comments Dock (Image 1) ----------------- */}
          <div className="doc-comments-dock">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f3f4f6' }}>
                Comments ({comments.length})
              </span>
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>Active Thread</span>
            </div>

            {comments.map((comment) => (
              <div key={comment.id} className="doc-comment-item">
                <div className="comment-author-bar">
                  <img src={comment.avatar} alt={comment.author} className="comment-avatar" />
                  <span className="comment-author-name">{comment.author}</span>
                  <span className="comment-time">{comment.time}</span>
                </div>

                <div className="comment-body-text">{comment.text}</div>

                {/* Replies to comment */}
                {comment.replies && comment.replies.length > 0 && (
                  <div style={{ paddingLeft: '8px', borderLeft: '2px solid #37374a', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    {comment.replies.map((rep) => (
                      <div key={rep.id} style={{ fontSize: '11.5px', color: '#c4b5fd' }}>
                        <strong>{rep.author}:</strong> {rep.text}
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Button / Box */}
                {activeReplyId === comment.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    <input
                      type="text"
                      className="modal-input"
                      placeholder="Write a reply..."
                      style={{ fontSize: '12px', padding: '6px 10px' }}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddReply(comment.id);
                      }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        className="comment-reply-pill-btn"
                        onClick={() => setActiveReplyId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="comment-reply-pill-btn"
                        style={{ backgroundColor: '#7059ea', color: '#fff', borderColor: '#7059ea' }}
                        onClick={() => handleAddReply(comment.id)}
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="comment-reply-pill-btn"
                    onClick={() => setActiveReplyId(comment.id)}
                  >
                    Reply
                  </button>
                )}
              </div>
            ))}

            {/* Add New Comment Field */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Add a comment..."
                value={newCommentInput}
                onChange={(e) => setNewCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddComment();
                }}
                style={{
                  flex: 1,
                  backgroundColor: '#20202c',
                  border: '1px solid #2e2e42',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '12px',
                  padding: '6px 10px',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleAddComment}
                style={{
                  backgroundColor: '#7059ea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0 10px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Document Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Share "Seven fundamental design principles"</h3>
              <button className="dock-btn" onClick={() => setShowShareModal(false)}>✕</button>
            </div>
            <p style={{ color: '#9da3af', fontSize: '13px' }}>
              Anyone with this link can view and collaborate in real-time with live multiplayer cursors.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="modal-input"
                style={{ flex: 1 }}
                readOnly
                value={`${window.location.origin}?doc=design-principles`}
              />
              <button className="doc-share-btn" onClick={handleCopyLink}>
                {copiedLink ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <div style={{ backgroundColor: '#21212e', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#c4b5fd' }}>
              💡 <strong>Multi-tab Testing Tip:</strong> Open another browser tab or Incognito window with this URL to see multiplayer cursors and simultaneous edits!
            </div>
            <div className="modal-actions">
              <button className="composer-pill-btn" onClick={() => setShowShareModal(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
