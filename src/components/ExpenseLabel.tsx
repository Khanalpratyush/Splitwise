import type { CategoryConfig } from '@/types';

interface LabelProps {
  label: {
    name: string;
    color: {
      light: string;
      dark: string;
      bg: string;
      border: string;
      text: string;
      darkBg: string;
      darkBorder: string;
      darkText: string;
    };
  };
}

export default function ExpenseLabel({ label }: LabelProps) {
  const getColorClasses = (color: LabelProps['label']['color']) => `
    ${color.light || ''} 
    ${color.dark || ''}
    ${color.bg || ''} 
    ${color.border || ''} 
    ${color.text || ''}
    ${color.darkBg || ''} 
    ${color.darkBorder || ''} 
    ${color.darkText || ''}
  `;

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-md ${getColorClasses(label.color)}`}>
      {label.name}
    </div>
  );
} 