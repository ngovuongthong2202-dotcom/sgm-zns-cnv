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
  
  // Find all buttons, even if spread over lines
  const btnRegex = /<button([\s\S]*?)>([\s\S]*?)<\/button>/g;
  const c1 = content.replace(btnRegex, (match, attrs, inner) => {
      if (attrs.includes('aria-label=') || attrs.includes('title=')) return match;
      const t = inner.replace(/<[^>]*>/g, '').trim();
      if (t === '' || /^\{\s*\}$/.test(t)) {
          changed = true;
          return `<button aria-label="Hành động"${attrs}>${inner}</button>`;
      }
      return match;
  });

  const linkRegex = /<Link([\s\S]*?)>([\s\S]*?)<\/Link>/g;
  const c2 = c1.replace(linkRegex, (match, attrs, inner) => {
      if (attrs.includes('aria-label=') || attrs.includes('title=')) return match;
      const t = inner.replace(/<[^>]*>/g, '').trim();
      if (t === '' || /^\{\s*\}$/.test(t)) {
          changed = true;
          return `<Link aria-label="Đường dẫn"${attrs}>${inner}</Link>`;
      }
      return match;
  });

  if (changed) {
     fs.writeFileSync(filePath, c2);
     console.log(`Updated ${filePath}`);
  }
});
