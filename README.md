# 🚀 SyncSpace — Real-Time Production Platform

**SyncSpace** is an all-in-one real-time collaboration suite. It features **real user accounts**, **WhatsApp-style direct & group messaging**, **real WebRTC peer-to-peer audio & video calls**, and **real-time collaborative workspaces for Word, Excel, and PowerPoint (PPT)**.

> Zero hardcoded demo accounts or fake messages — everything is backed by a live database and synchronized over WebSockets and WebRTC.

---

## 🌟 Core Pillars

### 1. 🔐 Real User Authentication & Accounts
- **Sign Up**: Register with your Full Name, unique Username, Email, Password, and custom color avatar.
- **Security**: Passwords securely hashed with `bcryptjs` and session tokens issued with `jsonwebtoken` (JWT).
- **Persistent Database**: Stored in `server/data/syncspace.json` so accounts and messages survive server restarts.

### 2. 💬 WhatsApp-Style Real Chat & Groups
- **1-on-1 Direct Messaging**: Search any registered user by name or username and start an instant private conversation.
- **Group Chats**: Create groups with custom names, emoji icons, and multiple team members.
- **Real-Time Delivery**: Messages, timestamps, read receipts, and typing indicators streamed via Socket.IO.
- **Reactions & Attachments**: Live emoji reactions (`🚀`, `👍`, `❤️`, `🔥`) updated live across all connected clients.

### 3. 📹 Real WebRTC Audio & Video Calling
- **Direct 1-on-1 Calling**:
  - In any direct chat, click the **Video Call** or **Audio Call** button to ring the other user.
  - The recipient receives an **Incoming Call** ringing modal with live **Accept** and **Decline** actions.
- **Peer-to-Peer Streaming**:
  - Direct P2P audio and video streaming via native browser `RTCPeerConnection` and STUN servers.
  - Real microphone mute/unmute and camera start/stop track control.
- **Real Screen Sharing**:
  - Stream your real window, application, or tab via `navigator.mediaDevices.getDisplayMedia`.
- **Group Meeting Rooms**:
  - Share meeting room codes for multi-user boardroom video calls.

### 4. 📊 Real-Time Collaborative Workspace (Word · Excel · PPT)
- **📝 Word (Docs)**:
  - Full rich text multiplayer editor with real-time text synchronization over WebSockets.
  - Toolbar with undo/redo, bold, italics, underline, and alignments.
- **📊 Excel (Spreadsheets)**:
  - Interactive grid with rows (1 to 20+) and columns (A to G).
  - Formula bar with active cell coordinate display (e.g. `B2`).
  - **Live Cell Sync**: Whenever User A updates a cell value or formula, User B's spreadsheet updates instantly with a colored collaborator highlight!
- **📽️ PowerPoint (Slides / Presentations)**:
  - Slide deck manager (Slide 1, Slide 2, Add Slide).
  - Edit slide titles, subtitles, and bullet points.
  - Real-time slide synchronization across all participants.

---

## 🚀 How to Run Locally

### 1. Start Both Servers
From the root directory:

- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API & WebSockets**: [http://localhost:3001](http://localhost:3001)

---

## 🧪 How to Test Multiplayer (2 Real Users)

1. Open [http://localhost:5173](http://localhost:5173) in your normal browser:
   - Click **Sign Up** and create account `User A` (e.g., username: `alex`, password: `password123`).
2. Open an **Incognito Window** (or a different browser like Edge/Firefox) at [http://localhost:5173](http://localhost:5173):
   - Click **Sign Up** and create account `User B` (e.g., username: `sarah`, password: `password123`).
3. **Start Chatting**:
   - In `User A`'s window, click **+** to start a chat, select `Sarah`, and send a message.
   - Watch the message appear in real-time in `Sarah`'s window!
4. **Make a Video Call**:
   - In `User A`'s chat with Sarah, click the **Video Call** icon.
   - `Sarah`'s screen will ring with an incoming call modal. Click **Accept** to start real WebRTC video streaming between both windows!
5. **Collaborate on Word, Excel, or PPT**:
   - Switch to the **Collaborative Work** tab (2nd icon on left dock).
   - Create an Excel spreadsheet or Word doc.
   - Type in cell `B2` in window 1, and watch window 2 update immediately!
