export interface User {
  _id: string;
  name: string;
  email: string;
}

export interface Group {
  _id: string;
  name: string;
  members: User[];
  ownerId: string;
}

export interface Split {
  userId: string | User;
  amount: number;
  settled: boolean;
}

export type ExpenseType = 'solo' | 'split';

export type ExpenseCategory = 
  | 'food'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'utilities'
  | 'rent'
  | 'health'
  | 'travel'
  | 'education'
  | 'other';

export interface CategoryConfig {
  value: ExpenseCategory;
  label: string;
  icon: string;
  color: {
    light: string;
    dark: string;
  };
}

export interface Expense {
  _id: string;
  description: string;
  amount: number;
  date: string;
  category?: ExpenseCategory;
  payerId: {
    _id: string;
    name: string;
    email: string;
  };
  groupId?: {
    _id: string;
    name: string;
  };
  splits: Split[];
  type: ExpenseType;
  label?: string;
}

export const CATEGORIES: CategoryConfig[] = [
  { 
    value: 'food', 
    label: 'Food & Dining', 
    icon: '🍽️',
    color: {
      light: 'bg-orange-100 text-orange-700',
      dark: 'dark:bg-orange-900/30 dark:text-orange-300'
    }
  },
  { 
    value: 'transport', 
    label: 'Transport', 
    icon: '🚗',
    color: {
      light: 'bg-blue-100 text-blue-700',
      dark: 'dark:bg-blue-900/30 dark:text-blue-300'
    }
  },
  { 
    value: 'shopping', 
    label: 'Shopping', 
    icon: '🛍️',
    color: {
      light: 'bg-pink-100 text-pink-700',
      dark: 'dark:bg-pink-900/30 dark:text-pink-300'
    }
  },
  { 
    value: 'entertainment', 
    label: 'Entertainment', 
    icon: '🎮',
    color: {
      light: 'bg-purple-100 text-purple-700',
      dark: 'dark:bg-purple-900/30 dark:text-purple-300'
    }
  },
  { 
    value: 'utilities', 
    label: 'Utilities', 
    icon: '💡',
    color: {
      light: 'bg-yellow-100 text-yellow-700',
      dark: 'dark:bg-yellow-900/30 dark:text-yellow-300'
    }
  },
  { 
    value: 'rent', 
    label: 'Rent', 
    icon: '🏠',
    color: {
      light: 'bg-green-100 text-green-700',
      dark: 'dark:bg-green-900/30 dark:text-green-300'
    }
  },
  { 
    value: 'health', 
    label: 'Health', 
    icon: '⚕️',
    color: {
      light: 'bg-red-100 text-red-700',
      dark: 'dark:bg-red-900/30 dark:text-red-300'
    }
  },
  { 
    value: 'travel', 
    label: 'Travel', 
    icon: '✈️',
    color: {
      light: 'bg-indigo-100 text-indigo-700',
      dark: 'dark:bg-indigo-900/30 dark:text-indigo-300'
    }
  },
  { 
    value: 'education', 
    label: 'Education', 
    icon: '📚',
    color: {
      light: 'bg-teal-100 text-teal-700',
      dark: 'dark:bg-teal-900/30 dark:text-teal-300'
    }
  },
  { 
    value: 'other', 
    label: 'Other', 
    icon: '📌',
    color: {
      light: 'bg-gray-100 text-gray-700',
      dark: 'dark:bg-gray-900/30 dark:text-gray-300'
    }
  }
];

export interface Balance {
  totalOwed: number;
  totalOwe: number;
  netBalance: number;
}

export interface ErrorWithStack extends Error {
  stack?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogPayload = Record<string, unknown>;

export type ExpenseLabel = 
  | 'food'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'utilities'
  | 'rent'
  | 'health'
  | 'travel'
  | 'education'
  | 'other';

export const EXPENSE_LABELS: ExpenseLabel[] = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'utilities',
  'rent',
  'health',
  'travel',
  'education',
  'other'
];

export interface ExpenseLabelConfig {
  value: ExpenseLabel;
  label: string;
  icon: string;
  color: {
    light: string;
    dark: string;
  };
} 