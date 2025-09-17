// // src/events/connection-update.ts
// import { DisconnectReason } from '@whiskeysockets/baileys';
// import Boom from '@hapi/boom';
// import { connectionStore } from '../stores/connection.store';
// import { qrCodeStore } from '../stores/qrcode.store';
// import { NotificationService } from '../services/notification.service';
// import { AuthService } from '../services/auth.service';
// import { QRCodeService } from '../services/qrcode.service';
// import { SocketManager } from '../sockets/socket-manager';
// import { Logger } from '../utils/logger';
// import { CONSTANTS } from '../config';

// export class ConnectionUpdateHandler {
//   static async handle(companyId: string, update: any, sock: any): Promise<void> {
//     const { connection, lastDisconnect, qr } = update;
//     Logger.info(`Company ${companyId} connection update:`, update);

//     if (qr) {
//       await this.handleQRCode(companyId, qr);
//     }

//     if (connection === 'close') {
//       await this.handleConnectionClose(companyId, lastDisconnect);
//     } else if (connection === 'open') {
//       await this.handleConnectionOpen(companyId, sock);
//     } else if (connection === 'connecting') {
//       await this.handleConnectionConnecting(companyId);
//     }
//   }

//   private static async handleQRCode(companyId: string, qr: string): Promise<void> {
//     Logger.info(`QR Code generated for company ${companyId}`);
    
//     try {
//       const qrImageBase64 = await QRCodeService.storeQRCode(companyId, qr);
      
//       SocketManager.broadcastToCompany(companyId, 'qr_code_generated', {
//         company_id: companyId,
//         qr_code: qrImageBase64,
//         status: 'qr_generated'
//       });
      
//       await NotificationService.notifyPHPBackend('connection_update', {
//         company_id: companyId,
//         status: 'qr_generated',
//         qr_code: qrImageBase64
//       });
//     } catch (error) {
//       Logger.error('QR Generation error:', error);
//     }
//   }

//   private static async handleConnectionClose(companyId: string, lastDisconnect: any): Promise<void> {
//     let shouldReconnect = false;
    
//     if (lastDisconnect?.error) {
//       const boomError = Boom.boomify(lastDisconnect.error);
//       shouldReconnect = boomError.output?.statusCode !== DisconnectReason.loggedOut;
      
//       if (boomError.output?.statusCode === DisconnectReason.loggedOut) {
//         Logger.info(`Company ${companyId} logged out, cleaning auth_info`);
//         await AuthService.cleanAuth(companyId);
//       }
//     }
    
//     Logger.info(`Company ${companyId} connection closed. Reconnecting: ${shouldReconnect}`);
    
//     connectionStore.clear(companyId);
//     QRCodeService.clearQRCode(companyId);
    
//     SocketManager.broadcastToCompany(companyId, 'connection_status', {
//       company_id: companyId,
//       status: 'disconnected',
//       connected: false
//     });
    
//     await NotificationService.notifyPHPBackend('connection_update', {
//       company_id: companyId,
//       status: 'disconnected'
//     });
    
//     if (shouldReconnect) {
//       const { createWhatsAppConnection } = await import('../services/whatsapp.service');
//       setTimeout(() => WhatsAppService.createConnection(companyId), CONSTANTS.RECONNECT_DELAY);
//     }
//   }

//   private static async handleConnectionOpen(companyId: string, sock: any): Promise<void> {
//     Logger.info(`Company ${companyId} connection opened successfully`);
    
//     connectionStore.set(companyId, sock);
//     connectionStore.setStatus(companyId, 'connected');
//     QRCodeService.clearQRCode(companyId);
    
//     const phoneNumber = sock.user?.id?.split(':')[0];
    
//     SocketManager.broadcastToCompany(companyId, 'connection_status', {
//       company_id: companyId,
//       status: 'connected',
//       connected: true,
//       phone_number: phoneNumber
//     });
    
//     await NotificationService.notifyPHPBackend('connection_update', {
//       company_id: companyId,
//       status: 'connected',
//       phone_number: phoneNumber
//     });
//   }

//   private static async handleConnectionConnecting(companyId: string): Promise<void> {
//     connectionStore.setStatus(companyId, 'connecting');
    
//     SocketManager.broadcastToCompany(companyId, 'connection_status', {
//       company_id: companyId,
//       status: 'connecting',
//       connected: false
//     });
//   }
// }