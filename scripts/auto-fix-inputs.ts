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
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // A regex to match <input, <select, <textarea safely.
  // It matches the tag start, until the first > or />
  const tagsRegex = /<(input|textarea|select)(\s+[^>]*?)(\/?)>/g;
  
  content = content.replace(tagsRegex, (match, tag, attrs, closing) => {
      if (!attrs.includes('aria-label=') && !attrs.includes('aria-labelledby=') && !attrs.includes('id=') && !attrs.includes('title=')) {
          if (attrs.includes('type="hidden"')) return match;
          changed = true;
          return `<${tag} aria-label="Nhập thông tin"${attrs}${closing}>`;
      }
      return match;
  });

  if (changed) {
     fs.writeFileSync(filePath, content);
     console.log(`Updated ${filePath}`);
  }
});
