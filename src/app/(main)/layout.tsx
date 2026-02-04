import Navbar from '@/components/Navbar';
import { NotificationWrapper } from '@/components/NotificationWrapper';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';
import { NotificationPermissionPrompt } from '@/components/NotificationPermissionPrompt';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NotificationWrapper>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 pt-3 pb-24 md:pt-6 md:pb-6">
          {children}
        </main>
        <PWAInstallPrompt variant="floating" />
        <NotificationPermissionPrompt />
      </div>
    </NotificationWrapper>
  );
}
