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
  
  const buttonRegex = /<(button)([^>]*)>(.*?)<\/button>/gs;
  const newContent = content.replace(buttonRegex, (match, tag, attrs, inner) => {
      if (attrs.includes('aria-label=') || attrs.includes('title=')) return match;
      
      const textOnly = inner.replace(/<[^>]*>/g, '').trim();
      // Also ignore if textOnly has some expressions like {variable}
      if (textOnly.length === 0 || /^\{\s*\}$/.test(textOnly)) {
          console.log(`Setting aria-label on empty button in ${filePath}`);
          changed = true;
          return `<button aria-label="Hành động"${attrs}>${inner}</button>`;
      }
      return match;
  });

  if (changed) {
     fs.writeFileSync(filePath, newContent);
  }
});
