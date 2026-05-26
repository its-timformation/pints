import { useState, useRef, useEffect } from "react";
import { ChevronLeft, Trash2, Edit2, ChevronDown, ChevronUp, Check, X, Upload } from "lucide-react";
import { trpc } from "../lib/trpc";

interface Props { onBack: () => void; }

export default function BarsManager({ onBack }: Props) {
  const { data: bars, refetch } = trpc.bars.getAll.useQuery();
  const deleteBar = trpc.admin.deleteBar.useMutation({ onSuccess: () => refetch() });
  const [expandedBar, setExpandedBar] = useState<number | null>(null);

  const sortedBars = [...(bars || [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="grain-ink min-h-full pb-8">
      <div className="px-4 py-3 flex items-center justify-between hairline-b">
        <button onClick={onBack} className="flex items-center gap-1.5 text-meta opacity-70">
          <ChevronLeft size={16} strokeWidth={1.6} />
          ADMIN
        </button>
        <span className="text-meta bg-[var(--color-blaze)] text-[var(--color-paper)] px-2 py-1">SECTION 02</span>
      </div>

      <section className="px-4 pt-5 pb-3">
        <div className="text-eyebrow text-[var(--color-blaze)] mb-3">DIRECTORY · {(bars?.length ?? 0).toString().padStart(2,"0")} BARS</div>
        <h1 className="text-headline">BARS<br/>DIRECTORY</h1>
      </section>

      <div className="px-3 space-y-3">
        {sortedBars.map(bar => (
          <div key={bar.id} className="border border-[var(--color-rule)]">
            <div className="flex justify-between items-center p-3">
              <button
                className="flex-1 text-left min-h-[44px] py-1"
                onClick={() => setExpandedBar(expandedBar === bar.id ? null : bar.id)}
              >
                <div className="font-display text-base uppercase flex items-center gap-2">
                  {bar.name}
                  {expandedBar === bar.id ? <ChevronUp size={14} strokeWidth={1.6} /> : <ChevronDown size={14} strokeWidth={1.6} />}
                </div>
                <div className="text-meta opacity-60 mt-0.5">
                  {bar.area?.toUpperCase()}{bar.servesGuinness ? " · POURS GUINNESS" : ""}
                </div>
              </button>
              <button
                onClick={() => { if (confirm('Delete bar and all its drinks/deals?')) deleteBar.mutate({ id: bar.id }); }}
                disabled={deleteBar.isPending}
                className="p-2 min-h-[44px] min-w-[44px] opacity-60 hover:opacity-100"
                aria-label="Delete bar"
              >
                <Trash2 size={14} strokeWidth={1.6} />
              </button>
            </div>

            {expandedBar === bar.id && (
              <div className="p-3 border-t border-[var(--color-rule)] bg-[var(--color-ink-card)] bg-opacity-50">
                <BarDetailsEditor barId={bar.id} barData={bar} onUpdate={refetch} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4).toString().padStart(2, "0");
  const m = ((i % 4) * 15).toString().padStart(2, "0");
  return `${h}:${m}`;
});

const ALL_AREAS = [
  "Morzine", "Les Gets", "Avoriaz", "Montriond",
  "Châtel", "Morgins", "Champéry", "Les Crosets",
  "Champoussin", "St Jean d'Aulps", "Abondance",
  "La Chapelle d'Abondance", "Torgon", "Val-d'Illiez", "Ardent"
];

function AreaTypeahead({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = ALL_AREAS.filter(a => a.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange(e.target.value); }}
        onFocus={() => setOpen(true)}
        className="w-full bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-2 text-[var(--color-paper)]"
        placeholder="Area"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 bg-[var(--color-ink)] border border-[var(--color-rule)] max-h-40 overflow-y-auto">
          {filtered.map(a => (
            <li key={a}>
              <button onClick={() => { setQuery(a); onChange(a); setOpen(false); }} className="w-full text-left px-3 py-2.5 min-h-[44px] hover:bg-[var(--color-ink-card)]">
                <span className="text-meta">{a.toUpperCase()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BarDetailsEditor({ barId, barData, onUpdate }: { barId: number; barData: any; onUpdate: () => void }) {
  const { data: barDetails, refetch } = trpc.bars.getById.useQuery({ id: barId });
  const deleteDrink = trpc.admin.deleteDrink.useMutation({ onSuccess: () => refetch() });
  const deleteDeal = trpc.admin.deleteDeal.useMutation({ onSuccess: () => refetch() });
  const updateBar = trpc.admin.updateBar.useMutation({ onSuccess: () => { refetch(); onUpdate(); } });

  const resolveMapLink = trpc.admin.resolveMapLink.useMutation();

  const [editingBar, setEditingBar] = useState(false);
  const [barForm, setBarForm] = useState(barData);
  const [uploading, setUploading] = useState(false);
  const [mapLinkInput, setMapLinkInput] = useState('');
  const [mapLinkStatus, setMapLinkStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleMapLinkPaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    setMapLinkStatus('loading');
    try {
      const result = await resolveMapLink.mutateAsync({ url: text });
      setBarForm((prev: any) => ({ ...prev, lat: result.lat, lng: result.lng, googleMapsUrl: text }));
      setMapLinkInput('');
      setMapLinkStatus('success');
      setTimeout(() => setMapLinkStatus('idle'), 2500);
    } catch {
      setMapLinkStatus('error');
      setTimeout(() => setMapLinkStatus('idle'), 3000);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setBarForm({ ...barForm, imageUrl: data.url });
    } catch {
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const [openTime = "12:00", closeTime = "23:00"] = (barForm.openingHours || "12:00-23:00").split("-");

  if (!barDetails) return <div className="text-meta opacity-60">Loading details…</div>;

  return (
    <div className="space-y-5">
      <div className="bg-[var(--color-ink-soft)] bg-opacity-50 p-3 border border-[var(--color-rule)]">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-eyebrow opacity-70">BAR DETAILS</h3>
          <button onClick={() => setEditingBar(!editingBar)} className="text-meta text-[var(--color-blaze)] min-h-[44px] flex items-center gap-1 px-2">
            {editingBar ? <X size={12} /> : <Edit2 size={12} />} {editingBar ? 'CANCEL' : 'EDIT'}
          </button>
        </div>

        {editingBar ? (
          <div className="space-y-2">
            <input value={barForm.name} onChange={e => setBarForm({ ...barForm, name: e.target.value })}
              className="w-full bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-3 min-h-[44px]" placeholder="Name" />
            <AreaTypeahead value={barForm.area || ""} onChange={v => setBarForm({ ...barForm, area: v })} />
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-meta opacity-60 mb-1">OPENS</div>
                <select
                  value={openTime}
                  onChange={e => setBarForm({ ...barForm, openingHours: `${e.target.value}-${closeTime}` })}
                  className="w-full bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-3 min-h-[44px]"
                >
                  {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-[var(--color-ink)]">{t}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <div className="text-meta opacity-60 mb-1">CLOSES</div>
                <select
                  value={closeTime}
                  onChange={e => setBarForm({ ...barForm, openingHours: `${openTime}-${e.target.value}` })}
                  className="w-full bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-3 min-h-[44px]"
                >
                  {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-[var(--color-ink)]">{t}</option>)}
                </select>
              </div>
            </div>
            <select value={barForm.type} onChange={e => setBarForm({ ...barForm, type: e.target.value })}
              className="w-full bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-3 min-h-[44px]">
              {["bar","pub","restaurant-bar","slope-side","club"].map(t => <option key={t} value={t} className="bg-[var(--color-ink)]">{t}</option>)}
            </select>

            <label className="flex items-center gap-2 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!barForm.servesGuinness}
                onChange={e => setBarForm({ ...barForm, servesGuinness: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-meta">POURS GUINNESS</span>
            </label>

            {/* Google Maps link → auto-fill coordinates */}
            <div>
              <div className="text-meta opacity-60 mb-1">PASTE GOOGLE MAPS LINK</div>
              <input
                type="text"
                value={mapLinkInput}
                onChange={e => setMapLinkInput(e.target.value)}
                onPaste={handleMapLinkPaste}
                placeholder="Paste a Google Maps share link to auto-fill coordinates"
                className="w-full bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-2 text-sm"
              />
              {mapLinkStatus === 'loading' && <div className="text-meta opacity-60 mt-1 text-xs">RESOLVING…</div>}
              {mapLinkStatus === 'success' && <div className="text-meta text-[var(--color-verified)] mt-1 text-xs">✓ COORDINATES SET</div>}
              {mapLinkStatus === 'error' && <div className="text-meta text-[var(--color-blaze)] mt-1 text-xs">COULDN'T READ LINK — CHECK IT'S A GOOGLE MAPS URL</div>}
            </div>

            {/* Lat / Lng (filled automatically from Maps link or edited manually) */}
            <div className="flex gap-2">
              <div className="flex-1">
                <div className="text-meta opacity-60 mb-1">LAT</div>
                <input
                  type="number"
                  step="0.00001"
                  value={barForm.lat ?? ''}
                  onChange={e => setBarForm({ ...barForm, lat: parseFloat(e.target.value) })}
                  className="w-full bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-2"
                />
              </div>
              <div className="flex-1">
                <div className="text-meta opacity-60 mb-1">LNG</div>
                <input
                  type="number"
                  step="0.00001"
                  value={barForm.lng ?? ''}
                  onChange={e => setBarForm({ ...barForm, lng: parseFloat(e.target.value) })}
                  className="w-full bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-2"
                />
              </div>
            </div>

            {/* Website URL */}
            <input
              type="text"
              value={barForm.websiteUrl || ''}
              onChange={e => setBarForm({ ...barForm, websiteUrl: e.target.value || null })}
              placeholder="Website URL (https://…)"
              className="w-full bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-2 text-sm"
            />

            <label className="flex items-center justify-center gap-2 bg-[var(--color-ink-card)] border border-[var(--color-rule)] cursor-pointer p-2 relative overflow-hidden">
              {uploading ? <span className="animate-pulse text-meta">UPLOADING…</span> : (
                <>
                  <Upload size={14} strokeWidth={1.6} />
                  <span className="text-meta">{barForm.imageUrl ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
            {barForm.imageUrl && <img src={barForm.imageUrl} alt="Preview" className="w-full h-32 object-cover border border-[var(--color-rule)]" />}

            <button
              onClick={() => {
                updateBar.mutate({
                  id: barId, name: barForm.name, area: barForm.area, openingHours: barForm.openingHours,
                  type: barForm.type, lat: barForm.lat, lng: barForm.lng, imageUrl: barForm.imageUrl,
                  servesGuinness: !!barForm.servesGuinness,
                  googleMapsUrl: barForm.googleMapsUrl ?? null,
                  websiteUrl: barForm.websiteUrl ?? null,
                });
                setEditingBar(false);
              }}
              className="w-full bg-[var(--color-blaze)] text-[var(--color-paper)] py-2 font-display uppercase mt-2"
            >SAVE BAR</button>
          </div>
        ) : (
          <div className="text-meta opacity-80 space-y-1">
            {barData.imageUrl && <img src={barData.imageUrl} alt={barData.name} className="w-full h-24 object-cover mb-2 opacity-60" />}
            <div><span className="opacity-60">AREA:</span> {barData.area?.toUpperCase()}</div>
            <div><span className="opacity-60">HOURS:</span> {barData.openingHours}</div>
            <div><span className="opacity-60">TYPE:</span> {barData.type?.toUpperCase()}</div>
            <div><span className="opacity-60">GUINNESS:</span> {barData.servesGuinness ? "YES" : "NO"}</div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-eyebrow opacity-70 mb-2">DRINKS</h3>
        <div className="space-y-1.5">
          {barDetails.drinks?.map(drink => (
            <DrinkRow key={drink.id} drink={drink} onDelete={() => deleteDrink.mutate({ id: drink.id })} onUpdate={refetch} />
          ))}
          {barDetails.drinks?.length === 0 && <div className="text-meta opacity-55">No drinks yet.</div>}
        </div>
      </div>

      <div>
        <h3 className="text-eyebrow opacity-70 mb-2">EVENTS / DEALS</h3>
        <div className="space-y-1.5">
          {barDetails.deals?.map(deal => (
            <DealRow key={deal.id} deal={deal} onDelete={() => deleteDeal.mutate({ id: deal.id })} onUpdate={refetch} />
          ))}
          {barDetails.deals?.length === 0 && <div className="text-meta opacity-55">No deals yet.</div>}
        </div>
      </div>
    </div>
  );
}

function DrinkRow({ drink, onDelete, onUpdate }: any) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(drink);
  const updateDrink = trpc.admin.updateDrink.useMutation({ onSuccess: () => { onUpdate(); setEditing(false); } });

  if (editing) {
    return (
      <div className="space-y-2 p-2 bg-[var(--color-ink-soft)] border border-[var(--color-rule)]">
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-2.5 min-h-[44px] text-sm" placeholder="Drink name" />
        <div className="flex gap-2">
          <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
            className="flex-1 bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-2.5 min-h-[44px] text-sm" placeholder="Price" />
          <select
            value={form.currency}
            onChange={e => setForm({ ...form, currency: e.target.value })}
            className="bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-2 min-h-[44px] text-sm text-[var(--color-paper)]"
          >
            <option value="EUR" className="bg-[var(--color-ink)]">EUR</option>
            <option value="GBP" className="bg-[var(--color-ink)]">GBP</option>
            <option value="CHF" className="bg-[var(--color-ink)]">CHF</option>
          </select>
        </div>
        <label className="flex items-center gap-2 min-h-[44px] cursor-pointer">
          <input type="checkbox" checked={form.isVerified} onChange={e => setForm({ ...form, isVerified: e.target.checked })} className="w-5 h-5" />
          <span className="text-meta opacity-70">VERIFIED</span>
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => updateDrink.mutate({ id: drink.id, name: form.name, price: parseFloat(form.price), currency: form.currency, isVerified: form.isVerified })}
            className="flex-1 bg-[var(--color-verified)] text-[var(--color-ink)] min-h-[44px] font-display uppercase text-sm"
          >SAVE</button>
          <button onClick={() => setEditing(false)} className="flex-1 border border-[var(--color-rule)] min-h-[44px] text-meta uppercase opacity-70">CANCEL</button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 p-2 bg-[var(--color-ink-soft)] bg-opacity-50 min-h-[44px]">
      <div className="flex-1 min-w-0">
        <span className="font-display text-sm uppercase truncate block">{drink.name}</span>
        <span className="text-meta opacity-65">{drink.price.toFixed(2)} {drink.currency}{drink.isVerified ? " · VER" : ""}</span>
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 min-h-[44px] border border-[var(--color-rule)] text-[var(--color-blaze)]">
          <Edit2 size={12} strokeWidth={1.6} /><span className="text-meta">EDIT</span>
        </button>
        <button onClick={() => { if (confirm('Delete drink?')) onDelete(); }} className="flex items-center gap-1.5 px-3 min-h-[44px] border border-[var(--color-rule)] opacity-60 hover:opacity-100 hover:text-[var(--color-blaze)]">
          <Trash2 size={12} strokeWidth={1.6} /><span className="text-meta">DEL</span>
        </button>
      </div>
    </div>
  );
}

function DealRow({ deal, onDelete, onUpdate }: any) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(deal);
  const updateDeal = trpc.admin.updateDeal.useMutation({ onSuccess: () => { onUpdate(); setEditing(false); } });

  if (editing) {
    return (
      <div className="space-y-2 p-2 bg-[var(--color-ink-soft)] border border-[var(--color-rule)]">
        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
          className="w-full bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-2.5 min-h-[44px] text-sm" placeholder="Title" />
        <div className="flex gap-2">
          <input value={form.startTime || ''} onChange={e => setForm({ ...form, startTime: e.target.value })}
            className="flex-1 bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-2.5 min-h-[44px] text-sm" placeholder="Start" />
          <input value={form.endTime || ''} onChange={e => setForm({ ...form, endTime: e.target.value })}
            className="flex-1 bg-[var(--color-ink-card)] border border-[var(--color-rule)] px-3 py-2.5 min-h-[44px] text-sm" placeholder="End" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => updateDeal.mutate({ id: deal.id, title: form.title, type: deal.type, startTime: form.startTime, endTime: form.endTime })}
            className="flex-1 bg-[var(--color-verified)] text-[var(--color-ink)] min-h-[44px] font-display uppercase text-sm"
          >SAVE</button>
          <button onClick={() => setEditing(false)} className="flex-1 border border-[var(--color-rule)] min-h-[44px] text-meta uppercase opacity-70">CANCEL</button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 p-2 bg-[var(--color-ink-soft)] bg-opacity-50 min-h-[44px]">
      <div className="flex-1 min-w-0">
        <span className="font-display text-sm uppercase block truncate">{deal.title}</span>
        {deal.startTime && <span className="text-meta opacity-60">{deal.startTime}–{deal.endTime}</span>}
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 min-h-[44px] border border-[var(--color-rule)] text-[var(--color-blaze)]">
          <Edit2 size={12} strokeWidth={1.6} /><span className="text-meta">EDIT</span>
        </button>
        <button onClick={() => { if (confirm('Delete deal?')) onDelete(); }} className="flex items-center gap-1.5 px-3 min-h-[44px] border border-[var(--color-rule)] opacity-60 hover:opacity-100 hover:text-[var(--color-blaze)]">
          <Trash2 size={12} strokeWidth={1.6} /><span className="text-meta">DEL</span>
        </button>
      </div>
    </div>
  );
}
