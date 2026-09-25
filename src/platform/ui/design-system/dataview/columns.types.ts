import { ReactNode } from 'react';

export type AggregateType = 'none' | 'count' | 'countDistinct' | 'sum' | 'avg' | 'min' | 'max' | 'custom';

export interface Column<T> {
  id?: string;
  header: ReactNode;
  accessor?: (row: T) => any;
  accessorKey?: keyof T;
  sortable?: boolean;
  filterable?: boolean;
  group?: boolean;
  defaultAggregate?: AggregateType;
  format?: (value: any) => ReactNode; 
  cell?: (props: { row: T; value: any }) => ReactNode; 
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sticky?: 'left' | 'right';
}
