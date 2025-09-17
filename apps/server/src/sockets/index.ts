// src/sockets/index.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import { socketStore } from '../stores/socket.store';
import type { ConnectionStatus } from '../types/connection.types';
import { Logger } from '../utils/logger';

export function setupSocketIO(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    Logger.info('Client connected:', socket.id);

    socket.on('join_company', (companyId: string) => {
      socket.join(`company_${companyId}`);
      socketStore.addSocket(companyId, socket.id);
      Logger.info(`Socket ${socket.id} joined company ${companyId}`);
      // Optionally emit current status here
    });

    socket.on('disconnect', () => {
      Logger.info('Client disconnected:', socket.id);
      socketStore.removeSocket(socket.id);
    });
  });
}

export function broadcastToCompany(io: SocketIOServer, companyId: string, event: string, data: any) {
  io.to(`company_${companyId}`).emit(event, data);
  Logger.info(`Broadcasted ${event} to company ${companyId}:`, data);
}
