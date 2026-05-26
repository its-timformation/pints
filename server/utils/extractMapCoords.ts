export interface MapScrapeResult {
  lat: number;
  lng: number;
  websiteUrl: string | null;
  finalUrl: string;
}

export async function scrapeMapLink(url: string): Promise<MapScrapeResult> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15" },
    signal: AbortSignal.timeout(8000),
  });
  const finalUrl = response.url;
  const html = await response.text();

  let lat: number | null = null;
  let lng: number | null = null;

  // Pattern 1: /@lat,lng,zoom
  const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) { lat = parseFloat(atMatch[1]); lng = parseFloat(atMatch[2]); }

  // Pattern 2: ?q=lat,lng
  if (!lat) {
    const qMatch = finalUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) { lat = parseFloat(qMatch[1]); lng = parseFloat(qMatch[2]); }
  }

  // Pattern 3: /place/.../@lat,lng in final URL
  if (!lat) {
    const placeMatch = finalUrl.match(/place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (placeMatch) { lat = parseFloat(placeMatch[1]); lng = parseFloat(placeMatch[2]); }
  }

  // Pattern 4: look in HTML for app initialization data
  if (!lat) {
    const htmlMatch = html.match(/\[\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
    if (htmlMatch) { lat = parseFloat(htmlMatch[1]); lng = parseFloat(htmlMatch[2]); }
  }

  // Pattern 5: meta tag or JSON-LD coordinates
  if (!lat) {
    const metaMatch = html.match(/"latitude"\s*:\s*(-?\d+\.\d+).*?"longitude"\s*:\s*(-?\d+\.\d+)/s);
    if (metaMatch) { lat = parseFloat(metaMatch[1]); lng = parseFloat(metaMatch[2]); }
  }

  if (!lat || !lng) {
    throw new Error("Could not extract coordinates from this link. Try copying the link from Google Maps → Share → Copy link.");
  }

  // Sanity check: roughly the Alps region
  if (lat < 40 || lat > 50 || lng < 4 || lng > 12) {
    throw new Error(`Coordinates found (${lat}, ${lng}) don't look like they're in the Alps. Please check the link.`);
  }

  // Extract website URL from page HTML
  let websiteUrl: string | null = null;
  const websitePatterns = [
    /href="(https?:\/\/(?!(?:www\.)?(?:google|maps|goo\.gl|googleapis))[^"]+)"[^>]*>[^<]*(?:website|site web|Visit|Official)/i,
    /"website":"([^"]+)"/,
    /data-website="([^"]+)"/,
    /"url":"(https?:\/\/(?!(?:www\.)?google)[^"]+)"/,
  ];
  for (const pattern of websitePatterns) {
    const match = html.match(pattern);
    if (match?.[1] && !match[1].includes("google") && !match[1].includes("goo.gl")) {
      websiteUrl = match[1];
      break;
    }
  }

  return { lat, lng, websiteUrl, finalUrl };
}
