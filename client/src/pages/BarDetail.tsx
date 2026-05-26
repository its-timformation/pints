import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ChevronLeft, MapPin, Share2, Flag, ChevronRight, Globe } from "lucide-react";
import { trpc } from "../lib/trpc";
import { useAppStore, convertPrice, formatPrice, isOpenNow, isVerifiedStale } from "../lib/store";
import { LoadingMessage } from "../components/LoadingMessage";

export default function BarDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const barId = Number(id);
  const { currency } = useAppStore();
  const { data: bar, isLoading } = trpc.bars.getById.useQuery({ id: barId }, { enabled: !!id });
  const reportMutation = trpc.bars.report.useMutation();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<"closed"|"wrong_info"|"drink_not_served"|"other">("wrong_info");

  if (isLoading || !bar) return <LoadingMessage surface="bar" />;

  const openState = isOpenNow(bar.openingHours);
  const activeHappyHour = bar.deals.find(d => d.type === "happy_hour" && d.isActive);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: bar.name, text: `${bar.name} on Pints du Soleil`, url }); }
      catch {}
    } else {
      try { await navigator.clipboard.writeText(url); } catch {}
    }
  };

  const submitReport = async () => {
    try {
      await reportMutation.mutateAsync({ barId, reason: reportReason });
      setReportOpen(false);
    } catch (err: any) {
      // Keep the sheet open and let the user see the message
      alert(err?.message ?? "Something went wrong.");
    }
  };

  return (
    <div className="grain-ink min-h-full">
      {/* Back row */}
      <div className="px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-meta opacity-70" aria-label="Go back">
          <ChevronLeft size={16} strokeWidth={1.6} />
          BACK
        </button>
        <div className="flex items-center gap-1">
          <button onClick={share} className="p-2" aria-label="Share">
            <Share2 size={16} strokeWidth={1.6} className="opacity-70" />
          </button>
          <button onClick={() => setReportOpen(true)} className="p-2" aria-label="Report a problem">
            <Flag size={16} strokeWidth={1.6} className="opacity-70" />
          </button>
        </div>
      </div>

      {/* Vermillion masthead */}
      <section className="grain-blaze text-[var(--color-paper)] px-5 py-6">
        <div className="text-eyebrow opacity-90">DRINKING ESTABLISHMENT · {bar.type?.toUpperCase()}</div>
        <h1 className="text-headline mt-3">{bar.name}</h1>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="text-meta opacity-90">{bar.area?.toUpperCase()}</div>
            {bar.address && <div className="text-meta opacity-80 mt-1">{bar.address.toUpperCase()}</div>}
          </div>
          <div className={`px-2.5 py-1 ${openState.open ? "bg-[var(--color-ink)] text-[var(--color-verified)]" : "bg-[var(--color-ink)] text-[var(--color-paper)] opacity-55"}`}>
            <span className="text-meta flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${openState.open ? "bg-[var(--color-verified)]" : "bg-[var(--color-paper)]"}`} />
              {openState.open ? `OPEN UNTIL ${openState.closesAt}` : `OPENS ${openState.opensAt ?? "—"}`}
            </span>
          </div>
        </div>
      </section>

      {/* Happy hour ribbon */}
      {activeHappyHour && (
        <div className="bg-[var(--color-sun)] text-[var(--color-ink)] px-5 py-3 flex items-center justify-between">
          <div>
            <div className="text-eyebrow opacity-70">HAPPY HOUR</div>
            <div className="font-display text-lg uppercase mt-0.5">{activeHappyHour.startTime} – {activeHappyHour.endTime} DAILY</div>
          </div>
          {activeHappyHour.description && <div className="font-display text-lg uppercase">{activeHappyHour.description}</div>}
        </div>
      )}

      {/* View on map link */}
      <Link to={`/map?focus=${bar.id}`} className="flex items-center justify-between px-5 py-3 hairline-b">
        <div className="flex items-center gap-2">
          <MapPin size={16} strokeWidth={1.6} className="text-[var(--color-blaze)]" />
          <span className="text-meta">VIEW ON MAP</span>
        </div>
        <ChevronRight size={14} strokeWidth={1.4} className="opacity-50" />
      </Link>
      {bar.googleMapsUrl && (
        <a href={bar.googleMapsUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between px-5 py-3 hairline-b">
          <div className="flex items-center gap-2">
            <MapPin size={16} strokeWidth={1.6} className="text-[var(--color-blaze)]" />
            <span className="text-meta">VIEW ON GOOGLE MAPS</span>
          </div>
          <ChevronRight size={14} strokeWidth={1.4} className="opacity-50" />
        </a>
      )}
      {bar.websiteUrl && (
        <a href={bar.websiteUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between px-5 py-3 hairline-b">
          <div className="flex items-center gap-2">
            <Globe size={16} strokeWidth={1.6} className="text-[var(--color-blaze)]" />
            <span className="text-meta">VISIT WEBSITE</span>
          </div>
          <ChevronRight size={14} strokeWidth={1.4} className="opacity-50" />
        </a>
      )}
      {bar.phoneNumber && (
        <a
          href={`tel:${bar.phoneNumber.replace(/\s/g, '')}`}
          className="flex items-center justify-between px-5 py-3 hairline-b"
        >
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
                 className="text-[var(--color-blaze)]">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.69a16 16 0 0 0 6.29 6.29l.98-.98a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span className="text-meta">CALL BAR</span>
          </div>
          <span className="text-meta opacity-60">{bar.phoneNumber}</span>
        </a>
      )}

      {/* Drinks list */}
      <section className="px-5 pt-4 pb-3">
        <div className="hairline-b flex items-baseline justify-between pb-1.5 mb-1">
          <div className="font-display text-lg uppercase">DRINKS LIST</div>
          <div className="text-meta opacity-55">{bar.drinks.length.toString().padStart(2,"0")} ENTRIES</div>
        </div>
        {bar.drinks.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-meta opacity-60 mb-3">NO PRICES YET</div>
            <Link to={`/submit/${bar.id}`} className="inline-block bg-[var(--color-blaze)] text-[var(--color-paper)] px-4 py-2.5 text-meta uppercase">
              BE THE FIRST TO ADD ONE →
            </Link>
          </div>
        ) : (
          <ul>
            {bar.drinks.map((drink, i) => {
              const verified = drink.isVerified;
              const stale = isVerifiedStale(drink.verifiedAt);
              const displayPrice = formatPrice(convertPrice(drink.price, drink.currency as any, currency), currency);
              return (
                <li key={drink.id} className="hairline-b-soft last:border-b-0 py-4 flex items-center gap-3">
                  <span className="num-rail text-[var(--color-blaze)] w-6 shrink-0">{String(i+1).padStart(2,"0")}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base uppercase text-[var(--color-paper)] truncate">{drink.name}</div>
                    <div className="text-meta opacity-60 mt-0.5 flex items-center gap-2 flex-wrap">
                      {drink.size && <span>{drink.size.toUpperCase()}</span>}
                      {verified && !stale && <span className="verified-pill">VERIFIED</span>}
                      {verified && stale && <span className="stale-pill">VERIFIED · STALE</span>}
                      {!verified && <span className="opacity-55">UNVERIFIED</span>}
                    </div>
                  </div>
                  <div className="font-display text-lg text-[var(--color-sun)]">{displayPrice}</div>
                  <Link
                    to={`/submit/${bar.id}?drink=${encodeURIComponent(drink.name)}&size=${encodeURIComponent(drink.size ?? "")}&update=1`}
                    className="shrink-0 border border-[var(--color-rule)] text-meta uppercase px-3 py-2 min-h-[44px] hover:border-[var(--color-blaze)] transition-colors"
                    aria-label={`Suggest update for ${drink.name}`}
                  >
                    UPDATE PRICE
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Add a new drink CTA */}
      <Link to={`/submit/${bar.id}`} className="block mx-5 mb-6 grain-blaze text-[var(--color-paper)] px-4 py-3.5 flex items-center justify-between">
        <div>
          <div className="text-eyebrow opacity-60">CONTRIBUTE</div>
          <div className="font-display text-lg uppercase mt-0.5">REPORT A NEW PRICE</div>
        </div>
        <ChevronRight size={16} strokeWidth={1.6} />
      </Link>

      {/* Report sheet */}
      {reportOpen && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-[var(--color-ink)] bg-opacity-70" onClick={() => setReportOpen(false)}>
          <div className="mt-auto bg-[var(--color-paper)] text-[var(--color-ink)] sheet-enter" onClick={e => e.stopPropagation()}>
            <div className="self-center mt-3 mb-1 mx-auto w-10 h-1 bg-[var(--color-ink)] opacity-25 rounded" />
            <div className="px-5 py-4">
              <div className="text-eyebrow opacity-60">REPORT A PROBLEM</div>
              <div className="font-display text-2xl uppercase mt-2">SOMETHING<br/>WRONG?</div>
              <div className="mt-4 space-y-1.5">
                {[
                  ["closed","Bar permanently closed"],
                  ["wrong_info","Wrong info"],
                  ["drink_not_served","Drink not served"],
                  ["other","Something else"],
                ].map(([val,label]) => (
                  <button
                    key={val}
                    onClick={() => setReportReason(val as any)}
                    className={`w-full text-left px-3 min-h-[44px] border ${reportReason === val ? "bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]" : "border-[var(--color-rule-paper)]"}`}
                  >
                    <span className="text-meta">{label}</span>
                  </button>
                ))}
              </div>
              <button onClick={submitReport} className="w-full mt-4 bg-[var(--color-blaze)] text-[var(--color-paper)] py-4 font-display text-lg uppercase min-h-[44px]">
                SEND REPORT
              </button>
              <button onClick={() => setReportOpen(false)} className="w-full mt-2 text-meta opacity-55 py-4 min-h-[44px]">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
