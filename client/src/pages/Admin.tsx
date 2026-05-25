import { useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { trpc } from "../lib/trpc";
import { LoadingMessage } from "../components/LoadingMessage";
import SubmissionsQueue from "../admin/SubmissionsQueue";
import BarsManager from "../components/BarsManager";
import DrinksCatalogue from "../admin/DrinksCatalogue";
import DealsManager from "../admin/DealsManager";
import ReportsManager from "../admin/ReportsManager";

type Section = "home" | "queue" | "bars" | "drinks" | "deals" | "reports";

interface Props { onExit: () => void; }

export default function Admin({ onExit }: Props) {
  const [section, setSection] = useState<Section>("home");
  const { data: submissions, isLoading } = trpc.admin.getSubmissions.useQuery();
  const { data: bars } = trpc.bars.getAll.useQuery();
  const { data: deals } = trpc.bars.getDeals.useQuery();
  const { data: reports } = trpc.bars.getReports.useQuery();

  const pendingCount = (submissions ?? []).filter(s => s.status === "pending").length;
  const openReports = (reports ?? []).filter(r => r.status === "open").length;
  const activeDeals = (deals ?? []).filter(d => d.isActive).length;

  if (section === "queue") return <SubmissionsQueue onBack={() => setSection("home")} />;
  if (section === "bars") return <BarsManager onBack={() => setSection("home")} />;
  if (section === "drinks") return <DrinksCatalogue onBack={() => setSection("home")} />;
  if (section === "deals") return <DealsManager onBack={() => setSection("home")} />;
  if (section === "reports") return <ReportsManager onBack={() => setSection("home")} />;

  if (isLoading) return <LoadingMessage surface="admin" />;

  const sections: Array<[Section, string, string, number | null, string]> = [
    ["queue", "SUBMISSIONS QUEUE", "REVIEW NEW PRICES & UPDATES", pendingCount, "blaze"],
    ["bars", "BARS DIRECTORY", `${bars?.length ?? 0} ACTIVE · ADD, EDIT, REMOVE`, null, ""],
    ["drinks", "DRINKS CATALOGUE", "VERIFY & MANAGE", null, ""],
    ["deals", "DEALS & EVENTS", `${activeDeals} ACTIVE · HAPPY HOURS`, null, ""],
    ["reports", "USER REPORTS", "FLAGGED ISSUES & FEEDBACK", openReports, "sun"],
  ];

  return (
    <div className="grain-ink min-h-full pb-6">
      <section className="px-4 pt-5 pb-4">
        <div className="text-eyebrow text-[var(--color-blaze)] mb-3">CONTROL ROOM · ADMIN</div>
        <h1 className="text-headline">WELCOME<br/>BACK</h1>
      </section>

      {/* Stats */}
      <div className="px-4 mb-5 flex gap-2">
        <div className="flex-1 border border-[var(--color-rule)] px-2.5 py-2">
          <div className="text-eyebrow opacity-60">PENDING</div>
          <div className="font-display text-2xl text-[var(--color-blaze)] mt-0.5">{pendingCount.toString().padStart(2,"0")}</div>
        </div>
        <div className="flex-1 border border-[var(--color-rule)] px-2.5 py-2">
          <div className="text-eyebrow opacity-60">BARS</div>
          <div className="font-display text-2xl mt-0.5">{(bars?.length ?? 0).toString().padStart(2,"0")}</div>
        </div>
        <div className="flex-1 border border-[var(--color-rule)] px-2.5 py-2">
          <div className="text-eyebrow opacity-60">FLAGS</div>
          <div className="font-display text-2xl text-[var(--color-sun)] mt-0.5">{openReports.toString().padStart(2,"0")}</div>
        </div>
      </div>

      <section className="px-4">
        <div className="hairline-b flex items-baseline justify-between pb-1.5 mb-1">
          <div className="font-display text-lg uppercase">SECTIONS</div>
          <div className="text-meta opacity-55">05 AREAS</div>
        </div>
        <ul>
          {sections.map(([key, label, sub, badge, badgeColor], i) => (
            <li key={key}>
              <button onClick={() => setSection(key)} className="w-full hairline-b-soft last:border-b-0 flex items-center gap-3 py-3.5 text-left">
                <span className="num-rail text-[var(--color-blaze)] w-7 shrink-0">{String(i+1).padStart(2,"0")}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base uppercase text-[var(--color-paper)]">{label}</div>
                  <div className="text-meta opacity-60 mt-0.5">{sub}</div>
                </div>
                {badge !== null && badge > 0 && (
                  <span className={`text-meta px-2 py-1 ${badgeColor === "blaze" ? "bg-[var(--color-blaze)] text-[var(--color-paper)]" : "bg-[var(--color-sun)] text-[var(--color-ink)]"}`}>
                    {String(badge).padStart(2,"0")} NEW
                  </span>
                )}
                <ChevronRight size={14} strokeWidth={1.4} className="opacity-50" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Exit */}
      <button onClick={onExit} className="mt-6 mx-4 w-[calc(100%-2rem)] hairline-t flex items-center justify-between py-4 text-meta opacity-70">
        <span className="flex items-center gap-2">
          <X size={14} strokeWidth={1.6} />
          EXIT ADMIN MODE
        </span>
        <span className="opacity-60">SESSION 30 MIN</span>
      </button>
    </div>
  );
}
