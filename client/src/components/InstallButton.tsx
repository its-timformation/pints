import { Download } from 'lucide-react';

interface Props {
  state: 'installable' | 'ios';
  onInstall: () => void;
}

export function InstallButton({ state: _state, onInstall }: Props) {
  return (
    <button
      onClick={onInstall}
      title="Install app"
      aria-label="Install Pints du Soleil"
      className="flex items-center gap-1.5 px-2 py-1 text-meta opacity-40 hover:opacity-80 transition-opacity !min-h-0 border border-current rounded-sm"
    >
      <Download size={12} strokeWidth={1.8} />
      <span className="text-[10px] tracking-widest uppercase">Install</span>
    </button>
  );
}
