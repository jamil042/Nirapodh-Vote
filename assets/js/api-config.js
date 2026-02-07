// API Configuration
// Note: Replace 'localhost' with your server IP address for network access
// Example: 'http://192.168.1.5:3000' or 'http://192.168.0.100:3000'
const API_CONFIG = {
  BASE_URL: window.location.origin.includes('localhost') 
    ? 'http://localhost:3000' 
    : window.location.origin,
  API_URL: window.location.origin.includes('localhost') 
    ? 'http://localhost:3000/api' 
    : window.location.origin + '/api',
  SOCKET_URL: window.location.origin.includes('localhost') 
    ? 'http://localhost:3000' 
    : window.location.origin,
  ENDPOINTS: {
    // Auth endpoints
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    GET_USER: '/auth/me',
    SEND_OTP: '/auth/send-otp',
    VERIFY_OTP_REGISTER: '/auth/verify-otp-register',
    
    // Vote endpoints
    CAST_VOTE: '/vote/cast',
    VOTE_STATUS: '/vote/status',
    BALLOT_STATUS: '/vote/status',
    VOTE_STATISTICS: '/vote/statistics',
    GET_BALLOTS: '/vote/ballots',
    GET_CANDIDATES: '/vote/candidates',
    GET_RESULTS: '/vote/results',
    
    // Admin endpoints
    ADMIN_LOGIN: '/admin/login',
    ADMIN_STATISTICS: '/admin/statistics',
    ADMIN_USERS: '/admin/users',
    ADMIN_VOTES: '/admin/votes',
    CREATE_INITIAL_ADMIN: '/admin/create-initial-admin'
  }
};

// Helper function to get full API URL
function getApiUrl(endpoint) {
  return API_CONFIG.API_URL + API_CONFIG.ENDPOINTS[endpoint];
}

// Helper function to make API requests
async function apiRequest(endpoint, method = 'GET', data = null, requiresAuth = false) {
  const url = getApiUrl(endpoint);
  console.log('=== API Request ===');
  console.log('Endpoint:', endpoint);
  console.log('URL:', url);
  console.log('Method:', method);
  console.log('Data:', data);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  // Add auth token if required
  if (requiresAuth) {
    const token = sessionStorage.getItem('nirapodh_token');
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('⚠️ No token found in sessionStorage for authenticated request');
    }
  }

  // Add body for POST/PUT requests
  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  console.log('Request Options:', options);

  try {
    console.log('Sending fetch request...');
    const response = await fetch(url, options);
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);
    
    if (!response.ok) {
      throw new Error(result.message || 'Request failed');
    }
    
    return result;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
}

// Storage helpers
function saveAuthToken(token) {
  sessionStorage.setItem('nirapodh_token', token);
}

function getAuthToken() {
  return sessionStorage.getItem('nirapodh_token');
}

function removeAuthToken() {
  sessionStorage.removeItem('nirapodh_token');
}

function saveUserData(userData) {
  // Use sessionStorage to ensure user must login every time
  sessionStorage.setItem('nirapodh_user', JSON.stringify(userData));
}

function getUserData() {
  const data = sessionStorage.getItem('nirapodh_user');
  return data ? JSON.parse(data) : null;
}

function removeUserData() {
  sessionStorage.removeItem('nirapodh_user');
}

function logout() {
  removeAuthToken();
  removeUserData();
  // Also clear from localStorage if exists (backward compatibility)
  localStorage.removeItem('nirapodh_token');
  localStorage.removeItem('nirapodh_user');
  window.location.href = '/login.html';
}
