import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { trpc } from "../lib/trpc";
import { useAppStore, convertPrice, formatPrice, isOpenNow } from "../lib/store";
import { LoadingMessage } from "../components/LoadingMessage";

type SortMode = "name" | "price" | "area";

export default function ListPage() {
  const { currency } = useAppStore();
  const { data: barsWithDetails, isLoading } = trpc.bars.getAllWithDetails.useQuery();

  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [happyOnly, setHappyOnly] = useState(false);
  const [guinnessOnly, setGuinnessOnly] = useState(false);
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("name");

  const areas = useMemo(() => {
    const set = new Set<string>();
    (barsWithDetails ?? []).forEach(b => b.area && set.add(b.area));
    return Array.from(set).sort();
  }, [barsWithDetails]);

  const enriched = useMemo(() => {
    if (!barsWithDetails) return [];
    const now = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();
    const dow = now.getDay();
    return barsWithDetails.map(b => {
      const beerDrinks = (b.drinks ?? []).filter(d =>
        /lager|beer|pint|kronen|stella|heineken|guinness|ipa|carlsberg|1664|mutzig/i.test(d.name)
      );
      const cheapest = beerDrinks.length
        ? beerDrinks.reduce((min, d) => {
            const p = convertPrice(d.price, d.currency as any, currency);
            return p < min.price ? { price: p, drink: d } : min;
          }, { price: Infinity, drink: beerDrinks[0] })
        : null;
      const hasActiveHappy = (b.deals ?? []).some(d => {
        if (!d.isActive || d.type !== "happy_hour" || !d.startTime || !d.endTime) return false;
        try {
          const days = d.daysOfWeek ? JSON.parse(d.daysOfWeek) as number[] : [0,1,2,3,4,5,6];
          if (!days.includes(dow)) return false;
          const [sh,sm] = d.startTime.split(":").map(Number);
          const [eh,em] = d.endTime.split(":").map(Number);
          return curMin >= sh*60+sm && curMin <= eh*60+em;
        } catch { return false; }
      });
      return {
        ...b,
        cheapest,
        hasActiveHappy,
        openState: isOpenNow(b.openingHours),
      };
    });
  }, [barsWithDetails, currency]);

  const filtered = useMemo(() => {
    let list = [...enriched];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(b => b.name.toLowerCase().includes(q) || b.area?.toLowerCase().includes(q));
    }
    if (openOnly) list = list.filter(b => b.openState.open);
    if (happyOnly) list = list.filter(b => b.hasActiveHappy);
    if (guinnessOnly) list = list.filter(b => b.servesGuinness);
    if (areaFilter) list = list.filter(b => b.area === areaFilter);

    list.sort((a, b) => {
      if (sort === "price") {
        const pa = a.cheapest?.price ?? Infinity;
        const pb = b.cheapest?.price ?? Infinity;
        return pa - pb;
      }
      if (sort === "area") return (a.area || "").localeCompare(b.area || "");
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [enriched, query, openOnly, happyOnly, guinnessOnly, areaFilter, sort]);

  if (isLoading) return <LoadingMessage surface="list" />;

  return (
    <div className="grain-ink min-h-full">
      <section className="px-4 pt-5 pb-3">
        <div className="text-eyebrow text-[var(--color-blaze)] mb-3">DIRECTORY · {(barsWithDetails?.length ?? 0).toString().padStart(2,"0")} BARS</div>
        <h1 className="text-headline">EVERY BAR<br/>ON THE<br/>MOUNTAIN</h1>
      </section>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 border border-[var(--color-rule)] px-3">
          <Search size={16} strokeWidth={1.6} className="opacity-50 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bars or resorts"
            className="w-full bg-transparent py-2.5 focus:outline-none placeholder:text-[var(--color-paper)] placeholder:opacity-40"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-4 mb-1 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        <Pill active={openOnly} onClick={() => setOpenOnly(!openOnly)}>OPEN NOW</Pill>
        <Pill active={happyOnly} onClick={() => setHappyOnly(!happyOnly)}>HAPPY HOUR</Pill>
        <Pill active={guinnessOnly} onClick={() => setGuinnessOnly(!guinnessOnly)}>POURS GUINNESS</Pill>
        {areas.map(a => (
          <Pill key={a} active={areaFilter === a} onClick={() => setAreaFilter(areaFilter === a ? null : a)}>
            {a.toUpperCase()}
          </Pill>
        ))}
      </div>

      {/* Sort */}
      <div className="px-4 pb-2 flex justify-end">
        <select value={sort} onChange={e => setSort(e.target.value as SortMode)}
          className="bg-transparent text-meta opacity-70 border-none focus:outline-none uppercase">
          <option value="name" className="bg-[var(--color-ink)]">SORT · NAME</option>
          <option value="price" className="bg-[var(--color-ink)]">SORT · PRICE</option>
          <option value="area" className="bg-[var(--color-ink)]">SORT · AREA</option>
        </select>
      </div>

      {/* List */}
      <ul className="px-4 pb-6">
        {filtered.length === 0 && (
          <li className="py-12 text-center text-meta opacity-55">No bars match your filters.</li>
        )}
        {filtered.map((bar, i) => (
          <li key={bar.id}>
            <Link to={`/bar/${bar.id}`} className="hairline-b-soft last:border-b-0 flex items-center gap-3 py-3">
              <span className="num-rail text-[var(--color-blaze)] w-7 shrink-0">{String(i+1).padStart(2,"0")}</span>
              <div className="flex-1 min-w-0">
                <div className="font-display text-base uppercase truncate text-[var(--color-paper)]">{bar.name}</div>
                <div className="text-meta opacity-60 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${bar.openState.open ? "bg-[var(--color-verified)]" : "bg-[var(--color-paper)] opacity-35"}`} />
                  {bar.area?.toUpperCase()}
                  {bar.hasActiveHappy && <span className="text-[var(--color-sun)]">· HAPPY NOW</span>}
                </div>
              </div>
              {bar.cheapest && (
                <div className={`font-display text-lg text-[var(--color-sun)] ${!bar.openState.open ? "opacity-55" : ""}`}>
                  {formatPrice(bar.cheapest.price, currency)}
                </div>
              )}
              <ChevronRight size={14} strokeWidth={1.4} className="opacity-50 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pill({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 px-3 py-1.5 text-meta uppercase whitespace-nowrap !min-h-0 ${active ? "bg-[var(--color-blaze)] text-[var(--color-paper)]" : "border border-[var(--color-rule)] opacity-70"}`}>
      {children}
    </button>
  );
}
