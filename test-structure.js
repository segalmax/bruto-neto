// Structural regression tests — assert HTML/JS invariants that caused past breakages.
// Add a check here every time a non-math bug is fixed.
const fs   = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

function assert(condition, msg) {
  if (!condition) throw new Error(`❌ ${msg}`);
  console.log(`  ✅ ${msg}`);
}

console.log('▶ Running structural tests...');

// [Regression] Canvas must be inside #chart-container for maintainAspectRatio:false to work.
// Bare <canvas> with a CSS height !important caused afterEvent toY() coords to be wrong,
// breaking fold-point hover detection.
assert(
  html.includes('id="chart-container"'),
  '#chart-container wrapper exists'
);
assert(
  /<div[^>]+id="chart-container"[^>]*>[\s\S]*?<canvas[^>]+id="chart"/.test(html),
  'canvas#chart is inside #chart-container'
);

// [Regression] maintainAspectRatio:false is required so Chart.js owns canvas dimensions.
assert(
  html.includes('maintainAspectRatio: false'),
  'maintainAspectRatio: false is set in chart options'
);

// [Regression] CSS height !important on canvas breaks Chart.js coordinate mapping.
assert(
  !/canvas\s*{[^}]*height\s*:[^}]*!important/.test(html),
  'no height !important on canvas'
);

// 3-column layout: hoverDetails must be a direct child of .layout, not inside .chart-card
// Simple check: the string </div> that closes chart-card must appear before hoverDetails
const chartCardEnd = html.indexOf('</div>', html.indexOf('id="chart-container"'));
const hoverStart   = html.indexOf('id="hoverDetails"');
assert(
  hoverStart > chartCardEnd,
  'hoverDetails appears after chart-card closes (own column, not nested inside chart-card)'
);

console.log('✅ structural tests passed\n');
