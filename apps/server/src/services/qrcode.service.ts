// src/services/qrcode.service.ts
import qrcodelib from 'qrcode';
import { qrCodeStore } from '../stores/qrcode.store';
import { Logger } from '../utils/logger';

export class QRCodeService {
  static async generateBase64(qr: string): Promise<string> {
    try {
      const qrImageBase64 = await qrcodelib.toDataURL(qr);
      return qrImageBase64;
    } catch (error) {
      Logger.error('QR Generation error:', error);
      throw error;
    }
  }

  static async storeQRCode(companyId: string, qr: string): Promise<string> {
    const qrImageBase64 = await this.generateBase64(qr);
    qrCodeStore.set(companyId, qrImageBase64);
    return qrImageBase64;
  }

  static getQRCode(companyId: string): string | undefined {
    return qrCodeStore.get(companyId);
  }

  static hasQRCode(companyId: string): boolean {
    return qrCodeStore.has(companyId);
  }

  static clearQRCode(companyId: string): void {
    qrCodeStore.delete(companyId);
  }
}