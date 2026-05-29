import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import { trpc } from "../lib/trpc";
import { isVerifiedStale } from "../lib/store";
import { LoadingMessage } from "../components/LoadingMessage";
import { GroupedList } from "../components/admin/GroupedList";

interface Props { onBack: () => void; }

type SortMode = 'DRINK' | 'BAR' | 'AREA' | 'PRICE';
type DrinkEntry = { barId: number; barName: string; area: string | null; drink: any };

function getDrinkType(name: string): string {
  const n = name.toLowerCase();
  if (/coffee|espresso|hot choc|vin chaud|mulled|jägertee|jaegertee|\btea\b/.test(n)) return 'HOT';
  if (/lager|beer|\bpint\b|ale|stout|guinness|\bipa\b|1664|heineken|stella|carlsberg|mutzig|kronenbourg/.test(n)) return 'BEER';
  if (/\bwine\b|vin rouge|vin blanc|vin ros|ros[eé]/.test(n)) return 'WINE';
  if (/shot|g[eé]n[eé]pi|j[aä]ger|jaeger|\bgin\b|vodka|\brum\b|whisky|whiskey|aperol|picon|spritz|cocktail/.test(n)) return 'SPIRITS';
  return 'SOFT';
}

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value); else next.add(value);
  return next;
}

function SortPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`shrink-0 min-h-[44px] px-3 text-meta uppercase transition-colors ${active ? 'border border-[var(--color-blaze)] text-[var(--color-blaze)]' : 'border border-[var(--color-rule)] text-[var(--color-paper)] opacity-60'}`}>
      {label}
    </button>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`shrink-0 min-h-[44px] px-3 text-meta uppercase transition-colors ${active ? 'bg-[var(--color-blaze)] text-[var(--color-paper)]' : 'border border-[var(--color-rule)] text-[var(--color-paper)] opacity-60'}`}>
      {label}
    </button>
  );
}

function SectionHeading({ groupKey, count, large }: { groupKey: string; count: number; large?: boolean }) {
  if (large) {
    return (
      <div className="sticky top-0 z-10 bg-[var(--color-ink)] border-l-2 border-[var(--color-blaze)] px-3 py-1.5 flex items-center gap-3">
        <span className="font-display text-2xl text-[var(--color-blaze)]">{groupKey}</span>
        <span className="font-mono text-xs opacity-50">{count}</span>
      </div>
    );
  }
  return (
    <div className="sticky top-0 z-10 bg-[var(--color-ink)] border-l-2 border-[var(--color-blaze)] font-display text-sm uppercase px-3 py-2 text-[var(--color-blaze)] flex items-center justify-between">
      <span>{groupKey}</span>
      <span className="font-mono text-xs opacity-50">{count}</span>
    </div>
  );
}

const VERIFY_FILTERS = ['VERIFIED', 'UNVERIFIED', 'STALE'] as const;
const DRINK_TYPES = ['BEER', 'WINE', 'SPIRITS', 'HOT', 'SOFT'] as const;

export default function DrinksCatalogue({ onBack }: Props) {
  const { data: barsWithDetails, isLoading, refetch } = trpc.bars.getAllWithDetails.useQuery();
  const toggleVerifyMutation = trpc.admin.setDrinkVerification.useMutation();

  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('DRINK');
  const [areaFilters, setAreaFilters] = useState<Set<string>>(new Set());
  const [verifyFilters, setVerifyFilters] = useState<Set<string>>(new Set());
  const [drinkTypeFilters, setDrinkTypeFilters] = useState<Set<string>>(new Set());
  const [barFilter, setBarFilter] = useState<string | null>(null);
  const [drinkNameFilter, setDrinkNameFilter] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setDropdownOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const allDrinks = useMemo((): DrinkEntry[] => {
    if (!barsWithDetails) return [];
    const out: DrinkEntry[] = [];
    barsWithDetails.forEach(bar => {
      (bar.drinks ?? []).forEach(d => out.push({ barId: bar.id, barName: bar.name, area: bar.area ?? null, drink: d }));
    });
    return out;
  }, [barsWithDetails]);

  const uniqueAreas = useMemo(() =>
    [...new Set(allDrinks.map(e => e.area).filter(Boolean))].sort() as string[]
  , [allDrinks]);

  const uniqueBarNames = useMemo(() =>
    [...new Set(allDrinks.map(e => e.barName))].sort()
  , [allDrinks]);

  const filtered = useMemo(() => {
    let result = [...allDrinks];
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(({ barName, drink, area }) =>
        drink.name.toLowerCase().includes(q) ||
        barName.toLowerCase().includes(q) ||
        (area && area.toLowerCase().includes(q))
      );
    }
    if (barFilter) result = result.filter(e => e.barName === barFilter);
    if (drinkNameFilter) result = result.filter(e => e.drink.name.toLowerCase().includes(drinkNameFilter.toLowerCase()));
    if (areaFilters.size > 0) result = result.filter(e => e.area && areaFilters.has(e.area));
    if (verifyFilters.size > 0) {
      result = result.filter(({ drink }) => {
        const stale = drink.isVerified && isVerifiedStale(drink.verifiedAt);
        if (verifyFilters.has('VERIFIED') && drink.isVerified && !stale) return true;
        if (verifyFilters.has('UNVERIFIED') && !drink.isVerified) return true;
        if (verifyFilters.has('STALE') && stale) return true;
        return false;
      });
    }
    if (drinkTypeFilters.size > 0) {
      result = result.filter(e => drinkTypeFilters.has(getDrinkType(e.drink.name)));
    }
    return result;
  }, [allDrinks, query, barFilter, drinkNameFilter, areaFilters, verifyFilters, drinkTypeFilters]);

  const dropdownResults = useMemo(() => {
    if (query.length < 2) return null;
    const q = query.toLowerCase();

    const drinkMap = new Map<string, Set<string>>();
    allDrinks.forEach(({ drink, barName }) => {
      if (drink.name.toLowerCase().includes(q)) {
        if (!drinkMap.has(drink.name)) drinkMap.set(drink.name, new Set());
        drinkMap.get(drink.name)!.add(barName);
      }
    });
    const drinks = [...drinkMap.entries()].slice(0, 5).map(([name, bars]) => ({ name, barCount: bars.size }));
    const matchBars = uniqueBarNames.filter(n => n.toLowerCase().includes(q)).slice(0, 5);
    const matchAreas = uniqueAreas.filter(a => a.toLowerCase().includes(q)).slice(0, 5);

    if (!drinks.length && !matchBars.length && !matchAreas.length) return null;
    return { drinks, bars: matchBars, areas: matchAreas };
  }, [allDrinks, query, uniqueBarNames, uniqueAreas]);

  const sortFn = (a: DrinkEntry, b: DrinkEntry): number => {
    if (sortMode === 'BAR') return a.barName.localeCompare(b.barName) || a.drink.name.localeCompare(b.drink.name);
    if (sortMode === 'AREA') return (a.area ?? '').localeCompare(b.area ?? '') || a.drink.name.localeCompare(b.drink.name);
    if (sortMode === 'PRICE') return a.drink.price - b.drink.price;
    return a.drink.name.localeCompare(b.drink.name);
  };
  const groupFn: ((item: DrinkEntry) => string) | null =
    sortMode === 'BAR' ? (e) => e.barName :
    sortMode === 'AREA' ? (e) => e.area ?? 'Unknown' :
    sortMode === 'DRINK' ? (e) => e.drink.name[0]?.toUpperCase() ?? '#' :
    null;

  const toggle = async (drinkId: number, currentVerified: boolean) => {
    await toggleVerifyMutation.mutateAsync({ id: drinkId, isVerified: !currentVerified });
    refetch();
  };

  const verifiedCount = allDrinks.filter(({ drink }) => drink.isVerified && !isVerifiedStale(drink.verifiedAt)).length;
  const staleCount = allDrinks.filter(({ drink }) => drink.isVerified && isVerifiedStale(drink.verifiedAt)).length;

  const activeChips = [
    ...(barFilter ? [{ label: barFilter, remove: () => setBarFilter(null) }] : []),
    ...(drinkNameFilter ? [{ label: drinkNameFilter, remove: () => setDrinkNameFilter(null) }] : []),
    ...[...areaFilters].map(a => ({ label: a, remove: () => setAreaFilters(s => toggleSet(s, a)) })),
    ...[...verifyFilters].map(v => ({ label: v, remove: () => setVerifyFilters(s => toggleSet(s, v)) })),
    ...[...drinkTypeFilters].map(t => ({ label: t, remove: () => setDrinkTypeFilters(s => toggleSet(s, t)) })),
  ];

  const hasActiveFilters = activeChips.length > 0;

  if (isLoading) return <LoadingMessage surface="admin" />;

  return (
    <div className="grain-ink pb-6 max-w-md mx-auto">
      <div className="px-4 py-3 flex items-center justify-between hairline-b">
        <button onClick={onBack} className="flex items-center gap-1.5 text-meta opacity-70">
          <ChevronLeft size={16} strokeWidth={1.6} />
          ADMIN
        </button>
        <span className="text-meta bg-[var(--color-blaze)] text-[var(--color-paper)] px-2 py-1">SECTION 03</span>
      </div>

      <section className="px-4 pt-5 pb-3">
        <div className="text-eyebrow text-[var(--color-blaze)] mb-3">
          CATALOGUE · {filtered.length.toString().padStart(3, "0")} DRINKS
        </div>
        <h1 className="text-headline">DRINKS<br />CATALOGUE</h1>
      </section>

      {/* Stats */}
      <div className="px-4 mb-3 flex gap-2">
        <div className="flex-1 border border-[var(--color-rule)] px-2.5 py-2">
          <div className="text-eyebrow opacity-60">VERIFIED</div>
          <div className="font-display text-xl text-[var(--color-verified)] mt-0.5">{verifiedCount.toString().padStart(3, "0")}</div>
        </div>
        <div className="flex-1 border border-[var(--color-rule)] px-2.5 py-2">
          <div className="text-eyebrow opacity-60">STALE 60D+</div>
          <div className="font-display text-xl text-[var(--color-stale)] mt-0.5">{staleCount.toString().padStart(3, "0")}</div>
        </div>
      </div>

      {/* Search + typeahead */}
      <div className="px-4 mb-2" ref={searchRef}>
        <div className="relative">
          <div className="flex items-center gap-2 border border-[var(--color-rule)] px-3 bg-[var(--color-ink-card)]">
            <Search size={16} strokeWidth={1.6} className="opacity-50 shrink-0" />
            <input
              type="search"
              value={query}
              onChange={e => { setQuery(e.target.value); setDropdownOpen(true); }}
              onFocus={() => { if (query.length >= 2) setDropdownOpen(true); }}
              placeholder="Search drinks, bars, areas..."
              className="flex-1 bg-transparent py-2.5 focus:outline-none placeholder:opacity-40"
            />
            {query && (
              <button onClick={() => { setQuery(''); setDropdownOpen(false); }} className="opacity-50 min-h-[44px] flex items-center">
                <X size={14} />
              </button>
            )}
          </div>

          {dropdownOpen && dropdownResults && (
            <div className="absolute top-full left-0 right-0 z-50 bg-[var(--color-ink)] border border-[var(--color-rule)] border-t-0 max-h-80 overflow-y-auto">
              {dropdownResults.drinks.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-eyebrow opacity-50">DRINKS</div>
                  {dropdownResults.drinks.map(({ name, barCount }) => (
                    <button key={name}
                      onClick={() => { setDrinkNameFilter(name); setQuery(''); setDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2.5 min-h-[44px] hover:bg-[var(--color-ink-card)] flex items-center gap-2"
                    >
                      <span className="font-display text-sm uppercase">{name}</span>
                      <span className="text-meta opacity-50">· {barCount} {barCount === 1 ? 'BAR' : 'BARS'}</span>
                    </button>
                  ))}
                </>
              )}
              {dropdownResults.bars.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-eyebrow opacity-50 border-t border-[var(--color-rule)]">BARS</div>
                  {dropdownResults.bars.map(name => (
                    <button key={name}
                      onClick={() => { setBarFilter(name); setQuery(''); setDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2.5 min-h-[44px] hover:bg-[var(--color-ink-card)] text-meta"
                    >
                      {name.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
              {dropdownResults.areas.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-eyebrow opacity-50 border-t border-[var(--color-rule)]">AREAS</div>
                  {dropdownResults.areas.map(area => (
                    <button key={area}
                      onClick={() => { setAreaFilters(s => toggleSet(s, area)); setQuery(''); setDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2.5 min-h-[44px] hover:bg-[var(--color-ink-card)] text-meta"
                    >
                      {area.toUpperCase()}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Active chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {activeChips.map((chip, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-ink-card)] border border-[var(--color-rule)] font-mono text-xs uppercase">
                {chip.label}
                <button onClick={chip.remove} className="opacity-60 hover:opacity-100"><X size={10} /></button>
              </span>
            ))}
            <button
              onClick={() => { setBarFilter(null); setDrinkNameFilter(null); setAreaFilters(new Set()); setVerifyFilters(new Set()); setDrinkTypeFilters(new Set()); }}
              className="text-meta text-xs opacity-40 hover:opacity-70 px-1"
            >
              CLEAR ALL
            </button>
          </div>
        )}
      </div>

      {/* Sort + filter pills */}
      <div className="overflow-x-auto scrollbar-hide mb-3">
        <div className="flex gap-1.5 px-4 pb-1 min-w-max">
          {/* Sort */}
          <div className="flex gap-1 pr-2.5 border-r border-[var(--color-rule)] mr-0.5">
            {(['DRINK', 'BAR', 'AREA', 'PRICE'] as SortMode[]).map(s => (
              <SortPill key={s} label={s} active={sortMode === s} onClick={() => setSortMode(s)} />
            ))}
          </div>
          {/* Area filters */}
          {uniqueAreas.map(area => (
            <FilterPill key={area} label={area} active={areaFilters.has(area)} onClick={() => setAreaFilters(s => toggleSet(s, area))} />
          ))}
          {/* Verify filters */}
          <div className="w-px bg-[var(--color-rule)] self-stretch mx-0.5" />
          {VERIFY_FILTERS.map(v => (
            <FilterPill key={v} label={v} active={verifyFilters.has(v)} onClick={() => setVerifyFilters(s => toggleSet(s, v))} />
          ))}
          {/* Drink type filters */}
          <div className="w-px bg-[var(--color-rule)] self-stretch mx-0.5" />
          {DRINK_TYPES.map(t => (
            <FilterPill key={t} label={t} active={drinkTypeFilters.has(t)} onClick={() => setDrinkTypeFilters(s => toggleSet(s, t))} />
          ))}
        </div>
      </div>

      {/* Drinks list */}
      <ul className="px-3">
        <GroupedList
          items={filtered}
          groupBy={groupFn}
          sortItems={sortFn}
          renderSubheading={(key, count) => (
            <SectionHeading key={key} groupKey={key} count={count} large={sortMode === 'DRINK'} />
          )}
          renderItem={(entry: DrinkEntry) => {
            const { drink, barName, area } = entry;
            const verified = drink.isVerified;
            const stale = isVerifiedStale(drink.verifiedAt);
            return (
              <li className="hairline-b-soft flex items-center gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base uppercase truncate">{drink.name}</div>
                  <div className="text-meta opacity-60 mt-0.5">
                    {barName.toUpperCase()} · {area?.toUpperCase()}
                    {drink.size ? ` · ${drink.size.toUpperCase()}` : ""}
                  </div>
                </div>
                <div className="font-display text-base text-[var(--color-sun)] shrink-0">{drink.price.toFixed(2)} {drink.currency}</div>
                <button
                  onClick={() => toggle(drink.id, verified)}
                  className={`shrink-0 px-3 min-h-[44px] border text-meta transition-colors ${
                    verified && !stale
                      ? "bg-[var(--color-verified)] border-[var(--color-verified)] text-[var(--color-ink)]"
                      : verified && stale
                      ? "bg-[var(--color-stale)] border-[var(--color-stale)] text-[var(--color-ink)]"
                      : "border-[var(--color-rule)] text-[var(--color-paper)] opacity-55"
                  }`}
                  aria-label={verified ? "Remove verification" : "Verify drink"}
                >
                  {verified && !stale ? "VERIFIED" : verified && stale ? "STALE" : "UNVERIFIED"}
                </button>
              </li>
            );
          }}
          keyExtractor={(e: DrinkEntry) => e.drink.id}
        />
        {filtered.length === 0 && (
          <li className="text-meta opacity-50 py-8 text-center">NO DRINKS MATCH</li>
        )}
      </ul>
    </div>
  );
}
