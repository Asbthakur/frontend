/**
 * DeviceContext.jsx
 * 
 * Detects device type (mobile/desktop) and provides device info throughout the app.
 * Mobile users will see the new CamScanner-style interface.
 * Desktop users will continue using the existing interface (unchanged).
 * 
 * Usage:
 *   import { useDevice } from './context/DeviceContext';
 *   const { isMobile, isDesktop, platform, isNativeApp } = useDevice();
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

// Create context
const DeviceContext = createContext(null);

// Device types
const PLATFORMS = {
  ANDROID: 'android',
  IOS: 'ios',
  WINDOWS: 'windows',
  MAC: 'mac',
  LINUX: 'linux',
  UNKNOWN: 'unknown'
};

/**
 * Detect the operating system/platform
 */
const detectPlatform = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/android/i.test(userAgent)) return PLATFORMS.ANDROID;
  if (/iphone|ipad|ipod/i.test(userAgent)) return PLATFORMS.IOS;
  if (/win/i.test(userAgent)) return PLATFORMS.WINDOWS;
  if (/mac/i.test(userAgent)) return PLATFORMS.MAC;
  if (/linux/i.test(userAgent)) return PLATFORMS.LINUX;
  
  return PLATFORMS.UNKNOWN;
};

/**
 * Check if device is mobile (phone or tablet)
 */
const checkIsMobile = () => {
  // Method 1: Check user agent
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i;
  const isMobileAgent = mobileKeywords.test(userAgent);
  
  // Method 2: Check screen width (768px is common breakpoint)
  const isSmallScreen = window.innerWidth <= 768;
  
  // Method 3: Check touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Method 4: Check if running as native Capacitor app
  const isNative = Capacitor.isNativePlatform();
  
  // Consider mobile if:
  // - Running as native app, OR
  // - Mobile user agent AND (small screen OR touch device)
  return isNative || (isMobileAgent && (isSmallScreen || isTouchDevice));
};

/**
 * Check if device has camera capability
 */
const checkHasCamera = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return false;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch {
    return false;
  }
};

/**
 * DeviceProvider component
 */
export const DeviceProvider = ({ children }) => {
  const [deviceInfo, setDeviceInfo] = useState({
    // Device type
    isMobile: false,
    isDesktop: true,
    isTablet: false,
    
    // Platform
    platform: PLATFORMS.UNKNOWN,
    isAndroid: false,
    isIOS: false,
    isWindows: false,
    isMac: false,
    
    // Capabilities
    isNativeApp: false,
    hasCamera: false,
    isTouchDevice: false,
    
    // Screen
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    isPortrait: window.innerHeight > window.innerWidth,
    isLandscape: window.innerWidth > window.innerHeight,
    
    // Loading state
    isDetecting: true
  });

  useEffect(() => {
    const detectDevice = async () => {
      const platform = detectPlatform();
      const isMobile = checkIsMobile();
      const isNativeApp = Capacitor.isNativePlatform();
      const hasCamera = await checkHasCamera();
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Check if tablet (mobile but larger screen)
      const isTablet = isMobile && window.innerWidth >= 600 && window.innerWidth <= 1024;
      
      setDeviceInfo({
        // Device type
        isMobile: isMobile,
        isDesktop: !isMobile,
        isTablet: isTablet,
        
        // Platform
        platform: platform,
        isAndroid: platform === PLATFORMS.ANDROID,
        isIOS: platform === PLATFORMS.IOS,
        isWindows: platform === PLATFORMS.WINDOWS,
        isMac: platform === PLATFORMS.MAC,
        
        // Capabilities
        isNativeApp: isNativeApp,
        hasCamera: hasCamera,
        isTouchDevice: isTouchDevice,
        
        // Screen
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        isPortrait: window.innerHeight > window.innerWidth,
        isLandscape: window.innerWidth > window.innerHeight,
        
        // Loading complete
        isDetecting: false
      });
      
      // Log for debugging (remove in production)
      console.log('📱 Device Detection:', {
        isMobile,
        platform,
        isNativeApp,
        hasCamera,
        screenWidth: window.innerWidth
      });
    };

    detectDevice();

    // Listen for screen resize/orientation changes
    const handleResize = () => {
      setDeviceInfo(prev => ({
        ...prev,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        isPortrait: window.innerHeight > window.innerWidth,
        isLandscape: window.innerWidth > window.innerHeight,
        // Re-check mobile on resize (user might resize browser window)
        isMobile: checkIsMobile(),
        isDesktop: !checkIsMobile()
      }));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return (
    <DeviceContext.Provider value={deviceInfo}>
      {children}
    </DeviceContext.Provider>
  );
};

/**
 * Hook to access device info
 */
export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within DeviceProvider');
  }
  return context;
};

export default DeviceContext;
