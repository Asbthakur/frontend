import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/adminAPI';
import {
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle,
  Crown,
  Zap,
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadDashboard();
  }, [user, navigate]);

  const loadDashboard = async () => {
    try {
      const data = await adminAPI.getDashboardStats();
      setStats(data.stats);
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
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

  if (error) {
    return (
      <div className="page-container">
        <div className="card bg-red-50 border-red-200">
          <AlertCircle className="w-6 h-6 text-red-600 mb-2" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => `₹${(amount / 100).toFixed(2)}`;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-title flex items-center space-x-2">
          <Crown className="w-8 h-8 text-yellow-500" />
          <span>Admin Dashboard</span>
        </h1>
        <p className="text-gray-600">Welcome back, {user.name}! Here's your business overview.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div className="card hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-primary-100 p-3 rounded-xl">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold gradient-text">{stats.users.total}</p>
              <p className="text-sm text-gray-600">Total Users</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-green-600 font-semibold">
              +{stats.users.newToday} today
            </span>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="card hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.revenue.thisMonth)}
              </p>
              <p className="text-sm text-gray-600">This Month</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Total: {formatCurrency(stats.revenue.total)}
          </div>
        </div>

        {/* Total Scans */}
        <div className="card hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">{stats.scans.total}</p>
              <p className="text-sm text-gray-600">Total Scans</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="text-blue-600 font-semibold">
              {stats.scans.today} today
            </span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="card hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p-3 rounded-xl">
              <Crown className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-600">
                {stats.subscriptions.active}
              </p>
              <p className="text-sm text-gray-600">Active Subs</p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Total: {stats.subscriptions.total}
          </div>
        </div>
      </div>

      {/* User Breakdown */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* User Distribution */}
        <div className="card">
          <h3 className="font-bold text-lg mb-4">User Distribution</h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Free Users</span>
                <span className="font-semibold">{stats.users.free}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gray-500 h-2 rounded-full"
                  style={{
                    width: `${(stats.users.free / stats.users.total) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Basic Users</span>
                <span className="font-semibold">{stats.users.basic}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${(stats.users.basic / stats.users.total) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Pro Users</span>
                <span className="font-semibold">{stats.users.pro}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{
                    width: `${(stats.users.pro / stats.users.total) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Conversion Rate</span>
              <span className="font-bold text-green-600">
                {(((stats.users.basic + stats.users.pro) / stats.users.total) * 100).toFixed(
                  1
                )}
                %
              </span>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="card">
          <h3 className="font-bold text-lg mb-4">Revenue by Plan</h3>
          <div className="space-y-4">
            {stats.revenue.byPlan.map((item) => (
              <div key={item._id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 capitalize">{item._id} Plan</span>
                  <span className="font-semibold">{formatCurrency(item.total)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{item.count} payments</span>
                  <span>Avg: {formatCurrency(item.total / item.count)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* Scan Stats */}
        <div className="card">
          <h3 className="font-bold text-lg mb-4">Scan Statistics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className="font-semibold text-green-600">
                {((stats.scans.successful / stats.scans.total) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Failed Scans</span>
              <span className="font-semibold text-red-600">{stats.scans.failed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg per User</span>
              <span className="font-semibold">{stats.scans.avgPerUser}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">This Month</span>
              <span className="font-semibold">{stats.scans.thisMonth}</span>
            </div>
          </div>
        </div>

        {/* Payment Stats */}
        <div className="card">
          <h3 className="font-bold text-lg mb-4">Payment Statistics</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="font-semibold text-green-600">{stats.payments.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="font-semibold text-yellow-600">{stats.payments.pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Failed</span>
              <span className="font-semibold text-red-600">{stats.payments.failed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Refunded</span>
              <span className="font-semibold text-orange-600">{stats.payments.refunded}</span>
            </div>
          </div>
        </div>

        {/* Scan Types */}
        <div className="card">
          <h3 className="font-bold text-lg mb-4">Scan Types</h3>
          <div className="space-y-3">
            {stats.scans.byType.map((item) => (
              <div key={item._id} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">
                  {item._id || 'Unknown'}
                </span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="btn-primary flex items-center justify-center space-x-2"
          >
            <Users className="w-5 h-5" />
            <span>Manage Users</span>
          </button>

          <button
            onClick={() => navigate('/admin/payments')}
            className="btn-primary flex items-center justify-center space-x-2"
          >
            <DollarSign className="w-5 h-5" />
            <span>View Payments</span>
          </button>

          <button
            onClick={() => navigate('/admin/analytics')}
            className="btn-primary flex items-center justify-center space-x-2"
          >
            <TrendingUp className="w-5 h-5" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => navigate('/admin/system')}
            className="btn-primary flex items-center justify-center space-x-2"
          >
            <Activity className="w-5 h-5" />
            <span>System Health</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
