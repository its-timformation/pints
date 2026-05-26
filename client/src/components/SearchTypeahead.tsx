import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { X, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ChipKind = "open" | "happy" | "guinness" | "area" | "drink";

interface Chip {
  id: string;
  kind: ChipKind;
  label: string;
  value?: string;
}

export interface FilterState {
  openOnly: boolean;
  happyOnly: boolean;
  guinnessOnly: boolean;
  areaFilter: string | null;
  query: string;
}

interface Props {
  bars: Array<{
    id: number;
    name: string;
    area?: string | null;
    drinks: Array<{ name: string }>;
  }>;
  initialGuinness?: boolean;
  onChange: (state: FilterState) => void;
}

function chipsToFilterState(chips: Chip[]): FilterState {
  return {
    openOnly: chips.some(c => c.kind === "open"),
    happyOnly: chips.some(c => c.kind === "happy"),
    guinnessOnly: chips.some(c => c.kind === "guinness"),
    areaFilter: chips.find(c => c.kind === "area")?.value ?? null,
    query: chips.find(c => c.kind === "drink")?.value ?? "",
  };
}

export function SearchTypeahead({ bars, initialGuinness, onChange }: Props) {
  const navigate = useNavigate();
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const [input, setInput] = useState("");
  const [chips, setChips] = useState<Chip[]>(() =>
    initialGuinness ? [{ id: "guinness", kind: "guinness", label: "POURS GUINNESS" }] : []
  );
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Emit filter state whenever chips change
  useEffect(() => {
    onChangeRef.current(chipsToFilterState(chips));
  }, [chips]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const suggestions = useMemo(() => {
    const q = input.toLowerCase().trim();
    const activeKinds = new Set(chips.map(c => c.kind));
    const activeAreas = new Set(chips.filter(c => c.kind === "area").map(c => c.value));
    const activeDrinks = new Set(chips.filter(c => c.kind === "drink").map(c => c.value));

    const groups: Array<{ group: string; items: Chip[] }> = [];

    // FILTERS — always shown (if not already active)
    const filterCandidates: Chip[] = [
      { id: "open", kind: "open", label: "OPEN NOW" },
      { id: "happy", kind: "happy", label: "HAPPY HOUR" },
      { id: "guinness", kind: "guinness", label: "POURS GUINNESS" },
    ];
    const filterItems = filterCandidates.filter(c =>
      !activeKinds.has(c.kind) && (!q || c.label.toLowerCase().includes(q))
    );
    if (filterItems.length) groups.push({ group: "FILTERS", items: filterItems });

    // LOCATIONS
    const areas = Array.from(new Set(bars.map(b => b.area).filter(Boolean) as string[])).sort();
    const locationItems = areas
      .filter(a => !activeAreas.has(a) && (!q || a.toLowerCase().includes(q)))
      .slice(0, 4)
      .map(a => ({ id: `area-${a}`, kind: "area" as ChipKind, label: a.toUpperCase(), value: a }));
    if (locationItems.length) groups.push({ group: "LOCATIONS", items: locationItems });

    if (q) {
      // DRINKS
      const drinkNames = new Set<string>();
      bars.forEach(b => b.drinks.forEach(d => {
        if (d.name.toLowerCase().includes(q)) drinkNames.add(d.name);
      }));
      const drinkItems = Array.from(drinkNames)
        .filter(n => !activeDrinks.has(n))
        .slice(0, 4)
        .map(n => ({ id: `drink-${n}`, kind: "drink" as ChipKind, label: n.toUpperCase(), value: n }));
      if (drinkItems.length) groups.push({ group: "DRINKS", items: drinkItems });

      // BARS — navigate directly, not a chip
      const barItems = bars
        .filter(b => b.name.toLowerCase().includes(q))
        .slice(0, 4)
        .map(b => ({ id: `bar-${b.id}`, kind: "open" as ChipKind, label: b.name.toUpperCase(), value: String(b.id) }));
      if (barItems.length) groups.push({ group: "BARS", items: barItems });
    }

    return groups;
  }, [input, bars, chips]);

  const flatItems = useMemo(() => suggestions.flatMap(g => g.items), [suggestions]);

  const addItem = useCallback((item: Chip, groupName: string) => {
    if (groupName === "BARS") {
      navigate(`/bar/${item.value}`);
      setOpen(false);
      setInput("");
      return;
    }
    setChips(prev => {
      if (item.kind === "open" || item.kind === "happy" || item.kind === "guinness") {
        return prev.some(c => c.id === item.id) ? prev : [...prev, item];
      }
      if (item.kind === "area") return [...prev.filter(c => c.kind !== "area"), item];
      if (item.kind === "drink") return [...prev.filter(c => c.kind !== "drink"), item];
      return prev;
    });
    setInput("");
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  }, [navigate]);

  const removeChip = (id: string) => setChips(prev => prev.filter(c => c.id !== id));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && flatItems[activeIdx]) {
        const item = flatItems[activeIdx];
        const group = suggestions.find(g => g.items.some(i => i.id === item.id))?.group ?? "";
        addItem(item, group);
      } else if (input.trim()) {
        // Free-text: treat as drink/bar query chip
        const val = input.trim();
        setChips(prev => [...prev.filter(c => c.kind !== "drink"), { id: `drink-${val}`, kind: "drink", label: val.toUpperCase(), value: val }]);
        setInput("");
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    } else if (e.key === "Backspace" && !input && chips.length > 0) {
      setChips(prev => prev.slice(0, -1));
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div
        className="border border-[var(--color-rule)] px-3 py-2 flex flex-wrap gap-1.5 items-center min-h-[44px] cursor-text"
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        {chips.map(chip => (
          <span key={chip.id} className="flex items-center gap-1 bg-[var(--color-blaze)] text-[var(--color-paper)] px-2 py-0.5 text-meta shrink-0">
            {chip.label}
            <button
              onMouseDown={e => { e.stopPropagation(); removeChip(chip.id); }}
              className="!min-h-0 opacity-70 hover:opacity-100 leading-none"
              aria-label={`Remove ${chip.label}`}
            >
              <X size={10} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-2 flex-1 min-w-[100px]">
          <Search size={14} strokeWidth={1.6} className="opacity-50 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setOpen(true); setActiveIdx(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={chips.length === 0 ? "Search bars, areas or drinks" : ""}
            className="flex-1 bg-transparent py-1 focus:outline-none placeholder:text-[var(--color-paper)] placeholder:opacity-40 min-w-0"
          />
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-50 bg-[var(--color-ink)] border border-[var(--color-rule)] border-t-0 max-h-64 overflow-y-auto shadow-lg">
          {suggestions.map(({ group, items }) => (
            <div key={group}>
              <div className="px-3 py-1 text-eyebrow opacity-40 sticky top-0 bg-[var(--color-ink)]">{group}</div>
              {items.map(item => {
                const idx = flatItems.findIndex(i => i.id === item.id);
                const highlighted = idx === activeIdx;
                return (
                  <button
                    key={item.id}
                    onMouseDown={e => { e.preventDefault(); addItem(item, group); }}
                    className={`w-full text-left px-4 py-2.5 min-h-[44px] text-meta transition-colors ${highlighted ? "bg-[var(--color-blaze)] text-[var(--color-paper)]" : "hover:bg-[var(--color-paper)] hover:bg-opacity-10"}`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
