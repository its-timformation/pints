export type DrinkType = 'draft_beer' | 'bottled_beer' | 'canned_beer' | 'wine' |
  'cocktail' | 'shot' | 'spirit' | 'vin_chaud' | 'other';

const DRAFT_PATTERNS = [
  /draught|draft|pression|\bpint\b/i,
  /kronenbourg|1664|heineken|carlsberg|stella|leffe|hoegaarden|murphy/i,
  /guinness|kilkenny|mahou|tiger|san miguel/i,
];
const BOTTLED_PATTERNS = [
  /\bbottle\b|bouteille|corona|peroni|desperados|brooklyn/i,
  /ipa|pale ale|lager|bière artisanale|blonde du/i,
];
const CANNED_PATTERNS = [/\bcan\b|\bcanned\b/i];
const WINE_PATTERNS = [
  /wine|vin\b|vino|rouge|blanc|rosé|rose|champagne|prosecco|cava|moët|chandon|kir\b/i,
  /pinot|chardonnay|sauvignon|merlot|cabernet|bordeaux|bourgogne/i,
  /spritz|hugo|aperol spritz|saint germain|limoncello spritz/i,
];
const COCKTAIL_PATTERNS = [
  /mojito|cosmopolitan|margarita|daiquiri|negroni|manhattan|old fashioned/i,
  /long island|pina colada|bellini|aperol|spritz|moscow mule/i,
  /sex on the|gin tonic|vodka|rum|tequila sunrise/i,
  /cocktail|virgin|sans alcool|without alcohol/i,
];
const SHOT_PATTERNS = [
  /shot|shooter|jager|jäger|sambuca|tequila\b|genepi|génépi/i,
  /baby guinness|bomb|jagerbomb|b52/i,
  /shooters d'alcool|ski de shooter/i,
];
const SPIRIT_PATTERNS = [
  /whisky|whiskey|bourbon|scotch|jameson|jack daniel|glenfiddich/i,
  /gin\b|vodka\b|rum\b|bacardi|smirnoff|absolut|tanqueray|hendricks/i,
  /cognac|brandy|armagnac|calvados|marc\b|eau de vie/i,
  /ricard|pastis|pernod|suze|campari|martini\b/i,
];
const VIN_CHAUD_PATTERNS = [/vin chaud|mulled wine|glühwein|grog|jägertee|hot wine/i];
const PICON_PATTERNS = [/picon|bière sirop|bierre sirop/i];

export function detectDrinkType(name: string): DrinkType {
  if (VIN_CHAUD_PATTERNS.some(p => p.test(name))) return 'vin_chaud';
  if (PICON_PATTERNS.some(p => p.test(name))) return 'draft_beer';
  if (SHOT_PATTERNS.some(p => p.test(name))) return 'shot';
  if (WINE_PATTERNS.some(p => p.test(name))) return 'wine';
  if (COCKTAIL_PATTERNS.some(p => p.test(name))) return 'cocktail';
  if (SPIRIT_PATTERNS.some(p => p.test(name))) return 'spirit';
  if (CANNED_PATTERNS.some(p => p.test(name))) return 'canned_beer';
  if (BOTTLED_PATTERNS.some(p => p.test(name))) return 'bottled_beer';
  if (DRAFT_PATTERNS.some(p => p.test(name))) return 'draft_beer';
  return 'other';
}

export const DRINK_TYPE_LABELS: Record<DrinkType, string> = {
  draft_beer: 'DRAFT BEER',
  bottled_beer: 'BOTTLED BEER',
  canned_beer: 'CANNED BEER',
  wine: 'WINE & CHAMPAGNE',
  cocktail: 'COCKTAILS',
  shot: 'SHOTS & SHOOTERS',
  spirit: 'SPIRITS',
  vin_chaud: 'VIN CHAUD & HOT',
  other: 'OTHER',
};

export const DRINK_TYPE_ORDER: DrinkType[] = [
  'draft_beer', 'bottled_beer', 'canned_beer', 'wine',
  'cocktail', 'shot', 'spirit', 'vin_chaud', 'other',
];
