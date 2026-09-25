export { Customer as CustomerEntity } from './domain/Customer';
export * from './domain/CustomerRepository';
export * from './domain/events';
export { CustomerSchema } from './domain/customer.schema';
export type { Customer } from './domain/customer.schema';
export * from './domain/healthScore';
export { CustomerRepoSupabase, CustomerRepoFirestore, customerRepo } from './infrastructure/CustomerRepoSupabase';

// Use Cases
export { CreateCustomer } from './application/use-cases/CreateCustomer';
export { UpdateCustomer } from './application/use-cases/UpdateCustomer';

// UI
export { default as CustomersFeature } from './ui/page';
export { CustomerHoverCard } from './ui/components/CustomerHoverCard';
export { CustomerForm } from './ui/components/CustomerFormModal';
