import { authService } from './auth';

export const api = {
  // Directory & Users
  async getUsers() {
    const res = await fetch('/api/users', {
      headers: authService.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async getUserProfile(userId) {
    const res = await fetch(`/api/users/${userId}`, {
      headers: authService.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  },

  async updateProfile(updates) {
    const res = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update profile' }));
      throw new Error(err.error || 'Failed to update profile');
    }
    return res.json();
  },

  async uploadFile(filePayload) {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(filePayload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  // Chats
  async getChats() {
    const res = await fetch('/api/chats', {
      headers: authService.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch chats');
    return res.json();
  },

  async createDirectChat(targetUserId) {
    const res = await fetch('/api/chats/direct', {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ targetUserId })
    });
    if (!res.ok) throw new Error('Failed to create direct chat');
    return res.json();
  },

  async createGroupChat(name, memberIds, icon) {
    const res = await fetch('/api/chats/group', {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ name, memberIds, icon })
    });
    if (!res.ok) throw new Error('Failed to create group chat');
    return res.json();
  },

  async getMessages(chatId) {
    const res = await fetch(`/api/chats/${chatId}/messages`, {
      headers: authService.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  async deleteMessage(chatId, messageId) {
    const res = await fetch(`/api/chats/${chatId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: authService.getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete message' }));
      throw new Error(err.error || 'Failed to delete message');
    }
    return res.json();
  },

  // Collaborative Documents (Word, Excel, PPT)
  async getDocuments(chatId = null) {
    const url = chatId ? `/api/documents?chatId=${encodeURIComponent(chatId)}` : '/api/documents';
    const res = await fetch(url, {
      headers: authService.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async createDocument(title, type, chatId = null, scope = 'direct') {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ title, type, chatId, scope })
    });
    if (!res.ok) throw new Error('Failed to create document');
    return res.json();
  },

  async getDocument(docId) {
    const res = await fetch(`/api/documents/${docId}`, {
      headers: authService.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch document');
    return res.json();
  },

  async updateDocument(docId, updates) {
    const res = await fetch(`/api/documents/${docId}`, {
      method: 'PUT',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update document');
    return res.json();
  }
};
