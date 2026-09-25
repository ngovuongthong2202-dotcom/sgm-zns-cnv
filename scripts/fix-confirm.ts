import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (path: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath, callback);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      callback(fullPath);
    }
  }
}

walkDir('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  if (content.includes('useConfirm')) {
    // 1. Update import
// eslint-disable-next-line no-useless-escape
    if (content.match(/from ['"][\.\/]+hooks\/useConfirm(?:\.tsx)?['"]/)) {
// eslint-disable-next-line no-useless-escape
      content = content.replace(/from ['"][\.\/]+hooks\/useConfirm(?:\.tsx)?['"]/, "from '@/src/design-system/Confirm'");
      changed = true;
    }
    
    // 2. Remove ConfirmationModal from destructuring & JSX
    if (content.includes('ConfirmationModal')) {
      content = content.replace(/,\s*ConfirmationModal\s*/g, '');
      content = content.replace(/<\s*ConfirmationModal\s*\/>\s*/g, '');
      changed = true;
    }
    
    // 3. Update confirm() calls
    const confirmRegex = /confirm\(\s*([^,]+)(?:,\s*([^,]+))?(?:,\s*([^,]+))?(?:,\s*([^,]+))?(?:,\s*([^)]+))?\s*\)/g;
    const temp = content.replace(confirmRegex, (match, p1, p2, p3, p4, p5) => {
      // If it's already an object (starts with {), skip it,
      if (p1.trim().startsWith('{')) return match;
      
      let res = `confirm({ title: ${p1}`;
      if (p2) res += `, message: ${p2}`;
      if (p3) res += `, variant: ${p3}`;
      if (p4) res += `, confirmText: ${p4}`;
      if (p5) res += `, cancelText: ${p5}`;
      res += ` })`;
      return res;
    });

    if (temp !== content) {
      content = temp;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
});
