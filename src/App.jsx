// App.jsx
import React, { useState } from 'react';
import { Copy } from 'lucide-react';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [base64Image, setBase64Image] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [shortTailKeywords, setShortTailKeywords] = useState([]);
  const [longTailKeywords, setLongTailKeywords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [selectedProductTypes, setSelectedProductTypes] = useState([]);
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState('auto-detect');

  const productTypes = ['shirt', 'mug', 'tumbler', 'png', 'svg'];

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setErrorMessage('');
      setImageDescription('');
      setShortTailKeywords([]);
      setLongTailKeywords([]);
      setCopyMessage('');
      setSelectedProductTypes([]);
      setSelectedBackgroundColor('auto-detect');

      const reader = new FileReader();
      reader.onloadend = () => setBase64Image(reader.result.split(',')[1]);
      reader.onerror = () => {
        setErrorMessage('Failed to read image file.');
        setBase64Image('');
        setSelectedImage(null);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedImage(null);
      setBase64Image('');
    }
  };

  const handleProductTypeChange = (type) => {
    setSelectedProductTypes((prevTypes) =>
      prevTypes.includes(type)
        ? prevTypes.filter((t) => t !== type)
        : [...prevTypes, type]
    );
  };

  const handleBackgroundColorChange = (event) => {
    setSelectedBackgroundColor(event.target.value);
  };

  const handleCopy = (textToCopy) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyMessage('Copied!');
      setTimeout(() => setCopyMessage(''), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyMessage('Failed to copy!');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  const analyzeImageAndGenerateKeywords = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setImageDescription('');
    setShortTailKeywords([]);
    setLongTailKeywords([]);
    setCopyMessage('');

    if (!base64Image) {
      setErrorMessage('Please upload an image first.');
      setIsLoading(false);
      return;
    }

    try {
      let descriptionPrompt;
      switch (selectedBackgroundColor) {
        case 'black':
          descriptionPrompt = 'Provide a detailed description with black background.';
          break;
        case 'white':
          descriptionPrompt = 'Provide a detailed description with white background.';
          break;
        case 'transparent':
          descriptionPrompt = 'Provide a detailed description with transparent background.';
          break;
        default:
          descriptionPrompt = 'Auto-detect background and provide description.';
      }

      const descriptionPayload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: descriptionPrompt },
              {
                inlineData: {
                  mimeType: selectedImage.type,
                  data: base64Image
                }
              }
            ]
          }
        ]
      };

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('API key is missing.');

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const descriptionResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(descriptionPayload)
      });

      if (!descriptionResponse.ok) throw new Error(`API error: ${descriptionResponse.status}`);
      const descriptionResult = await descriptionResponse.json();
      const generatedDescription = descriptionResult?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedDescription) {
        throw new Error('No image description returned by API.');
      }

      setImageDescription(generatedDescription);

      const productHint = selectedProductTypes.length
        ? `Include: ${selectedProductTypes.join(', ')}.`
        : '';

      const keywordsPrompt = `Generate short-tail and long-tail keywords from this description. ${productHint} Return JSON.`;
      const keywordsPayload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${keywordsPrompt}\nDescription: ${generatedDescription}` }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              shortTailKeywords: { type: 'ARRAY', items: { type: 'STRING' } },
              longTailKeywords: { type: 'ARRAY', items: { type: 'STRING' } }
            }
          }
        }
      };

      const keywordsResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keywordsPayload)
      });

      if (!keywordsResponse.ok) throw new Error(`API error: ${keywordsResponse.status}`);
      const keywordsResult = await keywordsResponse.json();
      const jsonString = keywordsResult?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!jsonString) {
        throw new Error('No keywords returned by API.');
      }

      try {
        const parsed = JSON.parse(jsonString);
        setShortTailKeywords(parsed.shortTailKeywords || []);
        setLongTailKeywords(parsed.longTailKeywords || []);
      } catch (parseError) {
        throw new Error(`Failed to parse keywords: ${parseError.message}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(`Failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return <div />;
}

export default App;
