import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['word', 'excel', 'ppt', 'whiteboard'],
      default: 'word'
    },
    ownerId: { type: String, required: true },
    ownerName: { type: String, required: true },
    chatId: { type: String, default: null, index: true },
    scope: { type: String, enum: ['direct', 'group', 'personal'], default: 'direct' },
    members: [{ type: String }],
    data: { type: Object, default: {} },
    isPublic: { type: Boolean, default: false }
  },
  { timestamps: true }
);

documentSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.createdAt = ret.createdAt?.toISOString();
    ret.updatedAt = ret.updatedAt?.toISOString();
    delete ret.__v;
    return ret;
  }
});

export const Document = mongoose.models.Document || mongoose.model('Document', documentSchema);
