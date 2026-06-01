import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_SIZES } from "../lib/drinkSizes";
import { trpc } from "../lib/trpc";

interface Props {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SizeSelect({ value, onChange, className = '', disabled = false }: Props) {
  const { data: customSizes = [], refetch } = trpc.admin.getCustomSizes.useQuery();
  const addCustomSize = trpc.admin.addCustomSize.useMutation({ onSuccess: () => refetch() });

  const [showInput, setShowInput] = useState(false);
  const [newSize, setNewSize] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  const allSizes = useMemo(() => {
    const base = [
      ...DEFAULT_SIZES,
      ...customSizes.filter(s => !(DEFAULT_SIZES as readonly string[]).includes(s)),
    ];
    if (value && !(base as string[]).includes(value)) return [value, ...base];
    return base as string[];
  }, [customSizes, value]);

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === '__add__') {
      setShowInput(true);
    } else {
      onChange(e.target.value);
    }
  }

  async function handleAddSize() {
    const trimmed = newSize.trim();
    if (!trimmed) return;
    try {
      await addCustomSize.mutateAsync({ size: trimmed });
      onChange(trimmed);
      setNewSize('');
      setShowInput(false);
    } catch {}
  }

  return (
    <div className="space-y-1.5">
      <select
        value={value}
        onChange={handleSelectChange}
        disabled={disabled}
        className={`w-full bg-transparent border border-[var(--color-rule)] text-[var(--color-paper)] px-3 py-3 focus:outline-none focus:border-[var(--color-blaze)] ${className}`}
      >
        {allSizes.map(s => (
          <option key={s} value={s} className="bg-[var(--color-ink)]">{s}</option>
        ))}
        <option value="__add__" className="bg-[var(--color-ink)]">+ ADD NEW SIZE...</option>
      </select>

      {showInput && (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newSize}
            onChange={e => setNewSize(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleAddSize(); }
              if (e.key === 'Escape') { setShowInput(false); setNewSize(''); }
            }}
            placeholder="e.g. 40CL or Tulip"
            maxLength={20}
            className="flex-1 bg-transparent border border-[var(--color-rule)] text-[var(--color-paper)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-blaze)]"
          />
          <button
            type="button"
            onClick={handleAddSize}
            disabled={!newSize.trim() || addCustomSize.isPending}
            className="shrink-0 border border-[var(--color-blaze)] text-[var(--color-blaze)] px-3 py-2 text-meta disabled:opacity-30"
          >
            {addCustomSize.isPending ? '…' : 'ADD'}
          </button>
          <button
            type="button"
            onClick={() => { setShowInput(false); setNewSize(''); }}
            className="shrink-0 border border-[var(--color-rule)] px-3 py-2 text-meta opacity-60"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
