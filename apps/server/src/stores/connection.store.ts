// src/stores/connection.store.ts
import type { WASocket } from '@whiskeysockets/baileys';
import { type ConnectionStatus } from '../types';
import { WhatsAppService } from '../services/whatsapp.service';
import { AuthService } from '../services/auth.service';
import fs from 'fs';

class ConnectionStore {
  private connections = new Map<string, WASocket>();
  private connectionStatus = new Map<string, ConnectionStatus>();

  set(companyId: string, socket: WASocket): void {
    this.connections.set(companyId, socket);
  }

  get(companyId: string): WASocket | undefined {
    return this.connections.get(companyId);
  }

  has(companyId: string): boolean {
    return this.connections.has(companyId);
  }

  delete(companyId: string): void {
    this.connections.delete(companyId);
  }

  setStatus(companyId: string, status: ConnectionStatus): void {
    this.connectionStatus.set(companyId, status);
  }

  getStatus(companyId: string): ConnectionStatus {
    return this.connectionStatus.get(companyId) || 'disconnected';
  }

  deleteStatus(companyId: string): void {
    this.connectionStatus.delete(companyId);
  }

  getAll(): string[] {
    return Array.from(this.connections.keys());
  }

  clear(companyId: string): void {
    this.delete(companyId);
    this.deleteStatus(companyId);
  }

  /**
   * Inisialisasi auto-reconnect untuk semua company yang punya auth state
   * Panggil di entrypoint server (misal index.ts/app.ts)
   */
  async autoReconnectAll() {
    const allCompanyIds = await AuthService.getAllCompanyIdsWithAuth();
    console.log(`[AutoReconnect] Found ${allCompanyIds.length} companies with auth data`);
    
    for (const companyId of allCompanyIds) {
      try {
        const status = this.getStatus(companyId);
        
        // Skip jika sudah connected/connecting atau perlu QR manual
        if (status === 'connected' || status === 'connecting' || status === 'need_qr') {
          console.log(`[AutoReconnect] Skip company ${companyId}, status: ${status}`);
          continue;
        }
        
        // Cek apakah ada file creds.json yang valid
        const sessionPath = `auth_info_${companyId}/creds.json`;
        if (!fs.existsSync(sessionPath)) {
          console.log(`[AutoReconnect] Skip company ${companyId}, no valid creds.json`);
          this.setStatus(companyId, 'need_qr');
          continue;
        }
        
        console.log(`[AutoReconnect] Reconnecting company ${companyId} ...`);
        this.setStatus(companyId, 'connecting');
        
        const sock = await WhatsAppService.createConnection(companyId);
        this.set(companyId, sock);
        
        // Delay antar akun agar tidak overload
        await new Promise(res => setTimeout(res, 2000));
      } catch (err) {
        const errorMessage = (err as Error)?.message || 'Unknown error';
        if (errorMessage.includes('QR refs attempts ended')) {
          console.log(`[AutoReconnect] Company ${companyId} needs QR scan`);
          this.setStatus(companyId, 'need_qr');
        } else {
          console.error(`[AutoReconnect] Failed for company ${companyId}: ${errorMessage}`);
        }
      }
    }
    console.log(`[AutoReconnect] Auto-reconnect process completed`);
  }
}

export const connectionStore = new ConnectionStore();
