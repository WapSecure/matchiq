import { runGenerate } from './commands.js';
import { nodeIo } from './node-io.js';

process.exitCode = await runGenerate(process.argv.slice(2), nodeIo);
