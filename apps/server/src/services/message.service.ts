// src/services/message.service.ts
import type { WASocket } from '@whiskeysockets/baileys';
import { PhoneFormatter } from '../utils/phone-formatter';
import type { MessageData, MessageType } from '../types/message.types';
import { Logger } from '../utils/logger';

export class MessageService {
  static async sendMessage(
    sock: WASocket, 
    to: string, 
    message: string
  ): Promise<any> {
    const jid = PhoneFormatter.toWhatsAppJid(to);
    const result = await sock.sendMessage(jid, { text: message });
    Logger.info(`Message sent to ${to}:`, result);
    return result;
  }

  static extractMessageContent(message: any): {
    content: string;
    type: MessageType;
    media?: any;
  } {
    let content = '';
    let type: MessageType = 'text';
    let media: any = {};

    if (message.message?.conversation) {
      content = message.message.conversation;
      type = 'text';
    } else if (message.message?.extendedTextMessage?.text) {
      content = message.message.extendedTextMessage.text;
      type = 'text';
    } else if (message.message?.imageMessage) {
      content = message.message.imageMessage.caption || 'Image';
      type = 'image';
      if (message.message.imageMessage.jpegThumbnail) {
        media.imageBase64 = 'data:image/jpeg;base64,' + 
          Buffer.from(message.message.imageMessage.jpegThumbnail).toString('base64');
      }
    } else if (message.message?.videoMessage) {
      content = message.message.videoMessage.caption || 'Video';
      type = 'video';
      if (message.message.videoMessage.jpegThumbnail) {
        media.videoBase64 = 'data:image/jpeg;base64,' + 
          Buffer.from(message.message.videoMessage.jpegThumbnail).toString('base64');
      }
    } else if (message.message?.audioMessage) {
      content = 'Audio';
      type = 'audio';
    } else if (message.message?.documentMessage) {
      content = message.message.documentMessage.caption || 'Document';
      type = 'document';
    } else if (message.message?.locationMessage) {
      content = 'Location';
      type = 'location';
      media.locationLat = String(message.message.locationMessage.degreesLatitude || '');
      media.locationLong = String(message.message.locationMessage.degreesLongitude || '');
    } else {
      content = 'Unsupported message type';
    }

    return { content, type, media };
  }

  static shouldProcessMessage(message: any): boolean {
    if (message.key.fromMe) return false;
    
    const remoteJid = message.key.remoteJid || '';
    const isBroadcast = message.broadcast === true;
    
    if (remoteJid.startsWith('status@broadcast') || isBroadcast) {
      return false;
    }
    
    const phoneMatch = remoteJid.match(/^(\d+)@/);
    return !!phoneMatch;
  }
}