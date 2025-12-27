/**
 * CropTool.jsx - SIMPLE & SMOOTH
 * 
 * Ultra simple crop tool:
 * - Direct DOM updates (no React re-renders during drag)
 * - Large touch targets (64px)
 * - Smooth CSS transforms
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, RotateCcw, RotateCw } from 'lucide-react';

const CropTool = ({ image, onComplete, onCancel }) => {
  const [imageSrc, setImageSrc] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(null);

  // Refs for direct DOM manipulation
  const corners = useRef({ tl: {x:0,y:0}, tr: {x:0,y:0}, br: {x:0,y:0}, bl: {x:0,y:0} });
  const dragStart = useRef({ x: 0, y: 0, cx: 0, cy: 0 });
  const handleEls = useRef({});
  const pathEl = useRef(null);
  const containerEl = useRef(null);

  // Load image
  useEffect(() => {
    if (!image) return;
    const src = typeof image === 'string' ? image : URL.createObjectURL(image);
    setImageSrc(src);
    return () => { if (typeof image !== 'string') URL.revokeObjectURL(src); };
  }, [image]);

  // Image loaded - initialize corners
  const onImageLoad = (e) => {
    const img = e.target;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    setNaturalSize({ width: nw, height: nh });

    const maxW = window.innerWidth - 32;
    const maxH = window.innerHeight * 0.5;
    const scale = Math.min(maxW / nw, maxH / nh);
    const dw = Math.round(nw * scale), dh = Math.round(nh * scale);
    setDisplaySize({ width: dw, height: dh });

    // Init corners with 8% padding
    const px = dw * 0.08, py = dh * 0.08;
    corners.current = {
      tl: { x: px, y: py },
      tr: { x: dw - px, y: py },
      br: { x: dw - px, y: dh - py },
      bl: { x: px, y: dh - py },
    };

    setImageLoaded(true);
    requestAnimationFrame(updateDOM);
  };

  // Update DOM directly (no state)
  const updateDOM = () => {
    const c = corners.current;
    // Update handles
    Object.entries(handleEls.current).forEach(([key, el]) => {
      if (el) el.style.transform = `translate(${c[key].x - 32}px, ${c[key].y - 32}px)`;
    });
    // Update path
    if (pathEl.current) {
      pathEl.current.setAttribute('d', 
        `M${c.tl.x},${c.tl.y} L${c.tr.x},${c.tr.y} L${c.br.x},${c.br.y} L${c.bl.x},${c.bl.y} Z`
      );
    }
  };

  // Touch/Mouse start
  const onStart = (key, e) => {
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    dragStart.current = { x: pt.clientX, y: pt.clientY, cx: corners.current[key].x, cy: corners.current[key].y };
    setDragging(key);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Touch/Mouse move
  const onMove = useCallback((e) => {
    if (!dragging) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - dragStart.current.x;
    const dy = pt.clientY - dragStart.current.y;
    
    let nx = dragStart.current.cx + dx;
    let ny = dragStart.current.cy + dy;
    
    // Clamp
    nx = Math.max(16, Math.min(displaySize.width - 16, nx));
    ny = Math.max(16, Math.min(displaySize.height - 16, ny));
    
    corners.current[dragging] = { x: nx, y: ny };
    updateDOM();
  }, [dragging, displaySize]);

  // Touch/Mouse end
  const onEnd = useCallback(() => {
    if (dragging && navigator.vibrate) navigator.vibrate(5);
    setDragging(null);
  }, [dragging]);

  // Global listeners
  useEffect(() => {
    if (!dragging) return;
    const opts = { passive: false };
    window.addEventListener('touchmove', onMove, opts);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('mouseup', onEnd);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('mouseup', onEnd);
    };
  }, [dragging, onMove, onEnd]);

  // Rotate
  const rotate = (deg) => {
    setRotation(r => (r + deg + 360) % 360);
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Complete
  const complete = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    const sx = naturalSize.width / displaySize.width;
    const sy = naturalSize.height / displaySize.height;
    const c = corners.current;
    onComplete?.({
      image,
      corners: {
        topLeft: { x: c.tl.x * sx, y: c.tl.y * sy },
        topRight: { x: c.tr.x * sx, y: c.tr.y * sy },
        bottomRight: { x: c.br.x * sx, y: c.br.y * sy },
        bottomLeft: { x: c.bl.x * sx, y: c.bl.y * sy },
      },
      rotation,
    });
  };

  // Handle component
  const Handle = ({ k }) => (
    <div
      ref={el => handleEls.current[k] = el}
      onTouchStart={e => onStart(k, e)}
      onMouseDown={e => onStart(k, e)}
      style={{
        position: 'absolute',
        top: 0, left: 0,
        width: 64, height: 64,
        touchAction: 'none',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
      }}
    >
      <div style={{
        width: dragging === k ? 32 : 24,
        height: dragging === k ? 32 : 24,
        borderRadius: '50%',
        background: dragging === k ? '#8b5cf6' : '#fff',
        border: `3px solid ${dragging === k ? '#fff' : '#8b5cf6'}`,
        boxShadow: dragging === k 
          ? '0 0 0 6px rgba(139,92,246,0.3), 0 4px 12px rgba(0,0,0,0.3)'
          : '0 2px 8px rgba(0,0,0,0.3)',
        transition: 'all 0.1s ease',
      }} />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', paddingTop: 48, background: '#000' }}>
        <button onClick={onCancel} style={btnStyle}><X size={24} /></button>
        <span style={{ color: '#fff', fontSize: 17, fontWeight: 600 }}>Crop</span>
        <button onClick={complete} style={{ ...btnStyle, background: '#8b5cf6' }}><Check size={24} /></button>
      </div>

      {/* Image */}
      <div ref={containerEl} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        {imageSrc && (
          <div style={{
            position: 'relative',
            width: displaySize.width || 'auto',
            height: displaySize.height || 'auto',
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease',
          }}>
            <img
              src={imageSrc}
              onLoad={onImageLoad}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8, userSelect: 'none', pointerEvents: 'none' }}
              draggable={false}
            />
            {imageLoaded && (
              <>
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  <defs>
                    <mask id="cm">
                      <rect width="100%" height="100%" fill="white" />
                      <path ref={pathEl} fill="black" />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#cm)" />
                  <path ref={pathEl} fill="none" stroke="#8b5cf6" strokeWidth="2" />
                </svg>
                <Handle k="tl" />
                <Handle k="tr" />
                <Handle k="br" />
                <Handle k="bl" />
              </>
            )}
          </div>
        )}
        {!imageLoaded && <div style={{ color: '#666' }}>Loading...</div>}
      </div>

      {/* Controls */}
      <div style={{ padding: '16px 20px 40px', background: '#000' }}>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: 14, marginBottom: 16 }}>Drag corners to crop</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => rotate(-90)} style={rotBtn}><RotateCcw size={20} /><span>-90°</span></button>
          <button onClick={() => rotate(90)} style={rotBtn}><RotateCw size={20} /><span>+90°</span></button>
        </div>
        <button onClick={complete} style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          border: 'none',
          borderRadius: 12,
          padding: 16,
          color: '#fff',
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          <Check size={20} /> Continue
        </button>
      </div>
    </div>
  );
};

const btnStyle = {
  width: 44, height: 44, borderRadius: 22,
  background: 'rgba(255,255,255,0.1)',
  border: 'none', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};

const rotBtn = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  background: 'rgba(255,255,255,0.1)',
  border: 'none', borderRadius: 12, padding: '10px 20px',
  color: '#fff', fontSize: 11, cursor: 'pointer',
};

export default CropTool;
