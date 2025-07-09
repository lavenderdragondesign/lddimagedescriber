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
        body: JSON.stringify({ error: 'Missing image data' })
      };
    }

    const prompt = `
You are a professional Etsy seller assistant. Given an image of a product, generate:
1. A clear, compelling Etsy-style product description
2. 5 short-tail keywords (popular search terms)
3. 5 long-tail keywords (more specific, detailed search terms)

Return only a JSON object in this format:
{
  "description": "...",
  "shortTailKeywords": [...],
  "longTailKeywords": [...]
}

Image and details:
- Product types: ${productTypes.join(', ') || 'unspecified'}
- Background: ${backgroundColor}
`;

    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=' + GEMINI_API_KEY,
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
                    mimeType: mimeType,
                    data: base64Image
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const geminiData = await geminiRes.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error("Could not extract JSON from Gemini response.");

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("JSON parse error:", err);
      throw new Error("Failed to parse Gemini response as JSON.");
    }

    return {
      statusCode: 200,
      body: JSON.stringify(parsed)
    };
  } catch (error) {
    console.error('Gemini function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
