import type {
  CreateParams,
  CreateResult,
  RevokeParams,
  RevokeResult,
} from '../types.js';
import { BaseAdapter } from './base.js';

/** wg-easy v15 API: /api/client, Basic Auth or session */
export class WgEasyAdapter extends BaseAdapter {
  readonly protocol = 'wireguard' as const;

  private getBaseUrl(server: CreateParams['server']): string {
    const base = server.baseUrl.replace(/\/$/, '');
    const port = server.port ?? 51821;
    return base.includes(':') ? base : `${base}:${port}`;
  }

  private getAuthHeaders(server: CreateParams['server']): Record<string, string> {
    const username = server.username ?? 'admin';
    const password = server.password ?? server.apiKey ?? '';
    const basic = Buffer.from(`${username}:${password}`, 'utf-8').toString('base64');
    return { Authorization: `Basic ${basic}` };
  }

  private async initSession(baseUrl: string, server: CreateParams['server']): Promise<string> {
    const username = server.username ?? 'admin';
    const password = server.password ?? server.apiKey ?? '';
    const url = new URL('/api/session', baseUrl);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, remember: false }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Session failed ${res.status}: ${text.slice(0, 200)}`);
    }
    const cookie = res.headers.get('set-cookie');
    return cookie?.split(';')[0] ?? '';
  }

  private async fetchWithAuth(
    url: string,
    server: CreateParams['server'],
    options: RequestInit = {}
  ): Promise<Response> {
    const authHeaders = this.getAuthHeaders(server);
    const headers = { ...authHeaders, ...options.headers } as Record<string, string>;
    return fetch(url, { ...options, headers });
  }

  async create(params: CreateParams): Promise<CreateResult> {
    const { server, configId, userId } = params;
    const baseUrl = this.getBaseUrl(server);
    const name = `${userId}_${configId}`.slice(0, 64);
    const expiresAt = params.expiresAt;

    try {
      let cookie = '';
      try {
        cookie = await this.initSession(baseUrl, server);
      } catch {
        // Session may fail if 2FA enabled; try Basic Auth directly
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(server),
      };
      if (cookie) headers['Cookie'] = cookie;

      const createRes = await fetch(`${baseUrl}/api/client`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, expiresAt }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        return {
          success: false,
          error: 'WG_EASY_CREATE_FAILED',
          message: err || `HTTP ${createRes.status}`,
        };
      }

      const createData = (await createRes.json()) as { success?: boolean; clientId?: string };
      const clientId = createData?.clientId;

      if (!clientId) {
        return {
          success: false,
          error: 'WG_EASY_NO_CLIENT_ID',
          message: 'No clientId in response',
        };
      }

      const configRes = await fetch(`${baseUrl}/api/client/${clientId}/configuration`, {
        headers,
      });

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
    const headers = this.getAuthHeaders(server);

    try {
      const res = await fetch(`${baseUrl}/api/client/${externalId}`, {
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
