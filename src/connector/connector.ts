import type { CreateParams, CreateResult, ExtendParams, ExtendResult, RevokeParams, RevokeResult } from './types.js';
import { getAdapter } from './adapters/index.js';

export async function createConfig(params: CreateParams): Promise<CreateResult> {
  const adapter = getAdapter(params.server.protocol);
  if (!adapter) {
    return {
      success: false,
      error: 'UNSUPPORTED_PROTOCOL',
      message: `Protocol "${params.server.protocol}" is not supported`,
    };
  }
  return adapter.create(params);
}

export async function revokeConfig(params: RevokeParams): Promise<RevokeResult> {
  const adapter = getAdapter(params.server.protocol);
  if (!adapter) {
    return {
      success: false,
      error: 'UNSUPPORTED_PROTOCOL',
      message: `Protocol "${params.server.protocol}" is not supported`,
    };
  }
  return adapter.revoke(params);
}

export async function extendConfig(params: ExtendParams): Promise<ExtendResult> {
  const adapter = getAdapter(params.server.protocol);
  if (!adapter) {
    return {
      success: false,
      error: 'UNSUPPORTED_PROTOCOL',
      message: `Protocol "${params.server.protocol}" is not supported`,
    };
  }
  if (!adapter.extend) {
    return {
      success: false,
      error: 'EXTEND_NOT_SUPPORTED',
      message: `Protocol "${params.server.protocol}" does not support extend`,
    };
  }
  return adapter.extend(params);
}
