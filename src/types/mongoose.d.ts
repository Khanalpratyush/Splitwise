import { Document, Model } from 'mongoose';

declare global {
  type WithId<T> = T & { _id: string };
  interface MongooseDocument extends Document {
    _id: string;
  }
}

export interface UserDocument extends Document {
  name: string;
  email: string;
  password: string;
  image?: string;
  friends: UserDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupDocument extends Document {
  name: string;
  ownerId: UserDocument;
  members: UserDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseDocument extends Document {
  description: string;
  amount: number;
  date: Date;
  payerId: UserDocument;
  groupId?: GroupDocument;
  splits: {
    userId: UserDocument;
    amount: number;
  }[];
  type: 'solo' | 'split';
  createdAt: Date;
  updatedAt: Date;
} 