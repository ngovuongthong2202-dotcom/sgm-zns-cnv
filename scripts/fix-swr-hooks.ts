import fs from 'fs';

const hooks = [
  'src/features/contracts/hooks/useContracts.ts',
  'src/features/customers/hooks/useCustomers.ts',
  'src/features/deliveries/hooks/useDeliveries.ts',
  'src/features/payments/hooks/usePayments.ts',
  'src/features/quotations/hooks/useQuotations.ts',
];

for (const hook of hooks) {
  let content = fs.readFileSync(hook, 'utf-8');
  content = content.replace(/import useSWR from 'swr';\n/g, '');
  content = content.replace(/import \{ swrColFetcher \} from '@\/src\/shared\/utils\/swr-fetchers';\n/g, '');
  
  content = content.replace(/const \{ data: (.*?), isLoading: (.*?) \} = useSWR(?:<[^>]+>)?\('.*?', swrColFetcher\);\n/g, '');
  content = content.replace(/const globalLoading\s*=\s*[^;]+;/g, 'const globalLoading = false;');
  
  content = content.replace(/const ([a-zA-Z0-9]+)\s*=\s*([a-zA-Z0-9]+Data)\s*\|\|\s*\[\];/g, 'const $1: any[] = [];');

  fs.writeFileSync(hook, content);
}
