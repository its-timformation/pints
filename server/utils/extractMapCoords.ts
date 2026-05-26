/**
 * Resolves a Google Maps URL or short link (maps.app.goo.gl/xxx) to coordinates.
 *
 * Mobile share links from Google Maps app produce short links like:
 *   https://maps.app.goo.gl/AbCdEfG
 *
 * These redirect through several hops to a final URL like:
 *   https://www.google.com/maps/place/Le+Tavaillon/@46.1905,6.7718,17z/...
 *
 * The coordinates are ALWAYS in the final URL in the @lat,lng pattern.
 * We do NOT need to parse HTML for coordinates — just follow redirects and
 * extract from the final URL.
 */

export interface MapLinkResult {
  lat: number;
  lng: number;
  websiteUrl: string | null;
  finalUrl: string;
  placeName: string | null;
}

function extractCoordsFromUrl(url: string): { lat: number; lng: number } | null {
  // Primary: /@lat,lng,zoom — most common format
  const atSign = url.match(/@(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/);
  if (atSign) return { lat: parseFloat(atSign[1]), lng: parseFloat(atSign[2]) };

  // Secondary: ?q=lat,lng or &q=lat,lng
  const qParam = url.match(/[?&]q=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/);
  if (qParam) return { lat: parseFloat(qParam[1]), lng: parseFloat(qParam[2]) };

  // Tertiary: !3d lat !4d lng (data parameter format)
  const data = url.match(/!3d(-?\d{1,3}\.\d{4,}).*?!4d(-?\d{1,3}\.\d{4,})/);
  if (data) return { lat: parseFloat(data[1]), lng: parseFloat(data[2]) };

  // ll= parameter
  const ll = url.match(/[?&]ll=(-?\d{1,3}\.\d{4,}),(-?\d{1,3}\.\d{4,})/);
  if (ll) return { lat: parseFloat(ll[1]), lng: parseFloat(ll[2]) };

  return null;
}

function extractPlaceName(url: string): string | null {
  const placeMatch = url.match(/\/maps\/place\/([^/@]+)/);
  if (!placeMatch) return null;
  return decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
}

async function followRedirects(url: string, maxHops = 6): Promise<string> {
  const userAgents = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ];

  for (const ua of userAgents) {
    let current = url;
    for (let i = 0; i < maxHops; i++) {
      try {
        const res = await fetch(current, {
          method: "GET",
          redirect: "manual",
          headers: {
            "User-Agent": ua,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-GB,en;q=0.9",
          },
          signal: AbortSignal.timeout(6000),
        });

        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get("location");
          if (!location) break;
          current = location.startsWith("http") ? location : new URL(location, current).href;
          if (extractCoordsFromUrl(current)) return current;
          continue;
        }

        return res.url || current;
      } catch {
        break;
      }
    }

    if (extractCoordsFromUrl(current)) return current;
  }

  return url;
}

async function extractWebsiteFromHtml(mapsUrl: string): Promise<string | null> {
  try {
    const res = await fetch(mapsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
      signal: AbortSignal.timeout(6000),
    });
    const html = await res.text();

    const patterns = [
      /"(https?:\/\/(?!(?:www\.)?(?:google|goo\.gl|googleapis|googleusercontent|youtube|facebook|instagram|twitter))[a-zA-Z0-9][^"]{3,60})"(?:[^}]*)"website"/,
      /"website","(https?:\/\/(?!(?:www\.)?google)[^"]+)"/,
      /\["(https?:\/\/(?!(?:www\.)?(?:google|goo))[^"]{5,80})"\].*?website/s,
      /data-url="(https?:\/\/(?!(?:www\.)?google)[^"]+)"/,
      /href="(https?:\/\/(?!(?:www\.)?(?:google|goo\.gl))[^"]{5,80})"[^>]*aria-label="[^"]*(?:website|site|web)"/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        const candidate = match[1];
        if (candidate.length > 8 && candidate.length < 200 && !candidate.includes("\\")) {
          return candidate;
        }
      }
    }
  } catch {
    // Website extraction is best-effort
  }
  return null;
}

export async function resolveGoogleMapsLink(url: string): Promise<MapLinkResult> {
  if (!url.match(/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i)) {
    throw new Error(
      "This doesn't look like a Google Maps link. Share links look like: https://maps.app.goo.gl/..."
    );
  }

  const finalUrl = await followRedirects(url);
  const coords = extractCoordsFromUrl(finalUrl);

  if (!coords) {
    // Last attempt: follow with redirect:follow and check response URL
    try {
      const res = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        },
        signal: AbortSignal.timeout(8000),
      });
      const responseUrl = res.url;
      const fallbackCoords = extractCoordsFromUrl(responseUrl);
      if (fallbackCoords) {
        const websiteUrl = await extractWebsiteFromHtml(responseUrl);
        return {
          ...fallbackCoords,
          websiteUrl,
          finalUrl: responseUrl,
          placeName: extractPlaceName(responseUrl),
        };
      }
    } catch {}

    throw new Error(
      "Could not find coordinates in this link. Make sure you're using the share link from Google Maps (tap Share → Copy link). The link should look like: https://maps.app.goo.gl/..."
    );
  }

  if (coords.lat < 43 || coords.lat > 48 || coords.lng < 4 || coords.lng > 12) {
    throw new Error(
      `Coordinates found (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) don't look like they're in the Alps. Double-check you copied the right link.`
    );
  }

  const websiteUrl = await extractWebsiteFromHtml(finalUrl);

  return {
    ...coords,
    websiteUrl,
    finalUrl,
    placeName: extractPlaceName(finalUrl),
  };
}
