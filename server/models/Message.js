import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    chatId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderAvatar: { type: String },
    type: { type: String, default: 'text' },
    callData: { type: Object, default: null },
    content: { type: String, default: '' },
    attachment: { type: Object, default: null },
    reactions: { type: Map, of: [String], default: {} },
    readBy: [{ type: String }],
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' }
  },
  { timestamps: true }
);

messageSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.createdAt = ret.createdAt?.toISOString ? ret.createdAt.toISOString() : ret.createdAt;
    delete ret.__v;
    return ret;
  }
});

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
