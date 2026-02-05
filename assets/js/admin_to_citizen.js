// ===================================
// Admin Chat System - Fixed Version with History Loading
// ===================================

let socket = null;
let currentCitizen = null;
let citizens = {};
let unreadCounts = {};
let replyingTo = null; // Track message being replied to

// Initialize socket connection
function initAdminSocket() {
    socket = io('http://localhost:3000', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });

    socket.on('connect', () => {
        console.log('✅ Admin connected to chat server');
        socket.emit('admin_join');
    });

    // Admin already connected warning
    socket.on('admin_already_connected', (data) => {
        alert(data.message);
        console.warn('⚠️ Another admin is already connected');
    });

    // New citizen joined
    socket.on('citizen_joined', (data) => {
        console.log('👤 Citizen joined:', data);
        addCitizen(data);
    });

    // Receive message from citizen
    socket.on('receive_citizen_message', (data) => {
        console.log('💬 Message received from citizen:', data);
        handleIncomingMessage(data);
    });

    // Citizen typing
    socket.on('citizen_typing_status', (data) => {
        if (currentCitizen && data.nid === currentCitizen.nid) {
            showTypingIndicator(data.typing);
        }
    });

    // Citizen disconnected
    socket.on('citizen_left', (data) => {
        console.log('👋 Citizen left:', data.nid);
        markCitizenOffline(data.nid);
    });

    // Load all active citizens
    socket.on('active_citizens', (data) => {
        console.log('📋 Active citizens loaded:', data.citizens.length);
        data.citizens.forEach(citizen => addCitizen(citizen));
    });

    // ✅ NEW: Receive chat history when selecting a citizen
    socket.on('citizen_chat_history', (data) => {
        console.log('📜 Received chat history for citizen:', data.nid, '- Messages:', data.messages.length);
        loadCitizenHistory(data.nid, data.messages);
    });

    socket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
    });
}

// Add citizen to list
function addCitizen(citizen) {
    if (!citizens[citizen.nid]) {
        citizens[citizen.nid] = {
            name: citizen.name,
            nid: citizen.nid,
            messages: [],
            lastMessage: null,
            timestamp: citizen.timestamp,
            online: true
        };
        unreadCounts[citizen.nid] = 0;
        console.log('✅ Citizen added:', citizen.name, citizen.nid);
    } else {
        // Update online status
        citizens[citizen.nid].online = true;
        citizens[citizen.nid].timestamp = citizen.timestamp;
    }
    renderChatList();
}

// Mark citizen as offline (don't delete, keep history)
function markCitizenOffline(nid) {
    if (citizens[nid]) {
        citizens[nid].online = false;
        console.log('👋 Citizen marked offline:', nid);
    }
    renderChatList();
}

// ✅ NEW: Load chat history for a specific citizen
function loadCitizenHistory(nid, messages) {
    if (!citizens[nid]) {
        console.warn('⚠️ Citizen not found:', nid);
        return;
    }

    // Convert server message format to UI format
    const formattedMessages = messages.map(msg => ({
        id: msg.id || `${msg.timestamp}-${msg.message.substring(0, 20)}`,
        text: msg.message,
        type: msg.type === 'admin_to_citizen' ? 'admin' : 'user',
        timestamp: msg.timestamp,
        replyTo: msg.replyTo || null
    }));

    citizens[nid].messages = formattedMessages;

    // Update last message
    if (formattedMessages.length > 0) {
        const lastMsg = formattedMessages[formattedMessages.length - 1];
        citizens[nid].lastMessage = lastMsg.text;
    }

    // If this citizen is currently selected, reload messages
    if (currentCitizen && currentCitizen.nid === nid) {
        currentCitizen = citizens[nid];
        loadMessages();
    }

    renderChatList();
}

// Handle incoming message
function handleIncomingMessage(data) {
    if (!citizens[data.senderNID]) {
        addCitizen({
            name: data.senderName,
            nid: data.senderNID,
            timestamp: data.timestamp
        });
    }

    const message = {
        id: data.id || `${data.timestamp}-${data.message.substring(0, 20)}`,
        text: data.message,
        type: 'user',
        timestamp: data.timestamp,
        replyTo: data.replyTo || null
    };

    citizens[data.senderNID].messages.push(message);
    citizens[data.senderNID].lastMessage = data.message;

    if (!currentCitizen || currentCitizen.nid !== data.senderNID) {
        unreadCounts[data.senderNID] = (unreadCounts[data.senderNID] || 0) + 1;
    } else {
        appendMessage(message);
    }

    renderChatList();
}

// Render chat list
function renderChatList() {
    const container = document.getElementById('chatListContainer');
    if (!container) {
        console.error('❌ chatListContainer not found');
        return;
    }

    const citizenArray = Object.values(citizens).sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    const countElement = document.getElementById('citizenCount');
    if (countElement) {
        countElement.textContent = citizenArray.length;
    }

    if (citizenArray.length === 0) {
        container.innerHTML = `
            <div class="chat-empty-state">
                <svg fill="currentColor" viewBox="0 0 24 24" style="width: 60px; height: 60px;">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                </svg>
                <p style="margin-top: 10px;">কোন নাগরিক নেই</p>
            </div>
        `;
        return;
    }

    container.innerHTML = citizenArray.map(citizen => {
        const unread = unreadCounts[citizen.nid] || 0;
        const isActive = currentCitizen && currentCitizen.nid === citizen.nid;
        const initial = citizen.name.charAt(0).toUpperCase();
        const lastMsg = citizen.lastMessage || 'নতুন কথোপকথন';
        const time = formatTime(citizen.timestamp);
        const onlineStatus = citizen.online ? 
            '<span style="color: #10b981; font-size: 10px;">● অনলাইন</span>' : 
            '<span style="color: #9ca3af; font-size: 10px;">○ অফলাইন</span>';

        return `
            <div class="chat-item ${isActive ? 'active' : ''} ${unread > 0 ? 'unread' : ''}" 
                 onclick="selectCitizen('${citizen.nid}')"
                 data-name="${escapeHtml(citizen.name).toLowerCase()}"
                 data-nid="${citizen.nid}">
                <div class="chat-item-avatar">${initial}</div>
                <div class="chat-item-info">
                    <div class="chat-item-name">${escapeHtml(citizen.name)} ${onlineStatus}</div>
                    <div class="chat-item-nid">NID: ${citizen.nid}</div>
                    <div class="chat-item-last">${escapeHtml(lastMsg.substring(0, 30))}${lastMsg.length > 30 ? '...' : ''}</div>
                </div>
                ${unread > 0 ? `<span class="chat-item-badge">${unread}</span>` : ''}
                <span class="chat-item-time">${time}</span>
            </div>
        `;
    }).join('');
}

// Select citizen
function selectCitizen(nid) {
    if (!citizens[nid]) {
        console.error('❌ Citizen not found:', nid);
        return;
    }

    currentCitizen = citizens[nid];
    unreadCounts[nid] = 0;

    console.log('✅ Selected citizen:', currentCitizen.name);

    document.getElementById('chatHeaderName').textContent = currentCitizen.name;
    document.getElementById('chatHeaderNID').textContent = `NID: ${currentCitizen.nid}`;
    
    const statusElement = document.getElementById('chatStatus');
    if (statusElement) {
        statusElement.style.display = 'flex';
        statusElement.textContent = currentCitizen.online ? '● অনলাইন' : '○ অফলাইন';
        statusElement.style.color = currentCitizen.online ? '#10b981' : '#9ca3af';
    }
    
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendButton').disabled = false;

    // ✅ Request chat history from server
    if (socket && socket.connected) {
        socket.emit('request_citizen_chat_history', { nid: nid });
        console.log('📤 Requesting chat history for:', nid);
    }

    // Load existing messages (will be updated when history arrives)
    loadMessages();
    renderChatList();
}

// Load messages
function loadMessages() {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!currentCitizen || currentCitizen.messages.length === 0) {
        container.innerHTML = `
            <div class="chat-empty-state">
                <p>কথোপকথন শুরু করুন</p>
            </div>
        `;
        return;
    }

    currentCitizen.messages.forEach(msg => appendMessage(msg));
}

// Append message
function appendMessage(message) {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    const emptyState = container.querySelector('.chat-empty-state');
    if (emptyState) emptyState.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.type}`;
    
    // Generate or use existing message ID
    const messageId = message.id || `${message.timestamp}-${message.text.substring(0, 20)}`;
    messageDiv.dataset.messageId = messageId;
    messageDiv.dataset.messageText = message.text;
    
    const time = formatTime(message.timestamp);
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.style.cursor = 'pointer';
    bubble.style.userSelect = 'none';
    
    // Add reply indicator if this is a reply
    if (message.replyTo) {
        const replyIndicator = document.createElement('div');
        replyIndicator.className = 'message-reply-indicator';
        replyIndicator.innerHTML = `
            <div class="reply-indicator-text">↩ উত্তর</div>
            <div class="reply-indicator-message">${escapeHtml(message.replyTo)}</div>
        `;
        bubble.appendChild(replyIndicator);
    }
    
    const p = document.createElement('p');
    p.textContent = message.text;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = time;
    
    bubble.appendChild(p);
    bubble.appendChild(timeSpan);
    
    // Double-click to reply
    bubble.addEventListener('dblclick', function() {
        replyToAdminMessage(messageId);
    });
    
    messageDiv.appendChild(bubble);
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// Send admin message
function sendAdminMessage() {
    const input = document.getElementById('messageInput');
    if (!input) return;

    const text = input.value.trim();

    if (!text || !currentCitizen) {
        console.warn('⚠️ Cannot send message: no text or no citizen selected');
        return;
    }

    if (!socket || !socket.connected) {
        alert('সার্ভারের সাথে সংযোগ নেই');
        return;
    }

    const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const message = {
        id: messageId,
        text: text,
        type: 'admin',
        timestamp: new Date().toISOString(),
        replyTo: replyingTo ? replyingTo.text : null
    };

    currentCitizen.messages.push(message);
    currentCitizen.lastMessage = text;

    socket.emit('admin_message', {
        id: messageId,
        message: text,
        recipientNID: currentCitizen.nid,
        timestamp: message.timestamp,
        replyTo: message.replyTo
    });

    console.log('📤 Message sent to:', currentCitizen.nid);

    appendMessage(message);
    renderChatList();

    // Clear reply state
    cancelAdminReply();

    input.value = '';
    input.focus();
}

// Show typing indicator
function showTypingIndicator(isTyping) {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    let indicator = document.getElementById('typingIndicator');

    if (isTyping && !indicator) {
        indicator = document.createElement('div');
        indicator.id = 'typingIndicator';
        indicator.className = 'chat-message user';
        indicator.innerHTML = `
            <div class="message-bubble">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    } else if (!isTyping && indicator) {
        indicator.remove();
    }
}

// Show empty chat
function showEmptyChat() {
    document.getElementById('chatHeaderName').textContent = 'নাগরিক নির্বাচন করুন';
    document.getElementById('chatHeaderNID').textContent = '';
    document.getElementById('chatStatus').style.display = 'none';
    document.getElementById('messageInput').disabled = true;
    document.getElementById('sendButton').disabled = true;

    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="chat-empty-state">
            <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
            </svg>
            <h3>কথোপকথন শুরু করুন</h3>
            <p>বামদিক থেকে একজন নাগরিক নির্বাচন করুন</p>
        </div>
    `;
}

// Format time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const bn = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
    return `${hours}:${minutes}`.split('').map(c => {
        const n = parseInt(c);
        return isNaN(n) ? c : bn[n];
    }).join('');
}

// Reply to message
function replyToAdminMessage(messageId) {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageEl) return;

    const messageText = messageEl.dataset.messageText;
    if (!messageText) return;

    replyingTo = { id: messageId, text: messageText };

    const preview = document.getElementById('adminReplyPreview');
    const previewText = document.getElementById('adminReplyPreviewText');
    const input = document.getElementById('messageInput');
    
    if (preview && previewText && input) {
        previewText.textContent = messageText.substring(0, 80) + (messageText.length > 80 ? '...' : '');
        preview.style.display = 'flex';
        input.focus();
    }
}

// Cancel reply
function cancelAdminReply() {
    replyingTo = null;
    const preview = document.getElementById('adminReplyPreview');
    if (preview) {
        preview.style.display = 'none';
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const items = document.querySelectorAll('.chat-item');
        
        items.forEach(item => {
            const name = item.getAttribute('data-name') || '';
            const nid = item.getAttribute('data-nid') || '';
            
            if (name.includes(query) || nid.includes(query)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Admin Chat Panel Initializing...');

    // Setup search
    setupSearch();

    // Enter key to send
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !messageInput.disabled) {
                sendAdminMessage();
            }
        });
    }

    // Initialize socket
    initAdminSocket();
    
    console.log('✅ Admin Chat Panel Ready');
});

// Expose functions globally
window.selectCitizen = selectCitizen;
window.sendAdminMessage = sendAdminMessage;
window.replyToAdminMessage = replyToAdminMessage;
window.cancelAdminReply = cancelAdminReply;