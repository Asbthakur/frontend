import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/adminAPI';
import {
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  Calendar,
  Loader,
} from 'lucide-react';

const AdminAnalytics = () => {
  const [period, setPeriod] = useState('monthly');
  const [revenueData, setRevenueData] = useState([]);
  const [userData, setUserData] = useState([]);
  const [scanData, setScanData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadAnalytics();
  }, [period]);
  
  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      const [revenue, users, scans] = await Promise.all([
        adminAPI.getRevenueAnalytics(period),
        adminAPI.getUserAnalytics(period),
        adminAPI.getScanAnalytics(period),
      ]);
      
      setRevenueData(revenue.revenue || []);
      setUserData(users.userGrowth || []);
      setScanData(scans.scanStats || []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatAmount = (amount) => `₹${(amount / 100).toFixed(0)}`;
  
  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="section-title flex items-center space-x-2">
          <TrendingUp className="w-8 h-8" />
          <span>Analytics Dashboard</span>
        </h1>
        <p className="text-gray-600">Business insights and trends</p>
      </div>
      
      {/* Period Selector */}
      <div className="mb-6 flex items-center space-x-2">
        {['daily', 'weekly', 'monthly', 'yearly'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium capitalize ${
              period === p
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      )}
      
      {!loading && (
        <div className="space-y-8">
          {/* Revenue Analytics */}
          <div className="card">
            <h2 className="font-bold text-xl mb-6 flex items-center space-x-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              <span>Revenue Trends</span>
            </h2>
            
            {revenueData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No revenue data available</p>
            ) : (
              <div className="space-y-3">
                {revenueData.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">
                      {period === 'monthly' && `${item._id.year}-${String(item._id.month).padStart(2, '0')}`}
                      {period === 'yearly' && item._id.year}
                      {period === 'daily' && `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`}
                    </span>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatAmount(item.revenue)}</p>
                      <p className="text-xs text-gray-500">{item.count} payments</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* User Growth */}
          <div className="card">
            <h2 className="font-bold text-xl mb-6 flex items-center space-x-2">
              <Users className="w-6 h-6 text-blue-600" />
              <span>User Growth</span>
            </h2>
            
            {userData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No user data available</p>
            ) : (
              <div className="space-y-3">
                {userData.slice(0, 10).map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">
                        {period === 'monthly' && `${item._id.year}-${String(item._id.month).padStart(2, '0')}`}
                        {period === 'yearly' && item._id.year}
                      </span>
                      <span className="font-bold">{item.count} users</span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="text-gray-500">Free: {item.free}</span>
                      <span className="text-blue-600">Basic: {item.basic}</span>
                      <span className="text-purple-600">Pro: {item.pro}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Scan Analytics */}
          <div className="card">
            <h2 className="font-bold text-xl mb-6 flex items-center space-x-2">
              <FileText className="w-6 h-6 text-purple-600" />
              <span>Scan Usage</span>
            </h2>
            
            {scanData.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No scan data available</p>
            ) : (
              <div className="space-y-3">
                {scanData.slice(0, 10).map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">
                        {period === 'monthly' && `${item._id.year}-${String(item._id.month).padStart(2, '0')}`}
                        {period === 'daily' && `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`}
                      </span>
                      <span className="font-bold">{item.totalScans} scans</span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="text-green-600">OCR: {item.ocrScans}</span>
                      <span className="text-blue-600">PDF: {item.pdfOperations}</span>
                      {item.avgConfidence && (
                        <span className="text-gray-600">
                          Avg Confidence: {Math.round(item.avgConfidence)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;
