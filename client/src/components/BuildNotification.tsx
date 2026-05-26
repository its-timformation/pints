import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'pds-last-seen-build';

export function BuildNotification({ isAdmin }: { isAdmin: boolean }) {
  const [visible, setVisible] = useState(false);
  const buildHash = __BUILD_HASH__;
  const buildTime = __BUILD_TIME__;

  useEffect(() => {
    if (!isAdmin) return;
    if (buildHash === 'local') return;
    try {
      const lastSeen = localStorage.getItem(STORAGE_KEY);
      if (lastSeen !== buildHash) setVisible(true);
    } catch {}
  }, [isAdmin, buildHash]);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, buildHash); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  const builtAt = new Date(buildTime);
  const timeStr = builtAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });
  const dateStr = builtAt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Europe/London' });

  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-[200] px-3 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="bg-[var(--color-blaze)] text-[var(--color-paper)] flex items-center gap-3 px-4 py-3 shadow-lg">
          <span className="shrink-0 relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-paper)] opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-paper)]" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm uppercase leading-none">NEW BUILD LIVE</div>
            <div className="text-meta opacity-80 mt-0.5">{dateStr} · {timeStr} · #{buildHash}</div>
          </div>
          <button onClick={dismiss} className="shrink-0 p-1.5 hover:opacity-70 transition-opacity !min-h-0" aria-label="Dismiss">
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
