import fs from 'fs';
import path from 'path';

const dsDir = path.resolve('src/design-system');
const platformDsDir = path.resolve('src/platform/ui/design-system');

if (!fs.existsSync(dsDir)) {
  fs.mkdirSync(dsDir, { recursive: true });
}

function processDirectory(sourceDir, targetDir, relativePrefix) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.includes('.stories.') || entry.name.includes('.spec.')) continue;

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'charts') continue; // charts isn't imported via proxy
      processDirectory(sourcePath, targetPath, `${relativePrefix}/${entry.name}`);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      const baseName = entry.name.replace(/\.tsx?$/, '');
      const importPath = `@/src/platform/ui/design-system${relativePrefix ? '/' + relativePrefix : ''}/${baseName}`;
      const content = `export * from '${importPath}';\n`;
      fs.writeFileSync(targetPath, content, 'utf8');
    }
  }
}

processDirectory(platformDsDir, dsDir, '');
console.log('Design system bridge generated successfully.');
