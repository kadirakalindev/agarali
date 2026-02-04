'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

type OnboardingStep = 'idle' | 'install' | 'notification' | 'done';

export function PWAOnboarding() {
  const [step, setStep] = useState<OnboardingStep>('idle');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Check if already completed onboarding
    const onboardingDone = localStorage.getItem('pwa-onboarding-done');
    if (onboardingDone) {
      setStep('done');
      return;
    }

    // Check if already installed (standalone mode)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(isInStandaloneMode);

    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice = /ipad|iphone|ipod/.test(userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    const isAndroidDevice = /android/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      // Move to notification step after install
      if (step === 'install') {
        setTimeout(() => goToNotificationStep(), 1000);
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Start onboarding after 5 seconds (give user time to look around)
    const timer = setTimeout(() => {
      // If on mobile and not installed, start with install step
      if ((isIOSDevice || isAndroidDevice) && !isInStandaloneMode) {
        setStep('install');
      } else {
        // Desktop or already installed - go to notification step
        goToNotificationStep();
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToNotificationStep = useCallback(() => {
    // Check if notifications are supported and not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      setStep('notification');
    } else {
      finishOnboarding();
    }
  }, []);

  const finishOnboarding = useCallback(() => {
    localStorage.setItem('pwa-onboarding-done', 'true');
    setStep('done');
  }, []);

  // Handle install button click
  const handleInstall = useCallback(async () => {
    // For Android with Chrome - use native prompt
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        // Wait a bit then move to notifications
        setTimeout(() => goToNotificationStep(), 1500);
      }
      return;
    }

    // For iOS or browsers without native prompt - show instructions
    setShowInstructions(true);
  }, [deferredPrompt, goToNotificationStep]);

  // Handle skip install
  const handleSkipInstall = useCallback(() => {
    goToNotificationStep();
  }, [goToNotificationStep]);

  // Handle notification permission
  const handleNotificationPermission = useCallback(async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted' && 'serviceWorker' in navigator) {
        await navigator.serviceWorker.ready;
      }
    } catch (error) {
      console.error('Notification permission error:', error);
    }
    finishOnboarding();
  }, [finishOnboarding]);

  // Handle skip notification
  const handleSkipNotification = useCallback(() => {
    finishOnboarding();
  }, [finishOnboarding]);

  // Close instructions and continue
  const handleInstructionsClose = useCallback(() => {
    setShowInstructions(false);
    goToNotificationStep();
  }, [goToNotificationStep]);

  // Don't render if done or idle
  if (step === 'done' || step === 'idle') return null;

  // Show instructions modal for iOS/manual install
  if (showInstructions) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fadeIn">
        <div
          className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl animate-slideUp max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {isIOS ? <IOSInstructions /> : <AndroidInstructions />}

          <Button onClick={handleInstructionsClose} className="w-full mt-6 py-4 text-lg">
            Tamam, Anladım
          </Button>
        </div>
      </div>
    );
  }

  // Install step
  if (step === 'install') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fadeIn">
        <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl animate-slideUp">
          <div className="text-center mb-8">
            {/* App Icon */}
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <span className="text-white text-4xl font-bold">A</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Agara Köyü Uygulaması
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Uygulamayı telefonunuza yükleyin, her zaman kolayca ulaşın!
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleInstall}
              className="w-full py-5 text-xl font-semibold"
            >
              <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Uygulamayı Yükle
            </Button>

            <button
              onClick={handleSkipInstall}
              className="w-full py-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg font-medium transition-colors"
            >
              Şimdi Değil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Notification step
  if (step === 'notification') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fadeIn">
        <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl animate-slideUp">
          <div className="text-center mb-8">
            {/* Bell Icon */}
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Bildirimleri Açın
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Beğeniler, yorumlar ve köyden haberler için bildirim alın!
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleNotificationPermission}
              className="w-full py-5 text-xl font-semibold"
            >
              <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Bildirimleri Aç
            </Button>

            <button
              onClick={handleSkipNotification}
              className="w-full py-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-lg font-medium transition-colors"
            >
              Şimdi Değil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// iOS Instructions - Simplified and larger
function IOSInstructions() {
  return (
    <>
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          iPhone'a Nasıl Eklenir?
        </h3>
      </div>

      <div className="space-y-6">
        {/* Step 1 */}
        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xl font-bold">
            1
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Paylaş butonuna tıklayın
            </p>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              Altta şu butona tıklayın:
              <span className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </span>
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xl font-bold">
            2
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              "Ana Ekrana Ekle" seçin
            </p>
            <p className="text-gray-500 mt-1">
              Aşağı kaydırın, <strong>Ana Ekrana Ekle</strong> yazısını bulun
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xl font-bold">
            3
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              "Ekle" butonuna tıklayın
            </p>
            <p className="text-gray-500 mt-1">
              Sağ üstteki <strong>Ekle</strong> butonuna tıklayın
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// Android Instructions - Simplified and larger
function AndroidInstructions() {
  return (
    <>
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-green-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.523 15.341c-.5 0-.908.406-.908.908s.406.908.908.908.908-.406.908-.908-.408-.908-.908-.908m-11.046 0c-.5 0-.908.406-.908.908s.406.908.908.908.908-.406.908-.908-.408-.908-.908-.908m11.285-6.343l1.967-3.406c.109-.19.045-.433-.143-.541-.19-.109-.433-.045-.541.143l-1.994 3.453c-1.568-.713-3.327-1.11-5.193-1.11s-3.625.398-5.193 1.11l-1.994-3.453c-.109-.19-.352-.252-.541-.143-.19.109-.252.352-.143.541l1.967 3.406C2.689 10.882.5 14.133.5 17.862h23c0-3.729-2.189-6.98-5.738-8.864M6.477 14.154c-.5 0-.908-.406-.908-.908s.406-.908.908-.908.908.406.908.908-.408.908-.908.908m11.046 0c-.5 0-.908-.406-.908-.908s.406-.908.908-.908.908.406.908.908-.408.908-.908.908"/>
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Android'e Nasıl Eklenir?
        </h3>
      </div>

      <div className="space-y-6">
        {/* Step 1 */}
        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xl font-bold">
            1
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Menü butonuna tıklayın
            </p>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              Sağ üstte şu butona tıklayın:
              <span className="inline-flex items-center px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2.5"/>
                  <circle cx="12" cy="12" r="2.5"/>
                  <circle cx="12" cy="19" r="2.5"/>
                </svg>
              </span>
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xl font-bold">
            2
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              "Uygulamayı yükle" seçin
            </p>
            <p className="text-gray-500 mt-1">
              Menüde <strong>Uygulamayı yükle</strong> veya <strong>Ana ekrana ekle</strong> seçin
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 text-xl font-bold">
            3
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              "Yükle" butonuna tıklayın
            </p>
            <p className="text-gray-500 mt-1">
              Açılan pencerede <strong>Yükle</strong> butonuna tıklayın
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
        <p className="text-emerald-700 dark:text-emerald-400 text-center">
          💡 <strong>İpucu:</strong> Chrome otomatik "Yükle" penceresi açarsa, direkt ona tıklayın!
        </p>
      </div>
    </>
  );
}
