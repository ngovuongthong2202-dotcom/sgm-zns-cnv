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

walk('./src/features', (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add import if not present and if there are dates
  const needsImport = /ngayKy|ngayGiaoMay|ngayGiaoThucTe|ngayThanhToan|ngayDenHan|ngayBaoGia|ngayHetHan|ngaySinh|ngayCapNhat/g.test(content) && content.includes('{') && content.includes('}');
  
  if (needsImport) {
      if (!content.includes('formatDate')) {
           // insert import at the top
           const importLine = `import { formatDate } from '@/src/shared/utils/formatDate';\n`;
           // find first import
           content = content.replace(/import /, importLine + 'import ');
           changed = true;
      }
      
      const toReplace = [
         { from: /{c\.ngayKy \|\| '---'}/g, to: '{formatDate(c.ngayKy)}' },
         { from: /{hoanThanhStr}/g, to: '{formatDate(hoanThanhStr)}' },
         { from: /{p\.ngayGiaoThucTe \? p\.ngayGiaoThucTe : p\.ngayGiaoMay \|\| 'TBD'}/g, to: '{formatDate(p.ngayGiaoThucTe || p.ngayGiaoMay)}' },
         { from: /{done \? p\.ngayGiaoThucTe : p\.ngayGiaoMay \|\| 'TBD'}/g, to: '{done ? formatDate(p.ngayGiaoThucTe) : formatDate(p.ngayGiaoMay) || "TBD"}' },
         { from: /{p\.ngayThanhToan \|\| '---'}/g, to: '{formatDate(p.ngayThanhToan)}' },
         { from: /{p\.ngayDenHan \|\| '---'}/g, to: '{formatDate(p.ngayDenHan)}' },
         { from: /{q\.ngayBaoGia \|\| '---'}/g, to: '{formatDate(q.ngayBaoGia)}' },
         { from: /{q\.ngayHetHan \|\| '---'}/g, to: '{formatDate(q.ngayHetHan)}' },
         { from: /{String\(info\.getValue\(\) \|\| ''\)\.substring\(0,10\)}/g, to: '{formatDate(String(info.getValue()))}' }
      ];

      toReplace.forEach(({from, to}) => {
          if (from.test(content)) {
             content = content.replace(from, to);
             changed = true;
          }
      });
  }

  if (changed) {
     fs.writeFileSync(filePath, content);
     console.log(`Updated dates in ${filePath}`);
  }
});
