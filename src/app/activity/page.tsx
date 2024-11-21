'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { Activity as ActivityIcon, DollarSign, AlertCircle } from 'lucide-react';
import logger from '@/utils/logger';
import type { Expense } from '@/types';

interface ActivityItem {
  _id: string;
  type: 'expense_created' | 'expense_settled' | 'expense_edited';
  expense: Expense;
  actorId: string;
  actorName: string;
  timestamp: string;
}

export default function ActivityPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: session } = useSession();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/activity');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch activity');
        }

        logger.debug('Fetched activities', { count: data.length });
        setActivities(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        logger.error('Error fetching activity data', error);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="mt-2 h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-8">
          <ActivityIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Feed</h1>
        </div>

        {error ? (
          <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center text-gray-500 dark:text-gray-400">
            No activity to show yet
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <ActivityCard
                key={activity._id}
                activity={activity}
                currentUserId={session?.user.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ActivityCard({ 
  activity, 
  currentUserId 
}: { 
  activity: ActivityItem;
  currentUserId?: string;
}) {
  const isYou = activity.actorId === currentUserId;
  const actorName = isYou ? 'You' : activity.actorName;

  const getActivityMessage = () => {
    switch (activity.type) {
      case 'expense_created':
        return `${actorName} created a new expense`;
      case 'expense_settled':
        return `${actorName} marked an expense as settled`;
      case 'expense_edited':
        return `${actorName} edited an expense`;
      default:
        return 'Unknown activity';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
          <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {getActivityMessage()}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {activity.expense.description}
          </p>
          <div className="mt-2 flex items-center gap-4">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              ${activity.expense.amount.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(activity.timestamp), 'MMM d, yyyy • h:mm a')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 