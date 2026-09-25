import { adminDb } from '../../../backend/config/supabase.admin';
import { ZnsRepository } from '../domain/ZnsRepository';
import { ZnsMessageAggregate } from '../domain/ZnsMessage';
import { ZnsMessage as ZnsMessageSchemaType } from '../../../domain/schema/workflow.schema';
import * as crypto from 'crypto';

export class ZnsRepoSupabase implements ZnsRepository {
  private get collection() {
    return adminDb.collection('znsMessages');
  }

  async findById(id: string): Promise<ZnsMessageAggregate | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return ZnsMessageAggregate.reconstitute(doc.data() as ZnsMessageSchemaType);
  }

  async findByTrackingId(trackingId: string): Promise<ZnsMessageAggregate | null> {
    const q = this.collection.where('trackingId', '==', trackingId).limit(1);
    const snap = await q.get();
    if (snap.empty) return null;
    return ZnsMessageAggregate.reconstitute(snap.docs[0].data() as ZnsMessageSchemaType);
  }

  async findBySttAndPhone(stt: string, phone: string): Promise<ZnsMessageAggregate | null> {
    const q = this.collection.where('stt', '==', stt).where('phone', '==', phone).limit(1);
    const snap = await q.get();
    if (snap.empty) return null;
    return ZnsMessageAggregate.reconstitute(snap.docs[0].data() as ZnsMessageSchemaType);
  }

  async save(message: ZnsMessageAggregate): Promise<void> {
    const data = message.props;
    await this.collection.doc(message.id).set(data, { merge: true });
  }

  async findDlqMessages(limit: number = 100): Promise<ZnsMessageAggregate[]> {
    const q = this.collection.where('status', 'in', ['FAILED', 'DLQ']).limit(limit);
    const snap = await q.get();
    return snap.docs.map(doc => ZnsMessageAggregate.reconstitute(doc.data() as ZnsMessageSchemaType));
  }

  generateIdempotencyKey(entityType: string, entityId: string, messageType: string, version: string | number = 1, attempt: number = 0): string {
    return crypto.createHash('sha256')
      .update(`${entityType}|${entityId}|${messageType}|${version}|${attempt}`)
      .digest('hex')
      .substring(0, 32);
  }
}

export const znsRepository = new ZnsRepoSupabase();
/** @deprecated Use ZnsRepoSupabase instead */
export const ZnsRepoFirestore = ZnsRepoSupabase;
