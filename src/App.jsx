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
      const generatedDescription = descriptionResult?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!generatedDescription.trim()) {
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
      const jsonString = keywordsResult?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!jsonString.trim()) {
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

  return (
    <div className="min-h-screen p-4 bg-gray-100 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Image Describer</h1>
        <input type="file" onChange={handleImageChange} className="mb-4" />

        {selectedImage && (
          <img
            src={URL.createObjectURL(selectedImage)}
            alt="Preview"
            className="mb-4 max-w-full rounded border"
            style={{ maxHeight: '300px' }}
          />
        )}

        <div className="mb-4">
          <label className="block font-medium mb-1">Select Product Types:</label>
          {productTypes.map((type) => (
            <label key={type} className="inline-flex items-center mr-4">
              <input
                type="checkbox"
                checked={selectedProductTypes.includes(type)}
                onChange={() => handleProductTypeChange(type)}
              />
              <span className="ml-1 capitalize">{type}</span>
            </label>
          ))}
        </div>

        <div className="mb-4">
          <label className="block font-medium mb-1">Select Background Color:</label>
          {['auto-detect', 'black', 'white', 'transparent'].map((color) => (
            <label key={color} className="inline-flex items-center mr-4">
              <input
                type="radio"
                value={color}
                checked={selectedBackgroundColor === color}
                onChange={handleBackgroundColorChange}
              />
              <span className="ml-1 capitalize">{color}</span>
            </label>
          ))}
        </div>

        <button
          onClick={analyzeImageAndGenerateKeywords}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition"
        >
          {isLoading ? 'Processing...' : 'Analyze Image'}
        </button>

        {errorMessage && <p className="mt-4 text-red-600">{errorMessage}</p>}

        {imageDescription && (
          <div className="mt-4">
            <h2 className="font-bold">Description</h2>
            <p className="text-gray-800 whitespace-pre-wrap">{imageDescription}</p>
          </div>
        )}

        {(shortTailKeywords.length > 0 || longTailKeywords.length > 0) && (
          <div className="mt-4">
            <h2 className="font-bold mb-2">Keywords</h2>
            <div className="mb-2">
              <strong>Short-Tail:</strong>
              <ul className="list-disc list-inside">
                {shortTailKeywords.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </div>
            <div>
              <strong>Long-Tail:</strong>
              <ul className="list-disc list-inside">
                {longTailKeywords.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </div>
          </div>
        )}

        {copyMessage && <p className="mt-2 text-green-600">{copyMessage}</p>}
      </div>
    </div>
  );
}

export default App;
