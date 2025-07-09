import fetch from 'node-fetch';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const base64Image = body.imageBase64;
    const mimeType = body.mimeType || 'image/jpeg';
    const backgroundColor = body.backgroundColor || 'auto-detect';
    const productTypes = body.productTypes || [];

    if (!base64Image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing image data' }),
      };
    }

    const prompt = `
You are an assistant helping an Etsy seller. Based on the uploaded image, return a short description and keyword suggestions.

Respond ONLY with valid JSON in this format:
<json>
{
  "description": "short summary here",
  "shortTailKeywords": ["keyword1", "keyword2", "etc"],
  "longTailKeywords": ["long phrase keyword", "another long keyword"]
}
</json>
`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const fullText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log("🔍 Gemini response:", fullText);

    // Try <json> tag first, fallback to first { }
    let jsonString;
    const tagMatch = fullText.match(/<json>([\s\S]*?)<\/json>/i);
    if (tagMatch) {
      jsonString = tagMatch[1].trim();
    } else {
      const fallbackMatch = fullText.match(/\{[\s\S]*?\}/);
      jsonString = fallbackMatch?.[0]?.trim();
    }

    if (!jsonString) {
      throw new Error('Could not extract JSON from Gemini response.');
    }

    const parsed = JSON.parse(jsonString);

    return {
      statusCode: 200,
      body: JSON.stringify({
        description: parsed.description || '',
        shortTailKeywords: parsed.shortTailKeywords || [],
        longTailKeywords: parsed.longTailKeywords || [],
        rawGeminiOutput: fullText,
      }),
    };
  } catch (error) {
    console.error('Gemini error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Unknown error',
        rawGeminiOutput: error.stack || '',
      }),
    };
  }
}
