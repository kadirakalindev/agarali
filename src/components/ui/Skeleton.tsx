'use client';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
  );
}

export function PostSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-4">
      <div className="flex items-center space-x-3 mb-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <Skeleton className="h-48 w-full rounded-lg mb-4" />
      <div className="flex space-x-4">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function StorySkeleton() {
  return (
    <div className="flex-shrink-0 flex flex-col items-center">
      <Skeleton className="w-16 h-16 rounded-full" />
      <Skeleton className="h-3 w-12 mt-2" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
        <Skeleton className="w-24 h-24 rounded-full" />
        <div className="flex-1 text-center md:text-left">
          <Skeleton className="h-6 w-40 mb-2 mx-auto md:mx-0" />
          <Skeleton className="h-4 w-24 mb-4 mx-auto md:mx-0" />
          <div className="flex justify-center md:justify-start space-x-6">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <div className="p-6">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="p-4 flex items-start space-x-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}
