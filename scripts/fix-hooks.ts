import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (path: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      callback(fullPath);
    }
  }
}

walkDir('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  if (filePath.endsWith('useSharedFields.ts') && !content.includes('import { useFirestoreData }')) {
    content = content.replace(/import \{ useCollection \} from '.\/useCollection';/, "import { useFirestoreData } from './useFirestoreData';");
    changed = true;
  }

  if (content.includes('useCollectionPaginated')) {
    content = content.replace(/useCollectionPaginated<([^>]+)>\(([^,)]+)[^)]*\)/g, "useFirestoreData<$1>($2, { mode: 'paginated' })");
    content = content.replace(/useCollectionPaginated\(([^,)]+)[^)]*\)/g, "useFirestoreData($1, { mode: 'paginated' })");
    changed = true;
  }

  let temp = content.replace(/useFirestoreData(?:<([^>]+)>)?\(\s*(['"][^'"]+['"])\s*\)/g, (match, typeArg, coll) => {
      const typeStr = typeArg ? `<${typeArg}>` : '';
      return `useFirestoreData${typeStr}(${coll}, { mode: 'paginated' })`;
  });
  if (temp !== content) {
    content = temp;
    changed = true;
  }

  // Also fix useCollection<T>('name') without arguments
  temp = content.replace(/useCollection(?:<([^>]+)>)?\(\s*(['"][^'"]+['"])\s*\)/g, (match, typeArg, coll) => {
      const typeStr = typeArg ? `<${typeArg}>` : '';
      return `useFirestoreData${typeStr}(${coll}, { mode: 'paginated' })`;
  });
  if (temp !== content) {
    content = temp;
    changed = true;
  }

  if (changed) {
    if (!content.includes('import { useFirestoreData }') && !filePath.includes('useFirestoreData')) {
       let relativePath = path.relative(path.dirname(filePath), 'src/hooks/useFirestoreData').replace(/\\/g, '/');
       if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
       content = `import { useFirestoreData } from '${relativePath}';\n` + content;
    }
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});
