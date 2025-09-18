// src/utils/file-manager.ts
import fs from 'fs';
import path from 'path';

export class FileManager {
  static createSessionFolder(companyId: string): void {
    const sessionPath = this.getSessionPath(companyId);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
  }

  static getSessionPath(companyId: string): string {
    return `auth_info_${companyId}`;
  }

  static async cleanAuthInfo(companyId: string): Promise<void> {
    try {
      const sessionPath = this.getSessionPath(companyId);
      if (fs.existsSync(sessionPath)) {
        console.log(`Cleaning auth_info for company ${companyId}`);
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log(`Auth_info cleaned for company ${companyId}`);
      }
    } catch (error) {
      console.error(`Error cleaning auth_info for company ${companyId}:`, error);
    }
  }

  static sessionExists(companyId: string): boolean {
    const sessionPath = this.getSessionPath(companyId);
    return fs.existsSync(sessionPath);
  }

  // Tambahan: list all companyIds yang punya session folder
  static listAllCompanyIdsWithAuth(): string[] {
    const baseDir = process.cwd();
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory() && e.name.startsWith('auth_info_'))
      .map(e => e.name.replace('auth_info_', ''));
  }
}
