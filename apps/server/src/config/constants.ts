// src/config/constants.ts
export const CONSTANTS = {
  PHP_BACKEND_URL: process.env.PHP_BACKEND_URL || 'https://admin-minicrm.jasamobileapp.com/api',
  PHP_KEY: process.env.PHP_KEY || 'crm_e54c761e1dec987a98a0fdb593ff95dbd2fe5813',
  PORT: process.env.PORT || 3001,
  RECONNECT_DELAY: 5000,
  QR_WAIT_TIMEOUT: 3000,
  // CORS_ORIGINS bisa diatur lewat env: CORS_ORIGINS="http://a.com,http://b.com"
  CORS_ORIGINS: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : [
        "https://minicrm.jasamobileapp.com",
        "http://localhost:5173",
        "http://localhost:3000"
      ]
};
