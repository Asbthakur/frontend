/**
 * PDF to Images Converter - SIMPLE VERSION
 * Works without worker configuration issues
 * 
 * Usage:
 *   import { pdfToImages, isPDF } from './utils/pdfToImages';
 *   
 *   if (isPDF(file)) {
 *     const images = await pdfToImages(file);
 *   }
 */

// Import pdf.js with worker bundled
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url';

// Set worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Check if file is a PDF
 */
export const isPDF = (file) => {
  if (!file) return false;
  return file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
};

/**
 * Convert a single PDF page to image
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
      0.85
    );
  });
};

/**
 * Convert PDF file to array of image files
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
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = Math.min(pdf.numPages, maxPages);
    
    console.log(`[PDF] Total pages: ${pdf.numPages}, converting: ${totalPages}`);
    
    const images = [];
    
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const blob = await pageToImage(page, scale);
      
      const fileName = `${pdfFile.name.replace('.pdf', '')}_page_${i}.jpg`;
      const imageFile = new File([blob], fileName, { type: 'image/jpeg' });
      
      images.push(imageFile);
      
      if (onProgress) {
        onProgress(i, totalPages);
      }
      
      console.log(`[PDF] Page ${i}/${totalPages} → ${Math.round(blob.size / 1024)}KB`);
    }
    
    console.log(`[PDF] Done: ${images.length} images in ${Date.now() - startTime}ms`);
    return images;
    
  } catch (error) {
    console.error('[PDF] Error:', error);
    throw new Error(`PDF conversion failed: ${error.message}`);
  }
};

/**
 * Process multiple files (handles both images and PDFs)
 */
export const processFiles = async (files, options = {}) => {
  const allImages = [];
  
  for (const file of Array.from(files)) {
    if (isPDF(file)) {
      console.log(`[PDF] Processing PDF: ${file.name}`);
      const pdfImages = await pdfToImages(file, options);
      allImages.push(...pdfImages);
    } else if (file.type.startsWith('image/')) {
      console.log(`[Image] Keeping: ${file.name}`);
      allImages.push(file);
    } else {
      console.log(`[Skip] Unsupported: ${file.name} (${file.type})`);
    }
  }
  
  return allImages;
};

export default pdfToImages;
