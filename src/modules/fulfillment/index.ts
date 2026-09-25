import { DeliveryRepoSupabase, DeliveryRepoFirestore } from './infrastructure/DeliveryRepoSupabase';
import { CreateDeliveryUseCase } from './application/use-cases/CreateDelivery';
import { UpdateDeliveryUseCase } from './application/use-cases/UpdateDelivery';
import { DeleteDeliveryUseCase } from './application/use-cases/DeleteDelivery';
import { SendZnsDeliveryUseCase } from './application/use-cases/SendZnsDelivery';
import { GetDeliveryDetailQuery } from './application/queries/GetDeliveryDetail';
import { GetDeliveryListQuery } from './application/queries/GetDeliveryList';

// Import from other modules
import { GetContractDetailQuery, UpdateContractUseCase, ContractRepoSupabase } from '@/src/modules/contracts';
import { GetQuotationDetailQuery, UpdateQuotationUseCase, QuotationRepoSupabase } from '@/src/modules/sales';

// Singletons
const contractRepo = new ContractRepoSupabase();
const quotationRepo = new QuotationRepoSupabase();

const getContractQuery = new GetContractDetailQuery(contractRepo);
const getQuotationQuery = new GetQuotationDetailQuery(quotationRepo);
const updateContractUseCase = new UpdateContractUseCase(contractRepo);
const updateQuotationUseCase = new UpdateQuotationUseCase(quotationRepo);

const deliveryRepo = new DeliveryRepoSupabase();

export const createDeliveryUseCase = new CreateDeliveryUseCase(deliveryRepo, getContractQuery, getQuotationQuery, updateContractUseCase, updateQuotationUseCase);
export const updateDeliveryUseCase = new UpdateDeliveryUseCase(deliveryRepo, getContractQuery, getQuotationQuery, updateContractUseCase, updateQuotationUseCase);
export const deleteDeliveryUseCase = new DeleteDeliveryUseCase(deliveryRepo, getContractQuery, getQuotationQuery, updateContractUseCase, updateQuotationUseCase);
export const sendZnsDeliveryUseCase = new SendZnsDeliveryUseCase(deliveryRepo);
export const getDeliveryDetailQuery = new GetDeliveryDetailQuery(deliveryRepo);
export const getDeliveryListQuery = new GetDeliveryListQuery(deliveryRepo);

export { Delivery, DeliveryCompletedEvent } from './domain/Delivery';
export type { DeliveryProps } from './domain/Delivery';
export type { CreateDeliveryCommand } from './application/use-cases/CreateDelivery';
export type { UpdateDeliveryCommand } from './application/use-cases/UpdateDelivery';
export { DeliveryRepoSupabase, DeliveryRepoFirestore, deliveryRepo };
