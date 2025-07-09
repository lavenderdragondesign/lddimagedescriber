// App.jsx
import React, { useState } from 'react';
import { Copy, Check, Image as ImageIcon, Sparkles, X } from 'lucide-react';

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
  const [popupVisible, setPopupVisible] = useState(false);
  const [rawResponse, setRawResponse] = useState('');

  const productTypes = ['shirt', 'mug', 'tumbler', 'png', 'svg'];

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file && file.size <= 3 * 1024 * 1024) {
      setSelectedImage(file);
      setErrorMessage('');
      setImageDescription('');
      setShortTailKeywords([]);
      setLongTailKeywords([]);
      setRawResponse('');
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
      setErrorMessage('Please upload an image under 3MB.');
      setSelectedImage(null);
      setBase64Image('');
    }
  };

  const handleProductTypeChange = (type) => {
    setSelectedProductTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleBackgroundColorChange = (event) => {
    setSelectedBackgroundColor(event.target.value);
  };

  const handleCopy = (text, setCopied) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const analyzeImageAndGenerateKeywords = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setImageDescription('');
    setShortTailKeywords([]);
    setLongTailKeywords([]);
    setRawResponse('');

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

      const result = await res.json();

      if (result.description || result.shortTailKeywords || result.longTailKeywords) {
        setImageDescription(result.description || '');
        setShortTailKeywords(result.shortTailKeywords || []);
        setLongTailKeywords(result.longTailKeywords || []);
        setPopupVisible(true);
      } else if (result.rawGeminiOutput) {
        setRawResponse(result.rawGeminiOutput);
        setPopupVisible(true);
      } else {
        setErrorMessage('AI responded, but didn’t return any usable info. Try another image or refresh.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(`Failed: ${err.message}`);
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
        This App is in Beta. Expect Crashes, Bugs, and Possible Incorrect Descriptions. If errors occur, refresh the page or wait a few minutes due to high usage.
      </p>

      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">LavenderDragonDesign's Image Describer and Keyword Generator</h1>
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
          <label className="block font-medium mb-1">Select Product Types (optional for Keywords):</label>
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
      </div>

      {popupVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start pt-10 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
            <button
              onClick={() => setPopupVisible(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              <img src="/x-icon.png" alt="Close" className="h-5 w-5" />
            </button>

            {imageDescription && (
              <div className="mb-6">
                <h2 className="font-bold mb-1 flex items-center gap-2">
                  <ImageIcon size={20} />
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
                    {copiedDescription ? <Check className="text-green-600" size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}

            {shortTailKeywords.length > 0 && (
              <div className="mb-6">
                <h2 className="font-bold mb-1 flex items-center gap-2">
                  <Sparkles size={20} />
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
                    {copiedShortTail ? <Check className="text-green-600" size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}

            {longTailKeywords.length > 0 && (
              <div className="mb-6">
                <h2 className="font-bold mb-1 flex items-center gap-2">
                  <Sparkles size={20} />
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
                    {copiedLongTail ? <Check className="text-green-600" size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}

            {rawResponse && (
              <div className="mb-6">
                <h2 className="font-bold mb-1 flex items-center gap-2">
                  <Sparkles size={20} />
                  Raw Gemini Output
                </h2>
                <textarea
                  readOnly
                  className="w-full border rounded p-2 bg-yellow-50 text-sm resize-none"
                  rows={6}
                  value={rawResponse}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-sm text-gray-500">
        v 1.0 – Dev. By A. Kessler With Love
        <br />
        <a href="https://buymeacoffee.com/lavenderdragondesigns" target="_blank" rel="noopener noreferrer">
          <img src="/yellow-button.png" alt="Buy Me a Coffee" className="mx-auto mt-2 h-12" />
        </a>
      </div>
    </div>
  );
}

export default App;
