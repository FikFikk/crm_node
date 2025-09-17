// src/utils/phone-formatter.ts
export class PhoneFormatter {
  static normalize(phoneNumber: string): string {
    // Remove all non-numeric characters
    let normalized = phoneNumber.replace(/[^0-9]/g, '');
    
    // Convert 0 prefix to 62 (Indonesia)
    if (normalized.startsWith('0')) {
      normalized = '62' + normalized.substring(1);
    }
    
    // Add 62 if not present
    if (!normalized.startsWith('62')) {
      normalized = '62' + normalized;
    }
    
    return normalized;
  }

  static toWhatsAppJid(phoneNumber: string): string {
    const normalized = this.normalize(phoneNumber);
    return `${normalized}@s.whatsapp.net`;
  }

  static fromJid(jid: string): string {
    const match = jid.match(/^(\d+)@/);
    return match ? match[1] : '';
  }

  static isValidPhoneJid(jid: string): boolean {
    return /^\d+@s\.whatsapp\.net$/.test(jid);
  }
}