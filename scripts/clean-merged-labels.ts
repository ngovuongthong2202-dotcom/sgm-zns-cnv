import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, callback: (fp: string) => void) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== 'node_modules' && f !== 'dist' && f !== '.next' && f !== '.git') {
        walk(p, callback);
      }
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      callback(p);
    }
  });
}

function cleanFile(filepath: string) {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;
  
  let i = 0;
  let result = '';
  while (i < content.length) {
    if (content.substring(i, i + 7).toLowerCase() === '<button' || content.substring(i, i + 7) === '<Button') {
      let tagStart = i;
      let inQuote: string | null = null;
      let braceCount = 0;
      let tagEnd = -1;
      for (let j = i; j < content.length; j++) {
        let char = content[j];
        if (inQuote) {
          if (char === inQuote) {
            inQuote = null;
          }
        } else if (char === '"' || char === "'") {
          inQuote = char;
        } else if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        } else if (char === '>' && braceCount === 0) {
          tagEnd = j;
          break;
        }
      }
      
      if (tagEnd !== -1) {
        let tagContent = content.substring(tagStart, tagEnd + 1);
        const labelRegex = /aria-label\s*=\s*(?:"[^"]*"|'[^']*'|\{[^}]*\})/g;
        let matches = tagContent.match(labelRegex);
        if (matches && matches.length > 1) {
          const generics = ["Hành động", "Đóng modal", "Thiết lập bộ lọc", "Thêm mới", "Xóa", "Cài đặt"];
          let specificLabel = '';
          let genericLabel = '';
          for (let m of matches) {
            let isGeneric = generics.some(g => m.includes(`"${g}"`) || m.includes(`'${g}'`));
            if (isGeneric) {
              genericLabel = m;
            } else {
              specificLabel = m;
            }
          }
          
          if (genericLabel && specificLabel) {
            let newTagContent = tagContent.replace(genericLabel, '');
            result += newTagContent;
            i = tagEnd + 1;
            continue;
          } else {
            let newTagContent = tagContent;
            for (let k = 1; k < matches.length; k++) {
              newTagContent = newTagContent.replace(matches[k], '');
            }
            result += newTagContent;
            i = tagEnd + 1;
            continue;
          }
        }
      }
    }
    result += content[i];
    i++;
  }
  
  if (result !== original) {
    fs.writeFileSync(filepath, result, 'utf8');
    console.log(`[CLEANED ARIA-LABELS] ${filepath}`);
  }
}

walk('src', cleanFile);
