import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['direct', 'group'], default: 'direct' },
    name: { type: String, trim: true },
    icon: { type: String, default: '👥' },
    members: [{ type: String, required: true }],
    adminId: { type: String },
    lastMessage: {
      text: { type: String, default: '' },
      senderId: { type: String },
      createdAt: { type: Date, default: Date.now }
    },
    activeMeeting: { type: Object, default: null }
  },
  { timestamps: true }
);

chatSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  }
});

export const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema);
