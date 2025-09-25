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
    origin: function(origin, callback) {
      console.log('[SOCKETIO CORS DEBUG] Incoming Origin:', origin);
      console.log('[SOCKETIO CORS DEBUG] Allowed Origins:', CONSTANTS.CORS_ORIGINS);
      if (!origin || CONSTANTS.CORS_ORIGINS.includes(origin)) {
        console.log('[SOCKETIO CORS DEBUG] Origin ALLOWED');
        callback(null, true);
      } else {
        console.log('[SOCKETIO CORS DEBUG] Origin REJECTED');
        callback(new Error('Not allowed by CORS: ' + origin));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Setup middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(loggingMiddleware);

// Handle preflight requests specifically for socket.io
app.options('/socket.io/*', (req, res) => {
  console.log('[OPTIONS DEBUG] Preflight request for socket.io from:', req.headers.origin);
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

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