import { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { useAppStore, formatPrice, convertPrice, isOpenNow } from '../lib/store';

interface Props {
  open: boolean;
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
}

const SNAP_PARTIAL = 0.45;
const SNAP_FULL = 0.88;
const DISMISS_THRESHOLD = 0.25;

export function GuinnessSheet({ open, onClose }: Props) {
  const { currency } = useAppStore();
  const { data: barsWithDetails } = trpc.bars.getAllWithDetails.useQuery(undefined, { enabled: open });

  const [snapHeight, setSnapHeight] = useState(SNAP_PARTIAL);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);

  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setSnapHeight(SNAP_PARTIAL);
  }, [open]);

  // Scroll lock while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  const vh = window.innerHeight;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (listRef.current && listRef.current.scrollTop > 5) return;
    setIsDragging(true);
    startYRef.current = e.clientY;
    startHeightRef.current = snapHeight * vh;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [snapHeight, vh]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = startYRef.current - e.clientY;
    const newH = Math.max(80, Math.min(vh * 0.95, startHeightRef.current + delta));
    setDragY(newH);
  }, [isDragging, vh]);

  const handlePointerUp = useCallback((_e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const h = dragY || snapHeight * vh;
    const ratio = h / vh;
    if (ratio < DISMISS_THRESHOLD) {
      onClose();
    } else if (ratio < (SNAP_PARTIAL + SNAP_FULL) / 2) {
      setSnapHeight(SNAP_PARTIAL);
    } else {
      setSnapHeight(SNAP_FULL);
    }
    setDragY(0);
  }, [isDragging, dragY, snapHeight, vh, onClose]);

  const guinnessItems = (barsWithDetails ?? [])
    .filter(b => b.servesGuinness)
    .map(b => {
      const drinks = (b.drinks ?? []).filter((d: any) =>
        /guinness|stout/i.test(d.name)
      );
      const cheapest = drinks.length
        ? drinks.reduce((min: any, d: any) => {
            const p = convertPrice(d.price, d.currency, currency);
            return p < min.price ? { price: p, drink: d } : min;
          }, { price: Infinity, drink: drinks[0] })
        : null;
      return { bar: b, cheapest };
    })
    .filter(item => item.cheapest && item.cheapest.price !== Infinity)
    .sort((a, b) => (a.cheapest?.price ?? 999) - (b.cheapest?.price ?? 999));

  if (!open) return null;

  const sheetHeight = isDragging ? dragY : snapHeight * vh;

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: 0.5 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-[var(--color-paper)] text-[var(--color-ink)] rounded-t-2xl flex flex-col"
        style={{
          height: sheetHeight,
          transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.32,0.72,0,1)',
          willChange: 'height',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Drag handle */}
        <div className="shrink-0 flex justify-center pt-3 pb-1 cursor-grab select-none">
          <div className="w-12 h-1 rounded-full bg-[var(--color-ink)] opacity-20" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="text-eyebrow opacity-60 mb-1">PERFECT TIME FOR A GUINNESS</div>
            <h2 className="text-headline">WORTH THE<br/>WALK</h2>
          </div>
          <button
            onClick={onClose}
            className="mt-1 p-1.5 opacity-50 hover:opacity-100 !min-h-0 shrink-0"
            onPointerDown={e => e.stopPropagation()}
          >
            <X size={18} strokeWidth={1.6} />
          </button>
        </div>

        {/* Scrollable list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto"
          style={{ overscrollBehavior: 'contain' }}
          onPointerDown={e => {
            if (listRef.current && listRef.current.scrollTop > 5) {
              e.stopPropagation();
            }
          }}
        >
          {guinnessItems.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="font-display text-xl uppercase">NO STOUT IN SIGHT</div>
              <div className="text-meta opacity-60 mt-3">No Guinness pourers found yet.</div>
            </div>
          ) : (
            <ul className="pb-4">
              {guinnessItems.map(({ bar, cheapest }, i) => {
                const openState = isOpenNow(bar.openingHours);
                return (
                  <li key={bar.id}>
                    <Link
                      to={`/bar/${bar.id}`}
                      className="hairline-b-soft flex items-center gap-3 px-5 py-3.5"
                      onClick={onClose}
                      onPointerDown={e => e.stopPropagation()}
                    >
                      <span className="num-rail text-[var(--color-blaze)] w-6 shrink-0 text-sm">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-base uppercase truncate">
                          {bar.name}
                        </div>
                        <div className="text-meta opacity-55 mt-0.5 flex items-center gap-1.5">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                            openState.open ? 'bg-[var(--color-verified)]' : 'bg-[var(--color-ink)] opacity-30'
                          }`} />
                          {openState.open ? `OPEN UNTIL ${openState.closesAt}` : 'CLOSED'}
                          {' · '}
                          {bar.area?.toUpperCase()}
                        </div>
                      </div>
                      {cheapest && (
                        <div className="font-display text-lg text-[var(--color-blaze)] shrink-0">
                          {formatPrice(cheapest.price, currency)}
                        </div>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 hairline-t">
          <Link
            to="/list"
            state={{ guinnessFilter: true }}
            onClick={onClose}
            className="flex items-center justify-center gap-2 py-4 text-meta opacity-60 hover:opacity-100"
            onPointerDown={e => e.stopPropagation()}
          >
            VIEW ALL GUINNESS BARS →
          </Link>
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
