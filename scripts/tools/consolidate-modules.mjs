import fs from 'fs';
import path from 'path';

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const moduleMappings = [
  { featureDir: 'src/features/contracts', moduleUiDir: 'src/modules/contracts/ui' },
  { featureDir: 'src/features/quotations', moduleUiDir: 'src/modules/sales/ui' },
  { featureDir: 'src/features/payments', moduleUiDir: 'src/modules/billing/ui' },
  { featureDir: 'src/features/deliveries', moduleUiDir: 'src/modules/fulfillment/ui' },
];

for (const { featureDir, moduleUiDir } of moduleMappings) {
  console.log(`Copying ${featureDir} -> ${moduleUiDir}...`);
  copyRecursiveSync(path.resolve(featureDir), path.resolve(moduleUiDir));
}

console.log('Modules consolidated successfully.');
