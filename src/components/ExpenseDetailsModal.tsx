'use client';

import { X } from 'lucide-react';
import { format } from 'date-fns';
import type { Expense } from '@/types';

interface ExpenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense;
  currentUserId: string;
}

export default function ExpenseDetailsModal({
  isOpen,
  onClose,
  expense,
  currentUserId
}: ExpenseDetailsModalProps) {
  if (!isOpen) return null;

  const isCreator = expense.payerId._id === currentUserId;
  const userSplit = expense.splits.find(split => split.userId._id === currentUserId);
  const totalAmount = expense.amount;
  const creatorShare = totalAmount - expense.splits.reduce((acc, split) => acc + split.amount, 0);

  // Helper function to get initials safely
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative w-full max-w-2xl transform rounded-lg bg-white dark:bg-gray-800 p-6 text-left shadow-xl transition-all">
          <div className="absolute right-4 top-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {expense.description}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Added on {format(new Date(expense.createdAt), 'MMM d, yyyy')}
            </p>
          </div>

          <div className="space-y-6">
            {/* Basic Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  ${totalAmount.toFixed(2)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {expense.category}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {expense.type}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Group</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {expense.groupId?.name || 'No Group'}
                </p>
              </div>
            </div>

            {/* Split Details */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Split Details</h3>
              <div className="space-y-3">
                {/* Payer's share */}
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        {getInitials(expense.payerId?.name)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {expense.payerId?.name || 'Unknown'} {isCreator ? '(You)' : ''} 
                        <span className="text-emerald-600 dark:text-emerald-400">(Paid)</span>
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {expense.payerId?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    ${creatorShare.toFixed(2)}
                  </p>
                </div>

                {/* Other participants */}
                {expense.splits.map((split) => (
                  <div 
                    key={split.userId._id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {getInitials(split.userId?.name)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {split.userId?.name || 'Unknown'} {split.userId._id === currentUserId ? '(You)' : ''}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {split.userId?.email || 'No email'}
                        </p>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      ${split.amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 