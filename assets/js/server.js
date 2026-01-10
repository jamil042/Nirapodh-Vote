// assets/js/server.js - Anonymous Chat Version
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { randomUUID } = require('crypto');

const app = express();
const server = http.createServer(app);

// CORS middleware
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// In-memory state
const onlineUsers = new Set(); // Just track socket IDs
let globalMessageHistory = [];
const MAX_HISTORY = 100;
const MAX_MESSAGE_LENGTH = 500;

// ===== Utility functions =====

function broadcastOnlineCount() {
  io.emit('users_online', { 
    users: Array.from({ length: onlineUsers.size }, (_, i) => `User${i + 1}`)
  });
  console.log(`📊 Online users: ${onlineUsers.size}`);
}

function sanitizeMessage(text) {
  const trimmed = (text || '').trim().slice(0, MAX_MESSAGE_LENGTH);
  return trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== Socket.IO connection handling =====
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Add to online users
  onlineUsers.add(socket.id);
  broadcastOnlineCount();

  // Send connection confirmation
  socket.emit('connection_status', {
    ok: true,
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  // ---- Request message history
  socket.on('request_message_history', () => {
    const recentMessages = globalMessageHistory.slice(-50);
    socket.emit('message_history', {
      messages: recentMessages,
      count: recentMessages.length
    });
    console.log(`📜 Sent ${recentMessages.length} messages to ${socket.id}`);
  });

  // ---- Global message (Anonymous)
  socket.on('global_message', (data) => {
    const message = sanitizeMessage(data?.message || '');

    if (!message || message.length === 0) {
      return; // Empty message, ignore
    }

    // Create message object
    const msgObj = {
      id: data.id || randomUUID(),
      message,
      timestamp: data.timestamp || new Date().toISOString(),
      socketId: socket.id // ✅ Add sender's socket ID
    };

    // Store in history
    globalMessageHistory.push(msgObj);
    if (globalMessageHistory.length > MAX_HISTORY) {
      globalMessageHistory.shift();
    }

    // Broadcast to ALL clients (including sender)
    io.emit('receive_global_message', msgObj);

    console.log(`💬 [${socket.id.slice(0, 8)}]: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
  });

  // ---- User logout (optional cleanup)
  socket.on('user_logout', () => {
    onlineUsers.delete(socket.id);
    broadcastOnlineCount();
    console.log(`👋 ${socket.id} logged out`);
  });

  // ---- Disconnect handler
  socket.on('disconnect', (reason) => {
    onlineUsers.delete(socket.id);
    broadcastOnlineCount();
    console.log(`🔌 Socket ${socket.id} disconnected: ${reason}`);
  });

  // ---- Error handler
  socket.on('error', (error) => {
    console.error(`❌ Socket error (${socket.id}):`, error);
  });
});

// ===== HTTP routes =====
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Nirapod Vote Anonymous Chat Server',
    onlineUsers: onlineUsers.size,
    messagesInHistory: globalMessageHistory.length
  });
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    onlineUsers: onlineUsers.size
  });
});

app.get('/stats', (req, res) => {
  res.json({
    totalUsers: onlineUsers.size,
    messageHistory: globalMessageHistory.length
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ===== Start server =====
const PORT = process.env.PORT || 5501;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   🚀 Anonymous Chat Server           ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║   Server: http://localhost:${PORT}     ║`);
  console.log(`║   Status: ✅ Running                   ║`);
  console.log('╚════════════════════════════════════════╝');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});