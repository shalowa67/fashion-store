const express = require('express');
const router = express.Router();
const Order = require('../models/order');

router.post('/process', async (req, res) => {
  try {
    const { items, totalAmount, phoneNumber, network, userId, shippingAddress } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication is required for payment processing.' });
    }

    if (!Array.isArray(items) || items.length === 0 || !totalAmount || !phoneNumber || !network || !shippingAddress) {
      return res.status(400).json({ error: 'Missing or invalid payment details.' });
    }

    const phoneRegex = /^09[567]\d{7}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid Zambian phone number format' });
    }

    // Simulate payment processing
    const paymentSuccessful = true; // In production, integrate with actual Mobile Money API

    if (!paymentSuccessful) {
      return res.status(400).json({ error: 'Payment failed. Please try again.' });
    }

    const order = new Order({
      userId,
      items,
      totalAmount,
      paymentMethod: network,
      phoneNumber,
      shippingAddress,
      paymentStatus: 'paid',
      status: 'processing',
      transactionId: 'TXN_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
    });
    await order.save();

    res.json({
      success: true,
      message: 'Payment successful!',
      transactionId: order.transactionId,
      orderNumber: order.orderNumber
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/status/:transactionId', async (req, res) => {
  try {
    const order = await Order.findOne({ transactionId: req.params.transactionId });
    res.json({
      status: order?.paymentStatus || 'pending',
      transactionId: req.params.transactionId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;