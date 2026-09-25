import { ZnsMessageAggregate } from './ZnsMessage';

export interface ZnsRepository {
  findById(id: string): Promise<ZnsMessageAggregate | null>;
  findByTrackingId(trackingId: string): Promise<ZnsMessageAggregate | null>;
  findBySttAndPhone(stt: string, phone: string): Promise<ZnsMessageAggregate | null>;
  save(message: ZnsMessageAggregate): Promise<void>;
  findDlqMessages(limit?: number): Promise<ZnsMessageAggregate[]>;
  generateIdempotencyKey(entityType: string, entityId: string, messageType: string, version: string | number, attempt: number): string;
}
