import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary-50 to-purple-50 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="loading-spinner mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold gradient-text">AngelPDF</h2>
        <p className="text-gray-600 mt-2">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
