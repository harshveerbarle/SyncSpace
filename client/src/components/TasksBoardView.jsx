import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, AlertCircle, Users } from 'lucide-react';
import socket from '../services/socket';

export default function TasksBoardView({ currentUser }) {
  const [tasks, setTasks] = useState([
    { id: '#8', title: 'Social media strategy', space: 'content', status: 'Backlog', assignee: 'Jamie & Magdalene', tag: 'Marketing', priority: 'High' },
    { id: '#9', title: 'Review client script', space: 'content', status: 'In Progress', assignee: 'Ryan', tag: 'Copy', priority: 'Medium' },
    { id: '#10', title: 'Backdrop print verification', space: 'content', status: 'Done', assignee: 'Uzoma', tag: 'Print', priority: 'Low' },
    { id: '#11', title: 'Interactive Collaborative Editor sync tests', space: 'design', status: 'In Progress', assignee: 'Dylan', tag: 'Engineering', priority: 'Urgent' }
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [targetColumn, setTargetColumn] = useState('Backlog');

  useEffect(() => {
    fetch('http://localhost:3001/api/tasks')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) setTasks(data);
      })
      .catch((err) => console.log('Tasks fetched locally', err));

    const handleTaskCreated = (newTask) => {
      setTasks((prev) => {
        if (prev.some((t) => t.id === newTask.id)) return prev;
        return [...prev, newTask];
      });
    };

    const handleStatusChanged = ({ taskId, newStatus }) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:status_changed', handleStatusChanged);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:status_changed', handleStatusChanged);
    };
  }, []);

  const handleMoveStatus = (taskId, newStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    socket.emit('task:update_status', { taskId, newStatus });
  };

  const handleCreate = () => {
    if (!newTaskTitle.trim()) return;
    const taskObj = {
      title: newTaskTitle.trim(),
      space: 'content',
      status: targetColumn,
      assignee: currentUser.name,
      tag: 'General',
      priority: 'Medium'
    };
    socket.emit('task:create', taskObj);

    const localTask = {
      id: `#${tasks.length + 8}`,
      ...taskObj
    };
    setTasks((prev) => [...prev, localTask]);
    setNewTaskTitle('');
    setShowModal(false);
  };

  const columns = ['Backlog', 'In Progress', 'Done'];

  return (
    <div className="tasks-board-view">
      <div className="tasks-board-header">
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 700, color: '#fff' }}>
            Shared Collaborative Tasks
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Synchronized with chat feeds and team spaces in real-time
          </p>
        </div>
        <button
          className="doc-share-btn"
          onClick={() => {
            setTargetColumn('Backlog');
            setShowModal(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>New Task</span>
        </button>
      </div>

      <div className="tasks-columns-grid">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col);
          return (
            <div key={col} className="tasks-column">
              <div className="tasks-column-header">
                <span className="tasks-column-title">
                  {col === 'Backlog' && <Clock size={16} color="#94a3b8" />}
                  {col === 'In Progress' && <AlertCircle size={16} color="#f59e0b" />}
                  {col === 'Done' && <CheckCircle size={16} color="#10b981" />}
                  <span>{col}</span>
                </span>
                <span className="tasks-count-badge">{colTasks.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-card)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#818cf8', fontWeight: 600 }}>{task.id}</span>
                      <span className="task-badge-tag">{task.tag}</span>
                    </div>

                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6' }}>
                      {task.title}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ fontSize: '11.5px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} />
                        <span>{task.assignee}</span>
                      </span>

                      {/* Quick Move Selector */}
                      <select
                        value={task.status}
                        onChange={(e) => handleMoveStatus(task.id, e.target.value)}
                        style={{
                          backgroundColor: '#272738',
                          color: '#cbd5e1',
                          border: '1px solid #3d3d52',
                          borderRadius: '6px',
                          fontSize: '11px',
                          padding: '2px 6px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Backlog">Backlog</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Task in {targetColumn}</h3>
              <button className="dock-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <input
              type="text"
              className="modal-input"
              placeholder="Task summary / goal..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="composer-pill-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="doc-share-btn" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
