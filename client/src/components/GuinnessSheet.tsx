import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, X } from "lucide-react";
import { trpc } from "../lib/trpc";
import { useAppStore, convertPrice, formatPrice, isOpenNow, distanceKm } from "../lib/store";
import { LoadingMessage } from "./LoadingMessage";

interface Props {
  open: boolean;
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
}

// Snap points: 0 = 35vh visible, 1 = 65vh visible, 2 = 90vh visible
// Sheet is 90vh tall; translateY shifts it up from the bottom.
// translate % of window height: snap 0 → 55%, snap 1 → 25%, snap 2 → 0%
const SNAP_TRANSLATE_PCT = [55, 25, 0];
const SNAP_BACKDROP = [0.35, 0.55, 0.72];
const VELOCITY_THRESHOLD = 0.4; // px/ms

export function GuinnessSheet({ open, onClose, userLocation }: Props) {
  const navigate = useNavigate();
  const { currency } = useAppStore();
  const { data: allBars, isLoading } = trpc.bars.getAllWithDetails.useQuery(undefined, { enabled: open });

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const velocitySamples = useRef<Array<{ y: number; t: number }>>([]);
  const [snap, setSnap] = useState<0 | 1 | 2>(1); // start at 65vh
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Reset when sheet opens/closes
  useEffect(() => {
    if (!open) {
      setSnap(1);
      setDragOffset(0);
      setIsDragging(false);
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  // Window-level mouse events while dragging
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (dragStartY.current === null) return;
      const offset = e.clientY - dragStartY.current;
      setDragOffset(offset);
      velocitySamples.current.push({ y: e.clientY, t: Date.now() });
      if (velocitySamples.current.length > 6) velocitySamples.current.shift();
    };
    const onUp = (e: MouseEvent) => {
      if (dragStartY.current === null) return;
      commitDrag(e.clientY - dragStartY.current);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, snap]); // eslint-disable-line react-hooks/exhaustive-deps

  function startDrag(clientY: number) {
    dragStartY.current = clientY;
    velocitySamples.current = [{ y: clientY, t: Date.now() }];
    setIsDragging(true);
  }

  function moveDrag(clientY: number) {
    if (dragStartY.current === null) return;
    setDragOffset(clientY - dragStartY.current);
    velocitySamples.current.push({ y: clientY, t: Date.now() });
    if (velocitySamples.current.length > 6) velocitySamples.current.shift();
  }

  function commitDrag(offset: number) {
    const samples = velocitySamples.current;
    let velocity = 0;
    if (samples.length >= 2) {
      const last = samples[samples.length - 1];
      const first = samples[0];
      const dt = last.t - first.t;
      if (dt > 0) velocity = (last.y - first.y) / dt;
    }

    // Determine next snap
    let nextSnap: 0 | 1 | 2 = snap;
    const goingUp = velocity < -VELOCITY_THRESHOLD || offset < -60;
    const goingDown = velocity > VELOCITY_THRESHOLD || offset > 60;

    if (goingUp) {
      nextSnap = Math.min(snap + 1, 2) as 0 | 1 | 2;
    } else if (goingDown) {
      if (snap === 0) {
        // Close from lowest snap
        dragStartY.current = null;
        setDragOffset(0);
        setIsDragging(false);
        onClose();
        return;
      }
      nextSnap = Math.max(snap - 1, 0) as 0 | 1 | 2;
    }

    dragStartY.current = null;
    velocitySamples.current = [];
    setSnap(nextSnap);
    setDragOffset(0);
    setIsDragging(false);
  }

  const onTouchStart = (e: React.TouchEvent) => startDrag(e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => moveDrag(e.touches[0].clientY);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    commitDrag(e.changedTouches[0].clientY - dragStartY.current);
  };
  const onMouseDown = (e: React.MouseEvent) => startDrag(e.clientY);

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

  const baseTranslatePct = SNAP_TRANSLATE_PCT[snap];
  const backdropOpacity = SNAP_BACKDROP[snap];

  const sheetStyle = {
    height: "90vh",
    transform: `translateY(calc(${baseTranslatePct}vh + ${dragOffset}px))`,
    transition: isDragging ? "none" : "transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
  };

  const backdropStyle = {
    opacity: backdropOpacity,
    transition: isDragging ? "none" : "opacity 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col" role="dialog" aria-label="Nearest Guinness">
      {/* Dimmed backdrop */}
      <div
        className="absolute inset-0 bg-[var(--color-ink)]"
        style={backdropStyle}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative mt-auto bg-[var(--color-paper)] text-[var(--color-ink)] sheet-enter flex flex-col overflow-hidden"
        style={sheetStyle}
      >
        {/* 44px drag strip */}
        <div
          className="shrink-0 flex flex-col items-center justify-center cursor-grab touch-none select-none"
          style={{ height: 44 }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          aria-label="Drag to resize or dismiss"
        >
          <div className="w-10 h-1 bg-[var(--color-ink)] opacity-20 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="text-eyebrow opacity-60">PERFECT TIME FOR A GUINNESS</div>
            <h2 className="text-headline mt-2">WORTH THE<br/>WALK</h2>
          </div>
          <button onClick={onClose} className="p-2 -mr-2" aria-label="Close">
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>

        {/* Bar list — scrollable */}
        <div className="flex-1 overflow-y-auto">
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
                      onClick={onClose}
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
            onClick={() => { onClose(); navigate("/list", { state: { guinnessFilter: true } }); }}
            className="w-full bg-[var(--color-ink)] text-[var(--color-paper)] py-4 font-display uppercase min-h-[44px]"
          >
            VIEW ALL GUINNESS BARS →
          </button>
        </div>
      </div>
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
