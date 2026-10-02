import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  // Password reset (forgot-password flow). Only a SHA-256 hash of the
  // one-time token is stored; the raw token exists only in the reset link.
  resetPasswordTokenHash: {
    type: String,
    default: undefined,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    default: undefined,
    select: false
  }
}, {
  timestamps: true
});

// Additional indexes for better query performance
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });

export default mongoose.model('User', userSchema);
