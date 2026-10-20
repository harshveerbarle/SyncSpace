import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Table,
  Presentation,
  Plus,
  Save,
  Share2,
  Trash2,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Play,
  Check,
  Copy,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';
import socket from '../services/socket';

export default function CollabWorkView({ currentUser, activeChat, onSwitchChat, onLaunchMeeting }) {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(activeChat || null);
  const [documents, setDocuments] = useState([]);
  const [currentDoc, setCurrentDoc] = useState(null);
  const [activeType, setActiveType] = useState('all'); // 'all' | 'word' | 'excel' | 'ppt'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('word');
  const [saveStatus, setSaveStatus] = useState('Synced');
  const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
  const [remoteHighlights, setRemoteHighlights] = useState({}); // peerId -> { row, col, user }
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Sync selectedChat when prop changes
  useEffect(() => {
    if (activeChat) {
      setSelectedChat(activeChat);
    }
  }, [activeChat]);

  // Load user's chats to allow switching workspace scope
  useEffect(() => {
    api.getChats()
      .then((data) => setChats(data || []))
      .catch((err) => console.error('Failed to load chats for collab:', err));
  }, []);

  // Load documents scoped to selectedChat
  useEffect(() => {
    setIsLoadingDocs(true);
    api.getDocuments(selectedChat?.id || null)
      .then((docs) => {
        setDocuments(docs || []);
        if (docs && docs.length > 0) {
          if (!currentDoc || !docs.some((d) => d.id === currentDoc.id)) {
            setCurrentDoc(docs[0]);
          }
        } else {
          setCurrentDoc(null);
        }
      })
      .catch((err) => console.error('Failed to load documents:', err))
      .finally(() => setIsLoadingDocs(false));
  }, [selectedChat?.id]);

  // Join document socket room for real-time collaboration
  useEffect(() => {
    if (!currentDoc) return;

    socket.emit('doc:join', currentDoc.id);

    // Real-Time Word Sync
    const handleWordSynced = ({ content, senderId }) => {
      setCurrentDoc((prev) => {
        if (!prev || prev.type !== 'word') return prev;
        return { ...prev, data: { ...prev.data, content } };
      });
      setSaveStatus('Synced');
    };

    // Real-Time Excel Cell Sync
    const handleExcelSynced = ({ row, col, value, formula, senderId }) => {
      setCurrentDoc((prev) => {
        if (!prev || prev.type !== 'excel') return prev;
        const sheets = [...(prev.data?.sheets || [])];
        if (sheets[0]) {
          const sheetData = sheets[0].data ? [...sheets[0].data] : [];
          while (sheetData.length <= row) sheetData.push([]);
          sheetData[row] = [...(sheetData[row] || [])];
          while (sheetData[row].length <= col) sheetData[row].push('');
          sheetData[row][col] = value;
          sheets[0] = { ...sheets[0], data: sheetData };
        }
        return { ...prev, data: { ...prev.data, sheets } };
      });

      // Highlight cell edited by collaborator
      setRemoteHighlights((prev) => ({
        ...prev,
        [senderId]: { row, col, timestamp: Date.now() }
      }));
      setSaveStatus('Synced');
    };

    // Real-Time PPT Slide Sync
    const handlePptSynced = ({ slideIndex, slideData }) => {
      setCurrentDoc((prev) => {
        if (!prev || prev.type !== 'ppt') return prev;
        const slides = [...(prev.data?.slides || [])];
        slides[slideIndex] = slideData;
        return { ...prev, data: { ...prev.data, slides } };
      });
      setSaveStatus('Synced');
    };

    socket.on('doc:word_synced', handleWordSynced);
    socket.on('doc:excel_cell_synced', handleExcelSynced);
    socket.on('doc:ppt_slide_synced', handlePptSynced);

    return () => {
      socket.emit('doc:leave', currentDoc.id);
      socket.off('doc:word_synced', handleWordSynced);
      socket.off('doc:excel_cell_synced', handleExcelSynced);
      socket.off('doc:ppt_slide_synced', handlePptSynced);
    };
  }, [currentDoc?.id]);

  // Create new Document
  const handleCreateDocument = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const scope = selectedChat ? selectedChat.type : 'personal';
      const created = await api.createDocument(
        newTitle.trim(),
        newType,
        selectedChat?.id || null,
        scope
      );
      setDocuments((prev) => [created, ...prev]);
      setCurrentDoc(created);
      setNewTitle('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  };

  // Word Editor Change
  const handleWordChange = (html) => {
    setSaveStatus('Saving...');
    setCurrentDoc((prev) => ({
      ...prev,
      data: { ...prev.data, content: html }
    }));
    socket.emit('doc:word_update', {
      docId: currentDoc.id,
      content: html
    });
    api.updateDocument(currentDoc.id, { data: { content: html } })
      .then(() => setSaveStatus('Synced'))
      .catch(() => setSaveStatus('Sync Error'));
  };

  // Excel Cell Change
  const handleExcelCellChange = (row, col, value) => {
    setSaveStatus('Saving...');
    const sheets = [...(currentDoc.data?.sheets || [])];
    if (sheets[0]) {
      const sheetData = sheets[0].data ? [...sheets[0].data] : [];
      while (sheetData.length <= row) sheetData.push([]);
      sheetData[row] = [...(sheetData[row] || [])];
      while (sheetData[row].length <= col) sheetData[row].push('');
      sheetData[row][col] = value;
      sheets[0] = { ...sheets[0], data: sheetData };
    }

    const updatedDoc = {
      ...currentDoc,
      data: { ...currentDoc.data, sheets }
    };
    setCurrentDoc(updatedDoc);

    // Emit live to peers
    socket.emit('doc:excel_cell_update', {
      docId: currentDoc.id,
      sheetIndex: 0,
      row,
      col,
      value
    });

    api.updateDocument(currentDoc.id, { data: updatedDoc.data })
      .then(() => setSaveStatus('Synced'))
      .catch(() => setSaveStatus('Sync Error'));
  };

  // PPT Slide Change
  const handlePptSlideChange = (slideIndex, field, value) => {
    setSaveStatus('Saving...');
    const slides = [...(currentDoc.data?.slides || [])];
    if (slides[slideIndex]) {
      slides[slideIndex] = { ...slides[slideIndex], [field]: value };
    }
    const updatedDoc = {
      ...currentDoc,
      data: { ...currentDoc.data, slides }
    };
    setCurrentDoc(updatedDoc);

    socket.emit('doc:ppt_slide_update', {
      docId: currentDoc.id,
      slideIndex,
      slideData: slides[slideIndex]
    });

    api.updateDocument(currentDoc.id, { data: updatedDoc.data })
      .then(() => setSaveStatus('Synced'))
      .catch(() => setSaveStatus('Sync Error'));
  };

  // Add Slide to PPT
  const handleAddSlide = () => {
    const slides = [...(currentDoc.data?.slides || [])];
    const newSlide = {
      id: `slide-${slides.length + 1}`,
      title: 'New Slide Title',
      subtitle: 'Click to edit subtitle or bullet points',
      notes: ''
    };
    slides.push(newSlide);
    const updatedDoc = { ...currentDoc, data: { ...currentDoc.data, slides } };
    setCurrentDoc(updatedDoc);
    setCurrentSlideIndex(slides.length - 1);
    api.updateDocument(currentDoc.id, { data: updatedDoc.data });
  };

  const filteredDocs = activeType === 'all'
    ? documents
    : documents.filter((d) => d.type === activeType);

  const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const rowCount = 14;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* ----------------- Sub-Sidebar: Workspaces & File List ----------------- */}
      <div className="spaces-sidebar" style={{ width: '290px' }}>
        <div className="spaces-header">
          <span className="spaces-header-title">Collab Work</span>
          <button
            className="spaces-add-btn"
            onClick={() => setShowCreateModal(true)}
            title="Create New File (Word, Excel, PPT)"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Workspace Scope Selector */}
        <div style={{ padding: '0 12px 10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10.5px', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.5px' }}>
              WORKSPACE SCOPE
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedChat?.id || 'all'}
              onChange={(e) => {
                const cId = e.target.value;
                if (cId === 'all') {
                  setSelectedChat(null);
                  if (onSwitchChat) onSwitchChat(null);
                } else {
                  const targetC = chats.find((c) => c.id === cId);
                  setSelectedChat(targetC || null);
                  if (onSwitchChat) onSwitchChat(targetC || null);
                }
              }}
              className="modal-input"
              style={{
                width: '100%',
                padding: '7px 28px 7px 10px',
                fontSize: '12px',
                backgroundColor: '#1b1b26',
                border:
                  selectedChat?.type === 'direct'
                    ? '1px solid #818cf8'
                    : selectedChat?.type === 'group'
                    ? '1px solid #10b981'
                    : '1px solid #2d2d3e',
                color: '#ffffff',
                appearance: 'none',
                cursor: 'pointer',
                borderRadius: '8px'
              }}
            >
              <option value="all">🌐 All My Workspaces</option>
              {chats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.type === 'direct' ? `🔒 Private: ${c.name}` : `👥 Group: ${c.name}`}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none', color: '#9ca3af' }}
            />
          </div>

          {/* Privacy badge info */}
          <div
            style={{
              marginTop: '6px',
              fontSize: '11px',
              color:
                selectedChat?.type === 'direct'
                  ? '#c4b5fd'
                  : selectedChat?.type === 'group'
                  ? '#6ee7b7'
                  : '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 500
            }}
          >
            {selectedChat?.type === 'direct' ? (
              <span>🔒 Private between you & {selectedChat.name}</span>
            ) : selectedChat?.type === 'group' ? (
              <span>👥 Group only ({selectedChat.members?.length || 0} members)</span>
            ) : (
              <span>🌐 Showing all files created by you</span>
            )}
          </div>
        </div>

        {/* File Type Filter Pills */}
        <div style={{ display: 'flex', gap: '4px', padding: '0 12px 12px 12px' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'word', label: 'Word' },
            { id: 'excel', label: 'Excel' },
            { id: 'ppt', label: 'PPT' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveType(t.id)}
              className={`composer-pill-btn ${activeType === t.id ? 'active-control' : ''}`}
              style={{
                flex: 1,
                justifyContent: 'center',
                backgroundColor: activeType === t.id ? '#7059ea' : '#1e1e2b',
                color: activeType === t.id ? '#fff' : '#9ca3af',
                fontSize: '11px',
                padding: '4px 0'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Files List */}
        <div className="spaces-list">
          {filteredDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: '#6b7280', fontSize: '13px' }}>
              No {activeType !== 'all' ? activeType.toUpperCase() : ''} files yet.<br />
              Click <strong>+</strong> above to create your first collaborative file!
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = currentDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  className={`space-row ${isSelected ? 'active' : ''}`}
                  onClick={() => setCurrentDoc(doc)}
                >
                  <div
                    className="space-icon-box"
                    style={{
                      backgroundColor:
                        doc.type === 'excel'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : doc.type === 'ppt'
                          ? 'rgba(245, 158, 11, 0.2)'
                          : 'rgba(99, 102, 241, 0.2)'
                    }}
                  >
                    {doc.type === 'excel' && <Table size={18} color="#10b981" />}
                    {doc.type === 'ppt' && <Presentation size={18} color="#f59e0b" />}
                    {doc.type === 'word' && <FileText size={18} color="#818cf8" />}
                  </div>
                  <div className="space-info">
                    <div className="space-name">{doc.title}</div>
                    <div className="space-snippet">
                      {doc.type.toUpperCase()} · by {doc.ownerName || 'You'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ----------------- Main Work Area ----------------- */}
      <div className="main-view-container">
        {currentDoc ? (
          <>
            {/* Top Bar */}
            <div className="space-top-bar">
              <div className="space-title-cluster">
                <span style={{ fontSize: '18px' }}>
                  {currentDoc.type === 'excel' ? '📊' : currentDoc.type === 'ppt' ? '📽️' : '📝'}
                </span>
                <input
                  type="text"
                  value={currentDoc.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setCurrentDoc({ ...currentDoc, title });
                    api.updateDocument(currentDoc.id, { title });
                  }}
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#fff',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    width: '320px'
                  }}
                />
                {currentDoc.scope === 'direct' ? (
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#818cf8',
                      backgroundColor: 'rgba(129, 140, 248, 0.15)',
                      border: '1px solid rgba(129, 140, 248, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 600
                    }}
                  >
                    🔒 Private
                  </span>
                ) : currentDoc.scope === 'group' ? (
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#10b981',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 600
                    }}
                  >
                    👥 Group
                  </span>
                ) : null}

                <span style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                  {saveStatus}
                </span>
              </div>

              <div className="space-top-actions">
                <button
                  className="start-meet-pill-btn"
                  onClick={onLaunchMeeting}
                  title="Launch video meeting to present this document"
                >
                  <span>Video Call</span>
                </button>
              </div>
            </div>

            {/* 1. WORD EDITOR */}
            {currentDoc.type === 'word' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#111116', overflow: 'hidden' }}>
                {/* Word Formatting Toolbar */}
                <div className="doc-formatting-toolbar" style={{ margin: '12px auto' }}>
                  <button className="toolbar-btn" onClick={() => document.execCommand('undo')}><Undo2 size={15} /></button>
                  <button className="toolbar-btn" onClick={() => document.execCommand('redo')}><Redo2 size={15} /></button>
                  <div className="toolbar-divider" />
                  <button className="toolbar-btn" onClick={() => document.execCommand('bold')}><Bold size={15} /></button>
                  <button className="toolbar-btn" onClick={() => document.execCommand('italic')}><Italic size={15} /></button>
                  <button className="toolbar-btn" onClick={() => document.execCommand('underline')}><Underline size={15} /></button>
                  <div className="toolbar-divider" />
                  <button className="toolbar-btn" onClick={() => document.execCommand('justifyLeft')}><AlignLeft size={15} /></button>
                  <button className="toolbar-btn" onClick={() => document.execCommand('justifyCenter')}><AlignCenter size={15} /></button>
                  <button className="toolbar-btn" onClick={() => document.execCommand('justifyRight')}><AlignRight size={15} /></button>
                </div>

                {/* Editable Content */}
                <div className="doc-canvas-scroll">
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: currentDoc.data?.content || '<p>Type here...</p>' }}
                    onInput={(e) => handleWordChange(e.currentTarget.innerHTML)}
                    style={{
                      maxWidth: '820px',
                      width: '100%',
                      backgroundColor: '#181824',
                      border: '1px solid #28283a',
                      borderRadius: '12px',
                      padding: '40px 48px',
                      minHeight: '600px',
                      outline: 'none',
                      color: '#e2e8f0',
                      lineHeight: 1.8,
                      fontSize: '15px'
                    }}
                  />
                </div>
              </div>
            )}

            {/* 2. EXCEL / SPREADSHEET */}
            {currentDoc.type === 'excel' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#121218', overflow: 'hidden' }}>
                {/* Excel Formula Bar */}
                <div style={{ padding: '8px 20px', backgroundColor: '#181822', borderBottom: '1px solid #282838', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', width: '30px' }}>
                    {columns[activeCell.col]}{activeCell.row + 1}
                  </span>
                  <div style={{ width: '1px', height: '18px', backgroundColor: '#333346' }} />
                  <input
                    type="text"
                    value={
                      currentDoc.data?.sheets?.[0]?.data?.[activeCell.row]?.[activeCell.col] || ''
                    }
                    onChange={(e) => handleExcelCellChange(activeCell.row, activeCell.col, e.target.value)}
                    placeholder="Enter formula or value..."
                    style={{
                      flex: 1,
                      backgroundColor: '#12121a',
                      border: '1px solid #2c2c3e',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Interactive Grid Table */}
                <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '700px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px', backgroundColor: '#1b1b26', border: '1px solid #2d2d40', color: '#9ca3af', fontSize: '11px', padding: '6px' }}>#</th>
                        {columns.map((col) => (
                          <th key={col} style={{ backgroundColor: '#1b1b26', border: '1px solid #2d2d40', color: '#9ca3af', fontSize: '12px', fontWeight: 600, padding: '6px' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: rowCount }).map((_, rIdx) => (
                        <tr key={rIdx}>
                          <td style={{ backgroundColor: '#181824', border: '1px solid #28283a', textAlign: 'center', color: '#6b7280', fontSize: '11px' }}>
                            {rIdx + 1}
                          </td>
                          {columns.map((col, cIdx) => {
                            const val = currentDoc.data?.sheets?.[0]?.data?.[rIdx]?.[cIdx] || '';
                            const isSelected = activeCell.row === rIdx && activeCell.col === cIdx;
                            return (
                              <td
                                key={col}
                                onClick={() => setActiveCell({ row: rIdx, col: cIdx })}
                                style={{
                                  border: isSelected ? '2px solid #10b981' : '1px solid #242434',
                                  padding: 0,
                                  backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.1)' : '#15151f'
                                }}
                              >
                                <input
                                  type="text"
                                  value={val}
                                  onChange={(e) => handleExcelCellChange(rIdx, cIdx, e.target.value)}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    padding: '6px 8px',
                                    color: '#f3f4f6',
                                    fontSize: '13px'
                                  }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. PPT / PRESENTATION SLIDES */}
            {currentDoc.type === 'ppt' && (
              <div style={{ flex: 1, display: 'flex', backgroundColor: '#101016', overflow: 'hidden' }}>
                {/* Left Slide Thumbnails */}
                <div style={{ width: '220px', borderRight: '1px solid #232332', backgroundColor: '#151520', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b' }}>SLIDES</span>
                    <button className="spaces-add-btn" onClick={handleAddSlide} title="Add Slide">
                      <Plus size={14} />
                    </button>
                  </div>

                  {(currentDoc.data?.slides || []).map((slide, sIdx) => {
                    const isSlideActive = currentSlideIndex === sIdx;
                    return (
                      <div
                        key={slide.id || sIdx}
                        onClick={() => setCurrentSlideIndex(sIdx)}
                        style={{
                          backgroundColor: isSlideActive ? 'rgba(245, 158, 11, 0.15)' : '#1c1c28',
                          border: isSlideActive ? '2px solid #f59e0b' : '1px solid #2c2c3e',
                          borderRadius: '8px',
                          padding: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>Slide {sIdx + 1}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {slide.title || 'Untitled'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Main Slide Editor Stage */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
                  {currentDoc.data?.slides?.[currentSlideIndex] ? (
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '760px',
                        aspectRatio: '16/9',
                        backgroundColor: '#1a1a26',
                        border: '1px solid #333348',
                        borderRadius: '16px',
                        padding: '48px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                        gap: '16px'
                      }}
                    >
                      <input
                        type="text"
                        value={currentDoc.data.slides[currentSlideIndex].title || ''}
                        onChange={(e) => handlePptSlideChange(currentSlideIndex, 'title', e.target.value)}
                        placeholder="Click to add Title"
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: '32px',
                          fontWeight: 800,
                          color: '#ffffff',
                          backgroundColor: 'transparent',
                          border: 'none',
                          outline: 'none',
                          borderBottom: '2px dashed #333346'
                        }}
                      />
                      <textarea
                        rows={3}
                        value={currentDoc.data.slides[currentSlideIndex].subtitle || ''}
                        onChange={(e) => handlePptSlideChange(currentSlideIndex, 'subtitle', e.target.value)}
                        placeholder="Click to add subtitle or bullet points..."
                        style={{
                          fontSize: '18px',
                          color: '#cbd5e1',
                          backgroundColor: 'transparent',
                          border: 'none',
                          outline: 'none',
                          resize: 'none'
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '14px' }}>
            Select or create a document to begin collaborating!
          </div>
        )}
      </div>

      {/* Create File Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Collaborative Document</h3>
              <button className="composer-tool-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateDocument} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  fontSize: '12px',
                  backgroundColor: '#1b1b26',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #2d2d3e'
                }}
              >
                <div style={{ color: '#9ca3af', marginBottom: '2px', fontSize: '11px', fontWeight: 600 }}>
                  COLLABORATION DESTINATION:
                </div>
                <div
                  style={{
                    color:
                      selectedChat?.type === 'direct'
                        ? '#818cf8'
                        : selectedChat?.type === 'group'
                        ? '#10b981'
                        : '#ffffff',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {selectedChat ? (
                    selectedChat.type === 'direct' ? (
                      `🔒 Private Space with ${selectedChat.name}`
                    ) : (
                      `👥 Group Space: ${selectedChat.name}`
                    )
                  ) : (
                    '🌐 Personal Workspace'
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                  {selectedChat?.type === 'direct'
                    ? `Only you and ${selectedChat.name} can view, edit, or join calls for this file.`
                    : selectedChat?.type === 'group'
                    ? `Only members of ${selectedChat.name} can access this file.`
                    : 'Visible only to you.'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Document Name
                </label>
                <input
                  type="text"
                  className="modal-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Q4 Financial Projections"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Application Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setNewType('word')}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: newType === 'word' ? 'rgba(99, 102, 241, 0.2)' : '#1e1e2a',
                      border: newType === 'word' ? '2px solid #6366f1' : '1px solid #2d2d3e',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FileText size={20} color="#818cf8" />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Word</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewType('excel')}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: newType === 'excel' ? 'rgba(16, 185, 129, 0.2)' : '#1e1e2a',
                      border: newType === 'excel' ? '2px solid #10b981' : '1px solid #2d2d3e',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Table size={20} color="#10b981" />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewType('ppt')}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: newType === 'ppt' ? 'rgba(245, 158, 11, 0.2)' : '#1e1e2a',
                      border: newType === 'ppt' ? '2px solid #f59e0b' : '1px solid #2d2d3e',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Presentation size={20} color="#f59e0b" />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>PPT</span>
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="composer-pill-btn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="doc-share-btn">
                  Create File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
