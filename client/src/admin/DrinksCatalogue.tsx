import { useState, useMemo } from "react";
import { ChevronLeft, Check, Search } from "lucide-react";
import { trpc } from "../lib/trpc";
import { isVerifiedStale } from "../lib/store";
import { LoadingMessage } from "../components/LoadingMessage";

interface Props { onBack: () => void; }

export default function DrinksCatalogue({ onBack }: Props) {
  const { data: barsWithDetails, isLoading, refetch } = trpc.bars.getAllWithDetails.useQuery();
  const toggleVerifyMutation = trpc.admin.setDrinkVerification.useMutation();

  const [query, setQuery] = useState("");

  const allDrinks = useMemo(() => {
    if (!barsWithDetails) return [];
    const out: Array<{ barId: number; barName: string; area: string | null; drink: any }> = [];
    barsWithDetails.forEach(bar => {
      (bar.drinks ?? []).forEach(d => out.push({ barId: bar.id, barName: bar.name, area: bar.area ?? null, drink: d }));
    });
    return out;
  }, [barsWithDetails]);

  const filtered = allDrinks.filter(({ barName, drink, area }) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return barName.toLowerCase().includes(q)
      || drink.name.toLowerCase().includes(q)
      || (area && area.toLowerCase().includes(q));
  });

  const verifiedCount = allDrinks.filter(({ drink }) => drink.isVerified && !isVerifiedStale(drink.verifiedAt)).length;
  const staleCount = allDrinks.filter(({ drink }) => drink.isVerified && isVerifiedStale(drink.verifiedAt)).length;

  const toggle = async (drinkId: number, currentVerified: boolean) => {
    await toggleVerifyMutation.mutateAsync({ id: drinkId, isVerified: !currentVerified });
    refetch();
  };

  if (isLoading) return <LoadingMessage surface="admin" />;

  return (
    <div className="grain-ink min-h-full pb-6">
      <div className="px-4 py-3 flex items-center justify-between hairline-b">
        <button onClick={onBack} className="flex items-center gap-1.5 text-meta opacity-70 !min-h-0">
          <ChevronLeft size={16} strokeWidth={1.6} />
          ADMIN
        </button>
        <span className="text-meta bg-[var(--color-blaze)] text-[var(--color-paper)] px-2 py-1">SECTION 03</span>
      </div>

      <section className="px-4 pt-5 pb-3">
        <div className="text-eyebrow text-[var(--color-blaze)] mb-3">CATALOGUE · {allDrinks.length.toString().padStart(3,"0")} ENTRIES</div>
        <h1 className="text-headline">DRINKS<br/>CATALOGUE</h1>
      </section>

      <div className="px-4 mb-3 flex gap-2">
        <div className="flex-1 border border-[var(--color-rule)] px-2.5 py-2">
          <div className="text-eyebrow opacity-60">VERIFIED</div>
          <div className="font-display text-xl text-[var(--color-verified)] mt-0.5">{verifiedCount.toString().padStart(3,"0")}</div>
        </div>
        <div className="flex-1 border border-[var(--color-rule)] px-2.5 py-2">
          <div className="text-eyebrow opacity-60">STALE 60D+</div>
          <div className="font-display text-xl text-[var(--color-stale)] mt-0.5">{staleCount.toString().padStart(3,"0")}</div>
        </div>
      </div>

      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 border border-[var(--color-rule)] px-3">
          <Search size={16} strokeWidth={1.6} className="opacity-50 shrink-0" />
          <input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bar or drink"
            className="w-full bg-transparent py-2.5 focus:outline-none placeholder:opacity-40"
          />
        </div>
      </div>

      <ul className="px-3">
        {filtered.map(({ drink, barName, area }) => {
          const verified = drink.isVerified;
          const stale = isVerifiedStale(drink.verifiedAt);
          return (
            <li key={`${drink.id}`} className="hairline-b-soft flex items-center gap-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="font-display text-base uppercase truncate">{drink.name}</div>
                <div className="text-meta opacity-60 mt-0.5">
                  {barName.toUpperCase()} · {area?.toUpperCase()}
                  {drink.size ? ` · ${drink.size.toUpperCase()}` : ""}
                </div>
              </div>
              <div className="font-display text-base text-[var(--color-sun)]">{drink.price.toFixed(2)} {drink.currency}</div>
              <button
                onClick={() => toggle(drink.id, verified)}
                className={`shrink-0 w-12 h-7 border flex items-center justify-end px-1 !min-h-0 transition-colors ${verified ? "bg-[var(--color-verified)] border-[var(--color-verified)]" : "border-[var(--color-rule)]"}`}
                aria-label={verified ? "Remove verification" : "Verify drink"}
              >
                <div className={`w-5 h-5 ${verified ? "bg-[var(--color-ink)]" : "bg-[var(--color-paper)] opacity-50"} ${verified ? "" : "mr-auto"}`}>
                  {verified && stale && <span className="block text-[8px] text-[var(--color-sun)] text-center pt-0.5">!</span>}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
