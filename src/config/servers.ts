import { readFileSync } from 'fs';
import { join } from 'path';
import type { Protocol, ServerConfig } from '../connector/types.js';

export interface ServerConfigStored {
  baseUrl: string;
  username?: string;
  password?: string;
  apiKey?: string;
  port?: number;
  protocol: Protocol;
}

let serversMap: Map<string, ServerConfig> = new Map();

function loadServers(): void {
  const path = process.env.SERVERS_FILE ?? join(process.cwd(), 'servers.json');
  try {
    const data = readFileSync(path, 'utf-8').trim();
    if (!data) {
      serversMap = new Map();
      return;
    }
    const parsed = JSON.parse(data) as Record<string, ServerConfigStored>;
    serversMap = new Map();
    for (const [id, s] of Object.entries(parsed)) {
      if (s?.baseUrl && s?.protocol) {
        serversMap.set(id, {
          id,
          baseUrl: s.baseUrl,
          username: s.username,
          password: s.password,
          apiKey: s.apiKey,
          port: s.port,
          protocol: s.protocol,
        });
      }
    }
    console.log(`[config] Loaded ${serversMap.size} servers from ${path}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      serversMap = new Map();
      return;
    }
    console.error('[config] Failed to load servers:', err);
    serversMap = new Map();
  }
}

loadServers();

export function getServer(serverId: string): ServerConfig | null {
  return serversMap.get(serverId) ?? null;
}
