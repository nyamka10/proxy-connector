import type {
  CreateParams,
  CreateResult,
  RevokeParams,
  RevokeResult,
} from '../types.js';
import { BaseAdapter } from './base.js';

/** wg-easy v15: session cookie, затем /api/client */
export class WgEasyAdapter extends BaseAdapter {
  readonly protocol = 'wireguard' as const;

  private getBaseUrl(server: CreateParams['server']): string {
    const base = server.baseUrl.replace(/\/$/, '');
    const port = server.port ?? 51821;
    return base.includes(':') ? base : `${base}:${port}`;
  }

  private async getSessionCookie(server: CreateParams['server']): Promise<string> {
    const baseUrl = this.getBaseUrl(server);
    const username = server.username ?? 'admin';
    const password = server.password ?? server.apiKey ?? '';

    const res = await fetch(`${baseUrl}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, remember: false }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Session ${res.status}: ${text.slice(0, 150)}`);
    }

    const setCookie = res.headers.get('set-cookie');
    const cookie = setCookie?.split(';')[0] ?? '';
    if (!cookie) {
      throw new Error('No session cookie in response');
    }
    return cookie;
  }

  async create(params: CreateParams): Promise<CreateResult> {
    const { server, configId, userId } = params;
    const baseUrl = this.getBaseUrl(server);
    const name = `${userId}_${configId}`.slice(0, 64);
    const expiresAt = params.expiresAt;

    try {
      const cookie = await this.getSessionCookie(server);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Cookie: cookie,
      };

      console.log('[WgEasy] create client', { baseUrl, name });
      const createRes = await fetch(`${baseUrl}/api/client`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, expiresAt }),
      });

      if (!createRes.ok) {
        const err = await createRes.text();
        console.error('[WgEasy] create failed', createRes.status, err?.slice(0, 300));
        return {
          success: false,
          error: 'WG_EASY_CREATE_FAILED',
          message: `${createRes.status}: ${(err || '').slice(0, 200)}`,
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
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[WgEasy] create error', err);
      return {
        success: false,
        error: 'WG_EASY_ERROR',
        message: msg,
      };
    }
  }

  async revoke(params: RevokeParams): Promise<RevokeResult> {
    const { server, externalId } = params;
    const baseUrl = this.getBaseUrl(server);

    try {
      const cookie = await this.getSessionCookie(server);
      const headers = { Cookie: cookie };

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
