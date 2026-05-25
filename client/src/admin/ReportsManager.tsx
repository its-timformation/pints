import { ChevronLeft, Check, X } from "lucide-react";
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

  if (isLoading) return <LoadingMessage surface="admin" />;

  const barName = (id: number) => bars?.find(b => b.id === id)?.name ?? `Bar #${id}`;
  const open = (reports ?? []).filter(r => r.status === "open");

  return (
    <div className="grain-ink min-h-full pb-6">
      <div className="px-4 py-3 flex items-center justify-between hairline-b">
        <button onClick={onBack} className="flex items-center gap-1.5 text-meta opacity-70 !min-h-0">
          <ChevronLeft size={16} strokeWidth={1.6} />ADMIN
        </button>
        <span className="text-meta bg-[var(--color-blaze)] text-[var(--color-paper)] px-2 py-1">SECTION 05</span>
      </div>

      <section className="px-4 pt-5 pb-3">
        <div className="text-eyebrow text-[var(--color-blaze)] mb-3">FLAGS · {open.length.toString().padStart(2,"0")} OPEN</div>
        <h1 className="text-headline">USER<br/>REPORTS</h1>
      </section>

      {open.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <div className="font-display text-2xl uppercase">ALL CLEAR</div>
          <div className="text-meta opacity-55 mt-3">No flags to triage.</div>
        </div>
      ) : (
        <ul className="px-3">
          {open.map(r => {
            const ageMin = Math.max(1, Math.round((Date.now() - new Date(r.createdAt).getTime()) / 60000));
            const ageLabel = ageMin < 60 ? `${ageMin} MIN AGO` : ageMin < 1440 ? `${Math.round(ageMin/60)} HR AGO` : `${Math.round(ageMin/1440)} D AGO`;
            return (
              <li key={r.id} className="border border-[var(--color-rule)] px-3.5 py-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-meta text-[var(--color-sun)]">{REASON_LABELS[r.reason] ?? r.reason.toUpperCase()}</span>
                  <span className="text-meta opacity-55">{ageLabel}</span>
                </div>
                <div className="font-display text-lg uppercase">{barName(r.barId)}</div>
                {r.detail && <div className="text-meta opacity-70 mt-1 normal-case tracking-normal">{r.detail}</div>}
                <div className="text-meta opacity-45 mt-1.5">VIA: {r.reporterName ? r.reporterName.toUpperCase() : "ANONYMOUS"}</div>
                <div className="flex gap-1.5 mt-3">
                  <button onClick={async () => { await resolveMutation.mutateAsync({ id: r.id, status: "dismissed" }); refetch(); }} className="flex-1 border border-[var(--color-rule)] py-2.5">
                    <span className="text-meta opacity-70 flex items-center justify-center gap-1.5">
                      <X size={12} strokeWidth={2} />
                      DISMISS
                    </span>
                  </button>
                  <button onClick={async () => { await resolveMutation.mutateAsync({ id: r.id, status: "resolved" }); refetch(); }} className="flex-[1.2] bg-[var(--color-blaze)] text-[var(--color-paper)] py-2.5">
                    <span className="text-meta flex items-center justify-center gap-1.5">
                      <Check size={12} strokeWidth={2.2} />
                      RESOLVE
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
