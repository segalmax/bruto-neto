const fs  = require('fs');
const vm  = require('vm');

const html   = fs.readFileSync('index.html', 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];

// Stop before DOM wiring — pure math functions only
const mathOnly = script.split('// ── Wire inputs')[0];

const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(mathOnly, sandbox);

if (typeof sandbox.window.runMathTests !== 'function')
  throw new Error('runMathTests not found on window');

sandbox.window.runMathTests();
