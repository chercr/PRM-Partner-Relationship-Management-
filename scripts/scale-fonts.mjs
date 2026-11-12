import { readFileSync, writeFileSync } from 'node:fs';

const file = 'src/styles.css';
const source = readFileSync(file, 'utf8');
let count = 0;
const result = source.replace(/font-size:\s*(\d+(?:\.\d+)?)px/g, (_match, raw) => {
  const value = Number(raw);
  const adjusted = value <= 11 ? value + 2 : value <= 16 ? value + 1 : value;
  count += 1;
  return `font-size: calc(${adjusted}px + var(--font-boost))`;
});
writeFileSync(file, result);
console.log(`Updated ${count} font-size declarations`);
