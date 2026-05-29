import { useState } from "react";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { trpc } from "../lib/trpc";
import { LoadingMessage } from "../components/LoadingMessage";

interface Props { onBack: () => void; }

export default function DealsManager({ onBack }: Props) {
  const { data: bars } = trpc.bars.getAll.useQuery();
  const { data: deals, isLoading, refetch } = trpc.bars.getDeals.useQuery();
  const createMutation = trpc.admin.createDeal.useMutation();
  const toggleMutation = trpc.admin.setDealActive.useMutation();
  const deleteMutation = trpc.admin.deleteDeal.useMutation();

  const [showForm, setShowForm] = useState(false);
  const [barId, setBarId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"happy_hour"|"promotion"|"event">("happy_hour");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("18:00");
  const [description, setDescription] = useState("");

  if (isLoading) return <LoadingMessage surface="admin" />;

  const barName = (id: number) => bars?.find(b => b.id === id)?.name ?? `Bar #${id}`;

  const save = async () => {
    if (!barId || !title) return;
    await createMutation.mutateAsync({
      barId: Number(barId), title, type, startTime, endTime, description,
      daysOfWeek: JSON.stringify([0,1,2,3,4,5,6]), isActive: true,
    });
    setShowForm(false); setTitle(""); setDescription(""); setBarId("");
    refetch();
  };

  return (
    <div className="grain-ink pb-6">
      <div className="px-4 py-3 flex items-center justify-between hairline-b">
        <button onClick={onBack} className="flex items-center gap-1.5 text-meta opacity-70 !min-h-0">
          <ChevronLeft size={16} strokeWidth={1.6} />ADMIN
        </button>
        <span className="text-meta bg-[var(--color-blaze)] text-[var(--color-paper)] px-2 py-1">SECTION 04</span>
      </div>

      <section className="px-4 pt-5 pb-3">
        <div className="text-eyebrow text-[var(--color-blaze)] mb-3">DEALS · {(deals?.length ?? 0).toString().padStart(2,"0")} ON FILE</div>
        <h1 className="text-headline">DEALS &amp;<br/>EVENTS</h1>
      </section>

      <button onClick={() => setShowForm(s => !s)} className="mx-4 mb-4 w-[calc(100%-2rem)] bg-[var(--color-blaze)] text-[var(--color-paper)] py-3 font-display text-base uppercase flex items-center justify-center gap-2">
        <Plus size={16} strokeWidth={2} />
        {showForm ? "CANCEL" : "ADD A DEAL"}
      </button>

      {showForm && (
        <div className="mx-4 mb-4 border border-[var(--color-rule)] p-3 space-y-3">
          <select value={barId} onChange={(e) => setBarId(e.target.value ? Number(e.target.value) : "")} className="w-full bg-transparent border border-[var(--color-rule)] px-3 py-3">
            <option value="" className="bg-[var(--color-ink)]">Select bar…</option>
            {(bars ?? []).map(b => <option key={b.id} value={b.id} className="bg-[var(--color-ink)]">{b.name} · {b.area}</option>)}
          </select>
          <input type="text" placeholder="Title (e.g. Happy Hour)" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-transparent border border-[var(--color-rule)] px-3 py-3" />
          <select value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-transparent border border-[var(--color-rule)] px-3 py-3">
            <option value="happy_hour" className="bg-[var(--color-ink)]">Happy hour</option>
            <option value="promotion" className="bg-[var(--color-ink)]">Promotion</option>
            <option value="event" className="bg-[var(--color-ink)]">Event</option>
          </select>
          <div className="flex gap-2">
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="flex-1 bg-transparent border border-[var(--color-rule)] px-3 py-3" />
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="flex-1 bg-transparent border border-[var(--color-rule)] px-3 py-3" />
          </div>
          <input type="text" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-transparent border border-[var(--color-rule)] px-3 py-3" />
          <button onClick={save} className="w-full bg-[var(--color-paper)] text-[var(--color-ink)] py-3 font-display uppercase">Save deal</button>
        </div>
      )}

      <ul className="px-3">
        {(deals ?? []).map((d, i) => (
          <li key={d.id} className="hairline-b-soft flex items-center gap-3 py-3">
            <span className="num-rail text-[var(--color-blaze)] w-7 shrink-0">{String(i+1).padStart(2,"0")}</span>
            <div className="flex-1 min-w-0">
              <div className="font-display text-base uppercase truncate">{d.title}</div>
              <div className="text-meta opacity-60 mt-0.5">
                {barName(d.barId).toUpperCase()} · {d.startTime}–{d.endTime} · {d.type.toUpperCase()}
              </div>
            </div>
            <button onClick={async () => { await toggleMutation.mutateAsync({ id: d.id, isActive: !d.isActive }); refetch(); }}
              className={`shrink-0 px-2 py-1 text-meta !min-h-0 ${d.isActive ? "bg-[var(--color-verified)] text-[var(--color-ink)]" : "border border-[var(--color-rule)] opacity-55"}`}>
              {d.isActive ? "ACTIVE" : "PAUSED"}
            </button>
            <button onClick={async () => { if (confirm("Delete this deal?")) { await deleteMutation.mutateAsync({ id: d.id }); refetch(); } }}
              className="shrink-0 p-2 opacity-55 !min-h-0" aria-label="Delete">
              <Trash2 size={14} strokeWidth={1.6} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
