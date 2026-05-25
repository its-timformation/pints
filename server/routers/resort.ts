import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import * as cheerio from "cheerio";

/**
 * Resort router — exposes live mountain conditions and live FX rates.
 *
 * Lift counts:
 *   Portes du Soleil network = 196 lifts (twelve resorts).
 *   Avoriaz alone            = 35 lifts.
 * We scrape onthesnow.co.uk for Avoriaz open counts then estimate the network
 * total as (avoriazOpen / 35) * 196. Better than a hardcoded "34/195" stub and
 * good enough for the homepage status strip; the network operator does not
 * publish a public unified open-lift count.
 *
 * Both onthesnow and open-meteo can fail; we degrade to safe placeholders.
 */

const AVORIAZ_LAT = 46.1893;
const AVORIAZ_LNG = 6.7741;
const NETWORK_TOTAL_LIFTS = 196;
const AVORIAZ_TOTAL_LIFTS = 35;

interface Conditions {
  weather: string;
  temp: number | null;
  condition: string;
  lifts: { open: number; total: number };
  source: "live" | "fallback";
}

async function fetchWeather(): Promise<{ temp: number; condition: string; weather: string } | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${AVORIAZ_LAT}&longitude=${AVORIAZ_LNG}&current=temperature_2m,weather_code,snowfall`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.current;
    if (!c) return null;
    const temp = Math.round(c.temperature_2m);
    const isSnowing = c.weather_code >= 71 && c.weather_code <= 86;
    const condition = isSnowing ? "Powder" : c.weather_code <= 3 ? "Clear" : "Mixed";
    return { temp, condition, weather: `${temp}°C ${condition}` };
  } catch {
    return null;
  }
}

async function fetchOpenLifts(): Promise<number | null> {
  try {
    const res = await fetch("https://www.onthesnow.co.uk/northern-alps/avoriaz/ski-resort", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PintsDuSoleilBot/1.0)" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const nextData = $("#__NEXT_DATA__").html();
    if (!nextData) return null;
    const data = JSON.parse(nextData);
    const open = data?.props?.pageProps?.fullResort?.lifts?.open;
    return typeof open === "number" ? open : null;
  } catch {
    return null;
  }
}

export const resortRouter = router({
  getCondition: publicProcedure.query(async (): Promise<Conditions> => {
    const [weather, openAvoriaz] = await Promise.all([fetchWeather(), fetchOpenLifts()]);

    if (!weather && openAvoriaz == null) {
      // Total fallback — likely summer or offline
      return {
        weather: "—",
        temp: null,
        condition: "Off-season",
        lifts: { open: 0, total: NETWORK_TOTAL_LIFTS },
        source: "fallback",
      };
    }

    // Project Avoriaz open count to the network. Round to whole lifts.
    const networkOpen = openAvoriaz != null
      ? Math.min(NETWORK_TOTAL_LIFTS, Math.round((openAvoriaz / AVORIAZ_TOTAL_LIFTS) * NETWORK_TOTAL_LIFTS))
      : 0;

    return {
      weather: weather?.weather ?? "—",
      temp: weather?.temp ?? null,
      condition: weather?.condition ?? "—",
      lifts: { open: networkOpen, total: NETWORK_TOTAL_LIFTS },
      source: "live",
    };
  }),

  // Live FX rates — frankfurter is free, returns EUR base, no API key needed.
  fxRates: publicProcedure.query(async () => {
    try {
      const res = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR&symbols=GBP,CHF,USD", {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error("Frankfurter unavailable");
      const data = await res.json();
      // Build the same shape the client expects: rates per currency relative to EUR=1
      return {
        EUR: 1,
        GBP: data.rates?.GBP ?? 0.85,
        CHF: data.rates?.CHF ?? 0.95,
        USD: data.rates?.USD ?? 1.08,
        source: "live" as const,
        date: data.date as string | undefined,
      };
    } catch {
      return { EUR: 1, GBP: 0.85, CHF: 0.95, USD: 1.08, source: "fallback" as const };
    }
  }),
});
