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
  
  // Find generic elements with aria-label but no valid role
  const tagsRegex = /<(div|span|p|ul|li|ol|tr|td|table)([^>]*)aria-label=([^>]*)>/g;
  let m;
  while ((m = tagsRegex.exec(content)) !== null) {
      const attrs = m[2] + " aria-label=" + m[3];
      // If it doesn't have role="..." we should flag it
      if (!attrs.includes('role=')) {
          console.log(`Generic element with aria-label: <${m[1]} ${attrs.substring(0, 40)}... in ${filePath}`);
      } else {
          // If role is generic, none, presentation, it also shouldn't have aria-label
          if (attrs.includes('role="presentation"') || attrs.includes('role="none"') || attrs.includes('role="generic"')) {
              console.log(`Generic element with aria-label & invalid role: <${m[1]} ${attrs.substring(0, 40)}... in ${filePath}`);
          }
      }
  }
});
