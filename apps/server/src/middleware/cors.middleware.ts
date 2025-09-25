// src/middleware/cors.middleware.ts
import cors from 'cors';
import { CONSTANTS } from '../config/constants';

const corsConfig = {
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    console.log('[CORS DEBUG] Incoming Origin:', origin);
    console.log('[CORS DEBUG] Allowed Origins:', CONSTANTS.CORS_ORIGINS);
    if (!origin || CONSTANTS.CORS_ORIGINS.includes(origin)) {
      console.log('[CORS DEBUG] Origin ALLOWED');
      callback(null, true);
    } else {
      console.log('[CORS DEBUG] Origin REJECTED');
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
};

export const corsMiddleware = cors(corsConfig);