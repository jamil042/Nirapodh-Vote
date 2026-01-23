// assets/js/citizen_chat_anonymous.js - Auto-login with Green Theme
(function () {
  // ===== Namespace =====
  window.NirapodChat = window.NirapodChat || {};

  // ===== Private state =====
  let socket = null;
  let mySocketId = null;
  const messageIds = new Set(); // Prevent duplicate messages
  let replyingTo = null; // Track message being replied to
  
  // Track own messages in localStorage
  function getMyMessageIds() {
    try {
      const stored = localStorage.getItem('nirapodh_my_messages');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }
  
  function addMyMessageId(id) {
    const myMessages = getMyMessageIds();
    myMessages.add(id);
    // Keep only last 100 messages
    const arr = Array.from(myMessages);
    if (arr.length > 100) arr.shift();
    localStorage.setItem('nirapodh_my_messages', JSON.stringify(arr));
  }

  // ===== Utility =====
  function formatTime(timestamp) {
    const d = new Date(timestamp);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return `${hh}:${mm}`.split('').map(c => {
      const n = parseInt(c, 10);
      return Number.isNaN(n) ? c : bn[n];
    }).join('');
  }

  function scrollToBottom() {
    const el = document.getElementById('globalChatMessages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function showAlert(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    const container = document.getElementById('alertContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `alert alert-${type}`;
    div.textContent = message;
    container.appendChild(div);
    setTimeout(() => {
      div.style.opacity = '0';
      div.style.transform = 'translateX(20px)';
      setTimeout(() => div.remove(), 300);
    }, 3000);
  }

  // ===== Public UI helpers =====
  NirapodChat.addChatMessage = function (message, timestamp, isOwn = false, id = null, replyTo = null) {
    const messagesContainer = document.getElementById('globalChatMessages');
    if (!messagesContainer) return;

    const key = id || `${timestamp}-${message.substring(0, 20)}`;
    if (messageIds.has(key)) return;
    messageIds.add(key);
    
    // Check if this is my message from localStorage
    const myMessages = getMyMessageIds();
    const isMyMessage = isOwn || myMessages.has(key);

    const messageDiv = document.createElement('div');
    messageDiv.className = `global-message ${isMyMessage ? 'own-message' : 'other-message'}`;
    messageDiv.dataset.messageId = key;
    messageDiv.dataset.messageText = message;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';

    // Add reply indicator if this is a reply
    if (replyTo) {
      const replyIndicator = document.createElement('div');
      replyIndicator.className = 'message-reply-indicator';
      replyIndicator.innerHTML = `
        <div class="reply-indicator-text">↩ উত্তর</div>
        <div class="reply-indicator-message">${replyTo}</div>
      `;
      bubbleDiv.appendChild(replyIndicator);
    }

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = message;
    bubbleDiv.appendChild(textDiv);

    const timeSpan = document.createElement('div');
    timeSpan.className = 'message-time';
    timeSpan.textContent = formatTime(timestamp);
    bubbleDiv.appendChild(timeSpan);

    messageDiv.appendChild(bubbleDiv);

    // Add double-click to reply
    bubbleDiv.addEventListener('dblclick', function() {
      replyToMessage(key);
    });

    messagesContainer.appendChild(messageDiv);

    scrollToBottom();
  };

  NirapodChat.addSystemMessage = function (message) {
    const messagesContainer = document.getElementById('globalChatMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'global-message system-message';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = message;
    bubbleDiv.appendChild(textDiv);

    const timeSpan = document.createElement('div');
    timeSpan.className = 'message-time';
    timeSpan.textContent = formatTime(new Date().toISOString());
    bubbleDiv.appendChild(timeSpan);

    messageDiv.appendChild(bubbleDiv);
    messagesContainer.appendChild(messageDiv);

    scrollToBottom();
  };

  NirapodChat.updateOnlineUsersList = function (users = []) {
    // Removed online users display
  };

  // ===== Socket init =====
  NirapodChat.initializeSocket = function () {
    socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('✅ Connected to server');
      mySocketId = socket.id;
      showAlert('সার্ভারের সাথে সংযুক্ত হয়েছে', 'success');
    });

    socket.on('disconnect', (reason) => {
      console.warn('🔌 Disconnected:', reason);
      showAlert('সার্ভার সংযোগ বিচ্ছিন্ন হয়েছে', 'error');
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      showAlert('সার্ভারের সাথে সংযোগ করতে সমস্যা হচ্ছে', 'error');
    });

    // Server events
    socket.on('receive_global_message', (data) => {
      // Check if this is my own message
      const isOwn = data.socketId && data.socketId === mySocketId;
      NirapodChat.addChatMessage(data.message, data.timestamp, isOwn, data.id, data.replyTo);
    });

    socket.on('message_history', (payload) => {
      const msgs = payload?.messages || [];
      msgs.forEach(m => {
        // Old messages won't have socketId, so they'll be shown as others' messages
        const isOwn = m.socketId && m.socketId === mySocketId;
        NirapodChat.addChatMessage(m.message, m.timestamp, isOwn, m.id, m.replyTo);
      });
    });

    socket.on('users_online', (data) => {
      NirapodChat.updateOnlineUsersList(data.users || []);
    });

    socket.on('chat_error', (data) => {
      showAlert(data?.msg || 'একটি ত্রুটি ঘটেছে', 'error');
    });
  };

  // ===== Actions =====
  NirapodChat.autoJoinChat = function () {
    if (!socket) NirapodChat.initializeSocket();

    NirapodChat.addSystemMessage('গ্লোবাল চ্যাটে স্বাগতম!');

    // Request message history
    socket.emit('request_message_history');

    document.getElementById('globalChatInput')?.focus();
  };

  NirapodChat.sendGlobalMessage = function () {
    const input = document.getElementById('globalChatInput');
    const message = (input?.value || '').trim();
    if (!message) return;
    if (!socket || !socket.connected) {
      showAlert('সার্ভারের সাথে সংযোগ নেই', 'error');
      return;
    }
    if (message.length > 500) {
      showAlert('বার্তা সর্বোচ্চ ৫০০ অক্ষর হতে হবে', 'warning');
      return;
    }

    const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payload = {
      id: messageId,
      message,
      timestamp: new Date().toISOString(),
      socketId: mySocketId,
      replyTo: replyingTo ? replyingTo.text : null
    };
    
    // Store this message ID as mine
    addMyMessageId(messageId);

    socket.emit('global_message', payload);

    // Clear reply state
    replyingTo = null;
    const replyPreview = document.getElementById('replyPreview');
    if (replyPreview) replyPreview.style.display = 'none';

    // Server থেকে broadcast হলে দেখাবে, এখানে দেখাবো না

    if (input) {
      input.value = '';
      input.focus();
    }
  };

  // Reply functionality
  NirapodChat.replyToMessage = function(messageId) {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageEl) return;

    const messageText = messageEl.dataset.messageText;
    if (!messageText) return;

    replyingTo = { id: messageId, text: messageText };

    const replyPreview = document.getElementById('replyPreview');
    const replyPreviewText = document.getElementById('replyPreviewText');
    
    if (replyPreview && replyPreviewText) {
      replyPreviewText.textContent = messageText;
      replyPreview.style.display = 'flex';
    }

    document.getElementById('globalChatInput')?.focus();
  };

  NirapodChat.cancelReply = function() {
    replyingTo = null;
    const replyPreview = document.getElementById('replyPreview');
    if (replyPreview) replyPreview.style.display = 'none';
  };

  // ===== Bind DOM events =====
  NirapodChat.bindEvents = function () {
    const chatInput = document.getElementById('globalChatInput');

    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          NirapodChat.sendGlobalMessage();
        }
      });
      const sendBtn = document.querySelector('.global-chat-input-container .btn.btn-primary');
      if (sendBtn) sendBtn.addEventListener('click', NirapodChat.sendGlobalMessage);
    }

    window.addEventListener('beforeunload', () => {
      if (socket) socket.emit('user_logout', {});
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) scrollToBottom();
    });
  };

  // ===== Expose for HTML onclick =====
  window.sendGlobalMessage = () => NirapodChat.sendGlobalMessage();
  window.replyToMessage = (id) => NirapodChat.replyToMessage(id);
  window.cancelReply = () => NirapodChat.cancelReply();

  // ===== Boot =====
  document.addEventListener('DOMContentLoaded', () => {
    NirapodChat.bindEvents();
    NirapodChat.autoJoinChat(); // Auto-join on page load
  });
})();