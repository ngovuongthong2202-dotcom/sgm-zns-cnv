export type AggregateFn = (values: any[]) => any;

export const aggregates: Record<string, AggregateFn> = {
  count: (values) => values.length,
  countDistinct: (values) => {
    const set = new Set(values.filter(v => v !== null && v !== undefined));
    return set.size;
  },
  sum: (values) => {
    return values.reduce((acc: number, val: any) => {
      if (typeof val === 'number') return acc + val;
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return !isNaN(parsed) ? acc + parsed : acc;
      }
      return acc;
    }, 0);
  },
  avg: (values) => {
    const validValues = values.filter(v => {
        if (typeof v === 'number') return true;
        if (typeof v === 'string') return !isNaN(parseFloat(v));
        return false;
    });
    if (validValues.length === 0) return 0;
    
    const sum = validValues.reduce((acc: number, val: any) => {
      if (typeof val === 'number') return acc + val;
      if (typeof val === 'string') return acc + parseFloat(val);
      return acc;
    }, 0);
    return sum / validValues.length;
  },
  min: (values) => {
    const validValues = values.filter((v): v is number | string => typeof v === 'number' || typeof v === 'string');
    if (validValues.length === 0) return null;
    return Math.min(...validValues.map(v => Number(v)));
  },
  max: (values) => {
    const validValues = values.filter((v): v is number | string => typeof v === 'number' || typeof v === 'string');
    if (validValues.length === 0) return null;
    return Math.max(...validValues.map(v => Number(v)));
  }
};
