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

interface PWAInstallPromptProps {
  variant?: 'floating' | 'inline' | 'banner';
  className?: string;
}

export function PWAInstallPrompt({ variant = 'floating', className = '' }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
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

    // Check if user previously dismissed
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

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
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    // If we have a deferred prompt (Chrome/Edge on Android or Desktop), use it
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      return;
    }

    // Otherwise show instructions modal
    setShowModal(true);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }, []);

  // Don't show if already installed or dismissed
  if (isStandalone || dismissed) return null;

  // Don't show on desktop browsers without install support (except for testing)
  if (!deferredPrompt && !isIOS && !isAndroid) return null;

  // Floating button variant
  if (variant === 'floating') {
    return (
      <>
        <div className={`fixed bottom-20 right-4 z-50 animate-bounce-slow ${className}`}>
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="font-medium">Uygulamayı İndir</span>
          </button>
          <button
            onClick={handleDismiss}
            className="absolute -top-2 -right-2 w-6 h-6 bg-gray-600 text-white rounded-full text-sm hover:bg-gray-700"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        {/* Instructions Modal */}
        <InstallInstructionsModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          isIOS={isIOS}
          isAndroid={isAndroid}
        />
      </>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <>
        <div className={`bg-emerald-600 text-white px-4 py-3 ${className}`}>
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <p className="text-sm">
                <strong>Agara Köyü</strong> uygulamasını telefonunuza ekleyin!
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="bg-white text-emerald-600 hover:bg-gray-100"
              >
                İndir
              </Button>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-emerald-700 rounded"
                aria-label="Kapat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <InstallInstructionsModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          isIOS={isIOS}
          isAndroid={isAndroid}
        />
      </>
    );
  }

  // Inline variant
  return (
    <>
      <Button
        onClick={handleInstallClick}
        className={className}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Uygulamayı İndir
      </Button>

      <InstallInstructionsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isIOS={isIOS}
        isAndroid={isAndroid}
      />
    </>
  );
}

// Install Instructions Modal - Shows different instructions based on device
function InstallInstructionsModal({
  isOpen,
  onClose,
  isIOS,
  isAndroid
}: {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  isAndroid: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl animate-slideUp max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {isIOS ? (
          <IOSInstructions />
        ) : isAndroid ? (
          <AndroidInstructions />
        ) : (
          <DesktopInstructions />
        )}

        <div className="mt-6 pt-4 border-t dark:border-gray-700">
          <Button onClick={onClose} className="w-full">
            Anladım
          </Button>
        </div>
      </div>
    </div>
  );
}

// iOS Instructions
function IOSInstructions() {
  return (
    <>
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-gray-600 dark:text-gray-300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          iPhone / iPad'e Ekle
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
          Safari tarayıcısında aşağıdaki adımları izleyin
        </p>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
            1
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Paylaş butonuna tıklayın
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Ekranın altında bulunan
              <span className="inline-flex items-center mx-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </span>
              simgesine tıklayın
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
            2
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              "Ana Ekrana Ekle" seçin
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Açılan menüde aşağı kaydırın ve
              <span className="inline-flex items-center mx-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ana Ekrana Ekle
              </span>
              seçeneğini bulun
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
            3
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              "Ekle" butonuna tıklayın
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Sağ üst köşedeki <strong>Ekle</strong> butonuna tıklayın
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <strong>Not:</strong> Bildirimler için iOS 16.4 veya üzeri gereklidir. Uygulama yüklendikten sonra bildirim izni istenecektir.
        </p>
      </div>
    </>
  );
}

// Android Instructions
function AndroidInstructions() {
  return (
    <>
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-green-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.523 15.341c-.5 0-.908.406-.908.908s.406.908.908.908.908-.406.908-.908-.408-.908-.908-.908m-11.046 0c-.5 0-.908.406-.908.908s.406.908.908.908.908-.406.908-.908-.408-.908-.908-.908m11.285-6.343l1.967-3.406c.109-.19.045-.433-.143-.541-.19-.109-.433-.045-.541.143l-1.994 3.453c-1.568-.713-3.327-1.11-5.193-1.11s-3.625.398-5.193 1.11l-1.994-3.453c-.109-.19-.352-.252-.541-.143-.19.109-.252.352-.143.541l1.967 3.406C2.689 10.882.5 14.133.5 17.862h23c0-3.729-2.189-6.98-5.738-8.864M6.477 14.154c-.5 0-.908-.406-.908-.908s.406-.908.908-.908.908.406.908.908-.408.908-.908.908m11.046 0c-.5 0-.908-.406-.908-.908s.406-.908.908-.908.908.406.908.908-.408.908-.908.908"/>
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Android'e Ekle
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
          Chrome tarayıcısında aşağıdaki adımları izleyin
        </p>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
            1
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Menü butonuna tıklayın
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Sağ üst köşedeki
              <span className="inline-flex items-center mx-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="12" cy="19" r="2"/>
                </svg>
              </span>
              üç nokta simgesine tıklayın
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
            2
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              "Uygulamayı yükle" seçin
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Açılan menüde
              <span className="inline-flex items-center mx-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Uygulamayı yükle
              </span>
              veya
              <span className="inline-flex items-center mx-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                Ana ekrana ekle
              </span>
              seçeneğine tıklayın
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
            3
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              "Yükle" butonuna tıklayın
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Açılan pencerede <strong>Yükle</strong> butonuna tıklayın
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          <strong>İpucu:</strong> Chrome otomatik olarak kurulum önerisi gösterirse, direkt "Yükle" butonuna tıklayabilirsiniz!
        </p>
      </div>
    </>
  );
}

// Desktop Instructions
function DesktopInstructions() {
  return (
    <>
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Bilgisayara Ekle
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">
          Chrome veya Edge tarayıcısında
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
            1
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Adres çubuğundaki simgeye tıklayın
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Adres çubuğunun sağ tarafında
              <span className="inline-flex items-center mx-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </span>
              simgesi görünecektir
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
            2
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              "Yükle" butonuna tıklayın
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Açılan pencerede <strong>Yükle</strong> butonuna tıklayın
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
