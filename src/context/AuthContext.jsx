import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, getUser, getToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = getToken();
    const savedUser = getUser();

    if (token && savedUser) {
      setUser(savedUser);
      setIsAuthenticated(true);
      // Fetch latest user data
      refreshUser();
    }
    setLoading(false);
  }, []);

  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      if (response.success) {
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  const login = async (email, otp) => {
    try {
      const response = await authAPI.verifyOTP(email, otp);
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
