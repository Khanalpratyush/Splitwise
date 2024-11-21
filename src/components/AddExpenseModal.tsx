'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { User, Group, ExpenseCategory } from '@/types';
import logger from '@/utils/logger';
import { useSession } from 'next-auth/react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: User[];
  groups: Group[];
  onExpenseAdded: () => void;
}

const VALID_CATEGORIES: ExpenseCategory[] = ['food', 'transport', 'shopping', 'entertainment', 'utilities', 'rent', 'health', 'travel', 'education', 'other'];

const FriendCheckbox = ({ friend, selected, onToggle }: { 
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

export default function AddExpenseModal({
  isOpen,
  onClose,
  friends,
  groups,
  onExpenseAdded
}: AddExpenseModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [expenseType, setExpenseType] = useState<'split' | 'solo'>('split');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<User[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'exact'>('equal');
  const [splits, setSplits] = useState<{ userId: string; amount: number; percentage: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add current user to the friends list for splitting
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

  // Update friend selection handler
  const toggleFriend = (friend: User) => {
    setSelectedFriends(prev => {
      const isSelected = prev.some(f => f._id === friend._id);
      if (isSelected) {
        return prev.filter(f => f._id !== friend._id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const calculateSplits = useCallback(() => {
    if (splitType === 'equal') {
      const splitAmount = amount / (selectedFriends.length + 1);
      setSplits(selectedFriends.map(friend => ({
        userId: friend._id,
        amount: splitAmount,
      })));
    }
  }, [amount, selectedFriends, splitType, splits]);

  useEffect(() => {
    if (splitType === 'equal' || splitType === 'percentage') {
      calculateSplits();
    }
  }, [splitType, selectedFriends.length, calculateSplits]);

  const clearForm = useCallback(() => {
    setDescription('');
    setAmount('');
    setCategory('other');
    setExpenseType('split');
    setSelectedGroupId('');
    setSelectedFriends([]);
    setSplitType('equal');
    setSplits([]);
    setError(null);
  }, []);

  const validateSplits = useCallback((): boolean => {
    if (!amount || selectedFriends.length === 0) return true;
    
    const totalAmount = parseFloat(amount);
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
  }, [amount, selectedFriends.length, splits, splitType]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!description || !amount) {
        throw new Error('Please fill in all required fields');
      }

      if (expenseType === 'split' && selectedFriends.length === 0) {
        throw new Error('Please select at least one friend to split with');
      }

      // Validate splits
      if (expenseType === 'split' && !validateSplits()) {
        setIsSubmitting(false);
        return;
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description,
          amount: parseFloat(amount),
          category: category,
          type: expenseType,
          date: new Date().toISOString().split('T')[0],
          groupId: selectedGroupId || null,
          splits: expenseType === 'split' ? splits.map(split => ({
            userId: split.userId,
            amount: split.amount,
            percentage: split.percentage,
            settled: false
          })) : []
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add expense');
      }

      await onExpenseAdded();
      clearForm();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add expense';
      setError(message);
      logger.error('Error adding expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clear form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      clearForm();
    }
  }, [isOpen, clearForm]);

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    
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

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${isOpen ? '' : 'hidden'}`}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative w-full max-w-2xl transform rounded-lg bg-white dark:bg-gray-800 p-6 text-left shadow-xl transition-all">
          <div className="absolute right-4 top-4">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Add New Expense
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Expense Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                Expense Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="expenseType"
                    value="split"
                    checked={expenseType === 'split'}
                    onChange={() => setExpenseType('split')}
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

            {/* Basic Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="What's this expense for?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-900 dark:text-gray-200">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border dark:border-gray-600 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Split Options */}
            {expenseType === 'split' && (
              <>
                {/* Group Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                    Group (Optional)
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a group</option>
                    {groups.map((group) => (
                      <option key={group._id} value={group._id}>{group.name}</option>
                    ))}
                  </select>
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

                {selectedFriends.length > 0 && (
                  <>
                    {/* Split Type Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
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

                    {/* Split Preview Section */}
                    <div className="space-y-3">
                      {/* Your share - only show if current user is included */}
                      {selectedFriends.some(f => f._id === 'currentUser') && (
                        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-medium">
                              Y
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">Your share</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                              ${(parseFloat(amount) / selectedFriends.length).toFixed(2)}
                            </span>
                            <span className="text-emerald-700 dark:text-emerald-300">
                              ({(100 / selectedFriends.length).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Friends' shares */}
                      {selectedFriends.map((friend) => {
                        if (friend._id === 'currentUser') return null; // Skip current user as it's already shown above
                        const split = splits.find(s => s.userId === friend._id);

                        return (
                          <div key={friend._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium">
                                {friend.name
                                  ?.split(' ')
                                  .map(n => n[0])
                                  .join('') || '?'}
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">{friend.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              {splitType === 'percentage' ? (
                                <input
                                  type="number"
                                  value={split?.percentage || 0}
                                  onChange={(e) => {
                                    const newPercentage = parseFloat(e.target.value);
                                    const newSplits = splits.map(s => 
                                      s.userId === friend._id 
                                        ? { ...s, percentage: newPercentage, amount: (parseFloat(amount) * newPercentage) / 100 }
                                        : s
                                    );
                                    setSplits(newSplits);
                                  }}
                                  step="1"
                                  min="0"
                                  max="100"
                                  className="w-20 border dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              ) : splitType === 'exact' ? (
                                <input
                                  type="number"
                                  value={split?.amount || 0}
                                  onChange={(e) => {
                                    const newAmount = parseFloat(e.target.value);
                                    const totalAmount = parseFloat(amount);
                                    const newSplits = splits.map(s => 
                                      s.userId === friend._id 
                                        ? { ...s, amount: newAmount, percentage: (newAmount / totalAmount) * 100 }
                                        : s
                                    );
                                    setSplits(newSplits);
                                  }}
                                  step="0.01"
                                  min="0"
                                  className="w-24 border dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              ) : (
                                <span className="font-medium text-gray-900 dark:text-white">
                                  ${(split?.amount || 0).toFixed(2)}
                                </span>
                              )}
                              <span className="text-gray-500 dark:text-gray-400">
                                ({(split?.percentage || 0).toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {VALID_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border dark:border-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 