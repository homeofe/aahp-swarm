import { pdf } from 'pdf-to-img';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const deckDir = path.join(dir, 'outputs', 'aahp-swarm-elvatis-html');
const outDir = path.join(dir, 'pdf-check');
fs.mkdirSync(outDir, { recursive: true });

const targets = {
  de: path.join(deckDir, 'AAHP_Swarm_Elvatis_HTML_Render_DE.pdf'),
};

for (const [name, file] of Object.entries(targets)) {
  if (!fs.existsSync(file)) { console.log(`${name}: MISSING`); continue; }
  const doc = await pdf(file, { scale: 1.5 });
  let i = 0;
  for await (const img of doc) {
    i++;
    fs.writeFileSync(path.join(outDir, `${name}-page-${i}.png`), img);
  }
  console.log(`${name}: ${i} pages, ${(fs.statSync(file).size / 1024).toFixed(0)}KB`);
}
console.log('done');
