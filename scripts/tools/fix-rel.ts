import fs from 'fs';

const files = [
  'src/modules/contracts/ui/components/ContractDetailDrawer.tsx',
  'src/modules/contracts/ui/components/ContractFormModal.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/@\/src\/modules\/contracts\/domain\/ContractPolicy/g, '../../domain/ContractPolicy');
  fs.writeFileSync(file, content);
}

let pageContent = fs.readFileSync('src/modules/contracts/ui/page.tsx', 'utf8');
pageContent = pageContent.replace(/@\/src\/modules\/contracts\/domain\/ContractPolicy/g, '../domain/ContractPolicy');
fs.writeFileSync('src/modules/contracts/ui/page.tsx', pageContent);
