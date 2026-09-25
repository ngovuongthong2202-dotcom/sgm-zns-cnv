const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(process.cwd());
let count = 0;
for (const f of files) {
  if (
    f.match(/^fix_.*\.ts$/) ||
    f.match(/^fix_.*\.cjs$/) ||
    f.match(/^fix-.*\.mjs$/) ||
    f.match(/^fix-.*\.cjs$/) ||
    f.match(/^fix-.*\.ts$/) ||
    f.match(/^fix.*\.cjs$/) ||
    f.match(/^temp_.*\.txt$/) ||
    f.match(/^bad_.*\.txt$/) ||
    f.match(/^query_.*\.js$/) ||
    (f.match(/^test.*\.js$/) && f !== 'test-endpoint.js' && f !== 'test-public-endpoint.js') ||
    (f.match(/^test.*\.ts$/) && !f.includes('config')) ||
    [
      'buttons_without_aria.txt',
      'cleanup.ts',
      'count_errors.cjs',
      'count_tops.cjs',
      'emerald_matches.txt',
      'find_buttons.mjs',
      'find_contrast.ts',
      'find_inputs.mjs',
      'mega_sledgehammer.ts',
      'out.js',
      'out.txt',
      'print_remaining.cjs',
      'read_line.ts',
      'remove-any.cjs',
      'result.txt',
      'revert.ts',
      'revert_unknown.ts',
      'rm_expect_errors.cjs',
      'sledgehammer.ts',
      'sweep-forbidden-colors.cjs',
      'sweep-skeletons.cjs',
      'sweep-toasts.cjs',
      'typography-sweep.cjs',
      'undo_schema_import.ts',
      'test-endpoint.js',
      'test-firestore-rest.js',
      'test-logic.js',
      'test-payload-full.ts',
      'test-public-endpoint.js'
    ].includes(f)
  ) {
    try {
      fs.unlinkSync(path.join(process.cwd(), f));
      console.log('Deleted ' + f);
      count++;
    } catch (e) {}
  }
}
console.log('Total deleted: ' + count);
