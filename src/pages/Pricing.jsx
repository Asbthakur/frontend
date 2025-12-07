import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { paymentAPI } from '../services/api';
import {
  Check,
  Crown,
  Zap,
  Shield,
  Sparkles,
  TrendingUp,
  Globe,
  AlertCircle,
  Loader,
} from 'lucide-react';

const Pricing = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      yearlyPrice: 0,
      description: 'Perfect for trying out AngelPDF',
      features: [
        '5 scans per day',
        'Basic OCR',
        'Text extraction',
        'Copy & download',
        'Email support',
      ],
      limitations: [
        'No translation',
        'No PDF tools',
        'No history access',
      ],
      icon: Sparkles,
      color: 'gray',
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 149,
      yearlyPrice: 1490,
      description: 'Great for regular users',
      popular: true,
      features: [
        '50 scans per day',
        'Advanced OCR (98% accuracy)',
        'Multi-language translation',
        'All PDF tools',
        'Scan history',
        'Copy & download',
        'Priority email support',
      ],
      icon: Zap,
      color: 'blue',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 299,
      yearlyPrice: 2990,
      description: 'For power users and businesses',
      features: [
        'Unlimited scans',
        'Advanced OCR (98% accuracy)',
        'Multi-language translation',
        'All PDF tools',
        'Unlimited history',
        'Batch scanning',
        'API access',
        'Priority support',
        'Custom branding',
      ],
      icon: Crown,
      color: 'purple',
    },
  ];
  
  const calculateYearlySavings = (monthlyPrice) => {
    const yearlyTotal = monthlyPrice * 12;
    const yearlyPrice = monthlyPrice * 10; // 2 months free
    return yearlyTotal - yearlyPrice;
  };
  
  const handleSubscribe = async (planId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (planId === 'free') {
      navigate('/dashboard');
      return;
    }
    
    if (user?.plan === planId) {
      navigate('/dashboard');
      return;
    }
    
    setProcessing(true);
    setError('');
    
    try {
      // Create order
      const planKey = `${planId}_${billingCycle}`;
      const orderResponse = await paymentAPI.createOrder(planKey);
      
      if (!orderResponse.success) {
        throw new Error(orderResponse.message || 'Failed to create order');
      }
      
      const { order } = orderResponse;
      
      // Razorpay options
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_your_key',
        amount: order.amount,
        currency: order.currency,
        name: 'AngelPDF',
        description: `${plans.find(p => p.id === planId).name} Plan - ${billingCycle}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyResponse = await paymentAPI.verifyPayment(
              order.id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            
            if (verifyResponse.success) {
              // Success! Redirect to dashboard
              navigate('/dashboard?payment=success');
            } else {
              setError('Payment verification failed');
            }
          } catch (err) {
            console.error('Verification error:', err);
            setError('Payment verification failed');
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: function() {
            setProcessing(false);
          }
        }
      };
      
      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to process payment');
      setProcessing(false);
    }
  };
  
  return (
    <div className="page-container">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Choose Your <span className="gradient-text">Perfect Plan</span>
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Unlock the full power of AI-powered document scanning
        </p>
      </div>
      
      {/* Billing Toggle */}
      <div className="flex items-center justify-center mb-12">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              billingCycle === 'yearly'
                ? 'bg-white text-gray-900 shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly
            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Save 16%
            </span>
          </button>
        </div>
      </div>
      
      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = user?.plan === plan.id;
          const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;
          const displayPrice = billingCycle === 'yearly' ? Math.round(price / 12) : price;
          
          return (
            <div
              key={plan.id}
              className={`card relative ${
                plan.popular ? 'ring-2 ring-primary-500 shadow-xl scale-105' : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-4 right-4">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Current Plan
                  </span>
                </div>
              )}
              
              {/* Icon */}
              <div className={`w-14 h-14 bg-${plan.color}-100 rounded-2xl flex items-center justify-center mb-4`}>
                <Icon className={`w-7 h-7 text-${plan.color}-600`} />
              </div>
              
              {/* Name & Description */}
              <h3 className="font-bold text-2xl mb-2">{plan.name}</h3>
              <p className="text-gray-600 text-sm mb-6">{plan.description}</p>
              
              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold">₹{displayPrice}</span>
                  <span className="text-gray-600 ml-2">/month</span>
                </div>
                {billingCycle === 'yearly' && price > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    ₹{price}/year • Save ₹{calculateYearlySavings(plan.price)}
                  </p>
                )}
                {plan.id === 'free' && (
                  <p className="text-sm text-gray-500 mt-1">Forever free</p>
                )}
              </div>
              
              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {/* CTA Button */}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={processing || isCurrentPlan}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-gradient-to-r from-primary-500 to-purple-600 text-white hover:from-primary-600 hover:to-purple-700'
                    : isCurrentPlan
                    ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-50`}
              >
                {processing ? (
                  <span className="flex items-center justify-center">
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    Processing...
                  </span>
                ) : isCurrentPlan ? (
                  'Current Plan'
                ) : plan.id === 'free' ? (
                  'Get Started'
                ) : (
                  'Subscribe Now'
                )}
              </button>
            </div>
          );
        })}
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="max-w-2xl mx-auto mb-8">
          <div className="card bg-red-50 border-red-200">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Payment Failed</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Features Comparison */}
      <div className="max-w-4xl mx-auto">
        <h2 className="font-bold text-2xl text-center mb-8">
          Why Choose AngelPDF?
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-bold mb-2">Lightning Fast</h3>
            <p className="text-gray-600 text-sm">
              Process documents in under 2 seconds with our AI engine
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-bold mb-2">Secure & Private</h3>
            <p className="text-gray-600 text-sm">
              Your documents are encrypted and never shared with third parties
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-bold mb-2">Multi-Language</h3>
            <p className="text-gray-600 text-sm">
              Support for 20+ languages with instant translation
            </p>
          </div>
        </div>
      </div>
      
      {/* Money Back Guarantee */}
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <div className="card bg-gradient-to-r from-green-50 to-blue-50">
          <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="font-bold text-xl mb-2">7-Day Money Back Guarantee</h3>
          <p className="text-gray-600">
            Not satisfied? Get a full refund within 7 days, no questions asked.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
