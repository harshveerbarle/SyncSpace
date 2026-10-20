import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { User } from './models/User.js';
import { Chat } from './models/Chat.js';
import { Message } from './models/Message.js';
import { Document } from './models/Document.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from server dir or root
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'syncspace.json');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/syncspace';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class DatabaseManager {
  constructor() {
    this.isMongoConnected = false;
    this.fileData = { users: [], chats: [], messages: [], documents: [] };
    this.loadFileDb();
    this.connectMongo();
  }

  loadFileDb() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.fileData = JSON.parse(raw);
        this.fileData.users = this.fileData.users || [];
        this.fileData.chats = this.fileData.chats || [];
        this.fileData.messages = this.fileData.messages || [];
        this.fileData.documents = this.fileData.documents || [];
      } else {
        this.saveFileDb();
      }
    } catch (e) {
      this.fileData = { users: [], chats: [], messages: [], documents: [] };
      this.saveFileDb();
    }
  }

  saveFileDb() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.fileData, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving file database:', err);
    }
  }

  async connectMongo() {
    try {
      console.log(`📡 Connecting to MongoDB at: ${MONGODB_URI} ...`);
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 2500
      });
      this.isMongoConnected = true;
      console.log('✅ MongoDB connected successfully! Operating in full MongoDB mode.');
    } catch (err) {
      this.isMongoConnected = false;
      console.warn(`⚠️ MongoDB connection unavailable (${err.message}).`);
      console.log('💡 Note: SyncSpace is seamlessly using local persistent database fallback. To use MongoDB Atlas or local MongoDB, set MONGODB_URI in server/.env');
    }
  }

  // ----------------- Users -----------------
  async findUserByEmailOrUsername(identifier) {
    const idf = (identifier || '').toLowerCase().trim();
    if (this.isMongoConnected) {
      return await User.findOne({
        $or: [{ email: idf }, { username: idf }]
      }).lean();
    }
    return this.fileData.users.find(
      (u) => u.email.toLowerCase() === idf || u.username.toLowerCase() === idf
    );
  }

  async findUserById(id) {
    if (this.isMongoConnected) {
      try {
        const u = await User.findById(id).lean();
        if (u) return { ...u, id: u._id.toString() };
      } catch {
        // Fall through to query by id field
        const u = await User.findOne({ id }).lean();
        if (u) return u;
      }
    }
    return this.fileData.users.find((u) => u.id === id);
  }

  async createUser(userData) {
    if (this.isMongoConnected) {
      const created = await User.create(userData);
      return created.toJSON();
    }
    this.fileData.users.push(userData);
    this.saveFileDb();
    return userData;
  }

  async getAllUsers(excludeId) {
    if (this.isMongoConnected) {
      const users = await User.find({ _id: { $ne: excludeId } }).select('-passwordHash').lean();
      return users.map((u) => ({ ...u, id: u._id.toString() }));
    }
    return this.fileData.users
      .filter((u) => u.id !== excludeId)
      .map(({ passwordHash, ...rest }) => rest);
  }

  async updateUser(id, updates) {
    if (this.isMongoConnected) {
      try {
        const u = await User.findByIdAndUpdate(id, updates, { returnDocument: 'after', new: true }).lean();
        if (u) return { ...u, id: u._id.toString() };
      } catch {
        const u = await User.findOneAndUpdate({ id }, updates, { returnDocument: 'after', new: true }).lean();
        if (u) return u;
      }
    }
    const idx = this.fileData.users.findIndex((u) => u.id === id);
    if (idx !== -1) {
      this.fileData.users[idx] = { ...this.fileData.users[idx], ...updates };
      this.saveFileDb();
      return this.fileData.users[idx];
    }
    return null;
  }

  async updateUserProfile(id, updates) {
    return this.updateUser(id, updates);
  }

  // ----------------- Chats -----------------
  async getUserChats(userId) {
    if (this.isMongoConnected) {
      const chats = await Chat.find({ members: userId }).sort({ updatedAt: -1 }).lean();
      return chats.map((c) => ({ ...c, id: c._id.toString() }));
    }
    return this.fileData.chats.filter((c) => c.members.includes(userId));
  }

  async getDirectChat(userId1, userId2) {
    if (this.isMongoConnected) {
      const chat = await Chat.findOne({
        type: 'direct',
        members: { $all: [userId1, userId2], $size: 2 }
      }).lean();
      if (chat) return { ...chat, id: chat._id.toString() };
      return null;
    }
    return this.fileData.chats.find(
      (c) =>
        c.type === 'direct' &&
        c.members.includes(userId1) &&
        c.members.includes(userId2) &&
        c.members.length === 2
    );
  }

  async createChat(chatData) {
    if (this.isMongoConnected) {
      const created = await Chat.create(chatData);
      return created.toJSON();
    }
    this.fileData.chats.push(chatData);
    this.saveFileDb();
    return chatData;
  }

  async getChatById(chatId) {
    if (this.isMongoConnected) {
      try {
        const c = await Chat.findById(chatId).lean();
        if (c) return { ...c, id: c._id.toString() };
      } catch {
        const c = await Chat.findOne({ id: chatId }).lean();
        if (c) return c;
      }
    }
    return this.fileData.chats.find((c) => c.id === chatId);
  }

  // ----------------- Messages -----------------
  async getChatMessages(chatId) {
    if (this.isMongoConnected) {
      const msgs = await Message.find({ chatId }).sort({ createdAt: 1 }).lean();
      return msgs.map((m) => ({
        ...m,
        id: m._id.toString(),
        createdAt: m.createdAt?.toISOString ? m.createdAt.toISOString() : m.createdAt
      }));
    }
    return this.fileData.messages.filter((m) => m.chatId === chatId);
  }

  async createMessage(msgData) {
    const fullMsg = {
      ...msgData,
      readBy: [msgData.senderId],
      status: 'delivered'
    };

    if (this.isMongoConnected) {
      const created = await Message.create(fullMsg);
      try {
        await Chat.findByIdAndUpdate(msgData.chatId, {
          lastMessage: {
            text: msgData.content,
            senderId: msgData.senderId,
            createdAt: new Date()
          },
          updatedAt: new Date()
        });
      } catch {
        await Chat.findOneAndUpdate({ id: msgData.chatId }, {
          lastMessage: {
            text: msgData.content,
            senderId: msgData.senderId,
            createdAt: new Date()
          },
          updatedAt: new Date()
        });
      }
      return created.toJSON();
    }
    this.fileData.messages.push(fullMsg);
    const chat = this.fileData.chats.find((c) => c.id === msgData.chatId);
    if (chat) {
      chat.lastMessage = {
        text: msgData.content,
        senderId: msgData.senderId,
        createdAt: msgData.createdAt
      };
      chat.updatedAt = msgData.createdAt;
    }
    this.saveFileDb();
    return fullMsg;
  }

  async deleteMessage(messageId, userId) {
    if (this.isMongoConnected) {
      let msg = null;
      try {
        msg = await Message.findById(messageId);
      } catch {
        msg = await Message.findOne({ id: messageId });
      }
      if (!msg) return null;

      const chatId = msg.chatId;
      await Message.deleteOne({ _id: msg._id });

      // Find new latest message for this chat to keep sidebar accurate
      const remainingLast = await Message.findOne({ chatId }).sort({ createdAt: -1 }).lean();
      const lastMessageUpdate = remainingLast
        ? {
            id: remainingLast._id.toString(),
            text: remainingLast.content || (remainingLast.attachment ? `📎 ${remainingLast.attachment.name || 'File'}` : ''),
            senderId: remainingLast.senderId,
            createdAt: remainingLast.createdAt
          }
        : { id: null, text: '', senderId: null, createdAt: new Date() };

      try {
        await Chat.findByIdAndUpdate(chatId, { lastMessage: lastMessageUpdate, updatedAt: new Date() });
      } catch {
        await Chat.findOneAndUpdate({ id: chatId }, { lastMessage: lastMessageUpdate, updatedAt: new Date() });
      }

      return {
        success: true,
        messageId: msg._id.toString(),
        chatId,
        lastMessage: lastMessageUpdate
      };
    }

    const idx = this.fileData.messages.findIndex((m) => m.id === messageId || m._id === messageId);
    if (idx === -1) return null;

    const [deleted] = this.fileData.messages.splice(idx, 1);
    const chatId = deleted.chatId;

    const remaining = this.fileData.messages.filter((m) => m.chatId === chatId);
    const lastMsg = remaining.length > 0 ? remaining[remaining.length - 1] : null;

    const chat = this.fileData.chats.find((c) => c.id === chatId);
    const lastMessageUpdate = lastMsg
      ? {
          id: lastMsg.id,
          text: lastMsg.content || (lastMsg.attachment ? `📎 ${lastMsg.attachment.name || 'File'}` : ''),
          senderId: lastMsg.senderId,
          createdAt: lastMsg.createdAt
        }
      : { id: null, text: '', senderId: null, createdAt: new Date().toISOString() };

    if (chat) {
      chat.lastMessage = lastMessageUpdate;
      chat.updatedAt = lastMsg ? lastMsg.createdAt : new Date().toISOString();
    }

    this.saveFileDb();
    return {
      success: true,
      messageId: deleted.id || messageId,
      chatId,
      lastMessage: lastMessageUpdate
    };
  }

  async markMessagesRead(chatId, userId) {
    if (this.isMongoConnected) {
      await Message.updateMany(
        { chatId, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId }, $set: { status: 'read' } }
      );
      return true;
    }
    let updated = false;
    this.fileData.messages.forEach((m) => {
      if (m.chatId === chatId) {
        m.readBy = m.readBy || [];
        if (!m.readBy.includes(userId)) {
          m.readBy.push(userId);
          m.status = 'read';
          updated = true;
        }
      }
    });
    if (updated) this.saveFileDb();
    return true;
  }

  async getUnreadCount(chatId, userId) {
    if (this.isMongoConnected) {
      try {
        return await Message.countDocuments({
          chatId,
          senderId: { $ne: userId },
          readBy: { $ne: userId }
        });
      } catch {
        return 0;
      }
    }
    return this.fileData.messages.filter(
      (m) =>
        m.chatId === chatId &&
        m.senderId !== userId &&
        (!m.readBy || !m.readBy.includes(userId))
    ).length;
  }

  async updateUserProfile(userId, updates) {
    return await this.updateUser(userId, updates);
  }

  async addReaction(messageId, emoji, userId) {
    if (this.isMongoConnected) {
      const msg = await Message.findById(messageId);
      if (msg) {
        const currentReactions = msg.reactions?.get(emoji) || [];
        if (currentReactions.includes(userId)) {
          msg.reactions.set(emoji, currentReactions.filter((id) => id !== userId));
          if (msg.reactions.get(emoji).length === 0) {
            msg.reactions.delete(emoji);
          }
        } else {
          msg.reactions.set(emoji, [...currentReactions, userId]);
        }
        await msg.save();
        return msg.toJSON();
      }
    }
    const msg = this.fileData.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.reactions = msg.reactions || {};
      msg.reactions[emoji] = msg.reactions[emoji] || [];
      if (!msg.reactions[emoji].includes(userId)) {
        msg.reactions[emoji].push(userId);
      } else {
        msg.reactions[emoji] = msg.reactions[emoji].filter((id) => id !== userId);
        if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
      }
      this.saveFileDb();
      return msg;
    }
    return null;
  }

  // ----------------- Documents (Word, Excel, PPT) -----------------
  async getUserDocuments(userId, chatId = null) {
    if (this.isMongoConnected) {
      const query = { members: userId };
      if (chatId) {
        query.chatId = chatId;
      }
      const docs = await Document.find(query).sort({ updatedAt: -1 }).lean();
      return docs.map((d) => ({ ...d, id: d._id.toString() }));
    }
    return this.fileData.documents.filter((d) => {
      const isMember = (d.members && d.members.includes(userId)) || d.ownerId === userId;
      if (!isMember) return false;
      if (chatId) return d.chatId === chatId;
      return true;
    });
  }

  async getDocumentById(docId) {
    if (this.isMongoConnected) {
      try {
        const d = await Document.findById(docId).lean();
        if (d) return { ...d, id: d._id.toString() };
      } catch {
        const d = await Document.findOne({ id: docId }).lean();
        if (d) return d;
      }
    }
    return this.fileData.documents.find((d) => d.id === docId);
  }

  async createDocument(docData) {
    const fullDoc = {
      ...docData,
      isPublic: false,
      members: Array.from(new Set(docData.members || [docData.ownerId]))
    };
    if (this.isMongoConnected) {
      const created = await Document.create(fullDoc);
      return created.toJSON();
    }
    this.fileData.documents.push(fullDoc);
    this.saveFileDb();
    return fullDoc;
  }

  async updateChatActiveMeeting(chatId, meetingData) {
    if (this.isMongoConnected) {
      try {
        await Chat.findByIdAndUpdate(chatId, { activeMeeting: meetingData });
      } catch {
        await Chat.findOneAndUpdate({ id: chatId }, { activeMeeting: meetingData });
      }
    }
    const c = this.fileData.chats.find((x) => x.id === chatId);
    if (c) {
      c.activeMeeting = meetingData;
      this.saveFileDb();
    }
  }

  async updateDocument(docId, updates) {
    if (this.isMongoConnected) {
      try {
        const d = await Document.findByIdAndUpdate(
          docId,
          { ...updates, updatedAt: new Date() },
          { returnDocument: 'after' }
        ).lean();
        if (d) return { ...d, id: d._id.toString() };
      } catch {
        const d = await Document.findOneAndUpdate(
          { id: docId },
          { ...updates, updatedAt: new Date() },
          { returnDocument: 'after' }
        ).lean();
        if (d) return d;
      }
    }
    const idx = this.fileData.documents.findIndex((d) => d.id === docId);
    if (idx !== -1) {
      this.fileData.documents[idx] = {
        ...this.fileData.documents[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveFileDb();
      return this.fileData.documents[idx];
    }
    return null;
  }
}

export const db = new DatabaseManager();
