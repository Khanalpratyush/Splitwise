import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  image?: string;
  friends: mongoose.Types.ObjectId[] | IUser[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserModel = mongoose.Model<IUser, object, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  image: String,
  friends: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

userSchema.method('comparePassword', async function(candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
});

export const User = mongoose.models.User || mongoose.model<IUser, UserModel>('User', userSchema); 