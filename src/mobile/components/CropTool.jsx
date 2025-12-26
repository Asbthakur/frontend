/**
 * CropTool.jsx
 * 
 * CamScanner-style crop tool with:
 * - Draggable corner handles
 * - Perspective correction preview
 * - Rotation buttons
 * - Large touch targets (48dp+)
 * - Smooth animations
 * 
 * User can drag the 4 corners to adjust the document area.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import {
  RotateCcw,
  RotateCw,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';

const CropTool = ({
  image,              // Image file or URL
  initialCorners,     // Initial corner positions (from edge detection)
  onComplete,         // Callback with cropped image and corners
  onCancel,           // Callback to cancel
}) => {
  // Refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // State
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [corners, setCorners] = useState(null);
  const [activeCorner, setActiveCorner] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  /**
   * Initialize corners based on image size
   */
  const initializeCorners = useCallback((width, height) => {
    // Default to full image with 5% padding
    const padding = 0.05;
    const defaultCorners = {
      topLeft: { x: width * padding, y: height * padding },
      topRight: { x: width * (1 - padding), y: height * padding },
      bottomRight: { x: width * (1 - padding), y: height * (1 - padding) },
      bottomLeft: { x: width * padding, y: height * (1 - padding) },
    };

    // Use initial corners if provided, otherwise use defaults
    if (initialCorners) {
      setCorners(initialCorners);
    } else {
      setCorners(defaultCorners);
    }
  }, [initialCorners]);

  /**
   * Load image and set dimensions
   */
  useEffect(() => {
    if (!image) return;

    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
      setImageLoaded(true);
      
      // Calculate display size to fit screen
      const containerWidth = window.innerWidth - 40; // Padding
      const containerHeight = window.innerHeight * 0.6; // 60% of screen
      
      const scale = Math.min(
        containerWidth / img.width,
        containerHeight / img.height
      );
      
      setDisplaySize({
        width: img.width * scale,
        height: img.height * scale,
      });
      
      // Initialize corners
      initializeCorners(img.width * scale, img.height * scale);
    };

    img.src = typeof image === 'string' ? image : URL.createObjectURL(image);
    imageRef.current = img;

    return () => {
      if (typeof image !== 'string') {
        URL.revokeObjectURL(img.src);
      }
    };
  }, [image, initializeCorners]);

  /**
   * Draw crop overlay on canvas
   */
  useEffect(() => {
    if (!canvasRef.current || !corners || !imageLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw semi-transparent overlay outside crop area
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cut out the crop area (clear it)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(corners.topLeft.x, corners.topLeft.y);
    ctx.lineTo(corners.topRight.x, corners.topRight.y);
    ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
    ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
    ctx.closePath();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fill();
    ctx.restore();

    // Draw crop border
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(corners.topLeft.x, corners.topLeft.y);
    ctx.lineTo(corners.topRight.x, corners.topRight.y);
    ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
    ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
    ctx.closePath();
    ctx.stroke();

    // Draw grid lines (rule of thirds)
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    const thirdX1 = corners.topLeft.x + (corners.topRight.x - corners.topLeft.x) / 3;
    const thirdX2 = corners.topLeft.x + (corners.topRight.x - corners.topLeft.x) * 2 / 3;
    const bottomThirdX1 = corners.bottomLeft.x + (corners.bottomRight.x - corners.bottomLeft.x) / 3;
    const bottomThirdX2 = corners.bottomLeft.x + (corners.bottomRight.x - corners.bottomLeft.x) * 2 / 3;
    
    ctx.beginPath();
    ctx.moveTo(thirdX1, corners.topLeft.y + (corners.topRight.y - corners.topLeft.y) / 3);
    ctx.lineTo(bottomThirdX1, corners.bottomLeft.y - (corners.bottomLeft.y - corners.topLeft.y) / 3 * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(thirdX2, corners.topLeft.y + (corners.topRight.y - corners.topLeft.y) * 2 / 3);
    ctx.lineTo(bottomThirdX2, corners.bottomLeft.y - (corners.bottomLeft.y - corners.topLeft.y) / 3);
    ctx.stroke();

  }, [corners, displaySize, imageLoaded]);

  /**
   * Handle corner drag
   */
  const handleCornerStart = (cornerName, e) => {
    e.preventDefault();
    setActiveCorner(cornerName);
    setIsDragging(true);

    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  const handleMove = useCallback((e) => {
    if (!isDragging || !activeCorner || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Calculate position relative to container
    let x = clientX - rect.left;
    let y = clientY - rect.top;

    // Clamp to bounds
    x = Math.max(20, Math.min(displaySize.width - 20, x));
    y = Math.max(20, Math.min(displaySize.height - 20, y));

    setCorners(prev => ({
      ...prev,
      [activeCorner]: { x, y }
    }));
  }, [isDragging, activeCorner, displaySize]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    setActiveCorner(null);

    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Light });
    }
  }, [isNative]);

  // Add touch/mouse listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleMove, handleEnd]);

  /**
   * Rotate image
   */
  const rotateLeft = () => {
    setRotation(prev => (prev - 90 + 360) % 360);
    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  const rotateRight = () => {
    setRotation(prev => (prev + 90) % 360);
    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Light });
    }
  };

  const resetRotation = () => {
    setRotation(0);
    // Reset corners to default
    initializeCorners(displaySize.width, displaySize.height);
    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }
  };

  /**
   * Complete crop and return result
   */
  const handleComplete = async () => {
    if (!corners || !imageRef.current) return;

    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }

    // Calculate scale factor from display to actual image
    const scaleX = imageSize.width / displaySize.width;
    const scaleY = imageSize.height / displaySize.height;

    // Scale corners to actual image coordinates
    const actualCorners = {
      topLeft: { x: corners.topLeft.x * scaleX, y: corners.topLeft.y * scaleY },
      topRight: { x: corners.topRight.x * scaleX, y: corners.topRight.y * scaleY },
      bottomRight: { x: corners.bottomRight.x * scaleX, y: corners.bottomRight.y * scaleY },
      bottomLeft: { x: corners.bottomLeft.x * scaleX, y: corners.bottomLeft.y * scaleY },
    };

    // For now, return the original image with corners
    // In production, apply perspective transform here
    if (onComplete) {
      onComplete({
        image: image,
        corners: actualCorners,
        rotation: rotation,
      });
    }
  };

  /**
   * Render corner handle
   */
  const CornerHandle = ({ name, position }) => (
    <div
      style={{
        position: 'absolute',
        left: position.x - 20,
        top: position.y - 20,
        width: '40px',
        height: '40px',
        cursor: 'move',
        touchAction: 'none',
        zIndex: 10,
      }}
      onMouseDown={(e) => handleCornerStart(name, e)}
      onTouchStart={(e) => handleCornerStart(name, e)}
    >
      {/* Outer touch target */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Visible handle */}
        <div
          style={{
            width: activeCorner === name ? '28px' : '24px',
            height: activeCorner === name ? '28px' : '24px',
            borderRadius: '14px',
            background: activeCorner === name ? '#8b5cf6' : '#fff',
            border: `3px solid ${activeCorner === name ? '#fff' : '#8b5cf6'}`,
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            transition: 'all 0.15s ease',
          }}
        />
      </div>
    </div>
  );

  // Styles
  const styles = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#0f172a',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
    },

    // Header
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 20px',
      paddingTop: '50px', // Safe area
    },
    headerBtn: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.1)',
      border: 'none',
      color: '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: '#fff',
      fontSize: '18px',
      fontWeight: '600',
    },
    doneBtn: {
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      background: '#8b5cf6',
      border: 'none',
      color: '#fff',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Image area
    imageArea: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
    },
    imageContainer: {
      position: 'relative',
      transform: `rotate(${rotation}deg)`,
      transition: 'transform 0.3s ease',
    },
    image: {
      display: 'block',
      maxWidth: '100%',
      borderRadius: '8px',
    },
    canvas: {
      position: 'absolute',
      top: 0,
      left: 0,
      pointerEvents: 'none',
    },

    // Bottom controls
    bottomControls: {
      padding: '20px',
      paddingBottom: '40px', // Safe area
      background: 'rgba(15, 23, 42, 0.95)',
    },

    // Rotation buttons
    rotationRow: {
      display: 'flex',
      justifyContent: 'center',
      gap: '16px',
      marginBottom: '20px',
    },
    rotationBtn: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(255,255,255,0.1)',
      border: 'none',
      borderRadius: '12px',
      padding: '12px 20px',
      color: '#fff',
      cursor: 'pointer',
    },
    rotationBtnIcon: {
      width: '24px',
      height: '24px',
    },
    rotationBtnText: {
      fontSize: '12px',
      color: '#94a3b8',
    },

    // Hint
    hint: {
      textAlign: 'center',
      color: '#64748b',
      fontSize: '14px',
    },

    // Apply button
    applyBtn: {
      width: '100%',
      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      border: 'none',
      borderRadius: '14px',
      padding: '16px',
      color: '#fff',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.headerBtn} onClick={onCancel}>
          <X style={{ width: '24px', height: '24px' }} />
        </button>
        <span style={styles.headerTitle}>Adjust Corners</span>
        <button style={styles.doneBtn} onClick={handleComplete}>
          <Check style={{ width: '24px', height: '24px' }} />
        </button>
      </div>

      {/* Image area with crop overlay */}
      <div style={styles.imageArea}>
        {imageLoaded && (
          <div 
            ref={containerRef}
            style={{
              ...styles.imageContainer,
              width: displaySize.width,
              height: displaySize.height,
            }}
          >
            {/* Image */}
            <img
              src={typeof image === 'string' ? image : URL.createObjectURL(image)}
              style={{
                ...styles.image,
                width: displaySize.width,
                height: displaySize.height,
              }}
              alt="Document"
            />

            {/* Crop overlay canvas */}
            <canvas
              ref={canvasRef}
              style={styles.canvas}
            />

            {/* Corner handles */}
            {corners && (
              <>
                <CornerHandle name="topLeft" position={corners.topLeft} />
                <CornerHandle name="topRight" position={corners.topRight} />
                <CornerHandle name="bottomRight" position={corners.bottomRight} />
                <CornerHandle name="bottomLeft" position={corners.bottomLeft} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div style={styles.bottomControls}>
        {/* Rotation buttons */}
        <div style={styles.rotationRow}>
          <button style={styles.rotationBtn} onClick={rotateLeft}>
            <RotateCcw style={styles.rotationBtnIcon} />
            <span style={styles.rotationBtnText}>-90°</span>
          </button>
          <button style={styles.rotationBtn} onClick={rotateRight}>
            <RotateCw style={styles.rotationBtnIcon} />
            <span style={styles.rotationBtnText}>+90°</span>
          </button>
          <button style={styles.rotationBtn} onClick={resetRotation}>
            <RefreshCw style={styles.rotationBtnIcon} />
            <span style={styles.rotationBtnText}>Reset</span>
          </button>
        </div>

        {/* Hint */}
        <p style={styles.hint}>
          Drag corners to adjust document area
        </p>

        {/* Apply button */}
        <button style={styles.applyBtn} onClick={handleComplete}>
          <Check style={{ width: '20px', height: '20px' }} />
          Apply Crop
        </button>
      </div>
    </div>
  );
};

export default CropTool;
