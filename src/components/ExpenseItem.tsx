'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import ExpenseDetailsModal from './ExpenseDetailsModal';
import { Session } from 'next-auth';
import type { Expense, CategoryConfig } from '@/types';
import { CATEGORIES } from '@/types';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';

interface ExpenseItemProps {
  expense: Expense;
  session: Session | null;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ExpenseItem({ expense, session, onEdit, onDelete }: ExpenseItemProps) {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const isCreator = expense.payerId._id === session?.user.id;
  const userSplit = expense.splits.find(split => split.userId === session?.user.id);
  const isSettled = userSplit?.settled || false;

  const categoryConfig = expense.type === 'solo' && expense.category 
    ? CATEGORIES.find(cat => cat.value === expense.category)
    : null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{expense.description}</h3>
            <div className="flex items-center gap-2 mt-1">
              {categoryConfig && (
                <span className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm
                  ${categoryConfig.color.light} ${categoryConfig.color.dark}
                `}>
                  <span>{categoryConfig.icon}</span>
                  <span>{categoryConfig.label}</span>
                </span>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {expense.payerId.name} paid • {new Date(expense.date).toLocaleDateString()}
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