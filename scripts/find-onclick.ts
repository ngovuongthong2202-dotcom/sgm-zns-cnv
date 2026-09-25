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
  
  const tagsRegex = /<([a-zA-Z0-9]+)\s+([^>]*\bonClick\s*=[^>]*)>/g;
  let m;
  while ((m = tagsRegex.exec(content)) !== null) {
      const tag = m[1];
      const attrs = m[2];
      if (['div', 'span', 'p', 'tr', 'td', 'li', 'ul', 'ol', 'a', 'b', 'i'].includes(tag.toLowerCase())) {
          if (!attrs.includes('role=') && !attrs.includes('tabIndex=')) {
               console.log(`Missing role in ${filePath}: <${tag} ${attrs.substring(0, 40)}...`);
          }
      }
  }
});
