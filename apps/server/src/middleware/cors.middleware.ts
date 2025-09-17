// src/middleware/cors.middleware.ts
import cors from 'cors';
import { CONSTANTS } from '../config/constants';

export const corsMiddleware = cors({
  origin: CONSTANTS.CORS_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
});