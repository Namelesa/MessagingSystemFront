import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable({ providedIn: 'root' })
export class SignalRConnectionRegistryService {
  private connections = new Map<string, signalR.HubConnection>();
  private waiters = new Map<string, Array<(c: signalR.HubConnection) => void>>();

  setConnection(key: string, connection: signalR.HubConnection | undefined): void {
    if (connection) {
      this.connections.set(key, connection);
      const resolvers = this.waiters.get(key);
      if (resolvers && resolvers.length) {
        resolvers.forEach(r => r(connection));
        this.waiters.delete(key);
      }
    } else {
      this.connections.delete(key);
    }
  }

  getConnection(key: string): signalR.HubConnection | null {
    return this.connections.get(key) || null;
  }

  waitForConnection(key: string, attempts = 20, intervalMs = 150): Promise<signalR.HubConnection> {
    const existing = this.getConnection(key);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      let remaining = attempts;
      const check = () => {
        const conn = this.getConnection(key);
        if (conn) {
          resolve(conn);
        } else if (--remaining <= 0) {
          reject(new Error(`SignalR connection '${key}' not established`));
        } else {
          setTimeout(check, intervalMs);
        }
      };
      check();
    });
  }
}



