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
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);
  const dropZoneRef = useRef(null);
  
  const isNative = Capacitor.isNativePlatform();
  const canScan = isAuthenticated ? (user?.canScan?.() ?? true) : true;

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
      if (mode !== 'select') return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            setUploadedFile(file);
            setMode('preview');
          }
          break;
        }
      }
    };
    
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
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

  // Camera functions
  const startCamera = async () => {
    try {
      setError('');
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
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

  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    startCamera();
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
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
      
      {/* Drag & Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`mb-6 border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          isDragging 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
      >
        <div className="flex flex-col items-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isDragging ? 'bg-primary-100' : 'bg-gray-100'
          }`}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-primary-600' : 'text-gray-400'}`} />
          </div>
          <p className="font-semibold text-lg mb-1">
            {isDragging ? 'Drop your image here!' : 'Drag & Drop your image here'}
          </p>
          <p className="text-gray-500 text-sm mb-3">or paste from clipboard (Ctrl+V / Cmd+V)</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-primary-600 font-medium hover:text-primary-700 underline"
          >
            Browse files
          </button>
          <p className="text-gray-400 text-xs mt-2">Supports: JPG, PNG, WEBP, TIFF (Max 10MB)</p>
        </div>
      </div>
      
      {/* Or separator */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-gray-200"></div>
        <span className="text-gray-400 text-sm font-medium">OR</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>
      
      {/* Camera and Upload buttons */}
      <div className="grid md:grid-cols-2 gap-6">
        <button
          onClick={startCamera}
          disabled={!canScan}
          className="card hover:shadow-xl transition-all group p-8"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2">Use Camera</h3>
              <p className="text-gray-600 text-sm">Capture documents using your camera</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!canScan}
          className="card hover:shadow-xl transition-all group p-8"
        >
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-10 h-10 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl mb-2">Upload Image</h3>
              <p className="text-gray-600 text-sm">Choose an image from your device</p>
            </div>
          </div>
        </button>
      </div>
      
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
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
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
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ar">Arabic</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="ko">Korean</option>
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
