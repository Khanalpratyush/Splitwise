'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useModal } from '@/hooks/useModal';
import CreateGroupModal from '@/components/CreateGroupModal';
import logger from '@/utils/logger';

interface Group {
  _id: string;
  name: string;
  members: Array<{ _id: string; name: string }>;
  ownerId: { _id: string; name: string };
  totalExpenses?: number;
  lastActivity?: string;
}

interface Friend {
  _id: string;
  name: string;
  email: string;
}

export default function GroupsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isOpen, openModal, closeModal } = useModal(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [groupsRes, friendsRes] = await Promise.all([
          fetch('/api/groups').then(res => {
            if (!res.ok) throw new Error('Failed to fetch groups');
            return res.json();
          }),
          fetch('/api/friends').then(res => {
            if (!res.ok) throw new Error('Failed to fetch friends');
            return res.json();
          })
        ]);

        setGroups(groupsRes);
        setFriends(friendsRes);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        logger.error('Error fetching data', error);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleGroupCreated = async () => {
    try {
      const response = await fetch('/api/groups');
      if (!response.ok) throw new Error('Failed to fetch groups');
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      logger.error('Error refreshing groups', error);
    }
  };

  if (isLoading || loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Groups</h1>
          <button 
            onClick={openModal}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            Create New Group
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">You haven't joined any groups yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <GroupCard
                key={group._id}
                name={group.name}
                members={group.members.length}
                ownerId={group.ownerId._id}
                totalExpenses={group.totalExpenses}
                lastActivity={group.lastActivity}
              />
            ))}
          </div>
        )}

        {isOpen && (
          <CreateGroupModal
            isOpen={isOpen}
            onClose={closeModal}
            friends={friends}
            onGroupCreated={handleGroupCreated}
          />
        )}
      </main>
    </div>
  );
}

function GroupCard({ 
  name, 
  members, 
  ownerId,
  totalExpenses = 0,
  lastActivity = 'No activity'
}: {
  name: string;
  members: number;
  ownerId: string;
  totalExpenses?: number;
  lastActivity?: string;
}) {
  return (
    <Link href={`/groups/${name.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-medium text-lg">
            {name[0]}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{members} members</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Total Expenses</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ${totalExpenses?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Last Activity</span>
            <span className="text-gray-900 dark:text-white">{lastActivity}</span>
          </div>
        </div>
      </div>
    </Link>
  );
} 