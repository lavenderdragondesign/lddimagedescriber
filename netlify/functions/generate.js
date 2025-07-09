const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  try {
    const body = JSON.parse(event.body || '{}');
    console.log("🔍 Request received:", JSON.stringify(body, null, 2));

    const { imageBase64, mimeType, backgroundColor, productTypes } = body;

    if (!imageBase64 || !mimeType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields: imageBase64 or mimeType" }),
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY is missing from environment variables.");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "GEMINI_API_KEY is missing." }),
      };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Step 1: Build description prompt
    let descriptionPrompt = 'Describe the image.';
    switch (backgroundColor) {
      case 'black':
        descriptionPrompt += ' The background is black.';
        break;
      case 'white':
        descriptionPrompt += ' The background is white.';
        break;
      case 'transparent':
        descriptionPrompt += ' The background is transparent.';
        break;
      default:
        descriptionPrompt += ' Include background and character details.';
    }

    const descriptionPayload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: descriptionPrompt },
            {
              inlineData: {
                mimeType,
                data: imageBase64
              }
            }
          ]
        }
      ]
    };

    const descriptionRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(descriptionPayload)
    });

    if (!descriptionRes.ok) {
      const errorText = await descriptionRes.text();
      console.error("❌ Description API failed:", errorText);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Description API error: ${descriptionRes.status} - ${errorText}` })
      };
    }

    const descriptionJson = await descriptionRes.json();
    const description = descriptionJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!description) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No description returned from Gemini API." }),
      };
    }

    // Step 2: Get keyword suggestions
    const productHint = productTypes?.length
      ? ` Focus on these product types: ${productTypes.join(', ')}.`
      : "";

    const keywordPrompt = `
Generate ONLY a valid JSON object with two properties:
{
  "shortTailKeywords": ["keyword1", "keyword2"],
  "longTailKeywords": ["long phrase 1", "long phrase 2"]
}
No explanations. Only the JSON object.

Description: ${description}
${productHint}
    `.trim();

    const keywordsPayload = {
      contents: [{ role: "user", parts: [{ text: keywordPrompt }] }]
    };

    const keywordsRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keywordsPayload)
    });

    if (!keywordsRes.ok) {
      const errorText = await keywordsRes.text();
      console.error("❌ Keywords API failed:", errorText);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Keywords API error: ${keywordsRes.status} - ${errorText}` })
      };
    }

    const keywordsJson = await keywordsRes.json();
    const rawText = keywordsJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("🧠 Raw keyword text from Gemini:
", rawText);

    let keywords;
    try {
      keywords = JSON.parse(rawText);
    } catch (err) {
      console.error("⚠️ Failed to parse keyword JSON. Returning safe fallback.");
      return {
        statusCode: 200,
        body: JSON.stringify({
          description,
          shortTailKeywords: [],
          longTailKeywords: [],
          rawResponse: rawText
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        description,
        shortTailKeywords: keywords.shortTailKeywords || [],
        longTailKeywords: keywords.longTailKeywords || [],
      })
    };
  } catch (err) {
    console.error("🔥 Unexpected server error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Internal error occurred" })
    };
  }
};
