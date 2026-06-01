import { useEffect, useRef, useState } from "react";
import { trpc } from "../lib/trpc";

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function DrinkNameInput({
  value,
  onChange,
  disabled = false,
  placeholder = "e.g. Kronenbourg 1664",
  className = '',
  required = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: suggestions = [] } = trpc.bars.searchDrinkNames.useQuery(
    { q: value },
    { enabled: value.length >= 2 && !disabled },
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const showDropdown = open && suggestions.length > 0 && value.length >= 2;

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full bg-transparent border border-[var(--color-rule)] text-[var(--color-paper)] px-3 py-3 focus:outline-none focus:border-[var(--color-blaze)] disabled:opacity-50"
      />
      {showDropdown && (
        <ul className="absolute top-full left-0 right-0 z-30 bg-[var(--color-ink)] border border-[var(--color-rule)] border-t-0 max-h-48 overflow-y-auto">
          {suggestions.map(name => (
            <li key={name}>
              <button
                type="button"
                onClick={() => { onChange(name); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 min-h-[44px] hover:bg-[var(--color-ink-card)] font-display text-sm uppercase"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
