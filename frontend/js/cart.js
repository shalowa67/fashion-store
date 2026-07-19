let cartItems = [];

async function loadCart() {
  const cartItemsContainer = document.getElementById('cartItems');
  const summaryCount = document.getElementById('summaryCount');
  const summaryTotal = document.getElementById('summaryTotal');
  const checkoutButton = document.getElementById('checkoutButton');

  if (!cartItemsContainer) return;

  try {
    const cart = await api.getCart();
    cartItems = cart.items || [];

    if (!cartItems.length) {
      cartItemsContainer.innerHTML = `
        <div class="empty-cart">
          <p>Your cart is empty.</p>
          <p><a href="shop.html">Continue shopping</a></p>
        </div>
      `;
      summaryCount.textContent = '0';
      summaryTotal.textContent = 'ZMW 0.00';
      checkoutButton.disabled = true;
      return;
    }

    cartItemsContainer.innerHTML = cartItems.map(item => `
      <div class="cart-item">
        <div class="item-image">
          <img src="${item.image || 'https://via.placeholder.com/120'}" alt="${item.name}">
        </div>
        <div class="item-details">
          <h4>${item.name}</h4>
          <p>ZMW ${item.price.toFixed(2)}</p>
          <div class="quantity-control">
            <button type="button" onclick="updateCartQuantity('${item.productId}', ${item.quantity - 1})">-</button>
            <input type="number" min="1" value="${item.quantity}" onchange="updateCartQuantity('${item.productId}', this.value)">
            <button type="button" onclick="updateCartQuantity('${item.productId}', ${item.quantity + 1})">+</button>
          </div>
          <button class="btn-remove" type="button" onclick="removeCartItem('${item.productId}')">Remove</button>
        </div>
        <div class="item-total">ZMW ${(item.price * item.quantity).toFixed(2)}</div>
      </div>
    `).join('');

    summaryCount.textContent = cart.totalItems ?? cartItems.reduce((sum, item) => sum + item.quantity, 0);
    summaryTotal.textContent = `ZMW ${(cart.totalPrice ?? cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)).toFixed(2)}`;
    checkoutButton.disabled = false;
  } catch (error) {
    console.error('Failed to load cart:', error);
    cartItemsContainer.innerHTML = `
      <div class="empty-cart">
        <p>Unable to load cart. Please <a href="login.html">login</a> or try again later.</p>
      </div>
    `;
    summaryCount.textContent = '0';
    summaryTotal.textContent = 'ZMW 0.00';
    checkoutButton.disabled = true;
  }
}

window.updateCartQuantity = async function(productId, quantity) {
  quantity = parseInt(quantity, 10);
  if (!quantity || quantity < 1) return;

  try {
    await api.updateCart(productId, quantity);
    showNotification('Cart updated successfully.', 'success');
    await loadCart();
    updateCartCount();
  } catch (error) {
    console.error('Failed to update cart:', error);
    showNotification('Unable to update cart. Please try again.', 'error');
  }
};

window.removeCartItem = async function(productId) {
  try {
    await api.removeFromCart(productId);
    showNotification('Item removed from cart.', 'success');
    await loadCart();
    updateCartCount();
  } catch (error) {
    console.error('Failed to remove cart item:', error);
    showNotification('Unable to remove item. Please try again.', 'error');
  }
};

window.checkoutCart = function() {
  if (!cartItems.length) {
    showNotification('Your cart is empty.', 'error');
    return;
  }

  const checkoutItems = cartItems.map(item => ({
    name: item.name,
    price: item.price,
    quantity: item.quantity
  }));
  localStorage.setItem('checkoutItems', JSON.stringify(checkoutItems));
  window.location.href = 'payment.html';
};

const cartInit = () => {
  const checkoutButton = document.getElementById('checkoutButton');
  if (checkoutButton) {
    checkoutButton.addEventListener('click', () => checkoutCart());
  }
  loadCart();
};

document.addEventListener('DOMContentLoaded', cartInit);
