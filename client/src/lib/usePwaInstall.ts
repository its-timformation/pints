import { useEffect, useState } from 'react';

type InstallState =
  | 'installed'
  | 'installable'
  | 'ios'
  | 'unsupported';

interface PwaInstall {
  state: InstallState;
  triggerInstall: () => Promise<'accepted' | 'dismissed' | null>;
  bannerDismissed: boolean;
  dismissBanner: () => void;
}

const DISMISSED_KEY = 'pds-install-banner-dismissed';

export function usePwaInstall(): PwaInstall {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [state, setState] = useState<InstallState>('unsupported');
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem(DISMISSED_KEY) === 'true'
  );

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true) {
      setState('installed');
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIos && isSafari) {
      setState('ios');
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setState('installable');
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setState('installed'));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return null;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') setState('installed');
    return outcome as 'accepted' | 'dismissed';
  };

  const dismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem(DISMISSED_KEY, 'true');
  };

  return { state, triggerInstall, bannerDismissed, dismissBanner };
}
