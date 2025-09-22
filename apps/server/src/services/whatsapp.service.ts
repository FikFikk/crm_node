// src/services/whatsapp.service.ts
import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys';
import P from 'pino';
import Boom from '@hapi/boom';
import { connectionStore } from '../stores/connection.store';
import { AuthService } from './auth.service';
import { QRCodeService } from './qrcode.service';
import { MessageService } from './message.service';
import { NotificationService } from './notification.service';
import { PhoneFormatter } from '../utils/phone-formatter';
import { Logger } from '../utils/logger';
import { CONSTANTS } from '../config/constants';
// import type { ConnectionStatus } from '../types/connection.types';
import type { MessageData } from '../types/message.types';

export class WhatsAppService {
  private static broadcastFunction: ((companyId: string, event: string, data: any) => void) | null = null;

  static setBroadcastFunction(fn: (companyId: string, event: string, data: any) => void) {
    this.broadcastFunction = fn;
  }

  private static broadcast(companyId: string, event: string, data: any) {
    if (this.broadcastFunction) {
      this.broadcastFunction(companyId, event, data);
    }
  }

  static async createConnection(companyId: string) {
    try {
      Logger.info(`Creating WhatsApp connection for company ${companyId}`);

      const { state, saveCreds } = await AuthService.getAuthState(companyId);
      const sock = makeWASocket({ 
        auth: state, 
        printQRInTerminal: false,
        logger: P({level: "silent"}) // hanya tampilkan error
        // Use default logger or implement your own that matches ILogger interface
      });

      // Set socket ke connectionStore
      connectionStore.set(companyId, sock);

      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', (update) => this.handleConnectionUpdate(companyId, update));
      // sock.ev.on('messages.upsert', async (m) => {
      //   await this.handleIncomingMessages(companyId, m);
      // });
      // Tambahkan ACK pada pesan masuk
      sock.ev.on('messages.upsert', async (m) => {
        // Jalankan handler lama
        await this.handleIncomingMessages(companyId, m);
        // Kirim ACK (read receipt) jika ada pesan masuk
        try {
          if (m.messages && m.messages.length > 0) {
            for (const msg of m.messages) {
              if (!msg.key.fromMe) {
                await sock.readMessages([msg.key]);
                Logger.info(`ACK sent for message: ${msg.key.id}`);
              }
            }
          }
        } catch (ackErr) {
          Logger.error('Failed to send ACK:', ackErr);
        }
      });

      return sock;
    } catch (error) {
      Logger.error(`Error creating WhatsApp connection for company ${companyId}:`, error);
      connectionStore.setStatus(companyId, 'failed');
      
      this.broadcast(companyId, 'connection_error', {
        company_id: companyId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  private static async handleConnectionUpdate(companyId: string, update: any) {
    const { connection, lastDisconnect, qr } = update;
    // Logger.info(`Company ${companyId} connection update:`, update);

    if (qr) {
      Logger.info(`QR Code generated for company ${companyId}`);
      
      try {
        const qrImageBase64 = await QRCodeService.storeQRCode(companyId, qr);
        
        this.broadcast(companyId, 'qr_code_generated', {
          company_id: companyId,
          qr_code: qrImageBase64,
          status: 'qr_generated'
        });
        
        await NotificationService.notifyPHPBackend('connection_update', {
          company_id: companyId,
          status: 'qr_generated',
          qr_code: qrImageBase64
        });
      } catch (qrError) {
        Logger.error('QR Generation error:', qrError);
      }
    }

    if (connection === 'close') {
      await this.handleConnectionClose(companyId, lastDisconnect);
    } else if (connection === 'open') {
      await this.handleConnectionOpen(companyId);
    } else if (connection === 'connecting') {
      this.handleConnectionConnecting(companyId);
    }
  }

  private static async handleConnectionClose(companyId: string, lastDisconnect: any) {
    let shouldReconnect = false;
    let statusToSet = 'disconnected';
    
    if (lastDisconnect?.error) {
      const boomError = Boom.boomify(lastDisconnect.error);
      const errorMessage = lastDisconnect.error.message || 'Unknown error';
      
      // Cek jika error karena QR refs attempts ended
      if (errorMessage.includes('QR refs attempts ended')) {
        Logger.warn(`Company ${companyId} QR timeout - needs manual QR scan`);
        statusToSet = 'need_qr';
        shouldReconnect = false; // Jangan auto-reconnect jika perlu QR manual
      } else if (boomError.output?.statusCode === DisconnectReason.loggedOut) {
        Logger.info(`Company ${companyId} logged out, cleaning auth_info`);
        await AuthService.cleanAuth(companyId);
        statusToSet = 'need_qr';
        shouldReconnect = false;
      } else {
        shouldReconnect = true;
        Logger.warn(`Company ${companyId} disconnected: ${errorMessage}`);
      }
    }
    
    Logger.info(`Company ${companyId} connection closed. Status: ${statusToSet}, Reconnecting: ${shouldReconnect}`);
    connectionStore.setStatus(companyId, statusToSet as any);
    connectionStore.delete(companyId);
    QRCodeService.clearQRCode(companyId);
    
    this.broadcast(companyId, 'connection_status', {
      company_id: companyId,
      status: statusToSet,
      connected: false
    });
    
    await NotificationService.notifyPHPBackend('connection_update', {
      company_id: companyId,
      status: statusToSet
    });
    
    if (shouldReconnect) {
      setTimeout(() => this.createConnection(companyId), CONSTANTS.RECONNECT_DELAY);
    }
  }

  private static async handleConnectionOpen(companyId: string) {
    Logger.info(`Company ${companyId} connection opened successfully`);
    
    const sock = connectionStore.get(companyId);
    if (!sock) return;

    connectionStore.setStatus(companyId, 'connected');
    QRCodeService.clearQRCode(companyId);
    
    const phoneNumber = sock.user?.id?.split(':')[0];
    
    this.broadcast(companyId, 'connection_status', {
      company_id: companyId,
      status: 'connected',
      connected: true,
      phone_number: phoneNumber
    });
    
    await NotificationService.notifyPHPBackend('connection_update', {
      company_id: companyId,
      status: 'connected',
      phone_number: phoneNumber
    });
  }

  private static handleConnectionConnecting(companyId: string) {
    connectionStore.setStatus(companyId, 'connecting');
    
    this.broadcast(companyId, 'connection_status', {
      company_id: companyId,
      status: 'connecting',
      connected: false
    });
  }

  private static async handleIncomingMessages(companyId: string, m: any) {
    // Logger.info(`Company ${companyId} received message:`, JSON.stringify(m, null, 2));

    for (const message of m.messages) {
      if (message.key.fromMe) continue;

      const remoteJid = message.key.remoteJid || '';
      const isBroadcast = message.broadcast === true;
      
      if (remoteJid.startsWith('status@broadcast') || isBroadcast) {
        continue;
      }
      
      const phoneMatch = remoteJid.match(/^(\d+)@/);
      if (!phoneMatch) continue;
      const phone = phoneMatch[1];

      const messageContent = MessageService.extractMessageContent(message);
      
      const messageData: MessageData = {
        event: "message_received",
        company_id: companyId,
        message_id: message.key.id || '',
        phone: phone,
        content: messageContent.content,
        timestamp: message.messageTimestamp || Date.now(),
        type: messageContent.type,
        push_name: message.pushName || 'Unknown',
        ...messageContent.media
      };

      // Logger.info(`[Message webhook] Sending to PHP:`, messageData);
      
      // Send to PHP first to get customer ID, then emit to socket
      const phpResponse = await NotificationService.notifyPHPBackend('message_received', messageData);
      
      // Extract customer_id from PHP response if available
      let customerId = null;
      if (phpResponse && typeof phpResponse === 'object' && 'customer_id' in phpResponse) {
        customerId = phpResponse.customer_id;
      }
      
      // Emit ke socket dengan customer ID dari PHP response
      this.broadcast(companyId, 'message_received', {
        success: true,
        chat: {
          id: Date.now(),
          messageId: message.key.id,
          body: messageContent.content,
          direction: 'in',
          companyId: companyId,
          created: new Date().toISOString(),
          type: messageContent.type,
          ...messageContent.media
        },
        customer: {
          id: customerId, // Now includes customer ID from PHP
          name: message.pushName || `WA ${phone}`,
          phone: phone
        },
        company: {
          id: companyId
        }
      });
    }
  }

  static async sendMessage(companyId: string, to: string, message: string, replyMsgKey?: any) {
    const sock = connectionStore.get(companyId);
    if (!sock) {
      throw new Error('WhatsApp not connected for this company');
    }

    // Jika ada replyMsgKey, tandai sebagai dibaca
  if (replyMsgKey) {
    await sock.readMessages([replyMsgKey]);
    Logger.info(`ACK sent for replied message: ${replyMsgKey.id}`);
  }

    const result = await MessageService.sendMessage(sock, to, message);
    
    this.broadcast(companyId, 'message_sent', {
      success: true,
      chat: {
        id: Date.now(),
        messageId: result?.key?.id,
        body: message,
        direction: 'out',
        companyId: companyId,
        created: new Date().toISOString(),
        type: 'text'
      },
      customer: {
        phone: PhoneFormatter.normalize(to)
      }
    });

    return result;
  }

  static async disconnect(companyId: string) {
    const sock = connectionStore.get(companyId);
    
    if (sock) {
      await sock.logout();
      connectionStore.delete(companyId);
      connectionStore.setStatus(companyId, 'disconnected');
      QRCodeService.clearQRCode(companyId);
      
      await AuthService.cleanAuth(companyId);
      
      this.broadcast(companyId, 'connection_status', {
        company_id: companyId,
        status: 'disconnected',
        connected: false
      });
      
      await NotificationService.notifyPHPBackend('connection_update', {
        company_id: companyId,
        status: 'disconnected'
      });
    }
  }

  static getConnectionInfo(companyId: string) {
    const status = connectionStore.getStatus(companyId);
    const connected = connectionStore.has(companyId);
    
    let phoneNumber = null;
    if (connected) {
      const sock = connectionStore.get(companyId);
      phoneNumber = sock?.user?.id?.split(':')[0];
    }

    return {
      company_id: companyId,
      status,
      connected,
      phone_number: phoneNumber
    };
  }
}