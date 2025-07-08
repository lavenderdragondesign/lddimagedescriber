const fetch = require("node-fetch");

exports.handler = async function(event, context) {
  try {
    const { imageBase64, mimeType, backgroundColor, productTypes } = JSON.parse(event.body);

    if (!imageBase64 || !mimeType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required image data." }),
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // 1. Create image description prompt
    let descriptionPrompt;
    if (backgroundColor === 'black') {
      descriptionPrompt = "Provide a detailed image description and specify the black background. Limit to ~80 words.";
    } else if (backgroundColor === 'white') {
      descriptionPrompt = "Provide a detailed image description and specify the white background. Limit to ~80 words.";
    } else if (backgroundColor === 'transparent') {
      descriptionPrompt = "Provide a detailed image description and specify the transparent background. Limit to ~80 words.";
    } else {
      descriptionPrompt = "Provide a detailed description of this image including background color and visual elements. Limit to ~80 words.";
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

    const descriptionResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(descriptionPayload)
    });

    const descriptionJson = await descriptionResponse.json();
    const descriptionText = descriptionJson.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 2. Keyword generation
    const productHint = productTypes?.length
      ? `Consider these product types for keywords: ${productTypes.join(", ")}.`
      : "";

    const keywordPrompt = `Based on this image description, generate a JSON object with two arrays: "shortTailKeywords" and "longTailKeywords". Use Etsy-style SEO terms. ${productHint}
Description: "${descriptionText}"`;

    const keywordPayload = {
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

    const keywordResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keywordPayload)
    });

    const keywordJson = await keywordResponse.json();
    const rawText = keywordJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanedJson = rawText.replace(/[“”]/g, '"');
    const parsed = JSON.parse(cleanedJson);

    return {
      statusCode: 200,
      body: JSON.stringify({
        description: descriptionText,
        shortTailKeywords: parsed.shortTailKeywords || [],
        longTailKeywords: parsed.longTailKeywords || []
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};