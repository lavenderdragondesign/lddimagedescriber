import React, { useState } from 'react';
import { Copy } from 'lucide-react'; // Import Lucide Copy icon

// Main App component
function App() {
  // State for the selected image file
  const [selectedImage, setSelectedImage] = useState(null);
  // State for the Base64 representation of the image
  const [base64Image, setBase64Image] = useState('');
  // State for the generated image description
  const [imageDescription, setImageDescription] = useState('');
  // State for the generated short-tail keywords
  const [shortTailKeywords, setShortTailKeywords] = useState([]);
  // State for the generated long-tail keywords
  const [longTailKeywords, setLongTailKeywords] = useState([]);
  // State to manage loading indicator during API calls
  const [isLoading, setIsLoading] = useState(false);
  // State for any error messages
  const [errorMessage, setErrorMessage] = useState('');
  // State for copy confirmation message
  const [copyMessage, setCopyMessage] = useState('');
  // State for selected product types
  const [selectedProductTypes, setSelectedProductTypes] = useState([]);
  // State for selected background color preference in description
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState('auto-detect'); // 'auto-detect', 'black', 'white', 'transparent'

  // Available product types for selection
  const productTypes = ['shirt', 'mug', 'tumbler', 'png', 'svg'];

  // Handles image file selection and converts it to Base64
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setErrorMessage(''); // Clear previous errors
      setImageDescription('');
      setShortTailKeywords([]);
      setLongTailKeywords([]);
      setCopyMessage(''); // Clear copy message
      setSelectedProductTypes([]); // Clear product types on new image
      setSelectedBackgroundColor('auto-detect'); // Reset background color selection

      const reader = new FileReader();
      reader.onloadend = () => {
        // Store the Base64 string (remove the data:image/...;base64, prefix)
        setBase64Image(reader.result.split(',')[1]);
      };
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

  // Handles product type checkbox changes
  const handleProductTypeChange = (type) => {
    setSelectedProductTypes((prevTypes) =>
      prevTypes.includes(type)
        ? prevTypes.filter((t) => t !== type)
        : [...prevTypes, type]
    );
  };

  // Handles background color radio button changes
  const handleBackgroundColorChange = (event) => {
    setSelectedBackgroundColor(event.target.value);
  };

  // Function to copy text to clipboard
  const handleCopy = (textToCopy) => {
    try {
      // Use a temporary textarea to copy text to clipboard
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed'; // Avoid scrolling to bottom
      textarea.style.opacity = '0'; // Hide it
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy'); // Execute copy command
      document.body.removeChild(textarea); // Remove the textarea

      setCopyMessage('Copied!');
      setTimeout(() => setCopyMessage(''), 2000); // Clear message after 2 seconds
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyMessage('Failed to copy!');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  // Function to call Gemini API for image description and keyword generation
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
      // 1. Get Image Description from Gemini (now aiming for ~60 words)
      let descriptionPrompt;

      if (selectedBackgroundColor === 'black') {
        descriptionPrompt = "Provide a comprehensive and detailed description of this image, highlighting its main subject, prominent objects, their relative positions, dominant colors, any discernible text, and specifically mention that the background is black. Describe the overall artistic style or mood. Aim for approximately 60 words for product listings.";
      } else if (selectedBackgroundColor === 'white') {
        descriptionPrompt = "Provide a comprehensive and detailed description of this image, highlighting its main subject, prominent objects, their relative positions, dominant colors, any discernible text, and specifically mention that the background is white. Describe the overall artistic style or mood. Aim for approximately 60 words for product listings.";
      } else if (selectedBackgroundColor === 'transparent') {
        descriptionPrompt = "Provide a comprehensive and detailed description of this image, highlighting its main subject, prominent objects, their relative positions, dominant colors, any discernible text, and specifically mention that the background is transparent. Describe the overall artistic style or mood. Aim for approximately 60 words for product listings.";
      }
      else { // 'auto-detect' - refined prompt for better background detection
        descriptionPrompt = "Provide a comprehensive and detailed description of this image. Identify the *dominant background color* first, then cover its main subject, prominent objects, their relative positions, dominant colors, any discernible text, and overall artistic style or mood. Aim for approximately 60 words for product listings.";
      }

      const descriptionPayload = {
        contents: [
          {
            role: "user",
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
        ],
      };

      const apiKey = ""; // API key is automatically provided by Canvas
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const descriptionResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(descriptionPayload)
      });

      if (!descriptionResponse.ok) {
        const errorData = await descriptionResponse.json();
        throw new Error(`Description API error: ${response.status} - ${errorData.error.message || 'Unknown error'}`);
      }

      const descriptionResult = await descriptionResponse.json();
      let generatedDescription = '';
      if (descriptionResult.candidates && descriptionResult.candidates.length > 0 &&
          descriptionResult.candidates[0].content && descriptionResult.candidates[0].content.parts &&
          descriptionResult.candidates[0].content.parts.length > 0) {
        generatedDescription = descriptionResult.candidates[0].content.parts[0].text;
        setImageDescription(generatedDescription);
      } else {
        setErrorMessage('Could not get image description. Unexpected API response structure.');
      }

      // 2. Generate SEO Keywords based on the description and selected product types
      const productTypeHint = selectedProductTypes.length > 0
        ? ` Consider these product types for the keywords: ${selectedProductTypes.join(', ')}.`
        : '';

      const keywordsPrompt = `Based on the following image description, generate a list of 6-7 short-tail SEO keywords and 6-7 long-tail SEO keywords suitable for product listings on platforms like Etsy or Print-on-Demand. Focus on terms that a customer would search for.${productTypeHint} Provide the output as a JSON object with two arrays: "shortTailKeywords" and "longTailKeywords".
      Image Description: "${generatedDescription}"`;

      const keywordsPayload = {
        contents: [{ role: "user", parts: [{ text: keywordsPrompt }] }],
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

      const keywordsResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keywordsPayload)
      });

      // --- DEBUGGING KEYWORDS START ---
      console.log('Keywords API Raw Response:', keywordsResponse); // Log the raw response object
      if (!keywordsResponse.ok) {
        const errorData = await keywordsResponse.json();
        console.error('Keywords API Error Data:', errorData); // Log error details
        throw new Error(`Keywords API error: ${keywordsResponse.status} - ${errorData.error.message || 'Unknown error'}`);
      }
      const keywordsResult = await keywordsResponse.json();
      console.log('Keywords API Parsed Result:', keywordsResult); // Log the parsed JSON result

      if (keywordsResult.candidates && keywordsResult.candidates.length > 0 &&
          keywordsResult.candidates[0].content && keywordsResult.candidates[0].content.parts &&
          keywordsResult.candidates[0].content.parts.length > 0) {
        const jsonString = keywordsResult.candidates[0].content.parts[0].text;
        console.log('JSON String from API for Keywords:', jsonString); // Log the string before parsing
        try {
          const parsedJson = JSON.parse(jsonString);
          console.log('Parsed JSON Object for Keywords:', parsedJson); // Log the parsed object
          setShortTailKeywords(parsedJson.shortTailKeywords || []);
          setLongTailKeywords(parsedJson.longTailKeywords || []);
        } catch (parseError) {
          console.error('Error parsing keywords JSON:', parseError);
          setErrorMessage(`Failed to parse keywords: ${parseError.message}. Raw JSON: ${jsonString}`);
        }
      } else {
        setErrorMessage('Could not generate keywords. Unexpected API response structure or empty content.');
      }
      // --- DEBUGGING KEYWORDS END ---

    } catch (error) {
      console.error('Overall Error in image analysis or keyword generation:', error);
      setErrorMessage(`Failed to process: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Main container with full height, centered content, and a background
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-300 to-indigo-400 p-4">

      {/* Image Describer & SEO Keyword Generator Section */}
      <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2 text-center animate-fade-in">
          LavenderDragonDesign's Image Describer 📸
        </h1>
        {/* Subheader for beta status */}
        <p className="text-sm text-red-600 mb-4 text-center font-medium">
          This app is in beta. Expect Bugs, Crashes & Sometimes Incorrect Descriptions.
        </p>
        <p className="text-md text-gray-700 mb-6 text-center animate-slide-up">
          Upload an image to get a concise description and SEO-friendly keywords for your POD/Etsy products!
        </p>

        {/* Image Upload Input */}
        <input
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleImageChange}
          className="w-full text-gray-700 mb-4 p-2 border border-gray-300 rounded-lg"
        />

        {/* Image Preview */}
        {selectedImage && (
          <div className="mb-4 text-center">
            <img
              src={URL.createObjectURL(selectedImage)}
              alt="Selected Preview"
              className="max-w-full h-auto rounded-lg shadow-md mx-auto"
              style={{ maxHeight: '200px' }}
            />
            <p className="text-sm text-gray-500 mt-2">Image Preview</p>
          </div>
        )}

        {/* Product Type Tags Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Select Product Types (Optional):</h3>
          <div className="flex flex-wrap gap-2">
            {productTypes.map((type) => (
              <label
                key={type}
                className={`flex items-center px-3 py-1 rounded-full border cursor-pointer transition-colors duration-200
                  ${selectedProductTypes.includes(type)
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <input
                  type="checkbox"
                  value={type}
                  checked={selectedProductTypes.includes(type)}
                  onChange={() => handleProductTypeChange(type)}
                  className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </label>
            ))}
          </div>
        </div>

        {/* Background Color in Description Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Mention Image Background Color:</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="background-color"
                value="auto-detect"
                checked={selectedBackgroundColor === 'auto-detect'}
                onChange={handleBackgroundColorChange}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Auto-detect</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="background-color"
                value="black"
                checked={selectedBackgroundColor === 'black'}
                onChange={handleBackgroundColorChange}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Black</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="background-color"
                value="white"
                checked={selectedBackgroundColor === 'white'}
                onChange={handleBackgroundColorChange}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">White</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="background-color"
                value="transparent"
                checked={selectedBackgroundColor === 'transparent'}
                onChange={handleBackgroundColorChange}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Transparent</span>
            </label>
          </div>
        </div>

        {/* Analyze Button */}
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition duration-300 ease-in-out transform hover:scale-105 shadow-lg flex items-center justify-center"
          onClick={analyzeImageAndGenerateKeywords}
          disabled={isLoading || !selectedImage} // Disable button when loading or no image selected
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            'Analyze Image & Generate Keywords ✨'
          )}
        </button>

        {errorMessage && (
          <p className="text-red-600 mt-4 text-center">{errorMessage}</p>
        )}

        {copyMessage && (
          <p className="text-green-600 mt-2 text-center text-sm">{copyMessage}</p>
        )}

        {/* Results Display */}
        {(imageDescription || shortTailKeywords.length > 0 || longTailKeywords.length > 0) && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg border border-gray-200">
            {imageDescription && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-semibold text-gray-800">Image Description:</h3>
                  <button
                    onClick={() => handleCopy(imageDescription)}
                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
                    title="Copy description"
                  >
                    <Copy size={18} className="text-gray-600" />
                  </button>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{imageDescription}</p>
              </div>
            )}

            {shortTailKeywords.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-semibold text-gray-800">Short-Tail Keywords:</h3>
                  <button
                    onClick={() => handleCopy(shortTailKeywords.join(', '))}
                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
                    title="Copy short-tail keywords"
                  >
                    <Copy size={18} className="text-gray-600" />
                  </button>
                </div>
                <ul className="list-disc list-inside text-gray-700">
                  {shortTailKeywords.map((keyword, index) => (
                    <li key={index}>{keyword}</li>
                  ))}
                </ul>
              </div>
            )}

            {longTailKeywords.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-semibold text-gray-800">Long-Tail Keywords:</h3>
                  <button
                    onClick={() => handleCopy(longTailKeywords.join(', '))}
                    className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
                    title="Copy long-tail keywords"
                  >
                    <Copy size={18} className="text-gray-600" />
                  </button>
                </div>
                <ul className="list-disc list-inside text-gray-700">
                  {longTailKeywords.map((keyword, index) => (
                    <li key={index}>{keyword}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tailwind CSS JIT (Just-In-Time) compilation script */}
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        {/* Custom CSS for animations */}
        {`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-out;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slideUp 0.8s ease-out 0.3s forwards;
          opacity: 0; /* Start hidden */
        }

        /* Ensure Inter font is used */
        body {
          font-family: 'Inter', sans-serif;
        }
        `}
      </style>
    </div>
  );
}

export default App;
