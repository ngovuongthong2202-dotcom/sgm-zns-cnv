import useSWR from 'swr';
import { swrDocFetcher } from '@/src/data/swr-fetchers';
import { getEntityDisplayLabel, LABEL_FALLBACK } from '@/src/domain/mapping/entity-label';

export function useEntityReference(
  entityType: string, 
  entityId: string | undefined | null, 
  snapshotData?: Record<string, unknown> | null
) {
  const collectionName = entityType === 'delivery' ? 'deliveries' : 
                         entityType.endsWith('s') ? entityType : `${entityType}s`;

  // Avoid network read when snapshotData already provides valid entity attributes
  const existingLabel = (snapshotData && typeof snapshotData === 'object' && Object.keys(snapshotData).length > 0)
    ? getEntityDisplayLabel(entityType, snapshotData)
    : LABEL_FALLBACK;

  const hasSnapshot = existingLabel !== LABEL_FALLBACK;

  const shouldFetch = Boolean(
    entityId && 
    !hasSnapshot && 
    entityId !== 'system' && 
    entityId !== 'undefined' && 
    entityId !== 'null' &&
    entityId.trim().length > 0
  );

  const { data, isLoading } = useSWR<Record<string, unknown> | null>(
    shouldFetch ? `${collectionName}:${entityId}` : null,
    swrDocFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const displayData = data || snapshotData || null;

  return {
    label: hasSnapshot ? existingLabel : getEntityDisplayLabel(entityType, displayData),
    isLoading: isLoading && shouldFetch,
    entity: data || snapshotData || null
  };
}
