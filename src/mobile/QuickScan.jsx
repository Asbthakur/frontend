/**
 * QuickScan.jsx - Feature 1: Quick Scan & Translate
 * 
 * Flow: Camera → Crop → Process → Results
 * 
 * Each section has its own COPY button
 * Larger text areas for better readability
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ocrAPI } from '../services/api';
import CameraScanner from './components/CameraScanner';
import CropTool from './components/CropTool';
import {
  ArrowLeft,
  Camera,
  Upload,
  Globe,
  Sparkles,
  Copy,
  Check,
  Loader,
  AlertCircle,
  RotateCcw,
  Share2,
  Download,
  FileText,
} from 'lucide-react';

// Languages
const LANGUAGES = [
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', name: 'Malayalam (മലയാളം)' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'zh', name: 'Chinese (中文)' },
  { code: 'ja', name: 'Japanese (日本語)' },
  { code: 'ko', name: 'Korean (한국어)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'ru', name: 'Russian (Русский)' },
  { code: 'pt', name: 'Portuguese (Português)' },
  { code: 'it', name: 'Italian (Italiano)' },
];

const STEPS = { SELECT: 1, CAMERA: 2, CROP: 3, PROCESSING: 4, RESULT: 5 };

const QuickScan = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  // Flow
  const [step, setStep] = useState(STEPS.SELECT);
  const [capturedImage, setCapturedImage] = useState(null);
  
  // Processing
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState(null);

  // Results
  const [extractedText, setExtractedText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [translatedText, setTranslatedText] = useState('');
  const [explanation, setExplanation] = useState('');

  // UI
  const [selectedLang, setSelectedLang] = useState('');
  const [translating, setTranslating] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [copiedSection, setCopiedSection] = useState('');

  // File upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCapturedImage(file);
      setStep(STEPS.CROP);
    }
  };

  // Camera complete
  const handleCameraComplete = (images) => {
    if (images?.[0]) {
      setCapturedImage(images[0]);
      setStep(STEPS.CROP);
    }
  };

  // Crop complete → Process
  const handleCropComplete = async (data) => {
    setStep(STEPS.PROCESSING);
    setProgress(0);
    setStatusText('Uploading...');
    setError(null);

    try {
      // Animate progress
      setProgress(20);
      setStatusText('Extracting text...');
      
      const response = await ocrAPI.extractText(data.image || capturedImage);
      
      setProgress(90);
      setStatusText('Almost done...');
      
      await new Promise(r => setTimeout(r, 300));
      setProgress(100);

      if (response.success) {
        setExtractedText(response.text || '');
        setConfidence(response.confidence || 95);
        setStep(STEPS.RESULT);
      } else {
        throw new Error(response.error || 'OCR failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to extract text');
      setStep(STEPS.SELECT);
    }
  };

  // Translate
  const handleTranslate = async () => {
    if (!selectedLang || !extractedText) return;
    setTranslating(true);
    setError(null);

    try {
      const response = await ocrAPI.translate(extractedText, selectedLang);
      if (response.success) {
        setTranslatedText(response.translation?.translatedText || '');
      } else {
        throw new Error('Translation failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTranslating(false);
    }
  };

  // AI Explain
  const handleExplain = async () => {
    const text = translatedText || extractedText;
    if (!text) return;
    setExplaining(true);
    setError(null);

    try {
      const response = await ocrAPI.summarize(text);
      if (response.success) {
        setExplanation(response.summary || '');
      } else {
        throw new Error('Explanation failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExplaining(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async (text, section) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(''), 2000);
      if (navigator.vibrate) navigator.vibrate(30);
    } catch (err) {
      console.error('Copy failed');
    }
  };

  // Share all
  const handleShare = async () => {
    let text = `📝 Extracted:\n${extractedText}`;
    if (translatedText) text += `\n\n🌐 Translation:\n${translatedText}`;
    if (explanation) text += `\n\n🤖 AI Explanation:\n${explanation}`;
    text += '\n\n— AngelPDF';

    try {
      if (navigator.share) {
        await navigator.share({ title: 'AngelPDF Scan', text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopiedSection('all');
        setTimeout(() => setCopiedSection(''), 2000);
      }
    } catch (err) {}
  };

  // Download
  const handleDownload = () => {
    let content = `EXTRACTED TEXT\n${'='.repeat(40)}\n${extractedText}`;
    if (translatedText) content += `\n\nTRANSLATION\n${'='.repeat(40)}\n${translatedText}`;
    if (explanation) content += `\n\nAI EXPLANATION\n${'='.repeat(40)}\n${explanation}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `scan_${Date.now()}.txt`;
    a.click();
  };

  // New scan
  const handleNewScan = () => {
    setCapturedImage(null);
    setExtractedText('');
    setTranslatedText('');
    setExplanation('');
    setSelectedLang('');
    setError(null);
    setStep(STEPS.SELECT);
  };

  // ============ RENDERS ============

  // Select screen
  const renderSelect = () => (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/mobile')}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={styles.title}>Quick Scan</h1>
        <div style={{ width: 44 }} />
      </div>

      <div style={styles.content}>
        <div style={styles.hero}>
          <div style={styles.heroIcon}>
            <Camera size={36} color="#fff" />
          </div>
          <h2 style={styles.heroTitle}>Scan & Translate</h2>
          <p style={styles.heroSub}>Take a photo, extract text, translate instantly</p>
        </div>

        <div style={styles.options}>
          <button style={styles.optionBtn} onClick={() => setStep(STEPS.CAMERA)}>
            <div style={{ ...styles.optionIcon, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
              <Camera size={28} color="#fff" />
            </div>
            <span style={styles.optionTitle}>Camera</span>
            <span style={styles.optionSub}>Take photo</span>
          </button>

          <button style={styles.optionBtn} onClick={() => fileRef.current?.click()}>
            <div style={{ ...styles.optionIcon, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
              <Upload size={28} color="#fff" />
            </div>
            <span style={styles.optionTitle}>Gallery</span>
            <span style={styles.optionSub}>Upload image</span>
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );

  // Processing screen
  const renderProcessing = () => (
    <div style={styles.container}>
      <div style={styles.processingBox}>
        <div style={styles.spinner}>
          <FileText size={32} color="#8b5cf6" />
        </div>
        <h2 style={styles.processingTitle}>{statusText}</h2>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <span style={styles.progressText}>{progress}%</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Results screen
  const renderResult = () => (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={handleNewScan}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={styles.title}>Results</h1>
        <button style={{ ...styles.backBtn, background: '#8b5cf6' }} onClick={handleNewScan}>
          <RotateCcw size={20} />
        </button>
      </div>

      <div style={styles.resultContent}>
        {/* SECTION 1: Extracted Text */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionLeft}>
              <span style={styles.sectionEmoji}>📝</span>
              <span style={styles.sectionTitle}>Extracted Text</span>
              <span style={styles.badge}>{confidence}%</span>
            </div>
            <button 
              style={styles.copyBtn} 
              onClick={() => handleCopy(extractedText, 'extract')}
            >
              {copiedSection === 'extract' ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              <span>{copiedSection === 'extract' ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <textarea
            style={styles.textArea}
            value={extractedText}
            readOnly
            placeholder="No text extracted"
          />
        </div>

        {/* SECTION 2: Translation */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionLeft}>
              <span style={styles.sectionEmoji}>🌐</span>
              <span style={styles.sectionTitle}>Translation</span>
            </div>
            {translatedText && (
              <button 
                style={styles.copyBtn} 
                onClick={() => handleCopy(translatedText, 'translate')}
              >
                {copiedSection === 'translate' ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                <span>{copiedSection === 'translate' ? 'Copied!' : 'Copy'}</span>
              </button>
            )}
          </div>
          
          <div style={styles.translateRow}>
            <select
              style={styles.select}
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
            >
              <option value="">Select language...</option>
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
            <button
              style={{ ...styles.actionBtn, opacity: (!selectedLang || translating) ? 0.5 : 1 }}
              onClick={handleTranslate}
              disabled={!selectedLang || translating}
            >
              {translating ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={18} />}
            </button>
          </div>

          {translatedText && (
            <textarea
              style={styles.textArea}
              value={translatedText}
              readOnly
            />
          )}
        </div>

        {/* SECTION 3: AI Explain */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionLeft}>
              <span style={styles.sectionEmoji}>🤖</span>
              <span style={styles.sectionTitle}>AI Explanation</span>
            </div>
            {explanation && (
              <button 
                style={styles.copyBtn} 
                onClick={() => handleCopy(explanation, 'explain')}
              >
                {copiedSection === 'explain' ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                <span>{copiedSection === 'explain' ? 'Copied!' : 'Copy'}</span>
              </button>
            )}
          </div>

          {!explanation ? (
            <button
              style={{ ...styles.explainBtn, opacity: explaining ? 0.5 : 1 }}
              onClick={handleExplain}
              disabled={explaining}
            >
              {explaining ? (
                <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Sparkles size={20} />
              )}
              <span>{explaining ? 'Generating...' : 'Explain This'}</span>
            </button>
          ) : (
            <div style={styles.explanationBox}>
              <p style={styles.explanationText}>{explanation}</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Export buttons */}
        <div style={styles.exportSection}>
          <button style={styles.exportBtn} onClick={handleShare}>
            <Share2 size={20} />
            <span>Share All</span>
          </button>
          <button style={styles.exportBtn} onClick={handleDownload}>
            <Download size={20} />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Main render
  return (
    <>
      {step === STEPS.SELECT && renderSelect()}
      {step === STEPS.CAMERA && (
        <CameraScanner
          onComplete={handleCameraComplete}
          onClose={() => setStep(STEPS.SELECT)}
          batchMode={false}
        />
      )}
      {step === STEPS.CROP && capturedImage && (
        <CropTool
          image={capturedImage}
          onComplete={handleCropComplete}
          onCancel={() => setStep(STEPS.SELECT)}
        />
      )}
      {step === STEPS.PROCESSING && renderProcessing()}
      {step === STEPS.RESULT && renderResult()}
    </>
  );
};

// ============ STYLES ============
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    color: '#fff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    paddingTop: 48,
    background: 'rgba(15,23,42,0.95)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 12,
    background: 'rgba(255,255,255,0.1)',
    border: 'none', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  title: { fontSize: 18, fontWeight: 600 },
  content: { padding: '24px 20px', paddingBottom: 100 },
  
  // Hero
  hero: { textAlign: 'center', marginBottom: 32 },
  heroIcon: {
    width: 72, height: 72, borderRadius: 20,
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 8px 32px rgba(139,92,246,0.3)',
  },
  heroTitle: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
  heroSub: { fontSize: 14, color: '#94a3b8' },

  // Options
  options: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 },
  optionBtn: {
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16, padding: '24px 16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    cursor: 'pointer', color: '#fff',
  },
  optionIcon: { width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 16, fontWeight: 600 },
  optionSub: { fontSize: 12, color: '#64748b' },

  // Processing
  processingBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: 40,
  },
  spinner: {
    width: 72, height: 72, borderRadius: '50%',
    border: '3px solid rgba(139,92,246,0.2)',
    borderTopColor: '#8b5cf6',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    animation: 'spin 1s linear infinite',
  },
  processingTitle: { fontSize: 18, fontWeight: 600, marginBottom: 20 },
  progressBar: { width: '80%', maxWidth: 280, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)', borderRadius: 4, transition: 'width 0.3s ease' },
  progressText: { fontSize: 14, color: '#64748b' },

  // Results
  resultContent: { padding: '16px 16px 120px' },
  section: {
    background: 'rgba(30,41,59,0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sectionLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 600 },
  badge: { fontSize: 11, background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 8px', borderRadius: 10 },
  copyBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,0.1)',
    border: 'none', borderRadius: 8, padding: '8px 12px',
    color: '#fff', fontSize: 12, cursor: 'pointer',
  },
  
  // Text area - LARGER
  textArea: {
    width: '100%',
    minHeight: 200,
    background: 'rgba(0,0,0,0.3)',
    border: 'none',
    padding: 16,
    color: '#e5e7eb',
    fontSize: 15,
    lineHeight: 1.8,
    resize: 'vertical',
    fontFamily: 'inherit',
    borderRadius: '0 0 16px 16px',
  },

  // Translate
  translateRow: { display: 'flex', gap: 10, padding: 16 },
  select: {
    flex: 1,
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '12px 14px',
    color: '#fff',
    fontSize: 14,
  },
  actionBtn: {
    width: 48, height: 48,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    border: 'none', borderRadius: 10,
    color: '#fff', cursor: 'pointer',
  },

  // Explain
  explainBtn: {
    width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    background: 'rgba(245,158,11,0.15)',
    border: '1px solid rgba(245,158,11,0.3)',
    padding: 16, margin: 16,
    marginTop: 0,
    borderRadius: 12,
    color: '#fbbf24', fontSize: 15, fontWeight: 600,
    cursor: 'pointer',
    width: 'calc(100% - 32px)',
  },
  explanationBox: {
    background: 'rgba(139,92,246,0.1)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 0,
  },
  explanationText: { color: '#e5e7eb', fontSize: 15, lineHeight: 1.8, margin: 0 },

  // Export
  exportSection: { display: 'flex', gap: 12, marginTop: 8 },
  exportBtn: {
    flex: 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    background: 'rgba(255,255,255,0.1)',
    border: 'none', borderRadius: 12, padding: 16,
    color: '#fff', fontSize: 13, cursor: 'pointer',
  },

  // Error
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 12, padding: 14,
    color: '#f87171', fontSize: 14,
    marginTop: 16,
  },
};

export default QuickScan;
