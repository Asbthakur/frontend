import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

const Scanner = () => {
  const { user, isAuthenticated } = useAuth();
  
  // State management
  const [mode, setMode] = useState('select');
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
  
  // Image Editor State
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [cropMode, setCropMode] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragHandle, setDragHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Text & Highlight State
  const [editorTool, setEditorTool] = useState(null);
  const [textAnnotations, setTextAnnotations] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [activeTextId, setActiveTextId] = useState(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const [newTextPosition, setNewTextPosition] = useState(null);
  const [newTextValue, setNewTextValue] = useState('');
  const [textColor, setTextColor] = useState('#FF0000');
  const [highlightColor, setHighlightColor] = useState('rgba(255, 255, 0, 0.4)');
  const [isDrawingHighlight, setIsDrawingHighlight] = useState(false);
  const [highlightStart, setHighlightStart] = useState(null);
  const [draggingTextId, setDraggingTextId] = useState(null);
  const [textDragStart, setTextDragStart] = useState(null);
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const editorCanvasRef = useRef(null);
  const editorContainerRef = useRef(null);
  
  const isNative = Capacitor.isNativePlatform();
  const canScan = isAuthenticated ? (user?.canScan?.() ?? true) : true;

  // Focus state for camera
  const [focusPoint, setFocusPoint] = useState(null);
  const [isFocusing, setIsFocusing] = useState(false);

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
      if (mode !== 'select' && mode !== 'multipreview') return;
      
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;
      
      const items = clipboardData.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            if (file.size > 10 * 1024 * 1024) {
              setError('Image size should be less than 10MB');
              return;
            }
            setError('');
            const blob = file;
            setCapturedImages(prev => [...prev, blob]);
            setCurrentPreviewIndex(capturedImages.length);
            setMode('multipreview');
          }
          break;
        }
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [mode, capturedImages.length]);

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
      handleMultipleFiles(Array.from(files));
    }
  };

  const handleMultipleFiles = (files) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setError('Please select image files');
      return;
    }
    
    const oversizedFiles = imageFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('Some images are larger than 10MB');
      return;
    }
    
    setError('');
    setCapturedImages(prev => [...prev, ...imageFiles]);
    setCurrentPreviewIndex(capturedImages.length);
    setMode('multipreview');
  };

  // Camera functions
  const startCamera = async () => {
    try {
      setError('');
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      setMode('camera');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let newStream;
      
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: { exact: 'environment' },
            width: { ideal: 1920 }, 
            height: { ideal: 1080 },
            focusMode: 'continuous',
            autoFocus: true
          },
          audio: false
        });
      } catch (err) {
        console.log('Back camera not available, trying any camera...');
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: 'environment',
              width: { ideal: 1920 }, 
              height: { ideal: 1080 }
            },
            audio: false
          });
        } catch (err2) {
          console.log('Environment mode failed, trying default camera...');
          newStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1920 }, 
              height: { ideal: 1080 }
            },
            audio: false
          });
        }
      }
      
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.log('Video play error:', e));
        };
      }
      
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please check permissions and try again.');
      setMode('select');
    }
  };

  const handleTapToFocus = async (e) => {
    if (!stream || !videoRef.current) return;
    
    const rect = videoRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    
    setFocusPoint({ x, y });
    setIsFocusing(true);
    
    try {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      
      if (capabilities?.focusMode?.includes('manual') || capabilities?.focusMode?.includes('single-shot')) {
        track.applyConstraints({
          advanced: [{
            focusMode: 'manual',
            pointsOfInterest: [{ x, y }]
          }]
        }).catch(err => console.log('Focus constraint error:', err));
      } else if (capabilities?.focusMode?.includes('continuous')) {
        track.applyConstraints({
          advanced: [{ focusMode: 'continuous' }]
        }).catch(err => console.log('Focus constraint error:', err));
      }
    } catch (err) {
      console.log('Focus not supported or failed:', err.message);
    }
    
    setTimeout(() => {
      setIsFocusing(false);
      setTimeout(() => setFocusPoint(null), 300);
    }, 800);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      setCapturedImages(prev => [...prev, blob]);
      setCurrentPreviewIndex(capturedImages.length);
    }, 'image/jpeg', 0.95);
  };

  const finishCapturing = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (capturedImages.length > 0) {
      setMode('multipreview');
    } else {
      setMode('select');
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleMultipleFiles(files);
    }
  };

  const handlePasteButton = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            
            if (blob.size > 10 * 1024 * 1024) {
              setError('Image size should be less than 10MB');
              return;
            }
            
            setError('');
            setCapturedImages(prev => [...prev, blob]);
            setCurrentPreviewIndex(capturedImages.length);
            setMode('multipreview');
            return;
          }
        }
      }
      
      setError('No image found in clipboard. Copy an image first!');
    } catch (err) {
      console.error('Paste error:', err);
      setError('Could not access clipboard. Try pressing Ctrl+V / Cmd+V instead.');
    }
  };

  const getImageUrl = (blob) => {
    if (blob) return URL.createObjectURL(blob);
    return null;
  };

  const deleteImage = (index) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
    if (currentPreviewIndex >= capturedImages.length - 1) {
      setCurrentPreviewIndex(Math.max(0, capturedImages.length - 2));
    }
    if (capturedImages.length === 1) {
      setMode('select');
    }
  };

  const addMoreImages = () => {
    if (isMobile) {
      startCamera();
    } else {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
    }
  };

  // Helper function to compress image
  const compressImage = (blob, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = 1500;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (compressedBlob) => {
            resolve(compressedBlob || blob);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(blob);
      img.src = URL.createObjectURL(blob);
    });
  };

  // Create PDF with enhanced images
  const createPDF = async () => {
    if (capturedImages.length === 0) {
      setError('No images to create PDF');
      return;
    }
    
    setProcessing(true);
    setProcessingStatus('Preparing images...');
    setProgress(0);
    setError('');
    
    try {
      const compressedImages = [];
      for (let i = 0; i < capturedImages.length; i++) {
        setProcessingStatus(\`Compressing image \${i + 1}/\${capturedImages.length}...\`);
        setProgress(Math.round((i / capturedImages.length) * 30));
        
        const img = capturedImages[i];
        
        if (img.size > 2 * 1024 * 1024) {
          const compressed = await compressImage(img, 0.7);
          compressedImages.push(compressed);
        } else {
          compressedImages.push(img);
        }
      }
      
      setProcessingStatus('Creating PDF...');
      setProgress(40);
      
      const response = await ocrAPI.createPDF(compressedImages, (percent) => {
        const mappedProgress = 40 + Math.round(percent * 0.6);
        setProgress(mappedProgress);
      });
      
      if (response.success && response.pdf) {
        setProcessingStatus('Downloading PDF...');
        setProgress(100);
        
        const link = document.createElement('a');
        link.href = \`data:application/pdf;base64,\${response.pdf}\`;
        link.download = \`scan_\${Date.now()}.pdf\`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setProcessingStatus('PDF created successfully!');
        setTimeout(() => {
          setProcessing(false);
          setProcessingStatus('');
        }, 2000);
      } else {
        setError(response.message || response.error || 'Failed to create PDF');
        setProcessing(false);
      }
    } catch (err) {
      console.error('PDF creation error:', err);
      const errorMsg = err.response?.data?.message || 
                       err.response?.data?.error || 
                       err.message || 
                       'Network error - please try again';
      setError(errorMsg);
      setProcessing(false);
      setProcessingStatus('');
    }
  };

  // ==================== IMAGE EDITOR FUNCTIONS ====================
  
  const openEditor = (index) => {
    const blob = capturedImages[index];
    const url = URL.createObjectURL(blob);
    setEditingIndex(index);
    setEditingImage(url);
    setRotation(0);
    setCropMode(false);
    setEditorTool(null);
    setCropArea({ x: 10, y: 10, width: 80, height: 80 });
    setTextAnnotations([]);
    setHighlights([]);
    setActiveTextId(null);
    setIsAddingText(false);
    setNewTextPosition(null);
    setNewTextValue('');
    setMode('editor');
  };

  const closeEditor = () => {
    if (editingImage) {
      URL.revokeObjectURL(editingImage);
    }
    setEditingImage(null);
    setEditingIndex(null);
    setRotation(0);
    setCropMode(false);
    setEditorTool(null);
    setTextAnnotations([]);
    setHighlights([]);
    setActiveTextId(null);
    setIsAddingText(false);
    setMode('multipreview');
  };

  const rotateImage = (degrees) => {
    setRotation((prev) => (prev + degrees + 360) % 360);
  };

  const toggleCropMode = () => {
    setEditorTool(editorTool === 'crop' ? null : 'crop');
    setActiveTextId(null);
    setIsAddingText(false);
  };

  const toggleTextMode = () => {
    setEditorTool(editorTool === 'text' ? null : 'text');
    setActiveTextId(null);
    setIsAddingText(false);
  };

  const toggleHighlightMode = () => {
    setEditorTool(editorTool === 'highlight' ? null : 'highlight');
    setActiveTextId(null);
    setIsAddingText(false);
  };

  const handleEditorClick = (e) => {
    if (!editorContainerRef.current) return;
    
    const rect = editorContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (editorTool === 'text' && !isAddingText) {
      setNewTextPosition({ x, y });
      setIsAddingText(true);
      setNewTextValue('');
    }
  };

  const addTextAnnotation = () => {
    if (!newTextValue.trim() || !newTextPosition) return;
    
    const newText = {
      id: Date.now(),
      x: newTextPosition.x,
      y: newTextPosition.y,
      text: newTextValue,
      color: textColor,
      fontSize: 16
    };
    
    setTextAnnotations(prev => [...prev, newText]);
    setNewTextPosition(null);
    setNewTextValue('');
    setIsAddingText(false);
  };

  const handleHighlightStart = (e) => {
    if (editorTool !== 'highlight' || !editorContainerRef.current) return;
    
    const rect = editorContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setIsDrawingHighlight(true);
    setHighlightStart({ x, y });
    
    setHighlights(prev => [...prev, {
      id: 'preview',
      x,
      y,
      width: 0,
      height: 0,
      color: highlightColor
    }]);
  };

  const handleHighlightMove = (e) => {
    if (!isDrawingHighlight || !highlightStart || !editorContainerRef.current) return;
    
    const rect = editorContainerRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;
    
    const newHighlight = {
      id: 'preview',
      x: Math.min(highlightStart.x, currentX),
      y: Math.min(highlightStart.y, currentY),
      width: Math.abs(currentX - highlightStart.x),
      height: Math.abs(currentY - highlightStart.y),
      color: highlightColor
    };
    
    setHighlights(prev => prev.map(h => h.id === 'preview' ? newHighlight : h));
  };

  const handleHighlightEnd = () => {
    if (!isDrawingHighlight) return;
    
    setHighlights(prev => prev.map(h => 
      h.id === 'preview' ? { ...h, id: Date.now() } : h
    ).filter(h => h.width > 2 && h.height > 2));
    
    setIsDrawingHighlight(false);
    setHighlightStart(null);
  };

  const saveEdits = async () => {
    if (!editingImage || editingIndex === null) return;
    
    setProcessing(true);
    setProcessingStatus('Applying edits...');
    
    try {
      const img = new Image();
      img.src = editingImage;
      await new Promise((resolve) => { img.onload = resolve; });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (rotation === 90 || rotation === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      
      if (rotation === 90 || rotation === 270) {
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
      } else {
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
      }
      ctx.restore();
      
      highlights.filter(h => h.id !== 'preview').forEach((highlight) => {
        ctx.fillStyle = highlight.color;
        ctx.fillRect(
          (highlight.x / 100) * canvas.width,
          (highlight.y / 100) * canvas.height,
          (highlight.width / 100) * canvas.width,
          (highlight.height / 100) * canvas.height
        );
      });
      
      textAnnotations.forEach((text) => {
        ctx.font = \`bold \${text.fontSize * 2}px Arial\`;
        ctx.fillStyle = text.color;
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        ctx.fillText(
          text.text,
          (text.x / 100) * canvas.width,
          (text.y / 100) * canvas.height
        );
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      });
      
      let finalCanvas = canvas;
      if (editorTool === 'crop') {
        const cropX = (cropArea.x / 100) * canvas.width;
        const cropY = (cropArea.y / 100) * canvas.height;
        const cropW = (cropArea.width / 100) * canvas.width;
        const cropH = (cropArea.height / 100) * canvas.height;
        
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropW;
        croppedCanvas.height = cropH;
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        finalCanvas = croppedCanvas;
      }
      
      const blob = await new Promise((resolve) => {
        finalCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
      });
      
      setCapturedImages((prev) => {
        const newImages = [...prev];
        newImages[editingIndex] = blob;
        return newImages;
      });
      
      closeEditor();
      
    } catch (err) {
      console.error('Error saving edits:', err);
      setError('Failed to save edits');
    } finally {
      setProcessing(false);
      setProcessingStatus('');
    }
  };

  // ==================== OCR FUNCTIONS ====================

  const extractTextFromAll = async (detectTables = false) => {
    if (capturedImages.length === 0) return;
    
    setProcessing(true);
    setProcessingStatus(detectTables ? 'Extracting text & detecting tables...' : 'Extracting text from all pages...');
    setProgress(0);
    setError('');
    setMode('processing');
    
    try {
      let response;
      
      if (detectTables && capturedImages.length === 1) {
        response = await ocrAPI.extractWithTables(capturedImages[0], (percent) => {
          setProgress(percent);
        });
        
        if (response.success) {
          setResult({
            ocr: {
              text: response.text,
              confidence: response.confidence || 98,
            },
            tables: response.tables || [],
            tableCount: response.tableCount || 0
          });
          setMode('result');
        } else {
          throw new Error(response.error || 'Processing failed');
        }
      } else {
        response = await ocrAPI.extractMultiple(capturedImages, (percent) => {
          setProgress(percent);
        });
        
        if (response.success) {
          setResult({
            ocr: {
              text: response.text,
              confidence: response.confidence || 98,
              pages: response.pages
            },
            tables: response.tables || [],
            tableCount: response.tableCount || 0
          });
          setMode('result');
        } else {
          throw new Error(response.error || 'Processing failed');
        }
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError(err.message || err.response?.data?.message || 'Failed to extract text');
      setMode('multipreview');
    } finally {
      setProcessing(false);
      setProgress(0);
      setProcessingStatus('');
    }
  };

  const processOCR = async () => {
    if (capturedImages.length === 0 && !uploadedFile) return;
    
    const file = uploadedFile || capturedImages[0];
    
    setProcessing(true);
    setProgress(0);
    setError('');
    setSummary('');
    setMode('processing');
    
    try {
      const response = await ocrAPI.extractText(file, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percentCompleted);
      });
      
      if (response.success) {
        setResult(response.scan);
        setMode('result');
      } else {
        setError(response.message || 'OCR processing failed');
        setMode('multipreview');
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError(err.response?.data?.message || 'Failed to process image');
      setMode('multipreview');
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  // ==================== EXPORT FUNCTIONS ====================

  const copyText = async () => {
    if (!result?.ocr?.text) return;
    try {
      await navigator.clipboard.writeText(result.ocr.text);
      alert('Text copied to clipboard!');
    } catch (err) {
      alert('Failed to copy text');
    }
  };

  const downloadText = () => {
    if (!result?.ocr?.text) return;
    const blob = new Blob([result.ocr.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`scan_\${Date.now()}.txt\`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsWord = () => {
    if (!result?.ocr?.text) return;
    
    const text = result.ocr.text;
    const translatedText = result?.translation?.translatedText || '';
    const summaryText = summary || '';
    
    const htmlContent = \`
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Extracted Text</title></head>
      <body style="font-family: Arial, sans-serif;">
        <h1 style="color: #6366f1;">AngelPDF - Extracted Text</h1>
        <p style="color: #666; font-size: 12px;">Generated on \${new Date().toLocaleString()}</p>
        <hr/>
        
        <h2>Extracted Text</h2>
        <div style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 8px;">
\${text}
        </div>
        
        \${summaryText ? \`
        <h2 style="margin-top: 30px;">AI Summary</h2>
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px;">
\${summaryText}
        </div>
        \` : ''}
        
        \${translatedText ? \`
        <h2 style="margin-top: 30px;">Translation</h2>
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px;">
\${translatedText}
        </div>
        \` : ''}
      </body>
      </html>
    \`;
    
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`scan_\${Date.now()}.doc\`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsExcel = () => {
    if (!result?.ocr?.text) return;
    
    const lines = result.ocr.text.split('\n').filter(line => line.trim());
    let csvContent = '';
    
    lines.forEach(line => {
      const csvLine = \`"\${line.replace(/"/g, '""')}"\`;
      csvContent += csvLine + '\n';
    });
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`scan_\${Date.now()}.csv\`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsPDF = async () => {
    if (!result?.ocr?.text) return;
    
    setProcessing(true);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const text = result.ocr.text;
      const fontSize = 12;
      const margin = 50;
      const lineHeight = fontSize * 1.5;
      
      let page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      let y = height - margin;
      
      const words = text.split(' ');
      let line = '';
      
      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (testWidth > width - 2 * margin) {
          if (y < margin + lineHeight) {
            page = pdfDoc.addPage();
            y = page.getSize().height - margin;
          }
          
          page.drawText(line, {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          
          y -= lineHeight;
          line = word;
        } else {
          line = testLine;
        }
        
        if (word.includes('\n')) {
          const parts = word.split('\n');
          for (let i = 0; i < parts.length; i++) {
            if (i > 0) {
              if (y < margin + lineHeight) {
                page = pdfDoc.addPage();
                y = page.getSize().height - margin;
              }
              y -= lineHeight;
            }
          }
        }
      }
      
      if (line) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage();
          y = page.getSize().height - margin;
        }
        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`scan_\${Date.now()}.pdf\`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation error:', err);
      setError('Failed to generate PDF');
    } finally {
      setProcessing(false);
    }
  };

  const downloadTablesAsExcel = () => {
    if (!result?.tables || result.tables.length === 0) return;
    
    let csvContent = '';
    
    result.tables.forEach((table, tableIndex) => {
      csvContent += \`Table \${tableIndex + 1}\n\`;
      
      if (table.data && Array.isArray(table.data)) {
        table.data.forEach(row => {
          if (Array.isArray(row)) {
            const csvRow = row.map(cell => \`"\${String(cell || '').replace(/"/g, '""')}"\`).join(',');
            csvContent += csvRow + '\n';
          }
        });
      }
      csvContent += '\n';
    });
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`tables_\${Date.now()}.csv\`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==================== AI FUNCTIONS ====================

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

  // FIXED: Translate text with correct parameter order
  const translateText = async () => {
    if (!selectedLanguage || !result?.ocr?.text) return;
    
    setTranslating(true);
    setError('');
    
    try {
      // FIXED: Correct parameter order (text, language, scanId)
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

  // Reset
  const startNewScan = () => {
    setCapturedImages([]);
    setCurrentPreviewIndex(0);
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
          Scan multiple pages, create PDF & extract text
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
      
      {/* DESKTOP VIEW */}
      {!isMobile && (
        <>
          <div
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={\`mb-6 border-2 border-dashed rounded-2xl p-10 text-center transition-all \${
              isDragging 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }\`}
          >
            <div className="flex flex-col items-center">
              <div className={\`w-20 h-20 rounded-full flex items-center justify-center mb-4 \${
                isDragging ? 'bg-primary-100' : 'bg-gray-100'
              }\`}>
                <Upload className={\`w-10 h-10 \${isDragging ? 'text-primary-600' : 'text-gray-400'}\`} />
              </div>
              <p className="font-semibold text-xl mb-2">
                {isDragging ? 'Drop your images here!' : 'Drag & Drop images here'}
              </p>
              <p className="text-gray-500 text-sm mb-6">You can select multiple images at once</p>
              
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
              <p className="text-gray-400 text-sm mt-4">Supports: JPG, PNG, WEBP (Max 10MB each)</p>
            </div>
          </div>
        </>
      )}
      
      {/* MOBILE VIEW */}
      {isMobile && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
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
                  <p className="text-gray-600 text-xs">Scan documents</p>
                </div>
              </div>
            </button>
            
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
                  <p className="text-gray-600 text-xs">Choose images</p>
                </div>
              </div>
            </button>
          </div>
        </>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
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
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="bg-black px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => {
            if (stream) {
              stream.getTracks().forEach(track => track.stop());
              setStream(null);
            }
            if (capturedImages.length > 0) {
              setMode('multipreview');
            } else {
              setMode('select');
            }
          }}
          className="text-white flex items-center gap-2"
        >
          <X className="w-6 h-6" />
          <span>Cancel</span>
        </button>
        
        {capturedImages.length > 0 && (
          <div className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium">
            {capturedImages.length} page{capturedImages.length > 1 ? 's' : ''}
          </div>
        )}
        
        <button
          onClick={finishCapturing}
          disabled={capturedImages.length === 0}
          className={\`px-4 py-1 rounded-full font-medium \${
            capturedImages.length > 0
              ? 'bg-green-500 text-white'
              : 'text-white/50'
          }\`}
        >
          Done
        </button>
      </div>
      
      <div 
        className="relative" 
        style={{ height: '55vh' }}
        onTouchStart={handleTapToFocus}
        onClick={handleTapToFocus}
      >
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center">
              <Loader className="w-10 h-10 text-white animate-spin mx-auto mb-3" />
              <p className="text-white">Starting camera...</p>
            </div>
          </div>
        )}
        
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ display: stream ? 'block' : 'none' }}
        />
        
        {focusPoint && (
          <div 
            className={\`absolute pointer-events-none transition-all duration-300 \${
              isFocusing ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }\`}
            style={{ 
              left: focusPoint.x - 30, 
              top: focusPoint.y - 30,
            }}
          >
            <div className={\`w-[60px] h-[60px] border-2 rounded-lg \${
              isFocusing ? 'border-yellow-400 animate-pulse' : 'border-white'
            }\`}>
              <div className="absolute top-1/2 left-0 w-2 h-0.5 bg-yellow-400 -translate-y-1/2" />
              <div className="absolute top-1/2 right-0 w-2 h-0.5 bg-yellow-400 -translate-y-1/2" />
              <div className="absolute left-1/2 top-0 w-0.5 h-2 bg-yellow-400 -translate-x-1/2" />
              <div className="absolute left-1/2 bottom-0 w-0.5 h-2 bg-yellow-400 -translate-x-1/2" />
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 bg-black flex flex-col items-center justify-center px-4">
        <button
          onClick={capturePhoto}
          disabled={!stream}
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 active:scale-95 transition-transform"
        >
          <div className="w-16 h-16 bg-white border-4 border-gray-800 rounded-full" />
        </button>
        
        {capturedImages.length > 0 && (
          <p className="text-white/70 text-sm">
            {capturedImages.length} page{capturedImages.length > 1 ? 's' : ''} captured • Tap "Done" when finished
          </p>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const renderMultiPreview = () => (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-2xl">{capturedImages.length} Page{capturedImages.length > 1 ? 's' : ''} Ready</h2>
          <p className="text-gray-600">Tap image to edit • Crop & rotate</p>
        </div>
        <button
          onClick={startNewScan}
          className="text-red-500 hover:text-red-600 font-medium"
        >
          Clear All
        </button>
      </div>
      
      <div className="relative bg-gray-100 rounded-2xl p-4 mb-4">
        {capturedImages.length > 0 && (
          <>
            <div 
              onClick={() => openEditor(currentPreviewIndex)}
              className="cursor-pointer relative group"
            >
              <img
                src={getImageUrl(capturedImages[currentPreviewIndex])}
                alt={\`Page \${currentPreviewIndex + 1}\`}
                className="w-full max-h-[400px] object-contain rounded-xl mx-auto"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-xl flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-all bg-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                  <Crop className="w-5 h-5 text-primary-600" />
                  <span className="font-medium text-primary-600">Tap to Edit</span>
                </div>
              </div>
            </div>
            
            {capturedImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentPreviewIndex(prev => Math.max(0, prev - 1)); }}
                  disabled={currentPreviewIndex === 0}
                  className={\`absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center \${
                    currentPreviewIndex === 0 ? 'bg-gray-300 text-gray-400' : 'bg-white shadow-lg text-gray-700 hover:bg-gray-50'
                  }\`}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentPreviewIndex(prev => Math.min(capturedImages.length - 1, prev + 1)); }}
                  disabled={currentPreviewIndex === capturedImages.length - 1}
                  className={\`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center \${
                    currentPreviewIndex === capturedImages.length - 1 ? 'bg-gray-300 text-gray-400' : 'bg-white shadow-lg text-gray-700 hover:bg-gray-50'
                  }\`}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
            
            <button
              onClick={(e) => { e.stopPropagation(); deleteImage(currentPreviewIndex); }}
              className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {capturedImages.map((img, index) => (
          <button
            key={index}
            onClick={() => setCurrentPreviewIndex(index)}
            className={\`flex-shrink-0 relative rounded-lg overflow-hidden border-2 transition-all \${
              index === currentPreviewIndex ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'
            }\`}
          >
            <img
              src={getImageUrl(img)}
              alt={\`Page \${index + 1}\`}
              className="w-16 h-20 object-cover"
            />
            <span className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-tl">
              {index + 1}
            </span>
          </button>
        ))}
        
        <button
          onClick={addMoreImages}
          className="flex-shrink-0 w-16 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
        >
          <Plus className="w-6 h-6" />
          <span className="text-xs">Add</span>
        </button>
      </div>
      
      <div className="space-y-4">
        <button
          onClick={createPDF}
          disabled={processing}
          className="w-full btn-primary py-4 flex items-center justify-center gap-2"
        >
          {processing && processingStatus?.includes('PDF') ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Creating PDF...</span>
            </>
          ) : (
            <>
              <FileDown className="w-5 h-5" />
              <span>Create PDF</span>
            </>
          )}
        </button>
        
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Extract Content</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => extractTextFromAll(false)}
              disabled={processing}
              className="bg-white border-2 border-gray-200 hover:border-primary-400 rounded-xl p-4 flex flex-col items-center gap-2 transition-all"
            >
              <FileText className="w-8 h-8 text-primary-600" />
              <span className="font-medium text-sm">Text Only</span>
              <span className="text-xs text-gray-500">Faster</span>
            </button>
            
            <button
              onClick={() => extractTextFromAll(true)}
              disabled={processing}
              className="bg-white border-2 border-gray-200 hover:border-blue-400 rounded-xl p-4 flex flex-col items-center gap-2 transition-all"
            >
              <Table className="w-8 h-8 text-blue-600" />
              <span className="font-medium text-sm">Text + Tables</span>
              <span className="text-xs text-gray-500">Detects tables</span>
            </button>
          </div>
        </div>
      </div>
      
      {processing && processingStatus && (
        <div className="mt-4 p-4 bg-primary-50 rounded-xl">
          <div className="flex items-center gap-3">
            <Loader className="w-5 h-5 text-primary-600 animate-spin" />
            <span className="text-primary-700">{processingStatus}</span>
          </div>
          {progress > 0 && (
            <div className="mt-2 w-full bg-primary-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: \`\${progress}%\` }}
              />
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );

  const renderEditor = () => (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between">
        <button
          onClick={closeEditor}
          className="text-white flex items-center gap-2"
        >
          <X className="w-6 h-6" />
          <span>Cancel</span>
        </button>
        
        <h3 className="text-white font-medium">Edit Page {editingIndex + 1}</h3>
        
        <button
          onClick={saveEdits}
          disabled={processing}
          className="bg-green-500 text-white px-4 py-1.5 rounded-full font-medium flex items-center gap-1"
        >
          {processing ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>Save</span>
        </button>
      </div>
      
      <div 
        ref={editorContainerRef}
        className="flex-1 relative overflow-hidden bg-gray-800 flex items-center justify-center"
        onClick={handleEditorClick}
        onMouseDown={handleHighlightStart}
        onMouseMove={handleHighlightMove}
        onMouseUp={handleHighlightEnd}
        onMouseLeave={handleHighlightEnd}
      >
        {editingImage && (
          <div className="relative max-w-full max-h-full">
            <img
              src={editingImage}
              alt="Editing"
              className="max-w-full max-h-[60vh] object-contain"
              style={{ transform: \`rotate(\${rotation}deg)\` }}
            />
            
            {editorTool === 'crop' && (
              <div
                className="absolute border-2 border-white bg-black/30"
                style={{
                  left: \`\${cropArea.x}%\`,
                  top: \`\${cropArea.y}%\`,
                  width: \`\${cropArea.width}%\`,
                  height: \`\${cropArea.height}%\`,
                }}
              >
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-full cursor-nw-resize" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full cursor-ne-resize" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-full cursor-sw-resize" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-full cursor-se-resize" />
              </div>
            )}
            
            {highlights.map((highlight) => (
              <div
                key={highlight.id}
                className="absolute pointer-events-none"
                style={{
                  left: \`\${highlight.x}%\`,
                  top: \`\${highlight.y}%\`,
                  width: \`\${highlight.width}%\`,
                  height: \`\${highlight.height}%\`,
                  backgroundColor: highlight.color,
                }}
              />
            ))}
            
            {textAnnotations.map((text) => (
              <div
                key={text.id}
                className={\`absolute cursor-move select-none \${
                  activeTextId === text.id ? 'ring-2 ring-white' : ''
                }\`}
                style={{
                  left: \`\${text.x}%\`,
                  top: \`\${text.y}%\`,
                  color: text.color,
                  fontSize: \`\${text.fontSize}px\`,
                  fontWeight: 'bold',
                  textShadow: '1px 1px 2px white',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTextId(text.id);
                }}
              >
                {text.text}
              </div>
            ))}
            
            {isAddingText && newTextPosition && (
              <div
                className="absolute"
                style={{
                  left: \`\${newTextPosition.x}%\`,
                  top: \`\${newTextPosition.y}%\`,
                }}
              >
                <input
                  type="text"
                  value={newTextValue}
                  onChange={(e) => setNewTextValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTextAnnotation();
                    if (e.key === 'Escape') {
                      setIsAddingText(false);
                      setNewTextPosition(null);
                    }
                  }}
                  placeholder="Type text..."
                  className="px-2 py-1 text-sm border-2 border-primary-500 rounded bg-white"
                  autoFocus
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="bg-gray-900 p-4">
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={() => rotateImage(-90)}
            className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center text-white hover:bg-gray-600"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
          <button
            onClick={() => rotateImage(90)}
            className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center text-white hover:bg-gray-600"
          >
            <RotateCw className="w-6 h-6" />
          </button>
          <button
            onClick={toggleCropMode}
            className={\`w-12 h-12 rounded-xl flex items-center justify-center \${
              editorTool === 'crop' ? 'bg-primary-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
            }\`}
          >
            <Crop className="w-6 h-6" />
          </button>
          <button
            onClick={toggleTextMode}
            className={\`w-12 h-12 rounded-xl flex items-center justify-center \${
              editorTool === 'text' ? 'bg-primary-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
            }\`}
          >
            <Type className="w-6 h-6" />
          </button>
          <button
            onClick={toggleHighlightMode}
            className={\`w-12 h-12 rounded-xl flex items-center justify-center \${
              editorTool === 'highlight' ? 'bg-yellow-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
            }\`}
          >
            <Highlighter className="w-6 h-6" />
          </button>
        </div>
        
        {editorTool === 'text' && (
          <div className="flex justify-center gap-2">
            {['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#000000'].map((color) => (
              <button
                key={color}
                onClick={() => setTextColor(color)}
                className={\`w-8 h-8 rounded-full border-2 \${
                  textColor === color ? 'border-white scale-110' : 'border-gray-600'
                }\`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
        
        {editorTool === 'highlight' && (
          <div className="flex justify-center gap-2">
            {['rgba(255, 255, 0, 0.4)', 'rgba(0, 255, 0, 0.4)', 'rgba(255, 0, 255, 0.4)', 'rgba(0, 255, 255, 0.4)'].map((color) => (
              <button
                key={color}
                onClick={() => setHighlightColor(color)}
                className={\`w-8 h-8 rounded-full border-2 \${
                  highlightColor === color ? 'border-white scale-110' : 'border-gray-600'
                }\`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
        
        {!editorTool && (
          <p className="text-center text-gray-500 text-xs mt-3">
            Select a tool above to start editing
          </p>
        )}
        
        <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
          {rotation !== 0 && <span>Rotated {rotation}°</span>}
          {textAnnotations.length > 0 && <span>{textAnnotations.length} text(s)</span>}
          {highlights.filter(h => h.id !== 'preview').length > 0 && <span>{highlights.filter(h => h.id !== 'preview').length} highlight(s)</span>}
        </div>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="max-w-2xl mx-auto">
      <div className="card text-center p-8">
        <Loader className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-6" />
        <h2 className="font-bold text-2xl mb-2">Processing {capturedImages.length} Page{capturedImages.length > 1 ? 's' : ''}...</h2>
        <p className="text-gray-600 mb-6">Our AI is extracting text from your documents</p>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300"
            style={{ width: \`\${progress}%\` }}
          />
        </div>
        <p className="text-sm text-gray-600">{progress}%</p>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="font-bold text-2xl">Extraction Results</h2>
        <button onClick={startNewScan} className="btn-primary">
          <Camera className="w-5 h-5" />
          <span>New Scan</span>
        </button>
      </div>
      
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Extracted Text</h3>
          <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded-full">
            {Math.round(result?.ocr?.confidence || 98)}% accuracy
          </span>
        </div>
        
        <textarea
          value={result?.ocr?.text || ''}
          readOnly
          className="w-full min-h-[300px] p-3 border border-gray-200 rounded-xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">Export as:</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
            
            <button onClick={downloadAsPDF} disabled={processing} className="btn-outline text-sm py-2">
              {processing ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>
      
      {result?.tables && result.tables.length > 0 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Table className="w-5 h-5 text-blue-500" />
              Detected Tables ({result.tables.length})
            </h3>
            <button
              onClick={() => downloadTablesAsExcel()}
              className="btn-primary text-sm py-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Tables</span>
            </button>
          </div>
          
          <div className="space-y-4">
            {result.tables.map((table, tableIndex) => (
              <div key={tableIndex} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="font-medium text-sm text-gray-600">
                    Table {tableIndex + 1} ({table.rows || table.data?.length || 0} rows × {table.cols || table.data?.[0]?.length || 0} cols)
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {table.data?.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex === 0 ? 'bg-blue-50 font-medium' : rowIndex % 2 === 0 ? 'bg-gray-50' : ''}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 border-r border-gray-200 last:border-r-0">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {table.data?.length > 10 && (
                  <div className="px-4 py-2 bg-gray-50 text-sm text-gray-500 text-center border-t">
                    Showing 10 of {table.data.length} rows
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="card mb-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          AI Summary
        </h3>
        
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={generateSummary}
            disabled={summarizing}
            className="btn-outline text-sm"
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
      
      <div className="card">
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
            
            <optgroup label="Middle Eastern Languages">
              <option value="ar">Arabic (العربية)</option>
              <option value="fa">Persian (فارسی)</option>
              <option value="he">Hebrew (עברית)</option>
              <option value="tr">Turkish (Türkçe)</option>
            </optgroup>
            
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-24">
      {mode === 'select' && renderModeSelection()}
      {mode === 'camera' && renderCamera()}
      {mode === 'multipreview' && renderMultiPreview()}
      {mode === 'editor' && renderEditor()}
      {mode === 'processing' && renderProcessing()}
      {mode === 'result' && renderResults()}
    </div>
  );
};

export default Scanner;
