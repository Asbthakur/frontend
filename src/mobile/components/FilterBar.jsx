/**
 * FilterBar.jsx
 * 
 * CamScanner-style filter selection with:
 * - Original
 * - Magic Color (auto-enhance)
 * - Black & White
 * - Grayscale
 * - Shadow Remove
 * - Brighten
 * - Sharpen
 * 
 * Shows preview thumbnails and applies filters in real-time.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import {
  Wand2,
  Sun,
  Moon,
  Contrast,
  Sparkles,
  CircleDot,
  Lightbulb,
  Check,
} from 'lucide-react';

// Filter definitions
const FILTERS = [
  {
    id: 'original',
    name: 'Original',
    icon: CircleDot,
    filter: null, // No filter
  },
  {
    id: 'magic',
    name: 'Magic',
    icon: Wand2,
    filter: {
      contrast: 1.2,
      brightness: 1.05,
      saturate: 1.1,
    },
    description: 'Auto-enhance',
  },
  {
    id: 'bw',
    name: 'B&W',
    icon: Moon,
    filter: {
      grayscale: 1,
      contrast: 1.3,
    },
    description: 'Black & White',
  },
  {
    id: 'grayscale',
    name: 'Gray',
    icon: Contrast,
    filter: {
      grayscale: 1,
    },
    description: 'Grayscale',
  },
  {
    id: 'shadow',
    name: 'No Shadow',
    icon: Sun,
    filter: {
      brightness: 1.15,
      contrast: 1.1,
    },
    description: 'Remove shadows',
  },
  {
    id: 'bright',
    name: 'Bright',
    icon: Lightbulb,
    filter: {
      brightness: 1.25,
    },
    description: 'Brighten',
  },
  {
    id: 'sharp',
    name: 'Sharp',
    icon: Sparkles,
    filter: {
      contrast: 1.15,
      brightness: 1.02,
    },
    description: 'Sharpen edges',
  },
];

const FilterBar = ({
  image,              // Image file or URL
  selectedFilter,     // Currently selected filter ID
  onFilterChange,     // Callback when filter changes
  onApply,           // Callback when user confirms filter
  showApplyButton = true,
}) => {
  const [activeFilter, setActiveFilter] = useState(selectedFilter || 'original');
  const [thumbnails, setThumbnails] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef(null);

  const isNative = Capacitor.isNativePlatform();

  /**
   * Convert CSS filter values to filter string
   */
  const getFilterString = (filterConfig) => {
    if (!filterConfig) return 'none';
    
    const parts = [];
    if (filterConfig.brightness) parts.push(`brightness(${filterConfig.brightness})`);
    if (filterConfig.contrast) parts.push(`contrast(${filterConfig.contrast})`);
    if (filterConfig.saturate) parts.push(`saturate(${filterConfig.saturate})`);
    if (filterConfig.grayscale) parts.push(`grayscale(${filterConfig.grayscale})`);
    if (filterConfig.sepia) parts.push(`sepia(${filterConfig.sepia})`);
    if (filterConfig.blur) parts.push(`blur(${filterConfig.blur}px)`);
    
    return parts.length > 0 ? parts.join(' ') : 'none';
  };

  /**
   * Generate thumbnail for a filter
   */
  const generateThumbnail = useCallback(async (filterId, filterConfig) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 60; // Thumbnail size
        
        // Calculate aspect ratio
        const aspectRatio = img.width / img.height;
        let width, height;
        
        if (aspectRatio > 1) {
          width = size;
          height = size / aspectRatio;
        } else {
          height = size;
          width = size * aspectRatio;
        }
        
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        
        // Fill background
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, size, size);
        
        // Apply filter
        ctx.filter = getFilterString(filterConfig);
        
        // Draw centered
        const x = (size - width) / 2;
        const y = (size - height) / 2;
        ctx.drawImage(img, x, y, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      
      img.onerror = () => {
        resolve(null);
      };
      
      img.src = typeof image === 'string' ? image : URL.createObjectURL(image);
    });
  }, [image]);

  /**
   * Generate all thumbnails
   */
  useEffect(() => {
    if (!image) return;

    const generateAllThumbnails = async () => {
      setIsGenerating(true);
      const newThumbnails = {};
      
      for (const filter of FILTERS) {
        const thumbnail = await generateThumbnail(filter.id, filter.filter);
        if (thumbnail) {
          newThumbnails[filter.id] = thumbnail;
        }
      }
      
      setThumbnails(newThumbnails);
      setIsGenerating(false);
    };

    generateAllThumbnails();
  }, [image, generateThumbnail]);

  /**
   * Handle filter selection
   */
  const handleFilterSelect = (filterId) => {
    setActiveFilter(filterId);
    
    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Light });
    }
    
    if (onFilterChange) {
      const filter = FILTERS.find(f => f.id === filterId);
      onFilterChange(filterId, filter?.filter || null);
    }
  };

  /**
   * Apply current filter
   */
  const handleApply = async () => {
    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Medium });
    }

    if (onApply) {
      const filter = FILTERS.find(f => f.id === activeFilter);
      onApply(activeFilter, filter?.filter || null);
    }
  };

  /**
   * Apply filter to full image and return blob
   */
  const applyFilterToImage = async (filterId) => {
    return new Promise((resolve) => {
      const filter = FILTERS.find(f => f.id === filterId);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.filter = getFilterString(filter?.filter);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.92);
      };
      
      img.src = typeof image === 'string' ? image : URL.createObjectURL(image);
    });
  };

  // Styles
  const styles = {
    container: {
      background: 'rgba(15, 23, 42, 0.95)',
      borderRadius: '20px 20px 0 0',
      padding: '20px',
      paddingBottom: '40px', // Safe area
    },

    // Title
    title: {
      color: '#f8fafc',
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '16px',
      textAlign: 'center',
    },

    // Filter list
    filterList: {
      display: 'flex',
      gap: '12px',
      overflowX: 'auto',
      paddingBottom: '8px',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      WebkitOverflowScrolling: 'touch',
    },

    // Filter item
    filterItem: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      flexShrink: 0,
      minWidth: '70px',
    },

    // Thumbnail container
    thumbnailContainer: {
      width: '60px',
      height: '60px',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '3px solid transparent',
      transition: 'all 0.2s ease',
      position: 'relative',
    },
    thumbnailContainerActive: {
      border: '3px solid #8b5cf6',
      boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
    },

    // Thumbnail image
    thumbnail: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    },

    // Thumbnail placeholder
    thumbnailPlaceholder: {
      width: '100%',
      height: '100%',
      background: '#334155',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Check badge
    checkBadge: {
      position: 'absolute',
      bottom: '4px',
      right: '4px',
      width: '20px',
      height: '20px',
      borderRadius: '10px',
      background: '#8b5cf6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Filter name
    filterName: {
      fontSize: '12px',
      fontWeight: '500',
      color: '#94a3b8',
      textAlign: 'center',
      transition: 'color 0.2s ease',
    },
    filterNameActive: {
      color: '#8b5cf6',
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
      marginTop: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },

    // Auto enhance button
    autoEnhanceBtn: {
      width: '100%',
      background: 'rgba(139, 92, 246, 0.2)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '12px',
      padding: '14px',
      color: '#a78bfa',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
  };

  return (
    <div style={styles.container}>
      {/* Title */}
      <h3 style={styles.title}>Choose Filter</h3>

      {/* Auto-enhance shortcut */}
      <button 
        style={styles.autoEnhanceBtn}
        onClick={() => handleFilterSelect('magic')}
      >
        <Wand2 style={{ width: '18px', height: '18px' }} />
        Auto Enhance
      </button>

      {/* Filter list */}
      <div style={styles.filterList}>
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.id;
          const Icon = filter.icon;
          
          return (
            <div
              key={filter.id}
              style={styles.filterItem}
              onClick={() => handleFilterSelect(filter.id)}
            >
              {/* Thumbnail */}
              <div
                style={{
                  ...styles.thumbnailContainer,
                  ...(isActive ? styles.thumbnailContainerActive : {}),
                }}
              >
                {thumbnails[filter.id] ? (
                  <img
                    src={thumbnails[filter.id]}
                    style={styles.thumbnail}
                    alt={filter.name}
                  />
                ) : (
                  <div style={styles.thumbnailPlaceholder}>
                    <Icon style={{ width: '20px', height: '20px', color: '#64748b' }} />
                  </div>
                )}
                
                {/* Check badge */}
                {isActive && (
                  <div style={styles.checkBadge}>
                    <Check style={{ width: '12px', height: '12px', color: '#fff' }} />
                  </div>
                )}
              </div>

              {/* Filter name */}
              <span
                style={{
                  ...styles.filterName,
                  ...(isActive ? styles.filterNameActive : {}),
                }}
              >
                {filter.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Apply button */}
      {showApplyButton && (
        <button style={styles.applyBtn} onClick={handleApply}>
          <Check style={{ width: '20px', height: '20px' }} />
          Apply Filter
        </button>
      )}

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

// Export filter utility functions
export const getFilterString = (filterConfig) => {
  if (!filterConfig) return 'none';
  
  const parts = [];
  if (filterConfig.brightness) parts.push(`brightness(${filterConfig.brightness})`);
  if (filterConfig.contrast) parts.push(`contrast(${filterConfig.contrast})`);
  if (filterConfig.saturate) parts.push(`saturate(${filterConfig.saturate})`);
  if (filterConfig.grayscale) parts.push(`grayscale(${filterConfig.grayscale})`);
  if (filterConfig.sepia) parts.push(`sepia(${filterConfig.sepia})`);
  
  return parts.length > 0 ? parts.join(' ') : 'none';
};

export const FILTER_CONFIGS = FILTERS;

export default FilterBar;
