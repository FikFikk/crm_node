import { connectionStore } from './stores/connection.store';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { setupSocketIO, broadcastToCompany } from './sockets';
import { whatsappRouter } from './routers';
import { corsMiddleware, loggingMiddleware } from './middleware';
import { WhatsAppService } from './services/whatsapp.service';
import { CONSTANTS } from './config/constants';
import { Logger } from './utils/logger';

const app = express();
const server = createServer(app);

// Debug CORS origins
console.log('[SERVER DEBUG] CORS_ORIGINS config:', CONSTANTS.CORS_ORIGINS);

const io = new SocketIOServer(server, {
  cors: {
    origin: "https://minicrm.jasamobileapp.com", // Allow all origins sementara
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
  }
});

// Setup middleware
// Log semua request yang masuk
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'NO_ORIGIN'}`);
  next();
});

// Simple CORS middleware that allows all origins
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  console.log(`[CORS] Setting headers for origin: ${origin}`);
  
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    console.log(`[CORS] Handling OPTIONS preflight for: ${req.path}`);
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(loggingMiddleware);

// Setup Socket.IO
setupSocketIO(io);

// Setup WhatsApp service broadcast function
WhatsAppService.setBroadcastFunction((companyId: string, event: string, data: any) => {
  broadcastToCompany(io, companyId, event, data);
});

// Setup routes
app.use('/', whatsappRouter);


// Jalankan auto-reconnect sebelum server listen
connectionStore.autoReconnectAll().then(() => {
  Logger.info('Auto-reconnect WhatsApp selesai dijalankan');
  Logger.info('=== ENVIRONMENT DEBUG INFO ===');
  Logger.info('NODE_ENV:', process.env.NODE_ENV || 'NOT_SET');
  Logger.info('PHP_BACKEND_URL env var:', process.env.PHP_BACKEND_URL || 'NOT_SET');
  Logger.info('PHP_BACKEND_URL actual:', CONSTANTS.PHP_BACKEND_URL);
  Logger.info('PHP_KEY env var:', process.env.PHP_KEY ? 'SET' : 'NOT_SET');
  Logger.info('PORT env var:', process.env.PORT || 'NOT_SET');
  Logger.info('PORT actual:', CONSTANTS.PORT);
  Logger.info('CORS_ORIGINS config:', CONSTANTS.CORS_ORIGINS);
  Logger.info('Socket.IO CORS: Allow ALL origins (*)');
  Logger.info('Express CORS: Allow ALL origins (*)');
  Logger.info('===============================');
  
  server.listen(CONSTANTS.PORT, () => {
    Logger.info(`WhatsApp Baileys service with Socket.IO running on port ${CONSTANTS.PORT}`);
    Logger.info('Available endpoints:');
    Logger.info('- GET  /qr-code?id=X    - Generate QR code for company');
    Logger.info('- POST /send-message    - Send WhatsApp message');
    Logger.info('- GET  /status/:id      - Get connection status');
    Logger.info('- POST /disconnect/:id  - Disconnect WhatsApp');
    Logger.info('- GET  /test            - Health check');
    Logger.info('Socket.IO server ready for realtime messaging');
  });
});