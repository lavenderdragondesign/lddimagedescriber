import fetch from 'node-fetch';

const hfToken = process.env.HUGGINGFACE_API_KEY;

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const base64Image = body.imageBase64;
    const mimeType = body.mimeType || 'image/jpeg';

    if (!base64Image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing image data' })
      };
    }

    // Step 1: BLIP Large Caption
    const captionResponse = await fetch('https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ inputs: base64Image })
    });
    const captionResult = await captionResponse.json();
    const caption = captionResult[0]?.generated_text || "an image";

    // Step 2: Description via Mixtral
    const prompt = "Write a detailed Etsy-style product description for the following image concept: " + caption;
    const textGenResponse = await fetch('https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 100 }
      })
    });
    const textGenResult = await textGenResponse.json();
    const description = textGenResult[0]?.generated_text?.replace(/^.*?: /, '') || caption;

    // Step 3: Keyword extraction from final description
    const keywordPrompt = "Extract 10 Etsy-style keywords from this product description, in comma-separated format:\n" + description;
    const keywordResponse = await fetch('https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: keywordPrompt,
        parameters: { max_new_tokens: 60 }
      })
    });
    const keywordResult = await keywordResponse.json();
    const keywordText = keywordResult[0]?.generated_text || "";
    const keywordArray = keywordText
      .replace(/^.*?:\s*/, '')
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    return {
      statusCode: 200,
      body: JSON.stringify({
        description,
        shortTailKeywords: keywordArray.slice(0, 5),
        longTailKeywords: keywordArray.slice(5)
      })
    };
  } catch (err) {
    console.error("Hugging Face pipeline error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
