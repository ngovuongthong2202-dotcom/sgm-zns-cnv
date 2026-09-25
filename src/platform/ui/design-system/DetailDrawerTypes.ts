import React from 'react';

export interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityId?: string;
  entityType?: string;
  icon?: React.ReactNode;
  title: string;
  subTitle?: React.ReactNode;
  statusPill?: React.ReactNode;
  topRightControls?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'screen';
  isDirty?: boolean;
  updatedBy?: string;
  updatedAt?: string;
  
  children?: React.ReactNode;
  footer?: React.ReactNode;
  tabs?: React.ReactNode;

  overviewPanel?: React.ReactNode;
  activityPanel?: React.ReactNode;
  linksPanel?: React.ReactNode;
  znsHistoryPanel?: React.ReactNode;
  auditLogPanel?: React.ReactNode;
  attachmentsPanel?: React.ReactNode;

  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;

  onSave?: () => Promise<void>;
  onSendZns?: () => void;
  onPrint?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  modal?: boolean;
  className?: string;
}
