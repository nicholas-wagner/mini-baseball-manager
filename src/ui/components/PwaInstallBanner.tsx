import { useEffect, useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { ComicButton } from '../design-system/ComicButton';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Custom Android PWA Install Prompt Banner & Offline-Ready Status Pill.
 * Stays unobtrusive unless the browser offers native install or the device goes offline.
 */
export function PwaInstallBanner() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [offlineDismissed, setOfflineDismissed] = useState(false);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onOnline = () => setIsOffline(false);
    const onOffline = () => {
      setIsOffline(true);
      setOfflineDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const showInstall = Boolean(installEvent && !dismissed);
  const showOfflineOnly = isOffline && !showInstall && !offlineDismissed;

  if (!showInstall && !showOfflineOnly) {
    return null;
  }

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallEvent(null);
    } else {
      setDismissed(true);
    }
  };

  if (showOfflineOnly) {
    return (
      <div
        data-testid="pwa-install-banner"
        className="mb-2 px-2.5 py-1 rounded-xl border-2 border-[#181B2C] bg-[#FFF3BF] shadow-[2px_2px_0_#181B2C] flex items-center justify-between gap-2 text-[11px] font-extrabold text-[#181B2C]"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#181B2C] text-[#FFD166] text-[10px] shrink-0">
            <WifiOff className="w-3 h-3" />
            OFFLINE READY
          </span>
          <span className="truncate">Local saves, 3D &amp; audio ready.</span>
        </div>
        <button
          type="button"
          data-testid="dismiss-offline-banner"
          aria-label="Dismiss offline banner"
          onClick={() => setOfflineDismissed(true)}
          className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-[#181B2C] bg-white hover:bg-[#FBF4E4] shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      data-testid="pwa-install-banner"
      className="mb-3 p-2.5 rounded-2xl border-2 border-[#181B2C] bg-[#FFF3BF] shadow-[3px_3px_0_#181B2C] flex flex-wrap items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2 text-xs font-extrabold text-[#181B2C]">
        {isOffline ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#181B2C] text-[#FFD166]">
            <WifiOff className="w-3.5 h-3.5" />
            OFFLINE READY
          </span>
        ) : null}
        <span>
          Install Mini Baseball Manager on your device for instant 100% offline play!
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <ComicButton
          size="sm"
          variant="turf"
          icon={<Download className="w-3.5 h-3.5" />}
          onClick={() => void handleInstall()}
        >
          Install App
        </ComicButton>
        <button
          type="button"
          aria-label="Dismiss install banner"
          onClick={() => setDismissed(true)}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border-2 border-[#181B2C] bg-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
