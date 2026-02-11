import { Router, type Request, type Response } from 'express';
import type { ServerConfig } from '../connector/types.js';
import { createConfig, revokeConfig, extendConfig } from '../connector/connector.js';
import { getServer } from '../config/servers.js';

const router = Router();

function parseServer(body: unknown): ServerConfig | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const server = o.server as Record<string, unknown> | undefined;
  if (!server || typeof server !== 'object') return null;
  const id = server.id;
  const baseUrl = server.baseUrl;
  const protocol = server.protocol;
  if (typeof baseUrl !== 'string' || (protocol !== 'http' && protocol !== 'wireguard')) {
    return null;
  }
  return {
    id: typeof id === 'string' ? id : 'unknown',
    baseUrl,
    apiKey: typeof server.apiKey === 'string' ? server.apiKey : undefined,
    password: typeof server.password === 'string' ? server.password : undefined,
    username: typeof server.username === 'string' ? server.username : undefined,
    port: typeof server.port === 'number' ? server.port : undefined,
    protocol,
  };
}

function resolveServer(body: unknown): ServerConfig | null {
  const o = body as Record<string, unknown>;
  const serverId = o.serverId as string | undefined;
  if (typeof serverId === 'string') {
    const stored = getServer(serverId);
    if (stored) return stored;
  }
  return parseServer(body);
}

router.post('/configs/create', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const server = resolveServer(body);
  const protocol = body.protocol;
  const userId = body.userId;
  const configId = body.configId;
  const expiresAt = body.expiresAt;
  const meta = body.meta;

  if (!server) {
    res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Missing or invalid "server" or "serverId" (serverId: id из servers.json, либо server: {baseUrl, protocol, ...})',
    });
    return;
  }
  if (protocol !== 'http' && protocol !== 'wireguard') {
    res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Invalid protocol (http | wireguard)',
    });
    return;
  }
  if (typeof userId !== 'string' || typeof configId !== 'string' || typeof expiresAt !== 'string') {
    res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Missing userId, configId or expiresAt',
    });
    return;
  }

  const result = await createConfig({
    server: { ...server, protocol },
    userId,
    configId,
    expiresAt,
    meta: typeof meta === 'object' && meta ? (meta as Record<string, unknown>) : undefined,
  });

  if (!result.success) {
    res.status(500).json(result);
    return;
  }

  res.json({
    success: true,
    configId,
    protocol,
    credentials: result.credentials,
    externalId: result.externalId,
  });
});

router.post('/configs/revoke', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const server = resolveServer(body);
  const protocol = body.protocol;
  const externalId = body.externalId;
  const configId = body.configId;

  if (!server) {
    res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Missing or invalid "server" or "serverId"',
    });
    return;
  }
  if (protocol !== 'http' && protocol !== 'wireguard') {
    res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Invalid protocol',
    });
    return;
  }
  if (typeof externalId !== 'string' || typeof configId !== 'string') {
    res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Missing externalId or configId',
    });
    return;
  }

  const result = await revokeConfig({
    server: { ...server, protocol },
    externalId,
    configId,
  });

  if (!result.success) {
    res.status(500).json(result);
    return;
  }

  res.json({ success: true });
});

router.post('/configs/extend', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const server = resolveServer(body);
  const protocol = body.protocol;
  const externalId = body.externalId;
  const configId = body.configId;
  const expiresAt = body.expiresAt;

  if (!server) {
    res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Missing or invalid "server" or "serverId"',
    });
    return;
  }
  if (protocol !== 'http' && protocol !== 'wireguard') {
    res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Invalid protocol',
    });
    return;
  }
  if (typeof externalId !== 'string' || typeof configId !== 'string' || typeof expiresAt !== 'string') {
    res.status(400).json({
      success: false,
      error: 'INVALID_REQUEST',
      message: 'Missing externalId, configId or expiresAt',
    });
    return;
  }

  const result = await extendConfig({
    server: { ...server, protocol },
    externalId,
    configId,
    expiresAt,
  });

  if (!result.success) {
    res.status(500).json(result);
    return;
  }

  res.json({ success: true });
});

export { router as v1Router };
