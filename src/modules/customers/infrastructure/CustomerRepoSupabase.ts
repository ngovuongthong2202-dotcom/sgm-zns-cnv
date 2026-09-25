import { BaseRepository, ListOptions } from '@/src/platform/data/base.repo';
import { Customer } from '@/src/domain/schema/customer.schema';
import { CustomerRepository } from '../domain/CustomerRepository';

export class CustomerRepoSupabase extends BaseRepository<Customer> implements CustomerRepository {
  constructor() {
    super('customers');
  }

  async listPaginated(filters?: ListOptions, limit?: number, lastDocId?: any): Promise<{ data: Customer[], lastDoc: any; hasMore: boolean }> {
    const opts: ListOptions = { ...(filters || {}), limit };
    const res = await super.listPaginated(opts, limit, lastDocId);
    return { data: res.data, lastDoc: res.hasMore ? 'yes' : null, hasMore: res.hasMore };
  }

  async create(data: Partial<Customer>): Promise<Customer> {
    const id = await super.create(data);
    return { ...data, id } as Customer;
  }

  async update(id: string, data: Partial<Customer>): Promise<Customer> {
    await super.update(id, data);
    const updated = await this.getById(id);
    return (updated || { ...data, id }) as Customer;
  }

  subscribe(optsOrId: any, callback: any, errCb?: (err: Error) => void): () => void {
    if (typeof optsOrId === 'string') {
      return this.subscribeById(optsOrId, callback, errCb);
    }
    return super.subscribe(optsOrId, callback, errCb);
  }

  subscribeList(filters: any, callback: (data: Customer[]) => void): () => void {
    return super.subscribe(filters, (data) => callback(data as Customer[]));
  }
}

export const customerRepo = new CustomerRepoSupabase();
/** @deprecated Use CustomerRepoSupabase instead */
export const CustomerRepoFirestore = CustomerRepoSupabase;
