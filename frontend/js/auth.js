(function () {
  const API_BASE_URL = (window.location.origin && window.location.origin !== 'null')
    ? `${window.location.origin}/api`
    : 'http://localhost:5000/api';

  function getToken() {
    return localStorage.getItem('token');
  }

  function getStoredUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.warn('Unable to parse stored user:', error);
      return null;
    }
  }

  function setAuthData(data) {
    if (data?.token) {
      localStorage.setItem('token', data.token);
    }

    if (data?.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  }

  function clearAuthData() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  async function login(credentials) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    setAuthData(data);
    return data;
  }

  async function signup(userData) {
    const data = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    setAuthData(data);
    return data;
  }

  async function getCurrentUser() {
    if (!getToken()) {
      return null;
    }

    try {
      const user = await request('/auth/me');
      if (user) {
        setAuthData({ token: getToken(), user });
      }
      return user;
    } catch (error) {
      clearAuthData();
      throw error;
    }
  }

  function isAuthenticated() {
    return Boolean(getToken());
  }

  function logout() {
    clearAuthData();
    return true;
  }

  function redirectToLogin() {
    if (window.location.pathname.includes('login.html')) {
      return;
    }

    window.location.href = 'login.html';
  }

  const authApi = {
    login,
    signup,
    logout,
    getCurrentUser,
    getStoredUser,
    isAuthenticated,
    redirectToLogin,
    getToken
  };

  window.Auth = authApi;
  window.auth = authApi;
})();
