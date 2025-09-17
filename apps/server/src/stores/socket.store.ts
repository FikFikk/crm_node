// src/stores/socket.store.ts
class SocketStore {
  private companySocketMap = new Map<string, Set<string>>();

  addSocket(companyId: string, socketId: string): void {
    if (!this.companySocketMap.has(companyId)) {
      this.companySocketMap.set(companyId, new Set());
    }
    this.companySocketMap.get(companyId)!.add(socketId);
  }

  removeSocket(socketId: string): void {
    this.companySocketMap.forEach((socketSet, companyId) => {
      socketSet.delete(socketId);
      if (socketSet.size === 0) {
        this.companySocketMap.delete(companyId);
      }
    });
  }

  getCompanySockets(companyId: string): Set<string> {
    return this.companySocketMap.get(companyId) || new Set();
  }

  getAllCompanies(): string[] {
    return Array.from(this.companySocketMap.keys());
  }
}

export const socketStore = new SocketStore();