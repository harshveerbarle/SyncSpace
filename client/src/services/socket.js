import { io } from 'socket.io-client';

// Use same origin so Vite dev server proxy forwards /socket.io to backend on both desktop and mobile
export const socket = io({
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 15,
  reconnectionDelay: 1000
});

socket.on('connect', () => {
  console.log('⚡ Connected to SyncSpace WebSocket server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from SyncSpace WebSocket server');
});

export default socket;
