import fs from 'fs';
import path from 'path';

const files = [
  'src/features/quotations/components/QuotationDetailOverview.tsx',
  'src/features/quotations/components/QuotationFormModal.tsx',
  'src/features/quotations/components/QuotationFormSections.tsx',
  'src/modules/sales/ui/components/QuotationDetailOverview.tsx',
  'src/modules/sales/ui/components/QuotationFormModal.tsx',
  'src/modules/sales/ui/components/QuotationFormSections.tsx',
  'src/tests/components.snapshot.spec.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/@\/src\/modules\/customers\/ui\/components\/CustomerHoverCard/g, '@/src/modules/customers');
    content = content.replace(/@\/src\/modules\/customers\/ui\/components\/CustomerFormModal/g, '@/src/modules/customers');
    fs.writeFileSync(file, content);
  }
}
