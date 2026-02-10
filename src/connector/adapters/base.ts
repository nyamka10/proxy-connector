import type { CreateParams, CreateResult, Protocol, ProtocolAdapter, RevokeParams, RevokeResult } from '../types.js';

export abstract class BaseAdapter implements ProtocolAdapter {
  abstract readonly protocol: Protocol;
  abstract create(params: CreateParams): Promise<CreateResult>;
  abstract revoke(params: RevokeParams): Promise<RevokeResult>;
}
