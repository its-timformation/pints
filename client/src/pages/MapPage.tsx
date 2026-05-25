import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Link, useSearchParams } from "react-router-dom";
import { trpc } from "../lib/trpc";
import { useAppStore, convertPrice, formatPrice, isOpenNow } from "../lib/store";
import { LoadingMessage } from "../components/LoadingMessage";
import "leaflet/dist/leaflet.css";

// Custom diamond pin
function makePin(color: string, hasDeal = false) {
  const dealRing = hasDeal ? `<rect x="2" y="2" width="20" height="20" transform="rotate(45 12 12)" fill="none" stroke="#F2C12E" stroke-width="1.5" />` : "";
  return L.divIcon({
    html: `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        ${dealRing}
        <rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)" fill="${color}" stroke="#0A0908" stroke-width="1.2"/>
        <circle cx="12" cy="12" r="2" fill="#0A0908" />
      </svg>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const PIN_BAR = makePin("#E63E0B");
const PIN_DEAL = makePin("#F2C12E", true);

function FocusController({ focusId, bars }: { focusId?: number; bars: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (!focusId || !bars.length) return;
    const target = bars.find(b => b.id === focusId);
    if (target) map.setView([target.lat, target.lng], 15, { animate: true });
  }, [focusId, bars, map]);
  return null;
}

export default function MapPage() {
  const { currency } = useAppStore();
  const { data: barsWithDetails, isLoading } = trpc.bars.getAllWithDetails.useQuery();
  const { data: deals } = trpc.bars.getDeals.useQuery();
  const [params] = useSearchParams();
  const focusId = params.get("focus") ? Number(params.get("focus")) : undefined;

  const center = useMemo<[number, number]>(() => {
    if (!barsWithDetails?.length) return [46.2, 6.74];
    const avgLat = barsWithDetails.reduce((s, b) => s + b.lat, 0) / barsWithDetails.length;
    const avgLng = barsWithDetails.reduce((s, b) => s + b.lng, 0) / barsWithDetails.length;
    return [avgLat, avgLng];
  }, [barsWithDetails]);

  if (isLoading) return <LoadingMessage surface="map" />;

  const barsWithDealsSet = new Set((deals ?? []).filter(d => d.isActive).map(d => d.barId));

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="px-4 py-3 hairline-b flex items-center justify-between">
        <div>
          <div className="text-eyebrow text-[var(--color-blaze)]">DISPATCH 02 · ATLAS</div>
          <div className="font-display text-lg uppercase mt-0.5">EVERY PIN, EVERY PINT</div>
        </div>
        <div className="text-meta opacity-55">{(barsWithDetails?.length ?? 0).toString().padStart(2,"0")} BARS</div>
      </div>

      <div className="flex-1 relative">
        <MapContainer center={center} zoom={11} className="absolute inset-0">
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          <FocusController focusId={focusId} bars={barsWithDetails ?? []} />
          {(barsWithDetails ?? []).map((bar) => {
            const beerDrinks = (bar.drinks ?? []).filter(d =>
              /lager|beer|pint|kronen|stella|heineken|guinness|ipa|1664/i.test(d.name)
            );
            const cheapest = beerDrinks.length
              ? beerDrinks.reduce((min, d) => {
                  const p = convertPrice(d.price, d.currency as any, currency);
                  return p < min.price ? { price: p, drink: d } : min;
                }, { price: Infinity, drink: beerDrinks[0] })
              : null;
            const open = isOpenNow(bar.openingHours);
            return (
              <Marker key={bar.id} position={[bar.lat, bar.lng]} icon={barsWithDealsSet.has(bar.id) ? PIN_DEAL : PIN_BAR}>
                <Popup className="custom-popup">
                  <Link to={`/bar/${bar.id}`} className="block p-3 min-w-[180px]">
                    <div className="text-eyebrow text-[var(--color-blaze)]">{bar.area?.toUpperCase()}</div>
                    <div className="font-display text-base uppercase text-[var(--color-paper)] mt-1">{bar.name}</div>
                    <div className="text-meta opacity-60 mt-1 flex items-center gap-1.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${open.open ? "bg-[var(--color-verified)]" : "bg-[var(--color-paper)] opacity-35"}`} />
                      {open.open ? `OPEN UNTIL ${open.closesAt}` : `OPENS ${open.opensAt ?? "—"}`}
                    </div>
                    {cheapest && (
                      <div className="font-display text-lg text-[var(--color-sun)] mt-2">
                        {formatPrice(cheapest.price, currency)}
                      </div>
                    )}
                  </Link>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="absolute top-3 right-3 bg-[var(--color-ink)] border border-[var(--color-rule)] p-2.5 text-meta z-[400]">
          <div className="flex items-center gap-2 mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)" fill="#E63E0B" stroke="#0A0908" strokeWidth="1.2"/></svg>
            <span>BAR</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24">
              <rect x="2" y="2" width="20" height="20" transform="rotate(45 12 12)" fill="none" stroke="#F2C12E" strokeWidth="1.5"/>
              <rect x="5" y="5" width="14" height="14" transform="rotate(45 12 12)" fill="#E63E0B" stroke="#0A0908" strokeWidth="1.2"/>
            </svg>
            <span>HAS DEAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
