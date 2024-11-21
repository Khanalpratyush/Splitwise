'use client';

import { useState } from 'react';
import { X, Users } from 'lucide-react';
import { User } from '@/types';
import logger from '@/utils/logger';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: User[];
  onGroupCreated: () => void;
}

const GROUP_CATEGORIES = [
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'trip', label: 'Trip', icon: '✈️' },
  { value: 'couple', label: 'Couple', icon: '❤️' },
  { value: 'other', label: 'Other', icon: '📌' }
];

export default function CreateGroupModal({
  isOpen,
  onClose,
  friends,
  onGroupCreated
}: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      if (!name.trim()) {
        throw new Error('Group name is required');
      }

      if (selectedFriends.length === 0) {
        throw new Error('Please select at least one member');
      }

      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          category,
          memberIds: selectedFriends
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create group');
      }

      logger.info('Group created successfully', { groupId: data._id });
      onGroupCreated();
      onClose();
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create group';
      setError(message);
      logger.error('Error creating group', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create New Group</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700"
                placeholder="Enter group name"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700"
                placeholder="Add a description (optional)"
                rows={3}
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700"
                required
              >
                {GROUP_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Add Members *
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border dark:border-gray-700 rounded-lg p-2">
                {friends.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 p-2">
                    No friends found. Add friends first to create a group.
                  </p>
                ) : (
                  friends.map((friend) => (
                    <label
                      key={friend._id}
                      className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFriends.includes(friend._id)}
                        onChange={(e) => {
                          setSelectedFriends(prev =>
                            e.target.checked
                              ? [...prev, friend._id]
                              : prev.filter(id => id !== friend._id)
                          );
                        }}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="ml-2 text-sm text-gray-900 dark:text-white">
                        {friend.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || friends.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 