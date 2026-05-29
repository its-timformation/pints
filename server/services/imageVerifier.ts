import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface VerificationResult {
  confident: boolean;
  extractedDrinkName: string | null;
  extractedPrice: number | null;
  extractedCurrency: string | null;
  reasoning: string;
  autoApprove: boolean;
}

export async function verifySubmissionImage(
  imageUrl: string,
  claimedDrinkName: string,
  claimedPrice: number,
  claimedCurrency: string
): Promise<VerificationResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { confident: false, extractedDrinkName: null, extractedPrice: null, extractedCurrency: null, reasoning: 'No API key configured', autoApprove: false };
  }

  try {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
    if (!imgRes.ok) throw new Error('Could not fetch image');
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: contentType as any, data: base64 },
          },
          {
            type: 'text',
            text: `This is a photo of a receipt, menu, or price board from a bar.
The user claims they paid ${claimedPrice} ${claimedCurrency} for "${claimedDrinkName}".

Please examine the image and respond in this exact JSON format:
{
  "isReceiptOrMenu": true/false,
  "drinkFound": true/false,
  "foundDrinkName": "name as shown on image or null",
  "foundPrice": number or null,
  "foundCurrency": "EUR/GBP/CHF or null",
  "priceMatches": true/false,
  "confident": true/false,
  "reasoning": "brief explanation"
}

Only set confident:true if you can clearly read a price for this drink.
Only set priceMatches:true if the price on the image matches within 10% of the claimed price.`,
          },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);

    const autoApprove = parsed.isReceiptOrMenu &&
                        parsed.drinkFound &&
                        parsed.priceMatches &&
                        parsed.confident;

    return {
      confident: parsed.confident,
      extractedDrinkName: parsed.foundDrinkName,
      extractedPrice: parsed.foundPrice,
      extractedCurrency: parsed.foundCurrency,
      reasoning: parsed.reasoning,
      autoApprove,
    };
  } catch (e: any) {
    return {
      confident: false,
      extractedDrinkName: null,
      extractedPrice: null,
      extractedCurrency: null,
      reasoning: `Verification failed: ${e.message}`,
      autoApprove: false,
    };
  }
}
