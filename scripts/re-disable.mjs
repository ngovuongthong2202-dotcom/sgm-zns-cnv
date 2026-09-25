import fs from 'fs';
import { execSync } from 'child_process';

try {
  execSync('npx eslint . --format json > eslint-report.json');
} catch (e) {
}

const report = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));

for (const fileReport of report) {
  if (fileReport.errorCount === 0) continue;
  const filePath = fileReport.filePath;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  
  const messages = fileReport.messages.sort((a, b) => b.line - a.line);
  
  const linesToDisable = new Set();
  
  for (const msg of messages) {
      if (msg.ruleId === '@typescript-eslint/no-explicit-any') {
        linesToDisable.add(msg.line - 1);
      }
  }
  
  const linesToDisableSorted = Array.from(linesToDisable).sort((a, b) => b - a);
  for (const lineIdx of linesToDisableSorted) {
      const prevLine = lines[lineIdx - 1] || '';
      if (!prevLine.includes('eslint-disable-next-line')) {
         const indentation = lines[lineIdx].match(/^\s*/)[0];
         lines.splice(lineIdx, 0, indentation + '// eslint-disable-next-line @typescript-eslint/no-explicit-any');
      }
  }
  
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}
console.log('Restored eslint-disable comments for explicit any.');
