import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String },
    color: { type: String, default: '#7059ea' },
    status: { type: String, default: 'online', enum: ['online', 'offline', 'away'] },
    bio: { type: String, default: 'Hey there! I am using SyncSpace.' }
  },
  { timestamps: true }
);

// Map _id to id in JSON output
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  }
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
