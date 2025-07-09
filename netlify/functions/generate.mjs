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
You are a helpful Etsy assistant. Generate a product description and 5 short + 5 long-tail keywords for the image provided.
Respond ONLY with valid JSON in this format:
{
  "description": "...",
  "shortTailKeywords": ["...", "..."],
  "longTailKeywords": ["...", "..."]
}
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
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response content.";

    console.log("💬 FULL RAW RESPONSE FROM GEMINI:");
    console.log(JSON.stringify(geminiData, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({
        rawGeminiOutput: text
      })
    };
  } catch (error) {
    console.error('Gemini DEBUG error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
