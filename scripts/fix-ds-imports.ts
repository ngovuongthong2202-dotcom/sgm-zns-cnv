import fs from 'fs';
import path from 'path';

function fix(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fix(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('../design-system/Button')) {
        content = content.replace(/\.\.\/design-system\/Button/g, './Button');
        fs.writeFileSync(fullPath, content);
      }
      if (content.includes('../design-system/InlineEntityLabel')) {
        content = content.replace(/\.\.\/design-system\/InlineEntityLabel/g, './InlineEntityLabel');
        fs.writeFileSync(fullPath, content);
      }
      if (content.includes('../design-system/primitives/AsyncSearchableSelect')) {
        content = content.replace(/\.\.\/design-system\/primitives\/AsyncSearchableSelect/g, './AsyncSearchableSelect');
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}
fix('./src/design-system');
