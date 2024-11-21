import { ExpenseLabelConfig } from '@/types';

interface ExpenseLabelProps {
  label: ExpenseLabelConfig;
  size?: 'sm' | 'md' | 'lg';
}

export default function ExpenseLabel({ label, size = 'md' }: ExpenseLabelProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full
        ${label.color.bg} ${label.color.border} ${label.color.text}
        ${label.color.darkBg} ${label.color.darkBorder} ${label.color.darkText}
        border ${sizeClasses[size]}
        transition-colors duration-200
      `}
    >
      <span>{label.icon}</span>
      <span className="font-medium">{label.label}</span>
    </div>
  );
} 