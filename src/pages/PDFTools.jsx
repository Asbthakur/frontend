import React, { useState, useRef } from 'react';
import { pdfAPI } from '../services/api';
import {
  FileText,
  Upload,
  Download,
  Loader,
  AlertCircle,
  CheckCircle,
  Scissors,
  Maximize2,
  RotateCw,
  Copy,
  Image as ImageIcon,
  Info,
  X,
} from 'lucide-react';

const PDFTools = () => {
  const [activeTab, setActiveTab] = useState('merge');
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [options, setOptions] = useState({
    pages: '',
    degrees: 90,
  });
  
  const fileInputRef = useRef(null);
  
  const tabs = [
    { id: 'merge', name: 'Merge PDFs', icon: Copy },
    { id: 'split', name: 'Split PDF', icon: Scissors },
    { id: 'compress', name: 'Compress', icon: Maximize2 },
    { id: 'rotate', name: 'Rotate', icon: RotateCw },
    { id: 'extract', name: 'Extract Pages', icon: FileText },
    { id: 'images', name: 'Images to PDF', icon: ImageIcon },
    { id: 'info', name: 'PDF Info', icon: Info },
  ];
  
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Validate based on tab
    if (activeTab === 'images') {
      // Only images
      const validFiles = selectedFiles.filter(f => f.type.startsWith('image/'));
      if (validFiles.length !== selectedFiles.length) {
        setError('Please select only image files');
        return;
      }
      if (validFiles.length > 20) {
        setError('Maximum 20 images allowed');
        return;
      }
    } else {
      // Only PDFs
      const validFiles = selectedFiles.filter(f => f.type === 'application/pdf');
      if (validFiles.length !== selectedFiles.length) {
        setError('Please select only PDF files');
        return;
      }
      if (activeTab === 'merge' && validFiles.length > 10) {
        setError('Maximum 10 PDFs allowed');
        return;
      }
      if (activeTab !== 'merge' && validFiles.length > 1) {
        setError('Please select only one PDF file');
        return;
      }
    }
    
    setFiles(selectedFiles);
    setError('');
    setResult(null);
  };
  
  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };
  
  const processTool = async () => {
    if (files.length === 0) {
      setError('Please select file(s)');
      return;
    }
    
    setProcessing(true);
    setProgress(0);
    setError('');
    setResult(null);
    
    try {
      let response;
      
      const onProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setProgress(percentCompleted);
      };
      
      switch (activeTab) {
        case 'merge':
          response = await pdfAPI.mergePDFs(files, onProgress);
          break;
          
        case 'split':
          response = await pdfAPI.splitPDF(files[0], onProgress);
          break;
          
        case 'compress':
          response = await pdfAPI.compressPDF(files[0], onProgress);
          break;
          
        case 'rotate':
          response = await pdfAPI.rotatePDF(files[0], options.degrees, onProgress);
          break;
          
        case 'extract':
          if (!options.pages) {
            setError('Please enter page numbers (e.g., 1,3,5-7)');
            setProcessing(false);
            return;
          }
          response = await pdfAPI.extractPages(files[0], options.pages, onProgress);
          break;
          
        case 'images':
          response = await pdfAPI.imagesToPDF(files, onProgress);
          break;
          
        case 'info':
          response = await pdfAPI.getPDFInfo(files[0], onProgress);
          break;
          
        default:
          throw new Error('Invalid tool');
      }
      
      if (response.success) {
        setResult(response);
      } else {
        setError(response.message || 'Operation failed');
      }
    } catch (err) {
      console.error('PDF tool error:', err);
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };
  
  const downloadResult = (pdfData, filename = 'result.pdf') => {
    // Create blob from base64
    const byteCharacters = atob(pdfData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    
    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const reset = () => {
    setFiles([]);
    setResult(null);
    setError('');
    setOptions({ pages: '', degrees: 90 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const renderToolContent = () => {
    switch (activeTab) {
      case 'merge':
        return (
          <div>
            <h3 className="font-bold text-lg mb-2">Merge Multiple PDFs</h3>
            <p className="text-gray-600 mb-4">
              Combine up to 10 PDF files into a single document
            </p>
          </div>
        );
        
      case 'split':
        return (
          <div>
            <h3 className="font-bold text-lg mb-2">Split PDF into Pages</h3>
            <p className="text-gray-600 mb-4">
              Extract each page as a separate PDF file
            </p>
          </div>
        );
        
      case 'compress':
        return (
          <div>
            <h3 className="font-bold text-lg mb-2">Compress PDF</h3>
            <p className="text-gray-600 mb-4">
              Reduce PDF file size by 40-60% without losing quality
            </p>
          </div>
        );
        
      case 'rotate':
        return (
          <div>
            <h3 className="font-bold text-lg mb-2">Rotate PDF Pages</h3>
            <p className="text-gray-600 mb-4">
              Rotate all pages in the PDF by 90°, 180°, or 270°
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Rotation Angle</label>
              <select
                value={options.degrees}
                onChange={(e) => setOptions({ ...options, degrees: parseInt(e.target.value) })}
                className="input-field"
              >
                <option value={90}>90° Clockwise</option>
                <option value={180}>180° (Upside Down)</option>
                <option value={270}>270° Counter-Clockwise</option>
              </select>
            </div>
          </div>
        );
        
      case 'extract':
        return (
          <div>
            <h3 className="font-bold text-lg mb-2">Extract Specific Pages</h3>
            <p className="text-gray-600 mb-4">
              Extract selected pages from PDF
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Page Numbers (e.g., 1,3,5-7)
              </label>
              <input
                type="text"
                value={options.pages}
                onChange={(e) => setOptions({ ...options, pages: e.target.value })}
                placeholder="1,3,5-7"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Separate pages with commas, use dash for ranges
              </p>
            </div>
          </div>
        );
        
      case 'images':
        return (
          <div>
            <h3 className="font-bold text-lg mb-2">Convert Images to PDF</h3>
            <p className="text-gray-600 mb-4">
              Combine up to 20 images into a single PDF document
            </p>
          </div>
        );
        
      case 'info':
        return (
          <div>
            <h3 className="font-bold text-lg mb-2">PDF Information</h3>
            <p className="text-gray-600 mb-4">
              View PDF metadata, page count, and properties
            </p>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-title">PDF Tools</h1>
        <p className="text-gray-600">
          Professional PDF editing tools at your fingertips
        </p>
      </div>
      
      {/* Tabs */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex space-x-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  reset();
                }}
                className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Tool Content */}
      <div className="max-w-3xl mx-auto">
        <div className="card">
          {renderToolContent()}
          
          {/* File Upload Area */}
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              accept={activeTab === 'images' ? 'image/*' : 'application/pdf'}
              multiple={activeTab === 'merge' || activeTab === 'images'}
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {files.length === 0 ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-12 hover:border-primary-500 hover:bg-primary-50 transition-colors text-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="font-medium text-gray-700 mb-1">
                  Click to upload {activeTab === 'images' ? 'images' : 'PDF'}
                </p>
                <p className="text-sm text-gray-500">
                  {activeTab === 'merge' && 'Up to 10 PDF files'}
                  {activeTab === 'images' && 'Up to 20 image files'}
                  {!['merge', 'images'].includes(activeTab) && 'Single PDF file'}
                </p>
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">
                    {files.length} file(s) selected
                  </span>
                  <button
                    onClick={reset}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="ml-2 p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 w-full btn-outline text-sm"
                >
                  Add More Files
                </button>
              </div>
            )}
          </div>
          
          {/* Process Button */}
          {files.length > 0 && !result && (
            <button
              onClick={processTool}
              disabled={processing}
              className="btn-primary w-full"
            >
              {processing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Processing... {progress}%</span>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  <span>Process {tabs.find(t => t.id === activeTab)?.name}</span>
                </>
              )}
            </button>
          )}
          
          {/* Progress Bar */}
          {processing && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Error */}
          {error && (
            <div className="mt-4 card bg-red-50 border-red-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}
          
          {/* Results */}
          {result && (
            <div className="mt-6">
              <div className="card bg-green-50 border-green-200 mb-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">
                      Operation Completed!
                    </p>
                    <p className="text-sm text-green-700">
                      {activeTab === 'info' ? 'PDF information retrieved' : 'Your file(s) are ready'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* PDF Info Display */}
              {activeTab === 'info' && result.info && (
                <div className="space-y-3 mb-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Pages:</span>
                    <span className="ml-2 font-medium">{result.info.pageCount}</span>
                  </div>
                  {result.info.metadata?.title && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Title:</span>
                      <span className="ml-2 font-medium">{result.info.metadata.title}</span>
                    </div>
                  )}
                  {result.info.metadata?.author && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Author:</span>
                      <span className="ml-2 font-medium">{result.info.metadata.author}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Download Buttons */}
              {activeTab !== 'info' && (
                <div>
                  {activeTab === 'split' && result.pdfs ? (
                    <div className="space-y-2">
                      {result.pdfs.map((pdf, index) => (
                        <button
                          key={index}
                          onClick={() => downloadResult(pdf, `page_${index + 1}.pdf`)}
                          className="btn-primary w-full"
                        >
                          <Download className="w-5 h-5" />
                          <span>Download Page {index + 1}</span>
                        </button>
                      ))}
                    </div>
                  ) : result.pdf ? (
                    <button
                      onClick={() => downloadResult(result.pdf, `${activeTab}_result.pdf`)}
                      className="btn-primary w-full"
                    >
                      <Download className="w-5 h-5" />
                      <span>Download PDF</span>
                    </button>
                  ) : null}
                </div>
              )}
              
              {/* New Operation Button */}
              <button
                onClick={reset}
                className="btn-outline w-full mt-3"
              >
                Process Another File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFTools;
