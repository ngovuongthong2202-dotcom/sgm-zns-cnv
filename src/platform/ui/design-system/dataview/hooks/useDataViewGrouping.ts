import { useState } from 'react';
import { GroupingState, ExpandedState } from '@tanstack/react-table';

export function useDataViewGrouping(
  initialGrouping?: GroupingState,
  getSaved?: <S>(key: string, defaultVal: S) => S
) {
  const [grouping, setGrouping] = useState<GroupingState>(() =>
    getSaved ? getSaved<GroupingState>('grouping', initialGrouping || []) : initialGrouping || []
  );
  const [expanded, setExpanded] = useState<ExpandedState>({});

  return { grouping, setGrouping, expanded, setExpanded };
}
