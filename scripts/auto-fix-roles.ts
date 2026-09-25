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
  let changed = false;
  
  const divRegex = /<([a-zA-Z0-9]+)([^>]*role=["'](?:button|link|menuitem|tab)["'][^>]*)>(.*?)<\/\1>/gs;
  const newContent = content.replace(divRegex, (match, tag, attrs, inner) => {
      if (attrs.includes('aria-label=') || attrs.includes('title=')) return match;
      
      const textOnly = inner.replace(/<[^>]*>/g, '').trim();
      if (textOnly.length === 0 || /^\{\s*\}$/.test(textOnly)) {
          console.log(`Setting aria-label on empty role=${tag} in ${filePath}`);
          changed = true;
          return `<${tag} aria-label="Hành động"${attrs}>${inner}</${tag}>`;
      }
      return match;
  });

  if (changed) {
     fs.writeFileSync(filePath, newContent);
  }
});
