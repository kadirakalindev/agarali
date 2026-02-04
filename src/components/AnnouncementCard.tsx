'use client';

import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Announcement } from '@/types';

interface AnnouncementCardProps {
  announcement: Announcement;
  showFullContent?: boolean;
}

export function AnnouncementCard({ announcement, showFullContent = false }: AnnouncementCardProps) {
  const priorityStyles = {
    normal: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    },
    important: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      icon: 'text-amber-600',
      badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    },
    urgent: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600',
      badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    },
  };

  const priorityLabels = {
    normal: 'Duyuru',
    important: 'Önemli',
    urgent: 'Acil',
  };

  const style = priorityStyles[announcement.priority];

  return (
    <div className={`${style.bg} ${style.border} border rounded-2xl p-4 animate-fadeIn`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${style.icon}`}>
          {announcement.priority === 'urgent' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : announcement.priority === 'important' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>
              {priorityLabels[announcement.priority]}
            </span>
            {announcement.is_pinned && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4.5 7.5a.5.5 0 01.5.5v4a.5.5 0 01-1 0V8a.5.5 0 01.5-.5z" />
                  <path d="M3.5 6a.5.5 0 01.5-.5h12a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H4a.5.5 0 01-.5-.5V6z" />
                  <path d="M8 6v5.5l2 1.5 2-1.5V6" />
                </svg>
                Sabitlendi
              </span>
            )}
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true, locale: tr })}
            </span>
          </div>

          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {announcement.title}
          </h3>

          <p className={`text-gray-700 dark:text-gray-300 text-sm ${!showFullContent ? 'line-clamp-3' : ''}`}>
            {announcement.content}
          </p>

          {announcement.profiles && (
            <p className="text-xs text-gray-500 mt-2">
              — {announcement.profiles.full_name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
