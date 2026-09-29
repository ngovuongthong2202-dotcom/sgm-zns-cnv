import { Agent, setGlobalDispatcher, fetch as undiciFetch } from 'undici';
import dns from 'node:dns';
import { logger } from './logger';

// Static reliable IP mappings for third-party services whose DNS delegation occasionally hiccups
const KNOWN_HOST_MAP: Record<string, string> = {
  'hub.cnvcdp.com': '118.69.84.27',
  'app.cnvcdp.com': '118.69.84.27',
  'cnvcdp.com': '118.69.84.27'
};

const dnsResolver = new dns.promises.Resolver();
try {
  dnsResolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4', '208.67.222.222']);
} catch {
  // Use default
}

/**
 * Custom resilient DNS lookup function with smart fallback.
 */
export function resilientLookup(
  hostname: string,
  options: any,
  callback: (err: NodeJS.ErrnoException | null, address: any, family?: number) => void
) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'object' ? options : {};

  // 1. Check known static host mapping first
  if (KNOWN_HOST_MAP[hostname]) {
    const ip = KNOWN_HOST_MAP[hostname];
    if (opts.all) {
      return cb(null, [{ address: ip, family: 4 }]);
    }
    return cb(null, ip, 4);
  }

  // 2. Perform system DNS lookup
  dns.lookup(hostname, options, (err, address, family) => {
    if (!err && address) {
      return cb(null, address, family);
    }

    // 3. If system lookup fails (e.g. EAI_AGAIN / ENOTFOUND), query fallback DNS servers
    dnsResolver.resolve4(hostname)
      .then((addresses) => {
        if (addresses && addresses.length > 0) {
          const selected = addresses[0];
          if (opts.all) {
            return cb(null, addresses.map(a => ({ address: a, family: 4 })));
          }
          return cb(null, selected, 4);
        }
        
        // 4. If domain belongs to cnvcdp.com family, apply fallback
        if (hostname.endsWith('.cnvcdp.com') || hostname === 'cnvcdp.com') {
          const fallbackIp = '118.69.84.27';
          if (opts.all) return cb(null, [{ address: fallbackIp, family: 4 }]);
          return cb(null, fallbackIp, 4);
        }

        cb(err, address, family);
      })
      .catch(() => {
        // Fallback for CNV domains
        if (hostname.endsWith('.cnvcdp.com') || hostname === 'cnvcdp.com') {
          const fallbackIp = '118.69.84.27';
          if (opts.all) return cb(null, [{ address: fallbackIp, family: 4 }]);
          return cb(null, fallbackIp, 4);
        }
        cb(err, address, family);
      });
  });
}

/**
 * Global Undici Agent configured with Resilient Transport & DNS Fallback.
 */
export const resilientAgent = new Agent({
  connect: {
    lookup: resilientLookup
  },
  headersTimeout: 30000,
  bodyTimeout: 30000,
  keepAliveTimeout: 15000
});

let isInitialized = false;

/**
 * Initializes global resilient transport for the entire backend application.
 */
export function initResilientTransport() {
  if (isInitialized) return;
  
  try {
    dns.setDefaultResultOrder?.('ipv4first');
  } catch {
    // ignore
  }

  try {
    setGlobalDispatcher(resilientAgent);
    isInitialized = true;
    logger.info('Initialized Resilient Outbound Transport with Self-Healing DNS & CNV Fallback.');
  } catch (err) {
    logger.warn({ err }, 'Failed to set global undici dispatcher. Falling back to local resilientFetch.');
  }
}

/**
 * Safe fetch wrapper that always uses the resilient dispatcher and returns standard Response.
 */
export async function resilientFetch(url: string | URL, init?: any): Promise<Response> {
  initResilientTransport();
  return undiciFetch(url, {
    ...init,
    dispatcher: resilientAgent
  }) as unknown as Promise<Response>;
}
