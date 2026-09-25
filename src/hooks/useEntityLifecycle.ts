import { useState, useCallback } from 'react';
import { BlockingDocumentItem } from '@/src/domain/policy/lock.policy';

export interface BlockingModalState {
  isOpen: boolean;
  title?: string;
  entityName?: string;
  reason?: string;
  blockingDocuments?: string[];
  detailedBlocks?: BlockingDocumentItem[];
}

export function useEntityLifecycle() {
  const [blockingModalState, setBlockingModalState] = useState<BlockingModalState>({
    isOpen: false,
    title: 'Không thể xóa chứng từ',
    entityName: '',
    reason: '',
    blockingDocuments: [],
    detailedBlocks: []
  });

  const showBlockingModal = useCallback((opts: Omit<BlockingModalState, 'isOpen'>) => {
    setBlockingModalState({
      isOpen: true,
      title: opts.title || 'Không thể xóa chứng từ',
      entityName: opts.entityName || '',
      reason: opts.reason || '',
      blockingDocuments: opts.blockingDocuments || [],
      detailedBlocks: opts.detailedBlocks || []
    });
  }, []);

  const closeBlockingModal = useCallback(() => {
    setBlockingModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    blockingModalState,
    showBlockingModal,
    closeBlockingModal
  };
}
