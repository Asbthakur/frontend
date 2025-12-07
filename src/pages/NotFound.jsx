import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        {/* 404 Text */}
        <h1 className="text-9xl font-bold gradient-text mb-4">
          404
        </h1>
        
        {/* Message */}
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Page Not Found
        </h2>
        
        <p className="text-gray-600 text-lg mb-8">
          Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
        </p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="btn-outline w-full sm:w-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Go Back</span>
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="btn-primary w-full sm:w-auto"
          >
            <Home className="w-5 h-5" />
            <span>Go Home</span>
          </button>
        </div>
        
        {/* Illustration */}
        <div className="mt-12">
          <div className="w-64 h-64 mx-auto bg-gradient-to-br from-primary-100 to-purple-100 rounded-full flex items-center justify-center">
            <Search className="w-32 h-32 text-primary-300" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
