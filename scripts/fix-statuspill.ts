import fs from 'fs';
import path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (content.includes('@/src/design-system/StatusPill')) {
    content = content.replace(/@\/src\/design-system\/StatusPill/g, '@/src/widgets/StatusPill');
    changed = true;
  }
  if (content.includes('@/src/design-system/dataview/cells/ZnsStatusCell')) {
    content = content.replace(/@\/src\/design-system\/dataview\/cells\/ZnsStatusCell/g, '@/src/widgets/ZnsStatusCell');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
});
