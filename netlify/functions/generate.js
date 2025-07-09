const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event) => {
  try {
    const { imageBase64, mimeType, backgroundColor, productTypes } = JSON.parse(event.body);

    if (!process.env.GEMINI_API_KEY) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'API key is missing or invalid.' }),
      };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    let descriptionPrompt = 'Describe the image in detail.';

    switch (backgroundColor) {
      case 'black':
        descriptionPrompt = 'Describe the image and mention that the background is black.';
        break;
      case 'white':
        descriptionPrompt = 'Describe the image and mention that the background is white.';
        break;
      case 'transparent':
        descriptionPrompt = 'Describe the image and mention that the background is transparent.';
        break;
      case 'auto-detect':
      default:
        descriptionPrompt = 'Auto-detect the background and describe the image in detail.';
    }

    const descriptionResult = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: descriptionPrompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
    });

    const description =
      descriptionResult?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!description) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Failed to generate description.' }),
      };
    }

    const productHint = productTypes.length
      ? ` Focus on these product types: ${productTypes.join(', ')}.`
      : '';

    const keywordsPrompt = `Generate a list of 6 short-tail keywords and 6 long-tail keywords based on this image description for SEO and product listing purposes.${productHint} Return as JSON with two arrays: shortTailKeywords and longTailKeywords.\n\nDescription:\n${description}`;

    const keywordsResult = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: keywordsPrompt }],
        },
      ],
    });

    const keywordsText =
      keywordsResult?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    let shortTailKeywords = [];
    let longTailKeywords = [];

    try {
      const parsed = JSON.parse(keywordsText);
      shortTailKeywords = parsed.shortTailKeywords || [];
      longTailKeywords = parsed.longTailKeywords || [];
    } catch (err) {
      console.warn('Failed to parse keywords:', err);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        description,
        shortTailKeywords,
        longTailKeywords,
      }),
    };
  } catch (error) {
    console.error('Error in /generate:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};
