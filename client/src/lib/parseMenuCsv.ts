import { detectDrinkType } from './detectDrinkType';

export interface ParsedDrinkRow {
  name: string;
  size: string | null;
  price: number;
  currency: string;
  drinkType: string;
  include: boolean;
  warning: string | null;
}

const VALID_CURRENCIES = ['EUR', 'GBP', 'CHF', 'USD'];
const VALID_TYPES = ['draft_beer', 'bottled_beer', 'canned_beer', 'wine', 'cocktail', 'shot', 'spirit', 'vin_chaud', 'other'];

export function parseMenuCsv(text: string): { rows: ParsedDrinkRow[]; error: string | null } {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { rows: [], error: 'File is empty' };

  // Detect and skip header row if present
  const first = lines[0].toLowerCase();
  const hasHeader = first.includes('name') && first.includes('price');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Determine column order from header, default to name,size,price,currency
  let cols = ['name', 'size', 'price', 'currency'];
  if (hasHeader) {
    cols = lines[0].split(',').map(c => c.trim().toLowerCase());
  }

  const rows: ParsedDrinkRow[] = [];
  for (const line of dataLines) {
    // Simple CSV split (handles quoted fields)
    const fields = line.match(/(".*?"|[^,]+)(?=,|$)/g)?.map(f => f.replace(/^"|"$/g, '').trim()) ?? [];
    if (fields.length === 0) continue;

    const get = (key: string) => {
      const idx = cols.indexOf(key);
      return idx >= 0 && idx < fields.length ? fields[idx] : '';
    };

    const name = get('name');
    const sizeRaw = get('size');
    const priceRaw = get('price').replace(/[£$€\s]/g, '');
    let currency = (get('currency') || 'EUR').toUpperCase();
    if (!VALID_CURRENCIES.includes(currency)) currency = 'EUR';

    const rawType = get('type').trim().toLowerCase();
    const drinkType = VALID_TYPES.includes(rawType) ? rawType : detectDrinkType(name);

    const price = parseFloat(priceRaw);

    let warning: string | null = null;
    if (!name) warning = 'Missing name';
    else if (isNaN(price)) warning = 'Invalid price';
    else if (price <= 0 || price > 1000) warning = 'Price looks wrong';

    rows.push({
      name: name || '(unnamed)',
      size: sizeRaw || null,
      price: isNaN(price) ? 0 : price,
      currency,
      drinkType,
      include: warning === null,
      warning,
    });
  }

  return { rows, error: rows.length === 0 ? 'No drink rows found' : null };
}
