// src/types/message.types.ts
export interface MessageData {
  event: string;
  company_id: string;
  message_id: string;
  phone: string;
  content: string;
  timestamp: number;
  type: MessageType;
  push_name: string;
  imageURL?: string;
  videoURL?: string;
  audioURL?: string;
  documentURL?: string;
  locationLat?: string;
  locationLong?: string;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';

export interface SendMessageRequest {
  company_id: string;
  to: string;
  message: string;
}

export interface ChatMessage {
  id: number;
  messageId?: string;
  body: string;
  direction: 'in' | 'out';
  companyId: string;
  created: string;
  type: MessageType;
  imageURL?: string;
  videoURL?: string;
  audioURL?: string;
  documentURL?: string;
  locationLat?: string;
  locationLong?: string;
}