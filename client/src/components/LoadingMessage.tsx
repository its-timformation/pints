import { useEffect, useState } from "react";
import { loadingMessage, type LoadingSurface } from "../lib/loadingMessages";

interface Props {
  surface: LoadingSurface;
  className?: string;
}

/**
 * Inline themed loading state. Refreshes the message every 3 seconds so longer
 * loads don't feel stuck.
 */
export function LoadingMessage({ surface, className = "" }: Props) {
  const [seed, setSeed] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setSeed(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  const msg = loadingMessage(surface, seed);
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`} role="status" aria-live="polite">
      <div className="text-eyebrow text-[var(--color-blaze)] mb-3">LOADING</div>
      <div className="font-display text-2xl uppercase text-[var(--color-paper)] leading-none max-w-[26ch]">
        {msg}…
      </div>
      <div className="mt-6 h-px w-24 bg-[var(--color-blaze)] opacity-60 animate-pulse" />
    </div>
  );
}
