import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { trpc } from "../lib/trpc";
import { LoadingMessage } from "../components/LoadingMessage";

interface Props { onBack: () => void; }

type Mode = "cheapest" | "manual" | "daily_random" | "weekly_random";

const MODE_LABELS: Record<Mode, string> = {
  cheapest: "CHEAPEST PINT",
  manual: "MANUAL PICK",
  daily_random: "DAILY RANDOM",
  weekly_random: "WEEKLY RANDOM",
};

export default function EditorsPick({ onBack }: Props) {
  const { data: cfg, isLoading: cfgLoading } = trpc.admin.getEditorsPick.useQuery();
  const { data: pickResult } = trpc.bars.getEditorsPick.useQuery();
  const { data: bars } = trpc.bars.getAll.useQuery();
  const setPickMutation = trpc.admin.setEditorsPick.useMutation();

  const [mode, setMode] = useState<Mode>("cheapest");
  const [selectedBarId, setSelectedBarId] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (cfg) {
      setMode((cfg.mode as Mode) ?? "cheapest");
      setSelectedBarId(cfg.barId ?? null);
    }
  }, [cfg]);

  const save = async () => {
    await setPickMutation.mutateAsync({ mode, barId: mode === "manual" ? selectedBarId : null });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (cfgLoading) return <LoadingMessage surface="admin" />;

  const sortedBars = [...(bars ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="grain-ink min-h-full pb-6">
      <div className="px-4 py-3 flex items-center justify-between hairline-b">
        <button onClick={onBack} className="flex items-center gap-1.5 text-meta opacity-70">
          <ChevronLeft size={16} strokeWidth={1.6} />
          ADMIN
        </button>
        <span className="text-meta bg-[var(--color-blaze)] text-[var(--color-paper)] px-2 py-1">SECTION 06</span>
      </div>

      <section className="px-4 pt-5 pb-3">
        <div className="text-eyebrow text-[var(--color-blaze)] mb-3">FEATURE CONTROL</div>
        <h1 className="text-headline">EDITOR'S<br/>PICK</h1>
      </section>

      {/* Current pick preview */}
      {pickResult && (
        <div className="mx-4 mb-5 border border-[var(--color-rule)] px-3.5 py-3">
          <div className="text-eyebrow opacity-60">CURRENT PICK</div>
          <div className="font-display text-xl uppercase mt-1">{pickResult.bar.name}</div>
          <div className="text-meta opacity-60 mt-0.5">
            {pickResult.bar.area?.toUpperCase()}
            {pickResult.cheapestBeer && ` · ${pickResult.cheapestBeer.price.toFixed(2)} ${pickResult.cheapestBeer.currency}`}
          </div>
          <div className="text-meta text-[var(--color-blaze)] mt-1">{MODE_LABELS[pickResult.mode as Mode] ?? pickResult.mode}</div>
        </div>
      )}

      {/* Mode selector */}
      <div className="px-4 mb-4">
        <div className="text-eyebrow opacity-60 mb-2">SELECT MODE</div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(MODE_LABELS) as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`min-h-[44px] text-meta uppercase border px-3 ${mode === m ? "bg-[var(--color-blaze)] text-[var(--color-paper)] border-[var(--color-blaze)]" : "border-[var(--color-rule)] opacity-70"}`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Bar selector for manual mode */}
      {mode === "manual" && (
        <div className="px-4 mb-4">
          <div className="text-eyebrow opacity-60 mb-2">CHOOSE BAR</div>
          <select
            value={selectedBarId ?? ""}
            onChange={e => setSelectedBarId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-3 min-h-[44px] text-[var(--color-paper)]"
          >
            <option value="">Select a bar…</option>
            {sortedBars.map(b => (
              <option key={b.id} value={b.id} className="bg-[var(--color-ink)]">{b.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="px-4">
        <button
          onClick={save}
          disabled={setPickMutation.isPending || (mode === "manual" && !selectedBarId)}
          className={`w-full py-4 font-display text-lg uppercase min-h-[44px] transition-colors ${saved ? "bg-[var(--color-verified)] text-[var(--color-ink)]" : "bg-[var(--color-blaze)] text-[var(--color-paper)]"}`}
        >
          {saved ? "SAVED ✓" : setPickMutation.isPending ? "SAVING…" : "SAVE SETTINGS"}
        </button>
      </div>
    </div>
  );
}
