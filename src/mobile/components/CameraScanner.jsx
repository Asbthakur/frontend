/**
 * CameraScanner.jsx
 * 
 * CamScanner-style camera component with:
 * - Full-screen camera view
 * - Real-time edge detection overlay (green border)
 * - Flash toggle
 * - Camera switch (front/back)
 * - Capture button with animation
 * - Haptic feedback
 * - Gallery picker
 * - Batch mode (continuous scanning)
 * 
 * This component focuses on the FEEL - smooth, responsive, premium.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  X,
  Zap,
  ZapOff,
  SwitchCamera,
  Image,
  Check,
  Loader,
} from 'lucide-react';

const CameraScanner = ({ 
  onCapture,           // Callback when image is captured
  onClose,             // Callback to close camera
  onComplete,          // Callback when done capturing (with all images)
  batchMode = false,   // Allow multiple captures
  maxImages = 20,      // Max images in batch mode
  showEdgeDetection = true,  // Show green edge detection overlay
}) => {
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flashMode, setFlashMode] = useState('off'); // off, on, auto
  const [facingMode, setFacingMode] = useState('environment'); // environment (back) or user (front)
  const [capturedImages, setCapturedImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [detectedCorners, setDetectedCorners] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Check if native platform
  const isNative = Capacitor.isNativePlatform();

  /**
   * Initialize camera
   */
  const initCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Request camera permission
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
          setIsLoading(false);
          
          // Start edge detection if enabled
          if (showEdgeDetection) {
            startEdgeDetection();
          }
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError(err.name === 'NotAllowedError' 
        ? 'Camera access denied. Please allow camera permission.'
        : 'Failed to access camera. Please try again.'
      );
      setIsLoading(false);
    }
  }, [facingMode, showEdgeDetection]);

  /**
   * Start edge detection animation loop
   * This creates the green border around detected documents
   */
  const startEdgeDetection = useCallback(() => {
    if (!overlayCanvasRef.current || !videoRef.current) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;

    const detectEdges = () => {
      if (!video.videoWidth) {
        animationFrameRef.current = requestAnimationFrame(detectEdges);
        return;
      }

      // Match canvas size to video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Clear previous frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Simulate edge detection (in production, use OpenCV.js or ML Kit)
      // For now, we'll show a guide frame
      const padding = 40;
      const cornerRadius = 20;
      const cornerLength = 40;
      
      // Calculate document area (80% of frame)
      const docWidth = canvas.width * 0.85;
      const docHeight = canvas.height * 0.7;
      const docX = (canvas.width - docWidth) / 2;
      const docY = (canvas.height - docHeight) / 2;

      // Draw corner guides with glow effect
      ctx.strokeStyle = '#22c55e'; // Green
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 10;

      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(docX, docY + cornerLength);
      ctx.lineTo(docX, docY + cornerRadius);
      ctx.arcTo(docX, docY, docX + cornerRadius, docY, cornerRadius);
      ctx.lineTo(docX + cornerLength, docY);
      ctx.stroke();

      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(docX + docWidth - cornerLength, docY);
      ctx.lineTo(docX + docWidth - cornerRadius, docY);
      ctx.arcTo(docX + docWidth, docY, docX + docWidth, docY + cornerRadius, cornerRadius);
      ctx.lineTo(docX + docWidth, docY + cornerLength);
      ctx.stroke();

      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(docX + docWidth, docY + docHeight - cornerLength);
      ctx.lineTo(docX + docWidth, docY + docHeight - cornerRadius);
      ctx.arcTo(docX + docWidth, docY + docHeight, docX + docWidth - cornerRadius, docY + docHeight, cornerRadius);
      ctx.lineTo(docX + docWidth - cornerLength, docY + docHeight);
      ctx.stroke();

      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(docX + cornerLength, docY + docHeight);
      ctx.lineTo(docX + cornerRadius, docY + docHeight);
      ctx.arcTo(docX, docY + docHeight, docX, docY + docHeight - cornerRadius, cornerRadius);
      ctx.lineTo(docX, docY + docHeight - cornerLength);
      ctx.stroke();

      // Draw subtle dashed guide lines
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 8]);
      
      ctx.beginPath();
      ctx.roundRect(docX, docY, docWidth, docHeight, cornerRadius);
      ctx.stroke();
      ctx.setLineDash([]);

      // Store detected corners for crop tool later
      setDetectedCorners({
        topLeft: { x: docX, y: docY },
        topRight: { x: docX + docWidth, y: docY },
        bottomRight: { x: docX + docWidth, y: docY + docHeight },
        bottomLeft: { x: docX, y: docY + docHeight },
      });

      animationFrameRef.current = requestAnimationFrame(detectEdges);
    };

    detectEdges();
  }, []);

  /**
   * Capture photo with animation and haptic feedback
   */
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      // Haptic feedback
      if (isNative) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }

      // Flash animation
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 150);

      // Play shutter sound (optional)
      // const audio = new Audio('/sounds/shutter.mp3');
      // audio.play();

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to video size for full quality
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Convert to blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
      });

      // Create file object
      const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Add to captured images
      const newImages = [...capturedImages, file];
      setCapturedImages(newImages);

      // Callback
      if (onCapture) {
        onCapture(file, detectedCorners);
      }

      // If not batch mode, complete immediately
      if (!batchMode) {
        setTimeout(() => {
          if (onComplete) {
            onComplete(newImages);
          }
        }, 300);
      }

      // Haptic success
      if (isNative) {
        await Haptics.impact({ style: ImpactStyle.Light });
      }

    } catch (err) {
      console.error('Capture error:', err);
      setError('Failed to capture image');
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * Pick from gallery
   */
  const pickFromGallery = async () => {
    try {
      if (isNative) {
        // Use Capacitor Camera plugin for native
        const result = await Camera.pickImages({
          quality: 90,
          limit: batchMode ? maxImages - capturedImages.length : 1,
        });

        // Convert to files and add
        for (const photo of result.photos) {
          const response = await fetch(photo.webPath);
          const blob = await response.blob();
          const file = new File([blob], `gallery_${Date.now()}.jpg`, { type: 'image/jpeg' });
          setCapturedImages(prev => [...prev, file]);
        }
      } else {
        // Use file input for web
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = batchMode;
        
        input.onchange = (e) => {
          const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
          if (files.length > 0) {
            setCapturedImages(prev => [...prev, ...files].slice(0, maxImages));
            
            if (!batchMode && onComplete) {
              onComplete(files);
            }
          }
        };
        
        input.click();
      }
    } catch (err) {
      console.error('Gallery error:', err);
    }
  };

  /**
   * Switch camera (front/back)
   */
  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  /**
   * Toggle flash
   */
  const toggleFlash = async () => {
    // Flash is tricky on web - works better on native
    setFlashMode(prev => {
      if (prev === 'off') return 'on';
      if (prev === 'on') return 'auto';
      return 'off';
    });

    // Apply to track if supported
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      if (capabilities?.torch) {
        await track.applyConstraints({
          advanced: [{ torch: flashMode === 'on' }]
        });
      }
    }
  };

  /**
   * Complete and return all images
   */
  const handleComplete = () => {
    if (capturedImages.length > 0 && onComplete) {
      onComplete(capturedImages);
    }
  };

  /**
   * Close camera and cleanup
   */
  const handleClose = () => {
    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    // Cancel animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    // Callback
    if (onClose) {
      onClose();
    }
  };

  // Initialize camera on mount
  useEffect(() => {
    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initCamera]);

  // Styles
  const styles = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#000',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
    },
    
    // Video container
    videoContainer: {
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
    },
    video: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },
    overlayCanvas: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
    },
    hiddenCanvas: {
      display: 'none',
    },

    // Flash overlay
    flashOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#fff',
      opacity: showFlash ? 1 : 0,
      transition: 'opacity 0.15s ease',
      pointerEvents: 'none',
    },

    // Top controls
    topControls: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      padding: '20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
      paddingTop: '50px', // Safe area
    },
    controlBtn: {
      width: '44px',
      height: '44px',
      borderRadius: '22px',
      background: 'rgba(255,255,255,0.2)',
      backdropFilter: 'blur(10px)',
      border: 'none',
      color: '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
    },
    controlBtnActive: {
      background: '#f59e0b',
    },

    // Bottom controls
    bottomControls: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '30px 20px',
      paddingBottom: '50px', // Safe area
      background: 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
    },
    
    // Capture button row
    captureRow: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '50px',
      marginBottom: batchMode ? '20px' : '0',
    },
    
    // Gallery button
    galleryBtn: {
      width: '50px',
      height: '50px',
      borderRadius: '12px',
      background: capturedImages.length > 0 
        ? 'rgba(139, 92, 246, 0.3)'
        : 'rgba(255,255,255,0.2)',
      backdropFilter: 'blur(10px)',
      border: capturedImages.length > 0 
        ? '2px solid #8b5cf6'
        : '2px solid rgba(255,255,255,0.3)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    galleryPreview: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      borderRadius: '10px',
    },
    galleryBadge: {
      position: 'absolute',
      top: '-6px',
      right: '-6px',
      width: '22px',
      height: '22px',
      borderRadius: '11px',
      background: '#8b5cf6',
      color: '#fff',
      fontSize: '12px',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    // Capture button
    captureBtn: {
      width: '80px',
      height: '80px',
      borderRadius: '40px',
      background: '#fff',
      border: '4px solid rgba(255,255,255,0.3)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.15s ease',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    },
    captureBtnInner: {
      width: '64px',
      height: '64px',
      borderRadius: '32px',
      background: isCapturing 
        ? '#8b5cf6' 
        : 'linear-gradient(135deg, #fff 0%, #f0f0f0 100%)',
      transition: 'all 0.15s ease',
    },
    captureBtnPressed: {
      transform: 'scale(0.9)',
    },
    
    // Page count / Done button area
    pageCountArea: {
      width: '50px',
      height: '50px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageCount: {
      color: '#fff',
      fontSize: '16px',
      fontWeight: '600',
    },

    // Done button (batch mode)
    doneRow: {
      display: 'flex',
      justifyContent: 'center',
    },
    doneBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: '30px',
      padding: '14px 32px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
    },

    // Hint text
    hintText: {
      textAlign: 'center',
      color: 'rgba(255,255,255,0.7)',
      fontSize: '14px',
      marginTop: '16px',
    },

    // Loading overlay
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
    },
    loadingSpinner: {
      width: '40px',
      height: '40px',
      color: '#8b5cf6',
      animation: 'spin 1s linear infinite',
    },
    loadingText: {
      color: '#fff',
      fontSize: '16px',
    },

    // Error overlay
    errorOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      textAlign: 'center',
    },
    errorText: {
      color: '#f87171',
      fontSize: '16px',
      marginBottom: '24px',
      lineHeight: '1.5',
    },
    retryBtn: {
      background: '#8b5cf6',
      color: '#fff',
      border: 'none',
      borderRadius: '12px',
      padding: '14px 32px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
    },
  };

  // Add keyframes for spinner
  const spinKeyframes = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;

  return (
    <div style={styles.container}>
      <style>{spinKeyframes}</style>

      {/* Video container */}
      <div style={styles.videoContainer}>
        <video 
          ref={videoRef}
          style={styles.video}
          autoPlay 
          playsInline 
          muted
        />
        
        {/* Edge detection overlay */}
        {showEdgeDetection && (
          <canvas 
            ref={overlayCanvasRef}
            style={styles.overlayCanvas}
          />
        )}

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} style={styles.hiddenCanvas} />

        {/* Flash overlay */}
        <div style={styles.flashOverlay} />

        {/* Top controls */}
        <div style={styles.topControls}>
          <button 
            style={styles.controlBtn}
            onClick={handleClose}
          >
            <X style={{ width: '24px', height: '24px' }} />
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              style={{
                ...styles.controlBtn,
                ...(flashMode === 'on' ? styles.controlBtnActive : {})
              }}
              onClick={toggleFlash}
            >
              {flashMode === 'off' ? (
                <ZapOff style={{ width: '20px', height: '20px' }} />
              ) : (
                <Zap style={{ width: '20px', height: '20px' }} />
              )}
            </button>

            <button 
              style={styles.controlBtn}
              onClick={switchCamera}
            >
              <SwitchCamera style={{ width: '20px', height: '20px' }} />
            </button>
          </div>
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div style={styles.loadingOverlay}>
            <Loader style={styles.loadingSpinner} />
            <span style={styles.loadingText}>Starting camera...</span>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div style={styles.errorOverlay}>
            <p style={styles.errorText}>{error}</p>
            <button style={styles.retryBtn} onClick={initCamera}>
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      {!isLoading && !error && (
        <div style={styles.bottomControls}>
          <div style={styles.captureRow}>
            {/* Gallery / Preview button */}
            <button style={styles.galleryBtn} onClick={pickFromGallery}>
              {capturedImages.length > 0 ? (
                <>
                  <img 
                    src={URL.createObjectURL(capturedImages[capturedImages.length - 1])}
                    style={styles.galleryPreview}
                    alt="Last capture"
                  />
                  <span style={styles.galleryBadge}>{capturedImages.length}</span>
                </>
              ) : (
                <Image style={{ width: '24px', height: '24px', color: '#fff' }} />
              )}
            </button>

            {/* Capture button */}
            <button 
              style={{
                ...styles.captureBtn,
                ...(isCapturing ? styles.captureBtnPressed : {})
              }}
              onClick={capturePhoto}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = 'scale(0.9)';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <div style={styles.captureBtnInner} />
            </button>

            {/* Page count or placeholder */}
            <div style={styles.pageCountArea}>
              {batchMode && capturedImages.length > 0 && (
                <span style={styles.pageCount}>{capturedImages.length}</span>
              )}
            </div>
          </div>

          {/* Done button (batch mode only) */}
          {batchMode && capturedImages.length > 0 && (
            <div style={styles.doneRow}>
              <button style={styles.doneBtn} onClick={handleComplete}>
                <Check style={{ width: '20px', height: '20px' }} />
                Done ({capturedImages.length} {capturedImages.length === 1 ? 'page' : 'pages'})
              </button>
            </div>
          )}

          {/* Hint text */}
          <p style={styles.hintText}>
            {batchMode 
              ? 'Position document in frame • Tap to capture'
              : 'Hold steady • Tap to scan'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default CameraScanner;
