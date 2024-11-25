'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Layers,
  Activity
} from 'lucide-react';
import logger from '@/utils/logger';
import type { Expense, Balance, User, Group } from '@/types';
import { getInitials } from '@/utils/string';
import { IUser } from '@/models/User';

interface FriendBalance {
  friendId: string;
  name: string;
  email: string;
  youOwe: number;
  theyOwe: number;
  netAmount: number;
}

interface GroupSummary {
  group: Group;
  totalExpenses: number;
  recentActivity: Date;
}

// Add type guard function at the top
const getUserId = (userId: string | IUser): string => {
  if (typeof userId === 'string') return userId;
  return userId._id.toString();
};

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friendBalances, setFriendBalances] = useState<FriendBalance[]>([]);
  const [groupSummaries, setGroupSummaries] = useState<GroupSummary[]>([]);
  const [recentActivity, setRecentActivity] = useState<Expense[]>([]);
  const [balance, setBalance] = useState<Balance>({
    totalOwed: 0,
    totalOwe: 0,
    netBalance: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [expensesRes, friendsRes, groupsRes] = await Promise.all([
          fetch('/api/expenses').then(res => res.json()),
          fetch('/api/friends').then(res => res.json()),
          fetch('/api/groups').then(res => res.json())
        ]);

        setExpenses(expensesRes);
        setFriends(friendsRes);
        setGroups(groupsRes);

        // Calculate total balances
        let totalOwed = 0;
        let totalOwe = 0;

        // Create a map to track individual balances with each friend
        const friendBalanceMap = new Map<string, {
          youOwe: number;
          theyOwe: number;
          netAmount: number;
        }>();

        expensesRes.forEach((expense: Expense) => {
          if (expense.type === 'split') {
            const payerId = getUserId(expense.payerId);
            const isUserPayer = payerId === session?.user.id;

            expense.splits.forEach(split => {
              const splitUserId = getUserId(split.userId);
              
              if (!split.settled) {
                if (isUserPayer && splitUserId !== session?.user.id) {
                  // You paid, they owe you
                  const current = friendBalanceMap.get(splitUserId) || { youOwe: 0, theyOwe: 0, netAmount: 0 };
                  current.theyOwe += split.amount;
                  current.netAmount = current.theyOwe - current.youOwe;
                  friendBalanceMap.set(splitUserId, current);
                  totalOwed += split.amount;
                } else if (!isUserPayer && splitUserId === session?.user.id) {
                  // They paid, you owe them
                  const current = friendBalanceMap.get(payerId) || { youOwe: 0, theyOwe: 0, netAmount: 0 };
                  current.youOwe += split.amount;
                  current.netAmount = current.theyOwe - current.youOwe;
                  friendBalanceMap.set(payerId, current);
                  totalOwe += split.amount;
                }
              }
            });
          }
        });

        // Convert friend balances to array and calculate net amounts
        const friendBalances = Array.from(friendBalanceMap.entries()).map(([friendId, balance]) => {
          const friend = friendsRes.find((f: User) => f._id === friendId);
          return {
            friendId,
            name: friend?.name || 'Unknown',
            email: friend?.email || '',
            youOwe: balance.youOwe,
            theyOwe: balance.theyOwe,
            netAmount: balance.netAmount
          };
        });

        // Sort friend balances by absolute net amount (highest first)
        friendBalances.sort((a, b) => Math.abs(b.netAmount) - Math.abs(a.netAmount));

        setBalance({
          totalOwed: Math.round(totalOwed * 100) / 100,
          totalOwe: Math.round(totalOwe * 100) / 100,
          netBalance: Math.round((totalOwed - totalOwe) * 100) / 100
        });

        setFriendBalances(friendBalances);
      } catch (error) {
        setError('Failed to fetch data');
        logger.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (session?.user?.id) {
      fetchData();
    }
  }, [session?.user?.id]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {/* Balance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Balance */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Balance</h3>
              <DollarSign className={`h-5 w-5 ${balance.netBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
            </div>
            <p className={`mt-2 text-3xl font-semibold ${
              balance.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {balance.netBalance >= 0 ? '+' : '-'}${Math.abs(balance.netBalance).toFixed(2)}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {balance.netBalance >= 0 ? 'You are owed in total' : 'You owe in total'}
            </p>
          </div>

          {/* You Owe */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">You Owe</h3>
              <TrendingUp className="h-5 w-5 text-red-500" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-red-600 dark:text-red-400">
              ${balance.totalOwe.toFixed(2)}
            </p>
            <Link 
              href="/expenses?tab=involved" 
              className="mt-1 inline-flex items-center text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              View details
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          {/* You are Owed */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">You are Owed</h3>
              <TrendingDown className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-2 text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
              ${balance.totalOwed.toFixed(2)}
            </p>
            <Link 
              href="/expenses?tab=created" 
              className="mt-1 inline-flex items-center text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              View details
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
                  </div>
                  <Link 
                    href="/expenses" 
                    className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentActivity.map((expense) => (
                  <div key={expense._id} className="px-6 py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{expense.description}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {expense.payerId.name} • {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${expense.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Your Groups */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Groups</h2>
                  </div>
                  <Link 
                    href="/groups" 
                    className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {groupSummaries.map((summary) => (
                  <div key={summary.group._id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-medium">
                          {summary.group.name[0]}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{summary.group.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {summary.group.members.length} members
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          ${summary.totalExpenses.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {summary.recentActivity.getTime() > 0 
                            ? `Last active ${new Date(summary.recentActivity).toLocaleDateString()}`
                            : 'No activity'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Friend Balances */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Friend Balances</h2>
                  </div>
                  <Link 
                    href="/friends" 
                    className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                  >
                    View all friends
                  </Link>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {friendBalances.length === 0 ? (
                  <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No outstanding balances with friends
                  </div>
                ) : (
                  friendBalances.map((balance) => {
                    const initials = getInitials(balance.name);

                    return (
                      <div key={balance.friendId} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium">
                            {initials}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{balance.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {balance.netAmount > 0 
                                ? 'owes you' 
                                : 'you owe'}
                            </p>
                          </div>
                        </div>
                        <span className={`font-medium ${
                          balance.netAmount > 0 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          ${Math.abs(balance.netAmount).toFixed(2)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Total Groups</span>
                  <span className="font-medium text-gray-900 dark:text-white">{groups.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Total Friends</span>
                  <span className="font-medium text-gray-900 dark:text-white">{friends.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Active Expenses</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {expenses.filter(e => !e.splits.every(s => s.settled)).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
