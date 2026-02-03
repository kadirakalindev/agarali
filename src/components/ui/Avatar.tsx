'use client';

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showOnline?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

export function Avatar({ src, alt, size = 'md', className = '', showOnline }: AvatarProps) {
  const initials = alt
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`relative inline-block ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white dark:ring-gray-800`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-semibold ring-2 ring-white dark:ring-gray-800`}
        >
          {initials}
        </div>
      )}
      {showOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full" />
      )}
    </div>
  );
}

interface AvatarGroupProps {
  users: Array<{ avatar_url?: string | null; full_name: string }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  return (
    <div className="flex -space-x-2">
      {visibleUsers.map((user, index) => (
        <Avatar
          key={index}
          src={user.avatar_url}
          alt={user.full_name}
          size={size}
        />
      ))}
      {remainingCount > 0 && (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium ring-2 ring-white dark:ring-gray-800`}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
