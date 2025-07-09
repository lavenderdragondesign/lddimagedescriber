import fetch from 'node-fetch';

export async function handler(event, context) {
  console.log("📨 Incoming Request Body:", event.body);

  try {
    const { imageBase64, mimeType, backgroundColor, productTypes } = JSON.parse(event.body || '{}');

    if (!imageBase64 || !mimeType) {
      console.error("❌ Missing required fields.");
      if (!parsed.description && (!parsed.shortTailKeywords || parsed.shortTailKeywords.length === 0) && (!parsed.longTailKeywords || parsed.longTailKeywords.length === 0)) {
    console.warn("👻 Empty AI response. Returning fallback.");
    return {
      statusCode: 200,
      body: JSON.stringify({
        description: "No valid content returned. Possibly AI goofed.",
        shortTailKeywords: [],
        longTailKeywords: []
      })
    };
  }
  return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields: imageBase64 or mimeType." })
      };
    }

    const geminiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=" + process.env.GEMINI_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
              {
                text: `Describe this image in detail. Then generate 5 short-tail keywords and 5 long-tail keywords related to it. Product context: ${productTypes?.join(', ') || 'none'}. Background color: ${backgroundColor}. Return a JSON object with keys: description, shortTailKeywords, longTailKeywords.`,
              },
            ],
          },
        ],
      }),
    });

    const geminiData = await geminiRes.json();

    const fullText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("🧠 Gemini Raw Text:", fullText);

    let parsed;
    try {
      parsed = JSON.parse(fullText);
    } catch (e) {
      console.warn("⚠️ Failed to parse JSON. Returning raw text.");
      return {
        statusCode: 200,
        body: JSON.stringify({
          description: fullText,
          shortTailKeywords: [],
          longTailKeywords: [],
          rawResponse: fullText,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        description: parsed.description || "",
        shortTailKeywords: parsed.shortTailKeywords || [],
        longTailKeywords: parsed.longTailKeywords || [],
      }),
    };
  } catch (err) {
    console.error("🔥 Internal Server Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", details: err.message })
    };
  }
}
