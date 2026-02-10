import type {
  CreateParams,
  CreateResult,
  RevokeParams,
  RevokeResult,
} from '../types.js';
import { BaseAdapter } from './base.js';

export class WgEasyAdapter extends BaseAdapter {
  readonly protocol = 'wireguard' as const;

  private async initSession(baseUrl: string, password: string): Promise<string> {
    const url = new URL('/api/session', baseUrl);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      throw new Error(`Session init failed: ${res.status}`);
    }
    const cookie = res.headers.get('set-cookie');
    return cookie ?? '';
  }

  private getBaseUrl(server: CreateParams['server']): string {
    const base = server.baseUrl.replace(/\/$/, '');
    const port = server.port ?? 51821;
    return base.includes(':') ? base : `${base}:${port}`;
  }

  async create(params: CreateParams): Promise<CreateResult> {
    const { server, configId, userId } = params;
    const baseUrl = this.getBaseUrl(server);
    const password = server.password ?? server.apiKey ?? '';

    try {
      const cookie = await this.initSession(baseUrl, password);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (cookie) headers['Cookie'] = cookie.split(';')[0];

      const name = `${userId}_${configId}`.slice(0, 64);
      const createRes = await fetch(`${baseUrl}/api/wireguard/client`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        return {
          success: false,
          error: 'WG_EASY_CREATE_FAILED',
          message: err || `HTTP ${createRes.status}`,
        };
      }

      const createData = (await createRes.json()) as { id?: string };
      const clientId = createData?.id;

      if (!clientId) {
        return {
          success: false,
          error: 'WG_EASY_NO_CLIENT_ID',
          message: 'No client ID in response',
        };
      }

      const configRes = await fetch(
        `${baseUrl}/api/wireguard/client/${clientId}/configuration`,
        { headers }
      );

      if (!configRes.ok) {
        return {
          success: false,
          error: 'WG_EASY_CONFIG_FAILED',
          message: `Failed to get config: ${configRes.status}`,
        };
      }

      const conf = await configRes.text();

      return {
        success: true,
        credentials: { wireguard: { conf } },
        externalId: clientId,
      };
    } catch (err) {
      return {
        success: false,
        error: 'WG_EASY_ERROR',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async revoke(params: RevokeParams): Promise<RevokeResult> {
    const { server, externalId } = params;
    const baseUrl = this.getBaseUrl(server);
    const password = server.password ?? server.apiKey ?? '';

    try {
      const cookie = await this.initSession(baseUrl, password);
      const headers: Record<string, string> = {};
      if (cookie) headers['Cookie'] = cookie.split(';')[0];

      const res = await fetch(`${baseUrl}/api/wireguard/client/${externalId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok && res.status !== 404) {
        return {
          success: false,
          error: 'WG_EASY_REVOKE_FAILED',
          message: `HTTP ${res.status}`,
        };
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: 'WG_EASY_ERROR',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
