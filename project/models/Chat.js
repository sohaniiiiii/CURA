import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    // Phase: persistent history — structured response metadata shown in the UI
    // (confidence / sources / explanation / emergency). Optional; assistant messages only.
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined
    }
  }],
  title: {
    type: String,
    default: 'New Chat'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ sessionId: 1 });

export default mongoose.model('Chat', chatSchema);
