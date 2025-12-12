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
} from 'lucide-react';

const Scanner = () => {
  const { user, isAuthenticated } = useAuth();
  
  // State management
  const [mode, setMode] = useState('select'); // 'select', 'camera', 'preview', 'multipreview', 'editor', 'processing', 'result'
  const [stream, setStream] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]); // Array of captured image blobs
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
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const editorCanvasRef = useRef(null);
  const editorContainerRef = useRef(null);
  
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
            // Add to captured images array
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

  // Camera functions - ALWAYS use back camera for document scanning
  const [focusPoint, setFocusPoint] = useState(null);
  const [isFocusing, setIsFocusing] = useState(false);
  
  const startCamera = async () => {
    try {
      setError('');
      
      // Stop any existing stream first
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      
      // Set camera mode first so UI shows
      setMode('camera');
      
      // Small delay to ensure video element is mounted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try to get back camera first
      let newStream;
      
      try {
        // First try: exact environment (back camera) with autofocus
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
          // Second try: prefer environment but accept any
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
          // Third try: any available camera
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
      
      // Wait for video element and set stream
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        
        // Wait for video to be ready
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

  // Tap to focus function - works with both touch and click
  const handleTapToFocus = (e) => {
    if (!stream || !videoRef.current) return;
    
    // Prevent default to avoid double-firing
    e.preventDefault();
    
    const video = videoRef.current;
    const rect = video.getBoundingClientRect();
    
    // Get coordinates - handle both touch and mouse events
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Calculate tap position relative to video
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    
    // Calculate position for focus indicator (relative to container)
    const indicatorX = clientX - rect.left;
    const indicatorY = clientY - rect.top;
    
    // Show focus indicator
    setFocusPoint({ x: indicatorX, y: indicatorY });
    setIsFocusing(true);
    
    // Try to apply focus (if supported by device)
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
        // Trigger refocus by toggling focus mode
        track.applyConstraints({
          advanced: [{ focusMode: 'continuous' }]
        }).catch(err => console.log('Focus constraint error:', err));
      }
    } catch (err) {
      console.log('Focus not supported or failed:', err.message);
    }
    
    // Hide focus indicator after animation
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
      // Stay in camera mode for multi-capture
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
    console.log('Add more images clicked, isMobile:', isMobile);
    if (isMobile) {
      startCamera();
    } else {
      // For desktop, trigger file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset to allow same file
        fileInputRef.current.click();
      }
    }
  };

  // Create PDF with enhanced images
  const createPDF = async () => {
    if (capturedImages.length === 0) {
      setError('No images to create PDF');
      return;
    }
    
    console.log('Creating PDF with', capturedImages.length, 'images');
    
    setProcessing(true);
    setProcessingStatus('Preparing images...');
    setProgress(0);
    setError('');
    
    try {
      // Compress images before sending to reduce size
      const compressedImages = [];
      for (let i = 0; i < capturedImages.length; i++) {
        setProcessingStatus(`Compressing image ${i + 1}/${capturedImages.length}...`);
        setProgress(Math.round((i / capturedImages.length) * 30));
        
        const img = capturedImages[i];
        
        // If blob is too large, compress it
        if (img.size > 2 * 1024 * 1024) {
          // Compress using canvas
          const compressed = await compressImage(img, 0.7);
          compressedImages.push(compressed);
        } else {
          compressedImages.push(img);
        }
      }
      
      setProcessingStatus('Creating PDF...');
      setProgress(40);
      
      const response = await ocrAPI.createPDF(compressedImages, (percent) => {
        // Map 0-100 to 40-100 range
        const mappedProgress = 40 + Math.round(percent * 0.6);
        setProgress(mappedProgress);
      });
      
      console.log('PDF response received');
      
      if (response.success && response.pdf) {
        setProcessingStatus('Downloading PDF...');
        setProgress(100);
        
        // Download the PDF
        const link = document.createElement('a');
        link.href = `data:application/pdf;base64,${response.pdf}`;
        link.download = `scan_${Date.now()}.pdf`;
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

  // Helper function to compress image
  const compressImage = (blob, quality = 0.7) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // Limit max dimension to 1500px
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

  // ==================== IMAGE EDITOR FUNCTIONS ====================
  
  // Open image editor for a specific image
  const openEditor = (index) => {
    const blob = capturedImages[index];
    const url = URL.createObjectURL(blob);
    setEditingIndex(index);
    setEditingImage(url);
    setRotation(0);
    setCropMode(false);
    setCropArea({ x: 10, y: 10, width: 80, height: 80 }); // Percentage values
    setMode('editor');
  };

  // Close editor without saving
  const closeEditor = () => {
    if (editingImage) {
      URL.revokeObjectURL(editingImage);
    }
    setEditingImage(null);
    setEditingIndex(null);
    setRotation(0);
    setCropMode(false);
    setMode('multipreview');
  };

  // Rotate image
  const rotateImage = (degrees) => {
    setRotation((prev) => (prev + degrees + 360) % 360);
  };

  // Toggle crop mode
  const toggleCropMode = () => {
    setCropMode(!cropMode);
  };

  // Handle crop area drag start
  const handleCropDragStart = (e, handle = 'move') => {
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    setIsDraggingCrop(true);
    setDragHandle(handle);
    setDragStart({ x: clientX, y: clientY, ...cropArea });
  };

  // Handle crop area drag
  const handleCropDrag = useCallback((e) => {
    if (!isDraggingCrop || !editorContainerRef.current) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const container = editorContainerRef.current;
    const rect = container.getBoundingClientRect();
    
    const deltaX = ((clientX - dragStart.x) / rect.width) * 100;
    const deltaY = ((clientY - dragStart.y) / rect.height) * 100;
    
    setCropArea((prev) => {
      let newArea = { ...prev };
      
      switch (dragHandle) {
        case 'move':
          newArea.x = Math.max(0, Math.min(100 - prev.width, dragStart.x + deltaX));
          newArea.y = Math.max(0, Math.min(100 - prev.height, dragStart.y + deltaY));
          break;
        case 'nw':
          newArea.x = Math.max(0, Math.min(dragStart.x + dragStart.width - 20, dragStart.x + deltaX));
          newArea.y = Math.max(0, Math.min(dragStart.y + dragStart.height - 20, dragStart.y + deltaY));
          newArea.width = dragStart.width - (newArea.x - dragStart.x);
          newArea.height = dragStart.height - (newArea.y - dragStart.y);
          break;
        case 'ne':
          newArea.y = Math.max(0, Math.min(dragStart.y + dragStart.height - 20, dragStart.y + deltaY));
          newArea.width = Math.max(20, Math.min(100 - dragStart.x, dragStart.width + deltaX));
          newArea.height = dragStart.height - (newArea.y - dragStart.y);
          break;
        case 'sw':
          newArea.x = Math.max(0, Math.min(dragStart.x + dragStart.width - 20, dragStart.x + deltaX));
          newArea.width = dragStart.width - (newArea.x - dragStart.x);
          newArea.height = Math.max(20, Math.min(100 - dragStart.y, dragStart.height + deltaY));
          break;
        case 'se':
          newArea.width = Math.max(20, Math.min(100 - dragStart.x, dragStart.width + deltaX));
          newArea.height = Math.max(20, Math.min(100 - dragStart.y, dragStart.height + deltaY));
          break;
        default:
          break;
      }
      
      // Ensure values are within bounds
      newArea.x = Math.max(0, Math.min(100, newArea.x));
      newArea.y = Math.max(0, Math.min(100, newArea.y));
      newArea.width = Math.max(20, Math.min(100 - newArea.x, newArea.width));
      newArea.height = Math.max(20, Math.min(100 - newArea.y, newArea.height));
      
      return newArea;
    });
  }, [isDraggingCrop, dragHandle, dragStart]);

  // Handle crop area drag end
  const handleCropDragEnd = useCallback(() => {
    setIsDraggingCrop(false);
    setDragHandle(null);
  }, []);

  // Add event listeners for drag
  useEffect(() => {
    if (isDraggingCrop) {
      window.addEventListener('mousemove', handleCropDrag);
      window.addEventListener('mouseup', handleCropDragEnd);
      window.addEventListener('touchmove', handleCropDrag);
      window.addEventListener('touchend', handleCropDragEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleCropDrag);
      window.removeEventListener('mouseup', handleCropDragEnd);
      window.removeEventListener('touchmove', handleCropDrag);
      window.removeEventListener('touchend', handleCropDragEnd);
    };
  }, [isDraggingCrop, handleCropDrag, handleCropDragEnd]);

  // Apply edits and save
  const saveEdits = async () => {
    if (!editingImage || editingIndex === null) return;
    
    setProcessing(true);
    setProcessingStatus('Applying edits...');
    
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = editingImage;
      });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate dimensions based on rotation
      const isRotated90or270 = rotation === 90 || rotation === 270;
      let sourceWidth = img.width;
      let sourceHeight = img.height;
      
      if (isRotated90or270) {
        canvas.width = sourceHeight;
        canvas.height = sourceWidth;
      } else {
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
      }
      
      // Apply rotation
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      
      if (isRotated90or270) {
        ctx.drawImage(img, -sourceWidth / 2, -sourceHeight / 2);
      } else {
        ctx.drawImage(img, -sourceWidth / 2, -sourceHeight / 2);
      }
      ctx.restore();
      
      // If crop mode is active, apply crop
      let finalCanvas = canvas;
      if (cropMode) {
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
      
      // Convert to blob
      const blob = await new Promise((resolve) => {
        finalCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92);
      });
      
      // Update capturedImages array
      setCapturedImages((prev) => {
        const newImages = [...prev];
        newImages[editingIndex] = blob;
        return newImages;
      });
      
      // Close editor
      closeEditor();
      
    } catch (err) {
      console.error('Error saving edits:', err);
      setError('Failed to save edits');
    } finally {
      setProcessing(false);
      setProcessingStatus('');
    }
  };

  // ==================== END IMAGE EDITOR FUNCTIONS ====================

  // Extract text from all images
  const extractTextFromAll = async () => {
    if (capturedImages.length === 0) return;
    
    setProcessing(true);
    setProcessingStatus('Extracting text from all pages...');
    setProgress(0);
    setError('');
    setMode('processing');
    
    try {
      const response = await ocrAPI.extractMultiple(capturedImages, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percentCompleted);
      });
      
      if (response.success) {
        setResult({
          ocr: {
            text: response.text,
            confidence: response.confidence || 98,
            pages: response.pages
          }
        });
        setMode('result');
      } else {
        setError(response.message || 'OCR processing failed');
        setMode('multipreview');
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError(err.response?.data?.message || 'Failed to extract text');
      setMode('multipreview');
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  // Single image OCR (for uploaded single file)
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

  // Download as Word
  const downloadAsWord = () => {
    if (!result?.ocr?.text) return;
    
    const text = result.ocr.text;
    const translatedText = result?.translation?.translatedText || '';
    const summaryText = summary || '';
    
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
  };

  // Download as Excel
  const downloadAsExcel = () => {
    if (!result?.ocr?.text) return;
    
    const text = result.ocr.text;
    const lines = text.split('\n').filter(line => line.trim());
    
    let csvContent = '';
    
    const hasDelimiters = lines.some(line => 
      line.includes('|') || line.includes('\t') || line.includes('  ')
    );
    
    if (hasDelimiters) {
      lines.forEach(line => {
        let cells = line
          .split(/[|\t]/)
          .map(cell => cell.trim())
          .filter(cell => cell && !cell.match(/^[-=]+$/));
        
        if (cells.length > 0) {
          const csvRow = cells.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',');
          csvContent += csvRow + '\n';
        }
      });
    } else {
      lines.forEach(line => {
        csvContent += `"${line.replace(/"/g, '""')}"\n`;
      });
    }
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
      {/* Header with page counter */}
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
          className={`px-4 py-1 rounded-full font-medium ${
            capturedImages.length > 0
              ? 'bg-green-500 text-white'
              : 'text-white/50'
          }`}
        >
          Done
        </button>
      </div>
      
      {/* Camera preview - 55% of screen with tap to focus */}
      <div 
        className="relative" 
        style={{ height: '55vh' }}
        onTouchStart={handleTapToFocus}
        onClick={handleTapToFocus}
      >
        {/* Loading indicator while camera initializes */}
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
        
        {/* Focus indicator */}
        {focusPoint && (
          <div 
            className={`absolute pointer-events-none transition-all duration-300 ${
              isFocusing ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
            style={{ 
              left: focusPoint.x - 30, 
              top: focusPoint.y - 30,
            }}
          >
            <div className={`w-[60px] h-[60px] border-2 rounded-lg ${
              isFocusing ? 'border-yellow-400' : 'border-green-400'
            }`}>
              <div className="absolute top-1/2 left-0 w-2 h-0.5 bg-yellow-400 -translate-y-1/2"></div>
              <div className="absolute top-1/2 right-0 w-2 h-0.5 bg-yellow-400 -translate-y-1/2"></div>
              <div className="absolute left-1/2 top-0 w-0.5 h-2 bg-yellow-400 -translate-x-1/2"></div>
              <div className="absolute left-1/2 bottom-0 w-0.5 h-2 bg-yellow-400 -translate-x-1/2"></div>
            </div>
          </div>
        )}
        
        {/* Document guide frame */}
        {stream && (
          <>
            <div className="absolute inset-3 border-2 border-white/40 rounded-xl pointer-events-none">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-white rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-white rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-white rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-white rounded-br-lg"></div>
            </div>
            
            <div className="absolute top-4 left-0 right-0 text-center">
              <span className="bg-black/60 text-white px-3 py-1 rounded-full text-xs">
                Tap to focus • Position document within frame
              </span>
            </div>
          </>
        )}
      </div>
      
      {/* Thumbnail strip */}
      {capturedImages.length > 0 && (
        <div className="bg-gray-900 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {capturedImages.map((img, index) => (
              <div key={index} className="relative flex-shrink-0">
                <img
                  src={getImageUrl(img)}
                  alt={`Page ${index + 1}`}
                  className="w-14 h-18 object-cover rounded-lg border-2 border-white/50"
                />
                <span className="absolute bottom-0 right-0 bg-primary-600 text-white text-xs px-1.5 py-0.5 rounded-tl-lg rounded-br-lg">
                  {index + 1}
                </span>
              </div>
            ))}
            <div className="flex-shrink-0 w-14 h-18 border-2 border-dashed border-white/30 rounded-lg flex items-center justify-center">
              <Plus className="w-6 h-6 text-white/50" />
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom controls - Always visible */}
      <div className="flex-1 bg-black flex flex-col items-center justify-center px-6 py-4">
        <p className="text-white/70 text-sm mb-4">
          {capturedImages.length === 0 
            ? 'Tap screen to focus, then capture' 
            : `Tap to add page ${capturedImages.length + 1}`
          }
        </p>
        
        {/* Capture button - Always visible */}
        <button
          onClick={capturePhoto}
          disabled={!stream}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg border-4 border-white ${
            stream ? 'bg-white' : 'bg-white/50'
          }`}
        >
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
            stream ? 'bg-primary-600' : 'bg-primary-400'
          }`}>
            <Camera className="w-8 h-8 text-white" />
          </div>
        </button>
        
        {capturedImages.length > 0 && (
          <p className="text-green-400 text-sm mt-4">
            ✓ {capturedImages.length} photo{capturedImages.length > 1 ? 's' : ''} captured • Tap "Done" when finished
          </p>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const renderMultiPreview = () => (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
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
      
      {/* Main preview - Tap to edit */}
      <div className="relative bg-gray-100 rounded-2xl p-4 mb-4">
        {capturedImages.length > 0 && (
          <>
            {/* Clickable image to open editor */}
            <div 
              onClick={() => openEditor(currentPreviewIndex)}
              className="cursor-pointer relative group"
            >
              <img
                src={getImageUrl(capturedImages[currentPreviewIndex])}
                alt={`Page ${currentPreviewIndex + 1}`}
                className="w-full max-h-[400px] object-contain rounded-xl mx-auto"
              />
              {/* Edit overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all rounded-xl flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-all bg-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                  <Crop className="w-5 h-5 text-primary-600" />
                  <span className="font-medium text-primary-600">Tap to Edit</span>
                </div>
              </div>
            </div>
            
            {/* Navigation arrows */}
            {capturedImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentPreviewIndex(prev => Math.max(0, prev - 1)); }}
                  disabled={currentPreviewIndex === 0}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center ${
                    currentPreviewIndex === 0 ? 'bg-gray-200 text-gray-400' : 'bg-white shadow text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setCurrentPreviewIndex(prev => Math.min(capturedImages.length - 1, prev + 1)); }}
                  disabled={currentPreviewIndex === capturedImages.length - 1}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center ${
                    currentPreviewIndex === capturedImages.length - 1 ? 'bg-gray-200 text-gray-400' : 'bg-white shadow text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
            
            {/* Page indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
              Page {currentPreviewIndex + 1} of {capturedImages.length}
            </div>
            
            {/* Edit button */}
            <button
              onClick={(e) => { e.stopPropagation(); openEditor(currentPreviewIndex); }}
              className="absolute top-2 left-2 w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 shadow-lg"
            >
              <Crop className="w-5 h-5" />
            </button>
            
            {/* Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); deleteImage(currentPreviewIndex); }}
              className="absolute top-2 right-2 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      
      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        {capturedImages.map((img, index) => (
          <button
            key={index}
            onClick={() => setCurrentPreviewIndex(index)}
            className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
              currentPreviewIndex === index ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'
            }`}
          >
            <img
              src={getImageUrl(img)}
              alt={`Page ${index + 1}`}
              className="w-16 h-20 object-cover"
            />
            <span className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded-tl">
              {index + 1}
            </span>
          </button>
        ))}
        
        {/* Add more button */}
        <button
          onClick={addMoreImages}
          className="flex-shrink-0 w-16 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
        >
          <Plus className="w-6 h-6" />
          <span className="text-xs">Add</span>
        </button>
      </div>
      
      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={createPDF}
          disabled={processing}
          className="btn-primary py-4 flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Create Smart AI Enhanced PDF</span>
            </>
          )}
        </button>
        
        <button
          onClick={extractTextFromAll}
          disabled={processing}
          className="btn-outline py-4 flex items-center justify-center gap-2"
        >
          <FileText className="w-5 h-5" />
          <span>Extract Text</span>
        </button>
      </div>
      
      {/* Processing status */}
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
                style={{ width: `${progress}%` }}
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
      
      {/* Hidden file input for Add More on desktop */}
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
      {/* Header */}
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
      
      {/* Editor Canvas Area */}
      <div 
        ref={editorContainerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-800 p-4"
      >
        {editingImage && (
          <div className="relative max-w-full max-h-full">
            {/* Image with rotation */}
            <img
              src={editingImage}
              alt="Editing"
              className="max-w-full max-h-[60vh] object-contain transition-transform duration-200"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            
            {/* Crop Overlay */}
            {cropMode && (
              <div className="absolute inset-0" style={{ transform: `rotate(${rotation}deg)` }}>
                {/* Dark overlay outside crop area */}
                <div 
                  className="absolute inset-0 bg-black/60"
                  style={{
                    clipPath: `polygon(
                      0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                      ${cropArea.x}% ${cropArea.y}%,
                      ${cropArea.x}% ${cropArea.y + cropArea.height}%,
                      ${cropArea.x + cropArea.width}% ${cropArea.y + cropArea.height}%,
                      ${cropArea.x + cropArea.width}% ${cropArea.y}%,
                      ${cropArea.x}% ${cropArea.y}%
                    )`
                  }}
                />
                
                {/* Crop area border */}
                <div 
                  className="absolute border-2 border-white"
                  style={{
                    left: `${cropArea.x}%`,
                    top: `${cropArea.y}%`,
                    width: `${cropArea.width}%`,
                    height: `${cropArea.height}%`,
                  }}
                  onMouseDown={(e) => handleCropDragStart(e, 'move')}
                  onTouchStart={(e) => handleCropDragStart(e, 'move')}
                >
                  {/* Grid lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
                  </div>
                  
                  {/* Corner handles */}
                  {/* Top-left */}
                  <div 
                    className="absolute -top-2 -left-2 w-6 h-6 cursor-nw-resize"
                    onMouseDown={(e) => handleCropDragStart(e, 'nw')}
                    onTouchStart={(e) => handleCropDragStart(e, 'nw')}
                  >
                    <div className="absolute top-2 left-2 w-4 h-1 bg-white" />
                    <div className="absolute top-2 left-2 w-1 h-4 bg-white" />
                  </div>
                  
                  {/* Top-right */}
                  <div 
                    className="absolute -top-2 -right-2 w-6 h-6 cursor-ne-resize"
                    onMouseDown={(e) => handleCropDragStart(e, 'ne')}
                    onTouchStart={(e) => handleCropDragStart(e, 'ne')}
                  >
                    <div className="absolute top-2 right-2 w-4 h-1 bg-white" />
                    <div className="absolute top-2 right-2 w-1 h-4 bg-white" />
                  </div>
                  
                  {/* Bottom-left */}
                  <div 
                    className="absolute -bottom-2 -left-2 w-6 h-6 cursor-sw-resize"
                    onMouseDown={(e) => handleCropDragStart(e, 'sw')}
                    onTouchStart={(e) => handleCropDragStart(e, 'sw')}
                  >
                    <div className="absolute bottom-2 left-2 w-4 h-1 bg-white" />
                    <div className="absolute bottom-2 left-2 w-1 h-4 bg-white" />
                  </div>
                  
                  {/* Bottom-right */}
                  <div 
                    className="absolute -bottom-2 -right-2 w-6 h-6 cursor-se-resize"
                    onMouseDown={(e) => handleCropDragStart(e, 'se')}
                    onTouchStart={(e) => handleCropDragStart(e, 'se')}
                  >
                    <div className="absolute bottom-2 right-2 w-4 h-1 bg-white" />
                    <div className="absolute bottom-2 right-2 w-1 h-4 bg-white" />
                  </div>
                  
                  {/* Move icon in center */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <Move className="w-8 h-8 text-white/70" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Tool Bar */}
      <div className="bg-gray-900 px-4 py-4 safe-bottom">
        <div className="flex items-center justify-center gap-4">
          {/* Rotate Left */}
          <button
            onClick={() => rotateImage(-90)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <RotateCcw className="w-6 h-6 text-white" />
            <span className="text-xs text-gray-400">Rotate Left</span>
          </button>
          
          {/* Rotate Right */}
          <button
            onClick={() => rotateImage(90)}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <RotateCw className="w-6 h-6 text-white" />
            <span className="text-xs text-gray-400">Rotate Right</span>
          </button>
          
          {/* Crop Toggle */}
          <button
            onClick={toggleCropMode}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
              cropMode ? 'bg-primary-600' : 'hover:bg-gray-800'
            }`}
          >
            <Crop className="w-6 h-6 text-white" />
            <span className="text-xs text-gray-400">{cropMode ? 'Cropping' : 'Crop'}</span>
          </button>
        </div>
        
        {/* Crop instructions */}
        {cropMode && (
          <p className="text-center text-gray-400 text-sm mt-3">
            Drag corners to adjust crop area • Drag center to move
          </p>
        )}
        
        {/* Rotation indicator */}
        {rotation !== 0 && (
          <p className="text-center text-gray-400 text-sm mt-2">
            Rotated {rotation}°
          </p>
        )}
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
      <div className="mb-6 flex justify-between items-center">
        <h2 className="font-bold text-2xl">Extraction Results</h2>
        <button onClick={startNewScan} className="btn-primary">
          <Camera className="w-5 h-5" />
          <span>New Scan</span>
        </button>
      </div>
      
      {/* Extracted text */}
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
      
      {/* AI Summary Section */}
      <div className="card mb-6">
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
