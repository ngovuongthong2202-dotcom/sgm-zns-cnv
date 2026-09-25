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
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  const content = fs.readFileSync(filePath, 'utf8');

  // parse <Button ...>...</Button>
  const buttonRegex = /<Button\b[^>]*>(.*?)<\/Button>/gs;
  let m;
  while ((m = buttonRegex.exec(content)) !== null) {
     const tag = m[0];
     const inner = m[1];
     if (!tag.includes('aria-label') && !tag.includes('title=')) {
        const withoutTags = inner.replace(/<[^>]+>/g, '').trim();
        if (withoutTags.length === 0) {
            console.log(`[native] Missing aria-label at ${filePath} => ${tag.replace(/\n/g, ' ').substring(0, 80)}`);
        }
     }
  }
});


