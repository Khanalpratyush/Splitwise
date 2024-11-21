'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Upload, AlertCircle, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { User, Group, ExpenseCategory, ExpenseType } from '@/types';
import logger from '@/utils/logger';
import { useSession } from 'next-auth/react';

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
  category?: string;
  splitWith?: string;
  date?: string;
}

interface ValidationError {
  row: number;
  errors: string[];
}

const _VALID_TYPES: ExpenseType[] = ['split', 'solo'];

const _FriendCheckbox = ({ friend, selected, onToggle }: { 
  friend: User; 
  selected: boolean; 
  onToggle: (friend: User) => void;
}) => {
  const initials = friend.name
    ?.split(' ')
    .map(n => n[0])
    .join('') || '?';

  return (
    <div 
      onClick={() => onToggle(friend)}
      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
        ${selected 
          ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' 
          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-medium
          ${selected 
            ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          {initials}
        </div>
        <span className="font-medium text-gray-900 dark:text-white">{friend.name}</span>
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(friend)}
          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 rounded"
        />
      </div>
    </div>
  );
};

interface ParsedData {
  data: Record<string, string>[];
  errors: Papa.ParseError[];
}

export default function ExpenseCSVImport({
  isOpen,
  onClose,
  friends,
  groups,
  onExpenseAdded
}: ExpenseCSVImportProps) {
  const [step, setStep] = useState(0);
  const [expenses, setExpenses] = useState<CSVExpense[]>([]);
  const [currentExpenseIndex, setCurrentExpenseIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedExpense, setEditedExpense] = useState<CSVExpense>({
    description: '',
    amount: '',
    category: 'other',
    type: 'split',
    splitWith: '',
    group: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [selectedFriends, setSelectedFriends] = useState<User[]>([]);
  const [expenseType, setExpenseType] = useState<'split' | 'solo'>('split');
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'exact'>('equal');
  const [splits, setSplits] = useState<{ userId: string; amount: number; percentage: number }[]>([]);
  const [_showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const currentExpense = expenses[currentExpenseIndex];

  const { data: session } = useSession();
  const allParticipants = [
    {
      _id: session?.user?.id || '',
      name: 'You',
      email: '',
      isCurrentUser: true
    },
    ...friends
  ];

  useEffect(() => {
    if (currentExpense) {
      const newExpenseType = currentExpense.type || 'split';
      const newEditedExpense = {
        description: currentExpense.description || '',
        amount: currentExpense.amount || '',
        category: currentExpense.category || 'other',
        type: newExpenseType,
        splitWith: currentExpense.splitWith || '',
        group: currentExpense.group || '',
        date: currentExpense.date || new Date().toISOString().split('T')[0]
      };

      const emails = currentExpense.splitWith?.split(',').map(e => e.trim()) || [];
      const newSelectedFriends = friends.filter(f => emails.includes(f.email.toLowerCase()));

      // Batch state updates
      setExpenseType(newExpenseType);
      setEditedExpense(newEditedExpense);
      setSelectedFriends(newSelectedFriends);

      // Calculate splits only if we have friends and an amount
      if (newSelectedFriends.length > 0 && newEditedExpense.amount) {
        const amount = parseFloat(newEditedExpense.amount);
        if (!isNaN(amount)) {
          const equalShare = amount / (newSelectedFriends.length + 1);
          const equalPercentage = 100 / (newSelectedFriends.length + 1);
          setSplits(newSelectedFriends.map(friend => ({
            userId: friend._id,
            amount: equalShare,
            percentage: equalPercentage
          })));
        }
      } else {
        setSplits([]);
      }
    }
  }, [currentExpense, friends]);

  const calculateSplits = useCallback(() => {
    if (!editedExpense.amount || selectedFriends.length === 0) return;

    const totalAmount = parseFloat(editedExpense.amount);
    if (isNaN(totalAmount)) return;

    const numPeople = selectedFriends.length;

    switch (splitType) {
      case 'equal':
        const equalShare = totalAmount / numPeople;
        setSplits(selectedFriends.map(friend => ({
          userId: friend._id,
          amount: equalShare,
          percentage: 100 / numPeople
        })));
        break;

      case 'percentage':
        const defaultPercentage = 100 / numPeople;
        setSplits(selectedFriends.map(friend => ({
          userId: friend._id,
          amount: (totalAmount * defaultPercentage) / 100,
          percentage: defaultPercentage
        })));
        break;

      case 'exact':
        // Keep existing amounts or set to equal share
        setSplits(selectedFriends.map(friend => {
          const existingSplit = splits.find(s => s.userId === friend._id);
          return existingSplit || {
            userId: friend._id,
            amount: totalAmount / numPeople,
            percentage: 100 / numPeople
          };
        }));
        break;
    }
  }, [amount, selectedFriends, splitType, splits]);

  useEffect(() => {
    if (splitType === 'equal' || splitType === 'percentage') {
      calculateSplits();
    }
  }, [splitType, amount, selectedFriends.length, calculateSplits]);

  const validateExpense = (expense: CSVExpense, rowIndex: number): ValidationError | null => {
    const errors: string[] = [];

    // Only validate required fields: description and amount
    if (!expense.description?.trim()) {
      errors.push('Description is required');
    }

    if (!expense.amount) {
      errors.push('Amount is required');
    } else {
      const amount = parseFloat(expense.amount);
      if (isNaN(amount)) {
        errors.push('Amount must be a valid number');
      }
    }

    return errors.length > 0 ? { row: rowIndex + 1, errors } : null;
  };

  const handleFileUpload = (data: ParsedData) => {
    const { data: parsedData, errors } = data;

    if (errors.length > 0) {
      setError('Error parsing CSV file: ' + errors.map(e => e.message).join(', '));
      return;
    }

    const validationErrors: ValidationError[] = [];
    const validExpenses: CSVExpense[] = [];

    parsedData.forEach((row: any, index: number) => {
      const normalizedRow = Object.keys(row).reduce((acc: any, key) => {
        acc[key.toLowerCase()] = row[key];
        return acc;
      }, {});

      // Parse and validate the date
      let expenseDate = new Date().toISOString().split('T')[0]; // Default to today
      if (normalizedRow.date) {
        const parsedDate = new Date(normalizedRow.date);
        if (!isNaN(parsedDate.getTime())) {
          expenseDate = parsedDate.toISOString().split('T')[0];
        }
      }

      // Only process required fields, set defaults for others
      const expense: CSVExpense = {
        description: normalizedRow.description?.trim() || '',
        amount: normalizedRow.amount?.toString().trim() || '',
        category: 'other', // Default category
        type: 'split',    // Default type
        splitWith: '',    // Empty by default
        group: '',        // Empty by default
        date: expenseDate // Use parsed date or default
      };

      const validationError = validateExpense(expense, index);
      if (validationError) {
        validationErrors.push(validationError);
      } else {
        validExpenses.push(expense);
      }
    });

    if (validationErrors.length > 0) {
      setValidationErrors(validationErrors);
      setError('Some expenses contain errors. Please check the details below.');
      return;
    }

    if (validExpenses.length === 0) {
      setError('No valid expenses found in the CSV file');
      return;
    }

    logger.debug('Parsed expenses:', validExpenses);
    setExpenses(validExpenses);
    setStep(1);
  };

  const validateSplits = (splits: SplitData[]) => {
    if (!editedExpense.amount || selectedFriends.length === 0) return true;
    
    const totalAmount = parseFloat(editedExpense.amount);
    if (isNaN(totalAmount)) return true;

    const splitSum = splits.reduce((sum, split) => sum + split.amount, 0);
    const numPeople = selectedFriends.length;
    const equalShare = Math.round((totalAmount / numPeople) * 100) / 100;
    
    // For equal splits, verify each split is equal
    if (splitType === 'equal') {
      const isValid = splits.every(split => Math.abs(split.amount - equalShare) < 0.01);
      if (!isValid) {
        setError('Split amounts must be equal');
        return false;
      }
      return true;
    }

    // For other split types, verify total equals expense amount
    const epsilon = 0.01;
    if (Math.abs(splitSum - totalAmount) > epsilon) {
      setError(`Split amounts must equal ${totalAmount.toFixed(2)}`);
      return false;
    }

    if (splitType === 'percentage') {
      const percentageSum = splits.reduce((sum, split) => sum + (split.percentage || 0), 0);
      if (Math.abs(percentageSum - 100) > epsilon) {
        setError('Percentages must add up to 100%');
        return false;
      }
    }

    setError(null);
    return true;
  };

  const resetForm = () => {
    setEditedExpense({
      description: '',
      amount: '',
      category: 'other',
      type: 'split',
      splitWith: '',
      group: '',
      date: new Date().toISOString().split('T')[0]
    });
    setSelectedFriends([]);
    setSplits([]);
    setExpenseType('split');
    setSplitType('equal');
    setError(null);
  };

  const handleExpenseSubmit = async (_expense: CSVExpense) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!editedExpense.description?.trim()) {
        throw new Error('Description is required');
      }

      if (!editedExpense.amount || isNaN(parseFloat(editedExpense.amount))) {
        throw new Error('Valid amount is required');
      }

      // For split expenses, validate splits
      if (expenseType === 'split') {
        if (selectedFriends.length === 0) {
          throw new Error('Please select at least one person to split with');
        }

        if (splitType === 'exact') {
          const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0);
          const totalAmount = parseFloat(editedExpense.amount);
          if (Math.abs(totalSplitAmount - totalAmount) > 0.01) {
            throw new Error(`Split amounts must equal ${totalAmount.toFixed(2)}`);
          }
        }
      }

      // Prepare the expense data
      const expenseData = {
        ...editedExpense,
        amount: parseFloat(editedExpense.amount),
        type: expenseType,
        splitWith: selectedFriends.map(f => f._id).join(','),
        splits: expenseType === 'split' ? splits : []
      };

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create expense');
      }

      // Move to next expense or complete
      if (currentExpenseIndex < expenses.length - 1) {
        setCurrentExpenseIndex(prev => prev + 1);
        resetForm();
      } else {
        setStep(2);
        onExpenseAdded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      logger.error('Error creating expense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearImport = () => {
    setExpenses([]);
    setCurrentExpenseIndex(0);
    setError(null);
    setValidationErrors([]);
    setEditedExpense({
      description: '',
      amount: '',
      category: 'other',
      type: 'split',
      splitWith: '',
      group: '',
      date: new Date().toISOString().split('T')[0]
    });
    setSelectedFriends([]);
    setExpenseType('split');
    setSplitType('equal');
    setSplits([]);
    setStep(0);
    
    // Clear the file input
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const toggleFriend = useCallback((friend: User) => {
    setSelectedFriends(prev => {
      const isSelected = prev.some(f => f._id === friend._id);
      const newSelection = isSelected
        ? prev.filter(f => f._id !== friend._id)
        : [...prev, friend];
      
      // Recalculate splits after friend selection changes
      setTimeout(() => calculateSplits(), 0);
      return newSelection;
    });
  }, []);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteConfirmation(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Add a function to clear the current CSV data
  const clearCSVData = () => {
    setExpenses([]);
    setCurrentExpenseIndex(0);
    setEditedExpense({
      description: '',
      amount: '',
      category: 'other',
      type: 'split',
      splitWith: '',
      group: '',
      date: new Date().toISOString().split('T')[0]
    });
    setSelectedFriends([]);
    setSplits([]);
    setStep(0);
    setError(null);
    setValidationErrors([]);
  };

  // Update the group selection handler
  const handleGroupChange = (groupId: string) => {
    setEditedExpense(prev => ({ ...prev, group: groupId }));
    
    if (groupId) {
      const selectedGroup = groups.find(g => g._id === groupId);
      if (selectedGroup) {
        const groupMembers = friends.filter(friend => 
          selectedGroup.members.includes(friend._id)
        );
        setSelectedFriends(groupMembers);
        setTimeout(() => calculateSplits(), 0);
      }
    } else {
      setSelectedFriends([]);
      setSplits([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/30 dark:bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="absolute right-4 top-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {step === 0 ? 'Import Expenses' : step === 1 ? 'Review Expenses' : 'Import Complete'}
            </h2>
          </div>

          {step === 0 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <Upload className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Click to upload CSV
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    or drag and drop
                  </span>
                </label>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Error uploading file</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {validationErrors.length > 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg">
                  <p className="font-medium">Validation Errors</p>
                  <ul className="mt-2 text-sm space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>
                        Row {error.row}: {error.errors.join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Review Expense {currentExpenseIndex + 1} of {expenses.length}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentExpenseIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentExpenseIndex === 0}
                    className="p-2 text-gray-400 hover:text-gray-500 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setCurrentExpenseIndex(prev => Math.min(expenses.length - 1, prev + 1))}
                    disabled={currentExpenseIndex === expenses.length - 1}
                    className="p-2 text-gray-400 hover:text-gray-500 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleExpenseSubmit(editedExpense);
              }} className="space-y-4">
                {/* Expense Type Selection - Moved to top */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Expense Type
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="expenseType"
                        value="split"
                        checked={expenseType === 'split'}
                        onChange={() => {
                          setExpenseType('split');
                          setEditedExpense(prev => ({ ...prev, type: 'split' }));
                        }}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
                      />
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        Split with others
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="expenseType"
                        value="solo"
                        checked={expenseType === 'solo'}
                        onChange={() => {
                          setExpenseType('solo');
                          setEditedExpense(prev => ({ ...prev, type: 'solo' }));
                          setSelectedFriends([]);
                          setSplits([]);
                        }}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
                      />
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        Personal expense
                      </span>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <input
                    type="text"
                    required
                    value={editedExpense.description}
                    onChange={(e) => setEditedExpense(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={editedExpense.amount}
                    onChange={(e) => {
                      setEditedExpense(prev => ({ ...prev, amount: e.target.value }));
                      calculateSplits();
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <select
                    value={editedExpense.category}
                    onChange={(e) => setEditedExpense(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700"
                  >
                    {VALID_CATEGORIES.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editedExpense.date}
                    onChange={(e) => setEditedExpense(prev => ({ ...prev, date: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700"
                  />
                </div>

                {/* Show split options only if expense type is split */}
                {expenseType === 'split' && (
                  <>
                    {/* Group Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Group (Optional)
                      </label>
                      <select
                        value={editedExpense.group || ''}
                        onChange={(e) => handleGroupChange(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700"
                      >
                        <option value="">No Group</option>
                        {groups.map(group => (
                          <option key={group._id} value={group._id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Split Type Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Split Type
                      </label>
                      <div className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="splitType"
                            value="equal"
                            checked={splitType === 'equal'}
                            onChange={() => setSplitType('equal')}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
                          />
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">
                            Equal Split
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="splitType"
                            value="percentage"
                            checked={splitType === 'percentage'}
                            onChange={() => setSplitType('percentage')}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
                          />
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">
                            Percentage Split
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="splitType"
                            value="exact"
                            checked={splitType === 'exact'}
                            onChange={() => setSplitType('exact')}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
                          />
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">
                            Exact Amounts
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Friends Selection with Checkboxes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Split With
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {allParticipants.map(friend => (
                          <div
                            key={friend._id}
                            onClick={() => toggleFriend(friend)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors
                              ${selectedFriends.some(f => f._id === friend._id)
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800'
                                : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-medium
                                ${selectedFriends.some(f => f._id === friend._id)
                                  ? 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {friend.isCurrentUser ? 'Y' : friend.name[0]}
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {friend.name}
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedFriends.some(f => f._id === friend._id)}
                              onChange={() => toggleFriend(friend)}
                              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Split Preview */}
                    {selectedFriends.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">Split Details</h4>
                        
                        {/* Your share - only show if current user is included */}
                        {selectedFriends.some(f => f._id === 'currentUser') && (
                          <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-medium">
                                Y
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">Your share</span>
                            </div>
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                              ${(parseFloat(editedExpense.amount) / selectedFriends.length).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* Other splits */}
                        {splits.map((split, index) => {
                          const friend = selectedFriends.find(f => f._id === split.userId);
                          if (!friend || friend._id === 'currentUser') return null;
                          return (
                            <div key={split.userId} className="flex items-center justify-between gap-4 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <span className="text-sm text-gray-600 dark:text-gray-400">{friend?.name}</span>
                              {splitType === 'exact' ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={split.amount}
                                  onChange={(e) => {
                                    const newSplits = [...splits];
                                    newSplits[index].amount = parseFloat(e.target.value) || 0;
                                    setSplits(newSplits);
                                  }}
                                  className="w-24 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700"
                                />
                              ) : (
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {split.amount.toFixed(2)} ({split.percentage.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={clearCSVData}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Import Complete
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                All expenses have been imported successfully
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 