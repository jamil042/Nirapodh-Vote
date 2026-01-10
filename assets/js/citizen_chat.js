// assets/js/citizen_chat_anonymous.js - Auto-login with Green Theme
(function () {
  // ===== Namespace =====
  window.NirapodChat = window.NirapodChat || {};

  // ===== Private state =====
  let socket = null;
  let mySocketId = null;
  const messageIds = new Set(); // Prevent duplicate messages

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
  NirapodChat.addChatMessage = function (message, timestamp, isOwn = false, id = null) {
    const messagesContainer = document.getElementById('globalChatMessages');
    if (!messagesContainer) return;

    const key = id || `${timestamp}-${message.substring(0, 20)}`;
    if (messageIds.has(key)) return;
    messageIds.add(key);

    const messageDiv = document.createElement('div');
    messageDiv.className = `global-message ${isOwn ? 'own-message' : 'other-message'}`;
    messageDiv.dataset.messageId = key;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';

    // ❌ Username removed for anonymity

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = message;
    bubbleDiv.appendChild(textDiv);

    const timeSpan = document.createElement('div');
    timeSpan.className = 'message-time';
    timeSpan.textContent = formatTime(timestamp);
    bubbleDiv.appendChild(timeSpan);

    messageDiv.appendChild(bubbleDiv);
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
    socket = io('http://localhost:5501', {
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
      NirapodChat.addChatMessage(data.message, data.timestamp, isOwn, data.id);
    });

    socket.on('message_history', (payload) => {
      const msgs = payload?.messages || [];
      msgs.forEach(m => {
        // Old messages won't have socketId, so they'll be shown as others' messages
        const isOwn = m.socketId && m.socketId === mySocketId;
        NirapodChat.addChatMessage(m.message, m.timestamp, isOwn, m.id);
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

    const payload = {
      message,
      timestamp: new Date().toISOString(),
      socketId: mySocketId
    };

    socket.emit('global_message', payload);

    // Server থেকে broadcast হলে দেখাবে, এখানে দেখাবো না

    if (input) {
      input.value = '';
      input.focus();
    }
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

  // ===== Boot =====
  document.addEventListener('DOMContentLoaded', () => {
    NirapodChat.bindEvents();
    NirapodChat.autoJoinChat(); // Auto-join on page load
  });
})();