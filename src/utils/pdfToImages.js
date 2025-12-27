/**
 * PDF to Images Converter
 * Converts PDF pages to images using pdf.js
 * 
 * Usage:
 *   import { pdfToImages, isPDF } from './utils/pdfToImages';
 *   
 *   if (isPDF(file)) {
 *     const images = await pdfToImages(file);
 *     // images is an array of File objects (JPEG)
 *   }
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set worker path - adjust based on your setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Check if file is a PDF
 * @param {File} file 
 * @returns {boolean}
 */
export const isPDF = (file) => {
  return file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');
};

/**
 * Convert a single PDF page to image
 * @param {PDFPageProxy} page - PDF.js page object
 * @param {number} scale - Scale factor (default 2 for good quality)
 * @returns {Promise<Blob>} - Image blob
 */
const pageToImage = async (page, scale = 2) => {
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  // White background
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;
  
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      'image/jpeg',
      0.85 // Quality
    );
  });
};

/**
 * Convert PDF file to array of image files
 * @param {File} pdfFile - PDF file
 * @param {Object} options - Options
 * @param {number} options.scale - Image scale (default: 2)
 * @param {number} options.maxPages - Max pages to convert (default: 20)
 * @param {function} options.onProgress - Progress callback (pageNum, totalPages)
 * @returns {Promise<File[]>} - Array of image files
 */
export const pdfToImages = async (pdfFile, options = {}) => {
  const { 
    scale = 2, 
    maxPages = 20,
    onProgress = null 
  } = options;
  
  console.log(`[PDF] Converting: ${pdfFile.name} (${Math.round(pdfFile.size / 1024)}KB)`);
  const startTime = Date.now();
  
  try {
    // Read PDF file
    const arrayBuffer = await pdfFile.arrayBuffer();
    
    // Load PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = Math.min(pdf.numPages, maxPages);
    
    console.log(`[PDF] Pages: ${pdf.numPages}, converting: ${totalPages}`);
    
    const images = [];
    
    for (let i = 1; i <= totalPages; i++) {
      // Get page
      const page = await pdf.getPage(i);
      
      // Convert to image
      const blob = await pageToImage(page, scale);
      
      // Create File object
      const fileName = `${pdfFile.name.replace('.pdf', '')}_page_${i}.jpg`;
      const imageFile = new File([blob], fileName, { type: 'image/jpeg' });
      
      images.push(imageFile);
      
      // Progress callback
      if (onProgress) {
        onProgress(i, totalPages);
      }
      
      console.log(`[PDF] Page ${i}/${totalPages} converted (${Math.round(blob.size / 1024)}KB)`);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`[PDF] Complete: ${images.length} images in ${totalTime}ms`);
    
    return images;
    
  } catch (error) {
    console.error('[PDF] Conversion error:', error);
    throw new Error(`Failed to convert PDF: ${error.message}`);
  }
};

/**
 * Convert multiple files (handles both images and PDFs)
 * @param {FileList|File[]} files - Array of files
 * @param {Object} options - Options for PDF conversion
 * @returns {Promise<File[]>} - Array of image files
 */
export const processFiles = async (files, options = {}) => {
  const allImages = [];
  
  for (const file of Array.from(files)) {
    if (isPDF(file)) {
      // Convert PDF to images
      const pdfImages = await pdfToImages(file, options);
      allImages.push(...pdfImages);
    } else if (file.type.startsWith('image/')) {
      // Keep image as-is
      allImages.push(file);
    }
  }
  
  return allImages;
};

export default pdfToImages;
