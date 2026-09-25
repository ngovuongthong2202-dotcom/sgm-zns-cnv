import fs from 'fs';
import path from 'path';

const REPLACEMENTS = [
  { from: /\.\.\/\.\.\/shared\/utils\/gate\.policy/g, to: '../../domain/policy/gate.policy' },
  { from: /\.\.\/\.\.\/shared\/utils\/lock\.policy/g, to: '../../domain/policy/lock.policy' },
  { from: /\.\.\/\.\.\/shared\/utils\/zod-field-extractor/g, to: '../../domain/mapping/zod-field-extractor' },
  { from: /\.\.\/utils\/quotation-pricing/g, to: '@/src/domain/pricing/quotation-pricing' },
  { from: /\.\.\/utils\/healthScore/g, to: '@/src/domain/health/healthScore' },
  { from: /@\/src\/components\/common\/ProductListInput/g, to: '@/src/widgets/ProductListInput' },
  { from: /@\/src\/design-system\/EntityLinks/g, to: '@/src/widgets/EntityLinks' },
  { from: /@\/src\/design-system\/EntityAuditLogs/g, to: '@/src/widgets/EntityAuditLogs' },
  { from: /@\/src\/design-system\/EntityZnsHistory/g, to: '@/src/widgets/EntityZnsHistory' },
  { from: /@\/src\/design-system\/EntityLockWarning/g, to: '@/src/widgets/EntityLockWarning' },
  { from: /@\/src\/design-system\/EntityBusinessLockWarning/g, to: '@/src/widgets/EntityBusinessLockWarning' },
  { from: /@\/src\/components\/common\/QuotationSmartSearch/g, to: '@/src/widgets/QuotationSmartSearch' },
  { from: /@\/src\/components\/common\/DrawerProductList/g, to: '@/src/widgets/DrawerProductList' },
  { from: /@\/src\/components\/common\/HoverCardProductsTab/g, to: '@/src/widgets/HoverCardProductsTab' },
  { from: /@\/src\/components\/common\/SearchableSelect/g, to: '@/src/design-system/primitives/SearchableSelect' },
  { from: /@\/src\/components\/common\/AsyncSearchableSelect/g, to: '@/src/design-system/primitives/AsyncSearchableSelect' },
  { from: /\.\.\/\.\.\/components\/common\/ProductListInput/g, to: '../../widgets/ProductListInput' },
  { from: /\.\.\/\.\.\/design-system\/EntityLinks/g, to: '../../widgets/EntityLinks' },
  { from: /\.\.\/\.\.\/design-system\/EntityAuditLogs/g, to: '../../widgets/EntityAuditLogs' },
  { from: /\.\.\/\.\.\/design-system\/EntityZnsHistory/g, to: '../../widgets/EntityZnsHistory' },
  { from: /\.\.\/\.\.\/design-system\/EntityLockWarning/g, to: '../../widgets/EntityLockWarning' },
  { from: /\.\.\/\.\.\/design-system\/EntityBusinessLockWarning/g, to: '../../widgets/EntityBusinessLockWarning' },
  { from: /\.\.\/\.\.\/components\/common/g, to: '../../widgets' },
  { from: /\.\.\/components\/common/g, to: '../widgets' },
  { from: /\/design-system\/Button/g, to: '/design-system/Button' },
  { from: /\.\/InlineEntityLabel/g, to: '../design-system/InlineEntityLabel' },
  { from: /\.\/AsyncSearchableSelect/g, to: '../design-system/primitives/AsyncSearchableSelect' },
  { from: /(\.\.\/)+shared\/config\/firebase\.client/g, to: '@/src/shared/config/firebase.client' },
  { from: /\.\.\/\.\.\/shared\/schema/g, to: '../../domain/schema' },
  { from: /@\/src\/shared\/schema/g, to: '@/src/domain/schema' },
  { from: /@\/src\/shared\/enums/g, to: '@/src/domain/enums' },
  { from: /@\/src\/shared\/utils\/gate\.policy/g, to: '@/src/domain/policy/gate.policy' },
  { from: /@\/src\/shared\/utils\/lock\.policy/g, to: '@/src/domain/policy/lock.policy' },
  { from: /@\/src\/shared\/utils\/auth\.policy/g, to: '@/src/domain/policy/auth.policy' },
  { from: /@\/src\/shared\/utils\/zod-field-extractor/g, to: '@/src/domain/mapping/zod-field-extractor' },
  { from: /@\/src\/shared\/utils\/zod-transforms/g, to: '@/src/domain/mapping/zod-transforms' },
  { from: /@\/src\/features\/quotations\/utils\/quotation-pricing/g, to: '@/src/domain/pricing/quotation-pricing' },
  { from: /@\/src\/features\/customers\/utils\/healthScore/g, to: '@/src/domain/health/healthScore' },
  { from: /\.\.\/\.\.\/\.\.\/features\/customers\/utils\/healthScore/g, to: '../../../domain/health/healthScore' },
  { from: /\.\.\/\.\.\/\.\.\/shared\/enums/g, to: '../../../domain/enums' },
  { from: /\.\.\/\.\.\/\.\.\/shared\/schema/g, to: '../../../domain/schema' },
];

function processDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        processDir(fullPath);
      }
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let changed = false;
      for (const r of REPLACEMENTS) {
        if (r.from.test(content)) {
          content = content.replace(r.from, r.to);
          changed = true;
        }
      }
      // Also catch relative imports ending with the file but maybe with fewer ../
      // Actually, `@/src/...` is standard in this project.
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir('./src');
processDir('./scripts');
processDir('./e2e');
console.log('Done!');
