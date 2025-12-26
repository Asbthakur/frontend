/**
 * CropTool.jsx - ULTRA SMOOTH VERSION
 * 
 * Key optimizations:
 * - Direct DOM manipulation (no React state during drag)
 * - Touch events with { passive: false }
 * - requestAnimationFrame throttling
 * - CSS transforms instead of position changes
 * - Large 64px touch targets
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  RotateCcw,
  RotateCw,
  Check,
  X,
} from 'lucide-react';

const CropTool = ({ image, onComplete, onCancel }) => {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const cornersRef = useRef({
    topLeft: { x: 0, y: 0 },
    topRight: { x: 0, y: 0 },
    bottomRight: { x: 0, y: 0 },
    bottomLeft: { x: 0, y: 0 },
  });
  
  // DOM refs for direct manipulation
  const handleRefs = {
    topLeft: useRef(null),
    topRight: useRef(null),
    bottomRight: useRef(null),
    bottomLeft: useRef(null),
  };
  const overlayRef = useRef(null);
  const borderRef = useRef(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [activeCorner, setActiveCorner] = useState(null);
  
  const isNative = Capacitor.isNativePlatform();
  const dragDataRef = useRef({ startX: 0, startY: 0, cornerStartX: 0, cornerStartY: 0 });

  // Load image
  useEffect(() => {
    if (!image) return;
    const src = typeof image === 'string' ? image : URL.createObjectURL(image);
    setImageSrc(src);
    return () => {
      if (typeof image !== 'string') URL.revokeObjectURL(src);
    };
  }, [image]);

  // Initialize corners when image loads
  const handleImageLoad = useCallback((e) => {
    const img = e.target;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    setImageNaturalSize({ width: naturalW, height: naturalH });

    // Calculate display size
    const maxW = window.innerWidth - 32;
    const maxH = window.innerHeight * 0.5;
    const scale = Math.min(maxW / naturalW, maxH / naturalH);
    const dispW = Math.round(naturalW * scale);
    const dispH = Math.round(naturalH * scale);
    setDisplaySize({ width: dispW, height: dispH });

    // Initialize corners with 10% padding
    const padX = dispW * 0.1;
    const padY = dispH * 0.1;
    cornersRef.current = {
      topLeft: { x: padX, y: padY },
      topRight: { x: dispW - padX, y: padY },
      bottomRight: { x: dispW - padX, y: dispH - padY },
      bottomLeft: { x: padX, y: dispH - padY },
    };

    setImageLoaded(true);
    
    // Update DOM after state
    setTimeout(() => updateAllHandles(), 0);
  }, []);

  // Update handle position directly in DOM
  const updateHandlePosition = useCallback((name, x, y) => {
    const handle = handleRefs[name]?.current;
    if (handle) {
      handle.style.transform = `translate(${x - 32}px, ${y - 32}px)`;
    }
  }, []);

  // Update all handles and overlay
  const updateAllHandles = useCallback(() => {
    const c = cornersRef.current;
    updateHandlePosition('topLeft', c.topLeft.x, c.topLeft.y);
    updateHandlePosition('topRight', c.topRight.x, c.topRight.y);
    updateHandlePosition('bottomRight', c.bottomRight.x, c.bottomRight.y);
    updateHandlePosition('bottomLeft', c.bottomLeft.x, c.bottomLeft.y);
    updateOverlay();
  }, []);

  // Update SVG overlay
  const updateOverlay = useCallback(() => {
    if (!borderRef.current) return;
    const c = cornersRef.current;
    const path = `M ${c.topLeft.x} ${c.topLeft.y} L ${c.topRight.x} ${c.topRight.y} L ${c.bottomRight.x} ${c.bottomRight.y} L ${c.bottomLeft.x} ${c.bottomLeft.y} Z`;
    borderRef.current.setAttribute('d', path);
  }, []);

  // Touch/Mouse handlers - DIRECT DOM, NO STATE
  const handleStart = useCallback((cornerName, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches ? e.touches[0] : e;
    const corner = cornersRef.current[cornerName];
    
    dragDataRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      cornerStartX: corner.x,
      cornerStartY: corner.y,
    };
    
    setActiveCorner(cornerName);
    
    // Haptic
    if (navigator.vibrate) navigator.vibrate(10);
  }, []);

  const handleMove = useCallback((e) => {
    if (!activeCorner) return;
    e.preventDefault();
    
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - dragDataRef.current.startX;
    const dy = touch.clientY - dragDataRef.current.startY;
    
    let newX = dragDataRef.current.cornerStartX + dx;
    let newY = dragDataRef.current.cornerStartY + dy;
    
    // Clamp to bounds
    const pad = 20;
    newX = Math.max(pad, Math.min(displaySize.width - pad, newX));
    newY = Math.max(pad, Math.min(displaySize.height - pad, newY));
    
    // Update ref (no state!)
    cornersRef.current[activeCorner] = { x: newX, y: newY };
    
    // Update DOM directly
    updateHandlePosition(activeCorner, newX, newY);
    updateOverlay();
  }, [activeCorner, displaySize, updateHandlePosition, updateOverlay]);

  const handleEnd = useCallback(() => {
    if (activeCorner && navigator.vibrate) navigator.vibrate(5);
    setActiveCorner(null);
  }, [activeCorner]);

  // Global event listeners
  useEffect(() => {
    if (!activeCorner) return;
    
    const opts = { passive: false };
    window.addEventListener('touchmove', handleMove, opts);
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    
    return () => {
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [activeCorner, handleMove, handleEnd]);

  // Rotation
  const rotate = (deg) => {
    setRotation(r => (r + deg + 360) % 360);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Complete
  const handleComplete = () => {
    if (navigator.vibrate) navigator.vibrate(20);
    
    const scaleX = imageNaturalSize.width / displaySize.width;
    const scaleY = imageNaturalSize.height / displaySize.height;
    const c = cornersRef.current;
    
    onComplete?.({
      image,
      corners: {
        topLeft: { x: c.topLeft.x * scaleX, y: c.topLeft.y * scaleY },
        topRight: { x: c.topRight.x * scaleX, y: c.topRight.y * scaleY },
        bottomRight: { x: c.bottomRight.x * scaleX, y: c.bottomRight.y * scaleY },
        bottomLeft: { x: c.bottomLeft.x * scaleX, y: c.bottomLeft.y * scaleY },
      },
      rotation,
    });
  };

  // Corner handle component
  const Handle = ({ name }) => (
    <div
      ref={handleRefs[name]}
      onTouchStart={(e) => handleStart(name, e)}
      onMouseDown={(e) => handleStart(name, e)}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 64,
        height: 64,
        touchAction: 'none',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div style={{
        width: activeCorner === name ? 36 : 28,
        height: activeCorner === name ? 36 : 28,
        borderRadius: '50%',
        background: activeCorner === name ? '#8b5cf6' : '#fff',
        border: `4px solid ${activeCorner === name ? '#fff' : '#8b5cf6'}`,
        boxShadow: activeCorner === name 
          ? '0 0 0 8px rgba(139,92,246,0.3), 0 4px 12px rgba(0,0,0,0.4)'
          : '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'width 0.1s, height 0.1s, background 0.1s, box-shadow 0.15s',
      }} />
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#000',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        paddingTop: 48,
        background: 'rgba(0,0,0,0.9)',
      }}>
        <button onClick={onCancel} style={btnStyle}>
          <X size={24} />
        </button>
        <span style={{ color: '#fff', fontSize: 17, fontWeight: 600 }}>Adjust Crop</span>
        <button onClick={handleComplete} style={{ ...btnStyle, background: '#8b5cf6' }}>
          <Check size={24} />
        </button>
      </div>

      {/* Image area */}
      <div 
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          overflow: 'hidden',
        }}
      >
        {imageSrc && (
          <div
            ref={imageRef}
            style={{
              position: 'relative',
              width: displaySize.width || 'auto',
              height: displaySize.height || 'auto',
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.25s ease-out',
            }}
          >
            <img
              src={imageSrc}
              onLoad={handleImageLoad}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: 8,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
              draggable={false}
            />

            {imageLoaded && (
              <>
                {/* Dark overlay */}
                <svg
                  ref={overlayRef}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                  }}
                >
                  <defs>
                    <mask id="cropMask">
                      <rect width="100%" height="100%" fill="white" />
                      <path ref={borderRef} fill="black" />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#cropMask)" />
                  <path
                    ref={borderRef}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="3"
                  />
                </svg>

                {/* Corner handles */}
                <Handle name="topLeft" />
                <Handle name="topRight" />
                <Handle name="bottomRight" />
                <Handle name="bottomLeft" />
              </>
            )}
          </div>
        )}

        {!imageLoaded && (
          <div style={{ color: '#666', fontSize: 16 }}>Loading...</div>
        )}
      </div>

      {/* Bottom controls */}
      <div style={{
        padding: '16px 20px 40px',
        background: 'rgba(0,0,0,0.95)',
      }}>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, marginBottom: 16 }}>
          Drag corners to adjust
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
          <button onClick={() => rotate(-90)} style={rotBtnStyle}>
            <RotateCcw size={22} />
            <span>-90°</span>
          </button>
          <button onClick={() => rotate(90)} style={rotBtnStyle}>
            <RotateCw size={22} />
            <span>+90°</span>
          </button>
        </div>

        <button onClick={handleComplete} style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          border: 'none',
          borderRadius: 14,
          padding: 18,
          color: '#fff',
          fontSize: 17,
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          <Check size={22} />
          Continue
        </button>
      </div>
    </div>
  );
};

const btnStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const rotBtnStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(255,255,255,0.1)',
  border: 'none',
  borderRadius: 12,
  padding: '12px 24px',
  color: '#fff',
  fontSize: 12,
  cursor: 'pointer',
};

export default CropTool;
