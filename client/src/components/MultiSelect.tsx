import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search } from "lucide-react";

export function MultiSelect({ options, selected, onChange, placeholder, icon }: any) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s: string) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const filteredOptions = options.filter((opt: string) =>
    opt.toLowerCase().includes(query.toLowerCase())
  );

  const active = selected.length > 0;

  return (
    <div className="relative snap-center shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-2 border text-eyebrow transition-colors ${
          active
            ? 'bg-[var(--color-blaze)] text-[var(--color-paper)] border-[var(--color-blaze)]'
            : 'bg-transparent border-[var(--color-rule)] text-[var(--color-paper)]/80 hover:border-[var(--color-blaze)]'
        }`}
      >
        {icon}
        <span>{placeholder}{active ? ` · ${selected.length}` : ''}</span>
        <ChevronDown size={12} strokeWidth={2.5} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-56 bg-[var(--color-ink-card)] border border-[var(--color-rule)] shadow-2xl max-h-60 overflow-y-auto left-0">
          <div className="p-2 hairline-b sticky top-0 bg-[var(--color-ink-card)] z-10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-paper)]/40" size={12} />
              <input
                type="text"
                placeholder="SEARCH"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-transparent border border-[var(--color-rule)] py-1.5 pl-7 pr-2 text-meta text-[var(--color-paper)] focus:outline-none focus:border-[var(--color-blaze)]"
              />
            </div>
          </div>
          {filteredOptions.length === 0 && (
            <div className="px-4 py-3 text-meta opacity-50 text-center">NO MATCH</div>
          )}
          {filteredOptions.map((opt: string) => {
            const isSel = selected.includes(opt);
            return (
              <div
                key={opt}
                onClick={() => toggle(opt)}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between text-sm transition-colors hairline-b last:border-0 ${
                  isSel
                    ? 'bg-[var(--color-blaze)]/15 text-[var(--color-paper)]'
                    : 'text-[var(--color-paper)]/80 hover:bg-[var(--color-paper)]/5'
                }`}
              >
                <span className="capitalize">{opt.replace('-', ' ')}</span>
                {isSel && <Check size={14} className="text-[var(--color-blaze)]" strokeWidth={3} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
