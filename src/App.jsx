import React, { useState } from 'react';
import { Copy, Check, Image as ImageIcon, Sparkles } from 'lucide-react';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [base64Image, setBase64Image] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [shortTailKeywords, setShortTailKeywords] = useState([]);
  const [longTailKeywords, setLongTailKeywords] = useState([]);
  const [rawResponse, setRawResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 3 * 1024 * 1024) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setBase64Image(reader.result.split(',')[1]);
      reader.readAsDataURL(file);
    } else {
      setErrorMessage('Upload an image under 3MB.');
    }
  };

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const analyzeImage = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setPopupVisible(false);

    try {
      const res = await fetch('/.netlify/functions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image }),
      });
      const result = await res.json();

      setRawResponse(result.rawGeminiOutput || '');
      setImageDescription(result.description || '');
      setShortTailKeywords(result.shortTailKeywords || []);
      setLongTailKeywords(result.longTailKeywords || []);
      setPopupVisible(true);
    } catch (err) {
      setErrorMessage('Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto font-sans">
      <h1 className="text-2xl font-bold text-center mb-4">Image Describer + Keyword Generator</h1>
      <input type="file" onChange={handleImageChange} className="mb-4" />

      <button
        disabled={isLoading || !base64Image}
        onClick={analyzeImage}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        {isLoading ? 'Analyzing...' : 'Analyze Image'}
      </button>

      {errorMessage && <p className="text-red-600 mt-2">{errorMessage}</p>}

      {popupVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-xl w-full relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setPopupVisible(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              ❌
            </button>

            <div className="mb-4">
              <h2 className="font-bold flex items-center gap-2"><ImageIcon size={16} /> Description</h2>
              <textarea
                readOnly
                className="w-full border p-2 mt-1 resize-none"
                rows={3}
                value={imageDescription}
              />
              <button onClick={() => handleCopy(imageDescription, 'desc')} className="text-sm mt-1 text-blue-600">
                {copied === 'desc' ? <Check size={16} /> : <Copy size={16} />} Copy
              </button>
            </div>

            <div className="mb-4">
              <h2 className="font-bold flex items-center gap-2"><Sparkles size={16} /> Short-Tail Keywords</h2>
              <input
                type="text"
                readOnly
                className="w-full border p-2 mt-1"
                value={shortTailKeywords.join(', ')}
              />
              <button onClick={() => handleCopy(shortTailKeywords.join(', '), 'short')} className="text-sm mt-1 text-blue-600">
                {copied === 'short' ? <Check size={16} /> : <Copy size={16} />} Copy
              </button>
            </div>

            <div className="mb-4">
              <h2 className="font-bold flex items-center gap-2"><Sparkles size={16} /> Long-Tail Keywords</h2>
              <input
                type="text"
                readOnly
                className="w-full border p-2 mt-1"
                value={longTailKeywords.join(', ')}
              />
              <button onClick={() => handleCopy(longTailKeywords.join(', '), 'long')} className="text-sm mt-1 text-blue-600">
                {copied === 'long' ? <Check size={16} /> : <Copy size={16} />} Copy
              </button>
            </div>

            {rawResponse && (
              <div className="mt-4">
                <h2 className="font-bold text-sm text-gray-700">Raw Gemini Output</h2>
                <textarea
                  readOnly
                  className="w-full text-xs bg-gray-100 border p-2 rounded"
                  rows={6}
                  value={rawResponse}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
