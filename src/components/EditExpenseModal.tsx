'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import logger from '@/utils/logger';

interface Friend {
  _id: string;
  name: string;
  email: string;
}

interface Group {
  _id: string;
  name: string;
}

interface Split {
  userId: string;
  amount: number;
  percentage?: number;
}

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: {
    _id: string;
    description: string;
    amount: number;
    groupId?: { _id: string; name: string };
    splits: Split[];
  };
  friends: Friend[];
  groups: Group[];
  onExpenseUpdated?: () => void;
}

type SplitType = 'equal' | 'exact' | 'percentage';

export default function EditExpenseModal({
  isOpen,
  onClose,
  expense,
  friends,
  groups,
  onExpenseUpdated
}: EditExpenseModalProps) {
  const { data: session } = useSession();
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [selectedGroupId, setSelectedGroupId] = useState(expense.groupId?._id || '');
  const [selectedFriends, setSelectedFriends] = useState<string[]>(expense.splits.map(split => split.userId));
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splits, setSplits] = useState<Split[]>(expense.splits);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (amount && selectedFriends.length > 0) {
      calculateSplits();
    }
  }, [amount, selectedFriends, splitType]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form to original expense values
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setSelectedGroupId(expense.groupId?._id || '');
      setSelectedFriends(expense.splits.map(split => split.userId));
      setSplits(expense.splits);
      setError(null);
    }
  }, [isOpen, expense]);

  if (!isOpen) return null;

  const calculateSplits = () => {
    const totalAmount = parseFloat(amount) || 0;
    const numPeople = selectedFriends.length + 1; // +1 for current user

    if (splitType === 'equal') {
      // Calculate equal split amount
      const equalAmount = Math.round((totalAmount / numPeople) * 100) / 100;
      
      // Calculate splits for friends
      const newSplits = selectedFriends.map((friendId, index) => {
        return {
          userId: friendId,
          amount: equalAmount,
          percentage: Math.round(100 / numPeople)
        };
      });

      setSplits(newSplits);
    } else if (splitType === 'percentage') {
      const equalPercentage = 100 / numPeople;
      const newSplits = selectedFriends.map(friendId => ({
        userId: friendId,
        amount: (totalAmount * equalPercentage) / 100,
        percentage: equalPercentage
      }));
      setSplits(newSplits);
    } else {
      // Keep existing amounts if switching to exact
      const newSplits = selectedFriends.map(friendId => {
        const existingSplit = splits.find(split => split.userId === friendId);
        return existingSplit || {
          userId: friendId,
          amount: 0,
          percentage: 0
        };
      });
      setSplits(newSplits);
    }
  };

  const validateSplits = (): boolean => {
    const totalAmount = parseFloat(amount) || 0;
    const splitSum = splits.reduce((sum, split) => sum + split.amount, 0);
    const numPeople = selectedFriends.length + 1; // Include current user
    const equalShare = Math.round((totalAmount / numPeople) * 100) / 100;
    
    // For equal splits, just verify each split is equal to the equalShare
    if (splitType === 'equal') {
      const isValid = splits.every(split => Math.abs(split.amount - equalShare) < 0.01);
      if (!isValid) {
        setError('Split amounts must be equal');
        return false;
      }
      return true;
    }

    // For other split types, verify total
    const epsilon = 0.01;
    if (Math.abs(splitSum - (totalAmount * (numPeople - 1) / numPeople)) > epsilon) {
      setError(`Split amounts must equal ${((totalAmount * (numPeople - 1)) / numPeople).toFixed(2)}`);
      return false;
    }

    if (splitType === 'percentage') {
      const percentageSum = splits.reduce((sum, split) => sum + (split.percentage || 0), 0);
      if (Math.abs(percentageSum - ((numPeople - 1) * 100 / numPeople)) > epsilon) {
        setError('Percentages must add up correctly');
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSplits()) return;
    
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/expenses/${expense._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount),
          groupId: selectedGroupId || undefined,
          splits
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update expense');
      }

      logger.info('Expense updated successfully');
      onExpenseUpdated?.();
      onClose();
    } catch (error) {
      logger.error('Error updating expense', error);
      setError('Failed to update expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Expense</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg flex items-center">
              <span className="text-red-500 dark:text-red-400 mr-2">⚠</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                Group (Optional)
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select a group</option>
                {groups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">Split Details</h3>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
                    Split with
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {friends.map((friend) => (
                      <label 
                        key={friend._id} 
                        className="flex items-center p-3 border dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(friend._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFriends([...selectedFriends, friend._id]);
                            } else {
                              setSelectedFriends(selectedFriends.filter(id => id !== friend._id));
                            }
                          }}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <div className="ml-3 flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{friend.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{friend.email}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedFriends.length > 0 && (
                  <>
                    <div className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {['equal', 'exact', 'percentage'].map((type) => (
                        <label key={type} className="flex items-center">
                          <input
                            type="radio"
                            name="splitType"
                            value={type}
                            checked={splitType === type}
                            onChange={() => setSplitType(type as SplitType)}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600"
                          />
                          <span className="ml-2 text-gray-900 dark:text-white font-medium capitalize">
                            {type} Split
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-medium">
                            You
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">Your share</span>
                        </div>
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                          ${(Math.round((parseFloat(amount) / (selectedFriends.length + 1)) * 100) / 100).toFixed(2)}
                        </span>
                      </div>

                      {splits.map((split) => {
                        const friend = friends.find(f => f._id === split.userId);
                        if (!friend) return null;

                        const initials = friend.name?.split(' ')
                          .map(n => n?.[0] || '')
                          .filter(Boolean)
                          .join('') || '?';

                        return (
                          <div key={split.userId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium">
                                {initials}
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">{friend.name}</span>
                            </div>
                            {splitType === 'equal' ? (
                              <span className="font-medium text-gray-900 dark:text-white">
                                ${split.amount.toFixed(2)}
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={splitType === 'percentage' ? split.percentage : split.amount}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    const newSplits = splits.map(s => {
                                      if (s.userId === split.userId) {
                                        if (splitType === 'percentage') {
                                          return {
                                            ...s,
                                            percentage: value,
                                            amount: (parseFloat(amount) * value) / 100
                                          };
                                        } else {
                                          return {
                                            ...s,
                                            amount: value,
                                            percentage: (value / parseFloat(amount)) * 100
                                          };
                                        }
                                      }
                                      return s;
                                    });
                                    setSplits(newSplits);
                                  }}
                                  step={splitType === 'percentage' ? '1' : '0.01'}
                                  min="0"
                                  max={splitType === 'percentage' ? '100' : undefined}
                                  className="w-24 border dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {splitType === 'percentage' ? '%' : '$'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                {isSubmitting ? 'Updating...' : 'Update Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 