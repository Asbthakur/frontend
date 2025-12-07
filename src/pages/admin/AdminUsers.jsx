import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/adminAPI';
import {
  Users,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Loader,
  Crown,
  AlertCircle,
} from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    plan: '',
    status: '',
  });
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const [editForm, setEditForm] = useState({
    plan: '',
    subscriptionStatus: '',
    subscriptionEndDate: '',
    isBlocked: false,
  });
  
  const currentPage = parseInt(new URLSearchParams(window.location.search).get('page') || '1');
  
  useEffect(() => {
    loadUsers();
  }, [currentPage, filters.plan, filters.status]);
  
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const queryFilters = {};
      if (filters.search) queryFilters.search = filters.search;
      if (filters.plan) queryFilters.plan = filters.plan;
      if (filters.status) queryFilters.status = filters.status;
      
      const response = await adminAPI.getUsers(currentPage, 20, queryFilters);
      
      if (response.success) {
        setUsers(response.users || []);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadUserDetails = async (userId) => {
    try {
      const response = await adminAPI.getUser(userId);
      if (response.success) {
        setSelectedUser(response);
        setViewModal(true);
      }
    } catch (error) {
      console.error('Failed to load user details:', error);
    }
  };
  
  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus || 'active',
      subscriptionEndDate: user.subscriptionEndDate
        ? new Date(user.subscriptionEndDate).toISOString().split('T')[0]
        : '',
      isBlocked: user.isBlocked || false,
    });
    setEditModal(true);
  };
  
  const handleUpdateUser = async () => {
    try {
      const updates = { ...editForm };
      if (updates.subscriptionEndDate) {
        updates.subscriptionEndDate = new Date(updates.subscriptionEndDate);
      }
      
      const response = await adminAPI.updateUser(selectedUser._id, updates);
      
      if (response.success) {
        setEditModal(false);
        loadUsers();
        alert('User updated successfully');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    }
  };
  
  const handleDeleteUser = async (userId) => {
    try {
      await adminAPI.deleteUser(userId);
      setDeleteConfirm(null);
      loadUsers();
      alert('User deleted successfully');
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-title flex items-center space-x-2">
          <Users className="w-8 h-8" />
          <span>User Management</span>
        </h1>
        <p className="text-gray-600">Manage all registered users</p>
      </div>
      
      {/* Filters */}
      <div className="card mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div className="relative">
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && loadUsers()}
              placeholder="Search by email/name..."
              className="input-field pl-10"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
          </div>
          
          <select
            value={filters.plan}
            onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
            className="input-field"
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
          </select>
          
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="input-field"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <button onClick={loadUsers} className="btn-primary">
            <Search className="w-5 h-5" />
            <span>Search</span>
          </button>
        </div>
      </div>
      
      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      )}
      
      {/* Users Table */}
      {!loading && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Plan</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Scans</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Joined</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge-${
                      user.plan === 'pro' ? 'success' : user.plan === 'basic' ? 'info' : 'default'
                    } capitalize`}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {user.isBlocked ? (
                      <span className="badge-error">Blocked</span>
                    ) : user.subscriptionStatus === 'active' ? (
                      <span className="badge-success">Active</span>
                    ) : (
                      <span className="badge-warning">Cancelled</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium">{user.scansToday || 0}</span>
                    <span className="text-gray-500 text-sm"> today</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => loadUserDetails(user._id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 hover:bg-blue-100 rounded-lg"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(user._id)}
                        className="p-2 hover:bg-red-100 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {users.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found
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
      
      {/* View Modal */}
      {viewModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <h3 className="font-bold text-xl">User Details</h3>
              <button
                onClick={() => setViewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h4 className="font-bold mb-3">User Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{selectedUser.user?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{selectedUser.user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plan:</span>
                    <span className="badge-success capitalize">{selectedUser.user?.plan}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold mb-3">Statistics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="card bg-gray-50">
                    <p className="text-gray-600 text-sm">Total Scans</p>
                    <p className="text-2xl font-bold">{selectedUser.stats?.totalScans || 0}</p>
                  </div>
                  <div className="card bg-gray-50">
                    <p className="text-gray-600 text-sm">Total Paid</p>
                    <p className="text-2xl font-bold">₹{((selectedUser.stats?.totalPaid || 0) / 100).toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              {selectedUser.stats?.recentScans?.length > 0 && (
                <div>
                  <h4 className="font-bold mb-3">Recent Scans</h4>
                  <div className="space-y-2">
                    {selectedUser.stats.recentScans.slice(0, 5).map((scan) => (
                      <div key={scan._id} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex justify-between">
                          <span className="badge-success">{scan.scanType}</span>
                          <span className="text-gray-500">{formatDate(scan.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-xl mb-4">Edit User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Plan</label>
                <select
                  value={editForm.plan}
                  onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                  className="input-field"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={editForm.subscriptionStatus}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                  className="input-field"
                >
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Expiry Date</label>
                <input
                  type="date"
                  value={editForm.subscriptionEndDate}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionEndDate: e.target.value })}
                  className="input-field"
                />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Block User</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isBlocked}
                    onChange={(e) => setEditForm({ ...editForm, isBlocked: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setEditModal(false)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="btn-primary flex-1"
              >
                <Save className="w-5 h-5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-xl mb-2">Delete User?</h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete the user and all their data. This action cannot be undone.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-outline flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirm)}
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

export default AdminUsers;
