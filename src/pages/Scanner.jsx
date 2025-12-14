import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Zap,
  CheckCircle,
  AlertCircle,
  Globe,
  Loader,
  FileSpreadsheet,
  Sparkles,
  Clipboard,
  Plus,
  Trash2,
  FileImage,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Crop,
  Check,
  Move,
  Type,
  Highlighter,
  Palette,
  Table,
  FileDown,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

const Scanner = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Check if user came with files from landing page
  const initialFiles = location.state?.files || [];
  const initialMode = searchParams.get('mode'); // 'tables' if user clicked table extractor
  
  // State management
  const [mode, setMode] = useState('select');
  const [extractionType, setExtractionType] = useState(initialMode === 'tables' ? 'tables' : null); // 'text' or 'tables'
  const [stream, setStream] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
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
  
  // Image Editor State
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [editorTool, setEditorTool] = useState(null);
  const [textAnnotations, setTextAnnotations] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [textColor, setTextColor] = useState('#FF0000');
  const [highlightColor, setHighlightColor] = useState('rgba(255, 255, 0, 0.4)');
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
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

  // Handle files from landing page
  useEffect(() => {
    if (initialFiles.length > 0) {
      setCapturedImages(initialFiles);
      setMode('choose-extraction');
    }
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Typing animation effect
  useEffect(() => {
    if (mode !== 'processing') return;
    
    let messageIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    const typeEffect = () => {
      const currentMessage = typingMessages[messageIndex];
      
      if (!isDeleting) {
        setTypingText(currentMessage.substring(0, charIndex + 1));
        charIndex++;
        
        if (charIndex === currentMessage.length) {
          isDeleting = true;
          setTimeout(typeEffect, 1500);
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
      
      setTimeout(typeEffect, isDeleting ? 30 : 50);
    };
    
    const timer = setTimeout(typeEffect, 100);
    return () => clearTimeout(timer);
  }, [mode]);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (e) => {
      if (mode !== 'select' && mode !== 'choose-extraction') return;
      
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;
      
      const items = clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
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

  // Get image URL helper
  const getImageUrl = (img) => {
    if (typeof img === 'string') return img;
    return URL.createObjectURL(img);
  };

  // File handling
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const validFiles = files.filter(f => 
      f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    
    if (validFiles.length > 0) {
      setCapturedImages(prev => [...prev, ...validFiles]);
      setMode('choose-extraction');
      setError('');
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

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

  // Camera functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setMode('camera');
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
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

  // ==================== EXTRACTION FUNCTIONS ====================
  
  // Extract TEXT only (Google Vision - Fast)
  const extractText = async () => {
    if (capturedImages.length === 0) return;
    
    setExtractionType('text');
    setProcessing(true);
    setMode('processing');
    setProgress(0);
    setError('');
    
    // Smooth progress animation
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
      console.error('OCR error:', err);
      setError(err.message || 'Failed to extract text');
      setMode('choose-extraction');
    } finally {
      clearInterval(progressInterval);
      setProcessing(false);
      setProgress(0);
    }
  };

  // Extract TABLES only (OpenAI - AI-powered)
  const extractTables = async () => {
    if (capturedImages.length === 0) return;
    
    setExtractionType('tables');
    setProcessing(true);
    setMode('processing');
    setProgress(0);
    setError('');
    
    // Smooth progress animation
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
          ocr: {
            text: '',
            confidence: 0,
          },
          tables: response.tables || [],
          tableCount: response.tableCount || response.tables?.length || 0
        });
        setMode('result');
      } else {
        throw new Error(response.error || 'Table extraction failed');
      }
    } catch (err) {
      console.error('Table extraction error:', err);
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
      console.error('Translation error:', err);
      setError(err.response?.data?.message || 'Failed to translate');
    } finally {
      setTranslating(false);
    }
  };

  // ==================== AI EXPLAIN (Summary in translated language) ====================
  
  const generateExplanation = async () => {
    // Use translated text if available, otherwise original
    const textToExplain = result?.translation?.translatedText || result?.ocr?.text;
    if (!textToExplain) return;
    
    // Require translation first
    if (!result?.translation?.translatedText && selectedLanguage) {
      setError('Please translate the text first before asking for explanation');
      return;
    }
    
    setSummarizing(true);
    setError('');
    
    try {
      // Determine language for explanation
      const targetLang = result?.translation?.targetLanguage || 'en';
      
      const response = await ocrAPI.summarize(textToExplain, {
        style: 'detailed',
        language: targetLang
      });
      
      if (response.success) {
        setSummary(response.summary);
      } else {
        setError(response.message || 'Failed to generate explanation');
      }
    } catch (err) {
      console.error('Explanation error:', err);
      setError(err.response?.data?.message || 'Failed to generate explanation');
    } finally {
      setSummarizing(false);
    }
  };

  // ==================== EXPORT FUNCTIONS ====================
  
  const copyText = async () => {
    const text = result?.translation?.translatedText || result?.ocr?.text;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      // Show success feedback
    } catch (err) {
      setError('Failed to copy text');
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
    
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
      <head><meta charset="utf-8"><title>AngelPDF Export</title></head>
      <body style="font-family: Arial, sans-serif;">
        <h1 style="color: #667eea;">AngelPDF Document</h1>
        
        <h2>Extracted Text</h2>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${text}</div>
        
        ${translatedText ? `
        <h2 style="margin-top: 30px;">Translation</h2>
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${translatedText}</div>
        ` : ''}
        
        ${summary ? `
        <h2 style="margin-top: 30px;">AI Explanation</h2>
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${summary}</div>
        ` : ''}
        
        <hr style="margin-top: 40px;"/>
        <p style="color: #999; font-size: 10px;">Powered by AngelPDF</p>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document_${Date.now()}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download tables as Excel
  const downloadTablesAsExcel = async () => {
    if (!result?.tables || result.tables.length === 0) return;
    
    try {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
      const workbook = XLSX.utils.book_new();
      
      result.tables.forEach((table, tableIndex) => {
        if (table.data && Array.isArray(table.data) && table.data.length > 0) {
          const worksheet = XLSX.utils.aoa_to_sheet(table.data);
          
          // Auto-size columns
          const colWidths = [];
          table.data.forEach(row => {
            if (Array.isArray(row)) {
              row.forEach((cell, colIndex) => {
                const cellLength = String(cell || '').length;
                colWidths[colIndex] = Math.max(colWidths[colIndex] || 10, cellLength + 2);
              });
            }
          });
          worksheet['!cols'] = colWidths.map(w => ({ wch: Math.min(w, 50) }));
          
          const sheetName = (table.title || `Table ${tableIndex + 1}`).substring(0, 31);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
      });
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tables_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Excel export error:', error);
      // Fallback to CSV
      let csvContent = '';
      result.tables.forEach((table, idx) => {
        if (idx > 0) csvContent += '\n\n';
        csvContent += `${table.title || `Table ${idx + 1}`}\n`;
        if (table.data) {
          table.data.forEach(row => {
            if (Array.isArray(row)) {
              csvContent += row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',') + '\n';
            }
          });
        }
      });
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tables_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ==================== RENDER FUNCTIONS ====================

  // Render: Mode Selection (Upload/Camera)
  const renderModeSelection = () => (
    <div className="scanner-container">
      <div className="scanner-header">
        <h1 className="scanner-title">AI Document Scanner</h1>
        <p className="scanner-subtitle">Scan multiple pages, create PDF & extract text</p>
      </div>

      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''}`}
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
        
        <div className="upload-icon">
          <Upload className="w-8 h-8" />
        </div>
        <p className="upload-title">Drag & Drop images here</p>
        <p className="upload-hint">You can select multiple images at once</p>
        
        <div className="upload-actions">
          <button className="btn-primary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
            <Upload className="w-5 h-5" />
            <span>Browse Files</span>
          </button>
          
          <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); /* Paste logic */ }}>
            <Clipboard className="w-5 h-5" />
            <span>Paste Image</span>
          </button>
        </div>
        
        <p className="supported-formats">Supports: JPG, PNG, WEBP (Max 10MB each)</p>
      </div>

      {/* Mobile Camera Button */}
      {isMobile && (
        <button className="camera-btn" onClick={startCamera}>
          <Camera className="w-6 h-6" />
          <span>Open Camera</span>
        </button>
      )}
    </div>
  );

  // Render: Choose Extraction Type
  const renderChooseExtraction = () => (
    <div className="scanner-container">
      <div className="scanner-header">
        <h1 className="scanner-title">What do you want to extract?</h1>
        <p className="scanner-subtitle">{capturedImages.length} image(s) ready to process</p>
      </div>

      {/* Image Preview */}
      <div className="preview-strip">
        {capturedImages.map((img, index) => (
          <div key={index} className="preview-thumb">
            <img src={getImageUrl(img)} alt={`Page ${index + 1}`} />
            <span className="thumb-number">{index + 1}</span>
            <button 
              className="thumb-remove"
              onClick={() => setCapturedImages(prev => prev.filter((_, i) => i !== index))}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button 
          className="add-more-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Extraction Options */}
      <div className="extraction-options">
        <button className="extraction-card" onClick={extractText}>
          <div className="extraction-icon text-icon">
            <FileText className="w-8 h-8" />
          </div>
          <div className="extraction-info">
            <h3>Extract Text</h3>
            <p>Fast text extraction using AI OCR</p>
            <span className="extraction-badge fast">⚡ ~1 second</span>
          </div>
          <ArrowRight className="arrow-icon" />
        </button>

        <button className="extraction-card" onClick={extractTables}>
          <div className="extraction-icon table-icon">
            <Table className="w-8 h-8" />
          </div>
          <div className="extraction-info">
            <h3>Extract Tables</h3>
            <p>AI-powered table detection & Excel export</p>
            <span className="extraction-badge ai">🤖 AI Processing</span>
          </div>
          <ArrowRight className="arrow-icon" />
        </button>
      </div>

      <button className="btn-back" onClick={startNewScan}>
        <ChevronLeft className="w-4 h-4" />
        <span>Start Over</span>
      </button>
    </div>
  );

  // Render: Processing with typing animation
  const renderProcessing = () => (
    <div className="processing-container">
      <div className="processing-card">
        <div className="processing-animation">
          <div className="spinner"></div>
        </div>
        
        <h2 className="processing-title">
          {extractionType === 'tables' ? 'Extracting Tables...' : 'Extracting Text...'}
        </h2>
        
        <p className="typing-text">
          {typingText}<span className="cursor">|</span>
        </p>
        
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="progress-text">{progress}%</p>
      </div>
    </div>
  );

  // Render: Results
  const renderResults = () => (
    <div className="results-container">
      {/* Header */}
      <div className="results-header">
        <h2>
          <CheckCircle className="w-6 h-6 text-green-500" />
          <span>Extraction Complete</span>
        </h2>
        <button className="btn-primary" onClick={startNewScan}>
          <Camera className="w-5 h-5" />
          <span>New Scan</span>
        </button>
      </div>

      {/* TEXT Results */}
      {extractionType === 'text' && result?.ocr?.text && (
        <div className="result-card">
          <div className="card-header">
            <h3>
              <FileText className="w-5 h-5" />
              <span>Extracted Text</span>
            </h3>
            <span className="confidence-badge">{result.ocr.confidence}% accuracy</span>
          </div>
          
          <textarea
            className="text-output"
            value={result.ocr.text}
            readOnly
          />
          
          <div className="export-buttons">
            <button onClick={copyText} className="btn-export">
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </button>
            <button onClick={downloadText} className="btn-export">
              <Download className="w-4 h-4" />
              <span>TXT</span>
            </button>
            <button onClick={downloadAsWord} className="btn-export">
              <FileText className="w-4 h-4" />
              <span>Word</span>
            </button>
          </div>
        </div>
      )}

      {/* TABLE Results */}
      {extractionType === 'tables' && result?.tables?.length > 0 && (
        <div className="result-card">
          <div className="card-header">
            <h3>
              <Table className="w-5 h-5" />
              <span>Extracted Tables ({result.tables.length})</span>
            </h3>
          </div>
          
          {result.tables.map((table, idx) => (
            <div key={idx} className="table-preview">
              <h4>{table.title || `Table ${idx + 1}`}</h4>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      {table.data?.[0]?.map((header, i) => (
                        <th key={i}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.data?.slice(1).map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          
          <button onClick={downloadTablesAsExcel} className="btn-primary full-width">
            <FileSpreadsheet className="w-5 h-5" />
            <span>Download as Excel</span>
          </button>
        </div>
      )}

      {/* TRANSLATION Section - Only for text extraction */}
      {extractionType === 'text' && result?.ocr?.text && (
        <div className="result-card">
          <div className="card-header">
            <h3>
              <Globe className="w-5 h-5" />
              <span>Translate</span>
            </h3>
          </div>
          
          <div className="translate-controls">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="language-select"
            >
              <option value="">Select language...</option>
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
              </optgroup>
              <optgroup label="European Languages">
                <option value="en">English</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
                <option value="de">German (Deutsch)</option>
                <option value="it">Italian (Italiano)</option>
                <option value="pt">Portuguese (Português)</option>
                <option value="ru">Russian (Русский)</option>
              </optgroup>
              <optgroup label="Asian Languages">
                <option value="zh">Chinese (中文)</option>
                <option value="ja">Japanese (日本語)</option>
                <option value="ko">Korean (한국어)</option>
                <option value="th">Thai (ไทย)</option>
                <option value="vi">Vietnamese (Tiếng Việt)</option>
              </optgroup>
              <optgroup label="Middle Eastern">
                <option value="ar">Arabic (العربية)</option>
                <option value="fa">Persian (فارسی)</option>
                <option value="he">Hebrew (עברית)</option>
                <option value="tr">Turkish (Türkçe)</option>
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
            <div className="translation-result">
              <p className="translation-label">
                <CheckCircle className="w-4 h-4" />
                Translated to {result.translation.targetLanguage}
              </p>
              <div className="translation-text">
                {result.translation.translatedText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI EXPLAIN Section - Only enabled after translation */}
      {extractionType === 'text' && result?.ocr?.text && (
        <div className="result-card">
          <div className="card-header">
            <h3>
              <MessageSquare className="w-5 h-5" />
              <span>Ask AngelPDF to Explain</span>
            </h3>
          </div>
          
          <p className="explain-hint">
            Get a detailed explanation with key points
            {!result?.translation?.translatedText && selectedLanguage && 
              ' (Translate first to get explanation in your language)'}
          </p>
          
          <button
            onClick={generateExplanation}
            disabled={summarizing || (!result?.translation?.translatedText && selectedLanguage)}
            className="btn-secondary full-width"
          >
            {summarizing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Generating explanation...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Explain Content</span>
              </>
            )}
          </button>
          
          {summary && (
            <div className="explanation-result">
              <div className="explanation-text">
                {summary}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-card">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );

  // Render: Camera
  const renderCamera = () => (
    <div className="camera-container">
      <video ref={videoRef} autoPlay playsInline className="camera-video" />
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="camera-controls">
        <button className="camera-close" onClick={stopCamera}>
          <X className="w-6 h-6" />
        </button>
        
        <button className="capture-btn" onClick={capturePhoto}>
          <div className="capture-inner"></div>
        </button>
        
        <div className="captured-count">
          {capturedImages.length > 0 && (
            <span>{capturedImages.length} captured</span>
          )}
        </div>
      </div>
      
      {capturedImages.length > 0 && (
        <button 
          className="done-btn"
          onClick={() => { stopCamera(); setMode('choose-extraction'); }}
        >
          <Check className="w-5 h-5" />
          <span>Done ({capturedImages.length})</span>
        </button>
      )}
    </div>
  );

  // ==================== MAIN RENDER ====================
  
  return (
    <div className="scanner-page dark-mode">
      {mode === 'select' && renderModeSelection()}
      {mode === 'choose-extraction' && renderChooseExtraction()}
      {mode === 'camera' && renderCamera()}
      {mode === 'processing' && renderProcessing()}
      {mode === 'result' && renderResults()}
    </div>
  );
};

export default Scanner;
