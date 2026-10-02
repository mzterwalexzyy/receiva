const fs = require('node:fs');
const path = require('node:path');
const artifact = require('../artifacts/src/ReceivableHub.sol/ReceivableHub.json');
const dest = path.resolve(__dirname, '../../apps/web/lib');
fs.mkdirSync(dest, { recursive: true });
fs.writeFileSync(path.join(dest, 'abi.ts'), '// Generated from compiled Solidity. Run npm run abi -w contracts.\nexport const hubAbi = ' + JSON.stringify(artifact.abi, null, 2) + ' as const;\n');
console.log('Exported ReceivableHub ABI.');
