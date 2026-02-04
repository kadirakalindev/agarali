'use client';

import { useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NotificationProvider } from '@/lib/contexts/NotificationContext';

interface NotificationWrapperProps {
  children: ReactNode;
}

export function NotificationWrapper({ children }: NotificationWrapperProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setIsLoading(false);
    }

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Don't render provider until we know auth state
  if (isLoading) {
    return <>{children}</>;
  }

  return (
    <NotificationProvider userId={userId}>
      {children}
    </NotificationProvider>
  );
}
