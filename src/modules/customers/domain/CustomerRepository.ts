import { Customer as CustomerData } from '@/src/domain/schema/customer.schema';
import { IRepository } from '@/src/platform/domain/ports/repository.port';

export type CustomerRepository = IRepository<CustomerData>;
