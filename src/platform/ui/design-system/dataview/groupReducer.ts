export interface GroupedData<T> {
  key: string | null;
  items: T[];
  subGroups?: GroupedData<T>[];
  aggregates?: any;
}

export function groupData<T>(
  data: T[],
  groupKeys: string[],
  extractors: Record<string, (item: T) => any>
): GroupedData<T>[] {
  if (!groupKeys.length || !data.length) {
    return [{ key: 'root', items: data }];
  }

  const [currentKey, ...remainingKeys] = groupKeys;
  const extractor = extractors[currentKey] || ((item: any) => item[currentKey]); 

  const groupsMap = new Map<string | null, T[]>();

  data.forEach((item) => {
    let val = extractor(item as any as any);
    // Normalize missing values to null
    if (val === undefined || val === '') {
      val = null;
    }
    
    // Group keys must be strings or null
    const mapKey = val === null ? null : String(val);

    if (!groupsMap.has(mapKey)) {
      groupsMap.set(mapKey, []);
    }
    groupsMap.get(mapKey)!.push(item);
  });

  const result: GroupedData<T>[] = [];
  groupsMap.forEach((items, key) => {
    const group: GroupedData<T> = { key, items };
    if (remainingKeys.length > 0) {
      group.subGroups = groupData(items, remainingKeys, extractors);
    }
    result.push(group);
  });

  return result;
}
