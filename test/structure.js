// Structural regression tests — assert HTML/CSS/JS invariants that caused past breakages.
import fs from 'fs';

const html = fs.readFileSync('index.html', 'utf8');
const chartJs = fs.readFileSync('src/chart.js', 'utf8');
const css = fs.readFileSync('css/main.css', 'utf8');

function assert(condition, msg) {
  if (!condition) throw new Error(`❌ ${msg}`);
  console.log(`  ✅ ${msg}`);
}

console.log('▶ Running structural tests...');

assert(html.includes('id="chart-container"'), '#chart-container wrapper exists');
assert(
  /<div[^>]+id="chart-container"[^>]*>[\s\S]*?<canvas[^>]+id="chart"/.test(html),
  'canvas#chart is inside #chart-container'
);

assert(
  chartJs.includes('maintainAspectRatio: false'),
  'maintainAspectRatio: false is set in chart options'
);

// No height !important on canvas (check CSS; style may be in index or main.css)
const noCanvasHeightImportant = !/canvas\s*{[^}]*height\s*:[^}]*!important/.test(html) &&
  !/canvas\s*{[^}]*height\s*:[^}]*!important/.test(css);
assert(noCanvasHeightImportant, 'no height !important on canvas');

const chartCardEnd = html.indexOf('</div>', html.indexOf('id="chart-container"'));
const hoverStart   = html.indexOf('id="hoverDetails"');
assert(
  hoverStart > chartCardEnd,
  'hoverDetails appears after chart-card closes (own column, not nested inside chart-card)'
);

console.log('✅ structural tests passed\n');
