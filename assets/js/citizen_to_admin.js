// ===================================
// Citizen-Admin Chat System
// ===================================

(function() {
  let socket = null;
  let citizenInfo = null;
  const messageCache = [];

  // Initialize socket connection
  function initSocket() {
    socket = io('http://localhost:5501', {
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    socket.on('connect', () => {
      console.log('✅ Connected to admin chat');
      if (citizenInfo) {
        socket.emit('citizen_join', citizenInfo);
      }
    });

    socket.on('receive_admin_message', (data) => {
      appendMessage(data.message, 'admin', data.timestamp);
      playNotificationSound();
    });

    socket.on('admin_typing', (data) => {
      showTypingIndicator(data.typing);
    });

    socket.on('message_history', (messages) => {
      loadMessageHistory(messages);
    });
  }

  // Login with NID
  window.loginToChatWithNID = function() {
    const name = document.getElementById('citizenChatName')?.value?.trim();
    const nid = document.getElementById('citizenChatNID')?.value?.trim();

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
    if (!socket) initSocket();

    // Show chat window
    showChatWindow();

    // Join chat room
    socket.emit('citizen_join', citizenInfo);

    // Request message history
    socket.emit('request_admin_chat_history', { nid: nid });
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
}


  // Send message to admin
  window.sendChatMessage = function() {
    const input = document.getElementById('chatInput');
    const message = input?.value?.trim();

    if (!message || !citizenInfo) return;

    const messageData = {
      message: message,
      senderNID: citizenInfo.nid,
      senderName: citizenInfo.name,
      timestamp: new Date().toISOString(),
      type: 'citizen_to_admin'
    };

    // Send via socket
    socket.emit('citizen_message', messageData);

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
    
    messages.forEach(msg => {
      appendMessage(
        msg.message,
        msg.type === 'admin_to_citizen' ? 'admin' : 'user',
        msg.timestamp
      );
    });
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

  // Show typing indicator
  function showTypingIndicator(isTyping) {
    let indicator = document.getElementById('typing-indicator');
    
    if (isTyping && !indicator) {
      const container = document.getElementById('chat-messages-container');
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

  // Notification sound
  function playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSiByNu6+T');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }

  // Enter key to send
  document.addEventListener('DOMContentLoaded', () => {
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
        if (!socket || !citizenInfo) return;
        
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

    // Auto-login if info exists
    const savedInfo = localStorage.getItem('citizenChatInfo');
    if (savedInfo) {
      citizenInfo = JSON.parse(savedInfo);
      initSocket();
      showChatWindow();
    }
  });

  // Logout function
  window.logoutFromAdminChat = function() {
    if (socket) {
      socket.emit('citizen_logout', { nid: citizenInfo.nid });
      socket.disconnect();
    }
    
    localStorage.removeItem('citizenChatInfo');
    citizenInfo = null;
    
    location.reload();
  };
})();