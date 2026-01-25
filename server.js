// Main Server File - NirapodhVote Backend (Merged: OTP + Chat Features)
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./server/config/db');
const { randomUUID } = require('crypto');

// Import routes
const authRoutes = require('./server/routes/auth');
const voteRoutes = require('./server/routes/vote');
const adminRoutes = require('./server/routes/admin');

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: '*', // In production, replace with your domain
  credentials: true
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(__dirname));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vote', voteRoutes);
app.use('/api/admin', adminRoutes);

// Socket.IO setup for chat
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// ===== CHAT STATE MANAGEMENT =====

// Anonymous chat state - Track by NID to prevent duplicate counting
const onlineUsers = new Map(); // nid -> { username, sockets: Set, joinedAt, anonymousName }
const anonymousCounter = new Map(); // nid -> anonymousNumber
let nextAnonymousNumber = 1;
let globalMessageHistory = [];

// Dashboard users tracking - Track by NID to prevent duplicate counting
const dashboardUsers = new Map(); // nid -> { name, nid, sockets: Set, loginAt }
const socketToNID = new Map(); // socketId -> nid (for reverse lookup)

// Admin-Citizen chat state
const activeCitizens = new Map(); // nid -> { socket, name, nid, timestamp }
const registeredCitizens = new Map(); // nid -> { name, registeredAt } (PERMANENT RECORD)
let adminSocket = null;
const chatHistory = new Map(); // nid -> messages[] (PERSISTENT STORAGE)

const MAX_HISTORY = 100;
const MAX_MESSAGE_LENGTH = 500;

// ===== UTILITY FUNCTIONS =====

function sanitizeMessage(text) {
  const trimmed = (text || '').trim().slice(0, MAX_MESSAGE_LENGTH);
  return trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const cleaned = username.trim();
  return cleaned.length >= 2 && cleaned.length <= 20;
}

function broadcastOnlineUsers() {
  // Count unique NIDs only
  const uniqueUsers = onlineUsers.size;
  const users = Array.from(onlineUsers.values())
    .map(u => u.username);
  io.emit('users_online', { users, count: uniqueUsers });
  console.log(`📊 Anonymous chat users (unique): ${uniqueUsers}`);
}

function broadcastDashboardCount() {
  // Count unique NIDs only (not tabs/sockets)
  const count = dashboardUsers.size;
  io.emit('dashboard_count', { count });
  console.log(`👥 Dashboard users: ${count}`);
}

function broadcastActiveCitizens() {
  const citizens = Array.from(activeCitizens.values()).map(c => ({
    name: c.name,
    nid: c.nid,
    timestamp: c.timestamp
  }));
  
  if (adminSocket) {
    io.to(adminSocket).emit('active_citizens', { citizens });
    console.log(`📤 Sent ${citizens.length} active citizens to admin`);
  }
}

// ===== SOCKET.IO CONNECTION HANDLING =====
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.emit('connection_status', {
    ok: true,
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  // ===== ANONYMOUS CHAT EVENTS =====

  socket.on('user_login', (data) => {
    const username = data?.username?.trim();
    const userNID = data?.nid || socket.id; // Use NID if provided, else socket.id as fallback

    if (!validateUsername(username)) {
      socket.emit('chat_error', { msg: 'নাম ২-২০ অক্ষরের মধ্যে হতে হবে' });
      return;
    }

    const existingUser = Array.from(onlineUsers.values())
      .find(u => u.username === username && !onlineUsers.has(userNID));

    if (existingUser) {
      socket.emit('chat_error', { msg: 'এই নাম ইতিমধ্যে ব্যবহৃত হচ্ছে। অন্য নাম চেষ্টা করুন।' });
      return;
    }

    // Store socket to NID mapping
    socketToNID.set(socket.id, userNID);

    // If user already exists, just add this socket
    if (onlineUsers.has(userNID)) {
      onlineUsers.get(userNID).sockets.add(socket.id);
      console.log(`🔄 User ${username} opened new tab (total: ${onlineUsers.get(userNID).sockets.size})`);
    } else {
      // New user - assign anonymous number
      const anonymousName = `Person-${nextAnonymousNumber}`;
      anonymousCounter.set(userNID, nextAnonymousNumber);
      nextAnonymousNumber++;
      
      onlineUsers.set(userNID, {
        username,
        sockets: new Set([socket.id]),
        joinedAt: new Date().toISOString(),
        anonymousName: anonymousName
      });
      
      io.emit('user_joined', { 
        username,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Anonymous user logged in: ${username} as ${anonymousName}`);
    }

    const anonymousName = onlineUsers.get(userNID)?.anonymousName || 'Person';
    socket.emit('login_success', { username, anonymousName });
    socket.emit('message_history', { messages: globalMessageHistory });
    
    broadcastOnlineUsers();
  });

  socket.on('send_message', (data) => {
    const userNID = socketToNID.get(socket.id);
    const user = userNID ? onlineUsers.get(userNID) : null;
    if (!user) {
      socket.emit('chat_error', { msg: 'প্রথমে লগইন করুন' });
      return;
    }

    const sanitized = sanitizeMessage(data?.message);
    if (!sanitized) {
      socket.emit('chat_error', { msg: 'বার্তা খালি হতে পারবে না' });
      return;
    }

    const msgObj = {
      id: Date.now() + Math.random(),
      username: user.username,
      message: sanitized,
      timestamp: new Date().toISOString()
    };

    globalMessageHistory.push(msgObj);
    if (globalMessageHistory.length > MAX_HISTORY) {
      globalMessageHistory.shift();
    }

    io.emit('new_message', msgObj);
    console.log(`💬 Anonymous [${user.username}]: ${sanitized.substring(0, 50)}...`);
  });

  socket.on('request_message_history', () => {
    const recentMessages = globalMessageHistory.slice(-50);
    socket.emit('message_history', {
      messages: recentMessages,
      count: recentMessages.length
    });
    console.log(`📜 Sent ${recentMessages.length} anonymous messages to ${socket.id}`);
  });

  socket.on('global_message', (data) => {
    const message = sanitizeMessage(data?.message || '');

    if (!message || message.length === 0) {
      return;
    }

    // Get sender info from NID mapping
    const userNID = data.senderNID || socketToNID.get(socket.id);
    const user = userNID ? onlineUsers.get(userNID) : null;
    const anonymousName = user?.anonymousName || 'Person';

    const msgObj = {
      id: data.id || randomUUID(),
      message,
      timestamp: data.timestamp || new Date().toISOString(),
      socketId: data.socketId || socket.id,
      senderNID: userNID || data.senderNID,
      anonymousName: anonymousName,
      replyTo: data.replyTo || null
    };

    globalMessageHistory.push(msgObj);
    if (globalMessageHistory.length > MAX_HISTORY) {
      globalMessageHistory.shift();
    }

    io.emit('receive_global_message', msgObj);

    const replyInfo = msgObj.replyTo ? ` (replying to: "${msgObj.replyTo.substring(0, 20)}...")` : '';
    console.log(`💬 Global [${anonymousName}]: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}${replyInfo}`);
  });

  socket.on('user_logout', () => {
    const userNID = socketToNID.get(socket.id);
    if (userNID && onlineUsers.has(userNID)) {
      const user = onlineUsers.get(userNID);
      user.sockets.delete(socket.id);
      
      // If no more sockets, remove user completely
      if (user.sockets.size === 0) {
        onlineUsers.delete(userNID);
        console.log(`👋 Anonymous user ${user.username} fully logged out`);
        broadcastOnlineUsers();
      } else {
        console.log(`🔄 User ${user.username} closed one tab (remaining: ${user.sockets.size})`);
      }
    }
    socketToNID.delete(socket.id);
  });

  // ===== DASHBOARD USER TRACKING =====

  socket.on('dashboard_login', (data) => {
    const { name, nid } = data;
    
    if (!name || !nid) return;

    // Store socket to NID mapping
    socketToNID.set(socket.id, nid);

    // If user already exists, just add this socket
    if (dashboardUsers.has(nid)) {
      dashboardUsers.get(nid).sockets.add(socket.id);
      console.log(`🔄 Dashboard user ${name} opened new tab (total: ${dashboardUsers.get(nid).sockets.size})`);
    } else {
      // New user
      dashboardUsers.set(nid, {
        name,
        nid,
        sockets: new Set([socket.id]),
        loginAt: new Date().toISOString()
      });
      console.log(`✅ Dashboard user logged in: ${name} (NID: ${nid})`);
    }

    console.log(`✅ Dashboard user ${dashboardUsers.size}: ${name} (${nid})`);
    broadcastDashboardCount();
  });

  // ===== ADMIN-CITIZEN CHAT EVENTS =====

  socket.on('admin_join', () => {
    if (adminSocket && adminSocket !== socket.id) {
      socket.emit('admin_already_connected', {
        message: 'অন্য একজন এডমিন ইতিমধ্যে সংযুক্ত আছে'
      });
      console.log(`⚠️ Admin join rejected: ${socket.id} (Admin already connected: ${adminSocket})`);
      return;
    }
    
    adminSocket = socket.id;
    console.log(`👨‍💼 Admin joined: ${socket.id}`);
    
    broadcastActiveCitizens();
  });

  socket.on('citizen_join', (data) => {
    const { name, nid, timestamp } = data;
    
    if (!name || !nid) {
      socket.emit('join_error', { message: 'নাম এবং NID প্রদান করুন' });
      console.log(`❌ Invalid citizen join data from ${socket.id}`);
      return;
    }

    // Check if NID is already registered with different name
    const registered = registeredCitizens.get(nid);
    if (registered && registered.name !== name) {
      socket.emit('join_error', { 
        message: `এই NID (${nid}) ইতিমধ্যে "${registered.name}" নামে নিবন্ধিত। আপনি "${name}" নামে লগইন করতে পারবেন না।`
      });
      console.log(`⚠️ NID ${nid} already registered as "${registered.name}", rejected login as "${name}"`);
      return;
    }

    // Check if already logged in from another device/socket
    const existing = activeCitizens.get(nid);
    if (existing && existing.socket !== socket.id) {
      socket.emit('join_error', { 
        message: 'এই NID ইতিমধ্যে অন্য ডিভাইস থেকে লগইন করা আছে'
      });
      console.log(`⚠️ NID ${nid} already active on socket ${existing.socket}`);
      return;
    }

    // Register citizen for first time
    if (!registered) {
      registeredCitizens.set(nid, {
        name: name,
        registeredAt: new Date().toISOString()
      });
      console.log(`📝 New citizen registered: ${name} (NID: ${nid})`);
    }

    // Get persistent chat history
    const persistentHistory = chatHistory.get(nid) || [];
    
    // Store citizen info
    activeCitizens.set(nid, {
      socket: socket.id,
      name,
      nid,
      timestamp: timestamp || new Date().toISOString()
    });

    console.log(`👤 Citizen ${existing ? 'reconnected' : 'joined'}: ${name} (NID: ${nid}) - ${persistentHistory.length} messages in history`);

    // Send chat history to citizen
    socket.emit('admin_chat_history', {
      messages: persistentHistory,
      count: persistentHistory.length
    });

    // Send success confirmation
    socket.emit('join_success', {
      name: name,
      nid: nid,
      messageCount: persistentHistory.length
    });

    // Notify admin if connected
    if (adminSocket) {
      io.to(adminSocket).emit('citizen_joined', {
        name,
        nid,
        timestamp: timestamp || new Date().toISOString()
      });
    }

    broadcastActiveCitizens();
  });

  socket.on('citizen_message', (data) => {
    const { message, senderNID, senderName, timestamp, replyTo, id } = data;
    
    if (!message || !senderNID) {
      console.log(`❌ Invalid citizen message from ${socket.id}`);
      return;
    }

    const sanitized = sanitizeMessage(message);
    
    const msgObj = {
      id: id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: sanitized,
      senderNID,
      senderName,
      timestamp: timestamp || new Date().toISOString(),
      type: 'citizen_to_admin',
      replyTo: replyTo || null
    };

    // Store in PERSISTENT chatHistory
    if (!chatHistory.has(senderNID)) {
      chatHistory.set(senderNID, []);
    }
    const history = chatHistory.get(senderNID);
    history.push(msgObj);
    
    if (history.length > MAX_HISTORY) {
      history.shift();
    }

    console.log(`💬 Citizen ${senderName} (${senderNID}): ${sanitized.substring(0, 50)}${sanitized.length > 50 ? '...' : ''}`);

    // Send to admin if connected
    if (adminSocket) {
      io.to(adminSocket).emit('receive_citizen_message', msgObj);
      console.log(`📤 Forwarded message to admin`);
    } else {
      console.log(`⚠️ No admin connected to receive message`);
    }
  });

  socket.on('admin_message', (data) => {
    const { message, recipientNID, timestamp, replyTo } = data;
    
    if (!message || !recipientNID) {
      console.log(`❌ Invalid admin message from ${socket.id}`);
      return;
    }

    const sanitized = sanitizeMessage(message);
    
    const msgObj = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: sanitized,
      recipientNID,
      timestamp: timestamp || new Date().toISOString(),
      type: 'admin_to_citizen',
      replyTo: replyTo || null
    };

    // Store in PERSISTENT chatHistory
    if (!chatHistory.has(recipientNID)) {
      chatHistory.set(recipientNID, []);
    }
    const history = chatHistory.get(recipientNID);
    history.push(msgObj);
    
    if (history.length > MAX_HISTORY) {
      history.shift();
    }

    const replyInfo = msgObj.replyTo ? ` (replying to: "${msgObj.replyTo.substring(0, 20)}...")` : '';
    console.log(`👨‍💼 Admin to ${recipientNID}: ${sanitized.substring(0, 50)}${sanitized.length > 50 ? '...' : ''}${replyInfo}`);

    // Send to the citizen
    const citizen = activeCitizens.get(recipientNID);
    if (citizen) {
      io.to(citizen.socket).emit('receive_admin_message', msgObj);
      console.log(`📤 Sent message to citizen ${recipientNID}`);
    } else {
      console.log(`⚠️ Citizen ${recipientNID} not connected (message saved in history)`);
    }
  });

  socket.on('citizen_typing', (data) => {
    const { nid, typing } = data;
    
    if (!nid) return;

    if (adminSocket) {
      io.to(adminSocket).emit('citizen_typing_status', {
        nid,
        typing
      });
    }
  });

  socket.on('admin_typing', (data) => {
    const { recipientNID, typing } = data;
    
    if (!recipientNID) return;

    const citizen = activeCitizens.get(recipientNID);
    if (citizen) {
      io.to(citizen.socket).emit('admin_typing', { typing });
    }
  });

  socket.on('request_citizen_chat_history', (data) => {
    const { nid } = data;
    
    if (!nid) {
      console.log(`❌ No NID provided for history request`);
      return;
    }

    const messages = chatHistory.get(nid) || [];
    socket.emit('citizen_chat_history', { 
      nid: nid,
      messages: messages,
      count: messages.length
    });
    
    console.log(`📜 Sent ${messages.length} chat messages to admin for citizen ${nid}`);
  });

  socket.on('request_admin_chat_history', (data) => {
    const { nid } = data;
    
    if (!nid) {
      console.log(`❌ No NID provided for history request`);
      return;
    }

    const messages = chatHistory.get(nid) || [];
    socket.emit('admin_chat_history', { 
      messages: messages,
      count: messages.length
    });
    
    console.log(`📜 Sent ${messages.length} chat messages to citizen ${nid}`);
  });

  socket.on('citizen_logout', (data) => {
    const { nid } = data;
    
    if (!nid) return;

    activeCitizens.delete(nid);
    
    console.log(`👋 Citizen ${nid} logged out (chat history preserved)`);

    if (adminSocket) {
      io.to(adminSocket).emit('citizen_left', { nid });
    }

    broadcastActiveCitizens();
  });

  // ===== DISCONNECT HANDLER =====
  socket.on('disconnect', (reason) => {
    // Get NID mapping for this socket
    const userNID = socketToNID.get(socket.id);
    
    // Handle dashboard user disconnect
    if (userNID && dashboardUsers.has(userNID)) {
      const dashUser = dashboardUsers.get(userNID);
      dashUser.sockets.delete(socket.id);
      
      // If no more sockets, remove user completely
      if (dashUser.sockets.size === 0) {
        dashboardUsers.delete(userNID);
        console.log(`👋 Dashboard user fully logged out: ${dashUser.name} (Total: ${dashboardUsers.size})`);
        broadcastDashboardCount();
      } else {
        console.log(`🔄 Dashboard user ${dashUser.name} closed one tab (remaining: ${dashUser.sockets.size})`);
      }
    }

    // Handle anonymous user disconnect
    if (userNID && onlineUsers.has(userNID)) {
      const user = onlineUsers.get(userNID);
      user.sockets.delete(socket.id);
      
      // If no more sockets, remove user completely
      if (user.sockets.size === 0) {
        onlineUsers.delete(userNID);
        broadcastOnlineUsers();
        
        io.emit('user_left', {
          username: user.username,
          timestamp: new Date().toISOString()
        });

        console.log(`👋 Anonymous user fully disconnected: ${user.username} (${reason})`);
      } else {
        console.log(`🔄 Anonymous user ${user.username} closed one tab (remaining: ${user.sockets.size})`);
      }
    }
    
    // Clean up socket to NID mapping
    socketToNID.delete(socket.id);

    // Handle admin disconnect
    if (adminSocket === socket.id) {
      adminSocket = null;
      console.log(`👨‍💼 Admin disconnected: ${socket.id} (${reason})`);
    }

    // Handle citizen disconnect
    for (const [nid, citizen] of activeCitizens.entries()) {
      if (citizen.socket === socket.id) {
        activeCitizens.delete(nid);
        console.log(`👤 Citizen ${nid} disconnected (${reason}) - chat history preserved`);
        
        if (adminSocket) {
          io.to(adminSocket).emit('citizen_left', { nid });
        }
        
        broadcastActiveCitizens();
        break;
      }
    }

    console.log(`🔌 Socket ${socket.id} disconnected: ${reason}`);
  });

  socket.on('error', (error) => {
    console.error(`❌ Socket error (${socket.id}):`, error);
  });
});

// ===== HTTP ENDPOINTS =====

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'NirapodhVote Backend is running',
    timestamp: new Date().toISOString(),
    anonymousUsers: onlineUsers.size,
    activeCitizens: activeCitizens.size,
    registeredCitizens: registeredCitizens.size,
    adminConnected: adminSocket !== null
  });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    anonymousUsers: onlineUsers.size,
    activeCitizens: activeCitizens.size,
    registeredCitizens: registeredCitizens.size,
    adminConnected: adminSocket !== null,
    messageHistory: globalMessageHistory.length,
    chatHistoryCount: chatHistory.size,
    activeCitizensList: Array.from(activeCitizens.entries()).map(([nid, c]) => ({
      name: c.name,
      nid: nid,
      socket: c.socket
    })),
    registeredCitizensList: Array.from(registeredCitizens.entries()).map(([nid, data]) => ({
      nid: nid,
      name: data.name,
      registeredAt: data.registeredAt,
      messageCount: (chatHistory.get(nid) || []).length
    }))
  });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    anonymousUsers: onlineUsers.size,
    activeCitizens: activeCitizens.size,
    registeredCitizens: registeredCitizens.size,
    adminConnected: adminSocket !== null,
    messageHistory: globalMessageHistory.length,
    chatHistoryCount: chatHistory.size,
    activeCitizensList: Array.from(activeCitizens.entries()).map(([nid, c]) => ({
      name: c.name,
      nid: nid,
      socket: c.socket
    })),
    registeredCitizensList: Array.from(registeredCitizens.entries()).map(([nid, data]) => ({
      nid: nid,
      name: data.name,
      registeredAt: data.registeredAt,
      messageCount: (chatHistory.get(nid) || []).length
    }))
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║   🗳️  NirapodhVote Backend Server (Merged)       ║
║   ✅ Server running on port ${PORT}              ║
║   ✅ MongoDB Connected                           ║
║   🌐 http://localhost:${PORT}                    ║
║                                                   ║
║   Features:                                       ║
║   - OTP Authentication & Registration             ║
║   - Voting System                                 ║
║   - Admin Dashboard                               ║
║   - Anonymous Chat                                ║
║   - Admin-Citizen Chat (NID Validated)            ║
║   - Persistent Chat History                       ║
╚═══════════════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Graceful shutdown handlers
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

module.exports = { app, server, io };
