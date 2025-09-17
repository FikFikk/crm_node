// src/utils/validators.ts
export class Validators {
  static isValidCompanyId(companyId: any): boolean {
    return typeof companyId === 'string' && companyId.length > 0;
  }

  static isValidPhoneNumber(phone: any): boolean {
    if (typeof phone !== 'string') return false;
    const cleaned = phone.replace(/[^0-9]/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  static isValidMessage(message: any): boolean {
    return typeof message === 'string' && message.length > 0;
  }

  static validateSendMessageRequest(data: any): string[] {
    const errors: string[] = [];
    
    if (!this.isValidCompanyId(data.company_id)) {
      errors.push('Invalid company_id');
    }
    
    if (!this.isValidPhoneNumber(data.to)) {
      errors.push('Invalid phone number');
    }
    
    if (!this.isValidMessage(data.message)) {
      errors.push('Invalid message');
    }
    
    return errors;
  }
}