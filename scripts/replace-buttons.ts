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

const importButtonStr = "import { Button } from '@/src/design-system/Button';\n";

walk('./src/features', (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  const content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  if (content.includes('<button') || content.includes('</button>')) {
    let newContent = content.replace(/<button/g, '<Button').replace(/<\/button>/g, '</Button>');
    
    // Add import if not present
    if (!newContent.includes("import { Button }")) {
      // find last import or start of file
      const importMatches = Array.from(newContent.matchAll(/^import\s+.*?(?:\r?\n.*?)*?(?:from\s+['"].*?['"]|['"].*?['"]);?$/gm));
      let lastIndex = 0;
      if (importMatches.length > 0) {
          const lastMatch = importMatches[importMatches.length - 1];
          lastIndex = lastMatch.index! + lastMatch[0].length + 1; // plus newline
      }
      
      if (lastIndex === 0) {
        newContent = importButtonStr + newContent;
      } else {
        newContent = newContent.slice(0, lastIndex) + "\n" + importButtonStr + newContent.slice(lastIndex);
      }
    }
    fs.writeFileSync(filePath, newContent);
    console.log(`Replaced in ${filePath}`);
  }
});
