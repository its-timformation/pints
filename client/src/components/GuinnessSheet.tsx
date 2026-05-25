import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, X } from "lucide-react";
import { trpc } from "../lib/trpc";
import { useAppStore, convertPrice, formatPrice, isOpenNow, distanceKm } from "../lib/store";
import { LoadingMessage } from "./LoadingMessage";

interface Props {
  open: boolean;
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
}

/**
 * Slides up from the foot of the screen showing the closest bars that pour
 * Guinness. Type-only banner — no glass illustration.
 */
export function GuinnessSheet({ open, onClose, userLocation }: Props) {
  const { currency } = useAppStore();
  const { data: allBars, isLoading } = trpc.bars.getAllWithDetails.useQuery(undefined, { enabled: open });

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  const nearbyGuinnessBars = useMemo(() => {
    if (!allBars) return [];
    const guinnessBars = allBars.filter(b => b.servesGuinness);
    const center = userLocation || { lat: 46.1893, lng: 6.7741 }; // Avoriaz fallback
    return guinnessBars
      .map(b => {
        const g = (b.drinks ?? []).find(d => d.name.toLowerCase().includes("guinness"));
        return {
          ...b,
          distance: distanceKm(center, { lat: b.lat, lng: b.lng }),
          guinnessPrice: g ? { price: g.price, currency: g.currency } : null,
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8);
  }, [allBars, userLocation]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col" role="dialog" aria-label="Nearest Guinness">
      {/* Dimmed backdrop */}
      <button className="absolute inset-0 bg-[var(--color-ink)] opacity-70" onClick={onClose} aria-label="Close" />

      {/* Sheet */}
      <div className="relative mt-auto bg-[var(--color-paper)] text-[var(--color-ink)] sheet-enter max-h-[85vh] flex flex-col">
        {/* Drag handle */}
        <button onClick={onClose} className="self-center mt-3 mb-1 py-2 px-6" aria-label="Close panel">
          <div className="w-10 h-1 bg-[var(--color-ink)] opacity-25 rounded" />
        </button>

        {/* Header */}
        <div className="px-5 pb-3 flex items-start justify-between gap-4">
          <div>
            <div className="text-eyebrow opacity-60">PERFECT TIME FOR A GUINNESS</div>
            <h2 className="text-headline mt-2">WORTH THE<br/>WALK</h2>
          </div>
          <button onClick={onClose} className="p-2 -mr-2" aria-label="Close">
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>

        {/* Bar list */}
        <div className="flex-1 overflow-y-auto pb-safe">
          {isLoading ? (
            <LoadingMessage surface="guinness" className="!text-[var(--color-ink)]" />
          ) : nearbyGuinnessBars.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-section uppercase">NO STOUT IN SIGHT</div>
              <div className="text-meta opacity-60 mt-3">No Guinness pourers found in your area yet. Help us out by reporting one.</div>
            </div>
          ) : (
            <ul>
              {nearbyGuinnessBars.map((bar, i) => {
                const priceInfo = bar.guinnessPrice;
                const open = isOpenNow(bar.openingHours);
                return (
                  <li key={bar.id}>
                    <Link
                      to={`/bar/${bar.id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-rule-paper)] last:border-b-0"
                    >
                      <span className="num-rail text-[var(--color-blaze)] w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-base uppercase truncate">{bar.name}</div>
                        <div className="text-meta opacity-60 mt-0.5 flex items-center gap-1.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${open.open ? "bg-[var(--color-verified)]" : "bg-[var(--color-ink)] opacity-35"}`} />
                          {open.open ? `OPEN UNTIL ${open.closesAt}` : `OPENS ${open.opensAt ?? "—"}`} · {bar.distance.toFixed(1)} KM · {bar.area}
                        </div>
                      </div>
                      {priceInfo && (
                        <div className="font-display text-lg">
                          {formatPrice(convertPrice(priceInfo.price, priceInfo.currency as any, currency), currency)}
                        </div>
                      )}
                      <ChevronRight size={14} strokeWidth={1.4} className="opacity-50 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The dashboard banner that triggers the sheet — type-only, with the cream
 * "Perfect time for a Guinness" tagline and an up-arrow chevron.
 */
export function GuinnessBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full grain-paper text-[var(--color-ink)] px-5 py-4 border-t-2 border-[var(--color-ink)] flex items-center justify-between gap-4 hover:bg-[var(--color-paper-soft)] transition-colors"
      aria-label="See the nearest Guinness"
    >
      <div className="text-left">
        <div className="text-eyebrow opacity-60">PERFECT TIME FOR</div>
        <div className="font-display text-2xl uppercase leading-none mt-1.5">A GUINNESS</div>
      </div>
      <svg width="14" height="16" viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M7 14 L7 2 M2 7 L7 2 L12 7" />
      </svg>
    </button>
  );
}
