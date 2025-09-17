// src/types/socket.types.ts
export interface SocketEvent {
  company_id: string;
  [key: string]: any;
}

export interface QRCodeEvent extends SocketEvent {
  qr_code: string;
  status: 'qr_generated';
}

export interface ConnectionStatusEvent extends SocketEvent {
  status: string;
  connected: boolean;
  phone_number?: string;
}