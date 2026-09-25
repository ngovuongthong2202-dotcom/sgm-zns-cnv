const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (!['node_modules', '.git', 'dist'].includes(f)) walk(dirPath, callback);
    } else {
      if (f.endsWith('.tsx') || f.endsWith('.ts')) callback(dirPath);
    }
  });
}

walk('./src', function(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Simple heuristic: if we see setFunction( value ) not indented enough or not enclosed by certain keywords...
  // Actually, let's just log files to see if something stands out.
  // Many state updaters are called `setIsSomething(true)` etc.
});
