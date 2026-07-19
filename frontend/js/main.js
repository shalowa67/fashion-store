// Update cart count display
async function updateCartCount() {
  try {
    if (localStorage.getItem('token')) {
      const cart = await api.getCart();
      const count = cart.totalItems || 0;
      const cartCountElem = document.getElementById('cartCount');
      if (cartCountElem) {
        cartCountElem.textContent = count;
      }
    }
  } catch (error) {
    console.error('Failed to fetch cart:', error);
  }
}

// Check authentication state
function checkAuth() {
  const token = localStorage.getItem('token');
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const accountLink = document.getElementById('accountLink');
  const userNameDisplay = document.getElementById('userNameDisplay');
  
  if (token) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
    if (accountLink) accountLink.style.display = 'inline-block';
    if (userNameDisplay) userNameDisplay.style.display = 'inline-block';
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (signupBtn) signupBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (accountLink) accountLink.style.display = 'none';
    if (userNameDisplay) userNameDisplay.style.display = 'none';
  }
}

function showUserName(user) {
  const accountLink = document.getElementById('accountLink');
  const userNameDisplay = document.getElementById('userNameDisplay');
  if (!accountLink || !user) return;
  const name = user.fullName || user.username || user.email || 'Account';
  accountLink.textContent = name;
  accountLink.href = 'accounts.html';
  if (userNameDisplay) {
    userNameDisplay.textContent = name;
    userNameDisplay.style.display = 'inline-block';
  }
}

function setUserAvatar(user) {
  const avatar = document.getElementById('userAvatar');
  if (!avatar || !user) return;
  // If user has an avatar (URL or data URL), use it as background image
  if (user.avatar) {
    const url = (user.avatar.startsWith('http') || user.avatar.startsWith('data:')) ? user.avatar : (window.location.origin + user.avatar);
    avatar.style.backgroundImage = `url('${url}')`;
    avatar.classList.add('has-image');
    avatar.textContent = '';
    return;
  }

  const name = user.fullName || user.username || user.email || '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  let initials = '';
  if (parts.length === 1) initials = parts[0].charAt(0).toUpperCase();
  else initials = (parts[0].charAt(0) + parts[parts.length-1].charAt(0)).toUpperCase();
  avatar.style.backgroundImage = '';
  avatar.classList.remove('has-image');
  avatar.textContent = initials;
}

function setupUserMenu() {
  const toggle = document.getElementById('userMenuToggle');
  const menu = document.getElementById('userDropdown');
  const container = document.getElementById('userMenu');
  const dropdownLogout = document.getElementById('dropdownLogout');
  const avatarInput = document.getElementById('avatarInput');

  if (!toggle || !menu || !container) return;

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const visible = menu.style.display === 'block';
    menu.style.display = visible ? 'none' : 'block';
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      menu.style.display = 'none';
    }
  });

  if (dropdownLogout) {
    dropdownLogout.addEventListener('click', (e) => {
      e.preventDefault();
      // reuse logout behavior
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('local_current_user');
      const userNameDisplay = document.getElementById('userNameDisplay');
      const accountLink = document.getElementById('accountLink');
      if (userNameDisplay) { userNameDisplay.textContent = ''; userNameDisplay.style.display = 'none'; }
      if (accountLink) { accountLink.textContent = 'Account'; accountLink.style.display = 'none'; }
      window.location.href = 'index.html';
    });
  }

  if (avatarInput) {
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      // Try uploading to server if online and token exists
      const token = localStorage.getItem('token');
      if (navigator.onLine && token) {
        try {
          const form = new FormData();
          form.append('avatar', file);
          const resp = await api.request('/auth/avatar', { method: 'POST', body: form });
          if (resp && resp.user && resp.user.avatar) {
            // Update UI
            const user = resp.user;
            localStorage.setItem('user', JSON.stringify(user));
            setUserAvatar(user);
            showUserName(user);
          }
          return;
        } catch (err) {
          console.warn('Upload failed, falling back to local avatar:', err.message);
        }
      }

      // Offline or upload failed: store base64 locally
      const reader = new FileReader();
      reader.onload = function(ev) {
        const dataUrl = ev.target.result;
        // save to local_current_user and local_users
        let current = localStorage.getItem('local_current_user');
        if (current) {
          const cu = JSON.parse(current);
          cu.avatar = dataUrl;
          localStorage.setItem('local_current_user', JSON.stringify(cu));
          // update in local_users array
          try {
            const users = JSON.parse(localStorage.getItem('local_users') || '[]');
            const idx = users.findIndex(u => u.username === cu.username || u.email === cu.email);
            if (idx !== -1) { users[idx].avatar = dataUrl; localStorage.setItem('local_users', JSON.stringify(users)); }
          } catch (_) {}
          setUserAvatar(cu);
          showUserName(cu);
        }
      };
      reader.readAsDataURL(file);
    });
  }
}

// Logout function
function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('local_current_user');
      const userNameDisplay = document.getElementById('userNameDisplay');
      const accountLink = document.getElementById('accountLink');
      if (userNameDisplay) { userNameDisplay.textContent = ''; userNameDisplay.style.display = 'none'; }
      if (accountLink) { accountLink.textContent = 'Account'; accountLink.style.display = 'none'; }
      window.location.href = 'index.html';
    });
  }
}

// Load featured products on homepage
async function loadFeaturedProducts() {
  const productsGrid = document.getElementById('featuredProducts');
  if (!productsGrid) return;
  
  try {
    const products = await api.getProducts({ featured: true });
    
    if (products.length === 0) {
      productsGrid.innerHTML = '<p>No featured products available.</p>';
      return;
    }
    
    productsGrid.innerHTML = products.slice(0, 4).map(product => `
      <div class="product-card">
        <div class="product-image">
          <img src="${product.image || 'https://via.placeholder.com/300'}" alt="${product.name}">
        </div>
        <div class="product-info">
          <h3>${product.name}</h3>
          <div class="price">
            ZMW ${product.price.toFixed(2)}
            ${product.originalPrice ? `<span class="original-price">ZMW ${product.originalPrice.toFixed(2)}</span>` : ''}
          </div>
          <button class="btn-add-cart" onclick="addToCart('${product._id}')">
            <i class="fas fa-shopping-bag"></i> Add to Cart
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load products:', error);
    productsGrid.innerHTML = '<p>Failed to load products. Please try again later.</p>';
  }
}

// Add to cart function
window.addToCart = async function(productId) {
  if (!localStorage.getItem('token')) {
    if (confirm('Please login to add items to cart. Login now?')) {
      window.location.href = 'login.html';
    }
    return;
  }
  
  try {
    await api.addToCart(productId, 1);
    updateCartCount();
    showNotification('Product added to cart!', 'success');
  } catch (error) {
    showNotification('Failed to add to cart. Please try again.', 'error');
  }
};

// Show notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#4caf50' : '#f44336'};
    color: white;
    border-radius: 8px;
    z-index: 2000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  (async function init() {
    checkAuth();
    setupLogout();
    setupUserMenu();
    updateCartCount();
    loadFeaturedProducts();

    // Display logged-in user's name if available
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        showUserName(user);
        setUserAvatar(user);
      } else if (localStorage.getItem('token')) {
        // try API (will fallback to local current user if offline)
        try {
          const user = await api.getCurrentUser();
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
            showUserName(user);
            setUserAvatar(user);
          }
        } catch (err) {
          // ignore - no user available
        }
      }
    } catch (err) {
      console.warn('Failed to set user name:', err);
    }
  })();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);