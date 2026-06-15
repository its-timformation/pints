import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  state: 'installable' | 'ios';
  onInstall: () => Promise<any>;
  onDismiss: () => void;
}

export function InstallBanner({ state, onInstall, onDismiss }: Props) {
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [installing, setInstalling] = useState(false);

  async function handleInstall() {
    if (state === 'ios') {
      setShowIosSteps(true);
      return;
    }
    setInstalling(true);
    await onInstall();
    setInstalling(false);
  }

  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-[80] px-3 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div className="bg-[var(--color-paper)] text-[var(--color-ink)] border-2 border-[var(--color-ink)] shadow-lg">
          {!showIosSteps ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden">
                <svg width="40" height="40" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clip-path="url(#clip0_banner)">
                  <path d="M394.24 0H117.76C52.7229 0 0 52.7229 0 117.76V394.24C0 459.277 52.7229 512 117.76 512H394.24C459.277 512 512 459.277 512 394.24V117.76C512 52.7229 459.277 0 394.24 0Z" fill="#EA4118"/>
                  <path d="M441.932 128L423.79 498.991C422.195 531.479 395.39 557 362.863 557H361.137C328.61 557 301.805 531.479 300.21 498.991L282.142 130.991C282.092 129.989 282.069 128.992 282.068 128H441.932Z" fill="#16100E"/>
                  <ellipse cx="362" cy="128.5" rx="80" ry="21.5" fill="#F3ECDD"/>
                  <path d="M229.932 128L211.79 498.991C210.195 531.479 183.39 557 150.863 557H149.137C116.61 557 89.805 531.479 88.21 498.991L70.1416 130.991C70.0693 128.992 70.0684 128H229.932Z" fill="#16100E"/>
                  <path d="M230 128.5C230 140.374 194.183 150 150 150C105.817 150 70 140.374 70 128.5C70 116.626 105.817 107 150 107C194.183 107 230 116.626 230 128.5Z" fill="#F3ECDD"/>
                  </g>
                  <defs>
                  <clipPath id="clip0_banner">
                    <rect width="512" height="512" rx="118" fill="white"/>
                  </clipPath>
                  </defs>
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-display text-sm uppercase leading-none">ADD TO HOME SCREEN</div>
                <div className="text-meta opacity-60 mt-0.5">
                  {state === 'ios' ? 'Install for the best experience' : 'Install the app for quick access'}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="bg-[var(--color-ink)] text-[var(--color-paper)] px-3 py-1.5 text-meta disabled:opacity-50 !min-h-0"
                >
                  {installing ? '...' : 'INSTALL'}
                </button>
                <button onClick={onDismiss} className="p-1 opacity-50 hover:opacity-100 !min-h-0" aria-label="Dismiss">
                  <X size={16} strokeWidth={1.6} />
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-display text-sm uppercase">ADD TO HOME SCREEN</div>
                <button onClick={onDismiss} className="p-1 opacity-50 hover:opacity-100 !min-h-0">
                  <X size={16} strokeWidth={1.6} />
                </button>
              </div>
              <ol className="space-y-2">
                {[
                  'Tap the Share button in Safari (the box with an arrow)',
                  'Scroll down and tap "Add to Home Screen"',
                  'Tap "Add" in the top right corner',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-blaze)] text-[var(--color-paper)] flex items-center justify-center text-[11px] font-display mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-meta leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
              <button onClick={onDismiss} className="mt-4 w-full border border-[var(--color-rule)] py-2 text-meta opacity-60">
                GOT IT
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
