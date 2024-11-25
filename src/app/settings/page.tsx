'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useAuth } from '@/hooks/useAuth';
import { User, X, DollarSign } from 'lucide-react';
import logger from '@/utils/logger';
import type { Friend } from '@/types';

export default function SettingsPage() {
  const { data: session } = useSession();
  const { isAuthenticated, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [friendBalances, setFriendBalances] = useState<{
    [key: string]: { youOwe: number; theyOwe: number; netBalance: number }
  }>({});
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [settlementAmount, setSettlementAmount] = useState<number>(0);
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
      calculateFriendBalances();
    }
  }, [session]);

  const calculateFriendBalances = async () => {
    try {
      const response = await fetch('/api/expenses');
      const expenses = await response.json();
      
      const balances: { [key: string]: { youOwe: number; theyOwe: number; netBalance: number } } = {};
      
      expenses.forEach((expense: any) => {
        if (expense.type === 'split') {
          const payerId = expense.payerId._id;
          const isCreator = payerId === session?.user.id;
          
          expense.splits.forEach((split: any) => {
            if (!split.settled) {
              const friendId = isCreator ? split.userId : payerId;
              
              if (!balances[friendId]) {
                balances[friendId] = { youOwe: 0, theyOwe: 0, netBalance: 0 };
              }
              
              if (isCreator) {
                balances[friendId].theyOwe += split.amount;
              } else if (split.userId === session?.user.id) {
                balances[friendId].youOwe += split.amount;
              }
              
              balances[friendId].netBalance = 
                balances[friendId].theyOwe - balances[friendId].youOwe;
            }
          });
        }
      });
      
      setFriendBalances(balances);
    } catch (error) {
      logger.error('Error calculating friend balances', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setSuccessMessage('Profile updated successfully. Please sign in again for changes to take effect.');
      
      setTimeout(() => {
        signOut({ callbackUrl: '/auth/signin' });
      }, 2000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update profile');
      logger.error('Error updating profile', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      const response = await fetch('/api/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setFriends(friends.filter(friend => friend._id !== friendId));
      setSuccessMessage('Friend removed successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove friend');
      logger.error('Error removing friend', error);
    }
  };

  const handleSettleUp = async (friendId: string, amount: number) => {
    setIsSettling(true);
    setError(null);
    
    try {
      const response = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId, amount }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setSuccessMessage('Settlement recorded successfully');
      calculateFriendBalances(); // Refresh balances
      setSelectedFriend(null);
      setSettlementAmount(0);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to record settlement');
    } finally {
      setIsSettling(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Profile Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile Settings</h2>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>

          {/* Friends Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Friends</h2>
            <div className="space-y-4">
              {friends.map((friend) => {
                const balance = friendBalances[friend._id] || { youOwe: 0, theyOwe: 0, netBalance: 0 };
                const hasBalance = balance.youOwe > 0 || balance.theyOwe > 0;

                return (
                  <div 
                    key={friend._id}
                    className="flex items-center justify-between p-4 border dark:border-gray-700 rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{friend.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{friend.email}</p>
                      {hasBalance && (
                        <p className={`text-sm mt-1 ${
                          balance.netBalance > 0 
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : balance.netBalance < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {balance.netBalance > 0 
                            ? `Owes you $${balance.netBalance.toFixed(2)}`
                            : balance.netBalance < 0
                            ? `You owe $${Math.abs(balance.netBalance).toFixed(2)}`
                            : 'Settled up'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {hasBalance && (
                        <button
                          onClick={() => {
                            setSelectedFriend(friend._id);
                            setSettlementAmount(Math.abs(balance.netBalance));
                          }}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md"
                        >
                          <DollarSign className="h-4 w-4" />
                          Settle Up
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveFriend(friend._id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Settlement Modal */}
            {selectedFriend && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Settle Up
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={settlementAmount}
                        onChange={(e) => setSettlementAmount(Number(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedFriend(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSettleUp(selectedFriend, settlementAmount)}
                        disabled={isSettling || settlementAmount <= 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50"
                      >
                        {isSettling ? 'Recording...' : 'Record Settlement'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 