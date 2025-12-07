import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/adminAPI';
import {
  Activity,
  Database,
  DollarSign,
  Server,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Loader,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

const AdminSystem = () => {
  const [health, setHealth] = useState(null);
  const [costs, setCosts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    loadSystemData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSystemData, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const loadSystemData = async () => {
    try {
      setRefreshing(true);
      
      const [healthResponse, costsResponse] = await Promise.all([
        adminAPI.getSystemHealth(),
        adminAPI.getSystemCosts(),
      ]);
      
      setHealth(healthResponse.health);
      setCosts(costsResponse.costs);
    } catch (error) {
      console.error('Failed to load system data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };
  
  const formatMemory = (bytes) => {
    return `${(bytes.heapUsed / 1024 / 1024).toFixed(0)}MB / ${(bytes.heapTotal / 1024 / 1024).toFixed(0)}MB`;
  };
  
  const formatCurrency = (amount) => `₹${amount.toFixed(2)}`;
  
  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }
  
  return (
    <div className="page-container">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center space-x-2">
            <Activity className="w-8 h-8" />
            <span>System Monitoring</span>
          </h1>
          <p className="text-gray-600">Real-time system health and costs</p>
        </div>
        
        <button
          onClick={loadSystemData}
          disabled={refreshing}
          className="btn-outline"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
      
      {/* System Health */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Database Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <Database className="w-8 h-8 text-blue-600" />
            {health?.database === 'healthy' ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600" />
            )}
          </div>
          <h3 className="font-bold text-lg mb-1">Database</h3>
          <p className={`text-sm ${
            health?.database === 'healthy' ? 'text-green-600' : 'text-red-600'
          }`}>
            {health?.database === 'healthy' ? 'Connected' : 'Disconnected'}
          </p>
        </div>
        
        {/* System Uptime */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <Server className="w-8 h-8 text-purple-600" />
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-bold text-lg mb-1">Uptime</h3>
          <p className="text-sm text-gray-600">
            {formatUptime(health?.uptime || 0)}
          </p>
        </div>
        
        {/* Memory Usage */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="font-bold text-lg mb-1">Memory</h3>
          <p className="text-sm text-gray-600">
            {health?.memory && formatMemory(health.memory)}
          </p>
        </div>
        
        {/* Pending Operations */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <Loader className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="font-bold text-lg mb-1">Pending</h3>
          <p className="text-sm text-gray-600">
            {health?.pending?.payments || 0} payments, {health?.pending?.scans || 0} scans
          </p>
        </div>
      </div>
      
      {/* Cost Breakdown */}
      {costs && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Monthly Costs */}
          <div className="card">
            <h2 className="font-bold text-xl mb-6 flex items-center space-x-2">
              <DollarSign className="w-6 h-6 text-red-600" />
              <span>Monthly Costs</span>
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">OpenAI API</span>
                <span className="font-bold">{formatCurrency(costs.ocrCost)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Translation API</span>
                <span className="font-bold">{formatCurrency(costs.translationCost)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Razorpay Fees</span>
                <span className="font-bold">{formatCurrency(costs.razorpayFees)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Server (DigitalOcean)</span>
                <span className="font-bold">{formatCurrency(costs.serverCost)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg border-2 border-red-200">
                <span className="font-bold text-red-900">Total Costs</span>
                <span className="font-bold text-xl text-red-900">
                  {formatCurrency(costs.totalEstimated)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Revenue & Profit */}
          <div className="card">
            <h2 className="font-bold text-xl mb-6 flex items-center space-x-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <span>Revenue & Profit</span>
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border-2 border-green-200">
                <span className="font-bold text-green-900">Total Revenue</span>
                <span className="font-bold text-xl text-green-900">
                  {formatCurrency(costs.revenue)}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-gray-700">Total Costs</span>
                <span className="font-bold text-red-600">
                  -{formatCurrency(costs.totalEstimated)}
                </span>
              </div>
              
              <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                costs.profit >= 0
                  ? 'bg-gradient-to-r from-green-500 to-green-600 border-green-600'
                  : 'bg-gradient-to-r from-red-500 to-red-600 border-red-600'
              }`}>
                <div className="text-white">
                  <span className="text-sm opacity-90">Net Profit</span>
                  <div className="flex items-center space-x-2 mt-1">
                    {costs.profit >= 0 ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                    <span className="font-bold text-2xl">
                      {formatCurrency(Math.abs(costs.profit))}
                    </span>
                  </div>
                </div>
                <div className="text-white text-right">
                  <span className="text-sm opacity-90">Margin</span>
                  <div className="font-bold text-2xl mt-1">
                    {costs.revenue > 0
                      ? Math.round((costs.profit / costs.revenue) * 100)
                      : 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Logs */}
      {health?.errors && (
        <div className="card">
          <h2 className="font-bold text-xl mb-6 flex items-center space-x-2">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <span>Recent Errors (24h)</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Failed Scans</span>
                <span className="font-bold text-red-600 text-xl">
                  {health.errors.failedScans24h}
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Failed Payments</span>
                <span className="font-bold text-red-600 text-xl">
                  {health.errors.failedPayments24h}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSystem;
