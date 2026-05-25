/**
 * Themed loading messages for the app's async states.
 * Curated pool — extend freely. Each surface picks at random.
 */

export const LOADING_MESSAGES = {
  dashboard: [
    "Wiping down the bar before opening",
    "Asking the lifties what's open",
    "Tilting the mountain to find the cheap one",
    "Sweeping snow off the terrace",
    "Lining up tonight's specials",
  ],
  list: [
    "Lining up the pints by price",
    "Stacking watering holes by distance",
    "Sorting bars by altitude",
    "Reading every chalkboard in town",
    "Polishing the brass rails",
  ],
  map: [
    "Plotting bars across twelve villages",
    "Pinning the cheapest pints",
    "Threading the lifts between resorts",
    "Drawing the cable car lines",
    "Marking the best watering holes",
  ],
  resort: [
    "Reading the thermometer outside",
    "Calling up to Avoriaz for conditions",
    "Counting the open chairs",
    "Checking the wind on the col",
    "Asking the snow groomers",
  ],
  bar: [
    "Reading the chalkboard at the door",
    "Asking what's on tap today",
    "Checking the happy hour clock",
    "Pulling the menu off the wall",
  ],
  submit: [
    "Sending your tip down the mountain",
    "Filing your report with the editor",
    "Stamping the receipt",
    "Adding you to the spotters' list",
  ],
  guinness: [
    "Pouring a half. Letting it settle",
    "Topping with a clean cream head",
    "Tilting the glass to 45 degrees",
    "Waiting for the surge to settle",
    "Painting on a proper crown",
    "Splitting the G with care",
  ],
  admin: [
    "Filing the receipts in the back room",
    "Counting tonight's submissions",
    "Polishing the admin pass",
    "Locking the staff door behind you",
  ],
} as const;

export type LoadingSurface = keyof typeof LOADING_MESSAGES;

export function loadingMessage(surface: LoadingSurface, seed?: number): string {
  const pool = LOADING_MESSAGES[surface];
  const i = seed != null ? Math.abs(seed) % pool.length : Math.floor(Math.random() * pool.length);
  return pool[i];
}
