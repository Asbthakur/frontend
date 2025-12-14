import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ocrAPI } from '../services/api';
import { Capacitor } from '@capacitor/core';
import {
  Camera,
  Upload,
  X,
  Download,
  Copy,
  FileText,
  CheckCircle,
  AlertCircle,
  Globe,
  Loader,
  FileSpreadsheet,
  Sparkles,
  Clipboard,
  Plus,
  ChevronLeft,
  Check,
  Table,
  FileDown,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

const Scanner = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const initialFiles = location.state?.files || [];
  const initialMode = searchParams.get('mode');
  
  // State management
  const [mode, setMode] = useState('select');
  const [extractionType, setExtractionType] = useState(initialMode === 'tables' ? 'tables' : null);
  const [stream, setStream] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [translating, setTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Typing animation state
  const [typingText, setTypingText] = useState('');
  const typingMessages = [
    'Analyzing your document...',
    'Extracting content...',
    'Processing with AI...',
    'Almost done...',
  ];
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const isNative = Capacitor.isNativePlatform();

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

  // Handle files from landing page
  useEffect(() => {
    if (initialFiles.length > 0) {
      setCapturedImages(initialFiles);
      setMode('choose-extraction');
    }
  }, []);

  // Cleanup camera
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Typing animation
  useEffect(() => {
    if (mode !== 'processing') return;
    
    let messageIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId;
    
    const typeEffect = () => {
      const currentMessage = typingMessages[messageIndex];
      
      if (!isDeleting) {
        setTypingText(currentMessage.substring(0, charIndex + 1));
        charIndex++;
        
        if (charIndex === currentMessage.length) {
          isDeleting = true;
          timeoutId = setTimeout(typeEffect, 1500);
          return;
        }
      } else {
        setTypingText(currentMessage.substring(0, charIndex - 1));
        charIndex--;
        
        if (charIndex === 0) {
          isDeleting = false;
          messageIndex = (messageIndex + 1) % typingMessages.length;
        }
      }
      
      timeoutId = setTimeout(typeEffect, isDeleting ? 30 : 50);
    };
    
    timeoutId = setTimeout(typeEffect, 100);
    return () => clearTimeout(timeoutId);
  }, [mode]);

  // Handle paste
  useEffect(() => {
    const handlePaste = async (e) => {
      if (mode !== 'select' && mode !== 'choose-extraction') return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            setCapturedImages(prev => [...prev, file]);
            setMode('choose-extraction');
          }
          break;
        }
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [mode]);

  // Helpers
  const getImageUrl = (img) => {
    if (typeof img === 'string') return img;
    return URL.createObjectURL(img);
  };

  // File handling
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (validFiles.length > 0) {
      setCapturedImages(prev => [...prev, ...validFiles]);
      setMode('choose-extraction');
      setError('');
    }
  };

  // Drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (validFiles.length > 0) {
      setCapturedImages(prev => [...prev, ...validFiles]);
      setMode('choose-extraction');
    }
  };

  // Camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setMode('camera');
    } catch (err) {
      setError('Camera access denied');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      setCapturedImages(prev => [...prev, blob]);
      setMode('choose-extraction');
    }, 'image/jpeg', 0.9);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setMode('select');
  };

  // Start new scan
  const startNewScan = () => {
    setCapturedImages([]);
    setResult(null);
    setSummary('');
    setSelectedLanguage('');
    setError('');
    setExtractionType(null);
    setMode('select');
  };

  // ==================== EXTRACTION ====================
  
  const extractText = async () => {
    if (capturedImages.length === 0) return;
    
    setExtractionType('text');
    setProcessing(true);
    setMode('processing');
    setProgress(0);
    setError('');
    
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
      fakeProgress += Math.random() * 15;
      if (fakeProgress > 90) fakeProgress = 90;
      setProgress(Math.round(fakeProgress));
    }, 200);
    
    try {
      const response = await ocrAPI.extractMultiple(capturedImages);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (response.success) {
        setResult({
          ocr: {
            text: response.text,
            confidence: response.confidence || 98,
            pages: response.pages
          },
          tables: [],
          tableCount: 0
        });
        setMode('result');
      } else {
        throw new Error(response.error || 'Extraction failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to extract text');
      setMode('choose-extraction');
    } finally {
      clearInterval(progressInterval);
      setProcessing(false);
      setProgress(0);
    }
  };

  const extractTables = async () => {
    if (capturedImages.length === 0) return;
    
    setExtractionType('tables');
    setProcessing(true);
    setMode('processing');
    setProgress(0);
    setError('');
    
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
      fakeProgress += Math.random() * 8;
      if (fakeProgress > 85) fakeProgress = 85;
      setProgress(Math.round(fakeProgress));
    }, 300);
    
    try {
      const response = await ocrAPI.extractWithTables(capturedImages[0]);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (response.success) {
        setResult({
          ocr: { text: '', confidence: 0 },
          tables: response.tables || [],
          tableCount: response.tableCount || response.tables?.length || 0
        });
        setMode('result');
      } else {
        throw new Error(response.error || 'Table extraction failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to extract tables');
      setMode('choose-extraction');
    } finally {
      clearInterval(progressInterval);
      setProcessing(false);
      setProgress(0);
    }
  };

  // ==================== TRANSLATION ====================
  
  const translateText = async () => {
    if (!selectedLanguage || !result?.ocr?.text) return;
    
    setTranslating(true);
    setError('');
    
    try {
      const scanId = result?.scanId || result?._id || null;
      const response = await ocrAPI.translate(result.ocr.text, selectedLanguage, scanId);
      
      if (response.success) {
        setResult(prev => ({
          ...prev,
          translation: response.translation || response.scan?.translation
        }));
      } else {
        setError(response.message || 'Translation failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to translate');
    } finally {
      setTranslating(false);
    }
  };

  // ==================== AI EXPLAIN ====================
  
  const generateExplanation = async () => {
    const textToExplain = result?.translation?.translatedText || result?.ocr?.text;
    if (!textToExplain) return;
    
    setSummarizing(true);
    setError('');
    
    try {
      const response = await ocrAPI.summarize(textToExplain);
      
      if (response.success) {
        setSummary(response.summary);
      } else {
        setError(response.message || 'Failed to generate explanation');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate explanation');
    } finally {
      setSummarizing(false);
    }
  };

  // ==================== EXPORT ====================
  
  const copyText = async () => {
    const text = result?.translation?.translatedText || result?.ocr?.text;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      setError('Failed to copy');
    }
  };

  const downloadText = () => {
    const text = result?.translation?.translatedText || result?.ocr?.text;
    if (!text) return;
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsWord = () => {
    const text = result?.ocr?.text || '';
    const translatedText = result?.translation?.translatedText || '';
    
    const html = `<html><head><meta charset="utf-8"></head><body style="font-family:Arial;">
      <h1>AngelPDF Document</h1>
      <h2>Extracted Text</h2><pre>${text}</pre>
      ${translatedText ? `<h2>Translation</h2><pre>${translatedText}</pre>` : ''}
      ${summary ? `<h2>AI Explanation</h2><pre>${summary}</pre>` : ''}
    </body></html>`;
    
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document_${Date.now()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTablesAsExcel = async () => {
    if (!result?.tables || result.tables.length === 0) return;
    
    try {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
      const workbook = XLSX.utils.book_new();
      
      result.tables.forEach((table, idx) => {
        if (table.data?.length > 0) {
          const worksheet = XLSX.utils.aoa_to_sheet(table.data);
          const sheetName = (table.title || `Table ${idx + 1}`).substring(0, 31);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
      });
      
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tables_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback CSV
      let csv = '';
      result.tables.forEach((table, idx) => {
        csv += `Table ${idx + 1}\n`;
        table.data?.forEach(row => {
          csv += row.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',') + '\n';
        });
        csv += '\n';
      });
      
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tables_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ==================== RENDER: SELECT MODE ====================
  
  const renderModeSelection = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent mb-2">
          AI Document Scanner
        </h1>
        <p className="text-gray-400">Scan multiple pages, create PDF & extract text</p>
      </div>

      <div
        className={`bg-gray-800/50 border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
          ${isDragging ? 'border-violet-500 bg-violet-500/10' : 'border-gray-600 hover:border-violet-400'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        
        <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-white" />
        </div>
        
        <p className="text-xl font-semibold text-white mb-2">Drag & Drop images here</p>
        <p className="text-gray-400 mb-6">You can select multiple images at once</p>
        
        <div className="flex justify-center gap-3 mb-6">
          <button 
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/30 transition-all"
          >
            <Upload className="w-5 h-5" />
            Browse Files
          </button>
          
          <button 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 bg-gray-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-600 transition-all"
          >
            <Clipboard className="w-5 h-5" />
            Paste Image
          </button>
        </div>
        
        <p className="text-sm text-gray-500">Supports: JPG, PNG, WEBP (Max 10MB each)</p>
      </div>

      {isMobile && (
        <button 
          onClick={startCamera}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-4 rounded-xl font-semibold"
        >
          <Camera className="w-6 h-6" />
          Open Camera
        </button>
      )}
    </div>
  );

  // ==================== RENDER: CHOOSE EXTRACTION ====================
  
  const renderChooseExtraction = () => (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">What do you want to extract?</h1>
        <p className="text-gray-400">{capturedImages.length} image(s) ready to process</p>
      </div>

      {/* Image Preview */}
      <div className="flex gap-3 overflow-x-auto p-4 bg-gray-800/30 rounded-xl mb-8">
        {capturedImages.map((img, index) => (
          <div key={index} className="relative flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border-2 border-gray-600">
            <img src={getImageUrl(img)} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />
            <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 rounded">
              {index + 1}
            </span>
            <button 
              onClick={() => setCapturedImages(prev => prev.filter((_, i) => i !== index))}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 w-20 h-24 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-gray-500 hover:border-violet-400 hover:text-violet-400 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
      </div>

      {/* Extraction Options */}
      <div className="space-y-4">
        <button 
          onClick={extractText}
          className="w-full flex items-center gap-5 bg-gray-800/50 border border-gray-700 rounded-2xl p-6 text-left hover:border-violet-500 hover:bg-gray-800 transition-all group"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">Extract Text</h3>
            <p className="text-gray-400 text-sm mb-2">Fast text extraction using AI OCR</p>
            <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
              ⚡ ~1 second
            </span>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
        </button>

        <button 
          onClick={extractTables}
          className="w-full flex items-center gap-5 bg-gray-800/50 border border-gray-700 rounded-2xl p-6 text-left hover:border-cyan-500 hover:bg-gray-800 transition-all group"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Table className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">Extract Tables</h3>
            <p className="text-gray-400 text-sm mb-2">AI-powered table detection & Excel export</p>
            <span className="inline-block px-3 py-1 bg-violet-500/20 text-violet-400 text-xs rounded-full">
              🤖 AI Processing
            </span>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      <button onClick={startNewScan} className="flex items-center gap-2 text-gray-400 hover:text-violet-400 mt-6">
        <ChevronLeft className="w-4 h-4" />
        Start Over
      </button>
    </div>
  );

  // ==================== RENDER: PROCESSING ====================
  
  const renderProcessing = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-gray-800/50 border border-gray-700 rounded-3xl p-12 text-center max-w-md w-full">
        <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-6"></div>
        
        <h2 className="text-xl font-semibold text-white mb-4">
          {extractionType === 'tables' ? 'Extracting Tables...' : 'Extracting Text...'}
        </h2>
        
        <p className="text-gray-400 h-6 mb-6">
          {typingText}<span className="animate-pulse text-violet-400">|</span>
        </p>
        
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500">{progress}%</p>
      </div>
    </div>
  );

  // ==================== RENDER: RESULTS ====================
  
  const renderResults = () => (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
          <CheckCircle className="w-7 h-7 text-green-500" />
          Extraction Complete
        </h2>
        <button 
          onClick={startNewScan}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold"
        >
          <Camera className="w-5 h-5" />
          New Scan
        </button>
      </div>

      {/* TEXT Results */}
      {extractionType === 'text' && result?.ocr?.text && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <FileText className="w-5 h-5 text-violet-400" />
              Extracted Text
            </h3>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
              {result.ocr.confidence}% accuracy
            </span>
          </div>
          
          <textarea
            value={result.ocr.text}
            readOnly
            className="w-full h-48 bg-gray-900/50 border border-gray-600 rounded-xl p-4 text-gray-200 font-mono text-sm resize-y focus:outline-none focus:border-violet-500"
          />
          
          <div className="flex gap-2 mt-4 flex-wrap">
            <button onClick={copyText} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-all">
              <Copy className="w-4 h-4" /> Copy
            </button>
            <button onClick={downloadText} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-all">
              <Download className="w-4 h-4" /> TXT
            </button>
            <button onClick={downloadAsWord} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-all">
              <FileText className="w-4 h-4" /> Word
            </button>
          </div>
        </div>
      )}

      {/* TABLE Results */}
      {extractionType === 'tables' && result?.tables?.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-5">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Table className="w-5 h-5 text-cyan-400" />
            Extracted Tables ({result.tables.length})
          </h3>
          
          {result.tables.map((table, idx) => (
            <div key={idx} className="mb-4">
              <h4 className="text-gray-400 text-sm mb-2">{table.title || `Table ${idx + 1}`}</h4>
              <div className="overflow-x-auto border border-gray-600 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-violet-500/20">
                      {table.data?.[0]?.map((header, i) => (
                        <th key={i} className="px-4 py-3 text-left text-violet-300 font-semibold">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.data?.slice(1).map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-t border-gray-700 hover:bg-gray-700/30">
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="px-4 py-3 text-gray-300">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          
          <button 
            onClick={downloadTablesAsExcel}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold mt-4"
          >
            <FileSpreadsheet className="w-5 h-5" />
            Download as Excel
          </button>
        </div>
      )}

      {/* TRANSLATION - Only for text */}
      {extractionType === 'text' && result?.ocr?.text && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-5">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <Globe className="w-5 h-5 text-cyan-400" />
            Translate
          </h3>
          
          <div className="flex gap-3 mb-4">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
            >
              <option value="">Select language...</option>
              <optgroup label="Indian Languages">
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="bn">Bengali (বাংলা)</option>
                <option value="te">Telugu (తెలుగు)</option>
                <option value="mr">Marathi (मराठी)</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="gu">Gujarati (ગુજરાતી)</option>
              </optgroup>
              <optgroup label="European">
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </optgroup>
              <optgroup label="Asian">
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
              </optgroup>
            </select>
            
            <button
              onClick={translateText}
              disabled={!selectedLanguage || translating}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {translating ? <Loader className="w-5 h-5 animate-spin" /> : <Globe className="w-5 h-5" />}
              {translating ? 'Translating...' : 'Translate'}
            </button>
          </div>
          
          {result?.translation?.translatedText && (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
              <p className="flex items-center gap-2 text-cyan-400 text-sm mb-2">
                <CheckCircle className="w-4 h-4" />
                Translated to {result.translation.targetLanguage}
              </p>
              <p className="text-gray-200 whitespace-pre-wrap">{result.translation.translatedText}</p>
            </div>
          )}
        </div>
      )}

      {/* AI EXPLAIN - Only for text, after translation */}
      {extractionType === 'text' && result?.ocr?.text && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-6 mb-5">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            Ask AngelPDF to Explain
          </h3>
          
          <p className="text-gray-400 text-sm mb-4">
            Get a detailed explanation with key points
            {selectedLanguage && !result?.translation?.translatedText && ' (Translate first for explanation in your language)'}
          </p>
          
          <button
            onClick={generateExplanation}
            disabled={summarizing || (selectedLanguage && !result?.translation?.translatedText)}
            className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50 transition-all"
          >
            {summarizing ? <Loader className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {summarizing ? 'Generating...' : 'Explain Content'}
          </button>
          
          {summary && (
            <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 mt-4">
              <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{summary}</p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );

  // ==================== RENDER: CAMERA ====================
  
  const renderCamera = () => (
    <div className="fixed inset-0 bg-black z-50">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-10">
        <button onClick={stopCamera} className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
          <X className="w-6 h-6 text-white" />
        </button>
        
        <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full p-1">
          <div className="w-full h-full bg-white rounded-full border-4 border-gray-300"></div>
        </button>
        
        <div className="w-12 text-center text-white text-sm">
          {capturedImages.length > 0 && `${capturedImages.length}`}
        </div>
      </div>
      
      {capturedImages.length > 0 && (
        <button 
          onClick={() => { stopCamera(); setMode('choose-extraction'); }}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-violet-500 text-white px-6 py-3 rounded-full font-semibold"
        >
          <Check className="w-5 h-5" />
          Done ({capturedImages.length})
        </button>
      )}
    </div>
  );

  // ==================== MAIN RENDER ====================
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 pb-24">
      {mode === 'select' && renderModeSelection()}
      {mode === 'choose-extraction' && renderChooseExtraction()}
      {mode === 'camera' && renderCamera()}
      {mode === 'processing' && renderProcessing()}
      {mode === 'result' && renderResults()}
    </div>
  );
};

export default Scanner;
