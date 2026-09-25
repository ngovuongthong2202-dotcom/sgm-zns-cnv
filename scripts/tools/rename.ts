import { readFileSync, writeFileSync } from 'fs';
const files = [
  'src/tests/components.snapshot.spec.tsx',
  'src/contexts/DrawerStackContext.tsx',
  'src/features/contracts/components/ContractDetailDrawer.tsx',
  'src/features/payments/components/form/PaymentRecordBasicFields.tsx',
  'src/features/payments/components/PaymentDetailDrawer.tsx',
  'src/widgets/product-list-input/ProductListSections.tsx',
  'src/widgets/QuotationSmartSearch.tsx',
  'src/App.tsx'
];
for (const file of files) {
  let content = readFileSync(file, 'utf8');
  content = content.replace(/features\/quotations/g, 'modules/sales/ui');
  writeFileSync(file, content);
}
