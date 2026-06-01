import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ScrapedDrink {
  name: string;
  size: string | null;
  price: number;
  currency: string;
}

export async function scrapeMenuImage(
  base64Image: string,
  mediaType: string
): Promise<{ drinks: ScrapedDrink[]; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { drinks: [], error: 'No API key configured' };
  }

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType as any, data: base64Image },
          },
          {
            type: 'text',
            text: `This is a photo of a drinks menu from a ski resort bar.
Extract every drink with its price into a JSON array.

Rules:
- Each item: { "name": string, "size": string or null, "price": number, "currency": "EUR" }
- When a drink has multiple sizes/prices (e.g. "PELFORTH 12.5CL 2.1 25CL 4 50CL 8"),
  create a SEPARATE entry for each size.
- Use the size labels exactly as shown (e.g. "25CL", "50CL", "4CL", "75CL").
- If no size is shown, use null.
- Assume EUR currency unless the menu clearly shows otherwise.
- Skip section headers, descriptions, and items without a clear price.
- For prices like "2.1" interpret as 2.10.

Respond with ONLY the JSON array, no other text, no markdown fences.`,
          },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { drinks: [], error: 'Could not parse menu' };

    const drinks = JSON.parse(jsonMatch[0]) as ScrapedDrink[];
    const valid = drinks.filter(d => d.name && typeof d.price === 'number' && d.price > 0 && d.price < 1000);
    return { drinks: valid };
  } catch (e: any) {
    console.error('Menu scrape failed:', e);
    return { drinks: [], error: e.message };
  }
}
