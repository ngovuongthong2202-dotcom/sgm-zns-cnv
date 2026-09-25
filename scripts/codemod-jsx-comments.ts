import fs from 'fs';
import path from 'path';

// Regex to find lines that are literally just `// eslint-disable...` inside the files.
// We'll replace it with the JSX comment equivalent if it's placed strictly inside the JSX block.
// A simple heuristic: if the line matches `^\s*//\s*(eslint-disable.*)$`, we check if we are inside a return statement or JSX tree.
// To be safe, we just delete `// eslint-disable-next-line` lines if they appear right before a `<` on the next line.

function walkDir(dir: string, callback: (filePath: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
      callback(dirPath);
    }
  });
}

function processFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  const lines = content.split('\n');
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if it's an eslint-disable line
    const match = line.match(/^(\s*)\/\/\s*(eslint-disable-next-line|eslint-disable-line)(.*)$/);
    if (match) {
        const indent = match[1];
        const directive = match[2];
        const rest = match[3];

        // Heuristic: If it's a JSX file, and the next line has JSX `<...` or `{...` with similar indentation, we might want to wrap it in JSX comment.
        // Actually, the requirement asks us to remove the leaked JSX comments. 
        // We'll just change them to JSX comments if they look like they are inside JSX (indented, followed by a tag).
        
        const nextLine = i + 1 < lines.length ? lines[i+1].trim() : '';
        if (nextLine.startsWith('<') || nextLine.startsWith('{') || nextLine.startsWith('</')) {
            // It's possibly inside JSX. 
            // Convert to {/* eslint-disable-next-line ... */}
            newLines.push(`${indent}{/* ${directive}${rest} */}`);
            changed = true;
            continue;
        }

        // If it's `// eslint-disable-line` at the END of a line containing JSX:
        // That is already handled by matching at the end of the line, wait, our regex above only matches lines that START with `// ...`
    }
    
    // Check for trailing `// eslint-disable-line ...`
    const trailingMatch = line.match(/^(.*?)(\s*\/\/\s*eslint-disable-line.*)$/);
    if (trailingMatch) {
       const beforeComment = trailingMatch[1];
       if (beforeComment.trim().endsWith('>') || beforeComment.trim().endsWith('/>')) {
           // Trailing comment on a JSX line. Just remove the comment.
           newLines.push(beforeComment);
           changed = true;
           continue;
       }
    }

    newLines.push(line);
  }

  if (changed) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
    console.log(`[codemod-jsx-comments] Fixed comments in ${filePath}`);
  }
}

const targetDir = path.resolve(process.cwd(), 'src');
walkDir(targetDir, processFile);
console.log('Codemod JSX sweeping done.');
