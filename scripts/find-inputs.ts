import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, callback: (path: string) => void) {
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) walk(file, callback);
    else callback(file);
  });
}

walk('./src', (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  const content = fs.readFileSync(filePath, 'utf8');
  
  const tagsRegex = /<(input|textarea|select)\s+([^>]*)\/?>/g;
  let m;
  while ((m = tagsRegex.exec(content)) !== null) {
      const tag = m[1];
      const attrs = m[2];
      // Exclude if it has id (since it might have a label htmlFor) OR aria-label OR title OR aria-labelledby
      if (!attrs.includes('aria-label') && !attrs.includes('aria-labelledby') && !attrs.includes('id=') && !attrs.includes('title=')) {
          // If it's a hidden input, it's fine
          if (attrs.includes('type="hidden"')) continue;

          console.log(`Missing label/aria-label in ${filePath}: <${tag} ${attrs.substring(0, 40)}...`);
      }
  }
});
