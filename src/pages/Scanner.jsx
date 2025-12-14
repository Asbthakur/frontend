import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ocrAPI } from '../services/api';
import { Capacitor } from '@capacitor/core';
import {
  Camera,
  Upload,
  X,
  Download,
  Copy,
  FileText,
  CheckCircle,
  AlertCircle,
  Globe,
  Loader,
  FileSpreadsheet,
  Sparkles,
  Clipboard,
  Plus,
  ChevronLeft,
  Check,
  Table,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

const Scanner = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const initialFiles = location.state?.files || [];
  const initialMode = searchParams.get('mode');
  
  // State
  const [mode, setMode] = useState('select');
  const [extractionType, setExtractionType] = useState(initialMode === 'tables' ? 'tables' : null);
  const [stream, setStream] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [translating, setTranslating] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [typingText, setTypingText] = useState('');
  
  const typingMessages = ['Analyzing your document...', 'Extracting content...', 'Processing with AI...', 'Almost done...'];
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Effects
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (initialFiles.length > 0) {
      setCapturedImages(initialFiles);
      setMode('choose-extraction');
    }
  }, []);

  useEffect(() => {
    return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
  }, [stream]);

  useEffect(() => {
    if (mode !== 'processing') return;
    let msgIdx = 0, charIdx = 0, deleting = false, timeout;
    const type = () => {
      const msg = typingMessages[msgIdx];
      if (!deleting) {
        setTypingText(msg.substring(0, charIdx + 1));
        charIdx++;
        if (charIdx === msg.length) { deleting = true; timeout = setTimeout(type, 1500); return; }
      } else {
        setTypingText(msg.substring(0, charIdx - 1));
        charIdx--;
        if (charIdx === 0) { deleting = false; msgIdx = (msgIdx + 1) % typingMessages.length; }
      }
      timeout = setTimeout(type, deleting ? 30 : 50);
    };
    timeout = setTimeout(type, 100);
    return () => clearTimeout(timeout);
  }, [mode]);

  // Helpers
  const getImageUrl = (img) => typeof img === 'string' ? img : URL.createObjectURL(img);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      setCapturedImages(prev => [...prev, ...files]);
      setMode('choose-extraction');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      setCapturedImages(prev => [...prev, ...files]);
      setMode('choose-extraction');
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setMode('camera');
    } catch { setError('Camera access denied'); }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current, canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => { setCapturedImages(prev => [...prev, blob]); setMode('choose-extraction'); }, 'image/jpeg', 0.9);
  };

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); }
    setMode('select');
  };

  const startNewScan = () => {
    setCapturedImages([]); setResult(null); setSummary(''); setSelectedLanguage('');
    setError(''); setExtractionType(null); setMode('select');
  };

  // Extract Text
  const extractText = async () => {
    if (capturedImages.length === 0) return;
    setExtractionType('text'); setProcessing(true); setMode('processing'); setProgress(0); setError('');
    
    let prog = 0;
    const interval = setInterval(() => { prog += Math.random() * 15; if (prog > 90) prog = 90; setProgress(Math.round(prog)); }, 200);
    
    try {
      const response = await ocrAPI.extractMultiple(capturedImages);
      clearInterval(interval); setProgress(100);
      if (response.success) {
        setResult({ ocr: { text: response.text, confidence: response.confidence || 98 }, tables: [], tableCount: 0 });
        setMode('result');
      } else throw new Error(response.error || 'Extraction failed');
    } catch (err) { setError(err.message); setMode('choose-extraction'); }
    finally { clearInterval(interval); setProcessing(false); setProgress(0); }
  };

  // Extract Tables
  const extractTables = async () => {
    if (capturedImages.length === 0) return;
    setExtractionType('tables'); setProcessing(true); setMode('processing'); setProgress(0); setError('');
    
    let prog = 0;
    const interval = setInterval(() => { prog += Math.random() * 8; if (prog > 85) prog = 85; setProgress(Math.round(prog)); }, 300);
    
    try {
      const response = await ocrAPI.extractWithTables(capturedImages[0]);
      clearInterval(interval); setProgress(100);
      
      console.log('=== TABLE API RESPONSE ===', response);
      
      if (response.success) {
        setResult({
          ocr: { text: response.text || '', confidence: response.confidence || 0 },
          tables: response.tables || [],
          tableCount: response.tableCount || 0,
          rawResponse: response // Store raw for debugging
        });
        setMode('result');
      } else throw new Error(response.error || 'Table extraction failed');
    } catch (err) { console.error('Table error:', err); setError(err.message); setMode('choose-extraction'); }
    finally { clearInterval(interval); setProcessing(false); setProgress(0); }
  };

  // Translation
  const translateText = async () => {
    if (!selectedLanguage || !result?.ocr?.text) return;
    setTranslating(true); setError('');
    try {
      const response = await ocrAPI.translate(result.ocr.text, selectedLanguage);
      if (response.success) setResult(prev => ({ ...prev, translation: response.translation }));
      else setError(response.message || 'Translation failed');
    } catch (err) { setError('Failed to translate'); }
    finally { setTranslating(false); }
  };

  // AI Explain - Uses translated language OR detects OCR language
  const generateExplanation = async () => {
    const text = result?.translation?.translatedText || result?.ocr?.text;
    if (!text) return;
    setSummarizing(true); setError('');
    try {
      // Determine target language for explanation
      let targetLanguage = 'en'; // Default English
      
      if (result?.translation?.targetLanguage) {
        // If translated, use translation language
        targetLanguage = result.translation.targetLanguage;
      } else if (result?.ocr?.detectedLanguage) {
        // If OCR detected language, use that
        targetLanguage = result.ocr.detectedLanguage;
      }
      
      // Pass language hint to API
      const response = await ocrAPI.summarize(text, targetLanguage);
      if (response.success) setSummary(response.summary);
      else setError('Failed to generate explanation');
    } catch { setError('Failed to generate explanation'); }
    finally { setSummarizing(false); }
  };

  // Export functions
  const copyText = async () => {
    try { await navigator.clipboard.writeText(result?.translation?.translatedText || result?.ocr?.text || ''); }
    catch { setError('Failed to copy'); }
  };

  const downloadText = () => {
    const text = result?.translation?.translatedText || result?.ocr?.text;
    if (!text) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = `scan_${Date.now()}.txt`;
    a.click();
  };

  const downloadTablesAsExcel = async () => {
    if (!result?.tables?.length) return;
    try {
      const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs');
      const wb = XLSX.utils.book_new();
      result.tables.forEach((t, i) => {
        if (t.data?.length) {
          const ws = XLSX.utils.aoa_to_sheet(t.data);
          XLSX.utils.book_append_sheet(wb, ws, `Table ${i + 1}`);
        }
      });
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = `tables_${Date.now()}.xlsx`;
      a.click();
    } catch (err) {
      console.error('Excel error:', err);
      // CSV fallback
      let csv = result.tables.map((t, i) => `Table ${i+1}\n` + (t.data||[]).map(r => r.map(c => `"${c}"`).join(',')).join('\n')).join('\n\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `tables_${Date.now()}.csv`;
      a.click();
    }
  };

  // ========== RENDER: TABLE COMPONENT ==========
  const TableDisplay = ({ tables }) => {
    if (!tables || tables.length === 0) {
      return <p style={{ color: 'white', padding: '20px' }}>No tables found</p>;
    }

    return (
      <div style={{ color: 'white' }}>
        {tables.map((table, idx) => {
          const data = table.data || [];
          
          if (!Array.isArray(data) || data.length === 0) {
            return (
              <div key={idx} style={{ marginBottom: '20px', padding: '10px', background: '#333', borderRadius: '8px' }}>
                <p>Table {idx + 1}: No data</p>
                <pre style={{ color: '#0f0', fontSize: '12px' }}>{JSON.stringify(table, null, 2)}</pre>
              </div>
            );
          }

          const headers = data[0] || [];
          const rows = data.slice(1);

          return (
            <div key={idx} style={{ marginBottom: '30px' }}>
              <h4 style={{ color: '#22d3ee', marginBottom: '10px', fontWeight: 'bold' }}>
                {table.title || `Table ${idx + 1}`} ({data.length} rows, {headers.length} columns)
              </h4>
              
              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #444' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e293b' }}>
                  <thead>
                    <tr style={{ background: '#7c3aed' }}>
                      {headers.map((h, i) => (
                        <th key={i} style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                          color: 'white', 
                          fontWeight: 'bold',
                          borderBottom: '2px solid #5b21b6'
                        }}>
                          {String(h || '')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIdx) => (
                      <tr key={rowIdx} style={{ background: rowIdx % 2 === 0 ? '#334155' : '#1e293b' }}>
                        {(Array.isArray(row) ? row : []).map((cell, cellIdx) => (
                          <td key={cellIdx} style={{ 
                            padding: '10px 16px', 
                            color: '#e2e8f0',
                            borderBottom: '1px solid #475569'
                          }}>
                            {String(cell ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Debug */}
              <details style={{ marginTop: '10px' }}>
                <summary style={{ color: '#888', cursor: 'pointer', fontSize: '12px' }}>View raw JSON</summary>
                <pre style={{ 
                  background: '#000', 
                  color: '#0f0', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  fontSize: '11px',
                  maxHeight: '200px',
                  overflow: 'auto',
                  marginTop: '5px'
                }}>
                  {JSON.stringify(table, null, 2)}
                </pre>
              </details>
            </div>
          );
        })}
      </div>
    );
  };

  // ========== RENDER MODES ==========

  const renderSelect = () => (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
          AI Document Scanner
        </h1>
        <p style={{ color: '#9ca3af' }}>Scan multiple pages, create PDF & extract text</p>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          background: isDragging ? 'rgba(139, 92, 246, 0.2)' : 'rgba(55, 65, 81, 0.5)',
          border: `2px dashed ${isDragging ? '#8b5cf6' : '#6b7280'}`,
          borderRadius: '16px',
          padding: '50px 30px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
        
        <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Upload style={{ width: '32px', height: '32px', color: 'white' }} />
        </div>
        
        <p style={{ fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '8px' }}>Drag & Drop images here</p>
        <p style={{ color: '#9ca3af', marginBottom: '20px' }}>You can select multiple images at once</p>
        
        <button style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
          Browse Files
        </button>
        
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '20px' }}>Supports: JPG, PNG, WEBP</p>
      </div>

      {isMobile && (
        <button onClick={startCamera} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: 'white', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
          <Camera style={{ width: '24px', height: '24px' }} />
          Open Camera
        </button>
      )}
    </div>
  );

  const renderChooseExtraction = () => (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>What do you want to extract?</h1>
        <p style={{ color: '#9ca3af' }}>{capturedImages.length} image(s) ready</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '16px', background: 'rgba(55, 65, 81, 0.3)', borderRadius: '12px', marginBottom: '32px' }}>
        {capturedImages.map((img, i) => (
          <div key={i} style={{ position: 'relative', flexShrink: 0, width: '80px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #4b5563' }}>
            <img src={getImageUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>{i + 1}</span>
          </div>
        ))}
        <button onClick={() => fileInputRef.current?.click()} style={{ flexShrink: 0, width: '80px', height: '100px', border: '2px dashed #6b7280', borderRadius: '8px', background: 'transparent', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus style={{ width: '24px', height: '24px' }} />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: 'none' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button onClick={extractText} style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(55, 65, 81, 0.5)', border: '1px solid #4b5563', borderRadius: '16px', padding: '24px', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText style={{ width: '28px', height: '28px', color: 'white' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>Extract Text</h3>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '8px' }}>Fast text extraction using AI OCR</p>
            <span style={{ display: 'inline-block', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>⚡ ~1 second</span>
          </div>
          <ArrowRight style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
        </button>

        <button onClick={extractTables} style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(55, 65, 81, 0.5)', border: '1px solid #4b5563', borderRadius: '16px', padding: '24px', cursor: 'pointer', textAlign: 'left' }}>
          <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Table style={{ width: '28px', height: '28px', color: 'white' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>Extract Tables</h3>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '8px' }}>AI-powered table detection & Excel export</p>
            <span style={{ display: 'inline-block', background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>🤖 AI Processing</span>
          </div>
          <ArrowRight style={{ width: '20px', height: '20px', color: '#9ca3af' }} />
        </button>
      </div>

      <button onClick={startNewScan} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#9ca3af', marginTop: '24px', cursor: 'pointer' }}>
        <ChevronLeft style={{ width: '16px', height: '16px' }} /> Start Over
      </button>
    </div>
  );

  const renderProcessing = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ background: 'rgba(55, 65, 81, 0.5)', border: '1px solid #4b5563', borderRadius: '24px', padding: '50px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <div style={{ width: '60px', height: '60px', border: '4px solid rgba(139, 92, 246, 0.3)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>
          {extractionType === 'tables' ? 'Extracting Tables...' : 'Extracting Text...'}
        </h2>
        <p style={{ color: '#9ca3af', height: '24px', marginBottom: '24px' }}>{typingText}<span style={{ color: '#8b5cf6' }}>|</span></p>
        <div style={{ height: '8px', background: '#374151', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', borderRadius: '4px', transition: 'width 0.3s', width: `${progress}%` }}></div>
        </div>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>{progress}%</p>
      </div>
    </div>
  );

  const renderResults = () => (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
          <CheckCircle style={{ width: '28px', height: '28px', color: '#10b981' }} />
          Extraction Complete
        </h2>
        <button onClick={startNewScan} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
          <Camera style={{ width: '20px', height: '20px' }} /> New Scan
        </button>
      </div>

      {/* Debug: Raw result */}
      <details style={{ marginBottom: '20px' }}>
        <summary style={{ color: '#f59e0b', cursor: 'pointer', fontWeight: 'bold' }}>🔧 DEBUG: View full result object</summary>
        <pre style={{ background: '#000', color: '#0f0', padding: '15px', borderRadius: '8px', fontSize: '12px', overflow: 'auto', maxHeight: '300px', marginTop: '10px' }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>

      {/* TEXT Results */}
      {extractionType === 'text' && result?.ocr?.text && (
        <div style={{ background: 'rgba(55, 65, 81, 0.5)', border: '1px solid #4b5563', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '600', color: 'white' }}>
              <FileText style={{ width: '20px', height: '20px', color: '#8b5cf6' }} /> Extracted Text
            </h3>
            <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '4px 12px', borderRadius: '20px', fontSize: '14px' }}>
              {result.ocr.confidence}% accuracy
            </span>
          </div>
          <textarea value={result.ocr.text} readOnly style={{ width: '100%', height: '200px', background: 'rgba(0,0,0,0.3)', border: '1px solid #4b5563', borderRadius: '12px', padding: '16px', color: '#e5e7eb', fontFamily: 'monospace', fontSize: '14px', resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button onClick={copyText} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#374151', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              <Copy style={{ width: '16px', height: '16px' }} /> Copy
            </button>
            <button onClick={downloadText} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#374151', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              <Download style={{ width: '16px', height: '16px' }} /> TXT
            </button>
          </div>
        </div>
      )}

      {/* TABLE Results */}
      {extractionType === 'tables' && (
        <div style={{ background: 'rgba(55, 65, 81, 0.5)', border: '1px solid #4b5563', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '20px' }}>
            <Table style={{ width: '20px', height: '20px', color: '#06b6d4' }} /> 
            Extracted Tables ({result?.tables?.length || 0})
          </h3>
          
          <TableDisplay tables={result?.tables} />
          
          {result?.tables?.length > 0 && (
            <button onClick={downloadTablesAsExcel} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer', marginTop: '20px' }}>
              <FileSpreadsheet style={{ width: '20px', height: '20px' }} /> Download as Excel
            </button>
          )}
        </div>
      )}

      {/* Translation */}
      {extractionType === 'text' && result?.ocr?.text && (
        <div style={{ background: 'rgba(55, 65, 81, 0.5)', border: '1px solid #4b5563', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>
            <Globe style={{ width: '20px', height: '20px', color: '#06b6d4' }} /> Translate
          </h3>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} style={{ flex: 1, minWidth: '200px', background: '#1f2937', border: '1px solid #4b5563', borderRadius: '12px', padding: '12px 16px', color: 'white', fontSize: '14px' }}>
              <option value="">Select language...</option>
              
              <optgroup label="🇮🇳 Indian Languages">
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
                <option value="as">Assamese (অসমীয়া)</option>
                <option value="ur">Urdu (اردو)</option>
                <option value="sa">Sanskrit (संस्कृतम्)</option>
                <option value="ne">Nepali (नेपाली)</option>
                <option value="si">Sinhala (සිංහල)</option>
              </optgroup>
              
              <optgroup label="🌍 European Languages">
                <option value="en">English</option>
                <option value="es">Spanish (Español)</option>
                <option value="fr">French (Français)</option>
                <option value="de">German (Deutsch)</option>
                <option value="it">Italian (Italiano)</option>
                <option value="pt">Portuguese (Português)</option>
                <option value="ru">Russian (Русский)</option>
                <option value="pl">Polish (Polski)</option>
                <option value="nl">Dutch (Nederlands)</option>
                <option value="sv">Swedish (Svenska)</option>
                <option value="da">Danish (Dansk)</option>
                <option value="no">Norwegian (Norsk)</option>
                <option value="fi">Finnish (Suomi)</option>
                <option value="el">Greek (Ελληνικά)</option>
                <option value="cs">Czech (Čeština)</option>
                <option value="ro">Romanian (Română)</option>
                <option value="hu">Hungarian (Magyar)</option>
                <option value="uk">Ukrainian (Українська)</option>
              </optgroup>
              
              <optgroup label="🌏 Asian Languages">
                <option value="zh">Chinese Simplified (简体中文)</option>
                <option value="zh-TW">Chinese Traditional (繁體中文)</option>
                <option value="ja">Japanese (日本語)</option>
                <option value="ko">Korean (한국어)</option>
                <option value="th">Thai (ไทย)</option>
                <option value="vi">Vietnamese (Tiếng Việt)</option>
                <option value="id">Indonesian (Bahasa Indonesia)</option>
                <option value="ms">Malay (Bahasa Melayu)</option>
                <option value="fil">Filipino (Tagalog)</option>
                <option value="my">Myanmar (မြန်မာ)</option>
                <option value="km">Khmer (ខ្មែរ)</option>
                <option value="lo">Lao (ລາວ)</option>
              </optgroup>
              
              <optgroup label="🌍 Middle Eastern Languages">
                <option value="ar">Arabic (العربية)</option>
                <option value="fa">Persian (فارسی)</option>
                <option value="he">Hebrew (עברית)</option>
                <option value="tr">Turkish (Türkçe)</option>
              </optgroup>
              
              <optgroup label="🌍 African Languages">
                <option value="sw">Swahili (Kiswahili)</option>
                <option value="am">Amharic (አማርኛ)</option>
                <option value="ha">Hausa</option>
                <option value="yo">Yoruba</option>
                <option value="zu">Zulu (isiZulu)</option>
                <option value="af">Afrikaans</option>
              </optgroup>
            </select>
            <button onClick={translateText} disabled={!selectedLanguage || translating} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: 'white', padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer', opacity: (!selectedLanguage || translating) ? 0.5 : 1 }}>
              {translating ? <Loader style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> : <Globe style={{ width: '20px', height: '20px' }} />}
              {translating ? 'Translating...' : 'Translate'}
            </button>
          </div>
          {result?.translation?.translatedText && (
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '12px', padding: '16px' }}>
              <p style={{ color: '#06b6d4', fontSize: '14px', marginBottom: '8px' }}>✓ Translated</p>
              <p style={{ color: '#e5e7eb', whiteSpace: 'pre-wrap' }}>{result.translation.translatedText}</p>
            </div>
          )}
        </div>
      )}

      {/* AI Explain */}
      {extractionType === 'text' && result?.ocr?.text && (
        <div style={{ background: 'rgba(55, 65, 81, 0.5)', border: '1px solid #4b5563', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '600', color: 'white', marginBottom: '16px' }}>
            <MessageSquare style={{ width: '20px', height: '20px', color: '#f59e0b' }} /> Ask AngelPDF to Explain
          </h3>
          <button onClick={generateExplanation} disabled={summarizing} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#374151', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer', opacity: summarizing ? 0.5 : 1 }}>
            {summarizing ? <Loader style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> : <Sparkles style={{ width: '20px', height: '20px' }} />}
            {summarizing ? 'Generating...' : 'Explain Content'}
          </button>
          {summary && (
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
              <p style={{ color: '#e5e7eb', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{summary}</p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px', color: '#f87171' }}>
          <AlertCircle style={{ width: '20px', height: '20px', flexShrink: 0 }} />
          <p>{error}</p>
        </div>
      )}
    </div>
  );

  const renderCamera = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 1000 }}>
      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div style={{ position: 'absolute', bottom: '40px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '40px', alignItems: 'center' }}>
        <button onClick={stopCamera} style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer' }}>
          <X style={{ width: '24px', height: '24px' }} />
        </button>
        <button onClick={capturePhoto} style={{ width: '80px', height: '80px', background: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer' }}></button>
        <div style={{ width: '50px', color: 'white', textAlign: 'center' }}>{capturedImages.length || ''}</div>
      </div>
      {capturedImages.length > 0 && (
        <button onClick={() => { stopCamera(); setMode('choose-extraction'); }} style={{ position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '8px', background: '#8b5cf6', color: 'white', padding: '14px 28px', borderRadius: '30px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
          <Check style={{ width: '20px', height: '20px' }} /> Done ({capturedImages.length})
        </button>
      )}
    </div>
  );

  // Main render
  return (
    <div style={{ minHeight: '100vh', background: '#111827', color: 'white', padding: '24px', paddingBottom: '100px' }}>
      {mode === 'select' && renderSelect()}
      {mode === 'choose-extraction' && renderChooseExtraction()}
      {mode === 'camera' && renderCamera()}
      {mode === 'processing' && renderProcessing()}
      {mode === 'result' && renderResults()}
    </div>
  );
};

export default Scanner;
