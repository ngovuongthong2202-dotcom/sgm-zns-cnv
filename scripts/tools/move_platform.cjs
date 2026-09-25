const fs = require('fs');
const path = require('path');

function moveFolderAndReexport(srcFolder, destFolder) {
  if (!fs.existsSync(srcFolder)) return;
  
  fs.renameSync(srcFolder, destFolder);
  
  function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
         results = results.concat(walk(fullPath));
      } else {
         if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
           results.push(fullPath);
         }
      }
    });
    return results;
  }
  
  const files = walk(destFolder);
  files.forEach(f => {
    const relToDest = path.relative(destFolder, f);
    const origPath = path.join(srcFolder, relToDest);
    
    fs.mkdirSync(path.dirname(origPath), { recursive: true });
    
    const ext = path.extname(f);
    const noExt = f.slice(0, -ext.length).replace(/\\/g, '/');
    let stubCode = `export * from '@/${noExt}';\n`;
    
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('export default')) {
       stubCode += `export { default } from '@/${noExt}';\n`;
    }
    
    fs.writeFileSync(origPath, stubCode, 'utf8');
  });
}

fs.mkdirSync('src/platform/data', { recursive: true });
fs.mkdirSync('src/platform/ui', { recursive: true });

if (fs.existsSync('src/data/firestore/mapper.ts')) {
   fs.renameSync('src/data/firestore/mapper.ts', 'src/platform/data/mapper.ts');
   fs.writeFileSync('src/data/firestore/mapper.ts', "export * from '@/src/platform/data/mapper';\n");
}
if (fs.existsSync('src/data/repositories/base.repo.ts')) {
   fs.renameSync('src/data/repositories/base.repo.ts', 'src/platform/data/base.repo.ts');
   fs.writeFileSync('src/data/repositories/base.repo.ts', "export * from '@/src/platform/data/base.repo';\n");
}

moveFolderAndReexport('src/design-system', 'src/platform/ui/design-system');
moveFolderAndReexport('src/widgets', 'src/platform/ui/widgets');

console.log("Migration complete.");
