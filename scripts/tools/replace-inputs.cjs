const fs = require('fs');
const path = require('path');

const walk = (dir, callback) => {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) walk(filePath, callback);
    else callback(filePath);
  });
};

const inputClassPattern = /w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-[0-9]+\/20 focus:border-blue-[0-9]+ transition-all focus:bg-white disabled:opacity-50 disabled:bg-slate-100/g;
const simpleInputPattern = /className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500\/20 focus:border-blue-500 transition-all focus:bg-white disabled:opacity-50 disabled:bg-slate-100"/g;
const h9Pattern = /className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-blue-[0-9]+\/15 focus:border-blue-[0-9]+ transition-all font-sans"/g;

let count = 0;
walk('./src', (filePath) => {
  if (!filePath.match(/\.tsx?$/)) return;
  if (filePath.includes('design-system')) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;

  // Let's just find <input className="..." /> and see if it can be replaced with <Input />.
  newContent = newContent.replace(/<input\s+([^>]*?)className="(w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-[0-9]+\/20 focus:border-blue-[0-9]+ transition-all focus:bg-white disabled:opacity-50 disabled:bg-slate-100)"/g, (match, before, cls) => {
    count++;
    return `<Input ${before}`;
  });

  if (content !== newContent) {
    if (!newContent.includes('import { Input }')) {
       newContent = "import { Input } from '@/src/design-system';\n" + newContent;
    }
    fs.writeFileSync(filePath, newContent);
  }
});
console.log('Replaced', count, 'inputs');
