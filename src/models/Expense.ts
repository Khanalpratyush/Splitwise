import mongoose, { Schema, model, models } from 'mongoose';
import type { ExpenseLabel } from '@/types';

const EXPENSE_LABELS = [
  'food',
  'travel',
  'shopping',
  'utilities',
  'rent',
  'entertainment',
  'groceries',
  'other'
] as const;

const ExpenseSchema = new Schema({
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  date: {
    type: Date,
    default: Date.now
  },
  payerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  type: {
    type: String,
    enum: ['split', 'solo', 'settlement'],
    default: 'split'
  },
  label: {
    type: String,
    enum: EXPENSE_LABELS,
    default: 'other'
  },
  splits: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    settled: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Indexes
ExpenseSchema.index({ payerId: 1 });
ExpenseSchema.index({ groupId: 1 });
ExpenseSchema.index({ date: -1 });

// Clear existing model if it exists in development
if (process.env.NODE_ENV === 'development' && models.Expense) {
  delete models.Expense;
}

const Expense = models.Expense || model('Expense', ExpenseSchema);

export { Expense }; 