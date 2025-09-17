// src/stores/qrcode.store.ts
class QRCodeStore {
  private qrCodes = new Map<string, string>();

  set(companyId: string, qrCode: string): void {
    this.qrCodes.set(companyId, qrCode);
  }

  get(companyId: string): string | undefined {
    return this.qrCodes.get(companyId);
  }

  has(companyId: string): boolean {
    return this.qrCodes.has(companyId);
  }

  delete(companyId: string): void {
    this.qrCodes.delete(companyId);
  }

  clear(): void {
    this.qrCodes.clear();
  }
}

export const qrCodeStore = new QRCodeStore();
