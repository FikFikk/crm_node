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
const io = new SocketIOServer(server, {
  cors: {
    origin: CONSTANTS.CORS_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Setup middleware
app.use(corsMiddleware);
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