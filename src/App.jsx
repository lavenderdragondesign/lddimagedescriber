// App.jsx
import React, { useState } from 'react';
import {
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  Settings,
  Sparkles,
  FileText,
  Tag,
  Coffee,
} from 'lucide-react';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [base64Image, setBase64Image] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [shortTailKeywords, setShortTailKeywords] = useState([]);
  const [longTailKeywords, setLongTailKeywords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedProductTypes, setSelectedProductTypes] = useState([]);
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState('auto-detect');

  const [copiedDescription, setCopiedDescription] = useState(false);
  const [copiedShortTail, setCopiedShortTail] = useState(false);
  const [copiedLongTail, setCopiedLongTail] = useState(false);

  const productTypes = ['shirt', 'mug', 'tumbler', 'png', 'svg'];

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setErrorMessage('');
      setImageDescription('');
      setShortTailKeywords([]);
      setLongTailKeywords([]);
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
      prevTypes.includes(type) ? prevTypes.filter((t) => t !== type) : [...prevTypes, type]
    );
  };

  const handleBackgroundColorChange = (event) => {
    setSelectedBackgroundColor(event.target.value);
  };

  const handleCopy = (textToCopy, setCopiedState) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const analyzeImageAndGenerateKeywords = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setImageDescription('');
    setShortTailKeywords([]);
    setLongTailKeywords([]);

    if (!base64Image) {
      setErrorMessage('Please upload an image first.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/.netlify/functions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: selectedImage.type,
          backgroundColor: selectedBackgroundColor,
          productTypes: selectedProductTypes,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
      }

      const result = await res.json();
      setImageDescription(result.description);
      setShortTailKeywords(result.shortTailKeywords || []);
      setLongTailKeywords(result.longTailKeywords || []);
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(`Failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gray-100 font-sans">
      <div className="flex justify-center mb-4">
        <img src="/logo.jpg" alt="Logo" className="h-16" />
      </div>
      <p className="text-center text-red-600 font-semibold mb-4">
        This App is in Beta. Expect Crashes, Bugs, and Possible Incorrect Descriptions.
        If errors occur, refresh the page or wait a few minutes due to high usage.
      </p>

      
<div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6 relative">
  <button
    onClick={() => setShowPopup(false)}
    className="absolute top-2 right-2"
    aria-label="Close popup"
  >
    <img src="/x-icon.png" alt="Close" className="h-5 w-5" />
  </button>
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Sparkles size={20} />
          LavenderDragonDesign's Image Describer and Keyword Generator
        </h1>

        <label className="flex items-center gap-2 font-medium mb-2">
          <Upload size={16} />
          Upload Image:
        </label>
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
          <label className="block font-medium mb-1 flex items-center gap-2">
            <Tag size={16} />
            Select Product Types:
          </label>
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
          <label className="block font-medium mb-1 flex items-center gap-2">
            <ImageIcon size={16} />
            Background Color:
          </label>
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
        >
          <Sparkles size={18} />
          {isLoading ? 'Processing...' : 'Analyze Image'}
        </button>

        {errorMessage && <p className="mt-4 text-red-600">{errorMessage}</p>}

        {(imageDescription || shortTailKeywords.length > 0 || longTailKeywords.length > 0) && (
          <div className="mt-4">
            {imageDescription && (
              <div className="mb-6">
                <h2 className="font-bold mb-1 flex items-center gap-2">
                  <FileText size={16} />
                  Description
                </h2>
                <div className="flex items-start gap-2">
                  <textarea
                    readOnly
                    className="w-full border rounded p-2 resize-none"
                    rows={4}
                    value={imageDescription}
                  />
                  <button
                    onClick={() => handleCopy(imageDescription, setCopiedDescription)}
                    className="bg-gray-200 hover:bg-gray-300 p-2 rounded mt-1"
                    title="Copy Description"
                  >
                    {copiedDescription ? (
                      <Check className="text-green-600" size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {shortTailKeywords.length > 0 && (
              <div className="mb-6">
                <h2 className="font-bold mb-1 flex items-center gap-2">
                  <Tag size={16} />
                  Short-Tail Keywords
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    className="flex-1 border rounded px-2 py-1"
                    value={shortTailKeywords.join(', ')}
                  />
                  <button
                    onClick={() => handleCopy(shortTailKeywords.join(', '), setCopiedShortTail)}
                    className="bg-gray-200 hover:bg-gray-300 p-2 rounded"
                    title="Copy Short-Tail Keywords"
                  >
                    {copiedShortTail ? (
                      <Check className="text-green-600" size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </div>
            )}

            {longTailKeywords.length > 0 && (
              <div className="mb-6">
                <h2 className="font-bold mb-1 flex items-center gap-2">
                  <Tag size={16} />
                  Long-Tail Keywords
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    className="flex-1 border rounded px-2 py-1"
                    value={longTailKeywords.join(', ')}
                  />
                  <button
                    onClick={() => handleCopy(longTailKeywords.join(', '), setCopiedLongTail)}
                    className="bg-gray-200 hover:bg-gray-300 p-2 rounded"
                    title="Copy Long-Tail Keywords"
                  >
                    {copiedLongTail ? (
                      <Check className="text-green-600" size={16} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          <div className="flex justify-center items-center gap-2 mb-1 text-gray-600">
            <Coffee size={16} />
            v 1.0 - Dev. By A. Kessler With Love
          </div>
          <a
            href="https://www.buymeacoffee.com/lavenderdragondesigns"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/yellow-button.png"
              alt="Buy Me a Coffee"
              className="mx-auto mt-2 h-12"
            />
          </a>
        </div>
      </div>
    </div>
  );
}

export default App;
