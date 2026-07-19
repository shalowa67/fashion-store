const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/product');

// ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
    cb(null, safe);
  }
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Upload one or multiple images for a product
// Field name: 'images' (array)
router.post('/products/:id/images', upload.array('images', 6), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const files = req.files || [];
    const urls = files.map(f => '/uploads/' + f.filename);
    product.images = (product.images || []).concat(urls);
    if (!product.image && product.images.length > 0) product.image = product.images[0];
    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    console.error('admin upload error', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
