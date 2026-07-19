const API_URL = (window.location.origin && window.location.origin !== 'null')
  ? `${window.location.origin}/api`
  : 'http://localhost:5000/api';

const LOCAL_USERS_KEY = 'local_users';
const LOCAL_CURRENT_KEY = 'local_current_user';

function loadLocalUsers() {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalUsers(users) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function findLocalUserByEmailOrUsername(email, username) {
  const users = loadLocalUsers();
  return users.find(u => u.email === email || u.username === username) || null;
}

function findLocalUserByIdentifier(identifier) {
  const users = loadLocalUsers();
  return users.find(u => u.username === identifier || u.email === identifier) || null;
}

function createLocalUser({ fullName, email, username, password }) {
  const users = loadLocalUsers();
  const existing = users.find(u => u.email === email || u.username === username);
  if (existing) {
    const err = new Error('User already exists with this email or username');
    err.code = 'EXISTS';
    throw err;
  }

  const user = { id: Date.now().toString(), fullName, email, username, password };
  users.push(user);
  saveLocalUsers(users);
  localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(user));
  return user;
}

function verifyLocalUser(identifier, password) {
  const user = findLocalUserByIdentifier(identifier);
  if (!user) return null;
  return user.password === password ? user : null;
}

const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    // If sending FormData, do not set Content-Type so browser sets the multipart boundary
    const isForm = options.body instanceof FormData;
    const headers = {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        throw new Error(`API response parse failed: ${parseError.message}`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      return data;
    } catch (err) {
      // If network or fetch error, fall back to client-side auth for auth endpoints
      const isNetworkError = err instanceof TypeError || /failed to fetch/i.test(err.message) || /connect/i.test(err.message);
      if (!isNetworkError) throw err;

      // Fallback implementations for offline development
      if (endpoint === '/auth/signup') {
        try {
          const body = options.body ? JSON.parse(options.body) : {};
          const user = createLocalUser(body);
          const token = `local-token-${btoa(user.username + ':' + Date.now())}`;
          return { success: true, message: 'Account created (local)', token, user: { id: user.id, fullName: user.fullName, email: user.email, username: user.username, isAdmin: false } };
        } catch (e) {
          if (e.code === 'EXISTS') throw new Error('User already exists with this email or username');
          throw e;
        }
      }

      if (endpoint === '/auth/login') {
        const body = options.body ? JSON.parse(options.body) : {};
        const { username, password } = body;
        const user = verifyLocalUser(username, password);
        if (!user) throw new Error('Invalid credentials');
        const token = `local-token-${btoa(user.username + ':' + Date.now())}`;
        localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(user));
        return { success: true, message: 'Login successful (local)', token, user: { id: user.id, fullName: user.fullName, email: user.email, username: user.username, isAdmin: false } };
      }

      if (endpoint === '/auth/me') {
        const local = localStorage.getItem(LOCAL_CURRENT_KEY);
        if (!local) throw new Error('No token provided');
        return JSON.parse(local);
      }

      throw err;
    }
  },
  
  // Auth endpoints
  signup(userData) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },
  
  login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },
  
  getCurrentUser() {
    return this.request('/auth/me');
  },
  
  // Product endpoints
  getProducts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/products${queryString ? `?${queryString}` : ''}`);
  },
  
  getProduct(id) {
    return this.request(`/products/${id}`);
  },
  
  // Cart endpoints
  getCart() {
    return this.request('/cart');
  },
  
  addToCart(productId, quantity = 1) {
    return this.request('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity })
    });
  },
  
  updateCart(productId, quantity) {
    return this.request(`/cart/update/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity })
    });
  },
  
  removeFromCart(productId) {
    return this.request(`/cart/remove/${productId}`, {
      method: 'DELETE'
    });
  },
  
  // Order endpoints
  getOrders() {
    return this.request('/orders');
  },
  
  getOrder(id) {
    return this.request(`/orders/${id}`);
  },
  
  // Payment endpoints
  processPayment(paymentData) {
    return this.request('/payments/process', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  },
  
  // Contact endpoints
  submitContact(formData) {
    return this.request('/contact/submit', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
  }
};