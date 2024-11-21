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
  'transportation',
  'health',
  'education',
  'other'
] as const;

const ExpenseSchema = new Schema({
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
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
    ref: 'Group'
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
  }],
  type: {
    type: String,
    enum: ['solo', 'split'],
    default: 'solo'
  },
  image: String,
  label: {
    type: String,
    enum: EXPENSE_LABELS,
    required: true,
    default: 'other'
  }
}, {
  timestamps: true
});

// Add indexes
ExpenseSchema.index({ payerId: 1 });
ExpenseSchema.index({ 'splits.userId': 1 });
ExpenseSchema.index({ groupId: 1 });
ExpenseSchema.index({ date: -1 });

// Clear existing model if it exists in development
if (process.env.NODE_ENV === 'development' && models.Expense) {
  delete models.Expense;
}

const Expense = models.Expense || model('Expense', ExpenseSchema);

export { Expense }; 