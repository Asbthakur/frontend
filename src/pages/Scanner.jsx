import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ocrAPI } from '../services/api';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import {
  Camera,
  Upload,
  X,
  RotateCw,
  Download,
  Copy,
  FileText,
  Zap,
  CheckCircle,
  AlertCircle,
  Globe,
  Loader,
  Image as ImageIcon,
  SwitchCamera,
} from 'lucide-react';

const Scanner = () => {
  const { user } = useAuth();
  
  // State management
  const [mode, setMode] = useState('select'); // 'select', 'camera', 'gallery', 'preview', 'processing', 'result'
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [translating, setTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Check if running as native app
  const isNative = Capacitor.isNativePlatform();
  
  // Use Capacitor Camera for native, browser API for web
  const captureWithNativeCamera = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 95,
        allowEditing: false,
        resultType: 'base64',
        source: 'camera',
      });
      
      // Convert base64 to blob
      const response = await fetch(`data:image/jpeg;base64,${image.base64String}`);
      const blob = await response.blob();
      
      setCapturedImage(blob);
      setMode('preview');
    } catch (error) {
      console.error('Native camera error:', error);
      setError('Failed to capture photo with camera');
    }
  };
  
  const handleGalleryWithNative = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 95,
        allowEditing: false,
        resultType: 'base64',
        source: 'photos',
      });
      
      // Convert base64 to blob
      const response = await fetch(`data:image/jpeg;base64,${image.base64String}`);
      const blob = await response.blob();
      
      setUploadedFile(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
      setMode('preview');
    } catch (error) {
      console.error('Native gallery error:', error);
      setError('Failed to select photo from gallery');
    }
  };
  
  // Check if user can scan
  const canScan = user?.canScan();
  
  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);
  
  // Start camera
  const startCamera = async () => {
    try {
      setError('');
      
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Request camera access
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      setMode('camera');
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  };
  
  // Switch camera (front/back)
  const switchCamera = () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    startCamera();
  };
  
  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    
    // Mirror image if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image as blob
    canvas.toBlob((blob) => {
      setCapturedImage(blob);
      setMode('preview');
      
      // Stop camera stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }, 'image/jpeg', 0.95);
  };
  
  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size should be less than 10MB');
      return;
    }
    
    setUploadedFile(file);
    setMode('preview');
  };
  
  // Get preview URL
  const getPreviewUrl = () => {
    if (capturedImage) {
      return URL.createObjectURL(capturedImage);
    }
    if (uploadedFile) {
      return URL.createObjectURL(uploadedFile);
    }
    return null;
  };
  
  // Process OCR
  const processOCR = async () => {
    if (!canScan) {
      setError('You have reached your daily scan limit. Please upgrade your plan.');
      return;
    }
    
    setProcessing(true);
    setProgress(0);
    setError('');
    setMode('processing');
    
    try {
      // Create FormData
      const file = capturedImage || uploadedFile;
      
      // Call OCR API with progress callback
      const response = await ocrAPI.extractText(
        file,
        (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      );
      
      if (response.success) {
        setResult(response.scan);
        setMode('result');
      } else {
        setError(response.message || 'OCR processing failed');
        setMode('preview');
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError(err.response?.data?.message || 'Failed to process image');
      setMode('preview');
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };
  
  // Copy text to clipboard
  const copyText = async () => {
    if (!result?.ocr?.text) return;
    
    try {
      await navigator.clipboard.writeText(result.ocr.text);
      alert('Text copied to clipboard!');
    } catch (err) {
      console.error('Copy failed:', err);
      alert('Failed to copy text');
    }
  };
  
  // Translate text
  const translateText = async () => {
    if (!selectedLanguage || !result?._id) return;
    
    setTranslating(true);
    setError('');
    
    try {
      const response = await ocrAPI.translate(result._id, selectedLanguage);
      
      if (response.success) {
        setResult(response.scan);
      } else {
        setError(response.message || 'Translation failed');
      }
    } catch (err) {
      console.error('Translation error:', err);
      setError(err.response?.data?.message || 'Failed to translate');
    } finally {
      setTranslating(false);
    }
  };
  
  // Download as text file
  const downloadText = () => {
    if (!result?.ocr?.text) return;
    
    const blob = new Blob([result.ocr.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Save as PDF (placeholder - would need backend support)
  const saveAsPDF = () => {
    alert('PDF generation coming soon!');
  };
  
  // Reset and start new scan
  const startNewScan = () => {
    setCapturedImage(null);
    setUploadedFile(null);
    setResult(null);
    setError('');
    setSelectedLanguage('');
    setMode('select');
  };
  
  // Render mode selection
  const renderModeSelection = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="section-title">AI Document Scanner</h1>
        <p className="text-gray-600">
          Scan documents, extract text, and translate in seconds
        </p>
        
        {/* Scan limit info */}
        {user && (
          <div className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-primary-50 rounded-full">
            <Zap className="w-4 h-4 text-primary-600" />
            <span className="text-sm font-medium text-primary-700">
              {user.plan === 'pro'
                ? 'Unlimited scans'
                : `${user.getRemainingScans()} scans remaining today`}
            </span>
          </div>
        )}
      </div>
      
      {/* Scan options */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Camera option */}
        <button
          onClick={isNative ? captureWithNativeCamera : startCamera}
          disabled={!canScan}
          className="card hover:shadow-xl transition-all group"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2">Use Camera</h3>
              <p className="text-gray-600 text-sm">
                Capture documents using your device camera
              </p>
            </div>
          </div>
        </button>
        
        {/* Gallery option */}
        <button
          onClick={isNative ? handleGalleryWithNative : () => fileInputRef.current?.click()}
          disabled={!canScan}
          className="card hover:shadow-xl transition-all group"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-10 h-10 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2">Upload Image</h3>
              <p className="text-gray-600 text-sm">
                Choose an image from your gallery
              </p>
            </div>
          </div>
        </button>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      {/* Error message */}
      {error && (
        <div className="mt-6 card bg-red-50 border-red-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Upgrade prompt for free users */}
      {user?.plan === 'free' && !canScan && (
        <div className="mt-6 card bg-gradient-to-r from-primary-500 to-purple-600 text-white">
          <div className="text-center">
            <h3 className="font-bold text-xl mb-2">Daily Limit Reached</h3>
            <p className="mb-4">Upgrade to scan unlimited documents</p>
            <button
              onClick={() => (window.location.href = '/pricing')}
              className="btn-secondary bg-white text-primary-600 hover:bg-gray-100"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
  
  // Render camera view
  const renderCamera = () => (
    <div className="max-w-2xl mx-auto">
      <div className="relative">
        {/* Camera preview */}
        <div className="scanner-preview bg-black rounded-2xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
        </div>
        
        {/* Camera controls */}
        <div className="mt-6 flex items-center justify-center space-x-4">
          <button
            onClick={() => {
              if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null);
              }
              setMode('select');
            }}
            className="btn-outline"
          >
            <X className="w-5 h-5" />
            <span>Cancel</span>
          </button>
          
          <button
            onClick={switchCamera}
            className="btn-outline"
          >
            <SwitchCamera className="w-5 h-5" />
            <span>Flip</span>
          </button>
          
          <button
            onClick={capturePhoto}
            className="floating-button w-16 h-16"
          >
            <Camera className="w-8 h-8" />
          </button>
        </div>
      </div>
      
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
  
  // Render preview
  const renderPreview = () => {
    const previewUrl = getPreviewUrl();
    
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="font-bold text-2xl mb-2">Preview</h2>
          <p className="text-gray-600">Review your image before processing</p>
        </div>
        
        {/* Image preview */}
        <div className="card">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full rounded-xl"
          />
        </div>
        
        {/* Actions */}
        <div className="mt-6 flex items-center justify-center space-x-4">
          <button
            onClick={startNewScan}
            className="btn-outline"
          >
            <X className="w-5 h-5" />
            <span>Retake</span>
          </button>
          
          <button
            onClick={processOCR}
            disabled={processing}
            className="btn-primary"
          >
            <Zap className="w-5 h-5" />
            <span>Extract Text</span>
          </button>
        </div>
        
        {/* Error */}
        {error && (
          <div className="mt-4 card bg-red-50 border-red-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render processing
  const renderProcessing = () => (
    <div className="max-w-2xl mx-auto">
      <div className="card text-center">
        <div className="loading-spinner mb-6"></div>
        
        <h2 className="font-bold text-2xl mb-2">Processing Image...</h2>
        <p className="text-gray-600 mb-6">
          Our AI is extracting text from your document
        </p>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600">{progress}%</p>
      </div>
    </div>
  );
  
  // Render results
  const renderResults = () => (
    <div className="max-w-4xl mx-auto">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Original image */}
        <div>
          <h3 className="font-bold text-lg mb-4">Original Image</h3>
          <div className="card">
            <img
              src={getPreviewUrl()}
              alt="Scanned document"
              className="w-full rounded-xl"
            />
          </div>
        </div>
        
        {/* Extracted text */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Extracted Text</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Confidence:</span>
              <span className="badge-success">
                {Math.round(result?.ocr?.confidence || 0)}%
              </span>
            </div>
          </div>
          
          <div className="card">
            {/* Language detected */}
            {result?.ocr?.language && (
              <div className="mb-4 pb-4 border-b flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">
                    Language: <strong>{result.ocr.language}</strong>
                  </span>
                </div>
              </div>
            )}
            
            {/* Text content */}
            <textarea
              value={result?.ocr?.text || ''}
              readOnly
              className="input-field min-h-[300px] font-mono text-sm"
            />
            
            {/* Actions */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={copyText}
                className="btn-outline"
              >
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
              
              <button
                onClick={downloadText}
                className="btn-outline"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Translation section */}
      {result?.ocr?.text && (
        <div className="mt-6 card">
          <h3 className="font-bold text-lg mb-4">Translate Text</h3>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="input-field flex-1"
            >
              <option value="">Select language...</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese</option>
              <option value="ja">Japanese</option>
              <option value="ar">Arabic</option>
              <option value="ru">Russian</option>
            </select>
            
            <button
              onClick={translateText}
              disabled={!selectedLanguage || translating}
              className="btn-primary"
            >
              {translating ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Globe className="w-5 h-5" />
              )}
              <span>Translate</span>
            </button>
          </div>
          
          {/* Translated text */}
          {result?.translation?.translatedText && (
            <div className="mt-4 p-4 bg-green-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">
                  Translated to {result.translation.targetLanguage}
                </span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-gray-800">{result.translation.translatedText}</p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 card bg-red-50 border-red-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* New scan button */}
      <div className="mt-6 text-center">
        <button
          onClick={startNewScan}
          className="btn-primary"
        >
          <Camera className="w-5 h-5" />
          <span>Scan New Document</span>
        </button>
      </div>
    </div>
  );
  
  // Main render
  return (
    <div className="page-container">
      {mode === 'select' && renderModeSelection()}
      {mode === 'camera' && renderCamera()}
      {mode === 'preview' && renderPreview()}
      {mode === 'processing' && renderProcessing()}
      {mode === 'result' && renderResults()}
    </div>
  );
};

export default Scanner;
