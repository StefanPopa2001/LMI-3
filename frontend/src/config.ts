// Frontend configuration
// This file handles environment-specific settings

export const config = {
  // API configuration
  // In production, uses the /lmi3/api path via Traefik reverse proxy
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',

  // Debug / relaxed validation flag mirrored from backend
  DEBUG_NO_VALIDATION: process.env.NEXT_PUBLIC_DEBUG_NO_VALIDATION === 'true',
  DEFAULT_PASSWORD: process.env.NEXT_PUBLIC_DEFAULT_PASSWORD || 'dhkak81',

  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',

  // App configuration
  APP_NAME: 'LMI 3',
  VERSION: '1.0.0',
  BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID || 'dev',
};

// For debugging
if (typeof window !== 'undefined') {
  console.log('Frontend Config:', config);
  console.log('[BUILD] Build ID:', config.BUILD_ID);
  console.log('API_URL:', config.API_URL);
  if (config.DEBUG_NO_VALIDATION) {
    console.warn('[DEBUG] Frontend running with relaxed validation; default password =', config.DEFAULT_PASSWORD);
  }
}