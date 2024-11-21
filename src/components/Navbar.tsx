'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { 
  Sun, 
  Moon, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Bell, 
  DollarSign,
  Users,
  HelpCircle,
  Wallet,
  History
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface Notification {
  id: string;
  type: 'expense' | 'group' | 'friend' | 'payment';
  message: string;
  time: string;
  read: boolean;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'expense',
      message: 'John added a new expense of $50',
      time: '5m ago',
      read: false
    },
    {
      id: '2',
      type: 'group',
      message: 'You were added to "Weekend Trip" group',
      time: '1h ago',
      read: false
    }
  ]);
  const [totalBalance, setTotalBalance] = useState(0);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">SplitWise</span>
            </Link>
            
            {session && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <NavLink href="/" active={pathname === '/'}>
                  Dashboard
                </NavLink>
                <NavLink href="/groups" active={pathname.startsWith('/groups')}>
                  Groups
                </NavLink>
                <NavLink href="/expenses" active={pathname.startsWith('/expenses')}>
                  Expenses
                </NavLink>
                <NavLink href="/friends" active={pathname.startsWith('/friends')}>
                  Friends
                </NavLink>
              </div>
            )}
          </div>
          
          {/* Right side - Actions and Profile */}
          <div className="flex items-center space-x-4">
            {session && (
              <>
                {/* Balance Indicator */}
                <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700">
                  <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mr-1" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {totalBalance >= 0 ? `+$${totalBalance}` : `-$${Math.abs(totalBalance)}`}
                  </span>
                </div>

                {/* Notifications */}
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative"
                  >
                    <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    {unreadNotifications > 0 && (
                      <span className="absolute top-0 right-0 h-4 w-4 text-xs flex items-center justify-center bg-red-500 text-white rounded-full">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>

                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                      <div className="p-4 border-b dark:border-gray-700">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Notifications</h3>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No notifications
                          </div>
                        ) : (
                          notifications.map(notification => (
                            <div
                              key={notification.id}
                              className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                                !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                              onClick={() => markNotificationAsRead(notification.id)}
                            >
                              <div className="flex items-start">
                                <div className="flex-shrink-0">
                                  {notification.type === 'expense' && (
                                    <DollarSign className="h-5 w-5 text-emerald-500" />
                                  )}
                                  {notification.type === 'group' && (
                                    <Users className="h-5 w-5 text-blue-500" />
                                  )}
                                </div>
                                <div className="ml-3 w-0 flex-1">
                                  <p className="text-sm text-gray-900 dark:text-white">
                                    {notification.message}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {notification.time}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* Profile Menu */}
            {session ? (
              <div className="relative" ref={menuRef}>
                <button 
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    {session.user?.name?.[0] || 'U'}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {session.user?.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {session.user?.email}
                    </div>
                  </div>
                  <ChevronDown 
                    className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                      isMenuOpen ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="px-4 py-3 border-b dark:border-gray-700">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {session.user?.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {session.user?.email}
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <button
                        onClick={() => router.push('/profile')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <User className="h-4 w-4 mr-3" />
                        Profile
                      </button>
                      
                      <button
                        onClick={() => router.push('/wallet')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Wallet className="h-4 w-4 mr-3" />
                        Wallet
                      </button>

                      <button
                        onClick={() => router.push('/activity')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <History className="h-4 w-4 mr-3" />
                        Activity
                      </button>
                      
                      <button
                        onClick={() => router.push('/settings')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Settings
                      </button>

                      <button
                        onClick={() => router.push('/help')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <HelpCircle className="h-4 w-4 mr-3" />
                        Help & Support
                      </button>
                    </div>

                    <div className="py-1 border-t dark:border-gray-700">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
        active
          ? 'border-b-2 border-emerald-600 dark:border-emerald-400 text-gray-900 dark:text-white'
          : 'text-gray-700 dark:text-gray-300 hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
} 