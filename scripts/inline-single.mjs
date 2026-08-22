// Flattens the dist-single build into one standalone HTML file: the whole
// game — three.js, React, models, shaders, styles — inlined so it runs from
// file:// with no server, no npm and no network.
import { readFileSync, writeFileSync } from 'fs';

const html = readFileSync('dist-single/mossling/index.html', 'utf8');
const js = readFileSync('dist-single/app.js', 'utf8');
const css = readFileSync('dist-single/app.css', 'utf8');

// Replacement *functions*, so `$&` and friends inside minified JS are not
// treated as substitution patterns by String.replace.
let out = html
  .replace(/<script\b[^>]*\bsrc="[^"]*app\.js"[^>]*>\s*<\/script>/,
    () => `<script type="module">\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`)
  .replace(/<link\b[^>]*\bhref="[^"]*app\.css"[^>]*>/,
    () => `<style>\n${css}\n</style>`);

const leftovers = [...out.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(?!data:)[^"]*"[^>]*>/g)]
  .map(m => m[0]);
if (leftovers.length) {
  console.error('external references still present:', leftovers);
  process.exit(1);
}
const target = 'dist-single/mossling-standalone.html';
writeFileSync(target, out);
console.log(`wrote ${target} — ${(out.length / 1024 / 1024).toFixed(2)} MB, fully self-contained`);
