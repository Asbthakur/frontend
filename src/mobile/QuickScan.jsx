/**
 * QuickScan.jsx (IMPROVED)
 * 
 * Feature 1: Quick Scan & Translate
 * 
 * Changes:
 * 1. Removed filter/enhance step - goes directly to processing
 * 2. Better status bar during processing
 * 3. Larger windows for Extract, Translate, Explain
 * 4. Export section at the bottom (Copy, Share, Download)
 * 5. Smoother overall experience
 */

import React, { useState, useRef, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
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
  PROCESSING: 'processing',
  RESULT: 'result',
};

// Processing stages for status bar
const PROCESSING_STAGES = [
  { id: 'upload', label: 'Uploading image...', progress: 20 },
  { id: 'ocr', label: 'Extracting text...', progress: 60 },
  { id: 'complete', label: 'Almost done...', progress: 90 },
];

const QuickScan = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const isNative = Capacitor.isNativePlatform();

  // Flow state
  const [step, setStep] = useState(STEPS.SELECT);
  const [capturedImage, setCapturedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  
  // Processing state
  const [processing, setProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
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
  const [expandedSection, setExpandedSection] = useState('extract'); // extract, translate, explain

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
   * Handle crop complete - GO DIRECTLY TO PROCESSING (no filter step)
   */
  const handleCropComplete = async (data) => {
    setProcessedImage(data.image);
    
    // Start processing immediately
    setStep(STEPS.PROCESSING);
    setProcessing(true);
    setCurrentStage(0);
    setProgress(0);
    setError(null);

    try {
      // Stage 1: Upload
      setCurrentStage(0);
      await animateProgress(0, 20, 500);

      // Stage 2: OCR
      setCurrentStage(1);
      const imageToProcess = data.image || capturedImage;
      
      // Start progress animation
      const progressPromise = animateProgress(20, 85, 3000);
      
      // Call OCR API
      const response = await ocrAPI.extractText(imageToProcess);
      
      // Wait for progress to catch up
      await progressPromise;

      // Stage 3: Complete
      setCurrentStage(2);
      await animateProgress(85, 100, 300);

      if (response.success) {
        setExtractedText(response.text || '');
        setConfidence(response.confidence || 95);
        setStep(STEPS.RESULT);
      } else {
        throw new Error(response.error || 'OCR failed');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setError(err.message || 'Failed to extract text. Please try again.');
      setStep(STEPS.SELECT);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Animate progress smoothly
   */
  const animateProgress = (from, to, duration) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = from + (to - from) * progress;
        setProgress(Math.round(current));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      animate();
    });
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
        setExpandedSection('translate');
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
        setExpandedSection('explain');
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
      
      // Vibrate on success
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  /**
   * Share all content
   */
  const handleShare = async () => {
    let shareText = `📝 Extracted Text:\n${extractedText}`;
    
    if (translatedText) {
      shareText += `\n\n🌐 Translation:\n${translatedText}`;
    }
    
    if (explanation) {
      shareText += `\n\n🤖 AI Explanation:\n${explanation}`;
    }
    
    shareText += `\n\n— Scanned with AngelPDF`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Scanned Document - AngelPDF',
          text: shareText,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  /**
   * Download as text file
   */
  const handleDownload = () => {
    let content = `EXTRACTED TEXT\n${'='.repeat(50)}\n${extractedText}`;
    
    if (translatedText) {
      content += `\n\n\nTRANSLATION\n${'='.repeat(50)}\n${translatedText}`;
    }
    
    if (explanation) {
      content += `\n\n\nAI EXPLANATION\n${'='.repeat(50)}\n${explanation}`;
    }
    
    content += `\n\n\n— Scanned with AngelPDF`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
    setExpandedSection('extract');
    setStep(STEPS.SELECT);
  };

  // ============ RENDER FUNCTIONS ============

  /**
   * Render select step
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
          <h2 style={styles.heroTitle}>Scan & Understand</h2>
          <p style={styles.heroSubtitle}>
            Capture any document, extract text, translate to your language
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
            <span>100% FREE - Unlimited scans</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle style={{ width: '20px', height: '20px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Render processing step with detailed status bar
   */
  const renderProcessing = () => (
    <div style={styles.container}>
      <div style={styles.processingContainer}>
        {/* Animated icon */}
        <div style={styles.processingIcon}>
          <div style={styles.processingSpinnerOuter}>
            <div style={styles.processingSpinnerInner} />
          </div>
          <FileText style={{ 
            width: '32px', 
            height: '32px', 
            color: '#8b5cf6',
            position: 'absolute',
          }} />
        </div>

        {/* Status text */}
        <h2 style={styles.processingTitle}>
          {PROCESSING_STAGES[currentStage]?.label || 'Processing...'}
        </h2>

        {/* Progress bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div 
              style={{
                ...styles.progressFill,
                width: `${progress}%`,
              }} 
            />
          </div>
          <span style={styles.progressPercent}>{progress}%</span>
        </div>

        {/* Stage indicators */}
        <div style={styles.stageIndicators}>
          {PROCESSING_STAGES.map((stage, index) => (
            <div 
              key={stage.id}
              style={{
                ...styles.stageIndicator,
                ...(index <= currentStage ? styles.stageIndicatorActive : {}),
              }}
            >
              {index < currentStage ? (
                <Check style={{ width: '14px', height: '14px' }} />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
          ))}
        </div>

        <p style={styles.processingHint}>
          Please wait while we process your document
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );

  /**
   * Render result step with larger windows
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
        {/* ========== SECTION 1: Extracted Text ========== */}
        <div style={styles.resultSection}>
          <button 
            style={styles.sectionHeader}
            onClick={() => setExpandedSection(expandedSection === 'extract' ? '' : 'extract')}
          >
            <div style={styles.sectionHeaderLeft}>
              <span style={styles.sectionIcon}>📝</span>
              <span style={styles.sectionTitle}>Extracted Text</span>
              <span style={styles.confidenceBadge}>{confidence}%</span>
            </div>
            {expandedSection === 'extract' ? (
              <ChevronUp style={{ width: '20px', height: '20px', color: '#64748b' }} />
            ) : (
              <ChevronDown style={{ width: '20px', height: '20px', color: '#64748b' }} />
            )}
          </button>
          
          {expandedSection === 'extract' && (
            <div style={styles.sectionContent}>
              <textarea
                style={styles.textAreaLarge}
                value={extractedText}
                readOnly
                placeholder="No text extracted"
              />
            </div>
          )}
        </div>

        {/* ========== SECTION 2: Translation ========== */}
        <div style={styles.resultSection}>
          <button 
            style={styles.sectionHeader}
            onClick={() => setExpandedSection(expandedSection === 'translate' ? '' : 'translate')}
          >
            <div style={styles.sectionHeaderLeft}>
              <span style={styles.sectionIcon}>🌐</span>
              <span style={styles.sectionTitle}>Translate</span>
              {translatedText && <span style={styles.doneBadge}>Done</span>}
            </div>
            {expandedSection === 'translate' ? (
              <ChevronUp style={{ width: '20px', height: '20px', color: '#64748b' }} />
            ) : (
              <ChevronDown style={{ width: '20px', height: '20px', color: '#64748b' }} />
            )}
          </button>
          
          {expandedSection === 'translate' && (
            <div style={styles.sectionContent}>
              {/* Language selector */}
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
                </button>
              </div>

              {/* Translation result */}
              {translatedText && (
                <textarea
                  style={styles.textAreaLarge}
                  value={translatedText}
                  readOnly
                />
              )}
            </div>
          )}
        </div>

        {/* ========== SECTION 3: AI Explain ========== */}
        <div style={styles.resultSection}>
          <button 
            style={styles.sectionHeader}
            onClick={() => setExpandedSection(expandedSection === 'explain' ? '' : 'explain')}
          >
            <div style={styles.sectionHeaderLeft}>
              <span style={styles.sectionIcon}>🤖</span>
              <span style={styles.sectionTitle}>AI Explain</span>
              {explanation && <span style={styles.doneBadge}>Done</span>}
            </div>
            {expandedSection === 'explain' ? (
              <ChevronUp style={{ width: '20px', height: '20px', color: '#64748b' }} />
            ) : (
              <ChevronDown style={{ width: '20px', height: '20px', color: '#64748b' }} />
            )}
          </button>
          
          {expandedSection === 'explain' && (
            <div style={styles.sectionContent}>
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
                    <Loader style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <Sparkles style={{ width: '20px', height: '20px' }} />
                  )}
                  {explaining ? 'Generating...' : 'Explain This Content'}
                </button>
              ) : (
                <div style={styles.explanationBox}>
                  <p style={styles.explanationText}>{explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle style={{ width: '20px', height: '20px', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* ========== EXPORT SECTION (at bottom) ========== */}
        <div style={styles.exportSection}>
          <p style={styles.exportTitle}>Export & Share</p>
          <div style={styles.exportButtons}>
            <button 
              style={styles.exportBtn}
              onClick={() => handleCopy(translatedText || extractedText)}
            >
              {copied ? (
                <Check style={{ width: '20px', height: '20px', color: '#10b981' }} />
              ) : (
                <Copy style={{ width: '20px', height: '20px' }} />
              )}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            
            <button style={styles.exportBtn} onClick={handleShare}>
              <Share2 style={{ width: '20px', height: '20px' }} />
              <span>Share</span>
            </button>
            
            <button style={styles.exportBtn} onClick={handleDownload}>
              <Download style={{ width: '20px', height: '20px' }} />
              <span>Download</span>
            </button>
          </div>
        </div>
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
    background: 'rgba(15, 23, 42, 0.9)',
    backdropFilter: 'blur(10px)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
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
    padding: '24px 20px',
    paddingBottom: '100px',
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
    fontSize: '15px',
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

  // Processing
  processingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '40px 24px',
  },
  processingIcon: {
    position: 'relative',
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  processingSpinnerOuter: {
    position: 'absolute',
    width: '80px',
    height: '80px',
    border: '3px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: '#8b5cf6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  processingSpinnerInner: {
    position: 'absolute',
    width: '60px',
    height: '60px',
    border: '3px solid rgba(139, 92, 246, 0.1)',
    borderBottomColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1.5s linear infinite reverse',
  },
  processingTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '24px',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    maxWidth: '280px',
    marginBottom: '24px',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
    borderRadius: '4px',
    transition: 'width 0.3s ease-out',
  },
  progressPercent: {
    display: 'block',
    textAlign: 'center',
    fontSize: '14px',
    color: '#64748b',
  },
  stageIndicators: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  stageIndicator: {
    width: '28px',
    height: '28px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#64748b',
    transition: 'all 0.3s ease',
  },
  stageIndicatorActive: {
    background: '#8b5cf6',
    color: '#fff',
  },
  processingHint: {
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center',
  },

  // Result
  resultContent: {
    padding: '16px 20px',
    paddingBottom: '120px',
  },

  // Result sections
  resultSection: {
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    marginBottom: '12px',
    overflow: 'hidden',
  },
  sectionHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#fff',
  },
  sectionHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sectionIcon: {
    fontSize: '20px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
  },
  confidenceBadge: {
    fontSize: '11px',
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    padding: '3px 8px',
    borderRadius: '10px',
  },
  doneBadge: {
    fontSize: '11px',
    background: 'rgba(139, 92, 246, 0.2)',
    color: '#a78bfa',
    padding: '3px 8px',
    borderRadius: '10px',
  },
  sectionContent: {
    padding: '0 16px 16px',
  },

  // Text area (LARGER)
  textAreaLarge: {
    width: '100%',
    minHeight: '180px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '14px',
    color: '#e5e7eb',
    fontSize: '15px',
    lineHeight: '1.7',
    resize: 'vertical',
    fontFamily: 'inherit',
  },

  // Translation
  translateRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '12px',
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
    width: '50px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    cursor: 'pointer',
  },

  // Explain
  explainBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    borderRadius: '12px',
    padding: '16px',
    color: '#fbbf24',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  explanationBox: {
    background: 'rgba(139, 92, 246, 0.1)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '12px',
    padding: '16px',
  },
  explanationText: {
    color: '#e5e7eb',
    fontSize: '15px',
    lineHeight: '1.7',
    margin: 0,
  },

  // Export section
  exportSection: {
    marginTop: '24px',
    padding: '20px',
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
  },
  exportTitle: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '16px',
    textAlign: 'center',
  },
  exportButtons: {
    display: 'flex',
    gap: '12px',
  },
  exportBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '12px',
    padding: '16px 12px',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
  },

  // Error
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '12px',
    padding: '14px',
    color: '#f87171',
    fontSize: '14px',
    marginTop: '16px',
  },
};

export default QuickScan;
