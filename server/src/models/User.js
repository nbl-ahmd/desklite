const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true
  },
  // Shop details
  shopName: {
    type: String,
    trim: true
  },
  shopType: {
    type: String,
    enum: ['grocery', 'kirana', 'bakery', 'textiles', 'hardware', 'electronics', 'wholesale', 'retail', 'barber', 'salon', 'medical', 'stationery', 'other'],
    default: 'other'
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  // UPI Settings for payment reminders
  upiId: {
    type: String,
    trim: true
  },
  upiName: {
    type: String,
    trim: true
  },
  // Preferences
  language: {
    type: String,
    enum: ['en', 'ml'],
    default: 'en'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema); 