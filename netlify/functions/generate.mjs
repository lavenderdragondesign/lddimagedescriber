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
Please look at the image and respond with only a JSON object containing the fields:
"description", "shortTailKeywords", and "longTailKeywords".

Example:
<json>
{
  "description": "A cute Halloween ghost PNG clipart in kawaii style.",
  "shortTailKeywords": ["ghost", "Halloween", "kawaii"],
  "longTailKeywords": ["kawaii ghost clipart", "cute Halloween sticker", "pastel ghost PNG"]
}
</json>

Do NOT include any extra text or explanation.
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
    console.log("🧠 Gemini raw output:\n", fullText);

    let jsonString;

    // First try <json>...</json>
    const tagMatch = fullText.match(/<json>([\s\S]*?)<\/json>/i);
    if (tagMatch) {
      jsonString = tagMatch[1].trim();
    } else {
      // Fallback: Try first {...} block
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
        error: error.message,
        rawGeminiOutput: error.stack || '[No content]',
      }),
    };
  }
}

