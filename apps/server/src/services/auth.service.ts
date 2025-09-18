// src/services/auth.service.ts
import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import { FileManager } from '../utils/file-manager';

export class AuthService {
  static async getAuthState(companyId: string) {
    FileManager.createSessionFolder(companyId);
    const sessionPath = FileManager.getSessionPath(companyId);
    return await useMultiFileAuthState(sessionPath);
  }

  static async cleanAuth(companyId: string): Promise<void> {
    await FileManager.cleanAuthInfo(companyId);
  }

  static hasExistingAuth(companyId: string): boolean {
    return FileManager.sessionExists(companyId);
  }

  static async getAllCompanyIdsWithAuth(): Promise<string[]> {
    return FileManager.listAllCompanyIdsWithAuth();
  }
}