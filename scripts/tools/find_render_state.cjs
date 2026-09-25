const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    let list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        if (file.includes('node_modules')) return;
        let stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
files.forEach(file => {
   const content = fs.readFileSync(file, 'utf8');
   
   let stateSetters = [];
   const useStateRegex = /\[\s*[a-zA-Z0-9_]+\s*,\s*([a-zA-Z0-9_]+)\s*\]\s*=\s*(?:React\.)?useState/g;
   let match;
   while ((match = useStateRegex.exec(content)) !== null) {
       stateSetters.push(match[1]);
   }
   
   if (stateSetters.length === 0) return;
   
   const lines = content.split('\n');
   lines.forEach((line, index) => {
       stateSetters.forEach(setter => {
           if (line.includes(setter + '(')) {
               // We flag it if we don't see typical function signatures, or just log all of it and I can grep it.
               console.log(`${file}:${index+1} => ${line.trim()}`);
           }
       });
   });
});
