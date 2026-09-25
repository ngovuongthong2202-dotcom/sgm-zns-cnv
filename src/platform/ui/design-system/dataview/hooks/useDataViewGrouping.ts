import { useState } from 'react';
import { GroupingState, ExpandedState } from '@tanstack/react-table';

export function useDataViewGrouping(
  initialGrouping?: GroupingState,
  _getSaved?: <S>(key: string, defaultVal: S) => S
) {
  // Luôn mặc định: Không gộp nhóm
  const [grouping, setGrouping] = useState<GroupingState>(() => initialGrouping || []);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  return { grouping, setGrouping, expanded, setExpanded };
}
