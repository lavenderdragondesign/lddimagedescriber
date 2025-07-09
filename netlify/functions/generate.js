const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  try {
    const body = JSON.parse(event.body || '{}');
    console.log("Request received:", body);

    const { imageBase64, mimeType, backgroundColor, productTypes } = body;

    if (!imageBase64 || !mimeType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields: imageBase64 or mimeType" }),
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing from environment variables.");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "GEMINI_API_KEY is missing." }),
      };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // Choose description prompt
    let descriptionPrompt = '';
    switch (backgroundColor) {
      case 'black':
        descriptionPrompt = "Describe the image with focus on a black background.";
        break;
      case 'white':
        descriptionPrompt = "Describe the image with focus on a white background.";
        break;
      case 'transparent':
        descriptionPrompt = "Describe the image with focus on a transparent background.";
        break;
      default:
        descriptionPrompt = "Describe the image. Include background details.";
    }

    // Step 1: Get image description
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
      const errorData = await descriptionRes.text();
      console.error("Description API failed:", errorData);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Description API error: ${descriptionRes.status} - ${errorData}` })
      };
    }

    const descriptionJson = await descriptionRes.json();
    const description =
      descriptionJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!description) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No description returned from Gemini API." }),
      };
    }

    // Step 2: Generate keywords from description
    const productHint = productTypes?.length
      ? `Focus on keywords for: ${productTypes.join(', ')}.`
      : "";

    const keywordPrompt = `Generate SEO short-tail and long-tail keywords for the following image description. ${productHint}\nDescription: ${description}`;

    const keywordsPayload = {
      contents: [
        {
          role: "user",
          parts: [{ text: keywordPrompt }]
        }
      ],
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

    const keywordsRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keywordsPayload)
    });

    if (!keywordsRes.ok) {
      const errorData = await keywordsRes.text();
      console.error("Keywords API failed:", errorData);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Keywords API error: ${keywordsRes.status} - ${errorData}` })
      };
    }

    const keywordsJson = await keywordsRes.json();
    const keywordsText = keywordsJson?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!keywordsText) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No keywords returned from Gemini API." }),
      };
    }

    let keywords;
    try {
      keywords = JSON.parse(keywordsText);
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to parse keyword JSON from Gemini response." }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        description,
        shortTailKeywords: keywords.shortTailKeywords || [],
        longTailKeywords: keywords.longTailKeywords || []
      })
    };

  } catch (err) {
    console.error("Unexpected server error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Internal error occurred" })
    };
  }
};
