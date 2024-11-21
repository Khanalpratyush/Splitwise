'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from 'next-auth/react';
import { useModal } from '@/hooks/useModal';
import { Trash2, CheckCircle, Plus, Upload } from 'lucide-react';
import AddExpenseModal from '@/components/AddExpenseModal';
import EditExpenseModal from '@/components/EditExpenseModal';
import ExpenseDetailsModal from '@/components/ExpenseDetailsModal';
import ExpenseCSVImport from '@/components/ExpenseCSVImport';
import logger from '@/utils/logger';
import type { Expense, Group, User, ExpenseLabelConfig } from '@/types';
import { EXPENSE_LABELS } from '@/types';
import DeleteConfirmationDialog from '@/components/DeleteConfirmationDialog';

type ExpenseTab = 'created' | 'involved';
type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
type TimeFilter = 'all' | 'this-month' | 'last-month' | 'this-year' | 'custom';

interface CustomDateRange {
  start: string;
  end: string;
}

export default function ExpensesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ExpenseTab>('created');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({
    start: '',
    end: ''
  });
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Define applyFilters before refreshExpenses
  const applyFilters = useCallback((expensesData: Expense[]) => {
    if (!session?.user?.id) return;

    let filtered = expensesData.filter(expense => {
      const payerId = typeof expense.payerId === 'string' ? expense.payerId : expense.payerId._id;
      
      if (activeTab === 'created') {
        return payerId === session.user.id;
      } else {
        return payerId !== session.user.id && expense.splits.some(split => {
          const splitUserId = typeof split.userId === 'string' ? split.userId : split.userId._id;
          return splitUserId === session.user.id;
        });
      }
    });

    // Apply group filter
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(expense => {
        const groupId = typeof expense.groupId === 'string' ? expense.groupId : expense.groupId?._id;
        return groupId === selectedGroup;
      });
    }

    // Apply time filter
    filtered = filtered.filter(expense => {
      const expenseDate = new Date(expense.date);
      const now = new Date();

      switch (timeFilter) {
        case 'this-month':
          return expenseDate.getMonth() === now.getMonth() && 
                 expenseDate.getFullYear() === now.getFullYear();
        case 'last-month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
          return expenseDate.getMonth() === lastMonth.getMonth() && 
                 expenseDate.getFullYear() === lastMonth.getFullYear();
        case 'this-year':
          return expenseDate.getFullYear() === now.getFullYear();
        case 'custom':
          if (!customDateRange.start || !customDateRange.end) return true;
          const start = new Date(customDateRange.start);
          const end = new Date(customDateRange.end);
          return expenseDate >= start && expenseDate <= end;
        default:
          return true;
      }
    });

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    setFilteredExpenses(filtered);
  }, [session?.user?.id, activeTab, selectedGroup, timeFilter, sortBy, customDateRange]);

  // Now define refreshExpenses with applyFilters available
  const refreshExpenses = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      setIsLoading(true);
      const [expensesRes, friendsRes, groupsRes] = await Promise.all([
        fetch('/api/expenses', {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        }),
        fetch('/api/friends', {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        }),
        fetch('/api/groups', {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        })
      ]);

      if (!expensesRes.ok) throw new Error(`Failed to fetch expenses: ${expensesRes.statusText}`);
      if (!friendsRes.ok) throw new Error(`Failed to fetch friends: ${friendsRes.statusText}`);
      if (!groupsRes.ok) throw new Error(`Failed to fetch groups: ${groupsRes.statusText}`);

      const [expensesData, friendsData, groupsData] = await Promise.all([
        expensesRes.json(),
        friendsRes.json(),
        groupsRes.json()
      ]);

      setExpenses(expensesData);
      setFriends(friendsData);
      setGroups(groupsData);
      
      applyFilters(expensesData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch data';
      setError(message);
      logger.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, applyFilters]);

  // Then define handlers that use it
  const handleExpenseAdded = useCallback(async () => {
    await refreshExpenses();
  }, [refreshExpenses]);

  const handleExpenseDeleted = useCallback(async (expenseId: string) => {
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete expense');
      }

      setExpenses(prevExpenses => prevExpenses.filter(e => e._id !== expenseId));
      setFilteredExpenses(prevExpenses => prevExpenses.filter(e => e._id !== expenseId));
      
      await refreshExpenses();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete expense';
      setError(message);
      logger.error('Error deleting expense', error);
    }
  }, [refreshExpenses]);

  // Modal handlers
  const openAddModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);
  
  const openImportModal = useCallback(() => {
    setIsImportModalOpen(true);
  }, []);
  const closeImportModal = () => setIsImportModalOpen(false);

  const openEditModal = () => setIsEditModalOpen(true);
  const closeEditModal = () => setIsEditModalOpen(false);

  const openDetailsModal = () => setIsDetailsModalOpen(true);
  const closeDetailsModal = () => setIsDetailsModalOpen(false);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      refreshExpenses();
    }
  }, [isAuthenticated, authLoading, refreshExpenses]);

  const getTotalAmount = (tab: ExpenseTab): number => {
    if (!session?.user?.id || !expenses.length) return 0;

    return expenses.reduce((total, expense) => {
      const payerId = expense.payerId?._id || expense.payerId;
      
      if (tab === 'created' && payerId === session.user.id) {
        return total + expense.amount;
      } else if (tab === 'involved' && payerId !== session.user.id) {
        const userSplit = expense.splits.find(split => {
          const splitUserId = split.userId?._id || split.userId;
          return splitUserId === session.user.id;
        });
        return total + (userSplit?.amount || 0);
      }
      return total;
    }, 0);
  };

  const handleEditExpense = useCallback((expense: Expense) => {
    if (expense.payerId._id === session?.user.id) {
      setSelectedExpense(expense);
      openEditModal();
    }
  }, [session?.user.id, openEditModal]);

  const handleViewDetails = (expense: Expense) => {
    setSelectedExpense(expense);
    openDetailsModal();
  };

  if (authLoading || (isLoading && expenses.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && expenses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No expenses yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by adding your first expense
            </p>
            <div className="mt-6">
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Expense
              </button>
            </div>
          </div>
        </div>

        <AddExpenseModal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          friends={friends}
          groups={groups}
          onExpenseAdded={handleExpenseAdded}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
            <p className="font-medium">Error loading expenses</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Header and Add Button */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Expenses</h1>
          <div className="flex gap-2">
            <button
              onClick={openImportModal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
            >
              <Upload className="h-5 w-5 mr-2" />
              Import CSV
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Expense
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('created')}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === 'created'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                `}
              >
                <span>Created by You</span>
                <span className="ml-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 py-0.5 px-2 rounded-full text-xs">
                  ${getTotalAmount('created').toFixed(2)}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('involved')}
                className={`
                  py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === 'involved'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                `}
              >
                <span>Created by Others</span>
                <span className="ml-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 py-0.5 px-2 rounded-full text-xs">
                  ${getTotalAmount('involved').toFixed(2)}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Group Filter */}
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="border dark:border-gray-600 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700"
            >
              <option value="all">All Groups</option>
              {groups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))}
            </select>

            {/* Time Filter */}
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="border dark:border-gray-600 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700"
            >
              <option value="all">All Time</option>
              <option value="this-month">This Month</option>
              <option value="last-month">Last Month</option>
              <option value="this-year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {/* Custom Date Range */}
            {timeFilter === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="border dark:border-gray-600 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700"
                />
                <input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="border dark:border-gray-600 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700"
                />
              </div>
            )}

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="border dark:border-gray-600 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredExpenses.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                {activeTab === 'created' 
                  ? "You haven't created any expenses yet"
                  : "No expenses shared with you"}
              </div>
            ) : (
              filteredExpenses.map((expense) => (
                <ExpenseItem
                  key={expense._id}
                  expense={expense}
                  session={session}
                  onEdit={() => handleEditExpense(expense)}
                  onDelete={() => handleExpenseDeleted(expense._id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Modals */}
        <AddExpenseModal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          friends={friends}
          groups={groups}
          onExpenseAdded={handleExpenseAdded}
        />

        <ExpenseCSVImport
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          friends={friends}
          groups={groups}
          onExpenseAdded={handleExpenseAdded}
        />

        {selectedExpense && (
          <>
            <EditExpenseModal
              isOpen={isEditModalOpen}
              onClose={() => {
                setIsEditModalOpen(false);
                setSelectedExpense(null);
              }}
              expense={selectedExpense}
              friends={friends}
              groups={groups}
              onExpenseUpdated={handleExpenseAdded}
            />

            <ExpenseDetailsModal
              isOpen={isDetailsModalOpen}
              onClose={() => {
                setIsDetailsModalOpen(false);
                setSelectedExpense(null);
              }}
              expense={selectedExpense}
            />
          </>
        )}
      </main>
    </div>
  );
}

function ExpenseItem({ 
  expense, 
  session, 
  onEdit,
  onDelete
}: { 
  expense: Expense;
  session: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  const isCreator = expense.payerId?._id === session?.user?.id;
  const userSplit = expense.splits.find(split => {
    if (!split.userId || !session?.user?.id) return false;
    
    if (typeof split.userId === 'string') {
      return split.userId === session.user.id;
    }
    
    return split.userId._id === session.user.id;
  });
  const isSettled = userSplit?.settled || false;

  const displayAmount = isCreator 
    ? expense.amount 
    : userSplit?.amount || 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/expenses/${expense._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }

      onDelete();
    } catch (error) {
      setError('Failed to delete expense');
      logger.error('Error deleting expense', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  const handleSettleUp = async () => {
    setIsSettling(true);
    setError(null);

    try {
      const response = await fetch('/api/expenses/settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expenseId: expense._id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to settle expense');
      }

      window.location.reload();
    } catch (error) {
      setError('Failed to settle expense');
      logger.error('Error settling expense', error);
    } finally {
      setIsSettling(false);
    }
  };

  const getUserName = (userId: any) => {
    if (!userId) return 'Unknown';
    if (typeof userId === 'string') return 'Unknown';
    return userId.name || 'Unknown';
  };

  return (
    <>
      <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
        {error && (
          <div className="mb-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{expense.description}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getUserName(expense.payerId)} paid • {new Date(expense.date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-medium text-gray-900 dark:text-white">
              {isCreator ? (
                `$${expense.amount.toFixed(2)}`
              ) : (
                `You owe $${displayAmount.toFixed(2)}`
              )}
            </span>
            {!isCreator && isSettled && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                Settled
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              {expense.groupId?.name || 'Personal'}
            </span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isCreator ? 'You paid' : `${getUserName(expense.payerId)} paid $${expense.amount.toFixed(2)}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isCreator ? (
              <>
                <button 
                  onClick={() => setShowDeleteConfirmation(true)}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button 
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
                  onClick={onEdit}
                >
                  Edit
                </button>
              </>
            ) : (
              !isSettled && (
                <button 
                  onClick={handleSettleUp}
                  disabled={isSettling}
                  className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  {isSettling ? 'Settling...' : 'Settle Up'}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <DeleteConfirmationDialog
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        title="Delete Expense"
        message={`Are you sure you want to delete "${expense.description}"? This action cannot be undone.`}
      />
    </>
  );
} 