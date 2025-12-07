import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentAPI, ocrAPI } from '../services/api';
import {
  Camera,
  FileText,
  History,
  Zap,
  Crown,
  TrendingUp,
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load subscription status
      const subsResponse = await paymentAPI.getSubscriptionStatus();
      setStats(subsResponse.stats);
      
      // Load recent scans
      const scansResponse = await ocrAPI.getScanHistory(1, 5);
      setRecentScans(scansResponse.scans || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  const planColors = {
    free: 'bg-gray-100 text-gray-700',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
  };
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  return (
    <div className="page-container">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.name || 'User'}! 👋
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your documents today
        </p>
      </div>
      
      {/* Subscription Card */}
      <div className="card bg-gradient-to-r from-primary-500 to-purple-600 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="w-6 h-6" />
              <span className="text-2xl font-bold capitalize">{user?.plan} Plan</span>
            </div>
            
            {user?.plan === 'free' ? (
              <div>
                <p className="opacity-90 mb-4">
                  {stats?.scansRemaining || 0} scans remaining today
                </p>
                <button
                  onClick={() => navigate('/pricing')}
                  className="bg-white text-primary-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Upgrade Now
                </button>
              </div>
            ) : (
              <div>
                <p className="opacity-90">
                  {user?.plan === 'pro' ? 'Unlimited scans' : `${stats?.scansRemaining || 0} scans remaining today`}
                </p>
                {user?.subscriptionEndDate && (
                  <p className="opacity-75 text-sm mt-2">
                    Valid until {formatDate(user.subscriptionEndDate)}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="text-right">
            <div className="text-4xl font-bold">{stats?.scansToday || 0}</div>
            <div className="opacity-90">Scans Today</div>
          </div>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Today's Scans */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {stats?.scansToday || 0}
              </div>
              <div className="text-sm text-gray-600">Today</div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {stats?.scansRemaining !== undefined
              ? `${stats.scansRemaining} remaining`
              : 'Unlimited'}
          </div>
        </div>
        
        {/* This Month */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-600">
                {stats?.scansThisMonth || 0}
              </div>
              <div className="text-sm text-gray-600">This Month</div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            {stats?.scansThisMonth > (stats?.scansLastMonth || 0) ? (
              <span className="text-green-600 flex items-center space-x-1">
                <TrendingUp className="w-4 h-4" />
                <span>Growing!</span>
              </span>
            ) : (
              <span>Keep scanning</span>
            )}
          </div>
        </div>
        
        {/* Total Scans */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-600">
                {stats?.totalScans || 0}
              </div>
              <div className="text-sm text-gray-600">All Time</div>
            </div>
          </div>
          <div className="text-sm text-gray-600">Total documents</div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="font-bold text-xl mb-4">Quick Actions</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Scan Document */}
          <button
            onClick={() => navigate('/scanner')}
            className="card hover:shadow-xl transition-all group text-left"
          >
            <div className="flex items-start space-x-4">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">Scan Document</h3>
                <p className="text-gray-600 text-sm mb-3">
                  Use camera or upload image
                </p>
                <div className="flex items-center text-primary-600 text-sm font-medium">
                  <span>Start Scanning</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          </button>
          
          {/* PDF Tools */}
          <button
            onClick={() => navigate('/pdf-tools')}
            className="card hover:shadow-xl transition-all group text-left"
          >
            <div className="flex items-start space-x-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">PDF Tools</h3>
                <p className="text-gray-600 text-sm mb-3">
                  Merge, split, compress PDFs
                </p>
                <div className="flex items-center text-green-600 text-sm font-medium">
                  <span>Open Tools</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          </button>
          
          {/* View History */}
          <button
            onClick={() => navigate('/history')}
            className="card hover:shadow-xl transition-all group text-left"
          >
            <div className="flex items-start space-x-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                <History className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">View History</h3>
                <p className="text-gray-600 text-sm mb-3">
                  Access past scans
                </p>
                <div className="flex items-center text-blue-600 text-sm font-medium">
                  <span>View All</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
      
      {/* Recent Scans */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-xl">Recent Scans</h2>
          {recentScans.length > 0 && (
            <button
              onClick={() => navigate('/history')}
              className="text-primary-600 text-sm font-medium hover:underline"
            >
              View All
            </button>
          )}
        </div>
        
        {recentScans.length === 0 ? (
          <div className="card text-center py-12">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2">No scans yet</h3>
            <p className="text-gray-600 mb-4">
              Start scanning documents to see them here
            </p>
            <button
              onClick={() => navigate('/scanner')}
              className="btn-primary"
            >
              <Camera className="w-5 h-5" />
              <span>Scan Your First Document</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentScans.map((scan) => (
              <div
                key={scan._id}
                onClick={() => navigate(`/history?scan=${scan._id}`)}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`badge-${scan.status === 'completed' ? 'success' : 'error'} text-xs`}>
                        {scan.scanType}
                      </span>
                      {scan.ocr?.language && (
                        <span className="text-xs text-gray-500">
                          {scan.ocr.language}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 truncate">
                      {scan.ocr?.text?.substring(0, 60) || 'Processing...'}
                      {scan.ocr?.text?.length > 60 && '...'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(scan.createdAt)}
                    </p>
                  </div>
                  
                  {/* Status */}
                  <div className="flex-shrink-0">
                    {scan.status === 'completed' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Upgrade CTA for free users */}
      {user?.plan === 'free' && (
        <div className="mt-8 card bg-gradient-to-r from-primary-500 to-purple-600 text-white">
          <div className="text-center py-6">
            <Crown className="w-12 h-12 mx-auto mb-4" />
            <h3 className="font-bold text-2xl mb-2">Unlock Unlimited Scans</h3>
            <p className="mb-6 opacity-90">
              Upgrade to Pro and scan as many documents as you want
            </p>
            <button
              onClick={() => navigate('/pricing')}
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
            >
              View Plans
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
