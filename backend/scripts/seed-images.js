/**
 * Seed sample image URLs into products (uses picsum.photos)
 * Usage: `node scripts/seed-images.js`
 */
const mongoose = require('mongoose');
const Product = require('../models/product');
require('dotenv').config();

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in env; cannot seed.');
    process.exit(1);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for seeding');

  try {
    const products = await Product.find({});
    console.log(`Found ${products.length} products`);
    for (const p of products) {
      const seed = encodeURIComponent(p._id.toString());
      const url = `https://picsum.photos/seed/${seed}/800/800`;
      p.images = [url];
      p.image = url;
      await p.save();
      console.log('Seeded', p._id.toString());
    }
    console.log('Seeding complete');
  } catch (err) {
    console.error('Seeding error', err);
  } finally {
    mongoose.disconnect();
  }
})();
