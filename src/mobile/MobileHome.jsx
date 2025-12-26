/**
 * MobileHome.jsx
 * 
 * Main home screen for mobile users.
 * Shows 4 feature cards:
 * 1. Quick Scan & Translate (FREE)
 * 2. Create PDF (FREE)
 * 3. Extract Tables (FREE)
 * 4. AI OCR Pro (PAID)
 * 
 * Plus a "My Files" section at the bottom.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';
import {
  Camera,
  FileText,
  Table2,
  Sparkles,
  FolderOpen,
  Settings,
  ChevronRight,
  Zap,
  Globe,
  Share2,
  CreditCard,
} from 'lucide-react';

const MobileHome = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isPortrait } = useDevice();
  
  // Credits for AI OCR Pro (stored locally for now)
  const [ocrCredits, setOcrCredits] = useState(() => {
    const saved = localStorage.getItem('angelpdf_ocr_credits');
    return saved ? JSON.parse(saved) : { balance: 0, expiresAt: null };
  });

  // Feature cards data
  const features = [
    {
      id: 'quick-scan',
      title: 'Quick Scan',
      subtitle: 'Scan & Translate',
      description: 'For travelers & quick understanding',
      icon: Camera,
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      shadowColor: 'rgba(139, 92, 246, 0.3)',
      badge: 'FREE',
      badgeColor: '#10b981',
      route: '/mobile/quick-scan'
    },
    {
      id: 'create-pdf',
      title: 'Create PDF',
      subtitle: 'Multi-page Scanner',
      description: 'Scan multiple pages & share',
      icon: FileText,
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      shadowColor: 'rgba(59, 130, 246, 0.3)',
      badge: 'FREE',
      badgeColor: '#10b981',
      route: '/mobile/create-pdf'
    },
    {
      id: 'extract-tables',
      title: 'Extract Tables',
      subtitle: 'Table → Excel',
      description: 'AI-powered table detection',
      icon: Table2,
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      shadowColor: 'rgba(6, 182, 212, 0.3)',
      badge: 'FREE',
      badgeColor: '#10b981',
      route: '/mobile/extract-tables'
    },
    {
      id: 'ai-ocr-pro',
      title: 'AI OCR Pro',
      subtitle: 'Bulk Text Extraction',
      description: '1 FREE, then ₹3/page',
      icon: Sparkles,
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      shadowColor: 'rgba(245, 158, 11, 0.3)',
      badge: ocrCredits.balance > 0 ? `${ocrCredits.balance} pages` : '₹3/pg',
      badgeColor: '#f59e0b',
      isPremium: true,
      route: '/mobile/ai-ocr-pro'
    }
  ];

  // Handle feature card click
  const handleFeatureClick = (feature) => {
    navigate(feature.route);
  };

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      color: '#fff',
      paddingBottom: '100px', // Space for bottom nav
    },
    
    // Header
    header: {
      padding: '20px 20px 0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    logoIcon: {
      width: '40px',
      height: '40px',
      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
    },
    logoText: {
      fontSize: '22px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    settingsBtn: {
      width: '40px',
      height: '40px',
      background: 'rgba(255,255,255,0.1)',
      border: 'none',
      borderRadius: '12px',
      color: '#94a3b8',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Hero
    hero: {
      padding: '30px 20px 20px',
      textAlign: 'center',
    },
    heroTitle: {
      fontSize: '26px',
      fontWeight: '700',
      marginBottom: '8px',
      color: '#f8fafc',
    },
    heroSubtitle: {
      fontSize: '15px',
      color: '#94a3b8',
      lineHeight: '1.5',
    },

    // Features Grid
    featuresGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
      padding: '0 20px',
      marginBottom: '30px',
    },

    // Feature Card
    featureCard: {
      background: 'rgba(30, 41, 59, 0.8)',
      borderRadius: '20px',
      padding: '20px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '1px solid rgba(255,255,255,0.05)',
      position: 'relative',
      overflow: 'hidden',
    },
    featureCardHover: {
      transform: 'translateY(-4px)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
    },
    featureIconWrap: {
      width: '56px',
      height: '56px',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '16px',
      position: 'relative',
    },
    featureIcon: {
      width: '28px',
      height: '28px',
      color: '#fff',
    },
    featureTitle: {
      fontSize: '17px',
      fontWeight: '700',
      color: '#f8fafc',
      marginBottom: '4px',
    },
    featureSubtitle: {
      fontSize: '13px',
      color: '#94a3b8',
      marginBottom: '8px',
    },
    featureDesc: {
      fontSize: '11px',
      color: '#64748b',
      lineHeight: '1.4',
    },
    featureBadge: {
      position: 'absolute',
      top: '12px',
      right: '12px',
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '600',
    },
    premiumGlow: {
      position: 'absolute',
      top: '0',
      right: '0',
      width: '100px',
      height: '100px',
      background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
      pointerEvents: 'none',
    },

    // My Files Section
    filesSection: {
      padding: '0 20px',
    },
    filesSectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
    },
    filesSectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    viewAllBtn: {
      background: 'none',
      border: 'none',
      color: '#8b5cf6',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    filesEmpty: {
      background: 'rgba(30, 41, 59, 0.5)',
      borderRadius: '16px',
      padding: '40px 20px',
      textAlign: 'center',
      border: '1px dashed rgba(255,255,255,0.1)',
    },
    filesEmptyIcon: {
      width: '48px',
      height: '48px',
      color: '#475569',
      marginBottom: '12px',
    },
    filesEmptyText: {
      fontSize: '14px',
      color: '#64748b',
    },

    // Bottom safe area
    bottomSpacer: {
      height: '20px',
    },
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <FileText style={{ width: '22px', height: '22px', color: '#fff' }} />
          </div>
          <span style={styles.logoText}>AngelPDF</span>
        </div>
        <button 
          style={styles.settingsBtn}
          onClick={() => navigate('/settings')}
        >
          <Settings style={{ width: '20px', height: '20px' }} />
        </button>
      </header>

      {/* Hero Section */}
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>
          What would you like to do?
        </h1>
        <p style={styles.heroSubtitle}>
          Scan documents, extract text, create PDFs
        </p>
      </div>

      {/* Features Grid */}
      <div style={styles.featuresGrid}>
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.id}
              style={{
                ...styles.featureCard,
                boxShadow: `0 10px 30px ${feature.shadowColor}`,
              }}
              onClick={() => handleFeatureClick(feature)}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = 'scale(0.97)';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {/* Premium glow effect */}
              {feature.isPremium && <div style={styles.premiumGlow} />}
              
              {/* Badge */}
              <div 
                style={{
                  ...styles.featureBadge,
                  background: `${feature.badgeColor}20`,
                  color: feature.badgeColor,
                }}
              >
                {feature.badge}
              </div>

              {/* Icon */}
              <div 
                style={{
                  ...styles.featureIconWrap,
                  background: feature.gradient,
                  boxShadow: `0 8px 20px ${feature.shadowColor}`,
                }}
              >
                <Icon style={styles.featureIcon} />
              </div>

              {/* Content */}
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureSubtitle}>{feature.subtitle}</p>
              <p style={styles.featureDesc}>{feature.description}</p>
            </div>
          );
        })}
      </div>

      {/* My Files Section */}
      <div style={styles.filesSection}>
        <div style={styles.filesSectionHeader}>
          <h2 style={styles.filesSectionTitle}>
            <FolderOpen style={{ width: '20px', height: '20px', color: '#8b5cf6' }} />
            My Files
          </h2>
          <button 
            style={styles.viewAllBtn}
            onClick={() => navigate('/mobile/my-files')}
          >
            View All <ChevronRight style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Empty state - will show files later */}
        <div style={styles.filesEmpty}>
          <FolderOpen style={styles.filesEmptyIcon} />
          <p style={styles.filesEmptyText}>
            Your scanned documents will appear here
          </p>
        </div>
      </div>

      <div style={styles.bottomSpacer} />
    </div>
  );
};

export default MobileHome;
