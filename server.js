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

// Anonymous chat state
const onlineUsers = new Map(); // socketId -> { username, joinedAt }
let globalMessageHistory = [];

// Dashboard users tracking
const dashboardUsers = new Map(); // socketId -> { name, nid, loginAt }

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
  const users = Array.from(onlineUsers.values())
    .map(u => u.username)
    .filter((v, i, a) => a.indexOf(v) === i);
  io.emit('users_online', { users });
  console.log(`📊 Anonymous chat users: ${users.length}`);
}

function broadcastDashboardCount() {
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

    if (!validateUsername(username)) {
      socket.emit('chat_error', { msg: 'নাম ২-২০ অক্ষরের মধ্যে হতে হবে' });
      return;
    }

    const existingUser = Array.from(onlineUsers.values())
      .find(u => u.username === username);

    if (existingUser) {
      socket.emit('chat_error', { msg: 'এই নাম ইতিমধ্যে ব্যবহৃত হচ্ছে। অন্য নাম চেষ্টা করুন।' });
      return;
    }

    onlineUsers.set(socket.id, {
      username,
      joinedAt: new Date().toISOString()
    });

    socket.emit('login_success', { username });
    socket.emit('message_history', { messages: globalMessageHistory });
    
    broadcastOnlineUsers();
    
    io.emit('user_joined', { 
      username,
      timestamp: new Date().toISOString()
    });

    console.log(`✅ Anonymous user logged in: ${username}`);
  });

  socket.on('send_message', (data) => {
    const user = onlineUsers.get(socket.id);
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

    const msgObj = {
      id: data.id || randomUUID(),
      message,
      timestamp: data.timestamp || new Date().toISOString(),
      socketId: socket.id,
      replyTo: data.replyTo || null
    };

    globalMessageHistory.push(msgObj);
    if (globalMessageHistory.length > MAX_HISTORY) {
      globalMessageHistory.shift();
    }

    io.emit('receive_global_message', msgObj);

    const replyInfo = msgObj.replyTo ? ` (replying to: "${msgObj.replyTo.substring(0, 20)}...")` : '';
    console.log(`💬 Global [${socket.id.slice(0, 8)}]: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}${replyInfo}`);
  });

  socket.on('user_logout', () => {
    onlineUsers.delete(socket.id);
    broadcastOnlineUsers();
    console.log(`👋 Anonymous user ${socket.id} logged out`);
  });

  // ===== DASHBOARD USER TRACKING =====

  socket.on('dashboard_login', (data) => {
    const { name, nid } = data;
    
    if (!name || !nid) return;

    dashboardUsers.set(socket.id, {
      name,
      nid,
      loginAt: new Date().toISOString()
    });

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
    const { message, senderNID, senderName, timestamp } = data;
    
    if (!message || !senderNID) {
      console.log(`❌ Invalid citizen message from ${socket.id}`);
      return;
    }

    const sanitized = sanitizeMessage(message);
    
    const msgObj = {
      message: sanitized,
      senderNID,
      senderName,
      timestamp: timestamp || new Date().toISOString(),
      type: 'citizen_to_admin'
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
    const { message, recipientNID, timestamp } = data;
    
    if (!message || !recipientNID) {
      console.log(`❌ Invalid admin message from ${socket.id}`);
      return;
    }

    const sanitized = sanitizeMessage(message);
    
    const msgObj = {
      message: sanitized,
      recipientNID,
      timestamp: timestamp || new Date().toISOString(),
      type: 'admin_to_citizen'
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

    console.log(`👨‍💼 Admin to ${recipientNID}: ${sanitized.substring(0, 50)}${sanitized.length > 50 ? '...' : ''}`);

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
    // Handle dashboard user disconnect
    const dashUser = dashboardUsers.get(socket.id);
    if (dashUser) {
      dashboardUsers.delete(socket.id);
      console.log(`👋 Dashboard user left: ${dashUser.name} (Total: ${dashboardUsers.size})`);
      broadcastDashboardCount();
    }

    // Handle anonymous user disconnect
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      broadcastOnlineUsers();
      
      io.emit('user_left', {
        username: user.username,
        timestamp: new Date().toISOString()
      });

      console.log(`👋 Anonymous user disconnected: ${user.username} (${reason})`);
    }

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
