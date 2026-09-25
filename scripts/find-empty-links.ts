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
  
  const tagsRegex = /<(a|Link)(\s+[^>]*?)(\/?)>/g;
  let m;
  while ((m = tagsRegex.exec(content)) !== null) {
      const tag = m[1];
      const attrs = m[2];
      const closing = m[3];
      
      // We check if it has inner text. It's too complex to parse cleanly.
      // Let's just find empty tags like <a ... /> or <Link ... />
      if (closing === '/' && !attrs.includes('aria-label') && !attrs.includes('title=')) {
          console.log(`Self-closing link in ${filePath}: ${m[0]}`);
      }
      
      // Let's see if the tag has any text Content before </a>
      // A quick dumb regex to fetch the content inside the tag
      const index = m.index;
      // find closing tag
      const closeTagRegex = new RegExp(`<\/${tag}>`, 'g');
      closeTagRegex.lastIndex = index;
      const matchClose = closeTagRegex.exec(content);
      if (matchClose) {
          const innerTagContent = content.substring(index + m[0].length, matchClose.index);
          const textOnly = innerTagContent.replace(/<[^>]+>/g, '').trim();
          if (textOnly === '' && !attrs.includes('aria-label') && !attrs.includes('title=')) {
               console.log(`Empty link in ${filePath}: <${tag} ${attrs.substring(0,20)}...`);
          }
      }
  }
});
