'use client';

import { useState, useEffect } from 'react';
import { X, Upload, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Papa from 'papaparse';
import { User, Group, ExpenseCategory, ExpenseType, CATEGORIES } from '@/types';
import logger from '@/utils/logger';

interface ExpenseCSVImportProps {
  isOpen: boolean;
  onClose: () => void;
  friends: User[];
  groups: Group[];
  onExpenseAdded: () => void;
}

interface CSVExpense {
  description: string;
  amount: string;
  type: ExpenseType;
  category?: ExpenseCategory;
  splitWith?: string; // Comma-separated emails
  date?: string;
}

const csvTemplate = `description,amount,type,category,splitWith,date
Dinner with friends,50.00,split,,friend1@email.com;friend2@email.com,2024-03-20
Groceries,30.00,solo,food,,2024-03-21
Movie night,25.00,split,,friend1@email.com,2024-03-22`;

export default function ExpenseCSVImport({
  isOpen,
  onClose,
  friends,
  groups,
  onExpenseAdded
}: ExpenseCSVImportProps) {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [expenses, setExpenses] = useState<CSVExpense[]>([]);
  const [currentExpenseIndex, setCurrentExpenseIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setStep('upload');
      setExpenses([]);
      setCurrentExpenseIndex(0);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const currentExpense = expenses[currentExpenseIndex];
  const totalExpenses = expenses.length;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedExpenses = results.data.map((expense: any) => {
            // Find description field (case insensitive)
            const descriptionKey = Object.keys(expense).find(
              key => key.toLowerCase().includes('description')
            );
            const description = descriptionKey 
              ? expense[descriptionKey]?.toString().trim()
              : '';

            if (!description) {
              throw new Error('Description field is missing or empty');
            }

            // Find amount field (case insensitive)
            const amountKey = Object.keys(expense).find(
              key => key.toLowerCase().includes('amount')
            );
            const rawAmount = amountKey
              ? expense[amountKey]?.toString().replace(/[^0-9.-]/g, '')
              : '0';
            const amount = Math.abs(parseFloat(rawAmount || '0'));

            if (isNaN(amount) || amount === 0) {
              throw new Error('Valid amount is required');
            }

            // Find date field (case insensitive, multiple possible names)
            const dateKey = Object.keys(expense).find(
              key => key.toLowerCase().includes('date') || 
                    key.toLowerCase().includes('transaction') ||
                    key.toLowerCase().includes('time')
            );
            let date: string;
            try {
              date = dateKey && expense[dateKey]
                ? new Date(expense[dateKey]).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            } catch {
              date = new Date().toISOString().split('T')[0];
            }

            // Find type field (case insensitive)
            const typeKey = Object.keys(expense).find(
              key => key.toLowerCase().includes('type')
            );
            const type = typeKey && expense[typeKey]?.toString().toLowerCase().includes('solo')
              ? 'solo'
              : 'split';

            // Find category field (case insensitive)
            const categoryKey = Object.keys(expense).find(
              key => key.toLowerCase().includes('category')
            );
            const category = categoryKey
              ? expense[categoryKey]?.toString().toLowerCase().trim()
              : 'other';

            // Find splitWith field (case insensitive)
            const splitWithKey = Object.keys(expense).find(
              key => key.toLowerCase().includes('split') || 
                    key.toLowerCase().includes('with') ||
                    key.toLowerCase().includes('share')
            );
            const splitWith = type === 'split' && splitWithKey && expense[splitWithKey]
              ? expense[splitWithKey]
                  .toString()
                  .split(/[,;]/)
                  .map((email: string) => email.trim().toLowerCase())
                  .filter(Boolean)
                  .join(';')
              : '';

            return {
              description,
              amount: amount.toFixed(2),
              type,
              category,
              splitWith,
              date
            } as CSVExpense;
          });
          
          if (parsedExpenses.length === 0) {
            throw new Error('No valid expenses found in CSV');
          }

          setExpenses(parsedExpenses);
          setStep('review');
          setCurrentExpenseIndex(0);
          
          // Reset file input
          event.target.value = '';
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to parse CSV file');
          logger.error('CSV parse error:', error);
        }
      },
      error: (error) => {
        setError(`Failed to parse CSV file: ${error.message}`);
        logger.error('CSV parse error:', error);
      }
    });
  };

  const handleExpenseUpdate = (field: keyof CSVExpense, value: any) => {
    setExpenses(prevExpenses => {
      const updatedExpenses = [...prevExpenses];
      updatedExpenses[currentExpenseIndex] = {
        ...updatedExpenses[currentExpenseIndex],
        [field]: value
      };
      return updatedExpenses;
    });
  };

  const handleNext = () => {
    if (currentExpenseIndex < expenses.length - 1) {
      setCurrentExpenseIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentExpenseIndex > 0) {
      setCurrentExpenseIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!currentExpense) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: currentExpense.description,
          amount: parseFloat(currentExpense.amount),
          type: currentExpense.type,
          category: currentExpense.category,
          splitWith: currentExpense.splitWith?.split(';').filter(Boolean) || [],
          date: currentExpense.date || new Date().toISOString().split('T')[0]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create expense');
      }

      if (currentExpenseIndex === expenses.length - 1) {
        onExpenseAdded();
        onClose();
      } else {
        handleNext();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import expense');
      logger.error('Error importing expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          id="csv-upload"
        />
        <label
          htmlFor="csv-upload"
          className="cursor-pointer inline-flex flex-col items-center"
        >
          <Upload className="h-8 w-8 text-gray-400 mb-2" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Click to upload CSV file
          </span>
        </label>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400">
        <p className="font-medium mb-1">CSV Format:</p>
        <pre className="bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
          {csvTemplate}
        </pre>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    if (!currentExpense) return null;

    // Find matching friends for splitWith emails
    const selectedFriends = currentExpense.splitWith
      ? friends.filter(friend => 
          currentExpense.splitWith?.split(';').includes(friend.email.toLowerCase())
        )
      : [];

    // Calculate split amount
    const splitAmount = selectedFriends.length > 0
      ? parseFloat(currentExpense.amount) / (selectedFriends.length + 1)
      : parseFloat(currentExpense.amount);

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Review Expense {currentExpenseIndex + 1} of {totalExpenses}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentExpenseIndex === 0}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentExpenseIndex === totalExpenses - 1}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
              Description
            </label>
            <input
              type="text"
              value={currentExpense.description}
              onChange={(e) => handleExpenseUpdate('description', e.target.value)}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="What's this expense for?"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-900 dark:text-gray-200">$</span>
              <input
                type="number"
                value={currentExpense.amount}
                onChange={(e) => handleExpenseUpdate('amount', e.target.value)}
                className="w-full border dark:border-gray-600 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="solo"
                    checked={currentExpense.type === 'solo'}
                    onChange={(e) => handleExpenseUpdate('type', e.target.value as ExpenseType)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
                  />
                  <span className="ml-2 text-gray-900 dark:text-gray-200">Solo</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="split"
                    checked={currentExpense.type === 'split'}
                    onChange={(e) => handleExpenseUpdate('type', e.target.value as ExpenseType)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
                  />
                  <span className="ml-2 text-gray-900 dark:text-gray-200">Split</span>
                </label>
              </div>
            </div>
          </div>

          {/* Split With - Only for split expenses */}
          {currentExpense.type === 'split' && (
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                Split With
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {friends.map(friend => (
                  <label
                    key={friend._id}
                    className={`
                      flex items-center p-3 rounded-lg border transition-colors cursor-pointer
                      ${selectedFriends.some(f => f._id === friend._id)
                        ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFriends.some(f => f._id === friend._id)}
                      onChange={(e) => {
                        const currentSplitWith = currentExpense.splitWith?.split(';') || [];
                        const newSplitWith = e.target.checked
                          ? [...currentSplitWith, friend.email.toLowerCase()]
                          : currentSplitWith.filter(email => email !== friend.email.toLowerCase());
                        handleExpenseUpdate('splitWith', newSplitWith.join(';'));
                      }}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{friend.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{friend.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Split Preview - Only show when friends are selected */}
          {currentExpense.type === 'split' && selectedFriends.length > 0 && (
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                Split Preview
              </label>
              <div className="space-y-2">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">Your share</span>
                    <span className="text-emerald-700 dark:text-emerald-300">${splitAmount.toFixed(2)}</span>
                  </div>
                </div>
                {selectedFriends.map(friend => (
                  <div key={friend._id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900 dark:text-white">{friend.name}</span>
                      <span className="text-gray-700 dark:text-gray-300">${splitAmount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category - Only for solo expenses */}
          {currentExpense.type === 'solo' && (
            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {CATEGORIES.map(category => (
                  <button
                    key={category.value}
                    onClick={() => handleExpenseUpdate('category', category.value)}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors
                      ${currentExpense.category === category.value
                        ? `${category.color.bg} ${category.color.border} ${category.color.text}`
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                    <span>{category.icon}</span>
                    <span className="text-sm">{category.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date */}
          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
              Date
            </label>
            <input
              type="date"
              value={currentExpense.date}
              onChange={(e) => handleExpenseUpdate('date', e.target.value)}
              className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Saving...' : `Save Expense ${currentExpenseIndex + 1} of ${totalExpenses}`}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {step === 'upload' ? 'Import Expenses from CSV' : 'Review Expenses'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          {step === 'upload' ? renderUploadStep() : renderReviewStep()}
        </div>
      </div>
    </div>
  );
} 