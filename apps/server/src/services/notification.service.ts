// src/services/notification.service.ts
import axios from 'axios';
import { CONSTANTS } from '../config';
import { Logger } from '../utils/logger';

export class NotificationService {
  static async notifyPHPBackend(event: string, data: any): Promise<any> {
    try {
      const response = await axios.post(`${CONSTANTS.PHP_BACKEND_URL}/wa/webhook`, {
        event,
        ...data
      }, {
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': CONSTANTS.PHP_KEY
        }
      });
      Logger.info(`Notified PHP backend: ${event}`, data);
      return response.data; // Return response data from PHP
    } catch (error) {
      Logger.error('Failed to notify PHP backend:', error);
      return null;
    }
  }
}