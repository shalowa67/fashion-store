let allProducts = [];

// Sample clothing images from Unsplash
const clothingImages = [
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&h=500&fit=crop', // Purple scarf
  'https://images.unsplash.com/photo-1578689632537-e58004df1a73?w=500&h=500&fit=crop', // Fashion stole
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop', // Colorful wrap
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=500&fit=crop', // Brown scarf
  'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&h=500&fit=crop', // Blue stole
  'https://images.unsplash.com/photo-1595958694651-8f4fde52ad8e?w=500&h=500&fit=crop', // Red wrap
  'https://images.unsplash.com/photo-1608409122622-c2fb2a3e12d3?w=500&h=500&fit=crop', // Fashion accessory
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop', // Green scarf
];

async function loadAllProducts() {
  const productsGrid = document.getElementById('productsGrid');
  if (!productsGrid) return;
  
  try {
    productsGrid.innerHTML = '<div class="loading">Loading products...</div>';
    
    const category = new URLSearchParams(window.location.search).get('category');
    const params = category ? { category } : {};
    allProducts = await api.getProducts(params);
    
    // Add sample images to products
    allProducts = allProducts.map((product, index) => ({
      ...product,
      image: clothingImages[index % clothingImages.length],
      images: [clothingImages[index % clothingImages.length]]
    }));
    
    filterAndDisplayProducts();
  } catch (error) {
    console.error('Failed to load products:', error);
    productsGrid.innerHTML = '<p>Failed to load products. Please try again later.</p>';
  }
}

function filterAndDisplayProducts() {
  const productsGrid = document.getElementById('productsGrid');
  if (!productsGrid) return;
  
  const category = document.getElementById('categoryFilter')?.value || '';
  const sort = document.getElementById('sortFilter')?.value || 'newest';
  
  let filtered = [...allProducts];
  
  if (category) {
    filtered = filtered.filter(p => p.category === category);
  }
  
  switch(sort) {
    case 'price-low':
      filtered.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      filtered.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
    default:
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  if (filtered.length === 0) {
    productsGrid.innerHTML = '<p>No products found.</p>';
    return;
  }
  function placeholderFor(name, w=300, h=300) {
    const text = encodeURIComponent((name || 'Product').slice(0,20));
    // simple SVG data URL with product name
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><rect width='100%' height='100%' fill='%23f4f4f4'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='20' fill='%23888888'>${text}</text></svg>`;
    return `data:image/svg+xml;utf8,${svg}`;
  }

  productsGrid.innerHTML = filtered.map(product => {
    const img = (product.images && product.images.length > 0) ? product.images[0] : (product.image || placeholderFor(product.name));
    const imgSrc = (img && (img.startsWith('http') || img.startsWith('data:'))) ? img : (window.location.origin + img);
    return `
    <div class="product-card">
      <div class="product-image">
        <img src="${imgSrc}" alt="${product.name}">
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <p class="product-description">${product.description.substring(0, 80)}...</p>
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
}

document.addEventListener('DOMContentLoaded', () => {
  loadAllProducts();
  
  const categoryFilter = document.getElementById('categoryFilter');
  const sortFilter = document.getElementById('sortFilter');
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', filterAndDisplayProducts);
  }
  if (sortFilter) {
    sortFilter.addEventListener('change', filterAndDisplayProducts);
  }
});