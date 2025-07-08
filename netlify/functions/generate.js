const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    const { imageBase64, mimeType, backgroundColor, productTypes } = JSON.parse(event.body || '{}');

    if (!imageBase64 || !mimeType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing imageBase64 or mimeType." })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API key is missing." })
      };
    }

    // --- Step 1: Generate Description ---
    let descriptionPrompt;
    switch (backgroundColor) {
      case 'black':
        descriptionPrompt = "Describe this image in ~60 words. Highlight subjects, layout, colors, and mention the background is black.";
        break;
      case 'white':
        descriptionPrompt = "Describe this image in ~60 words. Highlight subjects, layout, colors, and mention the background is white.";
        break;
      case 'transparent':
        descriptionPrompt = "Describe this image in ~60 words. Highlight subjects, layout, colors, and mention the background is transparent.";
        break;
      default:
        descriptionPrompt = "Describe this image in ~60 words. Start by identifying the dominant background color, then cover the layout, elements, and mood.";
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

    const descriptionResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(descriptionPayload)
      }
    );

    const descriptionResult = await descriptionResponse.json();
    const description = descriptionResult?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!description) {
      throw new Error("Gemini did not return a description.");
    }

    // --- Step 2: Generate Keywords ---
    const keywordPrompt = `Based on this description, generate JSON with two arrays: "shortTailKeywords" and "longTailKeywords" — each with 6-7 items. 
${productTypes?.length ? `Focus on these product types: ${productTypes.join(', ')}.` : ''}
Description: "${description}"`;

    const keywordsPayload = {
      contents: [{ role: "user", parts: [{ text: keywordPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            shortTailKeywords: {
              type: "ARRAY",
              items: { type: "STRING" }
            },
            longTailKeywords: {
              type: "ARRAY",
              items: { type: "STRING" }
            }
          }
        }
      }
    };

    const keywordResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keywordsPayload)
      }
    );

    const keywordResult = await keywordResponse.json();
    const keywordString = keywordResult?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!keywordString) {
      throw new Error("Gemini did not return keyword content.");
    }

    let parsedKeywords = { shortTailKeywords: [], longTailKeywords: [] };
    try {
      parsedKeywords = JSON.parse(keywordString);
    } catch (err) {
      throw new Error("Failed to parse keyword JSON.");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        description,
        shortTailKeywords: parsedKeywords.shortTailKeywords,
        longTailKeywords: parsedKeywords.longTailKeywords
      })
    };

  } catch (error) {
    console.error("Server error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Unknown server error" })
    };
  }
};
