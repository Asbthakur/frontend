import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/adminAPI';
import {
  CreditCard,
  DollarSign,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Loader,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    plan: '',
  });
  const [refundModal, setRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const currentPage = parseInt(new URLSearchParams(window.location.search).get('page') || '1');
  
  useEffect(() => {
    loadPayments();
  }, [currentPage, filters.status, filters.plan]);
  
  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPayments(currentPage, 20, filters);
      if (response.success) {
        setPayments(response.payments || []);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefund = async () => {
    if (!refundReason.trim()) {
      alert('Please enter a refund reason');
      return;
    }
    
    setProcessing(true);
    try {
      await adminAPI.processRefund(refundModal._id, refundReason);
      setRefundModal(null);
      setRefundReason('');
      loadPayments();
      alert('Refund processed successfully');
    } catch (error) {
      console.error('Failed to process refund:', error);
      alert('Failed to process refund');
    } finally {
      setProcessing(false);
    }
  };
  
  const formatAmount = (amount) => `₹${(amount / 100).toFixed(2)}`;
  
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  
  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="section-title flex items-center space-x-2">
          <CreditCard className="w-8 h-8" />
          <span>Payment Management</span>
        </h1>
        <p className="text-gray-600">View and manage all transactions</p>
      </div>
      
      {/* Filters */}
      <div className="card mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input-field"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          
          <select
            value={filters.plan}
            onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
            className="input-field"
          >
            <option value="">All Plans</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
          </select>
          
          <button onClick={loadPayments} className="btn-primary">
            <RefreshCw className="w-5 h-5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
      
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      )}
      
      {/* Payments Table */}
      {!loading && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Plan</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{payment.userId?.name}</p>
                      <p className="text-sm text-gray-500">{payment.userId?.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="badge-info capitalize">{payment.plan}</span>
                  </td>
                  <td className="py-3 px-4 font-bold">{formatAmount(payment.amount)}</td>
                  <td className="py-3 px-4">
                    <span className={`badge-${
                      payment.status === 'completed' ? 'success' :
                      payment.status === 'pending' ? 'warning' : 'error'
                    }`}>
                      {payment.status}
                    </span>
                    {payment.isRefunded && (
                      <span className="badge-error ml-2">Refunded</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDate(payment.createdAt)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end space-x-2">
                      {payment.status === 'completed' && !payment.isRefunded && (
                        <button
                          onClick={() => setRefundModal(payment)}
                          className="btn-outline text-sm"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {payments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No payments found
            </div>
          )}
        </div>
      )}
      
      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-6">
          <button
            onClick={() => window.location.href = `?page=${currentPage - 1}`}
            disabled={currentPage === 1}
            className="btn-outline disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="text-sm text-gray-600">
            Page {currentPage} of {pagination.pages}
          </span>
          
          <button
            onClick={() => window.location.href = `?page=${currentPage + 1}`}
            disabled={currentPage === pagination.pages}
            className="btn-outline disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Refund Modal */}
      {refundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-xl mb-4">Process Refund</h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Amount:</span>
                <span className="font-bold">{formatAmount(refundModal.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">User:</span>
                <span className="font-medium">{refundModal.userId?.email}</span>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Refund Reason</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter reason for refund..."
                className="input-field min-h-[100px]"
                required
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setRefundModal(null)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={processing}
                className="btn-primary bg-red-600 hover:bg-red-700 flex-1"
              >
                {processing ? 'Processing...' : 'Process Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;
