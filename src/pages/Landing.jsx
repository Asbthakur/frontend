import React from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  return (
    <div className="angelpdf-landing">
      {/* Header */}
      <header className="landing-header">
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo">
              <span className="logo-icon">A</span>
              AngelPDF
            </Link>
            <Link to="/login" className="nav-btn">Sign In</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-badge">
            ✨ <span>AI-Powered</span> • Free Forever
          </div>
          <h1>AI Document Intelligence<br/>Platform</h1>
          <p className="subtitle">Scan, Extract, Translate, Convert — All powered by AI, all completely free</p>
        </div>
      </section>

      {/* Upload Section */}
      <section className="upload-section">
        <div className="container">
          <div className="upload-card">
            <div className="upload-area">
              <div className="upload-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="upload-title">Drop your files here</p>
              <p className="upload-subtitle">or click to browse from your device</p>
              <Link to="/scanner" className="browse-btn">Select Files</Link>
              <p className="supported-formats">Supported formats</p>
              <div className="format-tags">
                <span className="format-tag">PDF</span>
                <span className="format-tag">JPG</span>
                <span className="format-tag">PNG</span>
                <span className="format-tag">TIFF</span>
                <span className="format-tag">WEBP</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Middle Tagline */}
      <section className="tagline-section">
        <div className="container">
          <h2>Snap. Scan. Extract. Done.</h2>
          <p>AI-powered text extraction from any image — <span className="highlight">No signup needed</span></p>
        </div>
      </section>

      {/* Tools Section */}
      <section className="tools-section">
        <div className="container">
          <div className="section-header">
            <h3>All PDF Tools You Need</h3>
            <p>Professional document tools, completely free</p>
          </div>
          <div className="tools-grid">
            {/* Tool 1: Merge PDF */}
            <Link to="/pdf-tools" className="tool-card">
              <div className="tool-icon icon-merge">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="tool-name">Merge PDF</span>
            </Link>

            {/* Tool 2: Split PDF */}
            <Link to="/pdf-tools" className="tool-card">
              <div className="tool-icon icon-split">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <span className="tool-name">Split PDF</span>
            </Link>

            {/* Tool 3: Compress PDF */}
            <Link to="/pdf-tools" className="tool-card">
              <div className="tool-icon icon-compress">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <span className="tool-name">Compress PDF</span>
            </Link>

            {/* Tool 4: PDF to Word */}
            <Link to="/pdf-tools" className="tool-card">
              <div className="tool-icon icon-pdf-word">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="tool-name">PDF to Word</span>
            </Link>

            {/* Tool 5: PDF to PowerPoint */}
            <Link to="/pdf-tools" className="tool-card">
              <div className="tool-icon icon-pdf-ppt">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="tool-name">PDF to PPT</span>
            </Link>

            {/* Tool 6: PDF to Excel */}
            <Link to="/pdf-tools" className="tool-card">
              <div className="tool-icon icon-pdf-excel">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="tool-name">PDF to Excel</span>
            </Link>

            {/* Tool 7: Word to PDF */}
            <Link to="/pdf-tools" className="tool-card">
              <div className="tool-icon icon-word-pdf">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="tool-name">Word to PDF</span>
            </Link>

            {/* Tool 8: PowerPoint to PDF */}
            <Link to="/pdf-tools" className="tool-card">
              <div className="tool-icon icon-ppt-pdf">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <span className="tool-name">PPT to PDF</span>
            </Link>

            {/* Tool 9: Excel to PDF */}
            <Link to="/pdf-tools" className="tool-card">
              <div className="tool-icon icon-excel-pdf">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="tool-name">Excel to PDF</span>
            </Link>

            {/* Tool 10: Edit PDF */}
            <Link to="/pdf-tools" className="tool-card">
              <span className="new-badge">New!</span>
              <div className="tool-icon icon-edit">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <span className="tool-name">Edit PDF</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-links">
            <Link to="/pricing">Pricing</Link>
            <Link to="/login">Sign In</Link>
          </div>
          <p>&copy; 2024 AngelPDF. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
