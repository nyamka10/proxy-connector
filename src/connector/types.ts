export type Protocol = 'http' | 'wireguard';

export interface ServerConfig {
  id: string;
  baseUrl: string;
  apiKey?: string;
  password?: string;
  /** wg-easy: username (default "admin") */
  username?: string;
  port?: number;
  protocol: Protocol;
}

export interface CreateParams {
  server: ServerConfig;
  userId: string;
  configId: string;
  expiresAt: string;
  meta?: Record<string, unknown>;
}

export interface HttpCredentials {
  host: string;
  port: number;
  user: string;
  pass: string;
}

export interface WgCredentials {
  conf: string;
}

export interface CreateResult {
  success: boolean;
  credentials?: { http?: HttpCredentials; wireguard?: WgCredentials };
  externalId?: string;
  error?: string;
  message?: string;
}

export interface RevokeParams {
  server: ServerConfig;
  externalId: string;
  configId: string;
}

export interface RevokeResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface ExtendParams {
  server: ServerConfig;
  externalId: string;
  configId: string;
  expiresAt: string;
}

export interface ExtendResult {
  success: boolean;
  error?: string;
  message?: string;
}

export interface ProtocolAdapter {
  readonly protocol: Protocol;
  create(params: CreateParams): Promise<CreateResult>;
  revoke(params: RevokeParams): Promise<RevokeResult>;
  extend?(params: ExtendParams): Promise<ExtendResult>;
}
