// ===================================
// Citizen-Admin Chat System with Validation
// ===================================

(function() {
  let socket = null;
  let citizenInfo = null;
  const messageCache = [];

  // Initialize socket connection
  function initSocket() {
    socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('✅ Connected to admin chat');
      if (citizenInfo) {
        socket.emit('citizen_join', citizenInfo);
      }
    });

    // ✅ Join success
    socket.on('join_success', (data) => {
      console.log('✅ Join successful:', data);
      showChatWindow();
    });

    // ✅ Join error (NID validation failed)
    socket.on('join_error', (data) => {
      console.error('❌ Join error:', data.message);
      alert(data.message);
      
      // Clear saved info and reload
      localStorage.removeItem('citizenChatInfo');
      citizenInfo = null;
      location.reload();
    });

    socket.on('receive_admin_message', (data) => {
      console.log('📩 Received admin message:', data);
      appendMessage(data.message, 'admin', data.timestamp);
    });

    socket.on('admin_typing', (data) => {
      showTypingIndicator(data.typing);
    });

    // ✅ Receive chat history
    socket.on('admin_chat_history', (data) => {
      console.log('📜 Received message history:', data.messages ? data.messages.length : 0);
      if (data.messages) {
        loadMessageHistory(data.messages);
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from chat server');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
    });
  }

  // Login with NID
  window.loginToChatWithNID = function() {
    const name = document.getElementById('citizenChatName')?.value?.trim();
    const nidRaw = document.getElementById('citizenChatNID')?.value?.trim();
    const nid = nidRaw.replace(/-/g, ''); // Remove dashes for backend

    if (!name || !nid) {
      alert('দয়া করে নাম এবং এনআইডি নম্বর প্রদান করুন');
      return;
    }

    if (nid.length !== 10 && nid.length !== 13 && nid.length !== 17) {
      alert('সঠিক এনআইডি নম্বর প্রদান করুন (১০, ১৩ বা ১৭ ডিজিট)');
      return;
    }

    citizenInfo = {
      name: name,
      nid: nid,
      timestamp: new Date().toISOString()
    };

    // Save to localStorage
    localStorage.setItem('citizenChatInfo', JSON.stringify(citizenInfo));

    // Initialize socket
    if (!socket) {
      initSocket();
    } else if (socket.connected) {
      socket.emit('citizen_join', citizenInfo);
    }

    console.log('🔄 Attempting login as:', name, 'NID:', nid);
  };

  // Show chat window
  function showChatWindow() {
    const loginForm = document.querySelector('.chat-nid-login');
    const chatWindow = document.querySelector('.chat-window');
    const logoutBtn = document.querySelector('.logout-btn');

    if (loginForm) loginForm.style.display = 'none';
    if (chatWindow) chatWindow.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';

    const headerName = document.getElementById('chat-header-name');
    const headerNID = document.querySelector('.chat-header-nid');

    if (headerName) headerName.textContent = 'প্রশাসক';
    if (headerNID && citizenInfo) headerNID.textContent = `আপনার NID: ${citizenInfo.nid}`;

    console.log('✅ Chat window shown');
  }

  // Send message to admin
  window.sendChatMessage = function() {
    const input = document.getElementById('chatInput');
    const message = input?.value?.trim();

    if (!message || !citizenInfo) {
      console.warn('⚠️ Cannot send: no message or not logged in');
      return;
    }

    if (!socket || !socket.connected) {
      alert('সার্ভারের সাথে সংযোগ নেই। দয়া করে পুনরায় চেষ্টা করুন।');
      return;
    }

    const messageData = {
      message: message,
      senderNID: citizenInfo.nid,
      senderName: citizenInfo.name,
      timestamp: new Date().toISOString(),
      type: 'citizen_to_admin'
    };

    // Send via socket
    socket.emit('citizen_message', messageData);

    console.log('📤 Message sent:', message);

    // Append to UI
    appendMessage(message, 'user', messageData.timestamp);

    // Clear input
    input.value = '';
    input.focus();
  };

  // Append message to chat
  function appendMessage(text, type, timestamp) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    // Remove empty state if exists
    const emptyState = container.querySelector('.chat-empty-state');
    if (emptyState) emptyState.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const p = document.createElement('p');
    p.textContent = text;

    const time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = formatTime(timestamp);

    bubble.appendChild(p);
    bubble.appendChild(time);
    
    // Double-click to reply
    bubble.style.cursor = 'pointer';
    bubble.style.userSelect = 'none';
    bubble.addEventListener('dblclick', function() {
      showCitizenReplyPreview(text);
    });
    
    messageDiv.appendChild(bubble);
    container.appendChild(messageDiv);

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;

    // Cache message
    messageCache.push({ text, type, timestamp });
  }

  // Load message history
  function loadMessageHistory(messages) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    container.innerHTML = '';
    
    if (!messages || messages.length === 0) {
      container.innerHTML = `
        <div class="chat-empty-state">
          <p>এখানে আপনার কথোপকথন দেখা যাবে</p>
        </div>
      `;
      return;
    }

    messages.forEach(msg => {
      appendMessage(
        msg.message,
        msg.type === 'admin_to_citizen' ? 'admin' : 'user',
        msg.timestamp
      );
    });

    console.log('✅ Loaded', messages.length, 'messages');
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

  // Show reply preview
  window.showCitizenReplyPreview = function(text) {
    const preview = document.getElementById('citizenReplyPreview');
    const previewText = document.getElementById('citizenReplyPreviewText');
    const input = document.getElementById('chatInput');
    
    if (preview && previewText && input) {
      previewText.textContent = text.substring(0, 80) + (text.length > 80 ? '...' : '');
      preview.style.display = 'flex';
      input.focus();
    }
  };

  // Cancel reply
  window.cancelCitizenReply = function() {
    const preview = document.getElementById('citizenReplyPreview');
    if (preview) {
      preview.style.display = 'none';
    }
  };

  // Show typing indicator
  function showTypingIndicator(isTyping) {
    let indicator = document.getElementById('typing-indicator');
    const container = document.getElementById('chat-messages-container');
    
    if (!container) return;

    if (isTyping && !indicator) {
      indicator = document.createElement('div');
      indicator.id = 'typing-indicator';
      indicator.className = 'chat-message admin';
      indicator.innerHTML = `
        <div class="message-bubble" style="background: #e5e7eb;">
          <p style="color: #64748b;">প্রশাসক লিখছেন...</p>
        </div>
      `;
      container.appendChild(indicator);
      container.scrollTop = container.scrollHeight;
    } else if (!isTyping && indicator) {
      indicator.remove();
    }
  }

  // Enter key to send
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Citizen Chat Initializing...');

    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendChatMessage();
        }
      });

      // Emit typing event
      let typingTimer;
      chatInput.addEventListener('input', () => {
        if (!socket || !citizenInfo || !socket.connected) return;
        
        socket.emit('citizen_typing', {
          nid: citizenInfo.nid,
          typing: true
        });

        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
          socket.emit('citizen_typing', {
            nid: citizenInfo.nid,
            typing: false
          });
        }, 1000);
      });
    }

    // ✅ Auto-login if info exists
    const savedInfo = localStorage.getItem('citizenChatInfo');
    if (savedInfo) {
      try {
        citizenInfo = JSON.parse(savedInfo);
        console.log('✅ Auto-login:', citizenInfo.name);
        initSocket();
      } catch (e) {
        console.error('❌ Failed to parse saved info:', e);
        localStorage.removeItem('citizenChatInfo');
      }
    }

    console.log('✅ Citizen Chat Ready');
  });

  // Logout function
  window.logoutFromAdminChat = function() {
    if (socket && citizenInfo) {
      socket.emit('citizen_logout', { nid: citizenInfo.nid });
      socket.disconnect();
    }
    
    localStorage.removeItem('citizenChatInfo');
    citizenInfo = null;
    socket = null;
    
    location.reload();
  };
})();