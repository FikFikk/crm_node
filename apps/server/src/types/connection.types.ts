// src/types/connection.types.ts
import type { WASocket } from '@whiskeysockets/baileys';

export interface ConnectionInfo {
  socket: WASocket;
  status: ConnectionStatus;
  phoneNumber?: string;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'failed' | 'qr_generated';

export interface ConnectionUpdate {
  company_id: string;
  status: ConnectionStatus;
  phone_number?: string;
  qr_code?: string;
  error?: string;
}
