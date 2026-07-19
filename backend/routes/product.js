const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const mongoose = require('mongoose');

// Sample products for when MongoDB is unavailable
const sampleProducts = [
  {
    _id: '507f1f77bcf86cd799439001',
    name: 'Purple Silk Stole',
    description: 'Elegant purple silk stole perfect for formal occasions',
    price: 450,
    originalPrice: 600,
    category: 'stoles',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&h=500&fit=crop',
    images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&h=500&fit=crop'],
    stock: 15,
    isFeatured: true,
    createdAt: new Date('2024-01-15')
  },
  {
    _id: '507f1f77bcf86cd799439002',
    name: 'Colorful Fashion Wrap',
    description: 'Vibrant colorful wrap with traditional patterns',
    price: 350,
    originalPrice: 500,
    category: 'wraps',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop',
    images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop'],
    stock: 20,
    isFeatured: true,
    createdAt: new Date('2024-01-14')
  },
  {
    _id: '507f1f77bcf86cd799439003',
    name: 'Brown Linen Scarf',
    description: 'Classic brown linen scarf for everyday wear',
    price: 250,
    category: 'scarves',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=500&fit=crop',
    images: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=500&fit=crop'],
    stock: 25,
    isFeatured: false,
    createdAt: new Date('2024-01-13')
  },
  {
    _id: '507f1f77bcf86cd799439004',
    name: 'Red Fashion Stole',
    description: 'Beautiful red fashion stole for weddings and events',
    price: 520,
    originalPrice: 700,
    category: 'stoles',
    image: 'https://images.unsplash.com/photo-1595958694651-8f4fde52ad8e?w=500&h=500&fit=crop',
    images: ['https://images.unsplash.com/photo-1595958694651-8f4fde52ad8e?w=500&h=500&fit=crop'],
    stock: 10,
    isFeatured: true,
    createdAt: new Date('2024-01-12')
  },
  {
    _id: '507f1f77bcf86cd799439005',
    name: 'Elegant Accessory Set',
    description: 'Complete accessory set with matching pieces',
    price: 180,
    category: 'accessories',
    image: 'https://images.unsplash.com/photo-1608409122622-c2fb2a3e12d3?w=500&h=500&fit=crop',
    images: ['https://images.unsplash.com/photo-1608409122622-c2fb2a3e12d3?w=500&h=500&fit=crop'],
    stock: 30,
    isFeatured: false,
    createdAt: new Date('2024-01-11')
  },
  {
    _id: '507f1f77bcf86cd799439006',
    name: 'Green Silk Scarf',
    description: 'Soft green silk scarf with intricate patterns',
    price: 320,
    originalPrice: 420,
    category: 'scarves',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop',
    images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop'],
    stock: 18,
    isFeatured: false,
    createdAt: new Date('2024-01-10')
  }
];

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

router.get('/', async (req, res) => {
  try {
    const { category, featured, search } = req.query;
    
    // If MongoDB is not connected, use sample products
    if (!isMongoReady()) {
      let products = [...sampleProducts];
      
      if (category) products = products.filter(p => p.category === category);
      if (featured === 'true') products = products.filter(p => p.isFeatured);
      if (search) {
        const searchLower = search.toLowerCase();
        products = products.filter(p => 
          p.name.toLowerCase().includes(searchLower) || 
          p.description.toLowerCase().includes(searchLower)
        );
      }
      
      return res.json(products);
    }
    
    // Use MongoDB if available
    let query = {};
    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!isMongoReady()) {
      const product = sampleProducts.find(p => p._id.toString() === req.params.id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.json(product);
    }
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;