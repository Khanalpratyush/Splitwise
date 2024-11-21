'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import logger from '@/utils/logger';
import { Search } from 'lucide-react';

interface Friend {
  _id: string;
  name: string;
  email: string;
}

export default function FriendsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<Friend | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const friendsResponse = await fetch('/api/friends');
        const friendsData = await friendsResponse.json();

        if (!friendsResponse.ok) {
          throw new Error(friendsData.message || 'Failed to fetch friends');
        }

        setFriends(friendsData);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        logger.error('Error fetching friends data', error);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleAddFriend = async (friendId: string) => {
    try {
      setError(null);
      const response = await fetch('/api/friends/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add friend');
      }

      // Refresh friends list and clear search
      const friendsResponse = await fetch('/api/friends');
      const friendsData = await friendsResponse.json();

      if (!friendsResponse.ok) {
        throw new Error(friendsData.message || 'Failed to fetch friends');
      }

      setFriends(friendsData);
      setSearchResult(null);
      setSearchEmail('');

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add friend';
      logger.error('Error adding friend', { error: message });
      setError(message);
    }
  };

  const handleSearch = async () => {
    try {
      setSearchError(null);
      setSearchResult(null);

      if (!searchEmail.trim()) {
        setSearchError('Please enter an email address');
        return;
      }

      const response = await fetch(`/api/users/search?email=${encodeURIComponent(searchEmail.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to search user');
      }

      if (data) {
        setSearchResult(data);
      } else {
        setSearchError('No user found with that email address');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      logger.error('Error searching user', { error: message });
      setSearchError(message);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Friends</h1>
        </div>

        {/* Search Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Find Friends</h2>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="Search by email address"
                  className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              </div>
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              Search
            </button>
          </div>

          {searchError && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg">
              {searchError}
            </div>
          )}

          {searchResult && (
            <div className="border dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium">
                    {searchResult.name[0]}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{searchResult.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{searchResult.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAddFriend(searchResult._id)}
                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium px-3 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                >
                  Add Friend
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current Friends Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Friends</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend) => (
              <FriendCard
                key={friend._id}
                friend={friend}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function FriendCard({ friend }: { friend: Friend }) {
  const initials = friend?.name ? friend.name[0] : '?';

  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-medium">
          {initials}
        </div>
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">{friend?.name || 'Unknown'}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{friend?.email}</p>
        </div>
      </div>
    </div>
  );
}

function _PotentialFriendCard({ user, onAdd }: { user: Friend; onAdd: () => void }) {
  const initials = user?.name ? user.name[0] : '?';

  return (
    <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-medium">
            {initials}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">{user?.name || 'Unknown'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onAdd}
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium px-3 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
        >
          Add
        </button>
      </div>
    </div>
  );
} 