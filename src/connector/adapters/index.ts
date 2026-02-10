import type { Protocol, ProtocolAdapter } from '../types.js';
import { SquidAdapter } from './squid.js';
import { WgEasyAdapter } from './wg-easy.js';

const registry = new Map<Protocol, ProtocolAdapter>([
  ['http', new SquidAdapter()],
  ['wireguard', new WgEasyAdapter()],
]);

export function getAdapter(protocol: Protocol): ProtocolAdapter | undefined {
  return registry.get(protocol);
}

export { SquidAdapter, WgEasyAdapter };
