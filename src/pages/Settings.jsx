import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI, paymentAPI } from '../services/api';
import {
  User,
  Mail,
  Crown,
  Calendar,
  CreditCard,
  Bell,
  Globe,
  LogOut,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle,
  Loader,
} from 'lucide-react';

const Settings = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  // Profile state
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  
  // Subscription state
  const [subscription, setSubscription] = useState(null);
  const [payments, setPayments] = useState([]);
  
  // Preferences state
  const [preferences, setPreferences] = useState({
    defaultLanguage: 'en',
    autoTranslate: false,
    emailNotifications: true,
  });
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(false);
  
  useEffect(() => {
    if (activeTab === 'subscription') {
      loadSubscriptionData();
    }
  }, [activeTab]);
  
  const loadSubscriptionData = async () => {
    try {
      const subResponse = await paymentAPI.getSubscriptionStatus();
      setSubscription(subResponse.stats);
      
      const payResponse = await paymentAPI.getPaymentHistory(1, 5);
      setPayments(payResponse.payments || []);
    } catch (err) {
      console.error('Failed to load subscription:', err);
    }
  };
  
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await authAPI.updateProfile({
        name: profile.name,
      });
      
      if (response.success) {
        updateUser(response.user);
        setSuccess('Profile updated successfully');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancelSubscription = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await paymentAPI.cancelSubscription();
      
      if (response.success) {
        setSuccess('Subscription cancelled. You can still use it until the end date.');
        setCancelConfirm(false);
        loadSubscriptionData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    try {
      await authAPI.logout();
      logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }
    
    // In a real app, you'd have a deleteAccount API endpoint
    alert('Account deletion would be processed here');
  };
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const formatAmount = (amount) => {
    return `₹${(amount / 100).toFixed(2)}`;
  };
  
  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-title">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>
      
      {/* Tabs */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex space-x-2 border-b">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Profile</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('subscription')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'subscription'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Crown className="w-4 h-4" />
              <span>Subscription</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'preferences'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Preferences</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('account')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'account'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Trash2 className="w-4 h-4" />
              <span>Account</span>
            </div>
          </button>
        </div>
      </div>
      
      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 card bg-green-50 border-green-200">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <p className="text-green-900">{success}</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-6 card bg-red-50 border-red-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-red-900">{error}</p>
          </div>
        </div>
      )}
      
      {/* Tab Content */}
      <div className="max-w-2xl">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="card">
            <h2 className="font-bold text-xl mb-6">Profile Information</h2>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  className="input-field bg-gray-100"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
        
        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="card">
              <h2 className="font-bold text-xl mb-4">Current Plan</h2>
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <Crown className="w-5 h-5 text-primary-600" />
                    <span className="font-bold text-lg capitalize">{user?.plan}</span>
                  </div>
                  {user?.subscriptionEndDate && (
                    <p className="text-sm text-gray-600 mt-1">
                      Valid until {formatDate(user.subscriptionEndDate)}
                    </p>
                  )}
                </div>
                
                <button
                  onClick={() => navigate('/pricing')}
                  className="btn-primary"
                >
                  {user?.plan === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                </button>
              </div>
              
              {subscription && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-600">Scans Today</p>
                    <p className="text-2xl font-bold">{subscription.scansToday || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">This Month</p>
                    <p className="text-2xl font-bold">{subscription.scansThisMonth || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold">{subscription.totalScans || 0}</p>
                  </div>
                </div>
              )}
              
              {user?.plan !== 'free' && (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="mt-4 text-sm text-red-600 hover:underline"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
            
            {/* Payment History */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-xl">Payment History</h2>
                <button
                  onClick={() => navigate('/history')}
                  className="text-sm text-primary-600 hover:underline"
                >
                  View All
                </button>
              </div>
              
              {payments.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No payments yet</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium capitalize">{payment.plan} Plan</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(payment.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatAmount(payment.amount)}</p>
                        <span className={`text-xs badge-${
                          payment.status === 'completed' ? 'success' : 'error'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="card">
            <h2 className="font-bold text-xl mb-6">Preferences</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Default OCR Language
                </label>
                <select
                  value={preferences.defaultLanguage}
                  onChange={(e) => setPreferences({ ...preferences, defaultLanguage: e.target.value })}
                  className="input-field"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between py-3 border-t border-b">
                <div>
                  <p className="font-medium">Auto-translate</p>
                  <p className="text-sm text-gray-600">
                    Automatically translate to your preferred language
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.autoTranslate}
                    onChange={(e) => setPreferences({ ...preferences, autoTranslate: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-gray-600">
                    Receive updates and promotions via email
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.emailNotifications}
                    onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
            
            <button className="btn-primary mt-6">
              <Save className="w-5 h-5" />
              <span>Save Preferences</span>
            </button>
          </div>
        )}
        
        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            {/* Logout */}
            <div className="card">
              <h2 className="font-bold text-xl mb-4">Logout</h2>
              <p className="text-gray-600 mb-4">
                Sign out of your account on this device
              </p>
              <button
                onClick={handleLogout}
                className="btn-outline"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
            
            {/* Delete Account */}
            <div className="card border-red-200 bg-red-50">
              <h2 className="font-bold text-xl mb-2 text-red-900">Danger Zone</h2>
              <p className="text-red-700 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              
              <div className="space-y-3">
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  className="input-field"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE'}
                  className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Delete Account</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Cancel Subscription Confirmation */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-xl mb-2">Cancel Subscription?</h3>
            <p className="text-gray-600 mb-6">
              You can continue using your plan until {user?.subscriptionEndDate && formatDate(user.subscriptionEndDate)}. After that, you'll be downgraded to the Free plan.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setCancelConfirm(false)}
                className="btn-outline flex-1"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={loading}
                className="btn-primary bg-red-600 hover:bg-red-700 flex-1"
              >
                {loading ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
