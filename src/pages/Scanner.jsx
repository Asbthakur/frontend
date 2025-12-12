import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ocrAPI } from '../services/api';
import { Capacitor } from '@capacitor/core';
import {
  Camera,
  Upload,
  X,
  Download,
  Copy,
  FileText,
  Zap,
  CheckCircle,
  AlertCircle,
  Globe,
  Loader,
  SwitchCamera,
  FileSpreadsheet,
  Sparkles,
  ChevronDown,
  Clipboard,
} from 'lucide-react';

const Scanner = () => {
  const { user, isAuthenticated } = useAuth();
  
  // State management
  const [mode, setMode] = useState('select');
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [translating, setTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);
  const dropZoneRef = useRef(null);
  
  const isNative = Capacitor.isNativePlatform();
  const canScan = isAuthenticated ? (user?.canScan?.() ?? true) : true;

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (e) => {
      // Only handle paste on select mode
      if (mode !== 'select') return;
      
      // Check clipboard data
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;
      
      const items = clipboardData.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Check if it's an image
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          
          if (file) {
            // Check file size
            if (file.size > 10 * 1024 * 1024) {
              setError('Image size should be less than 10MB');
              return;
            }
            setError('');
            setUploadedFile(file);
            setMode('preview');
          }
          break;
        }
      }
    };
    
    // Add listener to window
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [mode]);

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        if (file.size > 10 * 1024 * 1024) {
          setError('Image size should be less than 10MB');
          return;
        }
        setUploadedFile(file);
        setMode('preview');
      } else {
        setError('Please drop an image file');
      }
    }
  };

  // Handle paste button click
  const handlePasteButton = async () => {
    try {
      // Use Clipboard API to read image
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            const file = new File([blob], 'pasted-image.png', { type: type });
            
            if (file.size > 10 * 1024 * 1024) {
              setError('Image size should be less than 10MB');
              return;
            }
            
            setError('');
            setUploadedFile(file);
            setMode('preview');
            return;
          }
        }
      }
      
      setError('No image found in clipboard. Copy an image first!');
    } catch (err) {
      console.error('Paste error:', err);
      // Fallback message if clipboard API fails
      setError('Could not access clipboard. Try pressing Ctrl+V / Cmd+V instead.');
    }
  };

  // Camera functions
  const startCamera = async () => {
    try {
      setError('');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Request camera with specific facing mode
      const constraints = {
        video: { 
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        }
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      // Check actual camera being used
      const videoTrack = newStream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      
      // Update facingMode based on actual camera (some devices report this)
      if (settings.facingMode) {
        setFacingMode(settings.facingMode);
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setMode('camera');
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please check permissions.');
    }
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    // Stop current stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const constraints = {
        video: { 
          facingMode: { exact: newFacingMode },
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        }
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      // If exact facingMode fails, try with ideal
      try {
        const constraints = {
          video: { 
            facingMode: { ideal: newFacingMode },
            width: { ideal: 1920 }, 
            height: { ideal: 1080 } 
          }
        };
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (err2) {
        console.error('Switch camera error:', err2);
        setError('Could not switch camera');
      }
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // NEVER mirror for back camera (environment)
    // Only mirror for front camera (user) - but even then, capture without mirror
    // The preview is mirrored for selfie view, but captured image should be normal
    
    // Draw the image WITHOUT any mirroring - let the camera provide correct orientation
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      setCapturedImage(blob);
      setMode('preview');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }, 'image/jpeg', 0.95);
  };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size should be less than 10MB');
      return;
    }
    setUploadedFile(file);
    setMode('preview');
  };

  const getPreviewUrl = () => {
    if (capturedImage) return URL.createObjectURL(capturedImage);
    if (uploadedFile) return URL.createObjectURL(uploadedFile);
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
    setSummary('');
    setMode('processing');
    
    try {
      const file = capturedImage || uploadedFile;
      const response = await ocrAPI.extractText(file, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percentCompleted);
      });
      
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

  // Copy text
  const copyText = async () => {
    if (!result?.ocr?.text) return;
    try {
      await navigator.clipboard.writeText(result.ocr.text);
      alert('Text copied to clipboard!');
    } catch (err) {
      alert('Failed to copy text');
    }
  };

  // Download as TXT
  const downloadText = () => {
    if (!result?.ocr?.text) return;
    const blob = new Blob([result.ocr.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download as Word (HTML-based DOCX)
  const downloadAsWord = () => {
    if (!result?.ocr?.text) return;
    
    const text = result.ocr.text;
    const translatedText = result?.translation?.translatedText || '';
    const summaryText = summary || '';
    
    // Create HTML content for Word
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Extracted Text</title></head>
      <body style="font-family: Arial, sans-serif;">
        <h1 style="color: #6366f1;">AngelPDF - Extracted Text</h1>
        <p style="color: #666; font-size: 12px;">Generated on ${new Date().toLocaleString()}</p>
        <hr/>
        
        <h2>Extracted Text</h2>
        <div style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 8px;">
${text}
        </div>
        
        ${summaryText ? `
        <h2 style="margin-top: 30px;">AI Summary</h2>
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px;">
${summaryText}
        </div>
        ` : ''}
        
        ${translatedText ? `
        <h2 style="margin-top: 30px;">Translation (${result.translation.targetLanguage})</h2>
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
${translatedText}
        </div>
        ` : ''}
        
        <hr style="margin-top: 40px;"/>
        <p style="color: #999; font-size: 10px;">Powered by AngelPDF - AI Document Scanner</p>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan_${Date.now()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Download as Excel (CSV format)
  const downloadAsExcel = () => {
    if (!result?.ocr?.text) return;
    
    const text = result.ocr.text;
    const lines = text.split('\n').filter(line => line.trim());
    
    // Try to detect if it's tabular data
    let csvContent = '';
    
    // Check if lines contain common delimiters
    const hasDelimiters = lines.some(line => 
      line.includes('|') || line.includes('\t') || line.includes('  ')
    );
    
    if (hasDelimiters) {
      // Parse as table
      lines.forEach(line => {
        // Replace multiple spaces or pipes with comma
        let cells = line
          .split(/[|\t]/)
          .map(cell => cell.trim())
          .filter(cell => cell && !cell.match(/^[-=]+$/)); // Remove separator lines
        
        if (cells.length > 0) {
          // Escape quotes and wrap in quotes
          const csvRow = cells.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
          csvContent += csvRow + '\n';
        }
      });
    } else {
      // Single column - each line is a row
      lines.forEach(line => {
        csvContent += `"${line.replace(/"/g, '""')}"\n`;
      });
    }
    
    // Add BOM for Excel to recognize UTF-8
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // AI Summary
  const generateSummary = async () => {
    if (!result?.ocr?.text) return;
    
    setSummarizing(true);
    setError('');
    
    try {
      const response = await ocrAPI.summarize(result.ocr.text);
      
      if (response.success) {
        setSummary(response.summary);
      } else {
        setError(response.message || 'Failed to generate summary');
      }
    } catch (err) {
      console.error('Summary error:', err);
      setError(err.response?.data?.message || 'Failed to generate summary');
    } finally {
      setSummarizing(false);
    }
  };

  // Translate text
  const translateText = async () => {
    if (!selectedLanguage || !result?.ocr?.text) return;
    
    setTranslating(true);
    setError('');
    
    try {
      const response = await ocrAPI.translate(result._id, selectedLanguage, result.ocr.text);
      
      if (response.success) {
        setResult(prev => ({
          ...prev,
          translation: response.translation || response.scan?.translation
        }));
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

  // Reset
  const startNewScan = () => {
    setCapturedImage(null);
    setUploadedFile(null);
    setResult(null);
    setError('');
    setSelectedLanguage('');
    setSummary('');
    setMode('select');
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderModeSelection = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent mb-2">
          AI Document Scanner
        </h1>
        <p className="text-gray-600">
          Scan documents, extract text, translate & export in seconds
        </p>
        
        {!isAuthenticated && (
          <div className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-green-50 rounded-full">
            <Zap className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              Free to use • No signup required
            </span>
          </div>
        )}
      </div>
      
      {/* DESKTOP VIEW - Drag & Drop, Browse, Paste */}
      {!isMobile && (
        <>
          {/* Drag & Drop Zone */}
          <div
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`mb-6 border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
              isDragging 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
          >
            <div className="flex flex-col items-center">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                isDragging ? 'bg-primary-100' : 'bg-gray-100'
              }`}>
                <Upload className={`w-10 h-10 ${isDragging ? 'text-primary-600' : 'text-gray-400'}`} />
              </div>
              <p className="font-semibold text-xl mb-2">
                {isDragging ? 'Drop your image here!' : 'Drag & Drop your image here'}
              </p>
              <p className="text-gray-500 text-sm mb-6">Supports: JPG, PNG, WEBP, TIFF (Max 10MB)</p>
              
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  Browse Files
                </button>
                <button
                  onClick={handlePasteButton}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <Clipboard className="w-5 h-5" />
                  Paste Image
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-4">or press Ctrl+V / Cmd+V to paste from clipboard</p>
            </div>
          </div>
        </>
      )}
      
      {/* MOBILE VIEW - Camera + Upload buttons */}
      {isMobile && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Camera Option */}
            <button
              onClick={startCamera}
              disabled={!canScan}
              className="card hover:shadow-xl transition-all group p-6"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Camera</h3>
                  <p className="text-gray-600 text-xs">Take a photo</p>
                </div>
              </div>
            </button>
            
            {/* Upload Option */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!canScan}
              className="card hover:shadow-xl transition-all group p-6"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Gallery</h3>
                  <p className="text-gray-600 text-xs">Choose image</p>
                </div>
              </div>
            </button>
          </div>
          
          {/* Drag & Drop hint for mobile (smaller) */}
          <div
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center"
          >
            <p className="text-gray-500 text-sm">Or drag & drop an image here</p>
          </div>
        </>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderCamera = () => (
    <div className="max-w-2xl mx-auto">
      <div className="relative">
        <div className="bg-black rounded-2xl overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {/* No transform/mirror - show camera feed as-is */}
        </div>
        
        <div className="mt-6 flex items-center justify-center space-x-4">
          <button
            onClick={() => {
              if (stream) stream.getTracks().forEach(track => track.stop());
              setStream(null);
              setMode('select');
            }}
            className="btn-outline"
          >
            <X className="w-5 h-5" />
            <span>Cancel</span>
          </button>
          
          <button onClick={switchCamera} className="btn-outline">
            <SwitchCamera className="w-5 h-5" />
            <span>Flip</span>
          </button>
          
          <button
            onClick={capturePhoto}
            className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all"
          >
            <Camera className="w-8 h-8" />
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const renderPreview = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="font-bold text-2xl mb-2">Preview</h2>
        <p className="text-gray-600">Review your image before processing</p>
      </div>
      
      <div className="card p-2">
        <img src={getPreviewUrl()} alt="Preview" className="w-full rounded-xl" />
      </div>
      
      <div className="mt-6 flex items-center justify-center space-x-4">
        <button onClick={startNewScan} className="btn-outline">
          <X className="w-5 h-5" />
          <span>Retake</span>
        </button>
        
        <button onClick={processOCR} disabled={processing} className="btn-primary">
          <Zap className="w-5 h-5" />
          <span>Extract Text</span>
        </button>
      </div>
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderProcessing = () => (
    <div className="max-w-2xl mx-auto">
      <div className="card text-center p-8">
        <Loader className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-6" />
        <h2 className="font-bold text-2xl mb-2">Processing Image...</h2>
        <p className="text-gray-600 mb-6">Our AI is extracting text from your document</p>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">{progress}%</p>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="max-w-5xl mx-auto">
      {/* New Scan Button - Top */}
      <div className="mb-6 flex justify-end">
        <button onClick={startNewScan} className="btn-primary">
          <Camera className="w-5 h-5" />
          <span>New Scan</span>
        </button>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Original image */}
        <div>
          <h3 className="font-bold text-lg mb-4">Original Image</h3>
          <div className="card p-2">
            <img src={getPreviewUrl()} alt="Scanned" className="w-full rounded-xl" />
          </div>
        </div>
        
        {/* Extracted text */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Extracted Text</h3>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded-full">
              {Math.round(result?.ocr?.confidence || 98)}% accuracy
            </span>
          </div>
          
          <div className="card">
            <textarea
              value={result?.ocr?.text || ''}
              readOnly
              className="w-full min-h-[250px] p-3 border border-gray-200 rounded-xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            
            {/* Action buttons */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button onClick={copyText} className="btn-outline text-sm py-2">
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
              
              <button onClick={downloadText} className="btn-outline text-sm py-2">
                <Download className="w-4 h-4" />
                <span>TXT</span>
              </button>
              
              <button onClick={downloadAsWord} className="btn-outline text-sm py-2">
                <FileText className="w-4 h-4" />
                <span>Word</span>
              </button>
              
              <button onClick={downloadAsExcel} className="btn-outline text-sm py-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Summary Section */}
      <div className="mt-6 card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Summary
          </h3>
          <button
            onClick={generateSummary}
            disabled={summarizing}
            className="btn-primary text-sm py-2"
          >
            {summarizing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Summary</span>
              </>
            )}
          </button>
        </div>
        
        {summary ? (
          <div className="p-4 bg-purple-50 rounded-xl">
            <p className="text-gray-800 whitespace-pre-wrap">{summary}</p>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Click "Generate Summary" to get an AI-powered explanation of the extracted text
          </p>
        )}
      </div>
      
      {/* Translation Section */}
      <div className="mt-6 card">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-500" />
          Translate Text
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select language...</option>
            
            {/* Indian Languages */}
            <optgroup label="Indian Languages">
              <option value="hi">Hindi (हिन्दी)</option>
              <option value="bn">Bengali (বাংলা)</option>
              <option value="te">Telugu (తెలుగు)</option>
              <option value="mr">Marathi (मराठी)</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="gu">Gujarati (ગુજરાતી)</option>
              <option value="kn">Kannada (ಕನ್ನಡ)</option>
              <option value="ml">Malayalam (മലയാളം)</option>
              <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
              <option value="or">Odia (ଓଡ଼ିଆ)</option>
              <option value="ur">Urdu (اردو)</option>
            </optgroup>
            
            {/* European Languages */}
            <optgroup label="European Languages">
              <option value="en">English</option>
              <option value="es">Spanish (Español)</option>
              <option value="fr">French (Français)</option>
              <option value="de">German (Deutsch)</option>
              <option value="it">Italian (Italiano)</option>
              <option value="pt">Portuguese (Português)</option>
              <option value="nl">Dutch (Nederlands)</option>
              <option value="pl">Polish (Polski)</option>
              <option value="ru">Russian (Русский)</option>
              <option value="uk">Ukrainian (Українська)</option>
              <option value="el">Greek (Ελληνικά)</option>
            </optgroup>
            
            {/* Asian Languages */}
            <optgroup label="Asian Languages">
              <option value="zh">Chinese (中文)</option>
              <option value="ja">Japanese (日本語)</option>
              <option value="ko">Korean (한국어)</option>
              <option value="th">Thai (ไทย)</option>
              <option value="vi">Vietnamese (Tiếng Việt)</option>
              <option value="id">Indonesian (Bahasa Indonesia)</option>
              <option value="ms">Malay (Bahasa Melayu)</option>
              <option value="tl">Filipino (Tagalog)</option>
            </optgroup>
            
            {/* Middle Eastern Languages */}
            <optgroup label="Middle Eastern Languages">
              <option value="ar">Arabic (العربية)</option>
              <option value="fa">Persian (فارسی)</option>
              <option value="he">Hebrew (עברית)</option>
              <option value="tr">Turkish (Türkçe)</option>
            </optgroup>
            
            {/* African Languages */}
            <optgroup label="African Languages">
              <option value="sw">Swahili (Kiswahili)</option>
              <option value="am">Amharic (አማርኛ)</option>
            </optgroup>
          </select>
          
          <button
            onClick={translateText}
            disabled={!selectedLanguage || translating}
            className="btn-primary"
          >
            {translating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Translating...</span>
              </>
            ) : (
              <>
                <Globe className="w-5 h-5" />
                <span>Translate</span>
              </>
            )}
          </button>
        </div>
        
        {result?.translation?.translatedText && (
          <div className="mt-4 p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">
                Translated to {result.translation.targetLanguage}
              </span>
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-gray-800 whitespace-pre-wrap">{result.translation.translatedText}</p>
          </div>
        )}
      </div>
      
      {/* Error display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}
      
      {/* New scan button */}
      <div className="mt-8 text-center">
        <button onClick={startNewScan} className="btn-primary">
          <Camera className="w-5 h-5" />
          <span>Scan New Document</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-24">
      {mode === 'select' && renderModeSelection()}
      {mode === 'camera' && renderCamera()}
      {mode === 'preview' && renderPreview()}
      {mode === 'processing' && renderProcessing()}
      {mode === 'result' && renderResults()}
    </div>
  );
};

export default Scanner;
