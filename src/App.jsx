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
You are a helpful assistant. Describe this image and provide 5 short-tail and 5 long-tail keywords in valid JSON format:
{
  "description": "...",
  "shortTailKeywords": ["..."],
  "longTailKeywords": ["..."]
}
`;

    const flashRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY,
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

    const flashData = await flashRes.json();
    const text = flashData.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response content.";

    return {
      statusCode: 200,
      body: JSON.stringify({
        rawGeminiOutput: text
      })
    };
  } catch (error) {
    console.error('Gemini Flash error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
