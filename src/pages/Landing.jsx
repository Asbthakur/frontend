import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Camera,
  FileText,
  Table2,
  Globe,
  FileDown,
  Sparkles,
  Upload,
  Scan,
  Languages,
  FileSpreadsheet,
  FilePlus,
  Scissors,
  Minimize2,
  FileOutput,
  Presentation,
  Sheet,
  Edit3,
  ArrowRight,
  Check,
  Zap,
  Shield,
  Clock,
  ChevronRight,
} from 'lucide-react';
import './Landing.css';

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);

  // Tool cards data
  const mainTools = [
    {
      id: 'scanner',
      name: 'AI Scanner',
      description: 'Extract text from images',
      icon: Scan,
      color: 'from-violet-500 to-purple-600',
      link: '/scanner',
      badge: 'Popular',
    },
    {
      id: 'tables',
      name: 'Table Extractor',
      description: 'Extract tables to Excel',
      icon: Table2,
      color: 'from-cyan-500 to-blue-600',
      link: '/scanner?mode=tables',
    },
    {
      id: 'translate',
      name: 'Translate',
      description: 'Translate documents',
      icon: Languages,
      color: 'from-emerald-500 to-teal-600',
      link: '/scanner',
    },
    {
      id: 'explain',
      name: 'AI Explain',
      description: 'Get AI explanations',
      icon: Sparkles,
      color: 'from-amber-500 to-orange-600',
      link: '/scanner',
      badge: 'New',
    },
  ];

  const pdfTools = [
    { name: 'Merge PDF', icon: FilePlus, color: 'from-violet-500 to-purple-600', link: '/pdf-tools' },
    { name: 'Split PDF', icon: Scissors, color: 'from-pink-500 to-rose-600', link: '/pdf-tools' },
    { name: 'Compress PDF', icon: Minimize2, color: 'from-cyan-500 to-blue-600', link: '/pdf-tools' },
    { name: 'PDF to Word', icon: FileText, color: 'from-blue-500 to-indigo-600', link: '/pdf-tools' },
    { name: 'PDF to Excel', icon: FileSpreadsheet, color: 'from-emerald-500 to-green-600', link: '/pdf-tools' },
    { name: 'PDF to PPT', icon: Presentation, color: 'from-orange-500 to-red-600', link: '/pdf-tools' },
    { name: 'Word to PDF', icon: FileOutput, color: 'from-indigo-500 to-blue-600', link: '/pdf-tools' },
    { name: 'Excel to PDF', icon: Sheet, color: 'from-green-500 to-emerald-600', link: '/pdf-tools' },
    { name: 'Edit PDF', icon: Edit3, color: 'from-purple-500 to-violet-600', link: '/pdf-tools', badge: 'New' },
  ];

  const features = [
    { icon: Zap, title: 'Lightning Fast', description: 'Process documents in seconds with our AI' },
    { icon: Shield, title: 'Secure & Private', description: 'Your files are encrypted and auto-deleted' },
    { icon: Globe, title: '35+ Languages', description: 'Translate to any major language instantly' },
    { icon: Clock, title: 'No Sign-up', description: 'Start using immediately, no account needed' },
  ];

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Navigate to scanner with files
      navigate('/scanner', { state: { files: Array.from(files) } });
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      navigate('/scanner', { state: { files: Array.from(files) } });
    }
  };

  return (
    <div className="landing-dark">
      {/* Header */}
      <header className="landing-header">
        <div className="header-container">
          <Link to="/" className="logo">
            <div className="logo-icon">
              <Camera className="w-5 h-5" />
            </div>
            <span className="logo-text">AngelPDF</span>
          </Link>

          <nav className="nav-links">
            <Link to="/scanner" className="nav-link">Scanner</Link>
            <Link to="/pdf-tools" className="nav-link">PDF Tools</Link>
            <Link to="/pricing" className="nav-link">Pricing</Link>
          </nav>

          <div className="header-actions">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary">
                Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/login" className="btn-primary">
                Sign In
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-badge">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered</span>
            <span className="badge-divider">•</span>
            <span>Free Forever</span>
          </div>

          <h1 className="hero-title">
            AI Document Intelligence
            <span className="gradient-text"> Platform</span>
          </h1>

          <p className="hero-subtitle">
            Scan, Extract, Translate, Convert — All powered by AI, completely free
          </p>

          {/* Upload Area */}
          <div
            className={`upload-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-icon-wrapper">
              <Upload className="w-8 h-8" />
            </div>
            <p className="upload-title">Drop your files here</p>
            <p className="upload-subtitle">or click to browse from your device</p>
            
            <label className="upload-btn">
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <span>Select Files</span>
            </label>

            <div className="format-tags">
              <span>PDF</span>
              <span>JPG</span>
              <span>PNG</span>
              <span>WEBP</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="quick-actions">
            <Link to="/scanner" className="quick-action-btn">
              <FileText className="w-5 h-5" />
              <span>Extract Text</span>
            </Link>
            <Link to="/scanner?mode=tables" className="quick-action-btn">
              <Table2 className="w-5 h-5" />
              <span>Extract Tables</span>
            </Link>
            <Link to="/pdf-tools" className="quick-action-btn">
              <FileDown className="w-5 h-5" />
              <span>PDF Tools</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Tools Section */}
      <section className="tools-section">
        <div className="section-container">
          <div className="section-header">
            <h2>AI-Powered Tools</h2>
            <p>Professional document processing, completely free</p>
          </div>

          <div className="main-tools-grid">
            {mainTools.map((tool) => (
              <Link to={tool.link} key={tool.id} className="main-tool-card">
                {tool.badge && <span className="tool-badge">{tool.badge}</span>}
                <div className={`tool-icon-wrapper bg-gradient-to-br ${tool.color}`}>
                  <tool.icon className="w-7 h-7" />
                </div>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
                <ChevronRight className="arrow-icon" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PDF Tools Section */}
      <section className="pdf-tools-section">
        <div className="section-container">
          <div className="section-header">
            <h2>All PDF Tools You Need</h2>
            <p>Everything for your documents in one place</p>
          </div>

          <div className="pdf-tools-grid">
            {pdfTools.map((tool, index) => (
              <Link to={tool.link} key={index} className="pdf-tool-card">
                {tool.badge && <span className="tool-badge">{tool.badge}</span>}
                <div className={`pdf-tool-icon bg-gradient-to-br ${tool.color}`}>
                  <tool.icon className="w-6 h-6" />
                </div>
                <span className="pdf-tool-name">{tool.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-container">
          <div className="cta-card">
            <h2>Ready to get started?</h2>
            <p>No sign-up required. Start scanning your documents now.</p>
            <Link to="/scanner" className="cta-btn">
              <Camera className="w-5 h-5" />
              <span>Start Scanning</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="logo">
              <div className="logo-icon">
                <Camera className="w-4 h-4" />
              </div>
              <span className="logo-text">AngelPDF</span>
            </div>
            <p>AI-powered document intelligence platform</p>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <Link to="/scanner">Scanner</Link>
              <Link to="/pdf-tools">PDF Tools</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <div className="footer-column">
              <h4>Account</h4>
              <Link to="/login">Sign In</Link>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/settings">Settings</Link>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2024 AngelPDF. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
