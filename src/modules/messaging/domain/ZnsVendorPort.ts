import { ZnsMessageAggregate } from './ZnsMessage';

export interface ZnsVendorPort {
  send(message: ZnsMessageAggregate): Promise<{ trackingId: string; success: boolean; rawResponse: Record<string, unknown>; error?: string }>;
}
