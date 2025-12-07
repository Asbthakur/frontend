import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Zap, Globe, FileText, Shield, Star, ArrowRight } from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: Camera,
      title: 'AI-Powered OCR',
      description: '98% accuracy with GPT-4 powered text extraction from any document',
    },
    {
      icon: Globe,
      title: '20+ Languages',
      description: 'Translate your documents instantly to any major language',
    },
    {
      icon: FileText,
      title: 'PDF Tools',
      description: 'Merge, split, compress, and manipulate PDFs with ease',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Process documents in seconds, not minutes',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is encrypted and never shared with third parties',
    },
    {
      icon: Star,
      title: 'Made in India',
      description: 'Proudly developed and hosted in India 🇮🇳',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-8 h-8 text-primary-600" />
            <span className="text-2xl font-bold gradient-text">AngelPDF</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/pricing" className="text-gray-600 hover:text-primary-600 font-medium">
              Pricing
            </Link>
            <Link to="/login" className="btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">AI-Powered</span>
            <br />
            Document Scanner
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Scan, extract, translate, and manage your documents with cutting-edge AI technology.
            Fast, accurate, and secure.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="btn-primary flex items-center space-x-2">
              <span>Start Scanning Free</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/pricing" className="btn-secondary">
              View Pricing
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • 5 free scans daily
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 gradient-text">
            Powerful Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="card group hover:scale-105 transition-transform">
                  <div className="bg-primary-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                    <Icon className="w-7 h-7 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold gradient-text mb-2">98%</div>
              <div className="text-gray-600">OCR Accuracy</div>
            </div>
            <div>
              <div className="text-5xl font-bold gradient-text mb-2">&lt;2s</div>
              <div className="text-gray-600">Avg Processing Time</div>
            </div>
            <div>
              <div className="text-5xl font-bold gradient-text mb-2">20+</div>
              <div className="text-gray-600">Languages Supported</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary-500 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users who trust AngelPDF for their document needs
          </p>
          <Link
            to="/login"
            className="inline-block bg-white text-primary-600 px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all hover:scale-105"
          >
            Start Scanning Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Camera className="w-6 h-6" />
            <span className="text-xl font-bold">AngelPDF</span>
          </div>
          <p className="text-gray-400 mb-4">
            AI-Powered Document Scanner • Made in India 🇮🇳
          </p>
          <p className="text-gray-500 text-sm">
            © 2024 AngelPDF. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
