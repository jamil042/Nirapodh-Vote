// ===================================
// Admin to Admin Chat System - Integrated in Dashboard
// ===================================

let adminChatSocket = null;
let currentAdminUser = null; // Current logged-in admin info
let selectedChatAdmin = null; // Currently selected admin to chat with
let allChatAdmins = []; // All admins from database
let onlineChatAdmins = new Set(); // Set of online admin IDs
let adminChatHistory = {}; // Store chat history: {adminId: [messages]}
let adminReplyingTo = null; // Track message being replied to
let adminTypingTimeout = null;
let adminChatInitialized = false; // Track if chat is already initialized

// ===================================
// INITIALIZATION
// ===================================

function initAdminToAdminChat() {
    // Prevent double initialization
    if (adminChatInitialized) {
        console.log('Admin chat already initialized');
        return;
    }

    // Get admin info from sessionStorage (already logged in to dashboard)
    const adminData = sessionStorage.getItem('nirapodh_admin_user');
    if (!adminData) {
        console.error('❌ No admin data found in session');
        return;
    }

    try {
        currentAdminUser = JSON.parse(adminData);
        console.log('✅ Current admin:', currentAdminUser);
    } catch (error) {
        console.error('❌ Error parsing admin data:', error);
        return;
    }

    adminChatInitialized = true;

    // Initialize socket connection
    initAdminChatSocket();

    // Load all admins from database
    loadAllChatAdmins();

    // Setup event listeners
    setupAdminChatEventListeners();
}

// ===================================
// SOCKET INITIALIZATION
// ===================================

function initAdminChatSocket() {
    adminChatSocket = io(API_CONFIG.SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });

    adminChatSocket.on('connect', () => {
        console.log('✅ Admin chat connected:', adminChatSocket.id);
        updateAdminChatConnectionStatus('connected');
        
        // Join admin-to-admin chat
        adminChatSocket.emit('admin_admin_join', {
            adminId: currentAdminUser.id,
            adminName: currentAdminUser.username,
            role: currentAdminUser.role
        });
    });

    adminChatSocket.on('disconnect', () => {
        console.log('❌ Admin chat disconnected');
        updateAdminChatConnectionStatus('disconnected');
    });

    adminChatSocket.on('connect_error', (error) => {
        console.error('❌ Admin chat connection error:', error);
        updateAdminChatConnectionStatus('disconnected');
    });

    // Receive list of online admins
    adminChatSocket.on('online_admins_list', (data) => {
        console.log('📋 Online admins:', data.admins);
        data.admins.forEach(admin => {
            onlineChatAdmins.add(admin.adminId);
        });
        renderAdminChatList();
    });

    // Admin came online
    adminChatSocket.on('admin_online', (data) => {
        console.log('✅ Admin came online:', data.adminName);
        onlineChatAdmins.add(data.adminId);
        renderAdminChatList();
    });

    // Admin went offline
    adminChatSocket.on('admin_offline', (data) => {
        console.log('❌ Admin went offline:', data.adminId);
        onlineChatAdmins.delete(data.adminId);
        renderAdminChatList();
        
        // Update selected admin status if they went offline
        if (selectedChatAdmin && selectedChatAdmin.id === data.adminId) {
            updateSelectedChatAdminStatus(false);
        }
    });

    // Receive message from another admin
    adminChatSocket.on('receive_admin_message', (data) => {
        console.log('💬 Received message from admin:', data);
        handleAdminIncomingMessage(data);
    });

    // Message sent confirmation
    adminChatSocket.on('admin_message_sent', (data) => {
        console.log('✅ Message sent:', data);
    });

    // Receive chat history
    adminChatSocket.on('admin_admin_chat_history', (data) => {
        console.log('📜 Received chat history:', data.messages.length, 'messages');
        loadAdminChatHistory(data.recipientId, data.messages);
    });

    // Typing indicator
    adminChatSocket.on('admin_typing_status', (data) => {
        if (selectedChatAdmin && data.adminId === selectedChatAdmin.id) {
            showAdminTypingIndicator(data.typing);
        }
    });

    adminChatSocket.on('admin_admin_error', (data) => {
        console.error('❌ Admin chat error:', data.message);
        alert(data.message);
    });
}

// ===================================
// LOAD ALL ADMINS
// ===================================

async function loadAllChatAdmins() {
    try {
        // Get token from sessionStorage (where dashboard stores it)
        let token = sessionStorage.getItem('nirapodh_admin_token');
        
        // Fallback to localStorage if not found
        if (!token) {
            token = localStorage.getItem('adminToken');
        }
        
        if (!token) {
            console.error('❌ No token found in sessionStorage or localStorage');
            return;
        }

        console.log('🔑 Using token to fetch admins');

        const response = await fetch(`${API_CONFIG.API_URL}/admin/all-admins`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            allChatAdmins = data.admins;
            console.log('✅ Loaded admins:', allChatAdmins.length, data.admins);
            renderAdminChatList();
        } else {
            console.error('❌ Failed to load admins:', data.message);
        }
    } catch (error) {
        console.error('❌ Error loading admins:', error);
    }
}

// ===================================
// RENDER ADMIN LIST
// ===================================

function renderAdminChatList() {
    const adminListContainer = document.getElementById('adminChatAdminList');
    const adminCount = document.getElementById('adminChatAdminCount');
    
    if (!adminListContainer || !adminCount) {
        console.error('Admin chat list elements not found');
        return;
    }
    
    if (allChatAdmins.length === 0) {
        adminListContainer.innerHTML = `
            <div class="chat-empty-state">
                <svg fill="currentColor" viewBox="0 0 24 24" width="80" height="80">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
                <h3>কোন অ্যাডমিন নেই</h3>
                <p>অ্যাডমিনরা যোগ দিলে এখানে দেখা যাবে</p>
            </div>
        `;
        adminCount.textContent = '0';
        return;
    }

    adminCount.textContent = allChatAdmins.length;

    adminListContainer.innerHTML = allChatAdmins.map(admin => {
        const isOnline = onlineChatAdmins.has(admin.id);
        const initial = admin.fullName ? admin.fullName.charAt(0).toUpperCase() : admin.username.charAt(0).toUpperCase();
        const isSuperAdmin = admin.role === 'superadmin';
        const isActive = selectedChatAdmin && selectedChatAdmin.id === admin.id;
        
        return `
            <div class="chat-item ${isActive ? 'active' : ''}" 
                 data-admin-id="${admin.id}"
                 onclick="selectChatAdmin('${admin.id}')">
                <div class="chat-item-avatar">${initial}</div>
                <div class="chat-item-info">
                    <div class="chat-item-name">${admin.fullName || admin.username}</div>
                    <div class="chat-item-nid">
                        <span style="padding: 2px 8px; border-radius: 8px; font-size: 0.75em; background: ${isSuperAdmin ? '#fee2e2' : '#dbeafe'}; color: ${isSuperAdmin ? '#dc2626' : '#2563eb'}; font-weight: 600;">
                            ${isSuperAdmin ? 'সুপারঅ্যাডমিন' : 'অ্যাডমিন'}
                        </span>
                        <span style="margin-left: 8px; font-size: 0.8em; color: ${isOnline ? '#059669' : '#6b7280'};">
                            ${isOnline ? '🟢 অনলাইন' : '⚫ অফলাইন'}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===================================
// SELECT ADMIN
// ===================================

function selectChatAdmin(adminId) {
    const admin = allChatAdmins.find(a => a.id === adminId);
    if (!admin) return;

    selectedChatAdmin = admin;
    console.log('👤 Selected admin:', admin);

    // Update chat header
    const isSuperAdmin = admin.role === 'superadmin';
    const isOnline = onlineChatAdmins.has(admin.id);

    document.getElementById('adminChatHeaderName').textContent = admin.fullName || admin.username;
    document.getElementById('adminChatHeaderRole').textContent = isSuperAdmin ? '🔴 সুপারঅ্যাডমিন' : '🔵 অ্যাডমিন';
    
    const statusElement = document.getElementById('adminChatStatus');
    statusElement.textContent = isOnline ? 'অনলাইন' : 'অফলাইন';
    statusElement.style.display = 'block';
    statusElement.style.color = isOnline ? '#059669' : '#6b7280';

    // Enable message input
    const messageInput = document.getElementById('adminChatMessageInput');
    const sendBtn = document.getElementById('adminChatSendBtn');
    
    if (messageInput) {
        messageInput.disabled = false;
        messageInput.placeholder = 'বার্তা লিখুন...';
        messageInput.focus();
    }
    
    if (sendBtn) {
        sendBtn.disabled = false;
    }

    // Update admin list active state
    renderAdminChatList();

    // Clear empty state and show messages
    const messagesContainer = document.getElementById('adminChatMessagesContainer');
    if (messagesContainer) {
        messagesContainer.innerHTML = ''; // Clear empty state
    }

    // Load chat history
    requestAdminChatHistory(adminId);
}

// ===================================
// UPDATE SELECTED ADMIN STATUS
// ===================================

function updateSelectedChatAdminStatus(isOnline) {
    const statusElement = document.getElementById('adminChatAdminStatus');
    if (statusElement) {
        statusElement.textContent = isOnline ? 'অনলাইন' : 'অফলাইন';
        statusElement.className = `online-status ${isOnline ? 'online' : ''}`;
    }
}

// ===================================
// REQUEST CHAT HISTORY
// ===================================

function requestAdminChatHistory(adminId) {
    if (!adminChatSocket) return;
    
    adminChatSocket.emit('request_admin_admin_chat_history', {
        senderId: currentAdminUser.id,
        recipientId: adminId
    });
}

// ===================================
// LOAD CHAT HISTORY
// ===================================

function loadAdminChatHistory(adminId, messages) {
    adminChatHistory[adminId] = messages;
    
    if (selectedChatAdmin && selectedChatAdmin.id === adminId) {
        renderAdminChatMessages();
    }
}

// ===================================
// RENDER MESSAGES
// ===================================

function renderAdminChatMessages() {
    const messagesArea = document.getElementById('adminChatMessagesContainer');
    
    if (!messagesArea || !selectedChatAdmin) {
        return;
    }

    const messages = adminChatHistory[selectedChatAdmin.id] || [];
    
    if (messages.length === 0) {
        messagesArea.innerHTML = `
            <div class="chat-empty-state">
                <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                </svg>
                <h3>এখনো কোনো বার্তা নেই</h3>
                <p>প্রথম বার্তা পাঠান!</p>
            </div>
        `;
        return;
    }

    messagesArea.innerHTML = messages.map(msg => {
        const isSent = msg.senderId === currentAdminUser.id;
        const time = formatChatTime(msg.timestamp);
        
        let replyHtml = '';
        if (msg.replyTo) {
            const repliedMsg = messages.find(m => m.id === msg.replyTo);
            if (repliedMsg) {
                replyHtml = `
                    <div class="message-reply-indicator">
                        <div class="reply-indicator-text">↩ উত্তর</div>
                        <div class="reply-indicator-message">${escapeHtml(repliedMsg.message)}</div>
                    </div>
                `;
            }
        }

        return `
            <div class="chat-message ${isSent ? 'admin' : 'user'}" data-message-id="${msg.id}" ondblclick="replyToAdminChatMessage('${msg.id}', \`${escapeHtml(msg.message).replace(/`/g, '\\`')}\`)">
                <div class="message-bubble">
                    ${replyHtml}
                    <p>${escapeHtml(msg.message)}</p>
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');

    // Scroll to bottom
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// ===================================
// HANDLE INCOMING MESSAGE
// ===================================

function handleAdminIncomingMessage(data) {
    const senderId = data.senderId;
    
    // Store message in chat history
    if (!adminChatHistory[senderId]) {
        adminChatHistory[senderId] = [];
    }
    adminChatHistory[senderId].push(data);

    // If this is from the currently selected admin, render it
    if (selectedChatAdmin && selectedChatAdmin.id === senderId) {
        renderAdminChatMessages();
    }
}

// ===================================
// SEND MESSAGE
// ===================================

function sendAdminChatMessage() {
    const messageInput = document.getElementById('adminChatMessageInput');
    if (!messageInput) return;
    
    const message = messageInput.value.trim();

    if (!message || !selectedChatAdmin || !adminChatSocket) return;

    const msgObj = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: message,
        senderId: currentAdminUser.id,
        senderName: currentAdminUser.username,
        recipientId: selectedChatAdmin.id,
        timestamp: new Date().toISOString(),
        type: 'admin_to_admin',
        replyTo: adminReplyingTo
    };

    // Store in local chat history
    if (!adminChatHistory[selectedChatAdmin.id]) {
        adminChatHistory[selectedChatAdmin.id] = [];
    }
    adminChatHistory[selectedChatAdmin.id].push(msgObj);

    // Emit to server
    adminChatSocket.emit('admin_to_admin_message', msgObj);

    // Clear input
    messageInput.value = '';

    // Clear reply
    if (adminReplyingTo) {
        cancelAdminChatReply();
    }

    // Render messages
    renderAdminChatMessages();

    console.log('📤 Message sent:', msgObj);
}

// ===================================
// REPLY TO MESSAGE
// ===================================

function replyToAdminChatMessage(messageId, messageText) {
    adminReplyingTo = messageId;
    
    const replyPreview = document.getElementById('adminChatReplyPreview');
    const replyText = document.getElementById('adminChatReplyText');
    
    if (replyPreview && replyText) {
        replyText.textContent = messageText;
        replyPreview.style.display = 'flex';
    }
    
    const messageInput = document.getElementById('adminChatMessageInput');
    if (messageInput) {
        messageInput.focus();
    }
}

function cancelAdminChatReply() {
    adminReplyingTo = null;
    const replyPreview = document.getElementById('adminChatReplyPreview');
    if (replyPreview) {
        replyPreview.style.display = 'none';
    }
}

// ===================================
// TYPING INDICATOR
// ===================================

function handleAdminChatTyping() {
    if (!selectedChatAdmin || !adminChatSocket) return;

    // Send typing status
    adminChatSocket.emit('admin_admin_typing', {
        senderId: currentAdminUser.id,
        recipientId: selectedChatAdmin.id,
        typing: true
    });

    // Clear previous timeout
    if (adminTypingTimeout) {
        clearTimeout(adminTypingTimeout);
    }

    // Set timeout to stop typing
    adminTypingTimeout = setTimeout(() => {
        adminChatSocket.emit('admin_admin_typing', {
            senderId: currentAdminUser.id,
            recipientId: selectedChatAdmin.id,
            typing: false
        });
    }, 1000);
}

function showAdminTypingIndicator(isTyping) {
    const typingIndicator = document.getElementById('adminChatTypingIndicator');
    if (typingIndicator) {
        typingIndicator.style.display = isTyping ? 'flex' : 'none';
    }
}

// ===================================
// EVENT LISTENERS
// ===================================

function setupAdminChatEventListeners() {
    const messageInput = document.getElementById('adminChatMessageInput');
    const sendBtn = document.getElementById('adminChatSendBtn');
    const cancelReplyBtn = document.getElementById('adminChatCancelReply');

    if (sendBtn) {
        sendBtn.addEventListener('click', sendAdminChatMessage);
    }

    if (messageInput) {
        // Send message on Enter
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAdminChatMessage();
            }
        });

        // Handle typing
        messageInput.addEventListener('input', () => {
            handleAdminChatTyping();
        });
    }

    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener('click', cancelAdminChatReply);
    }
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

function updateAdminChatConnectionStatus(status) {
    const statusIndicator = document.querySelector('#adminChatConnectionStatus .status-indicator');
    const statusText = document.querySelector('#adminChatConnectionStatus .status-text');
    
    if (!statusIndicator || !statusText) return;
    
    statusIndicator.className = `status-indicator ${status}`;
    
    switch (status) {
        case 'connected':
            statusText.textContent = 'সংযুক্ত';
            break;
        case 'connecting':
            statusText.textContent = 'সংযোগ করা হচ্ছে...';
            break;
        case 'disconnected':
            statusText.textContent = 'সংযোগ বিচ্ছিন্ন';
            break;
    }
}

function formatChatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    
    // If today, show time only
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show date and time
    if (date.getFullYear() === now.getFullYear()) {
        const dateStr = date.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr}, ${timeStr}`;
    }
    
    // Full date and time
    const dateStr = date.toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr}, ${timeStr}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
