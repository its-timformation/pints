import { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, X } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { trpc } from "../lib/trpc";
import { useAppStore, convertPrice, formatPrice, isOpenNow, distanceKm } from "../lib/store";
import { LoadingMessage } from "./LoadingMessage";

interface Props {
  open: boolean;
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
}

export function GuinnessSheet({ open, onClose, userLocation }: Props) {
  const navigate = useNavigate();
  const { currency } = useAppStore();
  const { data: allBars, isLoading } = trpc.bars.getAllWithDetails.useQuery(undefined, { enabled: open });

  const y = useMotionValue(0);
  const listRef = useRef<HTMLDivElement>(null);
  const SNAP_POINTS = [0, window.innerHeight * 0.35, window.innerHeight * 0.65];
  const DEFAULT_SNAP = window.innerHeight * 0.35;

  const backdropOpacity = useTransform(y, [0, window.innerHeight * 0.65], [0.7, 0]);

  // Animate in on open
  useEffect(() => {
    if (open) {
      y.set(window.innerHeight);
      animate(y, DEFAULT_SNAP, { type: "spring", stiffness: 400, damping: 40 });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    animate(y, window.innerHeight, { type: "spring", stiffness: 300, damping: 30 });
    setTimeout(onClose, 350);
  };

  const onDragEnd = (_: any, info: any) => {
    const velocity = info.velocity.y;
    const current = y.get();

    if (velocity > 500) {
      animate(y, window.innerHeight, { type: "spring", stiffness: 300, damping: 30 });
      setTimeout(onClose, 300);
      return;
    }
    if (velocity < -500) {
      animate(y, 0, { type: "spring", stiffness: 400, damping: 40 });
      return;
    }
    const nearest = SNAP_POINTS.reduce((a, b) =>
      Math.abs(b - current) < Math.abs(a - current) ? b : a
    );
    if (nearest >= window.innerHeight * 0.65) {
      animate(y, window.innerHeight, { type: "spring", stiffness: 300, damping: 30 });
      setTimeout(onClose, 300);
    } else {
      animate(y, nearest, { type: "spring", stiffness: 400, damping: 40 });
    }
  };

  const nearbyGuinnessBars = useMemo(() => {
    if (!allBars) return [];
    const guinnessBars = allBars.filter(b => b.servesGuinness);
    const center = userLocation || { lat: 46.1893, lng: 6.7741 };
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
    <div className="fixed inset-0 z-[90]" role="dialog" aria-label="Nearest Guinness">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black"
        style={{ opacity: backdropOpacity }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-[var(--color-paper)] text-[var(--color-ink)] rounded-t-2xl flex flex-col overflow-hidden"
        style={{ y, height: "100vh", touchAction: "none" }}
        drag="y"
        dragConstraints={{ top: 0, bottom: window.innerHeight }}
        dragElastic={0.1}
        dragDirectionLock={true}
        onDragEnd={onDragEnd}
      >
        {/* Drag handle */}
        <div
          className="shrink-0 flex flex-col items-center justify-center cursor-grab select-none"
          style={{ height: 44 }}
          aria-label="Drag to resize or dismiss"
        >
          <div className="w-12 rounded-full bg-[var(--color-ink)] opacity-30" style={{ height: 5 }} />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="text-eyebrow opacity-60">PERFECT TIME FOR A GUINNESS</div>
            <h2 className="text-headline mt-2">WORTH THE<br/>WALK</h2>
          </div>
          <button onClick={handleClose} className="p-2 -mr-2" aria-label="Close">
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>

        {/* Bar list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto pb-safe"
          onPointerDown={(e) => {
            if (listRef.current && listRef.current.scrollTop <= 0) {
              e.currentTarget.style.overflowY = 'hidden';
            }
          }}
          onPointerUp={() => {
            if (listRef.current) listRef.current.style.overflowY = 'auto';
          }}
          onPointerCancel={() => {
            if (listRef.current) listRef.current.style.overflowY = 'auto';
          }}
        >
          {isLoading ? (
            <LoadingMessage surface="guinness" className="!text-[var(--color-ink)]" />
          ) : nearbyGuinnessBars.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="font-display text-xl uppercase">NO STOUT IN SIGHT</div>
              <div className="text-meta opacity-60 mt-3">No Guinness pourers found in your area yet.</div>
            </div>
          ) : (
            <ul>
              {nearbyGuinnessBars.map((bar, i) => {
                const priceInfo = bar.guinnessPrice;
                const openState = isOpenNow(bar.openingHours);
                return (
                  <li key={bar.id}>
                    <Link
                      to={`/bar/${bar.id}`}
                      onClick={handleClose}
                      className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--color-rule-paper)] last:border-b-0"
                    >
                      <span className="num-rail text-[var(--color-blaze)] w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-base uppercase truncate">{bar.name}</div>
                        <div className="text-meta opacity-60 mt-0.5 flex items-center gap-1.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${openState.open ? "bg-[var(--color-verified)]" : "bg-[var(--color-ink)] opacity-35"}`} />
                          {openState.open ? `OPEN UNTIL ${openState.closesAt}` : `OPENS ${openState.opensAt ?? "—"}`} · {bar.distance.toFixed(1)} KM · {bar.area}
                        </div>
                      </div>
                      {priceInfo && (
                        <div className="font-display text-lg shrink-0">
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

        {/* Footer */}
        <div className="shrink-0">
          <button
            onClick={() => { handleClose(); setTimeout(() => navigate("/list", { state: { guinnessFilter: true } }), 360); }}
            className="w-full bg-[var(--color-ink)] text-[var(--color-paper)] py-4 font-display uppercase min-h-[44px]"
          >
            VIEW ALL GUINNESS BARS →
          </button>
        </div>
      </motion.div>
    </div>
  );
}

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
