import { randomBytes } from 'crypto';
import type {
  CreateParams,
  CreateResult,
  RevokeParams,
  RevokeResult,
} from '../types.js';
import { BaseAdapter } from './base.js';

function randomString(length: number): string {
  return randomBytes(length).toString('base64url').slice(0, length);
}

export class SquidAdapter extends BaseAdapter {
  readonly protocol = 'http' as const;

  async create(params: CreateParams): Promise<CreateResult> {
    const { server, configId } = params;
    const baseUrl = server.baseUrl.replace(/\/$/, '');
    const user = `user_${configId.slice(0, 12)}_${randomString(6)}`;
    const pass = randomString(16);

    try {
      const res = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(server.apiKey && { 'X-API-Key': server.apiKey }),
          ...(server.apiKey && { Authorization: `Bearer ${server.apiKey}` }),
        },
        body: JSON.stringify({
          user,
          pass,
          expiresAt: params.expiresAt,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return {
          success: false,
          error: 'SQUID_CREATE_FAILED',
          message: err || `HTTP ${res.status}`,
        };
      }

      const data = (await res.json()) as {
        host?: string;
        port?: number;
        user?: string;
        pass?: string;
        id?: string;
      };

      return {
        success: true,
        credentials: {
          http: {
            host: data.host ?? new URL(baseUrl).hostname,
            port: data.port ?? 3128,
            user: data.user ?? user,
            pass: data.pass ?? pass,
          },
        },
        externalId: data.id ?? user,
      };
    } catch (err) {
      return {
        success: false,
        error: 'SQUID_ERROR',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async revoke(params: RevokeParams): Promise<RevokeResult> {
    const { server, externalId } = params;
    const baseUrl = server.baseUrl.replace(/\/$/, '');

    try {
      const res = await fetch(`${baseUrl}/users/${encodeURIComponent(externalId)}`, {
        method: 'DELETE',
        headers: {
          ...(server.apiKey && { 'X-API-Key': server.apiKey }),
          ...(server.apiKey && { Authorization: `Bearer ${server.apiKey}` }),
        },
      });

      if (!res.ok && res.status !== 404) {
        return {
          success: false,
          error: 'SQUID_REVOKE_FAILED',
          message: `HTTP ${res.status}`,
        };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: 'SQUID_ERROR',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
