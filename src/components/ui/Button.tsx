'use client';

import { ButtonSpinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
  ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  outline: 'border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100 dark:hover:bg-emerald-900/20',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-xl
        transition-all duration-200 ease-in-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <ButtonSpinner /> : icon}
      {children}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}

const iconSizeClasses = {
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-3',
};

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  tooltip,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      className={`
        rounded-full transition-all duration-200
        ${variant === 'ghost' ? 'hover:bg-gray-100 dark:hover:bg-gray-800' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}
        ${iconSizeClasses[size]}
        ${className}
      `}
      title={tooltip}
      {...props}
    >
      {icon}
    </button>
  );
}
