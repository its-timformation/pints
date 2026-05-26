import { useState } from "react";
import { ChevronLeft, Check, X } from "lucide-react";
import { trpc } from "../lib/trpc";
import { LoadingMessage } from "../components/LoadingMessage";

type Filter = "all" | "new" | "update";

interface Props { onBack: () => void; }

export default function SubmissionsQueue({ onBack }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const { data: submissions, isLoading, refetch } = trpc.admin.getSubmissions.useQuery();
  const { data: bars } = trpc.bars.getAll.useQuery();
  const resolveMutation = trpc.admin.resolveSubmission.useMutation();

  if (isLoading) return <LoadingMessage surface="admin" />;

  const pending = (submissions ?? []).filter(s => s.status === "pending");
  const filtered = pending.filter(s => filter === "all" ? true : s.kind === filter);
  const newCount = pending.filter(s => s.kind === "new").length;
  const updateCount = pending.filter(s => s.kind === "update").length;

  const barById = (id: number) => bars?.find(b => b.id === id);

  const resolve = async (id: number, action: "reject" | "approve" | "approve_verified") => {
    await resolveMutation.mutateAsync({ id, action });
    refetch();
  };

  return (
    <div className="grain-ink min-h-full pb-6">
      <div className="px-4 py-3 flex items-center justify-between hairline-b">
        <button onClick={onBack} className="flex items-center gap-1.5 text-meta opacity-70 !min-h-0">
          <ChevronLeft size={16} strokeWidth={1.6} />
          ADMIN
        </button>
        <span className="text-meta bg-[var(--color-blaze)] text-[var(--color-paper)] px-2 py-1">SECTION 01</span>
      </div>

      <section className="px-4 pt-5 pb-3">
        <div className="text-eyebrow text-[var(--color-blaze)] mb-3">QUEUE · {pending.length.toString().padStart(2,"0")} PENDING</div>
        <h1 className="text-headline">PENDING<br/>REVIEW</h1>
      </section>

      {/* Filter pills */}
      <div className="px-4 mb-2 flex items-center gap-2 hairline-b pb-3">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>ALL · {pending.length}</FilterPill>
        <FilterPill active={filter === "new"} onClick={() => setFilter("new")}>NEW · {newCount}</FilterPill>
        <FilterPill active={filter === "update"} onClick={() => setFilter("update")}>UPDATE · {updateCount}</FilterPill>
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <div className="font-display text-2xl uppercase">QUEUE'S CLEAR</div>
          <div className="text-meta opacity-55 mt-3">Nothing pending right now.</div>
        </div>
      ) : (
        <ul className="px-3 pt-3">
          {filtered.map(sub => {
            const bar = barById(sub.barId);
            const ageMin = Math.max(1, Math.round((Date.now() - new Date(sub.createdAt).getTime()) / 60000));
            const ageLabel = ageMin < 60 ? `${ageMin} MIN AGO`
              : ageMin < 1440 ? `${Math.round(ageMin/60)} HR AGO`
              : `${Math.round(ageMin/1440)} D AGO`;
            return (
              <li key={sub.id} className="border border-[var(--color-rule)] px-3.5 py-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-meta ${sub.kind === "update" ? "text-[var(--color-sun)]" : "text-[var(--color-verified)]"}`}>
                    {sub.kind === "update" ? "PRICE UPDATE" : "NEW PRICE"}
                  </span>
                  <span className="text-meta opacity-55">{ageLabel}</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg uppercase truncate">{bar?.name ?? `Bar #${sub.barId}`}</div>
                    <div className="text-meta opacity-60 mt-0.5">
                      {sub.drinkName.toUpperCase()}{sub.drinkSize ? ` · ${sub.drinkSize.toUpperCase()}` : ""}
                    </div>
                    <div className="text-meta opacity-45 mt-1.5">
                      VIA: {sub.submitterName ? `${sub.submitterName.toUpperCase()} (NAMED)` : "ANONYMOUS"}
                    </div>
                  </div>

                  {sub.imageUrl ? (
                    <a href={sub.imageUrl} target="_blank" rel="noreferrer" className="w-14 h-16 shrink-0 bg-[var(--color-paper)] block !min-h-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sub.imageUrl} alt="proof" className="w-full h-full object-cover" />
                    </a>
                  ) : (
                    <div className="w-14 h-16 shrink-0 border border-dashed border-[var(--color-rule)] flex items-center justify-center">
                      <span className="text-meta opacity-50 text-center leading-tight">NO<br/>PHOTO</span>
                    </div>
                  )}

                  <div className="text-right">
                    {sub.kind === "update" && sub.previousPrice && (
                      <div className="text-meta opacity-55">WAS {sub.previousPrice.toFixed(2)} →</div>
                    )}
                    <div className="font-display text-2xl text-[var(--color-sun)] leading-none mt-0.5">{sub.price.toFixed(2)}</div>
                    <div className="text-meta opacity-50 mt-0.5">{sub.currency}</div>
                  </div>
                </div>

                <div className="flex gap-1.5 mt-3">
                  <button onClick={() => resolve(sub.id, "reject")} className="flex-1 border border-[var(--color-rule)] py-2.5">
                    <span className="text-meta text-[var(--color-blaze)] flex items-center justify-center gap-1.5">
                      <X size={12} strokeWidth={2} />
                      REJECT
                    </span>
                  </button>
                  <button onClick={() => resolve(sub.id, "approve")} className="flex-1 border border-[var(--color-paper)] py-2.5">
                    <span className="text-meta flex items-center justify-center">APPROVE</span>
                  </button>
                  <button onClick={() => resolve(sub.id, "approve_verified")} className="flex-[1.2] bg-[var(--color-blaze)] text-[var(--color-paper)] py-2.5">
                    <span className="text-meta flex items-center justify-center gap-1.5">
                      <Check size={12} strokeWidth={2.2} />
                      VERIFY
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FilterPill({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 px-3 py-1.5 text-meta uppercase !min-h-0 ${active ? "bg-[var(--color-ink)] text-[var(--color-paper)] border border-[var(--color-paper)] opacity-100" : "bg-transparent text-[var(--color-paper)] border border-[var(--color-rule)] opacity-60"}`}>
      {children}
    </button>
  );
}
