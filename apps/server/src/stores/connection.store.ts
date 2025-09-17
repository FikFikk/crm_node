// src/stores/connection.store.ts
import type { WASocket } from '@whiskeysockets/baileys';
import { type ConnectionStatus } from '../types';

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
}

export const connectionStore = new ConnectionStore();
