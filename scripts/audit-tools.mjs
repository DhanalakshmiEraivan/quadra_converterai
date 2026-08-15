import fs from 'node:fs';

const toolsSource = fs.readFileSync(new URL('../src/data/tools.ts', import.meta.url), 'utf8');
const workspace = fs.readFileSync(new URL('../src/pages/ToolWorkspace.tsx', import.meta.url), 'utf8');
const converters = fs.readFileSync(new URL('../src/lib/converters.ts', import.meta.url), 'utf8');
const pdfConverters = fs.readFileSync(new URL('../src/lib/pdf-converters.ts', import.meta.url), 'utf8');

const toolsStart = toolsSource.indexOf('export const tools: Tool[]');
const toolsEnd = toolsSource.indexOf('\n];', toolsStart) + 3;
const toolsSection = toolsSource.slice(toolsStart, toolsEnd);
const ids = [...toolsSection.matchAll(/\{ id: '([^']+)'/g)].map(m => m[1]);
const engines = [...new Set([...toolsSection.matchAll(/engine: '([^']+)'/g)].map(m => m[1]))];
const cases = new Set([...workspace.matchAll(/case '([^']+)':/g)].map(m => m[1]));
const exports = new Set([
  ...[...converters.matchAll(/export (?:async )?function (\w+)/g)].map(m => m[1]),
  ...[...pdfConverters.matchAll(/export (?:async )?function (\w+)/g)].map(m => m[1]),
]);

const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
const missingCases = engines.filter(engine => !cases.has(engine));
const referencedFunctions = [...workspace.matchAll(/(?:Converters|PDFConverters)\.(\w+)\(/g)].map(m => m[1]);
const missingExports = [...new Set(referencedFunctions)].filter(fn => !exports.has(fn));

console.log(`Tools: ${ids.length}`);
console.log(`Unique IDs: ${new Set(ids).size}`);
console.log(`Engines: ${engines.length}`);
console.log(`Missing dispatch cases: ${missingCases.length}`);
console.log(`Missing converter exports: ${missingExports.length}`);

if (duplicateIds.length || missingCases.length || missingExports.length) {
  if (duplicateIds.length) console.error('Duplicate IDs:', duplicateIds);
  if (missingCases.length) console.error('Missing cases:', missingCases);
  if (missingExports.length) console.error('Missing exports:', missingExports);
  process.exit(1);
}
