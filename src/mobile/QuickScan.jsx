/**
 * QuickScan.jsx - IMPROVED v3
 * 
 * Changes:
 * - Each section has its own Copy/Share/Download buttons
 * - Much larger text areas (250px min)
 * - Better UX
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
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
  { group: '🇮🇳 Indian', languages: [
    { code: 'hi', name: 'Hindi (हिन्दी)' },
    { code: 'bn', name: 'Bengali (বাংলা)' },
    { code: 'te', name: 'Telugu (తెలుగు)' },
    { code: 'mr', name: 'Marathi (मराठी)' },
    { code: 'ta', name: 'Tamil (தமிழ்)' },
    { code: 'gu', name: 'Gujarati (ગુજરાતી)' },
    { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
    { code: 'ml', name: 'Malayalam (മലയാളം)' },
    { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)' },
    { code: 'ur', name: 'Urdu (اردو)' },
  ]},
  { group: '🌍 European', languages: [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish (Español)' },
    { code: 'fr', name: 'French (Français)' },
    { code: 'de', name: 'German (Deutsch)' },
    { code: 'it', name: 'Italian (Italiano)' },
    { code: 'pt', name: 'Portuguese (Português)' },
    { code: 'ru', name: 'Russian (Русский)' },
  ]},
  { group: '🌏 Asian', languages: [
    { code: 'zh', name: 'Chinese (简体中文)' },
    { code: 'ja', name: 'Japanese (日本語)' },
    { code: 'ko', name: 'Korean (한국어)' },
    { code: 'th', name: 'Thai (ไทย)' },
    { code: 'vi', name: 'Vietnamese (Tiếng Việt)' },
  ]},
  { group: '🌍 Middle Eastern', languages: [
    { code: 'ar', name: 'Arabic (العربية)' },
    { code: 'fa', name: 'Persian (فارسی)' },
    { code: 'tr', name: 'Turkish (Türkçe)' },
  ]},
];

const STEPS = {
  SELECT: 'select',
  CAMERA: 'camera',
  CROP: 'crop',
  PROCESSING: 'processing',
  RESULT: 'result',
};

const QuickScan = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Flow
  const [step, setStep] = useState(STEPS.SELECT);
  const [capturedImage, setCapturedImage] = useState(null);
  
  // Processing
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState(null);

  // Results
  const [extractedText, setExtractedText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [translating, setTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState('');

  // UI
  const [copiedSection, setCopiedSection] = useState(null);

  // File upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      setCapturedImage(files[0]);
      setStep(STEPS.CROP);
    }
  };

  // Camera complete
  const handleCameraComplete = (images) => {
    if (images?.length > 0) {
      setCapturedImage(images[0]);
      setStep(STEPS.CROP);
    }
  };

  // Crop complete → Start OCR
  const handleCropComplete = async (data) => {
    setStep(STEPS.PROCESSING);
    setProgress(0);
    setError(null);

    try {
      setProgressText('Uploading image...');
      await animateProgress(0, 25, 400);

      setProgressText('Extracting text with AI...');
      const progressPromise = animateProgress(25, 85, 2500);
      
      const response = await ocrAPI.extractText(data.image || capturedImage);
      await progressPromise;

      setProgressText('Finishing up...');
      await animateProgress(85, 100, 200);

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

  // Animate progress
  const animateProgress = (from, to, duration) => {
    return new Promise((resolve) => {
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const p = Math.min(elapsed / duration, 1);
        setProgress(Math.round(from + (to - from) * p));
        if (p < 1) requestAnimationFrame(tick);
        else resolve();
      };
      tick();
    });
  };

  // Translate
  const handleTranslate = async () => {
    if (!selectedLanguage || !extractedText) return;
    setTranslating(true);
    setError(null);

    try {
      const response = await ocrAPI.translate(extractedText, selectedLanguage);
      if (response.success) {
        setTranslatedText(response.translation?.translatedText || '');
      } else {
        throw new Error(response.message || 'Translation failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTranslating(false);
    }
  };

  // Explain
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

  // Copy
  const handleCopy = async (text, section) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (err) {
      console.error('Copy failed');
    }
  };

  // Share
  const handleShare = async (text, title) => {
    const shareText = `${text}\n\n— Scanned with AngelPDF`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopiedSection('share');
        setTimeout(() => setCopiedSection(null), 2000);
      }
    } catch (err) {}
  };

  // Download
  const handleDownload = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // New scan
  const handleNewScan = () => {
    setCapturedImage(null);
    setExtractedText('');
    setTranslatedText('');
    setExplanation('');
    setSelectedLanguage('');
    setError(null);
    setStep(STEPS.SELECT);
  };

  // ========== RENDER ==========

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
            <Camera size={40} color="#fff" />
          </div>
          <h2 style={styles.heroTitle}>Scan & Translate</h2>
          <p style={styles.heroSubtitle}>
            Capture document, extract text, translate instantly
          </p>
        </div>

        <div style={styles.optionsGrid}>
          <button style={styles.optionCard} onClick={() => setStep(STEPS.CAMERA)}>
            <div style={{ ...styles.optionIcon, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
              <Camera size={28} color="#fff" />
            </div>
            <span style={styles.optionTitle}>Camera</span>
          </button>

          <button style={styles.optionCard} onClick={() => fileInputRef.current?.click()}>
            <div style={{ ...styles.optionIcon, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
              <Upload size={28} color="#fff" />
            </div>
            <span style={styles.optionTitle}>Upload</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        <div style={styles.features}>
          {['AI Text Extraction', '50+ Languages', 'AI Explanation', '100% FREE'].map((f, i) => (
            <div key={i} style={styles.featureItem}>
              <Check size={16} color="#10b981" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} />
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
        <div style={styles.spinnerWrap}>
          <div style={styles.spinner} />
          <FileText size={28} color="#8b5cf6" style={{ position: 'absolute' }} />
        </div>
        <h2 style={styles.processingTitle}>{progressText}</h2>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <span style={styles.progressText}>{progress}%</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // Result screen
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
        {/* ===== EXTRACTED TEXT ===== */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>📝 Extracted Text</span>
            <span style={styles.badge}>{confidence}% accuracy</span>
          </div>
          
          <textarea
            style={styles.textArea}
            value={extractedText}
            readOnly
            placeholder="No text extracted"
          />
          
          <div style={styles.exportRow}>
            <button 
              style={styles.exportBtn} 
              onClick={() => handleCopy(extractedText, 'extract')}
            >
              {copiedSection === 'extract' ? <Check size={18} color="#10b981" /> : <Copy size={18} />}
              <span>{copiedSection === 'extract' ? 'Copied!' : 'Copy'}</span>
            </button>
            <button 
              style={styles.exportBtn}
              onClick={() => handleShare(extractedText, 'Extracted Text')}
            >
              <Share2 size={18} />
              <span>Share</span>
            </button>
            <button 
              style={styles.exportBtn}
              onClick={() => handleDownload(extractedText, 'extracted_text.txt')}
            >
              <Download size={18} />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* ===== TRANSLATION ===== */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>🌐 Translate</span>
          </div>
          
          <div style={styles.translateRow}>
            <select
              style={styles.select}
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option value="">Select language...</option>
              {LANGUAGES.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.languages.map(l => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              style={{
                ...styles.translateBtn,
                opacity: (!selectedLanguage || translating) ? 0.5 : 1,
              }}
              onClick={handleTranslate}
              disabled={!selectedLanguage || translating}
            >
              {translating ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={20} />}
            </button>
          </div>

          {translatedText && (
            <>
              <textarea
                style={styles.textArea}
                value={translatedText}
                readOnly
              />
              <div style={styles.exportRow}>
                <button 
                  style={styles.exportBtn}
                  onClick={() => handleCopy(translatedText, 'translate')}
                >
                  {copiedSection === 'translate' ? <Check size={18} color="#10b981" /> : <Copy size={18} />}
                  <span>{copiedSection === 'translate' ? 'Copied!' : 'Copy'}</span>
                </button>
                <button 
                  style={styles.exportBtn}
                  onClick={() => handleShare(translatedText, 'Translation')}
                >
                  <Share2 size={18} />
                  <span>Share</span>
                </button>
                <button 
                  style={styles.exportBtn}
                  onClick={() => handleDownload(translatedText, 'translation.txt')}
                >
                  <Download size={18} />
                  <span>Save</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* ===== AI EXPLAIN ===== */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>🤖 AI Explanation</span>
          </div>

          {!explanation ? (
            <button
              style={{
                ...styles.explainBtn,
                opacity: explaining ? 0.5 : 1,
              }}
              onClick={handleExplain}
              disabled={explaining}
            >
              {explaining ? (
                <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Sparkles size={20} />
              )}
              <span>{explaining ? 'Generating...' : 'Explain This Content'}</span>
            </button>
          ) : (
            <>
              <div style={styles.explanationBox}>
                <p style={styles.explanationText}>{explanation}</p>
              </div>
              <div style={styles.exportRow}>
                <button 
                  style={styles.exportBtn}
                  onClick={() => handleCopy(explanation, 'explain')}
                >
                  {copiedSection === 'explain' ? <Check size={18} color="#10b981" /> : <Copy size={18} />}
                  <span>{copiedSection === 'explain' ? 'Copied!' : 'Copy'}</span>
                </button>
                <button 
                  style={styles.exportBtn}
                  onClick={() => handleShare(explanation, 'AI Explanation')}
                >
                  <Share2 size={18} />
                  <span>Share</span>
                </button>
                <button 
                  style={styles.exportBtn}
                  onClick={() => handleDownload(explanation, 'explanation.txt')}
                >
                  <Download size={18} />
                  <span>Save</span>
                </button>
              </div>
            </>
          )}
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}
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

// ========== STYLES ==========
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
    padding: '14px 20px',
    paddingTop: 50,
    background: 'rgba(15,23,42,0.95)',
    backdropFilter: 'blur(10px)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
  },
  content: {
    padding: '24px 20px 100px',
  },
  hero: {
    textAlign: 'center',
    marginBottom: 32,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 10px 40px rgba(139,92,246,0.3)',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#94a3b8',
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    marginBottom: 32,
  },
  optionCard: {
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: '28px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    cursor: 'pointer',
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 600,
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 14,
    color: '#94a3b8',
  },

  // Processing
  processingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 40,
  },
  spinnerWrap: {
    position: 'relative',
    width: 80,
    height: 80,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  spinner: {
    position: 'absolute',
    width: 80,
    height: 80,
    border: '3px solid rgba(139,92,246,0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 24,
  },
  progressBar: {
    width: 240,
    height: 8,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
    borderRadius: 4,
    transition: 'width 0.2s',
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
  },

  // Results
  resultContent: {
    padding: '16px 20px 120px',
  },
  section: {
    background: 'rgba(30,41,59,0.7)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
  },
  badge: {
    fontSize: 11,
    background: 'rgba(16,185,129,0.2)',
    color: '#10b981',
    padding: '4px 10px',
    borderRadius: 10,
  },

  // TEXT AREA - MUCH BIGGER
  textArea: {
    width: '100%',
    minHeight: 250,
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#e5e7eb',
    fontSize: 16,
    lineHeight: 1.8,
    resize: 'vertical',
    fontFamily: 'inherit',
    marginBottom: 12,
  },

  // Export row
  exportRow: {
    display: 'flex',
    gap: 10,
  },
  exportBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: 10,
    padding: '12px 8px',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  },

  // Translate
  translateRow: {
    display: 'flex',
    gap: 10,
    marginBottom: 12,
  },
  select: {
    flex: 1,
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '14px 16px',
    color: '#fff',
    fontSize: 15,
  },
  translateBtn: {
    width: 54,
    height: 54,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    cursor: 'pointer',
  },

  // Explain
  explainBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    background: 'rgba(245,158,11,0.15)',
    border: '1px solid rgba(245,158,11,0.3)',
    borderRadius: 12,
    padding: 16,
    color: '#fbbf24',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  explanationBox: {
    background: 'rgba(139,92,246,0.1)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  explanationText: {
    color: '#e5e7eb',
    fontSize: 16,
    lineHeight: 1.8,
    margin: 0,
  },

  // Error
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 12,
    padding: 14,
    color: '#f87171',
    fontSize: 14,
    marginTop: 16,
  },
};

export default QuickScan;
