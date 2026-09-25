/* eslint-disable max-lines */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { swrDocFetcher } from '@/src/data/swr-fetchers';
import type { Customer } from '@/src/domain/schema/customer.schema';
import type { Quotation } from '@/src/domain/schema/quotation.schema';
import type { Contract } from '@/src/domain/schema/contract.schema';
import type { Payment } from '@/src/domain/schema/payment.schema';
import type { Delivery } from '@/src/domain/schema/delivery.schema';

// Lazy load detail drawers to prevent circular dependency issues
const CustomerDetailDrawer = React.lazy(() =>
  import('@/src/modules/customers/ui/components/CustomerDetailDrawer').then((m) => ({ default: m.CustomerDetailDrawer }))
);
const QuotationDetailDrawer = React.lazy(() =>
  import('@/src/modules/sales/ui/components/QuotationDetailDrawer').then((m) => ({ default: m.QuotationDetailDrawer }))
);
const ContractDetailDrawer = React.lazy(() =>
  import('@/src/modules/contracts/ui/components/ContractDetailDrawer').then((m) => ({ default: m.ContractDetailDrawer }))
);
const PaymentDetailDrawer = React.lazy(() =>
  import('@/src/modules/billing/ui/components/PaymentDetailDrawer').then((m) => ({ default: m.PaymentDetailDrawer }))
);
const DeliveryDetailDrawer = React.lazy(() =>
  import('@/src/modules/fulfillment/ui/components/DeliveryDetailDrawer').then((m) => ({ default: m.DeliveryDetailDrawer }))
);

export interface DrawerStackItem {
  id: string; // unique stack trace key
  entityType: 'customer' | 'quotation' | 'contract' | 'payment' | 'delivery';
  entityId: string;
}

interface DrawerStackContextType {
  stack: DrawerStackItem[];
  openDrawer: (entityType: DrawerStackItem['entityType'], entityId: string) => void;
  closeDrawer: () => void;
  clearStack: () => void;
}

const DrawerStackContext = createContext<DrawerStackContextType | null>(null);

export function DrawerStackProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<DrawerStackItem[]>([]);
  const pushedCountRef = useRef(0);

  // Parse drawer query param robustly
  const getSerializedStackFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('drawer') || '';
  };

  const parseDrawerUrlToItems = (serialized: string): Omit<DrawerStackItem, 'id'>[] => {
    if (!serialized) return [];
    return serialized.split(';').map(part => {
      const [entityType, entityId] = part.split(':');
      return { entityType, entityId } as any;
    }).filter(i => i.entityType && (i.entityType === 'customer' || i.entityType === 'quotation' || i.entityType === 'contract' || i.entityType === 'payment' || i.entityType === 'delivery') && i.entityId);
  };

  // Two-Way Sync hook: Listening to popstate events
  useEffect(() => {
    const handlePopState = () => {
      const serialized = getSerializedStackFromUrl();
      const parsed = parseDrawerUrlToItems(serialized);

      setStack(prev => {
        const newStack: DrawerStackItem[] = [];
        parsed.forEach((item, index) => {
          const existing = prev[index];
          if (existing && existing.entityType === item.entityType && existing.entityId === item.entityId) {
            newStack.push(existing);
          } else {
            newStack.push({
              id: `${item.entityType}-${item.entityId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              entityType: item.entityType as any,
              entityId: item.entityId
            });
          }
        });
        return newStack;
      });
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState(); // Init on mount

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const updateUrlWithStack = (nextStack: DrawerStackItem[], isPush: boolean) => {
    const serialized = nextStack.map(i => `${i.entityType}:${i.entityId}`).join(';');
    const params = new URLSearchParams(window.location.search);
    if (serialized) {
      params.set('drawer', serialized);
    } else {
      params.delete('drawer');
    }
    const newSearch = params.toString() ? `?${params.toString()}` : '';
    const newUrl = `${window.location.pathname}${newSearch}`;

    if (isPush) {
      window.history.pushState({ drawerStack: true }, '', newUrl);
    } else {
      window.history.replaceState({ drawerStack: true }, '', newUrl);
    }
  };

  const openDrawer = useCallback((entityType: DrawerStackItem['entityType'], entityId: string) => {
    if (!entityId) return;
    setStack((prev) => {
      // Avoid pushing duplicate adjacent drawers to prevent infinite cycles
      const top = prev[prev.length - 1];
      if (top && top.entityType === entityType && top.entityId === entityId) {
        return prev;
      }
      const newItem = {
        id: `${entityType}-${entityId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        entityType,
        entityId,
      };
      const nextStack = [...prev, newItem];
      pushedCountRef.current += 1;
      updateUrlWithStack(nextStack, true);
      return nextStack;
    });
  }, []);

  const closeDrawer = useCallback(() => {
    if (pushedCountRef.current > 0) {
      pushedCountRef.current -= 1;
      window.history.back();
    } else {
      setStack((prev) => {
        if (prev.length === 0) return prev;
        const nextStack = prev.slice(0, -1);
        updateUrlWithStack(nextStack, false);
        return nextStack;
      });
    }
  }, []);

  const clearStack = useCallback(() => {
    pushedCountRef.current = 0;
    setStack([]);
    const params = new URLSearchParams(window.location.search);
    params.delete('drawer');
    const newSearch = params.toString() ? `?${params.toString()}` : '';
    window.history.pushState(null, '', `${window.location.pathname}${newSearch}`);
  }, []);

  const value = useMemo(
    () => ({
      stack,
      openDrawer,
      closeDrawer,
      clearStack,
    }),
    [stack, openDrawer, closeDrawer, clearStack]
  );

  return (
    <DrawerStackContext.Provider value={value}>
      {children}
      <DrawerHost />
    </DrawerStackContext.Provider>
  );
}

export function useDrawerStack() {
  const context = useContext(DrawerStackContext);
  if (!context) {
    throw new Error('useDrawerStack must be used within a DrawerStackProvider');
  }
  return context;
}

function DrawerHost() {
  const { stack, closeDrawer } = useDrawerStack();

  if (stack.length === 0) return null;

  return (
    <React.Suspense fallback={null}>
      {stack.map((item, index) => {
        const isTop = index === stack.length - 1;
        const commonProps = {
          isOpen: true,
          modal: isTop,
          onClose: closeDrawer,
          entityId: item.entityId,
          // If not top, we slide transition back elegantly under top-most stack
          className: isTop ? '' : 'pointer-events-none opacity-50 shadow-none scale-95 origin-right transition-transform duration-250',
        };

        switch (item.entityType) {
          case 'customer':
            return (
              <CustomerDrawerWrapper
                key={item.id}
                {...commonProps}
              />
            );
          case 'quotation':
            return (
              <QuotationDrawerWrapper
                key={item.id}
                {...commonProps}
              />
            );
          case 'contract':
            return (
              <ContractDrawerWrapper
                key={item.id}
                {...commonProps}
              />
            );
          case 'payment':
            return (
              <PaymentDrawerWrapper
                key={item.id}
                {...commonProps}
              />
            );
          case 'delivery':
            return (
              <DeliveryDrawerWrapper
                key={item.id}
                {...commonProps}
              />
            );
          default:
            return null;
        }
      })}
    </React.Suspense>
  );
}

// WRAPPERS WITH INDEPENDENT SWR FETCHERS FOR FULL STANDALONE RESILIENCE

function CustomerDrawerWrapper({ isOpen, onClose, entityId, className, modal }: any) {
  const { data: customer, isLoading } = useSWR<Customer>(
    isOpen && entityId ? `customers:${entityId}` : null,
    swrDocFetcher as any
  );

  if (isLoading) return null;
  if (!customer) return null;

  return (
    <CustomerDetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      customer={customer}
      prevCustomer={null}
      nextCustomer={null}
      onNavigatePrev={() => {}}
      onNavigateNext={() => {}}
      onEdit={() => {}}
      onSendZns={() => {}}
      onDeleteCustomer={() => {}}
      modal={modal}
      className={className}
    />
  );
}

function QuotationDrawerWrapper({ isOpen, onClose, entityId, className, modal }: any) {
  const { data: quotation, isLoading } = useSWR<Quotation>(
    isOpen && entityId ? `quotations:${entityId}` : null,
    swrDocFetcher as any
  );

  if (isLoading) return null;
  if (!quotation) return null;

  return (
    <QuotationDetailDrawer
      quotation={quotation}
      customers={[]}
      owners={[]}
      statuses={[]}
      contracts={[]}
      payments={[]}
      deliveries={[]}
      onClose={onClose}
      onEdit={() => {}}
      onUpdate={async () => {}}
      onSendZns={() => {}}
      onDelete={async () => {}}
      modal={modal}
      className={className}
    />
  );
}

function ContractDrawerWrapper({ isOpen, onClose, entityId, className, modal }: any) {
  const { data: contract, isLoading } = useSWR<Contract>(
    isOpen && entityId ? `contracts:${entityId}` : null,
    swrDocFetcher as any
  );

  if (isLoading) return null;
  if (!contract) return null;

  return (
    <ContractDetailDrawer
      drawerContract={contract}
      payments={[]}
      deliveries={[]}
      customers={[]}
      onClose={onClose}
      onEdit={() => {}}
      modal={modal}
      className={className}
    />
  );
}

function PaymentDrawerWrapper({ isOpen, onClose, entityId, className, modal }: any) {
  const { data: payment, isLoading } = useSWR<Payment>(
    isOpen && entityId ? `payments:${entityId}` : null,
    swrDocFetcher as any
  );

  if (isLoading) return null;
  if (!payment) return null;

  return (
    <PaymentDetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      payment={payment}
      onEdit={() => {}}
      onSendZns={() => {}}
      onDelete={() => {}}
      modal={modal}
      className={className}
    />
  );
}

function DeliveryDrawerWrapper({ isOpen, onClose, entityId, className, modal }: any) {
  const { data: delivery, isLoading } = useSWR<Delivery>(
    isOpen && entityId ? `deliveries:${entityId}` : null,
    swrDocFetcher as any
  );

  const { data: contract } = useSWR<Contract>(
    delivery?.contractId ? `contracts:${delivery.contractId}` : null,
    swrDocFetcher as any
  );

  const quotationId = delivery?.quotationId || contract?.quotationId;
  const { data: quotation } = useSWR<Quotation>(
    quotationId ? `quotations:${quotationId}` : null,
    swrDocFetcher as any
  );

  if (isLoading) return null;
  if (!delivery) return null;

  return (
    <DeliveryDetailDrawer
      drawerDelivery={delivery}
      onClose={onClose}
      onEdit={() => {}}
      onMarkDelivered={() => {}}
      onSendZns={() => {}}
      onCancelDelivery={async () => {}}
      drawerContract={contract || null}
      drawerQuotation={quotation || null}
      modal={modal}
      className={className}
    />
  );
}
