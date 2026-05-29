import { useState } from "react";
import { ChevronLeft, Check, X, Phone } from "lucide-react";
import { trpc } from "../lib/trpc";
import { LoadingMessage } from "../components/LoadingMessage";

interface Props { onBack: () => void; }

const REASON_LABELS: Record<string, string> = {
  closed: "PERMANENTLY CLOSED",
  wrong_info: "WRONG INFO",
  drink_not_served: "DRINK NOT SERVED",
  other: "OTHER",
};

export default function ReportsManager({ onBack }: Props) {
  const { data: bars } = trpc.bars.getAll.useQuery();
  const { data: reports, isLoading, refetch } = trpc.bars.getReports.useQuery();
  const resolveMutation = trpc.admin.resolveReport.useMutation();
  const [showClosed, setShowClosed] = useState(false);

  if (isLoading) return <LoadingMessage surface="admin" />;

  const barName = (id: number) => bars?.find(b => b.id === id)?.name ?? `Bar #${id}`;
  const open = (reports ?? []).filter(r => r.status === "open");
  const closed = (reports ?? []).filter(r => r.status !== "open");

  const resolve = async (id: number, status: "resolved" | "dismissed" | "bar_contacted") => {
    await resolveMutation.mutateAsync({ id, status });
    refetch();
  };

  const ageLabel = (createdAt: string) => {
    const ageMin = Math.max(1, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000));
    return ageMin < 60 ? `${ageMin} MIN AGO` : ageMin < 1440 ? `${Math.round(ageMin/60)} HR AGO` : `${Math.round(ageMin/1440)} D AGO`;
  };

  const statusBadge = (status: string) => {
    if (status === "bar_contacted") return <span className="text-meta text-[var(--color-sun)]">BAR CONTACTED</span>;
    if (status === "resolved") return <span className="text-meta text-[var(--color-verified)]">RESOLVED</span>;
    return <span className="text-meta opacity-40">DISMISSED</span>;
  };

  return (
    <div className="grain-ink pb-6">
      <div className="px-4 py-3 flex items-center justify-between hairline-b">
        <button onClick={onBack} className="flex items-center gap-1.5 text-meta opacity-70 !min-h-0">
          <ChevronLeft size={16} strokeWidth={1.6} />ADMIN
        </button>
        <span className="text-meta bg-[var(--color-blaze)] text-[var(--color-paper)] px-2 py-1">SECTION 05</span>
      </div>

      <section className="px-4 pt-5 pb-3">
        <div className="text-eyebrow text-[var(--color-blaze)] mb-3">FLAGS · {open.length.toString().padStart(2,"00")} OPEN</div>
        <h1 className="text-headline">USER<br/>REPORTS</h1>
      </section>

      {open.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <div className="font-display text-2xl uppercase">ALL CLEAR</div>
          <div className="text-meta opacity-55 mt-3">No flags to triage.</div>
        </div>
      ) : (
        <ul className="px-3">
          {open.map(r => (
            <li key={r.id} className="border border-[var(--color-rule)] px-3.5 py-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-meta text-[var(--color-sun)]">{REASON_LABELS[r.reason] ?? r.reason.toUpperCase()}</span>
                <span className="text-meta opacity-55">{ageLabel(r.createdAt)}</span>
              </div>
              <div className="font-display text-lg uppercase">{barName(r.barId)}</div>
              {r.detail && (
                <div className="mt-2 px-3 py-2 border-l-2 border-[var(--color-blaze)] text-sm opacity-80 normal-case tracking-normal">{r.detail}</div>
              )}
              <div className="text-meta opacity-45 mt-1.5">VIA: {r.reporterName ? r.reporterName.toUpperCase() : "ANONYMOUS"}</div>
              <div className="flex gap-1.5 mt-3">
                <button onClick={() => resolve(r.id, "dismissed")} className="flex-1 border border-[var(--color-rule)] py-2.5">
                  <span className="text-meta opacity-55 flex items-center justify-center gap-1.5">
                    <X size={12} strokeWidth={2} />
                    DISMISS
                  </span>
                </button>
                <button onClick={() => resolve(r.id, "bar_contacted")} className="flex-1 border border-[var(--color-sun)] py-2.5">
                  <span className="text-meta text-[var(--color-sun)] flex items-center justify-center gap-1.5">
                    <Phone size={12} strokeWidth={2} />
                    BAR CONTACTED
                  </span>
                </button>
                <button onClick={() => resolve(r.id, "resolved")} className="flex-[1.2] bg-[var(--color-blaze)] text-[var(--color-paper)] py-2.5">
                  <span className="text-meta flex items-center justify-center gap-1.5">
                    <Check size={12} strokeWidth={2.2} />
                    RESOLVED
                  </span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <div className="px-3 mt-2">
          <button
            onClick={() => setShowClosed(v => !v)}
            className="w-full border border-[var(--color-rule)] py-2.5 text-meta opacity-55 mb-3"
          >
            {showClosed ? `HIDE CLOSED` : `SHOW CLOSED (${closed.length})`}
          </button>
          {showClosed && (
            <ul>
              {closed.map(r => (
                <li key={r.id} className="border border-[var(--color-rule)] opacity-60 px-3.5 py-3 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-meta opacity-60">{REASON_LABELS[r.reason] ?? r.reason.toUpperCase()}</span>
                    {statusBadge(r.status)}
                  </div>
                  <div className="font-display text-base uppercase">{barName(r.barId)}</div>
                  {r.detail && <div className="text-meta opacity-60 mt-1 normal-case tracking-normal text-sm">{r.detail}</div>}
                  <div className="text-meta opacity-40 mt-1">VIA: {r.reporterName ? r.reporterName.toUpperCase() : "ANONYMOUS"} · {ageLabel(r.createdAt)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
