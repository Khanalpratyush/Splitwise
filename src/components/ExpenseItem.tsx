'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import ExpenseDetailsModal from './ExpenseDetailsModal';
import { Session } from 'next-auth';
import type { Expense } from '@/types';
import { CheckCircle } from 'lucide-react';
import logger from '@/utils/logger';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';

interface ExpenseItemProps {
  expense: Expense;
  session: Session | null;
  onEdit: () => void;
  onDelete: () => void;
}

interface UserId {
  _id: string;
  name: string;
}

export default function ExpenseItem({ expense, session, onEdit, onDelete }: ExpenseItemProps) {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const isCreator = expense.payerId._id === session?.user.id;
  const userSplit = expense.splits.find(split => split.userId === session?.user.id);
  const [_isSettled, setIsSettled] = useState(userSplit?.settled || false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  const getUserName = (userId: string | UserId): string => {
    if (!userId) return 'Unknown';
    if (typeof userId === 'string') return 'Unknown';
    return userId.name || 'Unknown';
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{expense.description}</h3>
            <div className="flex items-center gap-2 mt-1">
              {/* CategoryConfig is not used */}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getUserName(expense.payerId)} paid • {new Date(expense.date).toLocaleDateString()}
              </p>
            </div>
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            ${expense.amount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              {expense.groupId?.name || (expense.type === 'solo' ? 'Personal' : 'Shared')}
            </span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isCreator ? 'You paid' : `You owe $${userSplit?.amount.toFixed(2) || '0.00'}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isCreator && (
              <>
                <button 
                  onClick={onEdit}
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
                >
                  Edit
                </button>
                <button 
                  onClick={() => setShowDeleteConfirmation(true)}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                >
                  Delete
                </button>
              </>
            )}
            <button 
              onClick={() => setIsDetailsModalOpen(true)}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            >
              View Details
            </button>
          </div>
        </div>
      </div>

      <DeleteConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      <ExpenseDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        expense={expense}
        currentUserId={session?.user.id}
      />
    </>
  );
} 