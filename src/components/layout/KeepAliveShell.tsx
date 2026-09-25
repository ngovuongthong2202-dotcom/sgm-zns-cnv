import React, { useState, useEffect } from 'react';
import { PageSkeleton } from '@/src/design-system/skeletons/PageSkeleton';
import { lazyRetry } from '@/src/shared/lib/lazyRetry';

// Lazy load all features with persistent component mounts and retry resilience
const CustomersFeature = React.lazy(() => lazyRetry(() => import('@/src/modules/customers/ui/page')));
const QuotationsFeature = React.lazy(() => lazyRetry(() => import('@/src/modules/sales/ui/page')));
const ContractsFeature = React.lazy(() => lazyRetry(() => import('@/src/modules/contracts/ui/page')));
const PaymentsFeature = React.lazy(() => lazyRetry(() => import('@/src/modules/billing/ui/page')));
const DeliveriesFeature = React.lazy(() => lazyRetry(() => import('@/src/modules/fulfillment/ui/page')));
const ZnsHubFeature = React.lazy(() => lazyRetry(() => import('@/src/features/system/zns-hub/page')));
const AuditLogsFeature = React.lazy(() => lazyRetry(() => import('@/src/features/system/audit/page')));
const SettingsFeature = React.lazy(() => lazyRetry(() => import('@/src/features/system/settings/page')));

interface Props {
  currentPath: string;
}

interface SlotProps {
  isActive: boolean;
  Component: React.ComponentType;
}

const KeepAliveSlot = React.memo(
  function KeepAliveSlot({ isActive, Component }: SlotProps) {
    return (
      <div
        className={`w-full h-full min-h-0 flex-col ${isActive ? 'flex' : 'hidden'}`}
        style={{ display: isActive ? 'flex' : 'none' }}
        aria-hidden={!isActive}
      >
        <React.Suspense fallback={<PageSkeleton />}>
          <Component />
        </React.Suspense>
      </div>
    );
  },
  (prev, next) => prev.isActive === next.isActive && prev.Component === next.Component
);

export function KeepAliveShell({ currentPath }: Props) {
  // Track visited features so each is only mounted on demand when first accessed
  const [visited, setVisited] = useState<Record<string, boolean>>(() => ({
    customers: currentPath.startsWith('/customers'),
    quotations: currentPath.startsWith('/quotations'),
    contracts: currentPath.startsWith('/contracts'),
    payments: currentPath.startsWith('/payments'),
    deliveries: currentPath.startsWith('/deliveries'),
    znsHub: currentPath.startsWith('/zns-hub'),
    auditLogs: currentPath.startsWith('/audit-logs'),
    settings: currentPath.startsWith('/settings'),
  }));

  useEffect(() => {
    if (currentPath.startsWith('/customers') && !visited.customers) {
      setVisited((v) => ({ ...v, customers: true }));
    } else if (currentPath.startsWith('/quotations') && !visited.quotations) {
      setVisited((v) => ({ ...v, quotations: true }));
    } else if (currentPath.startsWith('/contracts') && !visited.contracts) {
      setVisited((v) => ({ ...v, contracts: true }));
    } else if (currentPath.startsWith('/payments') && !visited.payments) {
      setVisited((v) => ({ ...v, payments: true }));
    } else if (currentPath.startsWith('/deliveries') && !visited.deliveries) {
      setVisited((v) => ({ ...v, deliveries: true }));
    } else if (currentPath.startsWith('/zns-hub') && !visited.znsHub) {
      setVisited((v) => ({ ...v, znsHub: true }));
    } else if (currentPath.startsWith('/audit-logs') && !visited.auditLogs) {
      setVisited((v) => ({ ...v, auditLogs: true }));
    } else if (currentPath.startsWith('/settings') && !visited.settings) {
      setVisited((v) => ({ ...v, settings: true }));
    }
  }, [currentPath, visited]);

  return (
    <div className="w-full h-full relative flex-1 flex flex-col min-h-0 overflow-hidden">
      {visited.customers && (
        <KeepAliveSlot
          isActive={currentPath.startsWith('/customers')}
          Component={CustomersFeature}
        />
      )}

      {visited.quotations && (
        <KeepAliveSlot
          isActive={currentPath.startsWith('/quotations')}
          Component={QuotationsFeature}
        />
      )}

      {visited.contracts && (
        <KeepAliveSlot
          isActive={currentPath.startsWith('/contracts')}
          Component={ContractsFeature}
        />
      )}

      {visited.payments && (
        <KeepAliveSlot
          isActive={currentPath.startsWith('/payments')}
          Component={PaymentsFeature}
        />
      )}

      {visited.deliveries && (
        <KeepAliveSlot
          isActive={currentPath.startsWith('/deliveries')}
          Component={DeliveriesFeature}
        />
      )}

      {visited.znsHub && (
        <KeepAliveSlot
          isActive={currentPath.startsWith('/zns-hub')}
          Component={ZnsHubFeature}
        />
      )}

      {visited.auditLogs && (
        <KeepAliveSlot
          isActive={currentPath.startsWith('/audit-logs')}
          Component={AuditLogsFeature}
        />
      )}

      {visited.settings && (
        <KeepAliveSlot
          isActive={currentPath.startsWith('/settings')}
          Component={SettingsFeature}
        />
      )}
    </div>
  );
}
