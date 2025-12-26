/**
 * QuickScan.jsx
 * 
 * Feature 1: Quick Scan & Translate
 * For travelers and people who need quick understanding.
 * 
 * Flow:
 * 1. Camera/Upload → 2. Crop → 3. Filter → 4. OCR → 5. Translate → 6. AI Explain
 * 
 * All steps are FREE.
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ocrAPI } from '../services/api';
import CameraScanner from './components/CameraScanner';
import CropTool from './components/CropTool';
import FilterBar, { getFilterString } from './components/FilterBar';
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
  MessageSquare,
  RotateCcw,
  Share2,
} from 'lucide-react';

// Supported languages
const LANGUAGES = [
  { group: '🇮🇳 Indian Languages', languages: [
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
  { group: '🌍 European Languages', languages: [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish (Español)' },
    { code: 'fr', name: 'French (Français)' },
    { code: 'de', name: 'German (Deutsch)' },
    { code: 'it', name: 'Italian (Italiano)' },
    { code: 'pt', name: 'Portuguese (Português)' },
    { code: 'ru', name: 'Russian (Русский)' },
  ]},
  { group: '🌏 Asian Languages', languages: [
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

// Steps
const STEPS = {
  SELECT: 'select',
  CAMERA: 'camera',
  CROP: 'crop',
  FILTER: 'filter',
  PROCESSING: 'processing',
  RESULT: 'result',
};

const QuickScan = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const isNative = Capacitor.isNativePlatform();

  // Flow state
  const [step, setStep] = useState(STEPS.SELECT);
  const [capturedImage, setCapturedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('original');
  
  // Processing state
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState(null);

  // Result state
  const [extractedText, setExtractedText] = useState('');
  const [confidence, setConfidence] = useState(0);

  // Translation state
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [translating, setTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState('');

  // AI Explain state
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState('');

  // UI state
  const [copied, setCopied] = useState(false);

  /**
   * Handle file upload
   */
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      setCapturedImage(files[0]);
      setStep(STEPS.CROP);
    }
  };

  /**
   * Handle camera capture complete
   */
  const handleCameraComplete = (images) => {
    if (images && images.length > 0) {
      setCapturedImage(images[0]);
      setStep(STEPS.CROP);
    }
  };

  /**
   * Handle crop complete
   */
  const handleCropComplete = (data) => {
    setProcessedImage(data.image);
    setStep(STEPS.FILTER);
  };

  /**
   * Handle filter apply - start OCR processing
   */
  const handleFilterApply = async (filterId, filterConfig) => {
    setSelectedFilter(filterId);
    setStep(STEPS.PROCESSING);
    setProcessing(true);
    setProgress(0);
    setError(null);

    try {
      // Progress simulation
      setProgressText('Preparing image...');
      setProgress(10);

      await new Promise(r => setTimeout(r, 300));
      setProgressText('Uploading to server...');
      setProgress(30);

      // Call OCR API
      const imageToProcess = processedImage || capturedImage;
      const response = await ocrAPI.extractText(imageToProcess);

      setProgress(80);
      setProgressText('Extracting text...');

      await new Promise(r => setTimeout(r, 200));
      setProgress(100);

      if (response.success) {
        setExtractedText(response.text || '');
        setConfidence(response.confidence || 95);
        setStep(STEPS.RESULT);
      } else {
        throw new Error(response.error || 'OCR failed');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setError(err.message || 'Failed to extract text');
      setStep(STEPS.FILTER);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Translate text
   */
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
      console.error('Translation Error:', err);
      setError(err.message || 'Failed to translate');
    } finally {
      setTranslating(false);
    }
  };

  /**
   * AI Explain
   */
  const handleExplain = async () => {
    const textToExplain = translatedText || extractedText;
    if (!textToExplain) return;

    setExplaining(true);
    setError(null);

    try {
      const response = await ocrAPI.summarize(textToExplain);
      
      if (response.success) {
        setExplanation(response.summary || '');
      } else {
        throw new Error('Explanation failed');
      }
    } catch (err) {
      console.error('Explain Error:', err);
      setError(err.message || 'Failed to generate explanation');
    } finally {
      setExplaining(false);
    }
  };

  /**
   * Copy text to clipboard
   */
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  /**
   * Share text
   */
  const handleShare = async () => {
    const textToShare = translatedText || extractedText;
    if (!textToShare) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Scanned Text - AngelPDF',
          text: textToShare,
        });
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  /**
   * Start new scan
   */
  const handleNewScan = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setExtractedText('');
    setTranslatedText('');
    setExplanation('');
    setSelectedLanguage('');
    setError(null);
    setStep(STEPS.SELECT);
  };

  // ============ RENDER FUNCTIONS ============

  /**
   * Render select step (camera or upload)
   */
  const renderSelect = () => (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/mobile')}>
          <ArrowLeft style={{ width: '24px', height: '24px' }} />
        </button>
        <h1 style={styles.title}>Quick Scan</h1>
        <div style={{ width: '44px' }} />
      </div>

      {/* Content */}
      <div style={styles.content}>
        <div style={styles.hero}>
          <div style={styles.heroIcon}>
            <Camera style={{ width: '40px', height: '40px', color: '#fff' }} />
          </div>
          <h2 style={styles.heroTitle}>Scan & Translate</h2>
          <p style={styles.heroSubtitle}>
            Capture a document, extract text, and translate to any language
          </p>
        </div>

        {/* Options */}
        <div style={styles.optionsGrid}>
          <button 
            style={styles.optionCard}
            onClick={() => setStep(STEPS.CAMERA)}
          >
            <div style={{...styles.optionIcon, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)'}}>
              <Camera style={{ width: '28px', height: '28px', color: '#fff' }} />
            </div>
            <span style={styles.optionTitle}>Open Camera</span>
            <span style={styles.optionDesc}>Take a photo</span>
          </button>

          <button 
            style={styles.optionCard}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{...styles.optionIcon, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'}}>
              <Upload style={{ width: '28px', height: '28px', color: '#fff' }} />
            </div>
            <span style={styles.optionTitle}>Upload Image</span>
            <span style={styles.optionDesc}>From gallery</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        {/* Features list */}
        <div style={styles.featuresList}>
          <div style={styles.featureItem}>
            <Check style={{ width: '16px', height: '16px', color: '#10b981' }} />
            <span>AI-powered text extraction</span>
          </div>
          <div style={styles.featureItem}>
            <Check style={{ width: '16px', height: '16px', color: '#10b981' }} />
            <span>50+ languages supported</span>
          </div>
          <div style={styles.featureItem}>
            <Check style={{ width: '16px', height: '16px', color: '#10b981' }} />
            <span>AI explanation of content</span>
          </div>
          <div style={styles.featureItem}>
            <Check style={{ width: '16px', height: '16px', color: '#10b981' }} />
            <span>100% FREE</span>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Render processing step
   */
  const renderProcessing = () => (
    <div style={styles.container}>
      <div style={styles.processingContainer}>
        <div style={styles.processingSpinner}>
          <Loader style={{ width: '48px', height: '48px', color: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
        </div>
        <h2 style={styles.processingTitle}>Processing...</h2>
        <p style={styles.processingText}>{progressText}</p>
        
        {/* Progress bar */}
        <div style={styles.progressBar}>
          <div style={{...styles.progressFill, width: `${progress}%`}} />
        </div>
        <span style={styles.progressPercent}>{Math.round(progress)}%</span>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  /**
   * Render result step
   */
  const renderResult = () => (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={handleNewScan}>
          <ArrowLeft style={{ width: '24px', height: '24px' }} />
        </button>
        <h1 style={styles.title}>Results</h1>
        <button style={styles.newScanBtn} onClick={handleNewScan}>
          <RotateCcw style={{ width: '20px', height: '20px' }} />
        </button>
      </div>

      <div style={styles.resultContent}>
        {/* Extracted Text */}
        <div style={styles.resultCard}>
          <div style={styles.resultCardHeader}>
            <h3 style={styles.resultCardTitle}>
              <span style={styles.resultIcon}>📝</span> Extracted Text
            </h3>
            <span style={styles.confidenceBadge}>{confidence}% accuracy</span>
          </div>
          
          <textarea
            style={styles.textArea}
            value={extractedText}
            readOnly
            placeholder="No text extracted"
          />
          
          <div style={styles.actionRow}>
            <button 
              style={styles.actionBtn}
              onClick={() => handleCopy(extractedText)}
            >
              {copied ? <Check style={{ width: '18px', height: '18px' }} /> : <Copy style={{ width: '18px', height: '18px' }} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button style={styles.actionBtn} onClick={handleShare}>
              <Share2 style={{ width: '18px', height: '18px' }} />
              Share
            </button>
          </div>
        </div>

        {/* Translation */}
        <div style={styles.resultCard}>
          <div style={styles.resultCardHeader}>
            <h3 style={styles.resultCardTitle}>
              <span style={styles.resultIcon}>🌐</span> Translate
            </h3>
          </div>

          <div style={styles.translateRow}>
            <select
              style={styles.languageSelect}
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option value="">Select language...</option>
              {LANGUAGES.map(group => (
                <optgroup key={group.group} label={group.group}>
                  {group.languages.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
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
              {translating ? (
                <Loader style={{ width: '18px', height: '18px', animation: 'spin 1s linear infinite' }} />
              ) : (
                <Globe style={{ width: '18px', height: '18px' }} />
              )}
              {translating ? 'Translating...' : 'Translate'}
            </button>
          </div>

          {translatedText && (
            <div style={styles.translationResult}>
              <p style={styles.translatedText}>{translatedText}</p>
              <button 
                style={styles.copySmallBtn}
                onClick={() => handleCopy(translatedText)}
              >
                <Copy style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
          )}
        </div>

        {/* AI Explain */}
        <div style={styles.resultCard}>
          <div style={styles.resultCardHeader}>
            <h3 style={styles.resultCardTitle}>
              <span style={styles.resultIcon}>🤖</span> AI Explain
            </h3>
          </div>

          <button
            style={{
              ...styles.explainBtn,
              opacity: explaining ? 0.5 : 1,
            }}
            onClick={handleExplain}
            disabled={explaining}
          >
            {explaining ? (
              <Loader style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
            ) : (
              <Sparkles style={{ width: '20px', height: '20px' }} />
            )}
            {explaining ? 'Generating...' : 'Explain This Content'}
          </button>

          {explanation && (
            <div style={styles.explanationResult}>
              <p style={styles.explanationText}>{explanation}</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle style={{ width: '20px', height: '20px' }} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );

  // ============ MAIN RENDER ============

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
      
      {step === STEPS.FILTER && (
        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header}>
            <button style={styles.backBtn} onClick={() => setStep(STEPS.CROP)}>
              <ArrowLeft style={{ width: '24px', height: '24px' }} />
            </button>
            <h1 style={styles.title}>Enhance</h1>
            <div style={{ width: '44px' }} />
          </div>

          {/* Image preview */}
          <div style={styles.filterPreview}>
            <img
              src={URL.createObjectURL(processedImage || capturedImage)}
              style={{
                ...styles.previewImage,
                filter: getFilterString(selectedFilter === 'original' ? null : 
                  selectedFilter === 'magic' ? { contrast: 1.2, brightness: 1.05, saturate: 1.1 } :
                  selectedFilter === 'bw' ? { grayscale: 1, contrast: 1.3 } :
                  selectedFilter === 'grayscale' ? { grayscale: 1 } :
                  selectedFilter === 'shadow' ? { brightness: 1.15, contrast: 1.1 } :
                  selectedFilter === 'bright' ? { brightness: 1.25 } :
                  { contrast: 1.15, brightness: 1.02 }
                ),
              }}
              alt="Preview"
            />
          </div>

          {/* Filter bar */}
          <FilterBar
            image={processedImage || capturedImage}
            selectedFilter={selectedFilter}
            onFilterChange={(id, config) => setSelectedFilter(id)}
            onApply={handleFilterApply}
          />
        </div>
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

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    paddingTop: '50px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  backBtn: {
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
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#f8fafc',
  },
  newScanBtn: {
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

  // Content
  content: {
    padding: '20px',
  },

  // Hero
  hero: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  heroIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '24px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)',
  },
  heroTitle: {
    fontSize: '24px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  heroSubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.5',
  },

  // Options
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '32px',
  },
  optionCard: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '24px 16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s ease',
  },
  optionIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#f8fafc',
  },
  optionDesc: {
    fontSize: '13px',
    color: '#64748b',
  },

  // Features list
  featuresList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: '#94a3b8',
  },

  // Filter preview
  filterPreview: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    minHeight: '300px',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '400px',
    borderRadius: '12px',
    objectFit: 'contain',
  },

  // Processing
  processingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '40px',
  },
  processingSpinner: {
    marginBottom: '24px',
  },
  processingTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '8px',
  },
  processingText: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '24px',
  },
  progressBar: {
    width: '200px',
    height: '6px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  progressPercent: {
    fontSize: '14px',
    color: '#64748b',
  },

  // Result
  resultContent: {
    padding: '20px',
    paddingBottom: '100px',
  },
  resultCard: {
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '16px',
  },
  resultCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  resultCardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  resultIcon: {
    fontSize: '18px',
  },
  confidenceBadge: {
    fontSize: '12px',
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    padding: '4px 10px',
    borderRadius: '20px',
  },
  textArea: {
    width: '100%',
    minHeight: '120px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '14px',
    color: '#e5e7eb',
    fontSize: '14px',
    lineHeight: '1.6',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 16px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },

  // Translation
  translateRow: {
    display: 'flex',
    gap: '12px',
  },
  languageSelect: {
    flex: 1,
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '12px 14px',
    color: '#fff',
    fontSize: '14px',
  },
  translateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 20px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  translationResult: {
    marginTop: '16px',
    background: 'rgba(6, 182, 212, 0.1)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    borderRadius: '12px',
    padding: '14px',
    position: 'relative',
  },
  translatedText: {
    color: '#e5e7eb',
    fontSize: '14px',
    lineHeight: '1.6',
    paddingRight: '30px',
  },
  copySmallBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '6px',
    padding: '6px',
    color: '#94a3b8',
    cursor: 'pointer',
  },

  // Explain
  explainBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'rgba(245, 158, 11, 0.2)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '12px',
    padding: '14px',
    color: '#fbbf24',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  explanationResult: {
    marginTop: '16px',
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '12px',
    padding: '14px',
  },
  explanationText: {
    color: '#e5e7eb',
    fontSize: '14px',
    lineHeight: '1.7',
  },

  // Error
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '14px',
    color: '#f87171',
    fontSize: '14px',
  },
};

export default QuickScan;
