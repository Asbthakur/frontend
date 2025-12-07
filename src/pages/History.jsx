import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ocrAPI } from '../services/api';
import {
  FileText,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  Calendar,
  CheckCircle,
  XCircle,
  Loader,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

const History = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    status: '',
  });
  const [selectedScan, setSelectedScan] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const currentPage = parseInt(searchParams.get('page') || '1');
  
  useEffect(() => {
    loadScans();
  }, [currentPage, filters.type, filters.status]);
  
  useEffect(() => {
    // Check if scan ID in URL
    const scanId = searchParams.get('scan');
    if (scanId) {
      loadAndViewScan(scanId);
    }
  }, [searchParams]);
  
  const loadScans = async () => {
    try {
      setLoading(true);
      
      const params = {};
      if (filters.type) params.scanType = filters.type;
      if (filters.status) params.status = filters.status;
      
      const response = await ocrAPI.getScanHistory(currentPage, 20, params);
      
      if (response.success) {
        setScans(response.scans || []);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to load scans:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadAndViewScan = async (scanId) => {
    try {
      const response = await ocrAPI.getScan(scanId);
      if (response.success) {
        setSelectedScan(response.scan);
        setViewModal(true);
      }
    } catch (error) {
      console.error('Failed to load scan:', error);
    }
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    // In a real app, you'd implement server-side search
    // For now, just filter client-side
    if (filters.search) {
      const filtered = scans.filter(scan =>
        scan.ocr?.text?.toLowerCase().includes(filters.search.toLowerCase())
      );
      setScans(filtered);
    } else {
      loadScans();
    }
  };
  
  const handleDelete = async (scanId) => {
    try {
      await ocrAPI.deleteScan(scanId);
      setScans(scans.filter(s => s._id !== scanId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete scan:', error);
      alert('Failed to delete scan');
    }
  };
  
  const downloadText = (scan) => {
    if (!scan.ocr?.text) return;
    
    const blob = new Blob([scan.ocr.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scan_${scan._id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const goToPage = (page) => {
    setSearchParams({ page: page.toString() });
  };
  
  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  
  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-title">Scan History</h1>
        <p className="text-gray-600">
          View and manage all your scanned documents
        </p>
      </div>
      
      {/* Filters & Search */}
      <div className="card mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search in text..."
              className="input-field pl-10"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
          </form>
          
          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="input-field"
          >
            <option value="">All Types</option>
            <option value="quick">Quick Scan</option>
            <option value="batch">Batch Scan</option>
            <option value="merge">PDF Merge</option>
            <option value="split">PDF Split</option>
          </select>
          
          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input-field"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>
      
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      )}
      
      {/* Empty State */}
      {!loading && scans.length === 0 && (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="font-bold text-xl mb-2">No scans found</h3>
          <p className="text-gray-600">
            {filters.search || filters.type || filters.status
              ? 'Try adjusting your filters'
              : 'Start scanning documents to see them here'}
          </p>
        </div>
      )}
      
      {/* Scan List */}
      {!loading && scans.length > 0 && (
        <div className="space-y-3">
          {scans.map((scan) => (
            <div key={scan._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  scan.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {scan.status === 'completed' ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`badge-${scan.status === 'completed' ? 'success' : 'error'} text-xs`}>
                        {scan.scanType}
                      </span>
                      {scan.ocr?.language && (
                        <span className="text-xs text-gray-500">
                          {scan.ocr.language}
                        </span>
                      )}
                      {scan.ocr?.confidence && (
                        <span className="text-xs text-gray-500">
                          {Math.round(scan.ocr.confidence)}% confidence
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedScan(scan);
                          setViewModal(true);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      
                      {scan.ocr?.text && (
                        <button
                          onClick={() => downloadText(scan)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Download Text"
                        >
                          <Download className="w-4 h-4 text-gray-600" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => setDeleteConfirm(scan._id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-gray-800 text-sm mb-2 line-clamp-2">
                    {scan.ocr?.text || 'No text extracted'}
                  </p>
                  
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(scan.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-8">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="btn-outline disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className="text-sm text-gray-600">
            Page {currentPage} of {pagination.pages}
          </span>
          
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === pagination.pages}
            className="btn-outline disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* View Modal */}
      {viewModal && selectedScan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <h3 className="font-bold text-xl">Scan Details</h3>
              <button
                onClick={() => setViewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`ml-2 badge-${selectedScan.status === 'completed' ? 'success' : 'error'}`}>
                    {selectedScan.status}
                  </span>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600">Type:</span>
                  <span className="ml-2 font-medium">{selectedScan.scanType}</span>
                </div>
                
                {selectedScan.ocr?.language && (
                  <div>
                    <span className="text-sm text-gray-600">Language:</span>
                    <span className="ml-2 font-medium">{selectedScan.ocr.language}</span>
                  </div>
                )}
                
                {selectedScan.ocr?.confidence && (
                  <div>
                    <span className="text-sm text-gray-600">Confidence:</span>
                    <span className="ml-2 font-medium">
                      {Math.round(selectedScan.ocr.confidence)}%
                    </span>
                  </div>
                )}
                
                <div>
                  <span className="text-sm text-gray-600">Date:</span>
                  <span className="ml-2 font-medium">{formatDate(selectedScan.createdAt)}</span>
                </div>
                
                {selectedScan.ocr?.text && (
                  <div>
                    <label className="text-sm text-gray-600 block mb-2">Extracted Text:</label>
                    <textarea
                      value={selectedScan.ocr.text}
                      readOnly
                      className="input-field min-h-[200px] font-mono text-sm"
                    />
                  </div>
                )}
                
                {selectedScan.translation?.translatedText && (
                  <div>
                    <label className="text-sm text-gray-600 block mb-2">
                      Translation ({selectedScan.translation.targetLanguage}):
                    </label>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm">{selectedScan.translation.translatedText}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-xl mb-2">Delete Scan?</h3>
            <p className="text-gray-600 mb-6">
              This action cannot be undone. The scan will be permanently deleted.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="btn-primary bg-red-600 hover:bg-red-700 flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
