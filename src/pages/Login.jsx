import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Camera, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(1); // 1: email, 2: OTP
  const [email, setEmail] = useState('');
  const [otp, setOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.sendOTP(email);
      if (response.success) {
        setSuccess('OTP sent! Check your email.');
        setStep(2);
      } else {
        setError(response.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, otp);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authAPI.resendOTP(email);
      if (response.success) {
        setSuccess('New OTP sent!');
      } else {
        setError(response.message || 'Failed to resend OTP');
      }
    } catch (err) {
      setError('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-4">
            <Camera className="w-10 h-10 text-primary-600" />
            <span className="text-3xl font-bold gradient-text">AngelPDF</span>
          </Link>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="card">
          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {step === 1 ? (
            // Step 1: Enter Email
            <form onSubmit={handleSendOTP}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input-field pl-11"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner w-5 h-5 border-2 border-white border-t-transparent"></div>
                    <span>Sending OTP...</span>
                  </>
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-600 mt-4">
                We'll send a 6-digit code to your email
              </p>
            </form>
          ) : (
            // Step 2: Enter OTP
            <form onSubmit={handleVerifyOTP}>
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOTP('');
                    setError('');
                    setSuccess('');
                  }}
                  className="text-primary-600 text-sm hover:underline"
                >
                  ← Change email
                </button>
              </div>

              <div className="mb-2">
                <p className="text-sm text-gray-600">
                  OTP sent to: <span className="font-semibold">{email}</span>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Enter OTP
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="input-field pl-11 text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full btn-primary flex items-center justify-center space-x-2 mb-4"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner w-5 h-5 border-2 border-white border-t-transparent"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Login</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="w-full text-primary-600 text-sm hover:underline"
              >
                Didn't receive? Resend OTP
              </button>
            </form>
          )}
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-gray-600 hover:text-primary-600 text-sm">
            ← Back to Home
          </Link>
        </div>

        {/* Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
