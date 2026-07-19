const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Setup multer storage for avatar uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split('.').pop();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`);
  }
});

const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

const memoryUsers = [];

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function comparePasswords(candidatePassword, hashedPassword) {
  return bcrypt.compare(candidatePassword, hashedPassword);
}

function serializeUser(user) {
  const plainUser = user?.toObject ? user.toObject() : { ...user };

  return {
    id: plainUser._id || plainUser.id,
    fullName: plainUser.fullName,
    email: plainUser.email,
    username: plainUser.username,
    isAdmin: Boolean(plainUser.isAdmin)
  };
}

async function findUserByEmailOrUsername(email, username) {
  if (isMongoReady()) {
    return User.findOne({ $or: [{ email }, { username }] });
  }

  return memoryUsers.find((user) => user.email === email || user.username === username) || null;
}

async function findUserByIdentifier(identifier) {
  if (isMongoReady()) {
    return User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
  }

  return memoryUsers.find((user) => user.username === identifier || user.email === identifier) || null;
}

async function createUserRecord(userData) {
  if (isMongoReady()) {
    const user = new User(userData);
    await user.save();
    return user;
  }

  const passwordHash = await hashPassword(userData.password);
  const user = {
    _id: new mongoose.Types.ObjectId().toString(),
    fullName: userData.fullName,
    email: userData.email,
    username: userData.username,
    password: passwordHash,
    isAdmin: false,
    createdAt: new Date()
  };

  memoryUsers.push(user);
  return user;
}

async function findUserById(id) {
  if (isMongoReady()) {
    return User.findById(id).select('-password');
  }

  const user = memoryUsers.find((entry) => entry._id.toString() === id.toString());
  if (!user) return null;

  return { ...user, password: undefined };
}

async function updateUserInStore(id, updates) {
  if (isMongoReady()) {
    return User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
  }

  const index = memoryUsers.findIndex((entry) => entry._id.toString() === id.toString());
  if (index === -1) return null;

  memoryUsers[index] = { ...memoryUsers[index], ...updates };
  return { ...memoryUsers[index], password: undefined };
}

router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, username, password } = req.body;

    const existingUser = await findUserByEmailOrUsername(email, username);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email or username' });
    }

    const user = await createUserRecord({ fullName, email, username, password });
    const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await findUserByIdentifier(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await comparePasswords(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: serializeUser(user)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await findUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { fullName, phone, address } = req.body;

    const user = await updateUserInStore(decoded.userId, { fullName, phone, address });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// Avatar upload route
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const avatarPath = `/uploads/${req.file.filename}`;

    if (isMongoReady()) {
      const user = await User.findByIdAndUpdate(userId, { avatar: avatarPath }, { new: true }).select('-password');
      return res.json({ success: true, user, avatar: avatarPath });
    }

    // memory users
    const idx = memoryUsers.findIndex(u => u._id && u._id.toString() === userId.toString());
    if (idx !== -1) {
      memoryUsers[idx].avatar = avatarPath;
      const user = { ...memoryUsers[idx] };
      delete user.password;
      return res.json({ success: true, user, avatar: avatarPath });
    }

    return res.status(404).json({ error: 'User not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});