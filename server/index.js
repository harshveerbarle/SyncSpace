import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const JWT_SECRET = process.env.JWT_SECRET || 'syncspace-super-secret-key-2026';
const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'SyncSpace',
    database: 'MongoDB Atlas',
    isMongoConnected: db.isMongoConnected,
    timestamp: new Date().toISOString()
  });
});

// ---------------------------------------------------------------------------
// Authentication Middleware
// ---------------------------------------------------------------------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    try {
      const user = await db.findUserById(decoded.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      const { passwordHash, ...cleanUser } = user;
      req.user = cleanUser;
      next();
    } catch (e) {
      return res.status(500).json({ error: 'Internal authentication error' });
    }
  });
};

// ---------------------------------------------------------------------------
// Auth Endpoints (MongoDB backed)
// ---------------------------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, password, avatar } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'All fields (name, username, email, password) are required' });
    }

    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    const cleanEmail = email.toLowerCase().trim();

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const existingUser = await db.findUserByEmailOrUsername(cleanUsername);
    if (existingUser) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const existingEmail = await db.findUserByEmailOrUsername(cleanEmail);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const colors = ['#7059ea', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#3b82f6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser = {
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=${randomColor.replace('#','')}`,
      color: randomColor,
      status: 'online',
      bio: 'Hey there! I am using SyncSpace.',
      createdAt: new Date().toISOString()
    };

    const created = await db.createUser(newUser);
    const userId = created.id || created._id?.toString();

    const token = jwt.sign({ id: userId, username: cleanUsername }, JWT_SECRET, {
      expiresIn: '30d'
    });

    const { passwordHash: _, ...cleanUser } = created;
    return res.status(201).json({ token, user: { ...cleanUser, id: userId } });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    const user = await db.findUserByEmailOrUsername(identifier);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const userId = user.id || user._id?.toString();
    const token = jwt.sign({ id: userId, username: user.username }, JWT_SECRET, {
      expiresIn: '30d'
    });

    const { passwordHash: _, ...cleanUser } = user;
    return res.json({ token, user: { ...cleanUser, id: userId } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ---------------------------------------------------------------------------
// Directory & Contacts API
// ---------------------------------------------------------------------------
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await db.getAllUsers(req.user.id);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// File Upload API (Images, Documents, PDFs)
app.post('/api/upload', authenticateToken, async (req, res) => {
  try {
    const { name, type, data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    let buffer;
    if (data.startsWith('data:')) {
      const base64Data = data.split(';base64,').pop();
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = Buffer.from(data, 'base64');
    }

    const safeName = (name || 'file')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .slice(0, 80);
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}_${safeName}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    await fs.promises.writeFile(filePath, buffer);

    res.json({
      url: `/uploads/${fileName}`,
      name: name || safeName,
      type: type || 'application/octet-stream',
      size: buffer.length
    });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'File upload failed: ' + err.message });
  }
});

// Get User Profile by ID (for Contact Viewer)
app.get('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { passwordHash, ...cleanUser } = user;
    res.json(cleanUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile (Avatar picture, name, bio, username, email, color)
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { name, username, email, avatar, bio, color } = req.body;
    const updates = {};
    if (name && name.trim()) updates.name = name.trim();
    if (username && username.trim()) updates.username = username.trim().toLowerCase();
    if (email && email.trim()) updates.email = email.trim().toLowerCase();
    if (avatar) updates.avatar = avatar;
    if (bio !== undefined) updates.bio = bio;
    if (color) updates.color = color;

    const updatedUser = await db.updateUserProfile(req.user.id, updates);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { passwordHash, ...cleanUser } = updatedUser;
    // Broadcast profile update to all clients
    io.emit('user:profile_updated', cleanUser);
    res.json({ user: cleanUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Chats API (MongoDB backed)
// ---------------------------------------------------------------------------
app.get('/api/chats', authenticateToken, async (req, res) => {
  try {
    const userChats = await db.getUserChats(req.user.id);

    const enrichedChats = await Promise.all(
      userChats.map(async (chat) => {
        const members = await Promise.all(
          chat.members.map(async (id) => {
            const u = await db.findUserById(id);
            if (u) {
              const { passwordHash, ...rest } = u;
              return rest;
            }
            return { id, name: 'User' };
          })
        );

        const unreadCount = await db.getUnreadCount(chat.id, req.user.id);

        if (chat.type === 'direct') {
          const partner = members.find((m) => m.id !== req.user.id) || members[0];
          return {
            ...chat,
            name: partner ? partner.name : 'Direct Chat',
            avatar: partner ? partner.avatar : null,
            status: partner ? partner.status : 'offline',
            partnerId: partner ? partner.id : null,
            partner: partner || null,
            unreadCount: unreadCount || 0,
            members
          };
        }

        return { ...chat, unreadCount: unreadCount || 0, members };
      })
    );

    res.json(enrichedChats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats/direct', authenticateToken, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }

    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'Cannot create direct chat with yourself' });
    }

    const targetUser = await db.findUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user does not exist' });
    }

    let chat = await db.getDirectChat(req.user.id, targetUserId);
    if (!chat) {
      chat = {
        type: 'direct',
        members: [req.user.id, targetUserId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      chat = await db.createChat(chat);
      chat.members.forEach((mId) => {
        io.to(`user:${mId}`).emit('chat:created', chat);
      });
    }

    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chats/group', authenticateToken, async (req, res) => {
  try {
    const { name, memberIds, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const allMembers = Array.from(new Set([req.user.id, ...(memberIds || [])]));

    const newGroup = {
      type: 'group',
      name: name.trim(),
      icon: icon || '👥',
      adminId: req.user.id,
      members: allMembers,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const created = await db.createChat(newGroup);
    allMembers.forEach((mId) => {
      io.to(`user:${mId}`).emit('chat:created', created);
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await db.getChatById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    if (!chat.members.includes(req.user.id)) {
      return res.status(403).json({ error: 'Access denied to this chat' });
    }

    const messages = await db.getChatMessages(chatId);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chats/:chatId/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const chat = await db.getChatById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    if (!chat.members.includes(req.user.id)) {
      return res.status(403).json({ error: 'Access denied to this chat' });
    }

    const result = await db.deleteMessage(messageId, req.user.id);
    if (!result) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Broadcast real-time deletion to chat room
    io.to(`chat:${chatId}`).emit('chat:message_deleted', {
      chatId,
      messageId: result.messageId || messageId,
      lastMessage: result.lastMessage
    });

    // Notify all members' user rooms so sidebar previews update
    chat.members.forEach((mId) => {
      io.to(`user:${mId}`).emit('chat:message_deleted', {
        chatId,
        messageId: result.messageId || messageId,
        lastMessage: result.lastMessage
      });
    });

    res.json({ success: true, messageId: result.messageId || messageId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Real Collaborative Work API (Word, Excel, PPT)
// ---------------------------------------------------------------------------
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.query;
    const docs = await db.getUserDocuments(req.user.id, chatId || null);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/documents', authenticateToken, async (req, res) => {
  try {
    const { title, type, chatId, scope } = req.body;
    const validTypes = ['word', 'excel', 'ppt', 'whiteboard'];
    const docType = validTypes.includes(type) ? type : 'word';

    let members = [req.user.id];
    let docScope = scope || 'personal';

    if (chatId) {
      const chat = await db.getChatById(chatId);
      if (chat && chat.members.includes(req.user.id)) {
        members = chat.members;
        docScope = chat.type; // 'direct' or 'group'
      }
    }

    let initialData = {};
    if (docType === 'word') {
      initialData = {
        content: `<h1>${title || 'Untitled Document'}</h1><p>Start collaborating in real-time...</p>`
      };
    } else if (docType === 'excel') {
      initialData = {
        sheets: [
          {
            name: 'Sheet1',
            data: [
              ['Item / Goal', 'Owner', 'Q1 Target', 'Q1 Actual', 'Status'],
              ['SyncSpace App', req.user.name, '1000', '1250', 'Completed'],
              ['Mobile Meets', 'Engineering', '500', '480', 'In Progress']
            ]
          }
        ]
      };
    } else if (docType === 'ppt') {
      initialData = {
        slides: [
          {
            id: 'slide-1',
            title: title || 'New Presentation',
            subtitle: `Created by ${req.user.name}`,
            notes: 'Presentation notes for slide 1'
          }
        ]
      };
    }

    const newDoc = {
      title: (title || `Untitled ${docType.toUpperCase()}`).trim(),
      type: docType,
      ownerId: req.user.id,
      ownerName: req.user.name,
      chatId: chatId || null,
      scope: docScope,
      members,
      data: initialData,
      isPublic: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const created = await db.createDocument(newDoc);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/documents/:docId', authenticateToken, async (req, res) => {
  try {
    const { docId } = req.params;
    const doc = await db.getDocumentById(docId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/documents/:docId', authenticateToken, async (req, res) => {
  try {
    const { docId } = req.params;
    const { title, data } = req.body;
    const updated = await db.updateDocument(docId, {
      ...(title ? { title: title.trim() } : {}),
      ...(data ? { data } : {})
    });
    if (!updated) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// WebSockets & WebRTC Signaling
// ---------------------------------------------------------------------------
const onlineUsers = new Map();
const socketToUser = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 [Socket Connected] ${socket.id}`);

  socket.on('auth:connect', async (token) => {
    try {
      if (!token) return;
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.findUserById(decoded.id);
      if (user) {
        const { passwordHash, ...cleanUser } = user;
        const uId = cleanUser.id || cleanUser._id?.toString();
        socketToUser.set(socket.id, { ...cleanUser, id: uId });

        // Join personal user room
        socket.join(`user:${uId}`);

        if (!onlineUsers.has(uId)) {
          onlineUsers.set(uId, new Set());
        }
        onlineUsers.get(uId).add(socket.id);

        // Auto-join all existing chats
        const userChats = await db.getUserChats(uId);
        userChats.forEach((c) => {
          socket.join(`chat:${c.id}`);
        });

        await db.updateUser(uId, { status: 'online' });
        io.emit('presence:update', { userId: uId, status: 'online' });
        console.log(`👤 User Authenticated on Socket: ${cleanUser.name} (${uId})`);
      }
    } catch (err) {
      console.error('Socket auth failed:', err.message);
    }
  });

  socket.on('chat:join', (chatId) => {
    socket.join(`chat:${chatId}`);
  });

  socket.on('chat:send_message', async (payload) => {
    const sender = socketToUser.get(socket.id);
    if (!sender) return;

    const { chatId, content, attachment } = payload;
    if (!chatId || (!content && !attachment)) return;

    const newMsg = {
      chatId,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      content: (content || '').trim(),
      attachment: attachment || null,
      reactions: {},
      readBy: [sender.id],
      status: 'delivered',
      createdAt: new Date().toISOString()
    };

    const savedMsg = await db.createMessage(newMsg);

    // 1. Acknowledge back to sender with saved message & tempId
    socket.emit('chat:message_sent', {
      tempId: payload.tempId,
      message: savedMsg
    });

    // 2. Broadcast to other members in the chat room (excluding sender socket)
    socket.to(`chat:${chatId}`).emit('chat:new_message', savedMsg);

    // 3. Notify chat members with updated snippet for their left sidebar
    const chat = await db.getChatById(chatId);
    if (chat) {
      chat.members.forEach((memberId) => {
        io.to(`user:${memberId}`).emit('chat:updated', { chatId, lastMessage: savedMsg });
      });
    }
  });

  // Blue Ticks: Mark messages as read by user
  socket.on('chat:mark_read', async ({ chatId }) => {
    const user = socketToUser.get(socket.id);
    if (!user || !chatId) return;

    await db.markMessagesRead(chatId, user.id);

    // Emit read receipt event (triggers blue ticks on sender's screen)
    io.to(`chat:${chatId}`).emit('chat:messages_read', {
      chatId,
      readerId: user.id
    });

    const chat = await db.getChatById(chatId);
    if (chat) {
      chat.members.forEach((memberId) => {
        io.to(`user:${memberId}`).emit('chat:messages_read', {
          chatId,
          readerId: user.id
        });
      });
    }
  });

  socket.on('chat:reaction', async ({ messageId, emoji, chatId }) => {
    const user = socketToUser.get(socket.id);
    if (!user) return;
    const updatedMsg = await db.addReaction(messageId, emoji, user.id);
    if (updatedMsg) {
      io.to(`chat:${chatId}`).emit('chat:reaction_updated', {
        messageId,
        reactions: updatedMsg.reactions
      });
    }
  });

  socket.on('chat:delete_message', async ({ chatId, messageId }) => {
    const user = socketToUser.get(socket.id);
    if (!user || !chatId || !messageId) return;

    const chat = await db.getChatById(chatId);
    if (!chat || !chat.members.includes(user.id)) return;

    const result = await db.deleteMessage(messageId, user.id);
    if (result) {
      io.to(`chat:${chatId}`).emit('chat:message_deleted', {
        chatId,
        messageId: result.messageId || messageId,
        lastMessage: result.lastMessage
      });

      chat.members.forEach((mId) => {
        io.to(`user:${mId}`).emit('chat:message_deleted', {
          chatId,
          messageId: result.messageId || messageId,
          lastMessage: result.lastMessage
        });
      });
    }
  });

  // Typing indicator
  socket.on('chat:typing', async ({ chatId, isTyping }) => {
    const user = socketToUser.get(socket.id);
    if (!user) return;

    socket.to(`chat:${chatId}`).emit('chat:user_typing', {
      chatId,
      userId: user.id,
      userName: user.name,
      isTyping
    });

    const chat = await db.getChatById(chatId);
    if (chat) {
      chat.members.forEach((mId) => {
        if (mId !== user.id) {
          socket.to(`user:${mId}`).emit('chat:user_typing', {
            chatId,
            userId: user.id,
            userName: user.name,
            isTyping
          });
        }
      });
    }
  });

  // Collaborative Work Sync
  socket.on('doc:join', (docId) => {
    socket.join(`doc:${docId}`);
  });

  socket.on('doc:leave', (docId) => {
    socket.leave(`doc:${docId}`);
  });

  socket.on('doc:word_update', async ({ docId, content, delta }) => {
    await db.updateDocument(docId, { data: { content } });
    socket.to(`doc:${docId}`).emit('doc:word_synced', { content, delta, senderId: socket.id });
  });

  socket.on('doc:excel_cell_update', async ({ docId, sheetIndex, row, col, value, formula }) => {
    const doc = await db.getDocumentById(docId);
    if (doc && doc.data && doc.data.sheets) {
      const sheet = doc.data.sheets[sheetIndex || 0];
      if (sheet) {
        sheet.data = sheet.data || [];
        while (sheet.data.length <= row) sheet.data.push([]);
        while (sheet.data[row].length <= col) sheet.data[row].push('');
        sheet.data[row][col] = value;
        await db.updateDocument(docId, { data: doc.data });
      }
    }
    socket.to(`doc:${docId}`).emit('doc:excel_cell_synced', {
      sheetIndex,
      row,
      col,
      value,
      formula,
      senderId: socket.id
    });
  });

  socket.on('doc:ppt_slide_update', async ({ docId, slideIndex, slideData }) => {
    const doc = await db.getDocumentById(docId);
    if (doc && doc.data && doc.data.slides) {
      doc.data.slides[slideIndex] = slideData;
      await db.updateDocument(docId, { data: doc.data });
    }
    socket.to(`doc:${docId}`).emit('doc:ppt_slide_synced', {
      slideIndex,
      slideData,
      senderId: socket.id
    });
  });

  // WebRTC Audio/Video Calls (Direct 1-on-1 & Group Meetings)
  socket.on('call:initiate', async ({ chatId, targetUserId, callType, roomId }) => {
    const caller = socketToUser.get(socket.id);
    if (!caller) return;

    const meetRoomId = roomId || `meet_${Date.now()}`;
    const type = callType || 'video';

    // 1. Direct Call
    if (targetUserId) {
      const targetSockets = onlineUsers.get(targetUserId);
      if (targetSockets && targetSockets.size > 0) {
        targetSockets.forEach((tSocketId) => {
          io.to(tSocketId).emit('call:incoming', {
            caller,
            chatId,
            callType: type,
            roomId: meetRoomId
          });
        });
      } else {
        socket.emit('call:user_offline', { targetUserId });
        // Log missed call in direct chat
        if (chatId) {
          const missedMsg = {
            chatId,
            senderId: caller.id,
            senderName: caller.name,
            senderAvatar: caller.avatar,
            content: `📞 Missed ${type === 'video' ? 'Video' : 'Audio'} Call`,
            type: 'call',
            callData: { callType: type, status: 'missed', duration: 'Missed' },
            reactions: {},
            readBy: [caller.id],
            status: 'delivered',
            createdAt: new Date().toISOString()
          };
          const saved = await db.createMessage(missedMsg);
          io.to(`chat:${chatId}`).emit('chat:new_message', saved);
        }
      }
    }
    // 2. Group Meeting Call
    else if (chatId) {
      const chat = await db.getChatById(chatId);
      if (chat && chat.type === 'group') {
        const meetingData = {
          roomId: meetRoomId,
          callType: type,
          startedBy: caller.name,
          startedById: caller.id,
          startedAt: new Date().toISOString()
        };
        await db.updateChatActiveMeeting(chatId, meetingData);

        // Notify all group members
        io.to(`chat:${chatId}`).emit('call:group_meeting_started', {
          chatId,
          meeting: meetingData
        });

        chat.members.forEach((mId) => {
          if (mId !== caller.id) {
            io.to(`user:${mId}`).emit('call:group_meeting_started', {
              chatId,
              meeting: meetingData
            });
          }
        });
      }
    }
  });

  socket.on('call:accept', ({ roomId, callerId, chatId }) => {
    const responder = socketToUser.get(socket.id);
    const callerSockets = onlineUsers.get(callerId);
    if (callerSockets) {
      callerSockets.forEach((cSocketId) => {
        io.to(cSocketId).emit('call:accepted', { roomId, responder, chatId });
      });
    }
  });

  socket.on('call:reject', async ({ callerId, chatId, callType }) => {
    const responder = socketToUser.get(socket.id);
    const callerSockets = onlineUsers.get(callerId);
    if (callerSockets) {
      callerSockets.forEach((cSocketId) => {
        io.to(cSocketId).emit('call:rejected', { responder });
      });
    }

    if (chatId && responder) {
      const callLogMsg = {
        chatId,
        senderId: callerId,
        senderName: 'Caller',
        senderAvatar: null,
        content: `📞 Declined ${callType === 'audio' ? 'Audio' : 'Video'} Call`,
        type: 'call',
        callData: { callType: callType || 'video', status: 'declined', duration: 'Declined' },
        reactions: {},
        readBy: [callerId],
        status: 'delivered',
        createdAt: new Date().toISOString()
      };
      const saved = await db.createMessage(callLogMsg);
      io.to(`chat:${chatId}`).emit('chat:new_message', saved);
    }
  });

  socket.on('call:end', async ({ roomId, chatId, callType, durationSecs }) => {
    const user = socketToUser.get(socket.id);
    if (!user) return;

    if (roomId) {
      socket.to(`webrtc:${roomId}`).emit('call:peer_ended', { userId: user.id });
    }

    if (chatId) {
      const chat = await db.getChatById(chatId);
      if (chat && chat.type === 'group') {
        const clientsInRoom = io.sockets.adapter.rooms.get(`webrtc:${roomId}`) || new Set();
        if (clientsInRoom.size <= 1) {
          await db.updateChatActiveMeeting(chatId, null);
          io.to(`chat:${chatId}`).emit('call:group_meeting_ended', { chatId });
        }
      }

      const durationText = durationSecs > 0
        ? `${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s`
        : 'Ended';

      const callLogMsg = {
        chatId,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar,
        content: `${callType === 'audio' ? '📞 Audio' : '📹 Video'} Call • ${durationText}`,
        type: 'call',
        callData: {
          callType: callType || 'video',
          status: 'completed',
          duration: durationText,
          durationSecs
        },
        reactions: {},
        readBy: [user.id],
        status: 'delivered',
        createdAt: new Date().toISOString()
      };

      const saved = await db.createMessage(callLogMsg);
      io.to(`chat:${chatId}`).emit('chat:new_message', saved);
    }
  });

  socket.on('webrtc:join_room', ({ roomId }) => {
    socket.join(`webrtc:${roomId}`);
    const clientsInRoom = io.sockets.adapter.rooms.get(`webrtc:${roomId}`) || new Set();
    const otherPeers = Array.from(clientsInRoom).filter((id) => id !== socket.id);

    socket.emit('webrtc:peers_in_room', {
      peers: otherPeers.map((pId) => ({
        socketId: pId,
        user: socketToUser.get(pId) || { name: 'Peer', id: pId }
      }))
    });

    socket.to(`webrtc:${roomId}`).emit('webrtc:peer_joined', {
      socketId: socket.id,
      user: socketToUser.get(socket.id) || { name: 'Peer', id: socket.id }
    });
  });

  socket.on('webrtc:signal', ({ targetSocketId, signalData }) => {
    io.to(targetSocketId).emit('webrtc:signal', {
      senderSocketId: socket.id,
      signalData
    });
  });

  socket.on('webrtc:leave_room', ({ roomId }) => {
    socket.leave(`webrtc:${roomId}`);
    socket.to(`webrtc:${roomId}`).emit('webrtc:peer_left', { socketId: socket.id });
  });

  socket.on('disconnect', async () => {
    const user = socketToUser.get(socket.id);
    if (user) {
      socketToUser.delete(socket.id);
      const userSockets = onlineUsers.get(user.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(user.id);
          await db.updateUser(user.id, { status: 'offline' });
          io.emit('presence:update', { userId: user.id, status: 'offline' });
        }
      }
    }
    io.emit('webrtc:peer_left', { socketId: socket.id });
    console.log(`🔌 [Socket Disconnected] ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 SyncSpace MongoDB Production Server running on http://localhost:${PORT}`);
});
